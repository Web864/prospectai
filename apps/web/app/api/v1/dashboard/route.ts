import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { organizationEntitlement } from '../../../../lib/entitlements';
import { requireRequestActor } from '../../../../lib/request-actor';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const [
      entitlement,
      analyses,
      leads,
      qualifiedOpportunities,
      contactedProspects,
      wonClients,
      replies,
      meetings,
      extension,
      activities,
    ] = await Promise.all([
      organizationEntitlement(actor.organizationId),
      prisma.websiteAnalysis.count({
        where: { organizationId: actor.organizationId },
      }),
      prisma.lead.count({
        where: { organizationId: actor.organizationId, status: { not: 'ARCHIVED' } },
      }),
      prisma.opportunity.count({
        where: {
          analysis: { organizationId: actor.organizationId },
          opportunityScore: { gte: 60 },
        },
      }),
      prisma.lead.count({ where: { organizationId: actor.organizationId, status: 'CONTACTED' } }),
      prisma.lead.count({ where: { organizationId: actor.organizationId, status: 'WON' } }),
      prisma.activity.count({
        where: { organizationId: actor.organizationId, type: 'outreach.reply' },
      }),
      prisma.activity.count({
        where: { organizationId: actor.organizationId, type: 'outreach.meeting' },
      }),
      prisma.extensionSession.findFirst({
        where: { organizationId: actor.organizationId, status: 'CONNECTED', revokedAt: null },
      }),
      prisma.activity.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return Response.json(
      {
        data: {
          analyses,
          leads,
          qualifiedOpportunities,
          contactedProspects,
          replies,
          meetings,
          wonClients,
          analysesUsed: entitlement.used,
          analysesLimit: entitlement.limit,
          plan: entitlement.plan,
          extensionConnected: Boolean(extension),
          recentActivity: activities.map((activity) => ({
            id: activity.id,
            label: activity.type,
            occurredAt: activity.createdAt.toISOString(),
          })),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
