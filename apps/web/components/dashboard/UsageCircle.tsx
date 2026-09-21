const circumference = 2 * Math.PI * 30;

export function UsageCircle({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.min(100, Math.max(0, Math.round(value)));
  const offset = circumference - (percentage / 100) * circumference;
  const label = value === null ? 'No fixed limit' : `${percentage}% used`;

  return (
    <span className="usage-circle" role="img" aria-label={label}>
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="usage-circle-track" cx="36" cy="36" r="30" />
        <circle
          className="usage-circle-progress"
          cx="36"
          cy="36"
          r="30"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{value === null ? '∞' : `${percentage}%`}</span>
    </span>
  );
}
