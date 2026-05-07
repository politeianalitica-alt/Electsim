"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints, type KpiPulso } from "@/lib/api/endpoints";

function Sparkline({ values, color = "#00D4FF" }: { values: number[]; color?: string }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const lastY = h - ((values[values.length - 1] - min) / range) * h;
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="h-2 w-20 bg-bg3 rounded mb-3" />
      <div className="flex items-end justify-between">
        <div className="h-7 w-16 bg-bg3 rounded" />
        <div className="h-8 w-28 bg-bg3 rounded" />
      </div>
    </div>
  );
}

function formatValue(v: number, format: string): string {
  if (format === "pct") return `${v.toFixed(1)}%`;
  if (format === "num") return v.toLocaleString("es-ES");
  return v.toFixed(2);
}

export function KpiStrip() {
  const { data: kpis, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["kpis", "pulso"],
    queryFn: () => endpoints.kpisPulso().catch(() => null),
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 90 * 1000,
  });

  const updatedLabel = dataUpdatedAt
    ? `Actualizado ${new Date(dataUpdatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    : "Actualizando...";

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Pulso operativo</h2>
          <span className="text-xs text-muted">Cargando...</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  const items: KpiPulso[] = kpis ?? [];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[.14em] text-cyan1">Pulso operativo</h2>
        <span className="text-xs text-muted">{updatedLabel}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((k, i) => {
          const positive = k.delta > 0;
          const isRisk = k.label.toLowerCase().includes("riesgo");
          const isNegativeGood = k.label.toLowerCase().includes("paro") || k.label.toLowerCase().includes("déficit") || isRisk;
          const deltaGood = isNegativeGood ? !positive : positive;
          const deltaColor = k.label.toLowerCase().includes("polariz") || k.label.toLowerCase().includes("volatil") || isRisk
            ? (positive ? "text-red1" : "text-green1")
            : (deltaGood ? "text-green1" : "text-red1");

          // Risk score gets a coloured value
          const riskScore = isRisk ? k.value as number : null;
          const riskColor = riskScore !== null
            ? riskScore >= 75 ? "#EF4444" : riskScore >= 60 ? "#F59E0B" : riskScore >= 40 ? "#3B82F6" : "#10B981"
            : undefined;

          const sparkColor = riskColor ?? "#00D4FF";

          return (
            <div key={i} className={`kpi-card cursor-pointer transition-transform hover:scale-[1.02] ${isRisk ? "border-amber1/20" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text2 truncate">
                  {k.label}
                </span>
                <span className={`text-[10px] font-bold ${deltaColor}`}>
                  {positive ? "▲" : "▼"} {Math.abs(k.delta).toFixed(k.format === "num" ? 0 : 2)}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight" style={{ color: riskColor ?? "var(--color-text1, #F1F5F9)" }}>
                  {formatValue(k.value, k.format)}
                </span>
                <Sparkline values={k.spark} color={sparkColor} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
