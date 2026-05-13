import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceOpportunity } from "@/types/workspace";

interface OpportunityCardProps {
  opportunity: WorkspaceOpportunity;
  onClick?: () => void;
}

export function OpportunityCard({ opportunity: opp, onClick }: OpportunityCardProps) {
  const scoreColor = opp.score >= 80 ? WS.success : opp.score >= 65 ? WS.accent : WS.warn;

  return (
    <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.3, marginBottom: 3 }}>
            {opp.title}
          </div>
          <WsBadge label={opp.area} color={WS.accent} size="xs" />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {opp.score}
          </div>
          <div style={{ fontSize: 9.5, color: WS.ink3, marginTop: 2 }}>Score</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: WS.ink3, lineHeight: 1.5, marginBottom: 8 }}>
        {opp.rationale}
      </div>

      <div style={{
        padding: "8px 10px",
        background: WS.surface2,
        borderRadius: 8,
        borderLeft: `2px solid ${WS.accent}`,
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 9.5, color: WS.ink3, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          Recomendado
        </div>
        <div style={{ fontSize: 11.5, color: WS.ink, lineHeight: 1.4 }}>
          {opp.recommendedAction}
        </div>
      </div>

      <div style={{ fontSize: 10, color: WS.ink3 }}>
        Ventana: {formatShortDate(opp.windowStart)} → {formatShortDate(opp.windowEnd)}
      </div>
    </WorkspaceCard>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
