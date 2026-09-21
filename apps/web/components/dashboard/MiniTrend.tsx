export function MiniTrend({ color = '#8ccfe9' }: { color?: string }) {
  return (
    <svg
      className="mini-trend"
      width="75"
      height="35"
      viewBox="0 0 75 35"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 28 C12 25 18 18 26 22 C35 27 42 14 50 16 C60 18 66 10 73 5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="73" cy="5" r="2.25" fill={color} />
    </svg>
  );
}
