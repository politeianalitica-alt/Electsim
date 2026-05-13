import { WS, priorityColor, priorityLabel } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceProject } from "@/types/workspace";

const TYPE_LABEL: Record<string, string> = {
  campaign: "Campaña",
  lobby: "Lobby",
  analysis: "Análisis",
  crisis: "Crisis",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  paused: "En pausa",
  completed: "Completado",
};

const STATUS_COLOR: Record<string, string> = {
  active: WS.success,
  paused: WS.warn,
  completed: WS.accent,
};

interface ProjectCardProps {
  project: WorkspaceProject;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const riskColor = priorityColor(project.riskLevel);

  return (
    <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.3, marginBottom: 4 }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: WS.ink3 }}>
            {project.client} · {TYPE_LABEL[project.type]}
          </div>
        </div>
        <WsBadge label={STATUS_LABEL[project.status]} color={STATUS_COLOR[project.status]} />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: WS.ink3, marginBottom: 4 }}>
          <span>Progreso</span>
          <span style={{ color: WS.ink2, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <div style={{ height: 4, background: WS.surface2, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${project.progress}%`, background: STATUS_COLOR[project.status], borderRadius: 99, transition: "width 400ms" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10.5, color: WS.ink3 }}>Riesgo:</span>
          <WsBadge label={priorityLabel(project.riskLevel)} color={riskColor} size="xs" />
        </div>
        {project.dueDate && (
          <span style={{ fontSize: 10.5, color: WS.ink3 }}>
            Hasta {formatShortDate(project.dueDate)}
          </span>
        )}
      </div>

      {project.membersIds.length > 0 && (
        <div style={{ display: "flex", marginTop: 8 }}>
          {project.membersIds.slice(0, 4).map((id, i) => (
            <div key={id} title={id} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: WS.surface3, border: `2px solid ${WS.surface}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 700, color: WS.ink3,
              marginLeft: i > 0 ? -6 : 0,
            }}>{id.replace("u", "U")}</div>
          ))}
        </div>
      )}
    </WorkspaceCard>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
