import { loadEmailEnvironment } from '@prospectai/config';
import { AppError, createLogger } from '@prospectai/shared';

const logger = createLogger('transactional-email');

function maskedAddress(email: string) {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string }) {
  const environment = loadEmailEnvironment();
  const useDevelopment =
    environment.EMAIL_PROVIDER === 'development' ||
    (environment.EMAIL_PROVIDER === 'auto' && !environment.RESEND_API_KEY);
  if (useDevelopment) {
    if (environment.NODE_ENV === 'production')
      throw new AppError('EMAIL_UNAVAILABLE', 'Transactional email is not configured.', 503);
    logger.info('development_email_captured', {
      recipient: maskedAddress(input.to),
      subject: input.subject,
      delivered: false,
    });
    return { delivered: false, adapter: 'development' as const };
  }
  if (!environment.RESEND_API_KEY)
    throw new AppError('EMAIL_UNAVAILABLE', 'Transactional email is not configured.', 503);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${environment.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: environment.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok)
    throw new AppError('EXTERNAL_SERVICE_ERROR', 'Transactional email delivery failed.', 502);
  return { delivered: true, adapter: 'resend' as const };
}
