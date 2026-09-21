import { Prisma } from '@prospectai/database';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { leadCreateSchema } from '@prospectai/validation';
import { requireRequestActor } from '../../../../lib/request-actor';

const statusMap = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  WON: 'won',
  LOST: 'lost',
  ARCHIVED: 'archived',
} as const;

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const pageSize = 20;
    const status = url.searchParams.get('status')?.toUpperCase();
    const where = {
      organizationId: actor.organizationId,
      ...(status && status in statusMap ? { status: status as keyof typeof statusMap } : {}),
    };
    const [total, leads] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          website: {
            include: {
              analyses: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return Response.json(
      {
        data: leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          domain: lead.website?.domain ?? null,
          status: statusMap[lead.status],
          opportunityScore: lead.website?.analyses[0]?.opportunityScore ?? null,
          latestAnalysisId: lead.website?.analyses[0]?.id ?? null,
          updatedAt: lead.updatedAt.toISOString(),
        })),
        meta: { page, totalPages: Math.ceil(total / pageSize) },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const input = await parseJson(request, leadCreateSchema);
    const contacts = (input.contacts ?? []).map((contact) => ({
      ...(contact.name ? { name: contact.name } : {}),
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.title ? { title: contact.title } : {}),
    }));
    const analysis = input.analysisId
      ? await prisma.websiteAnalysis.findFirst({
          where: {
            id: input.analysisId,
            organizationId: actor.organizationId,
          },
        })
      : null;
    if (input.analysisId && !analysis) throw new AppError('NOT_FOUND', 'Analysis not found.', 404);
    const lead = await prisma.$transaction(async (transaction) => {
      if (analysis?.websiteId) {
        await transaction.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`lead:${actor.organizationId}:${analysis.websiteId}`}, 0))`,
        );
        const existing = await transaction.lead.findFirst({
          where: { organizationId: actor.organizationId, websiteId: analysis.websiteId },
        });
        if (existing)
          throw new AppError('CONFLICT', 'This website is already saved as a lead.', 409, {
            leadId: existing.id,
          });
      }
      return transaction.lead.create({
        data: {
          organizationId: actor.organizationId,
          ...(analysis?.websiteId ? { websiteId: analysis.websiteId } : {}),
          ...(input.name ? { name: input.name } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
          ...(contacts.length > 0 ? { contacts: { create: contacts } } : {}),
          activities: {
            create: {
              organizationId: actor.organizationId,
              actorUserId: actor.userId,
              type: 'lead.created',
            },
          },
        },
      });
    });
    return Response.json(
      { data: { id: lead.id, message: 'Lead saved.' } },
      { status: 201, headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
