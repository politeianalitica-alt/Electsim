import type { EarlyWarningIndicator } from "@/lib/types/risk_rich";

const STATUS_CONFIG: Record<string, { dot: string; text: string; label: string }> = {
  red: { dot: "bg-red1", text: "text-red1", label: "Alerta" },
  yellow: { dot: "bg-amber1", text: "text-amber1", label: "Aviso" },
  green: { dot: "bg-green1", text: "text-green1", label: "Normal" },
  grey: { dot: "bg-text2", text: "text-text2", label: "Sin datos" },
};

export function RiskEarlyWarning({ indicators }: { indicators: EarlyWarningIndicator[] }) {
  if (!indicators.length) {
    return <p className="text-sm text-muted text-center py-4">Sin indicadores disponibles.</p>;
  }
  return (
    <ul className="space-y-2">
      {indicators.map(ind => {
        const cfg = STATUS_CONFIG[ind.status] ?? STATUS_CONFIG.grey;
        const pct = Math.min((ind.value / 100) * 100, 100);
        const thresholdPct = Math.min((ind.threshold / 100) * 100, 100);
        return (
          <li key={ind.indicator_id} className="p-3 rounded-lg border border-border1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-xs font-semibold text-text1 flex-1">{ind.label}</span>
              <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-xs font-mono text-text1">{ind.value}</span>
            </div>
            <div className="h-1.5 bg-bg3 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full ${cfg.dot}`}
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-text2/60"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
            {ind.description && <p className="text-[10px] text-muted mt-1">{ind.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
