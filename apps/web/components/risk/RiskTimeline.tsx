import type { RiskTimelinePoint } from "@/lib/types/risk_rich";

function scoreColor(score: number) {
  if (score >= 75) return "#EF4444";
  if (score >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskTimeline({ points }: { points: RiskTimelinePoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-muted text-center py-4">Sin datos de timeline.</p>;
  }
  const sorted = [...points].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ul className="space-y-3 relative before:absolute before:left-[6px] before:top-0 before:bottom-0 before:w-px before:bg-border1">
      {sorted.map((p, i) => {
        const color = scoreColor(p.score);
        return (
          <li key={i} className="flex gap-3 pl-5 relative">
            <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-bg1" style={{ backgroundColor: color }} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-cyan1">{p.date}</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>{p.score}</span>
              </div>
              {p.event && <p className="text-xs text-text2">{p.event}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
