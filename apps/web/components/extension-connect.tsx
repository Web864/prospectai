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
        Open ProspectAI from the Chrome toolbar and choose Connect account to create a secure,
        expiring authorization request.
      </StatePanel>
    );
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
