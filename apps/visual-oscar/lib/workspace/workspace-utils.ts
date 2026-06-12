/**
 * Tokens del Workspace — alineados con la estética Apple-clara del frontend.
 *
 * Antes el workspace era una superposición dark (#09090b). Ahora seguimos el
 * sistema `tokens.css` (#fbfbfd / #1d1d1f / brand #1F4E8C) para que el
 * usuario perciba una sola plataforma coherente.
 */

/**
 * Workspace canónico por defecto. Único id con datos en mock-data.ts y el
 * que usa el AppHeader. NO usar literales ('spain-energy' provocaba que el
 * Toolbox deep-linkara a un workspace vacío).
 */
export const DEFAULT_WORKSPACE_ID = 'ws_espana_2026'

export const WS = {
  // Superficies (claras, sutilmente jerárquicas)
  bg: "#fbfbfd",
  surface: "#ffffff",
  surface2: "#f5f5f7",
  surface3: "#eceef2",

  // Hairlines · espeja --color-hairline-soft (#e8e8ed): el mismo hairline
  // que usan las cards del resto del sitio. El workspace usaba #d2d2d7
  // (más oscuro) y el chrome entero se percibía como "otra app".
  border: "#e8e8ed",
  borderStrong: "#d2d2d7",

  // Tinta (texto)
  ink: "#1d1d1f",
  ink2: "#3a3a3d",
  ink3: "#6e6e73",

  // Accent · azul CORPORATIVO Politeia (espeja --color-brand de tokens.css).
  // Fase 1: antes era el azul Apple (#0071e3) y el usuario veía cambiar el
  // color de marca al pasar del header al workspace. Valores en hex (no
  // var()) porque varios componentes concatenan sufijos de alpha ("…55").
  accent: "#1F4E8C",
  accentHover: "#173E70",
  accentSubtle: "rgba(31,78,140,0.10)",

  // Semánticos
  success: "#2d8a39",
  successSub: "rgba(45,138,57,0.10)",
  danger: "#c42c2c",
  dangerSub: "rgba(196,44,44,0.10)",
  warn: "#d97706",
  warnSub: "rgba(217,119,6,0.10)",

  // Geometría
  sidebarW:     220,
  agentW:       300,
  topbarH:      48,
  tabsH:        38,
  radius:       12,

  // Tipografía · via next/font (Inter) como el resto de la plataforma.
  // Antes hardcodeaba SF Pro: en Windows/Linux el workspace caía a
  // Helvetica/Segoe mientras la app usaba Inter (métricas distintas).
  font: "var(--font-text, 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif)",
  fontDisplay: "var(--font-display, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif)",
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
