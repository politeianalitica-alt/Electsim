import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard } from "./workspace-card";
import type { WorkspaceDecision } from "@/types/workspace";

interface DecisionCardProps {
  decision: WorkspaceDecision;
  onClick?: () => void;
}

export function DecisionCard({ decision: d, onClick }: DecisionCardProps) {
  return (
    <WorkspaceCard
      onClick={onClick}
      hoverable={!!onClick}
      style={{ background: WS.surface2 }}
      accentBorder={WS.accent}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: WS.ink, lineHeight: 1.4 }}>
          {d.title}
        </div>
        <span style={{ fontSize: 10, color: WS.ink3, flexShrink: 0, whiteSpace: "nowrap" }}>
          {formatShort(d.decidedAt)}
        </span>
      </div>
      {d.decisionMade && (
        <div style={{ fontSize: 11.5, color: WS.ink2, lineHeight: 1.45, marginBottom: 4 }}>
          {d.decisionMade}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5 }}>
        <span style={{ color: WS.accent, fontWeight: 600 }}>{d.decidedBy}</span>
        {d.context && (
          <>
            <span style={{ color: WS.ink3 }}>·</span>
            <span style={{ color: WS.ink3, lineHeight: 1.4 }}>{d.context}</span>
          </>
        )}
      </div>
    </WorkspaceCard>
  );
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
