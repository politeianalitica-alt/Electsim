/**
 * Builder de métricas para el dashboard analytics (Sprint 10).
 * Convierte el dominio (issues/actions/projects/alerts/...) en series listas
 * para Recharts y en un dossier ejecutivo compactado para Ollama.
 */

import type {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceDecision,
  WorkspaceDocument,
  WorkspaceIssue,
  WorkspaceOpportunity,
  WorkspaceProject,
  WorkspaceResearchThread,
} from "@/types/workspace";

export interface KpiTile {
  key: string;
  label: string;
  value: number;
  hint?: string;
  trend?: number; // -1..+1
  tone: "neutral" | "positive" | "warning" | "danger";
}

export interface BarPoint {
  name: string;
  value: number;
  color?: string;
}

export interface SeriesPoint {
  date: string; // ISO yyyy-mm-dd
  issues: number;
  actions: number;
  alerts: number;
}

export interface PiePoint {
  name: string;
  value: number;
  color: string;
}

export interface AnalyticsSnapshot {
  kpis: KpiTile[];
  issuesBySeverity: BarPoint[];
  actionsByStatus: BarPoint[];
  projectsRisk: BarPoint[];
  opportunityScore: BarPoint[];
  documentsByKind: PiePoint[];
  weeklyActivity: SeriesPoint[];
  topOpportunities: WorkspaceOpportunity[];
  topProjects: WorkspaceProject[];
}

export interface AnalyticsInput {
  issues: WorkspaceIssue[];
  actions: WorkspaceAction[];
  alerts: WorkspaceAlert[];
  decisions: WorkspaceDecision[];
  documents: WorkspaceDocument[];
  research: WorkspaceResearchThread[];
  projects: WorkspaceProject[];
  opportunities: WorkspaceOpportunity[];
}

const SEVERITY_ORDER: Array<{ key: string; label: string; color: string }> = [
  { key: "critical", label: "Crítico", color: "#ff453a" },
  { key: "high",     label: "Alto",    color: "#ff8c5a" },
  { key: "normal",   label: "Normal",  color: "#4f7df2" },
  { key: "low",      label: "Bajo",    color: "#5a5a6e" },
];

const STATUS_ORDER: Array<{ key: string; label: string; color: string }> = [
  { key: "pending",     label: "Pendiente",   color: "#5a5a6e" },
  { key: "in_progress", label: "En curso",    color: "#4f7df2" },
  { key: "done",        label: "Completado",  color: "#3dba4c" },
];

const DOC_KIND_COLORS: Record<string, string> = {
  briefing:        "#4f7df2",
  memo:            "#8b5cf6",
  "crisis-note":   "#ff453a",
  analysis:        "#06b6d4",
  "client-report": "#3dba4c",
  positioning:     "#f59e0b",
  "talking-points":"#ec4899",
};

const RISK_COLORS: Record<string, string> = {
  low:      "#3dba4c",
  normal:   "#4f7df2",
  high:     "#f59e0b",
  critical: "#ff453a",
};

function countBy<T>(list: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of list) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

