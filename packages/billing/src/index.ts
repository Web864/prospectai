import Stripe from 'stripe';
import { AppError } from '@prospectai/shared';

export interface BillingProvider {
  createCheckout(input: {
    organizationId: string;
    idempotencyKey: string;
    customerId?: string;
    priceId: string;
    planCode: 'pro' | 'agency';
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string | Buffer, signature: string): Stripe.Event;
  /** Reads the current subscription so webhook handling never trusts stale or reordered events. */
  retrieveSubscription(subscriptionId: string): Promise<BillingSubscriptionSnapshot | null>;
}

export interface BillingSubscriptionSnapshot {
  id: string;
  status: string;
  customerId: string | null;
  priceIds: string[];
  metadata: Record<string, string>;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export function createStripeBillingProvider(
  secretKey: string,
  webhookSecret: string,
): BillingProvider {
  const stripe = new Stripe(secretKey);
  return {
    async createCheckout(input) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          ...(input.customerId ? { customer: input.customerId } : {}),
          client_reference_id: input.organizationId,
          metadata: { organizationId: input.organizationId, planCode: input.planCode },
          subscription_data: {
            metadata: { organizationId: input.organizationId, planCode: input.planCode },
          },
          line_items: [{ price: input.priceId, quantity: 1 }],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (!session.url)
        throw new AppError('EXTERNAL_SERVICE_ERROR', 'Stripe did not return a checkout URL.', 502);
      return { url: session.url };
    },
    async createPortal(input) {
      const session = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    },
    verifyWebhook(rawBody, signature) {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    },
    async retrieveSubscription(subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = subscription.current_period_end;
        return {
          id: subscription.id,
          status: subscription.status,
          customerId:
            typeof subscription.customer === 'string'
              ? subscription.customer
              : (subscription.customer?.id ?? null),
          priceIds: subscription.items.data.map((item) => item.price.id),
          metadata: subscription.metadata ?? {},
          currentPeriodEnd:
            typeof periodEnd === 'number' && Number.isFinite(periodEnd)
              ? new Date(periodEnd * 1_000)
              : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404)
          return null;
        throw error;
      }
    },
  };
}
