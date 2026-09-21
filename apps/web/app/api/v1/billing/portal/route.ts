import { apiError, requestId } from '@prospectai/api';
import { requireRole } from '@prospectai/auth';
import { createStripeBillingProvider } from '@prospectai/billing';
import { loadBillingEnvironment, loadPublicEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { requireRequestActor } from '../../../../../lib/request-actor';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    requireRole(actor, 'owner');
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET ||
      !process.env.STRIPE_PRO_PRICE_ID ||
      !process.env.STRIPE_AGENCY_PRICE_ID
    )
      throw new AppError('PAYMENT_REQUIRED', 'Stripe sandbox is not configured.', 503);
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: actor.organizationId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!subscription?.providerCustomerId)
      throw new AppError('PAYMENT_REQUIRED', 'No billing customer exists for this workspace.', 409);
    const environment = loadBillingEnvironment();
    const provider = createStripeBillingProvider(
      environment.STRIPE_SECRET_KEY,
      environment.STRIPE_WEBHOOK_SECRET,
    );
    const portal = await provider.createPortal({
      customerId: subscription.providerCustomerId,
      returnUrl: new URL('/app/billing', loadPublicEnvironment().NEXT_PUBLIC_APP_URL).toString(),
    });
    return Response.json(
      { data: { message: 'Opening secure billing portal.', next: portal.url } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
