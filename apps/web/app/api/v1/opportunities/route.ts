import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { requireRequestActor } from '../../../../lib/request-actor';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const opportunities = await prisma.opportunity.findMany({
      where: { analysis: { organizationId: actor.organizationId } },
      include: { analysis: { include: { website: { select: { domain: true } } } } },
      orderBy: { opportunityScore: 'desc' },
      take: 100,
    });
    return Response.json(
      {
        data: opportunities.map((opportunity) => ({
          id: opportunity.id,
          analysisId: opportunity.analysisId,
          title: opportunity.title,
          serviceCategory: opportunity.serviceCategory,
          opportunityScore: opportunity.opportunityScore,
          confidence: opportunity.confidence,
          domain: opportunity.analysis.website.domain,
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
