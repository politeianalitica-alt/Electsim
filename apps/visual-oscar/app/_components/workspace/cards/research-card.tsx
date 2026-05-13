import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceResearchThread } from "@/types/workspace";

interface ResearchCardProps {
  thread: WorkspaceResearchThread;
  onClick?: () => void;
}

export function ResearchCard({ thread, onClick }: ResearchCardProps) {
  const isActive = thread.status === "active";

  return (
    <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: WS.accentSubtle,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={WS.accent} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.3, marginBottom: 3 }}>
            {thread.title}
          </div>
          <div style={{ fontSize: 11, color: WS.ink3, lineHeight: 1.45, marginBottom: 6 }}>
            {thread.summary}
          </div>
        </div>
        <WsBadge
          label={isActive ? "Activa" : "Archivada"}
          color={isActive ? WS.success : WS.ink3}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: WS.ink3 }}>
        <span><strong style={{ color: WS.ink2 }}>{thread.sourceCount}</strong> fuentes</span>
        <span>·</span>
        <span><strong style={{ color: WS.ink2 }}>{thread.citations}</strong> citas</span>
        <div style={{ flex: 1 }} />
        <span>{formatRelative(thread.updatedAt)}</span>
      </div>
    </WorkspaceCard>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffH = (Date.now() - d.getTime()) / 3600_000;
  if (diffH < 1) return "hace minutos";
  if (diffH < 24) return `hace ${Math.round(diffH)}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
