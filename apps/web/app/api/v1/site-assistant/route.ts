import { apiError, parseJson, requestId } from '@prospectai/api';
import { AppError } from '@prospectai/shared';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import {
  answerVisitor,
  assistantRequestSchema,
  siteAssistantEnabled,
} from '../../../../lib/site-assistant';
import { siteUrl } from '../../../../lib/site-metadata';

export const dynamic = 'force-dynamic';

/**
 * Public website assistant. Anonymous, so it is bounded three ways: a per-visitor limit, a
 * site-wide daily ceiling that caps AI spend even under a distributed flood, and browser
 * requests must come from this site's own origin.
 */
export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    if (!siteAssistantEnabled())
      throw new AppError('NOT_FOUND', 'The website assistant is turned off.', 404);
    const origin = request.headers.get('origin');
    if (origin && origin !== siteUrl().origin)
      throw new AppError('FORBIDDEN', 'Cross-origin requests are not allowed.', 403);
    await enforceRateLimit(request, 'site.assistant.visitor', 12, 10 * 60_000);
    await enforceRateLimit(request, 'site.assistant.global', 2_000, 24 * 60 * 60_000, 'global');
    const input = await parseJson(request, assistantRequestSchema);
    const reply = await answerVisitor(input);
    return Response.json(
      { data: reply },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
