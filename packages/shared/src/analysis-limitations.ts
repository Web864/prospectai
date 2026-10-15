export function analysisLimitations(status: string, aiStatus: string | null): string[] {
  if (status !== 'PARTIAL' && status !== 'partial') return [];
  const reasons: Record<string, string> = {
    unavailable_quota: 'AI analysis was unavailable because the provider allowance was exhausted.',
    unavailable_timeout: 'AI analysis did not return within its time limit.',
    unavailable_not_configured: 'AI analysis was not configured for this run.',
    unavailable_invalid_output: 'AI output did not pass validation and was not included.',
    unavailable_authorization: 'The AI provider could not authorize this analysis.',
  };
  return [
    reasons[aiStatus ?? ''] ?? 'AI analysis was unavailable for this run.',
    'This partial report contains the evidence and deterministic scoring that completed successfully. No unavailable AI output is included.',
  ];
}
