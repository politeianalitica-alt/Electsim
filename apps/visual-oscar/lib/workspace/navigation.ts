import type { WorkspaceView } from "@/types/workspace";

export interface WorkspaceNavItem {
  key: WorkspaceView;
  label: string;
  segment: string;
  description: string;
}

export const WORKSPACE_VIEWS: WorkspaceNavItem[] = [
  { key: "overview",    label: "Overview",     segment: "overview",    description: "Centro diario de trabajo" },
  { key: "docs",        label: "Docs",         segment: "docs",        description: "Documentos inteligentes" },
  { key: "tables",      label: "Tables",       segment: "tables",      description: "Datos y análisis tabular" },
  { key: "canvas",      label: "Canvas",       segment: "canvas",      description: "Investigación visual" },
  { key: "research",    label: "Research",     segment: "research",    description: "Búsqueda y síntesis" },
  { key: "projects",    label: "Projects",     segment: "projects",    description: "Gestión del trabajo" },
  { key: "automations", label: "Automations",  segment: "automations", description: "Reglas y automatización" },
  { key: "knowledge",   label: "Knowledge",    segment: "knowledge",   description: "Memoria institucional" },
  { key: "reporting",   label: "Reporting",    segment: "reporting",   description: "Entregables y cliente" },
  { key: "terminal",    label: "Terminal",     segment: "terminal",    description: "Vista operativa intensiva" },
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
