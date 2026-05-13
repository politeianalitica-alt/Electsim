import { WS } from "@/lib/workspace/workspace-utils";
import type { WorkspaceActivityEvent } from "@/types/workspace";

const TYPE_CONFIG: Record<string, { color: string; mark: string; label: string }> = {
  issue:      { color: WS.danger,  mark: "IS", label: "Issue" },
  doc:        { color: WS.accent,  mark: "DC", label: "Doc" },
  decision:   { color: "#a78bfa",  mark: "DE", label: "Decisión" },
  automation: { color: WS.warn,    mark: "AU", label: "Automatización" },
  research:   { color: WS.success, mark: "RE", label: "Research" },
  alert:      { color: WS.danger,  mark: "AL", label: "Alerta" },
  action:     { color: WS.accent,  mark: "AC", label: "Acción" },
};

interface ActivityFeedProps {
  events: WorkspaceActivityEvent[];
  limit?: number;
  compact?: boolean;
}

export function ActivityFeed({ events, limit, compact = false }: ActivityFeedProps) {
  const items = limit ? events.slice(0, limit) : events;

  if (items.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: WS.ink3, fontSize: 12 }}>
        Sin actividad reciente
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 8 }}>
      {items.map(ev => {
        const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.action;
        return (
          <div
            key={ev.id}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: compact ? "6px 8px" : "8px 10px",
              borderRadius: 8,
              transition: "background 120ms",
            }}
          >
            <div style={{
              width: compact ? 22 : 26, height: compact ? 22 : 26,
              borderRadius: 7, flexShrink: 0,
              background: `${cfg.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: compact ? 8.5 : 9.5, fontWeight: 700,
              color: cfg.color, letterSpacing: "0.04em",
            }}>
              {cfg.mark}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: compact ? 11.5 : 12, color: WS.ink, lineHeight: 1.4 }}>
                {ev.title}
              </div>
              <div style={{ fontSize: 10, color: WS.ink3, marginTop: 1, display: "flex", gap: 6 }}>
                {ev.actorName && <span>{ev.actorName}</span>}
                <span>·</span>
                <span>{formatRelative(ev.createdAt)}</span>
                {ev.meta && (
                  <>
                    <span>·</span>
                    <span>{ev.meta}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffM = (Date.now() - d.getTime()) / 60_000;
  if (diffM < 60) return `hace ${Math.max(1, Math.round(diffM))}m`;
  const diffH = diffM / 60;
  if (diffH < 24) return `hace ${Math.round(diffH)}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD}d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
