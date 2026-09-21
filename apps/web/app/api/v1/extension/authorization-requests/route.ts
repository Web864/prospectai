import { randomUUID } from 'node:crypto';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { loadPublicEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { extensionAuthorizationRequestSchema } from '@prospectai/validation';
import { requireGuestSession } from '../../../../../lib/guest-session';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'extension.authorization.create', 10, 15 * 60_000);
    const input = await parseJson(request, extensionAuthorizationRequestSchema);
    const authorization = request.headers.get('authorization');
    const guest = authorization?.startsWith('Guest ') ? await requireGuestSession(request) : null;
    const publicId = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await prisma.extensionAuthorizationRequest.create({
      data: {
        publicId,
        ...(guest ? { guestSession: { connect: { id: guest.id } } } : {}),
        codeChallenge: input.codeChallenge,
        redirectUri: input.redirectUri,
        extensionVersion: input.extensionVersion,
        ...(input.deviceName ? { deviceName: input.deviceName } : {}),
        expiresAt,
      },
    });
    const authorizationUrl = new URL(
      '/extension/connect',
      loadPublicEnvironment().NEXT_PUBLIC_APP_URL,
    );
    authorizationUrl.searchParams.set('request', publicId);
    return Response.json(
      {
        data: {
          id: publicId,
          authorizationUrl: authorizationUrl.toString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
