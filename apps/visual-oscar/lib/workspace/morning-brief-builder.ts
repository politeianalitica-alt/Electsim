import type {
  WorkspaceIssue,
  WorkspaceAction,
  WorkspaceAlert,
} from "@/types/workspace";
import type { MorningBrief, AlertLevel } from "@/types/workspace-agenda";

export function buildMorningBrief(
  issues: WorkspaceIssue[],
  actions: WorkspaceAction[],
  alerts: WorkspaceAlert[]
): MorningBrief {
  const criticalIssues = issues.filter(i => i.severity === "critical" && i.status !== "closed");
  const now = new Date();
  const overdueActions = actions.filter(
    a => a.status !== "done" && new Date(a.dueDate) < now
  );
  const highAlerts = alerts.filter(
    a => (a.severity === "high" || a.severity === "critical") && a.status === "active"
  );

  const level: AlertLevel =
    criticalIssues.length >= 2 || highAlerts.length >= 3
      ? "crisis"
      : criticalIssues.length >= 1 || highAlerts.length >= 1
      ? "attention"
      : "normal";

  const highlights: string[] = [];
  if (criticalIssues.length > 0) {
    highlights.push(
      `${criticalIssues.length} issue${criticalIssues.length > 1 ? "s" : ""} crítico${criticalIssues.length > 1 ? "s" : ""} requiere${criticalIssues.length > 1 ? "n" : ""} atención inmediata`
    );
  }
  if (overdueActions.length > 0) {
    highlights.push(
      `${overdueActions.length} acción${overdueActions.length > 1 ? "es" : ""} vencida${overdueActions.length > 1 ? "s" : ""} sin cerrar`
    );
  }
  if (highAlerts.length > 0) {
    highlights.push(
      `${highAlerts.length} alerta${highAlerts.length > 1 ? "s" : ""} activa${highAlerts.length > 1 ? "s" : ""} en monitorización`
    );
  }

  const summaryParts: string[] = [];
  if (level === "crisis") {
    summaryParts.push("El workspace presenta una situación de alta tensión operativa.");
  } else if (level === "attention") {
    summaryParts.push("El workspace requiere atención en varios frentes hoy.");
  } else {
    summaryParts.push("El workspace está en estado operativo estable.");
  }
  if (criticalIssues[0]) {
    summaryParts.push(`El issue prioritario es «${criticalIssues[0].title}».`);
  }
  if (overdueActions.length > 0) {
    summaryParts.push(`Hay ${overdueActions.length} acciones vencidas que requieren cierre.`);
  }

  return {
    summary: summaryParts.join(" "),
    highlights,
    level,
    generatedAt: new Date().toISOString(),
  };
}

export function levelColor(level: AlertLevel): { bg: string; fg: string; label: string } {
  switch (level) {
    case "crisis":    return { bg: "rgb(239 68 68 / 0.15)",   fg: "#ef4444", label: "CRISIS" };
    case "attention": return { bg: "rgb(245 158 11 / 0.15)",  fg: "#f59e0b", label: "ATENCIÓN" };
    default:          return { bg: "rgb(34 197 94 / 0.15)",   fg: "#22c55e", label: "NORMAL" };
  }
}
