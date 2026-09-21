import { requireRole } from '@prospectai/auth';
import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { requireRequestActor } from '../../../../../lib/request-actor';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    requireRole(actor, 'owner');
    const [members, usageEntries, subscriptions, failedJobs, auditLogs] = await Promise.all([
      prisma.membership.count({ where: { organizationId: actor.organizationId } }),
      prisma.usageLedger.count({ where: { organizationId: actor.organizationId } }),
      prisma.subscription.findMany({ where: { organizationId: actor.organizationId } }),
      prisma.analysisJob.findMany({
        where: { organizationId: actor.organizationId, status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return Response.json(
      { data: { members, usageEntries, subscriptions, failedJobs, auditLogs } },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
