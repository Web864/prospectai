'use client';

import Link from 'next/link';
import { actionResponseSchema, sessionResponseSchema } from '@prospectai/validation';
import { Button, StatePanel } from './design-system';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';
import { useState } from 'react';

export function ExtensionConnect({ requestId }: { requestId?: string | undefined }) {
  const { state, retry } = useApiResource('/me', sessionResponseSchema);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!requestId)
    return (
      <StatePanel title="Start from the extension">
        Start with a free prospect analysis in the Chrome extension. When you choose to save your
        result or continue after the guest trial, ProspectAI opens a secure, expiring sign-in
        request.
      </StatePanel>
    );
  if (state.status === 'error' && state.kind === 'unauthorized') {
    const returnTo = '/extension/connect?request=' + encodeURIComponent(requestId);
    return (
      <StatePanel
        title="Sign in to continue"
        action={
          <div className="actions">
            <Link className="button" href={'/login?returnTo=' + encodeURIComponent(returnTo)}>
              Sign in
            </Link>
            <Link href={'/signup?returnTo=' + encodeURIComponent(returnTo)}>Create account</Link>
          </div>
        }
      >
        Your guest result stays available while you securely connect this ProspectAI workspace.
      </StatePanel>
    );
  }
  async function authorize() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await webApiRequest(
        `/extension/authorization-requests/${encodeURIComponent(requestId!)}/approve`,
        actionResponseSchema,
        { method: 'POST' },
      );
      setMessage(response.data.message);
      if (response.data.next) window.location.assign(response.data.next);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'The extension could not be authorized.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResourceFeedback state={state} retry={retry}>
      {({ data }) => (
        <section className="form-panel">
          <h2>Authorize ProspectAI Extension</h2>
          <p>
            Connect to <strong>{data.organizationName}</strong> as {data.email}. The extension
            receives a limited, revocable credential and can access the active public website only
            when you invoke analysis.
          </p>
          <div className="actions">
            <Button disabled={busy} onClick={() => void authorize()}>
              {busy ? 'Authorizing...' : 'Authorize extension'}
            </Button>
            <Link href="/app/settings/extension">Cancel</Link>
          </div>
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </ResourceFeedback>
  );
}
