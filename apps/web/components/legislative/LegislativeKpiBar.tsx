import type { LegislativeKpis } from "@/lib/types/legislative";

interface Props {
  kpis: LegislativeKpis;
  isLoading?: boolean;
}

export function LegislativeKpiBar({ kpis, isLoading }: Props) {
  const stats = [
    { label: "Iniciativas activas", value: kpis.active_initiatives, color: "text-cyan1" },
    { label: "Aprobadas este mes", value: kpis.approved_this_month, color: "text-green1" },
    { label: "Tramitación crítica", value: kpis.critical_tramitation, color: "text-red1" },
    { label: "Próximas votaciones", value: kpis.upcoming_votes, color: "text-amber1" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{s.label}</div>
          <div className={`text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</div>
        </div>
      ))}
    </div>
  );
}
