'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiClientError, webApiRequest, type ApiFailureKind } from './web-api';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; kind: ApiFailureKind; message: string };

export function useApiResource<T>(path: string, schema: { parse(value: unknown): T }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void webApiRequest(path, schema, { signal: controller.signal })
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure =
          error instanceof ApiClientError
            ? error
            : new ApiClientError('request_failed', 'The request could not be completed.');
        setState({ status: 'error', kind: failure.kind, message: failure.message });
      });
    return () => controller.abort();
  }, [attempt, path, schema]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
