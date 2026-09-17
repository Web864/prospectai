'use client';

import { sessionResponseSchema, actionResponseSchema } from '@prospectai/validation';
import { Button } from './design-system';
import { useApiResource } from '../lib/use-api-resource';
import { webApiRequest } from '../lib/web-api';

export function AccountSession() {
  const { state } = useApiResource('/me', sessionResponseSchema);
  if (state.status === 'loading')
    return (
      <span className="muted" aria-label="Loading account">
        ...
      </span>
    );
  if (state.status === 'error') return <a href="/login">Sign in</a>;
  const initials = (state.data.data.displayName ?? state.data.data.email)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <Button
      className="icon-button"
      aria-label="Log out"
      title={`${state.data.data.email} - Log out`}
      onClick={async () => {
        try {
          await webApiRequest('/logout', actionResponseSchema, { method: 'POST' });
        } finally {
          window.location.assign('/login');
        }
      }}
    >
      {initials}
    </Button>
  );
}
