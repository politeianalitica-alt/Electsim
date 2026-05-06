import type { RiskDimension } from "@/lib/types/risk_rich";

const DOMAIN_LABELS: Record<string, string> = {
  legislative: "Legislativo",
  media: "Mediático",
  actors: "Actores",
  coalition: "Coalición",
  economic: "Económico",
  geopolitical: "Geopolítico",
  territorial: "Territorial",
  system: "Sistémico",
};

function scoreColor(score: number) {
  if (score >= 75) return "#EF4444";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#3B82F6";
  return "#10B981";
}

function trendArrow(trend: string) {
  if (trend === "rising") return "▲";
  if (trend === "falling") return "▼";
  return "—";
}

interface RiskDimensionGridProps {
  dimensions: RiskDimension[];
  onSelect?: (d: RiskDimension) => void;
}

export function RiskDimensionGrid({ dimensions, onSelect }: RiskDimensionGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {dimensions.map(d => {
        const color = scoreColor(d.score);
        return (
          <div
            key={d.domain}
            className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            onClick={() => onSelect?.(d)}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              {DOMAIN_LABELS[d.domain] ?? d.domain}
            </div>
            <div className="text-2xl font-bold" style={{ color }}>{d.score}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px]" style={{ color }}>
                {trendArrow(d.trend)}
              </span>
              <span className="text-[10px] text-muted">{d.velocity}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
