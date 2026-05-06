import type { ElectoralKpiItem } from "@/lib/types/electoral";

function kpiColor(color?: string | null) {
  if (color === "red") return "text-red1";
  if (color === "amber") return "text-amber1";
  if (color === "green") return "text-green1";
  if (color === "cyan") return "text-cyan1";
  return "text-blue1";
}

function trendBadge(trend?: string | null) {
  if (!trend) return null;
  if (trend.startsWith("+")) {
    return (
      <span className="badge badge-green text-[10px] mt-0.5">{trend}</span>
    );
  }
  if (trend.startsWith("-")) {
    return (
      <span className="badge badge-red text-[10px] mt-0.5">{trend}</span>
    );
  }
  return <span className="text-[10px] text-muted mt-0.5">{trend}</span>;
}

export function ElectoralKpiBar({
  kpis,
  isLoading,
}: {
  kpis: ElectoralKpiItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <div className="h-3 bg-border1/40 rounded w-3/4 mb-2" />
            <div className="h-7 bg-border1/40 rounded w-1/2 mb-1" />
            <div className="h-3 bg-border1/20 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="kpi-card">
          <div className="label-cap mb-1">{k.label}</div>
          <div className={`text-2xl font-bold ${kpiColor(k.color)}`}>
            {k.value}
          </div>
          {k.unit && (
            <div className="text-xs text-muted mt-0.5">{k.unit}</div>
          )}
          {trendBadge(k.trend)}
        </div>
      ))}
    </div>
  );
}
