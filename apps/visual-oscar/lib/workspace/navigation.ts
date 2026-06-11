import type { WorkspaceView } from "@/types/workspace";

export interface WorkspaceNavItem {
  key:         WorkspaceView;
  label:       string;
  segment:     string;
  description: string;
  /** Si la vista pertenece a un grupo de navegación (visual en sidebar). */
  group: "operativo" | "contenido" | "inteligencia" | "sistema";
}

export const WORKSPACE_VIEWS: WorkspaceNavItem[] = [
  // Operativo · vista diaria
  { key: "overview",    label: "Command Center", segment: "overview",    description: "Vista de las 8:55 — Morning Brief + KPIs + equipo",          group: "operativo" },
  { key: "inbox",       label: "Inbox",          segment: "inbox",       description: "Señal sin ruido · RSS · BOE · Alerts · X",                    group: "operativo" },
  { key: "terminal",    label: "Terminal",       segment: "terminal",    description: "Vista operativa intensiva · Focus · War Room",                group: "operativo" },

  // Contenido · entregables
  { key: "docs",        label: "Docs",           segment: "docs",        description: "Documentos inteligentes con contexto político del día",       group: "contenido" },
  { key: "tables",      label: "Tables",         segment: "tables",      description: "Tablas vivas · fórmulas en lenguaje natural · D'Hondt",       group: "contenido" },
  { key: "slides",      label: "Slides",         segment: "slides",      description: "Presentaciones generadas por Ollama · modo presentación",      group: "contenido" },
  { key: "reporting",   label: "Reporting",      segment: "reporting",   description: "Dashboard analytics + síntesis ejecutiva + export PDF",       group: "contenido" },
  { key: "cama",        label: "Cama",           segment: "cama",        description: "Campañas y macroargumentos · narrativas versionadas",         group: "contenido" },
  { key: "preinformes", label: "Preinformes",    segment: "preinformes", description: "Borradores de informe guiados · Markdown / PDF",              group: "contenido" },

  // Inteligencia · análisis y decisión
  { key: "canvas",      label: "Canvas",         segment: "canvas",      description: "Investigation Canvas visual + ontología",                     group: "inteligencia" },
  { key: "research",    label: "Research",       segment: "research",    description: "Search + síntesis con citas",                                  group: "inteligencia" },
  { key: "radar",       label: "Radar",          segment: "radar",       description: "Oportunidades en tiempo real (Ollama)",                       group: "inteligencia" },
  { key: "simulator",   label: "Simulador",      segment: "simulator",   description: "Antes de actuar · 3 outcomes + war gaming",                   group: "inteligencia" },
  { key: "knowledge",   label: "Knowledge",      segment: "knowledge",   description: "Memoria institucional · wiki actores/leyes",                   group: "inteligencia" },
  { key: "vigilancia",  label: "Vigilancia",     segment: "vigilancia",  description: "Intel OSINT en vivo · noticias · alertas sísmicas",            group: "inteligencia" },
  { key: "guardados",   label: "Guardados",      segment: "guardados",   description: "Entidades enviadas desde el mapa OSINT",                       group: "inteligencia" },

  // Sistema · gestión
  { key: "projects",    label: "Projects",       segment: "projects",    description: "Gantt · Kanban · Lista · Resumen",                            group: "sistema" },
  { key: "automations", label: "Automations",    segment: "automations", description: "Reglas en lenguaje natural · interfaz Zapier-like",          group: "sistema" },
];

export function buildWorkspaceHref(workspaceId: string, segment: string): string {
  return `/workspaces/${workspaceId}/${segment}`;
}

export function getViewBySegment(segment: string): WorkspaceNavItem | undefined {
  return WORKSPACE_VIEWS.find(v => v.segment === segment);
}

export function getViewByPath(pathname: string): WorkspaceNavItem | undefined {
  const seg = pathname.split("/").at(-1) ?? "";
  return getViewBySegment(seg);
}

export const NAV_GROUP_LABELS: Record<WorkspaceNavItem["group"], string> = {
  operativo: "Operativo",
  contenido: "Contenido",
  inteligencia: "Inteligencia",
  sistema: "Sistema",
};
