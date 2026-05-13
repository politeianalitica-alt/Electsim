import { WS } from "@/lib/workspace/workspace-utils";
import { ViewIcon } from "./workspace-icons";
import type { WorkspaceView } from "@/types/workspace";

interface WorkspaceViewHeaderProps {
  view: WorkspaceView;
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export function WorkspaceViewHeader({ view, title, description, badge, actions }: WorkspaceViewHeaderProps) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      marginBottom: 24, gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: WS.accentSubtle,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <ViewIcon view={view} size={17} color={WS.accent} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{
              margin: 0, fontSize: 20, fontWeight: 700, color: WS.ink,
              letterSpacing: "-0.02em", lineHeight: 1.2,
              fontFamily: WS.font,
            }}>
              {title}
            </h1>
            {badge && (
              <span style={{
                fontSize: 10.5, fontWeight: 600,
                background: WS.accentSubtle, color: WS.accent,
                padding: "2px 8px", borderRadius: 99,
                letterSpacing: "0.02em",
              }}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: WS.ink3, lineHeight: 1.4 }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
