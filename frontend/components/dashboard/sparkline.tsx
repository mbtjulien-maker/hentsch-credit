// Couleurs statut (dataviz skill, palette fixe good/critical — jamais thématiques,
// jamais réutilisées comme couleur catégorielle) : vert = hausse, rouge = baisse.
// Références aux variables CSS (cf. app/globals.css --spark-good/--spark-critical,
// définies en clair et sous .dark) plutôt que des constantes JS : ce composant est
// partagé entre la vitrine publique (claire) et l'espace client (.dark, palette Dark
// Luxury Fintech) — il n'a pas à savoir dans lequel il est monté, la cascade CSS s'en
// charge.
const GOOD = "var(--spark-good)";
const CRITICAL = "var(--spark-critical)";

export function Sparkline({
  data,
  width = 96,
  height = 28,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return <div style={{ width, height }} className="text-xs text-muted-foreground" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const coords = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));
  const points = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Longueur approximative du tracé (somme des segments) : sert de dasharray/dashoffset
  // de départ pour l'animation de dessin en CSS pur (@keyframes draw-sparkline).
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    length += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
  }

  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={isUp ? "Tendance 7 jours en hausse" : "Tendance 7 jours en baisse"}
    >
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? GOOD : CRITICAL}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="sparkline-path"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: "draw-sparkline 0.8s ease-in-out forwards",
        }}
      />
    </svg>
  );
}
