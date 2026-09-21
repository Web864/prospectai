import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { leadUpdateSchema } from '@prospectai/validation';
import { requireRequestActor } from '../../../../../lib/request-actor';

const statusToDatabase = {
  new: 'NEW',
  contacted: 'CONTACTED',
  qualified: 'QUALIFIED',
  won: 'WON',
  lost: 'LOST',
  archived: 'ARCHIVED',
} as const;
const statusFromDatabase = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  WON: 'won',
  LOST: 'lost',
  ARCHIVED: 'archived',
} as const;

async function ownedLead(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      website: {
        include: {
          analyses: {
            include: { opportunities: { orderBy: { opportunityScore: 'desc' } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      contacts: true,
      pitches: { orderBy: { updatedAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  });
  if (!lead) throw new AppError('NOT_FOUND', 'Lead not found.', 404);
  return lead;
}

export async function GET(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { leadId } = await params;
    const lead = await ownedLead(actor.organizationId, leadId);
    const latest = lead.website?.analyses[0] ?? null;
    return Response.json(
      {
        data: {
          id: lead.id,
          name: lead.name,
          domain: lead.website?.domain ?? null,
          status: statusFromDatabase[lead.status],
          opportunityScore: latest?.opportunityScore ?? null,
          latestAnalysisId: latest?.id ?? null,
          updatedAt: lead.updatedAt.toISOString(),
          notes: lead.notes,
          contacts: lead.contacts,
          recommendedServices: (latest?.opportunities ?? []).map((opportunity) => ({
            id: opportunity.id,
            title: opportunity.serviceCategory,
            summary: opportunity.summary,
          })),
          latestAnalysis: latest
            ? {
                id: latest.id,
                websiteScore: latest.websiteScore,
                completedAt: latest.completedAt?.toISOString() ?? null,
              }
            : null,
          pitches: lead.pitches.map((pitch) => ({
            id: pitch.id,
            format: pitch.format,
            content: pitch.content,
            updatedAt: pitch.updatedAt.toISOString(),
          })),
          activity: lead.activities.map((activity) => ({
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

export async function PATCH(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { leadId } = await params;
    await ownedLead(actor.organizationId, leadId);
    const input = await parseJson(request, leadUpdateSchema);
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(input.status
          ? {
              status: statusToDatabase[input.status],
              archivedAt: input.status === 'archived' ? new Date() : null,
            }
          : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        activities: {
          create: {
            organizationId: actor.organizationId,
            actorUserId: actor.userId,
            type: input.status ? `lead.status.${input.status}` : 'lead.updated',
          },
        },
      },
    });
    return Response.json(
      { data: { id: lead.id, message: 'Lead updated.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { leadId } = await params;
    await ownedLead(actor.organizationId, leadId);
    await prisma.lead.delete({ where: { id: leadId } });
    return Response.json(
      { data: { message: 'Lead deleted.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
