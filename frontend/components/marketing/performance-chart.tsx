// Même palette statut que Sparkline (dashboard/sparkline.tsx) — vert = hausse, rouge =
// baisse, jamais une couleur catégorielle. Tracé plus grand que le sparkline de la vue
// Marché : pensé pour porter, seul, une carte de performance (page /rendement), avec un
// remplissage dégradé sous la courbe pour plus de poids visuel qu'un simple sparkline.
const GOOD = "var(--spark-good)";
const CRITICAL = "var(--spark-critical)";

export function PerformanceChart({
  points,
  width = 320,
  height = 110,
}: {
  points: { t: number; usd: number }[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-xs text-muted-foreground/60">
        Historique indisponible
      </div>
    );
  }

  const padding = 4;
  const values = points.map((p) => p.usd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: padding + (height - 2 * padding) * (1 - (p.usd - min) / range),
  }));
  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const isUp = values[values.length - 1] >= values[0];
  const color = isUp ? GOOD : CRITICAL;
  const gradientId = `perf-gradient-${isUp ? "up" : "down"}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={isUp ? "Performance en hausse sur la période" : "Performance en baisse sur la période"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
