import { apiError, parseJson, requestId } from '@prospectai/api';
import { AppError } from '@prospectai/shared';
import { analysisRequestSchema } from '@prospectai/validation';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const input = await parseJson(request, analysisRequestSchema);
    if (!request.headers.get('idempotency-key'))
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key is required.', 400);
    return Response.json(
      {
        data: {
          accepted: false,
          url: input.url,
          message:
            'Analysis creation is not enabled until authentication and entitlement policy are connected.',
        },
      },
      { status: 503, headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
