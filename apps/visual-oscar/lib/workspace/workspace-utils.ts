export const WS = {
  bg:           "#09090b",
  surface:      "#111117",
  surface2:     "#18181f",
  surface3:     "#20202a",
  border:       "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
  ink:          "#f0f0f5",
  ink2:         "#a1a1b0",
  ink3:         "#5a5a6e",
  accent:       "#4f7df2",
  accentHover:  "#6b93f5",
  accentSubtle: "rgba(79,125,242,0.12)",
  success:      "#3dba4c",
  successSub:   "rgba(61,186,76,0.12)",
  danger:       "#ff453a",
  dangerSub:    "rgba(255,69,58,0.12)",
  warn:         "#ffd60a",
  warnSub:      "rgba(255,214,10,0.12)",
  sidebarW:     220,
  agentW:       280,
  topbarH:      44,
  tabsH:        36,
  radius:       10,
  font:         "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif",
} as const;

export function priorityColor(priority: string): string {
  switch (priority) {
    case "critical": return WS.danger;
    case "high":     return WS.warn;
    case "medium":   return WS.accent;
    case "low":      return WS.ink3;
    default:         return WS.ink3;
  }
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case "critical": return "Crítico";
    case "high":     return "Alto";
    case "medium":   return "Medio";
    case "low":      return "Bajo";
    default:         return priority;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "open":        return WS.ink3;
    case "in_progress": return WS.accent;
    case "resolved":    return WS.success;
    default:            return WS.ink3;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "open":        return "Abierto";
    case "in_progress": return "En curso";
    case "resolved":    return "Resuelto";
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
    case "research": return "#a78bfa";
    default:         return WS.ink3;
  }
}