export function buildAnalytics(input: AnalyticsInput): AnalyticsSnapshot {
  const { issues, actions, alerts, projects, opportunities, documents, decisions } = input;

  // KPIs ----------------------------------------------------------------
  const openIssues  = issues.filter(i => i.status !== "closed").length;
  const criticalIs  = issues.filter(i => i.severity === "critical" && i.status !== "closed").length;
  const pendingAct  = actions.filter(a => a.status !== "done").length;
  const overdueAct  = actions.filter(a => a.status !== "done" && new Date(a.dueDate) < new Date()).length;
  const activeAlt   = alerts.filter(a => a.status === "active").length;
  const decisionsWk = decisions.filter(d => {
    const days = (Date.now() - new Date(d.decidedAt).getTime()) / 86_400_000;
    return days <= 7;
  }).length;

  const kpis: KpiTile[] = [
    { key: "issues",   label: "Issues abiertos",   value: openIssues, hint: `${criticalIs} críticos`, tone: criticalIs > 0 ? "danger" : "neutral" },
    { key: "actions",  label: "Acciones pendientes", value: pendingAct, hint: `${overdueAct} fuera de plazo`, tone: overdueAct > 0 ? "warning" : "neutral" },
    { key: "alerts",   label: "Alertas activas",   value: activeAlt, tone: activeAlt > 0 ? "warning" : "positive" },
    { key: "decisions",label: "Decisiones (7d)",   value: decisionsWk, tone: "positive" },
    { key: "projects", label: "Proyectos activos", value: projects.filter(p => p.status === "active").length, tone: "neutral" },
    { key: "research", label: "Investigaciones",   value: input.research.filter(r => r.status === "active").length, tone: "neutral" },
    { key: "documents",label: "Documentos",        value: documents.length, tone: "neutral" },
    { key: "opps",     label: "Oportunidades",     value: opportunities.length, tone: "positive" },
  ];

  // Issues by severity --------------------------------------------------
  const severityMap = countBy(issues, i => i.severity);
  const issuesBySeverity = SEVERITY_ORDER.map(s => ({
    name:  s.label,
    value: severityMap.get(s.key) ?? 0,
    color: s.color,
  }));

  // Actions by status ---------------------------------------------------
  const statusMap = countBy(actions, a => a.status);
  const actionsByStatus = STATUS_ORDER.map(s => ({
    name:  s.label,
    value: statusMap.get(s.key) ?? 0,
    color: s.color,
  }));

  // Projects risk -------------------------------------------------------
  const riskMap = countBy(projects, p => p.riskLevel);
  const projectsRisk = SEVERITY_ORDER.map(s => ({
    name:  s.label,
    value: riskMap.get(s.key) ?? 0,
    color: RISK_COLORS[s.key] ?? s.color,
  }));

  // Opportunity score buckets (top 6) -----------------------------------
  const opportunityScore = [...opportunities]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(o => ({ name: o.title.length > 24 ? o.title.slice(0, 24) + "…" : o.title, value: o.score, color: "#4f7df2" }));

  // Documents by kind ---------------------------------------------------
  const kindMap = countBy(documents, d => d.kind);
  const documentsByKind: PiePoint[] = Array.from(kindMap.entries()).map(([k, v]) => ({
    name:  k,
    value: v,
    color: DOC_KIND_COLORS[k] ?? "#a1a1b0",
  }));

  // Weekly activity (last 14 days) --------------------------------------
  const days = lastNDays(14);
  const weeklyActivity = days.map(day => {
    return {
      date: day,
      issues:  issues.filter(i => i.createdAt.slice(0, 10) === day).length,
      actions: actions.filter(a => a.dueDate.slice(0, 10) === day).length,
      alerts:  alerts.filter(a => a.createdAt.slice(0, 10) === day).length,
    };
  });

  // Top items -----------------------------------------------------------
  const topOpportunities = [...opportunities].sort((a, b) => b.score - a.score).slice(0, 5);
  const topProjects = [...projects].sort((a, b) => b.progress - a.progress).slice(0, 5);

  return {
    kpis,
    issuesBySeverity,
    actionsByStatus,
    projectsRisk,
    opportunityScore,
    documentsByKind,
    weeklyActivity,
    topOpportunities,
    topProjects,
  };
}

/**
 * Resumen compacto en texto que sirve de contexto para Ollama (síntesis ejecutiva).
 * Lo dejamos por debajo de ~1200 tokens.
 */
export function buildExecutiveContext(input: AnalyticsInput): string {
  const a = buildAnalytics(input);
  const lines: string[] = [];
  lines.push("KPIs:");
  for (const k of a.kpis) lines.push(`- ${k.label}: ${k.value}${k.hint ? ` (${k.hint})` : ""}`);
  lines.push("");
  lines.push("Issues por severidad:");
  for (const b of a.issuesBySeverity) lines.push(`- ${b.name}: ${b.value}`);
  lines.push("");
  lines.push("Proyectos top:");
  for (const p of a.topProjects) lines.push(`- ${p.name} (${p.client}) · ${p.progress}% · riesgo ${p.riskLevel}`);
  lines.push("");
  lines.push("Oportunidades top:");
  for (const o of a.topOpportunities) lines.push(`- [${o.score}] ${o.title} → ${o.recommendedAction}`);
  return lines.join("\n");
}
