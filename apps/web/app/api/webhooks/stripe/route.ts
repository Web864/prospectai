import { apiError, requestId } from '@prospectai/api';
import { createStripeBillingProvider } from '@prospectai/billing';
import { loadBillingEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError, createLogger } from '@prospectai/shared';

const logger = createLogger('stripe-webhook');
const text = (value: unknown) => (typeof value === 'string' ? value : null);
const secondsDate = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1_000) : null;

function subscriptionStatus(eventType: string, providerStatus: string | null) {
  if (eventType === 'customer.subscription.deleted') return 'CANCELED' as const;
  if (eventType.includes('payment_failed')) return 'PAST_DUE' as const;
  const mapped = {
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'CANCELED',
  } as const;
  return providerStatus && providerStatus in mapped
    ? mapped[providerStatus as keyof typeof mapped]
    : ('ACTIVE' as const);
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
    return apiError(new AppError('BACKEND_UNAVAILABLE', 'Billing is not configured.', 503), id);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return apiError(new AppError('FORBIDDEN', 'Signature required.', 400), id);

  try {
    const environment = loadBillingEnvironment();
    const rawBody = await request.text();
    const provider = createStripeBillingProvider(
      environment.STRIPE_SECRET_KEY,
      environment.STRIPE_WEBHOOK_SECRET,
    );
    const event = provider.verifyWebhook(rawBody, signature);
    const object = event.data.object as unknown as Record<string, unknown>;
    const metadata =
      object.metadata && typeof object.metadata === 'object'
        ? (object.metadata as Record<string, unknown>)
        : {};
    const providerSubscriptionId = text(object.subscription) ?? text(object.id);

    await prisma.$transaction(async (transaction) => {
      const persisted = await transaction.webhookEvent.upsert({
        where: { providerEventId: event.id },
        create: {
          provider: 'stripe',
          providerEventId: event.id,
          type: event.type,
          payload: JSON.parse(rawBody),
        },
        update: {},
      });
      if (persisted.processedAt) return;

      const existing = providerSubscriptionId
        ? await transaction.subscription.findUnique({
            where: { providerSubscriptionId },
          })
        : null;
      const organizationId =
        text(metadata.organizationId) ??
        text(object.client_reference_id) ??
        existing?.organizationId ??
        null;
      const planCode = text(metadata.planCode) ?? existing?.planCode ?? null;
      const customerId = text(object.customer) ?? existing?.providerCustomerId ?? null;

      if (
        organizationId &&
        providerSubscriptionId &&
        planCode &&
        ['pro', 'agency'].includes(planCode)
      ) {
        const status = subscriptionStatus(event.type, text(object.status));
        const currentPeriodEnd =
          secondsDate(object.current_period_end) ?? existing?.currentPeriodEnd ?? null;
        const cancelAtPeriodEnd =
          typeof object.cancel_at_period_end === 'boolean'
            ? object.cancel_at_period_end
            : (existing?.cancelAtPeriodEnd ?? false);
        await transaction.subscription.upsert({
          where: { providerSubscriptionId },
          create: {
            organizationId,
            provider: 'stripe',
            providerCustomerId: customerId,
            providerSubscriptionId,
            planCode,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          },
          update: {
            providerCustomerId: customerId,
            planCode,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          },
        });
        await transaction.auditLog.create({
          data: {
            action: 'billing.subscription.updated',
            resourceType: 'Subscription',
            resourceId: providerSubscriptionId,
            organization: { connect: { id: organizationId } },
            metadata: { provider: 'stripe', eventType: event.type, status },
          },
        });
      }

      await transaction.webhookEvent.update({
        where: { providerEventId: event.id },
        data: {
          organizationId,
          processedAt: new Date(),
        },
      });
    });
    return Response.json(
      { received: true },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    logger.error('stripe_webhook_rejected', {
      error: error instanceof Error ? error.name : 'unknown',
      requestId: id,
    });
    return apiError(new AppError('FORBIDDEN', 'Webhook rejected.', 400), id);
  }
}
