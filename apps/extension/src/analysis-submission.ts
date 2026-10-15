// Keep the current submission identity until the accepted job is safely stored.
export async function analysisSubmissionKey(mode: 'guest' | 'registered', url: string) {
  const { pendingAnalysisSubmission: pending } = await chrome.storage.local.get(
    'pendingAnalysisSubmission',
  );
  if (
    pending &&
    typeof pending === 'object' &&
    pending.mode === mode &&
    pending.url === url &&
    typeof pending.key === 'string'
  )
    return pending.key;
  const key = crypto.randomUUID();
  await chrome.storage.local.set({ pendingAnalysisSubmission: { mode, url, key } });
  return key;
}
