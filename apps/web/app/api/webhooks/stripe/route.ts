import { apiError, requestId } from '@prospectai/api';
import { createStripeBillingProvider, type BillingSubscriptionSnapshot } from '@prospectai/billing';
import { loadBillingEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError, createLogger } from '@prospectai/shared';
import {
  planForSubscription,
  storedSubscriptionStatus,
  subscriptionIdFromEventObject,
} from '../../../../lib/stripe-webhook';

const logger = createLogger('stripe-webhook');
const text = (value: unknown) => (typeof value === 'string' && value ? value : null);

export async function POST(request: Request) {
  const id = requestId(request.headers);
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
    return apiError(new AppError('BACKEND_UNAVAILABLE', 'Billing is not configured.', 503), id);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return apiError(new AppError('FORBIDDEN', 'Signature required.', 400), id);

  let environment: ReturnType<typeof loadBillingEnvironment>;
  let provider: ReturnType<typeof createStripeBillingProvider>;
  let rawBody: string;
  let event: ReturnType<ReturnType<typeof createStripeBillingProvider>['verifyWebhook']>;
  try {
    environment = loadBillingEnvironment();
    rawBody = await request.text();
    provider = createStripeBillingProvider(
      environment.STRIPE_SECRET_KEY,
      environment.STRIPE_WEBHOOK_SECRET,
    );
    event = provider.verifyWebhook(rawBody, signature);
  } catch (error) {
    logger.warn('stripe_webhook_rejected', {
      error: error instanceof Error ? error.name : 'unknown',
      requestId: id,
    });
    return apiError(new AppError('FORBIDDEN', 'Webhook rejected.', 400), id);
  }

  try {
    const object = event.data.object as unknown as Record<string, unknown>;
    const metadata =
      object.metadata && typeof object.metadata === 'object'
        ? (object.metadata as Record<string, unknown>)
        : {};
    const providerSubscriptionId = subscriptionIdFromEventObject(object);

    // Events can arrive late, twice, or out of order, and their payload shape follows the
    // endpoint's API version. The subscription is therefore read from Stripe at handling time
    // and stored as-is, so the latest state always wins regardless of which event triggered it.
    let snapshot: BillingSubscriptionSnapshot | null = null;
    if (providerSubscriptionId) {
      const already = await prisma.webhookEvent.findUnique({
        where: { providerEventId: event.id },
        select: { processedAt: true },
      });
      if (already?.processedAt)
        return Response.json(
          { received: true, duplicate: true },
          { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
        );
      snapshot = await provider.retrieveSubscription(providerSubscriptionId);
    }

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
        ? await transaction.subscription.findUnique({ where: { providerSubscriptionId } })
        : null;
      const organizationId =
        existing?.organizationId ??
        text(snapshot?.metadata.organizationId) ??
        text(metadata.organizationId) ??
        text(object.client_reference_id) ??
        null;
      const planCode = snapshot
        ? planForSubscription(snapshot, {
            pro: environment.STRIPE_PRO_PRICE_ID,
            agency: environment.STRIPE_AGENCY_PRICE_ID,
          })
        : null;

      if (organizationId && providerSubscriptionId && snapshot && planCode) {
        const status = storedSubscriptionStatus(snapshot.status);
        const values = {
          providerCustomerId: snapshot.customerId ?? existing?.providerCustomerId ?? null,
          planCode,
          status,
          currentPeriodEnd: snapshot.currentPeriodEnd,
          cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        };
        await transaction.subscription.upsert({
          where: { providerSubscriptionId },
          create: { organizationId, provider: 'stripe', providerSubscriptionId, ...values },
          update: values,
        });
        await transaction.auditLog.create({
          data: {
            action: 'billing.subscription.updated',
            resourceType: 'Subscription',
            resourceId: providerSubscriptionId,
            organization: { connect: { id: organizationId } },
            metadata: { provider: 'stripe', eventType: event.type, status, planCode },
          },
        });
      } else if (existing && providerSubscriptionId && !snapshot) {
        // Stripe no longer knows the subscription: remove the paid entitlement.
        await transaction.subscription.update({
          where: { providerSubscriptionId },
          data: { status: 'CANCELED' },
        });
      } else if (providerSubscriptionId) {
        logger.warn('stripe_webhook_unmatched_subscription', {
          eventType: event.type,
          hasOrganization: Boolean(organizationId),
          hasPlan: Boolean(planCode),
          requestId: id,
        });
      }

      await transaction.webhookEvent.update({
        where: { providerEventId: event.id },
        data: { organizationId, processedAt: new Date() },
      });
    });
    return Response.json(
      { received: true },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    // Processing failures return 5xx so Stripe retries; nothing was marked processed.
    logger.error('stripe_webhook_processing_failed', {
      error: error instanceof Error ? error.name : 'unknown',
      eventType: event.type,
      requestId: id,
    });
    return apiError(
      new AppError('BACKEND_UNAVAILABLE', 'Webhook processing failed. Retry later.', 503),
      id,
    );
  }
}
