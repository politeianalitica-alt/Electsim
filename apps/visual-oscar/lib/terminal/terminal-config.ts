/**
 * Configuración de paneles para el Terminal (Sprint 15).
 * Cada panel tiene un id, un título humano y un tamaño por defecto en columnas
 * del grid (1-4) que el usuario puede alterar localmente.
 */

export type TerminalPanelKind =
  | "alerts"
  | "agenda"
  | "inbox"
  | "issues"
  | "research"
  | "activity"
  | "radar"
  | "console";

export interface TerminalPanelDef {
  id:    TerminalPanelKind;
  label: string;
  hint:  string;
  /** Ancho por defecto, en columnas del grid de 4 columnas. */
  span:  1 | 2 | 3 | 4;
  /** Altura aproximada en filas (1-2). */
  rows:  1 | 2;
}

export const TERMINAL_PANELS: TerminalPanelDef[] = [
  { id: "alerts",   label: "Alertas activas",   hint: "Prioridad descendente",  span: 1, rows: 1 },
  { id: "agenda",   label: "Agenda 24h",        hint: "Próximos eventos",       span: 1, rows: 1 },
  { id: "inbox",    label: "Inbox del equipo",  hint: "Acciones pendientes",    span: 2, rows: 1 },
  { id: "issues",   label: "Issues críticos",   hint: "Top severity",           span: 2, rows: 1 },
  { id: "research", label: "Research activo",   hint: "Hilos abiertos",         span: 1, rows: 1 },
  { id: "activity", label: "Feed de actividad", hint: "Stream tiempo real",     span: 1, rows: 2 },
  { id: "radar",    label: "Radar (mini)",      hint: "Top oportunidades",      span: 2, rows: 1 },
  { id: "console",  label: "Consola",           hint: "Comandos rápidos",       span: 4, rows: 1 },
];

export type TerminalMode = "focus" | "warroom" | "compact";

export interface TerminalLayout {
  mode: TerminalMode;
  /** ids visibles, en orden. */
  visible: TerminalPanelKind[];
}

export const DEFAULT_LAYOUT: TerminalLayout = {
  mode: "focus",
  visible: ["alerts", "agenda", "inbox", "issues", "research", "activity", "radar", "console"],
};

export const FOCUS_LAYOUT: TerminalLayout = {
  mode: "focus",
  visible: ["issues", "inbox", "activity", "console"],
};

export const WARROOM_LAYOUT: TerminalLayout = {
  mode: "warroom",
  visible: ["alerts", "issues", "radar", "inbox", "agenda", "activity", "research", "console"],
};

export function layoutForMode(mode: TerminalMode): TerminalLayout {
  if (mode === "focus")   return FOCUS_LAYOUT;
  if (mode === "warroom") return WARROOM_LAYOUT;
  return DEFAULT_LAYOUT;
}

export const TERMINAL_HOTKEYS: Record<string, string> = {
  "g 1": "Modo Focus",
  "g 2": "Modo War Room",
  "g 3": "Modo Compact",
  "?":   "Mostrar atajos",
  "/":   "Foco a consola",
  "esc": "Cerrar paneles modales",
};
