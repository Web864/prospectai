import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { resetPasswordSchema } from '@prospectai/validation';
import { consumeAuthAction } from '../../../../../lib/auth-service';

const schema = resetPasswordSchema.pick({ token: true });

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const input = await parseJson(request, schema);
    const action = await consumeAuthAction(input.token, 'EMAIL_VERIFICATION');
    await prisma.user.update({
      where: { id: action.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return Response.json(
      { data: { message: 'Email verified.', next: '/app' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
