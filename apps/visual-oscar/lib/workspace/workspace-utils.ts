/**
 * Tokens del Workspace — alineados con la estética Apple-clara del frontend.
 *
 * Antes el workspace era una superposición dark (#09090b). Ahora seguimos el
 * sistema `tokens.css` (#fbfbfd / #1d1d1f / accent #0071e3) para que el
 * usuario perciba una sola plataforma coherente.
 */

export const WS = {
  // Superficies (claras, sutilmente jerárquicas)
  bg:           "#fbfbfd",
  surface:      "#ffffff",
  surface2:     "#f5f5f7",
  surface3:     "#eceef2",

  // Hairlines
  border:       "#d2d2d7",
  borderStrong: "#b0b0b8",

  // Tinta (texto)
  ink:          "#1d1d1f",
  ink2:         "#3a3a3d",
  ink3:         "#6e6e73",

  // Accent (Apple system blue)
  accent:       "#0071e3",
  accentHover:  "#0077ed",
  accentSubtle: "rgba(0,113,227,0.10)",

  // Semánticos
  success:      "#2d8a39",
  successSub:   "rgba(45,138,57,0.10)",
  danger:       "#c42c2c",
  dangerSub:    "rgba(196,44,44,0.10)",
  warn:         "#d97706",
  warnSub:      "rgba(217,119,6,0.10)",

  // Geometría
  sidebarW:     220,
  agentW:       300,
  topbarH:      48,
  tabsH:        38,
  radius:       12,

  // Tipografía
  font:         "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif",
  fontDisplay:  "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif",
} as const;

export function priorityColor(priority: string): string {
  switch (priority) {
    case "critical": return WS.danger;
    case "high":     return WS.warn;
    case "medium":   return WS.accent;
    case "normal":   return WS.accent;
    case "low":      return WS.ink3;
    default:         return WS.ink3;
  }
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case "critical": return "Crítico";
    case "high":     return "Alto";
    case "medium":   return "Medio";
    case "normal":   return "Normal";
    case "low":      return "Bajo";
    default:         return priority;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "open":        return WS.ink3;
    case "in_progress": return WS.accent;
    case "resolved":    return WS.success;
    case "done":        return WS.success;
    case "blocked":     return WS.danger;
    default:            return WS.ink3;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "open":        return "Abierto";
    case "in_progress": return "En curso";
    case "resolved":    return "Resuelto";
    case "done":        return "Hecho";
    case "blocked":     return "Bloqueado";
    default:            return status;
  }
}

export function memberStatusColor(status?: string): string {
  switch (status) {
    case "online":  return WS.success;
    case "busy":    return WS.warn;
    case "offline": return WS.ink3;
    default:        return WS.ink3;
  }
}

export function contextItemTypeColor(type: string): string {
  switch (type) {
    case "issue":    return WS.danger;
    case "canvas":   return WS.accent;
    case "document": return WS.ink2;
    case "alert":    return WS.warn;
    case "project":  return WS.success;
    case "research": return "#7e57c2";
    default:         return WS.ink3;
  }
}
