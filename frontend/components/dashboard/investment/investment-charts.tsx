"use client";

import { useId, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentPerformanceMonth } from "@/lib/api";
import { formatDisplayAmount, toDisplay } from "@/lib/format";
import { cn } from "@/lib/utils";

// Deux graphiques volontairement séparés (jamais un double axe) : la valeur du portefeuille
// se compte en milliers, le rendement mensuel en dizaines — sur un même axe le second
// serait illisible. Aucune donnée fabriquée : tout vient de GET
// /users/:userId/investment-performance (journal réel des transactions).

export type PerformancePoint = {
  month: string;
  value: number;
  yieldUsd: number;
  deposits: number;
  withdrawals: number;
};

export function toPoints(months: InvestmentPerformanceMonth[]): PerformancePoint[] {
  return months.map((m) => ({
    month: m.month,
    // Valeurs converties dans la monnaie d'affichage du compte (le registre est en USD) :
    // axes, info-bulles et tableau parlent tous la même monnaie que les cartes de solde.
    value: toDisplay(Number(m.endValueUsd)),
    yieldUsd: toDisplay(Number(m.yieldUsd)),
    deposits: toDisplay(Number(m.depositsUsd)),
    withdrawals: toDisplay(Number(m.withdrawalsUsd)),
  }));
}

// Repères de graduation "propres" (0 / 500 / 1 000…) — chaque tick porte les valeurs qu'on
// n'étiquette pas directement sur le tracé.
function niceScale(min: number, max: number, count = 4) {
  if (max === min) max = min + 1;
  const rough = (max - min) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 1000; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return { min: niceMin, max: niceMax, ticks };
}

function useMonthFormatters() {
  const locale = useLocale();
  return useMemo(() => {
    const parse = (key: string) => {
      const [y, m] = key.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, 1));
    };
    const short = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
    const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    return {
      shortMonth: (key: string) => short.format(parse(key)),
      longMonth: (key: string) => long.format(parse(key)),
      compact: (n: number) => compact.format(n),
    };
  }, [locale]);
}

