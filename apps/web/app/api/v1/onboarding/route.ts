import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { onboardingInputSchema } from '@prospectai/validation';
import { requireRequestActor } from '../../../../lib/request-actor';

export async function PUT(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const input = await parseJson(request, onboardingInputSchema);
    await prisma.profile.upsert({
      where: { userId: actor.userId },
      create: {
        userId: actor.userId,
        roleLabel: input.role,
        services: input.services,
        targetIndustries: input.industries ?? [],
        locations: input.locations ?? [],
        ...(input.icp ? { idealCustomerProfile: input.icp } : {}),
        agencyWebsite: input.agencyWebsite || null,
        ...(input.outreachPreferences ? { outreachPreferences: input.outreachPreferences } : {}),
      },
      update: {
        roleLabel: input.role,
        services: input.services,
        targetIndustries: input.industries ?? [],
        locations: input.locations ?? [],
        ...(input.icp ? { idealCustomerProfile: input.icp } : {}),
        agencyWebsite: input.agencyWebsite || null,
        ...(input.outreachPreferences ? { outreachPreferences: input.outreachPreferences } : {}),
      },
    });
    return Response.json(
      { data: { message: 'Workspace preferences saved.', next: '/app' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
