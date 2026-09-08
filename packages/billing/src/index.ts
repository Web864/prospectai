import Stripe from 'stripe';
import { AppError } from '@prospectai/shared';

export interface BillingProvider {
  createCheckout(input: {
    organizationId: string;
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string | Buffer, signature: string): Stripe.Event;
}

export function createStripeBillingProvider(
  secretKey: string,
  webhookSecret: string,
): BillingProvider {
  const stripe = new Stripe(secretKey);
  return {
    async createCheckout(input) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ...(input.customerId ? { customer: input.customerId } : {}),
        client_reference_id: input.organizationId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });
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
  };
}