const W = 720;
const H = 260;
const M = { top: 18, right: 18, bottom: 30, left: 52 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

function slotX(index: number, count: number) {
  return M.left + (PLOT_W / count) * (index + 0.5);
}

// Barre à bout de donnée arrondi (4px) et base carrée sur la ligne zéro — cf. règles de
// marques : jamais une barre entièrement arrondie, elle pousse depuis une base commune.
function barPath(x: number, width: number, yZero: number, yValue: number, radius = 4) {
  const height = Math.abs(yValue - yZero);
  if (height < 0.5) return `M${x},${yZero} h${width}`;
  const r = Math.min(radius, height, width / 2);
  const left = x;
  const right = x + width;
  if (yValue < yZero) {
    // Barre vers le haut : coins arrondis en haut.
    return `M${left},${yZero} V${yValue + r} Q${left},${yValue} ${left + r},${yValue} H${right - r} Q${right},${yValue} ${right},${yValue + r} V${yZero} Z`;
  }
  // Barre vers le bas : coins arrondis en bas.
  return `M${left},${yZero} V${yValue - r} Q${left},${yValue} ${left + r},${yValue} H${right - r} Q${right},${yValue} ${right},${yValue - r} V${yZero} Z`;
}

interface TooltipRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

function Tooltip({ leftPct, title, rows }: { leftPct: number; title: string; rows: TooltipRow[] }) {
  // Ancré au centre du point survolé, mais recadré près des bords pour ne jamais déborder.
  const shift = leftPct < 18 ? "0%" : leftPct > 82 ? "-100%" : "-50%";
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
      style={{ left: `${leftPct}%`, transform: `translateX(${shift})` }}
    >
      <p className="mb-1 text-[11px] font-medium text-muted-foreground capitalize">{title}</p>
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={cn("tabular-nums text-foreground", row.emphasis && "text-sm font-semibold")}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/70 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─────────────────────────── Évolution du capital (ligne + aire) ───────────────────────────

export function PortfolioValueChart({ points }: { points: PerformancePoint[] }) {
  const t = useTranslations("Dashboard.investmentSpace.charts");
  const fmt = useMonthFormatters();
  const [hoverRaw, setHover] = useState<number | null>(null);
  const gradientId = useId();
  // L'index survolé peut dépasser le nombre de points quand la période change (12 → 3
  // mois) : on le borne au rendu plutôt que de le réinitialiser dans un effet.
  const hover = hoverRaw !== null && hoverRaw < points.length ? hoverRaw : null;

  const hasData = points.some((p) => p.value !== 0);
  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(0, ...values), Math.max(...values, 1) * 1.06);

  if (!hasData) return <EmptyChart message={t("empty")} />;

  const y = (v: number) => M.top + PLOT_H * (1 - (v - scale.min) / (scale.max - scale.min));
  const coords = points.map((p, i) => ({ x: slotX(i, points.length), y: y(p.value) }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const baseY = y(Math.max(0, scale.min));
  const area = `${coords[0].x},${baseY} ${line} ${coords[coords.length - 1].x},${baseY}`;
  const last = coords.length - 1;
  const active = hover ?? last;
  const activePoint = points[active];

  function handlePointer(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(Math.min(points.length - 1, Math.max(0, Math.floor(ratio * points.length))));
  }

  return (
    <div
      className="relative"
      onPointerLeave={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setHover(Math.min(points.length - 1, (hover ?? last) + 1));
        if (e.key === "ArrowLeft") setHover(Math.max(0, (hover ?? last) - 1));
        if (e.key === "Escape") setHover(null);
      }}
    >
      {hover !== null && (
        <Tooltip
          leftPct={(coords[hover].x / W) * 100}
          title={fmt.longMonth(activePoint.month)}
          rows={[
            { label: t("tooltip.value"), value: formatDisplayAmount(activePoint.value), emphasis: true },
            { label: t("tooltip.yield"), value: formatDisplayAmount(activePoint.yieldUsd) },
          ]}
        />
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("valueAria")}
        tabIndex={0}
        onFocus={() => setHover((h) => h ?? last)}
        onBlur={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted-foreground)">
              {fmt.compact(tick)}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover !== null && (
          <line x1={coords[hover].x} x2={coords[hover].x} y1={M.top} y2={M.top + PLOT_H} stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeWidth={1} />
        )}

        {/* Marqueur ≥ 8px, cerclé d'un anneau 2px de la couleur du fond pour rester net là
            où il croise la courbe — celui du point survolé (ou du mois en cours). */}
        <circle cx={coords[active].x} cy={coords[active].y} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />

        {points.map((p, i) => (
          <text key={p.month} x={coords[i].x} y={H - 9} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
            {fmt.shortMonth(p.month)}
          </text>
        ))}

        {/* Zone de capture pleine largeur : on vise un mois, jamais un point de 2px. */}
        <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="transparent" onPointerMove={handlePointer} />
      </svg>
    </div>
  );
}

// ─────────────────────────── Rendement mensuel (colonnes gain/perte) ───────────────────────────

export function MonthlyYieldChart({ points }: { points: PerformancePoint[] }) {
  const t = useTranslations("Dashboard.investmentSpace.charts");
  const fmt = useMonthFormatters();
  const [hoverRaw, setHover] = useState<number | null>(null);
  // Même bornage que PortfolioValueChart (changement de période).
  const hover = hoverRaw !== null && hoverRaw < points.length ? hoverRaw : null;

  const hasData = points.some((p) => p.yieldUsd !== 0);
  const yields = points.map((p) => p.yieldUsd);
  const scale = niceScale(Math.min(0, ...yields), Math.max(0, ...yields, 1e-9));

  if (!hasData) return <EmptyChart message={t("emptyYield")} />;

  const y = (v: number) => M.top + PLOT_H * (1 - (v - scale.min) / (scale.max - scale.min));
  const yZero = y(0);
  const slot = PLOT_W / points.length;
  const barWidth = Math.min(24, slot * 0.6);

  // Étiquettes sélectives : uniquement le mois le plus marquant et le mois en cours —
  // jamais un chiffre sur chaque barre.
  const extremeIndex = yields.reduce((best, v, i) => (Math.abs(v) > Math.abs(yields[best]) ? i : best), 0);
  const labelled = new Set([extremeIndex, points.length - 1]);

  return (
    <div
      className="relative"
      onPointerLeave={() => setHover(null)}
      onKeyDown={(e) => {
        const current = hover ?? points.length - 1;
        if (e.key === "ArrowRight") setHover(Math.min(points.length - 1, current + 1));
        if (e.key === "ArrowLeft") setHover(Math.max(0, current - 1));
        if (e.key === "Escape") setHover(null);
      }}
    >
      {hover !== null && (
        <Tooltip
          leftPct={(slotX(hover, points.length) / W) * 100}
          title={fmt.longMonth(points[hover].month)}
          rows={[
            { label: t("tooltip.yield"), value: `${points[hover].yieldUsd >= 0 ? "+" : ""}${formatDisplayAmount(points[hover].yieldUsd)}`, emphasis: true },
            { label: t("tooltip.deposits"), value: formatDisplayAmount(points[hover].deposits) },
            { label: t("tooltip.withdrawals"), value: formatDisplayAmount(points[hover].withdrawals) },
          ]}
        />
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("yieldAria")}
        tabIndex={0}
        onFocus={() => setHover((h) => h ?? points.length - 1)}
        onBlur={() => setHover(null)}
      >
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth={tick === 0 ? 1.5 : 1}
              strokeOpacity={tick === 0 ? 1 : 0.8}
            />
            <text x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted-foreground)">
              {fmt.compact(tick)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const cx = slotX(i, points.length);
          const isUp = p.yieldUsd >= 0;
          const color = isUp ? "var(--spark-good)" : "var(--spark-critical)";
          const dim = hover !== null && hover !== i;
          return (
            <g key={p.month}>
              <path
                d={barPath(cx - barWidth / 2, barWidth, yZero, y(p.yieldUsd))}
                fill={color}
                fillOpacity={dim ? 0.35 : 0.9}
                stroke={p.yieldUsd === 0 ? color : "none"}
                strokeWidth={2}
              />
              {labelled.has(i) && p.yieldUsd !== 0 && (
                <text
                  x={cx}
                  y={isUp ? y(p.yieldUsd) - 6 : y(p.yieldUsd) + 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  {`${isUp ? "+" : ""}${fmt.compact(p.yieldUsd)}`}
                </text>
              )}
              <text x={cx} y={H - 9} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                {fmt.shortMonth(p.month)}
              </text>
              {/* Cible de survol = tout le créneau du mois (≥ 24px), pas seulement la barre. */}
              <rect
                x={cx - slot / 2}
                y={M.top}
                width={slot}
                height={PLOT_H}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerMove={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────── Vue tableau (équivalent accessible) ───────────────────────────

export function PerformanceTable({ points }: { points: PerformancePoint[] }) {
  const t = useTranslations("Dashboard.investmentSpace.charts.table");
  const fmt = useMonthFormatters();
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{t("month")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("endValue")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("deposits")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("withdrawals")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("yield")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.month} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 capitalize">{fmt.longMonth(p.month)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{formatDisplayAmount(p.value)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatDisplayAmount(p.deposits)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatDisplayAmount(p.withdrawals)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                <span
                  className={cn(
                    "inline-flex items-center justify-end gap-1 font-medium",
                    p.yieldUsd > 0 && "text-[color:var(--spark-good)]",
                    p.yieldUsd < 0 && "text-[color:var(--spark-critical)]",
                  )}
                >
                  {p.yieldUsd > 0 && <TrendingUp className="size-3" />}
                  {p.yieldUsd < 0 && <TrendingDown className="size-3" />}
                  {`${p.yieldUsd > 0 ? "+" : ""}${formatDisplayAmount(p.yieldUsd)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────── Carte + bascule Graphique / Tableau ───────────────────────────

export function ChartCard({
  title,
  description,
  points,
  children,
}: {
  title: string;
  description: string;
  points: PerformancePoint[];
  children: React.ReactNode;
}) {
  const t = useTranslations("Dashboard.investmentSpace.charts");
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div role="group" aria-label={title} className="inline-flex shrink-0 rounded-lg bg-muted p-[3px] text-xs font-medium">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded-md px-2.5 py-1 whitespace-nowrap transition-colors",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "chart" ? t("viewChart") : t("viewTable")}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>{view === "chart" ? children : <PerformanceTable points={points} />}</CardContent>
    </Card>
  );
}
