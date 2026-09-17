'use client';

import Link from 'next/link';
import { Button, StatePanel } from './design-system';
import { Skeleton } from './interactive-controls';
import type { ResourceState } from '../lib/use-api-resource';

export function ResourceFeedback<T>({
  state,
  retry,
  children,
  notFoundTitle = 'This resource is unavailable',
}: {
  state: ResourceState<T>;
  retry: () => void;
  children: (data: T) => React.ReactNode;
  notFoundTitle?: string;
}) {
  if (state.status === 'loading') return <Skeleton label="Loading workspace data" lines={4} />;
  if (state.status === 'success') return children(state.data);
  if (state.kind === 'unauthorized')
    return (
      <StatePanel
        title="Sign in required"
        action={
          <Link className="button" href="/login">
            Sign in
          </Link>
        }
      >
        Your session is missing or expired. Sign in again to continue.
      </StatePanel>
    );
  if (state.kind === 'forbidden')
    return (
      <StatePanel title="Access denied">
        Your account does not have permission to access this workspace resource.
      </StatePanel>
    );
  if (state.kind === 'quota_exceeded')
    return (
      <StatePanel
        title="Analysis limit reached"
        action={
          <Link className="button" href="/app/billing">
            View plans
          </Link>
        }
      >
        Your server-authoritative analysis allowance has been used for this billing period.
      </StatePanel>
    );
  return (
    <StatePanel
      title={state.kind === 'not_found' ? notFoundTitle : 'Unable to load this data'}
      action={<Button onClick={retry}>Try again</Button>}
    >
      {state.kind === 'not_found'
        ? 'The frontend contract is ready, but this backend resource is not available yet.'
        : state.message}
    </StatePanel>
  );
}
