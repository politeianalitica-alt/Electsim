import type { SectorImpact, ImpactLevel } from "@/lib/types/legislative";
import { Layers } from "lucide-react";

const IMPACT_COLOR: Record<ImpactLevel, string> = {
  alto: "#EF4444", medio: "#F59E0B", bajo: "#3B82F6",
};

interface Props {
  impacts: SectorImpact[];
}

export function LegislativeSectorImpact({ impacts }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Impacto sectorial</h3>
      </div>
      {impacts.map((s, i) => (
        <div key={i} className="p-3 rounded-lg border border-border1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-text1">{s.sector_label}</span>
            <span className="font-mono text-xs" style={{ color: IMPACT_COLOR[s.impact_level] }}>
              {s.impact_score}/100
            </span>
          </div>
          {s.summary && <p className="text-xs text-text2 leading-relaxed">{s.summary}</p>}
          <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${s.impact_score}%`, backgroundColor: IMPACT_COLOR[s.impact_level] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
