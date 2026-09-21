import { apiError, parseJson, requestId } from '@prospectai/api';
import { createStripeBillingProvider } from '@prospectai/billing';
import { loadBillingEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { checkoutRequestSchema } from '@prospectai/validation';
import { requireRole } from '@prospectai/auth';
import { enforceRateLimit } from '../../../../../lib/rate-limit';
import { requireRequestActor } from '../../../../../lib/request-actor';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    requireRole(actor, 'owner');
    await enforceRateLimit(request, 'billing.checkout', 10, 60 * 60_000, actor.organizationId);
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET ||
      !process.env.STRIPE_PRO_PRICE_ID ||
      !process.env.STRIPE_AGENCY_PRICE_ID
    )
      throw new AppError('PAYMENT_REQUIRED', 'Stripe sandbox is not configured.', 503);
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key is required.', 400);
    const input = await parseJson(request, checkoutRequestSchema);
    const environment = loadBillingEnvironment();
    const current = await prisma.subscription.findFirst({
      where: { organizationId: actor.organizationId },
      orderBy: { updatedAt: 'desc' },
    });
    const provider = createStripeBillingProvider(
      environment.STRIPE_SECRET_KEY,
      environment.STRIPE_WEBHOOK_SECRET,
    );
    const data = await provider.createCheckout({
      organizationId: actor.organizationId,
      idempotencyKey: actor.organizationId + ':' + idempotencyKey,
      ...(current?.providerCustomerId ? { customerId: current.providerCustomerId } : {}),
      priceId:
        input.plan === 'agency'
          ? environment.STRIPE_AGENCY_PRICE_ID
          : environment.STRIPE_PRO_PRICE_ID,
      planCode: input.plan,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    return Response.json({ data }, { headers: { 'X-Request-Id': id } });
  } catch (error) {
    return apiError(error, id);
  }
}
