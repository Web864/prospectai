import { OpenAiProvider, generateValidatedPitch } from '@prospectai/ai';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { loadAiEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { pitchCreateSchema } from '@prospectai/validation';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import { requireRequestActor } from '../../../../lib/request-actor';

function evidenceText(value: unknown) {
  if (value && typeof value === 'object' && 'observation' in value)
    return String((value as { observation: unknown }).observation);
  return typeof value === 'string' ? value : 'Evidence recorded.';
}

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const pitches = await prisma.pitch.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return Response.json(
      { data: pitches.map((pitch) => ({ ...pitch, updatedAt: pitch.updatedAt.toISOString() })) },
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
    await enforceRateLimit(request, 'pitch.generate', 10, 60_000, actor.organizationId);
    const environment = loadAiEnvironment();
    if (!environment.OPENAI_API_KEY)
      throw new AppError(
        'AI_UNAVAILABLE',
        'Pitch generation requires a configured AI provider.',
        503,
      );
    const input = await parseJson(request, pitchCreateSchema);
    const format = input.format ?? 'cold_email';
    const analysis = await prisma.websiteAnalysis.findFirst({
      where: { id: input.analysisId, organizationId: actor.organizationId },
      include: {
        website: true,
        findings: true,
        opportunities: { where: { id: input.opportunityId } },
      },
    });
    const opportunity = analysis?.opportunities[0];
    if (!analysis || !opportunity)
      throw new AppError('NOT_FOUND', 'Analysis opportunity not found.', 404);
    if (input.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: input.leadId, organizationId: actor.organizationId },
      });
      if (!lead) throw new AppError('NOT_FOUND', 'Lead not found.', 404);
    }
    const provider = new OpenAiProvider({
      apiKey: environment.OPENAI_API_KEY,
      model: environment.OPENAI_MODEL,
      baseUrl: environment.OPENAI_BASE_URL,
    });
    const output = await generateValidatedPitch(provider, {
      business: analysis.businessSummary ?? analysis.website.domain,
      findings: analysis.findings.map((finding) => ({
        title: finding.title,
        evidence: evidenceText(finding.evidence),
      })),
      opportunity: {
        service: opportunity.serviceCategory,
        commercialReason: opportunity.commercialReason,
        pitchAngle: opportunity.pitchAngle ?? opportunity.summary,
      },
      style: format,
    });
    const content = output.subject
      ? `${output.subject}

${output.content}`
      : output.content;
    const pitch = await prisma.pitch.create({
      data: {
        organizationId: actor.organizationId,
        analysisId: analysis.id,
        ...(input.leadId ? { leadId: input.leadId } : {}),
        format,
        content,
      },
    });
    return Response.json(
      {
        data: {
          id: pitch.id,
          format: pitch.format,
          content: pitch.content,
          message: 'Pitch generated.',
        },
      },
      { status: 201, headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
