import type {
  ProjectType,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  MilestoneType,
  GanttViewMode,
} from "@/types/project";

export const PROJECT_TYPE_CONFIG: Record<ProjectType, { label: string; mark: string; color: string }> = {
  electoral_campaign:     { label: "Campaña electoral",        mark: "ELC", color: "#6366f1" },
  legislative_process:    { label: "Proceso legislativo",       mark: "LEG", color: "#10b981" },
  crisis_management:      { label: "Gestión de crisis",         mark: "CRI", color: "#ef4444" },
  consultation:           { label: "Consultoría",               mark: "CON", color: "#f59e0b" },
  coalition_building:     { label: "Construcción coalición",    mark: "COA", color: "#8b5cf6" },
  communication_strategy: { label: "Estrategia comunicación",   mark: "COM", color: "#06b6d4" },
  research_project:       { label: "Proyecto investigación",    mark: "RES", color: "#84cc16" },
  event_management:       { label: "Gestión de eventos",        mark: "EVT", color: "#f97316" },
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning:  { label: "Planificación", color: "#94a3b8" },
  active:    { label: "Activo",        color: "#10b981" },
  on_hold:   { label: "En pausa",      color: "#f59e0b" },
  completed: { label: "Completado",    color: "#6366f1" },
  cancelled: { label: "Cancelado",     color: "#ef4444" },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  backlog:     { label: "Backlog",     color: "#475569" },
  todo:        { label: "Por hacer",   color: "#94a3b8" },
  in_progress: { label: "En curso",    color: "#6366f1" },
  review:      { label: "En revisión", color: "#f59e0b" },
  done:        { label: "Hecho",       color: "#10b981" },
  blocked:     { label: "Bloqueado",   color: "#ef4444" },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "#ef4444" },
  high:     { label: "Alto",    color: "#f59e0b" },
  medium:   { label: "Medio",   color: "#6366f1" },
  low:      { label: "Bajo",    color: "#475569" },
};

export const MILESTONE_TYPE_CONFIG: Record<MilestoneType, { label: string; color: string }> = {
  deadline:    { label: "Deadline",    color: "#ef4444" },
  vote:        { label: "Votación",    color: "#6366f1" },
  event:       { label: "Evento",      color: "#f59e0b" },
  publication: { label: "Publicación", color: "#10b981" },
  meeting:     { label: "Reunión",     color: "#06b6d4" },
  decision:    { label: "Decisión",    color: "#8b5cf6" },
};

export const GANTT_VIEW_CONFIG: Record<GanttViewMode, { label: string; columnWidth: number }> = {
  day:     { label: "Día",      columnWidth: 40 },
  week:    { label: "Semana",   columnWidth: 120 },
  month:   { label: "Mes",      columnWidth: 200 },
  quarter: { label: "Trimestre",columnWidth: 300 },
};

export const KANBAN_COLUMNS: TaskStatus[] = [
 "backlog", "todo", "in_progress", "review", "done", "blocked",
];
