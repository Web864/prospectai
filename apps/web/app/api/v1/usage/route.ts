import { apiError, requestId } from '@prospectai/api';
import { organizationEntitlement } from '../../../../lib/entitlements';
import { requireRequestActor } from '../../../../lib/request-actor';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const entitlement = await organizationEntitlement(actor.organizationId);
    return Response.json(
      {
        data: {
          plan: entitlement.plan,
          used: entitlement.used,
          limit: entitlement.limit,
          remaining: entitlement.remaining,
          periodStart: entitlement.periodStart.toISOString(),
          periodEnd: entitlement.periodEnd.toISOString(),
          quotaReached: entitlement.quotaReached,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
