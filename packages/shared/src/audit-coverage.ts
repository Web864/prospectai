export function auditCoverage(
  value: unknown,
): { discovered: number; analyzed: number; skipped: number; limitations: string[] } | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('analyzed' in value) ||
    !('discovered' in value) ||
    !('skipped' in value)
  )
    return null;
  if (
    typeof value.analyzed !== 'number' ||
    typeof value.discovered !== 'number' ||
    !Array.isArray(value.skipped)
  )
    return null;
  return {
    discovered: value.discovered,
    analyzed: value.analyzed,
    skipped: value.skipped.length,
    limitations:
      'limitations' in value && Array.isArray(value.limitations)
        ? value.limitations.filter((entry): entry is string => typeof entry === 'string')
        : [],
  };
}
