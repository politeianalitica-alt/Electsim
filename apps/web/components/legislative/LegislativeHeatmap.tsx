import type { LegislativeHeatmapCell, UrgencyLevel } from "@/lib/types/legislative";
import { BarChart3 } from "lucide-react";

const URGENCY_ORDER: UrgencyLevel[] = ["critical", "high", "medium", "low"];
const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo",
};

function cellColor(score: number, count: number): string {
  if (count === 0) return "bg-bg3";
  if (score >= 80) return "bg-red-500/70";
  if (score >= 65) return "bg-amber-500/60";
  if (score >= 50) return "bg-cyan-500/50";
  return "bg-cyan-500/20";
}

interface Props {
  cells: LegislativeHeatmapCell[];
}

export function LegislativeHeatmap({ cells }: Props) {
  const sectors = Array.from(new Set(cells.map(c => c.sector)));
  const byKey = Object.fromEntries(cells.map(c => [`${c.sector}|${c.urgency}`, c]));

  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de calor legislativo</h2>
        <span className="text-[10px] text-muted ml-auto">sector × urgencia</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-muted font-normal pb-2 pr-3">Sector</th>
              {URGENCY_ORDER.map(u => (
                <th key={u} className="text-center text-muted font-normal pb-2 px-2">{URGENCY_LABELS[u]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map(sector => (
              <tr key={sector}>
                <td className="text-text2 pr-3 py-1 capitalize whitespace-nowrap">{sector}</td>
                {URGENCY_ORDER.map(urgency => {
                  const cell = byKey[`${sector}|${urgency}`];
                  return (
                    <td key={urgency} className="px-2 py-1 text-center">
                      {cell ? (
                        <div
                          className={`rounded px-2 py-1 ${cellColor(cell.score, cell.count)} font-mono text-text1 text-center`}
                          title={`${cell.count} iniciativas, score ${cell.score.toFixed(0)}`}
                        >
                          {cell.count}
                        </div>
                      ) : (
                        <div className="rounded px-2 py-1 bg-bg3 text-muted">—</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
