import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { settingsUpdateSchema } from '@prospectai/validation';
import { requireRequestActor } from '../../../../lib/request-actor';

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const [profile, extension] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: actor.userId } }),
      prisma.extensionSession.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return Response.json(
      {
        data: {
          displayName: profile?.displayName ?? null,
          role: profile?.roleLabel ?? null,
          services: strings(profile?.services),
          outreachPreferences: profile?.outreachPreferences ?? null,
          extension: {
            connected: extension?.status === 'CONNECTED' && !extension.revokedAt,
            status: extension?.status.toLowerCase() ?? 'disconnected',
          },
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const input = await parseJson(request, settingsUpdateSchema);
    const profileData = {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.role !== undefined ? { roleLabel: input.role } : {}),
      ...(input.services !== undefined ? { services: input.services } : {}),
      ...(input.industries !== undefined ? { targetIndustries: input.industries } : {}),
      ...(input.locations !== undefined ? { locations: input.locations } : {}),
      ...(input.icp !== undefined ? { idealCustomerProfile: input.icp } : {}),
      ...(input.agencyWebsite !== undefined ? { agencyWebsite: input.agencyWebsite } : {}),
      ...(input.outreachPreferences !== undefined
        ? { outreachPreferences: input.outreachPreferences }
        : {}),
    };
    await prisma.profile.upsert({
      where: { userId: actor.userId },
      create: { userId: actor.userId, ...profileData },
      update: profileData,
    });
    return Response.json(
      { data: { message: 'Settings saved.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
