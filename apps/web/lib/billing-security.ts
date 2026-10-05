import { AppError } from '@prospectai/shared';

export function assertSameAppOrigin(value: string, appUrl: string, fieldName: string): string {
  let candidate: URL;
  let application: URL;
  try {
    candidate = new URL(value);
    application = new URL(appUrl);
  } catch {
    throw new AppError('VALIDATION_ERROR', fieldName + ' must be a valid URL.', 400);
  }
  if (candidate.origin !== application.origin || candidate.username || candidate.password) {
    throw new AppError('VALIDATION_ERROR', fieldName + ' must use the application origin.', 400);
  }
  return candidate.toString();
}
