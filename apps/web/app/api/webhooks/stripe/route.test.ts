import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    webhookEvent: { upsert: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    transaction,
    provider: { verifyWebhook: vi.fn(), retrieveSubscription: vi.fn() },
    prisma: {
      webhookEvent: { findUnique: vi.fn() },
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    },
  };
});

vi.mock('@prospectai/database', () => ({ prisma: mocks.prisma }));
vi.mock('@prospectai/billing', () => ({ createStripeBillingProvider: () => mocks.provider }));
vi.mock('@prospectai/config', () => ({
  loadBillingEnvironment: () => ({
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_x',
    STRIPE_PRO_PRICE_ID: 'price_pro',
    STRIPE_AGENCY_PRICE_ID: 'price_agency',
  }),
}));

import { POST } from './route';

const call = (body: unknown) =>
  POST(
    new Request('https://app.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=x' },
      body: JSON.stringify(body),
    }),
  );

describe('Stripe webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null);
    mocks.transaction.webhookEvent.upsert.mockResolvedValue({ processedAt: null });
    mocks.transaction.subscription.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      providerCustomerId: 'cus_1',
    });
  });

  it('rejects an invalid signature with 400', async () => {
    mocks.provider.verifyWebhook.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const response = await call({});
    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores the current Stripe state, not the (possibly stale) event payload', async () => {
    // A delayed "updated: active" event arrives after the subscription was canceled.
    mocks.provider.verifyWebhook.mockReturnValue({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: { object: 'subscription', id: 'sub_1', status: 'active' } },
    });
    mocks.provider.retrieveSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'canceled',
      customerId: 'cus_1',
      priceIds: ['price_pro'],
      metadata: {},
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });

    const response = await call({ id: 'evt_1' });

    expect(response.status).toBe(200);
    expect(mocks.transaction.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: 'CANCELED', planCode: 'pro' }),
      }),
    );
  });

  it('fails closed for unknown or paused subscription states', async () => {
    mocks.provider.verifyWebhook.mockReturnValue({
      id: 'evt_2',
      type: 'customer.subscription.paused',
      data: { object: { object: 'subscription', id: 'sub_1' } },
    });
    mocks.provider.retrieveSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'paused',
      customerId: 'cus_1',
      priceIds: ['price_agency'],
      metadata: {},
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    await call({ id: 'evt_2' });
    expect(mocks.transaction.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: 'INCOMPLETE', planCode: 'agency' }),
      }),
    );
  });

  it('finds the subscription on invoices that use the newer parent layout', async () => {
    mocks.provider.verifyWebhook.mockReturnValue({
      id: 'evt_3',
      type: 'invoice.payment_failed',
      data: {
        object: {
          object: 'invoice',
          id: 'in_1',
          parent: { subscription_details: { subscription: 'sub_9' } },
        },
      },
    });
    mocks.provider.retrieveSubscription.mockResolvedValue({
      id: 'sub_9',
      status: 'past_due',
      customerId: 'cus_1',
      priceIds: ['price_pro'],
      metadata: { organizationId: 'org-1' },
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    await call({ id: 'evt_3' });
    expect(mocks.provider.retrieveSubscription).toHaveBeenCalledWith('sub_9');
    expect(mocks.transaction.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerSubscriptionId: 'sub_9' } }),
    );
  });

  it('returns 503 so Stripe retries when processing fails', async () => {
    mocks.provider.verifyWebhook.mockReturnValue({
      id: 'evt_4',
      type: 'customer.subscription.updated',
      data: { object: { object: 'subscription', id: 'sub_1' } },
    });
    mocks.provider.retrieveSubscription.mockRejectedValue(new Error('stripe down'));
    const response = await call({ id: 'evt_4' });
    expect(response.status).toBe(503);
  });

  it('acknowledges an already processed event without calling Stripe', async () => {
    mocks.provider.verifyWebhook.mockReturnValue({
      id: 'evt_5',
      type: 'customer.subscription.updated',
      data: { object: { object: 'subscription', id: 'sub_1' } },
    });
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue({ processedAt: new Date() });
    const response = await call({ id: 'evt_5' });
    expect(response.status).toBe(200);
    expect(mocks.provider.retrieveSubscription).not.toHaveBeenCalled();
  });
});
