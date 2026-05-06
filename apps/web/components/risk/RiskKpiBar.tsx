import type { RiskKpiItem } from "@/lib/types/risk_rich";

function kpiColor(color: string) {
  if (color === "red") return "text-red1";
  if (color === "amber") return "text-amber1";
  if (color === "green") return "text-green1";
  if (color === "cyan") return "text-cyan1";
  return "text-blue1";
}

export function RiskKpiBar({ kpis, isLoading }: { kpis: RiskKpiItem[]; isLoading?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
          <div className={`text-2xl font-bold ${kpiColor(k.color)}`}>
            {isLoading ? "—" : k.value}
          </div>
          {k.delta !== 0 && !isLoading && (
            <div className={`text-[10px] mt-0.5 ${k.delta > 0 ? "text-red1" : "text-green1"}`}>
              {k.delta > 0 ? "+" : ""}{k.delta} pts
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
