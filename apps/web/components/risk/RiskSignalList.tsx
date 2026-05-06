import type { RiskSignal } from "@/lib/types/risk_rich";

const SEV_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  critical: { label: "Crítico", badgeClass: "badge-red" },
  high: { label: "Alto", badgeClass: "badge-amber" },
  medium: { label: "Medio", badgeClass: "badge-blue" },
  low: { label: "Bajo", badgeClass: "badge-blue" },
};

function scoreColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskSignalList({ signals }: { signals: RiskSignal[] }) {
  if (!signals.length) {
    return <p className="text-sm text-muted text-center py-4">Sin señales disponibles.</p>;
  }
  return (
    <ul className="space-y-3">
      {signals.map(s => {
        const cfg = SEV_CONFIG[s.severity] ?? SEV_CONFIG.medium;
        const impact = s.impact;
        return (
          <li key={s.signal_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan1 font-mono">{s.created_at.slice(0, 10)}</span>
                <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
              </div>
              <span className="text-[10px] text-muted uppercase">{s.domain}</span>
            </div>
            <p className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition mb-2">{s.title}</p>
            <p className="text-xs text-text2 mb-2 line-clamp-2">{s.description}</p>
            <div>
              <div className="flex justify-between text-[10px] text-muted mb-0.5">
                <span>Impacto</span>
                <span className="font-mono" style={{ color: scoreColor(impact) }}>{impact}</span>
              </div>
              <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${impact}%`, backgroundColor: scoreColor(impact) }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
