import type { BillingSubscriptionSnapshot } from '@prospectai/billing';

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';

const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
const record = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

/**
 * Finds the subscription an event refers to across Stripe object shapes and API versions:
 * subscriptions, checkout sessions, and invoices (including the 2025+ `parent` layout).
 */
export function subscriptionIdFromEventObject(object: Record<string, unknown>): string | null {
  if (object.object === 'subscription') return text(object.id);
  const direct = object.subscription;
  const directId = text(direct) ?? text(record(direct)?.id);
  if (directId) return directId;
  const parent = record(record(object.parent)?.subscription_details)?.subscription;
  return text(parent) ?? text(record(parent)?.id);
}

/**
 * Maps a Stripe subscription status onto the stored status. Unknown and paused states fail
 * closed (no paid entitlement) instead of defaulting to active.
 */
export function storedSubscriptionStatus(providerStatus: string): SubscriptionStatus {
  switch (providerStatus) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'INCOMPLETE';
  }
}

/** The plan comes from the configured price first; metadata written at checkout is the fallback. */
export function planForSubscription(
  snapshot: Pick<BillingSubscriptionSnapshot, 'priceIds' | 'metadata'>,
  prices: { pro: string; agency: string },
): 'pro' | 'agency' | null {
  if (snapshot.priceIds.includes(prices.agency)) return 'agency';
  if (snapshot.priceIds.includes(prices.pro)) return 'pro';
  const fromMetadata = snapshot.metadata.planCode;
  return fromMetadata === 'pro' || fromMetadata === 'agency' ? fromMetadata : null;
}
