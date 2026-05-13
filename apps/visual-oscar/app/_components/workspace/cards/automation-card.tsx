import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceAutomation } from "@/types/workspace";

const CATEGORY_MARK: Record<string, string> = {
  alerts: "AL",
  reports: "RP",
  ingest: "IN",
  agent: "AG",
};

const CATEGORY_LABEL: Record<string, string> = {
  alerts: "Alertas",
  reports: "Informes",
  ingest: "Ingesta",
  agent: "Agente",
};

interface AutomationCardProps {
  automation: WorkspaceAutomation;
  onToggle?: () => void;
  onClick?: () => void;
}

export function AutomationCard({ automation: a, onToggle, onClick }: AutomationCardProps) {
  const isActive = a.status === "active";
  return (
    <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Toggle */}
        <div
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          style={{
            width: 32, height: 18, borderRadius: 99, flexShrink: 0,
            background: isActive ? WS.accent : WS.surface3,
            position: "relative", cursor: onToggle ? "pointer" : "default",
            transition: "background 160ms",
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff",
            position: "absolute", top: 2,
            left: isActive ? 16 : 2,
            transition: "left 160ms",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: isActive ? WS.accent : WS.ink3,
              background: isActive ? WS.accentSubtle : WS.surface2,
              padding: "1px 6px", borderRadius: 5, letterSpacing: "0.04em",
            }}>
              {CATEGORY_MARK[a.category]}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? WS.ink : WS.ink3 }}>
              {a.name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: WS.ink3, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span>{a.triggerLabel}</span>
            <span>→</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.actionLabel}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WS.ink2 }}>{a.runCount}</div>
          <div style={{ fontSize: 9.5, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ejecuciones
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}
