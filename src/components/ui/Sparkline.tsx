export function Sparkline({ points, width = 96, height = 28, className = "" }: { points: number[]; width?: number; height?: number; className?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => `${((i / (points.length - 1)) * width).toFixed(1)},${(height - 2 - ((p - min) / span) * (height - 4)).toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden="true">
      <polyline points={d} fill="none" strokeWidth="1.6" stroke={up ? "var(--color-up)" : "var(--color-down)"} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Delta({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={`tabular font-semibold ${up ? "text-up" : "text-down"} ${className}`}>
      {up ? "▲" : "▼"} {Math.abs(value * 100).toFixed(2)}%
    </span>
  );
}
