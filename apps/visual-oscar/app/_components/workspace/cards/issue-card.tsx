import { WS, priorityColor, priorityLabel, statusColor, statusLabel } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge, WsDot } from "./workspace-card";
import type { WorkspaceIssue } from "@/types/workspace";

interface IssueCardProps {
  issue: WorkspaceIssue;
  onClick?: () => void;
  variant?: "row" | "card";
  showAssignee?: boolean;
}

const STATUS_MAP: Record<string, string> = {
  open: "Abierto",
  monitoring: "Seguimiento",
  closed: "Cerrado",
  in_progress: "En curso",
  resolved: "Resuelto",
};

export function IssueCard({ issue, onClick, variant = "card", showAssignee = true }: IssueCardProps) {
  const sevColor = priorityColor(issue.severity);

  if (variant === "row") {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", borderRadius: 9,
          background: WS.surface2, cursor: onClick ? "pointer" : "default",
        }}
      >
        <WsDot color={sevColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: WS.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {issue.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 10.5, color: statusColor(issue.status) }}>
              {STATUS_MAP[issue.status] ?? issue.status}
            </span>
            {issue.dueDate && (
              <span style={{ fontSize: 10.5, color: WS.ink3 }}>
                · vence {formatShortDate(issue.dueDate)}
              </span>
            )}
          </div>
        </div>
        {showAssignee && issue.ownerId && (
          <Avatar id={issue.ownerId} />
        )}
      </div>
    );
  }

  return (
    <WorkspaceCard onClick={onClick} hoverable={!!onClick} accentBorder={sevColor}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <WsDot color={sevColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.3, marginBottom: 3 }}>
            {issue.title}
          </div>
          <div style={{ fontSize: 11.5, color: WS.ink3, lineHeight: 1.45 }}>
            {issue.summary}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <WsBadge label={priorityLabel(issue.severity)} color={sevColor} />
        <WsBadge label={STATUS_MAP[issue.status] ?? issue.status} color={statusColor(issue.status)} />
        {issue.dueDate && (
          <span style={{ fontSize: 10.5, color: WS.ink3 }}>
            · vence {formatShortDate(issue.dueDate)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {showAssignee && issue.ownerId && <Avatar id={issue.ownerId} />}
      </div>
    </WorkspaceCard>
  );
}

function Avatar({ id }: { id: string }) {
  const initials = id.replace("u", "").padStart(2, "U");
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      background: WS.surface3,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, fontWeight: 700, color: WS.ink3, flexShrink: 0,
    }} title={`Asignado: ${id}`}>
      {initials.toUpperCase()}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// imports

