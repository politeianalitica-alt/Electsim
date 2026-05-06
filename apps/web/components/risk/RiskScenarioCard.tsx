import type { RiskScenario } from "@/lib/types/risk_rich";

function scoreColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskScenarioCard({ scenario }: { scenario: RiskScenario }) {
  const color = scoreColor(scenario.risk_score);
  return (
    <div className="p-4 rounded-lg border border-border1 hover:border-cyan1/40 transition" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-text1">{scenario.title}</h3>
        <div className="text-right shrink-0">
          <div className="text-lg font-black" style={{ color }}>{scenario.risk_score}</div>
          <div className="text-[9px] text-muted uppercase">{scenario.time_horizon}</div>
        </div>
      </div>
      <p className="text-xs text-text2 mb-3">{scenario.description}</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[10px] text-muted mb-1">Probabilidad</div>
          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
            <div className="h-full bg-blue1" style={{ width: `${scenario.probability}%` }} />
          </div>
          <div className="text-[10px] text-blue1 font-mono mt-0.5">{scenario.probability}%</div>
        </div>
        <div>
          <div className="text-[10px] text-muted mb-1">Impacto</div>
          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${scenario.impact}%`, backgroundColor: color }} />
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color }}>{scenario.impact}%</div>
        </div>
      </div>
      {scenario.triggers.length > 0 && (
        <div className="text-[10px] text-muted">
          Disparadores: {scenario.triggers.slice(0, 2).join(", ")}
        </div>
      )}
    </div>
  );
}
