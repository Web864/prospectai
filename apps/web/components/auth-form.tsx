'use client';

import { useState, type FormEvent } from 'react';
import {
  actionResponseSchema,
  authCredentialsSchema,
  emailActionSchema,
  resetPasswordSchema,
} from '@prospectai/validation';
import { Button, StatePanel } from './design-system';
import { TextField } from './site-shell';
import { ApiClientError, webApiRequest } from '../lib/web-api';

type AuthPage = 'signup' | 'login' | 'verify-email' | 'forgot-password' | 'reset-password';
type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const endpoints: Record<AuthPage, string> = {
  signup: '/auth/signup',
  login: '/auth/login',
  'verify-email': '/auth/verify-email',
  'forgot-password': '/auth/forgot-password',
  'reset-password': '/auth/reset-password',
};

export function AuthForm({
  page,
  token,
  returnTo,
}: {
  page: AuthPage;
  token?: string | undefined;
  returnTo?: string | undefined;
}) {
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === 'submitting') return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') ?? '');
    const password = String(values.get('password') ?? '');
    const input =
      page === 'forgot-password'
        ? emailActionSchema.safeParse({ email })
        : page === 'verify-email'
          ? resetPasswordSchema.pick({ token: true }).safeParse({ token })
          : page === 'reset-password'
            ? resetPasswordSchema.safeParse({ token, password })
            : authCredentialsSchema.safeParse({ email, password });
    if (!input.success) {
      setState({
        status: 'error',
        message: 'Check the highlighted account details and try again.',
      });
      return;
    }
    setState({ status: 'submitting' });
    try {
      const response = await webApiRequest(endpoints[page], actionResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input.data),
      });
      setState({ status: 'success', message: response.data.message });
      const destination = returnTo?.startsWith('/extension/connect?request=')
        ? returnTo
        : response.data.next;
      if (destination?.startsWith('/')) window.location.assign(destination);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.kind === 'unauthorized'
            ? 'The email or password was not accepted.'
            : error.message
          : 'The request could not be completed.';
      setState({ status: 'error', message });
    }
  }

  if (page === 'verify-email' && !token)
    return (
      <StatePanel title="Verification link required">
        Open the complete verification link from your email.
      </StatePanel>
    );
  if (page === 'reset-password' && !token)
    return (
      <StatePanel title="Reset link required">
        Open the complete password reset link from your email.
      </StatePanel>
    );

  return (
    <form className="form-panel" onSubmit={(event) => void submit(event)} noValidate>
      {!['verify-email', 'reset-password'].includes(page) && (
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
      )}
      {!['forgot-password', 'verify-email'].includes(page) && (
        <TextField
          label={page === 'reset-password' ? 'New password' : 'Password'}
          name="password"
          type="password"
          autoComplete={page === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          required
        />
      )}
      {state.status === 'error' && (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p className="form-message" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={state.status === 'submitting'}>
        {state.status === 'submitting'
          ? 'Working...'
          : page === 'verify-email'
            ? 'Verify email'
            : 'Continue'}
      </Button>
    </form>
  );
}
