/**
 * Shortcut registry: lugar centralizado donde declarar atajos globales.
 * El Command Palette (Cmd+K) los consume y el Terminal los hereda.
 */

export interface ShortcutDef {
  id:        string;
  label:     string;
  combo:     string;     // "g 1", "?", "cmd+k"...
  group: "navigation" | "terminal" | "agent" | "workspace";
  hint?:     string;
  /** Si es ruta, el palette navega con next/router. */
  href?:     string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: "cmd-k",        label: "Abrir Command Palette",    combo: "cmd+k",  group: "workspace",  hint: "Ctrl/Cmd + K" },
  { id: "go-overview",  label: "Ir a Overview",            combo: "g o",    group: "navigation", href: "/workspaces/ws_espana_2026/overview" },
  { id: "go-radar",     label: "Ir a Radar de Oportunidades", combo: "g r", group: "navigation", href: "/workspaces/ws_espana_2026/radar" },
  { id: "go-reporting", label: "Ir a Reporting",           combo: "g d",    group: "navigation", href: "/workspaces/ws_espana_2026/reporting" },
  { id: "go-terminal",  label: "Ir a Terminal",            combo: "g t",    group: "navigation", href: "/workspaces/ws_espana_2026/terminal" },
  { id: "go-research",  label: "Ir a Research",            combo: "g s",    group: "navigation", href: "/workspaces/ws_espana_2026/research" },
  { id: "go-projects",  label: "Ir a Projects",            combo: "g p",    group: "navigation", href: "/workspaces/ws_espana_2026/projects" },
  { id: "term-focus",   label: "Terminal: modo Focus",     combo: "g 1",    group: "terminal" },
  { id: "term-warroom", label: "Terminal: modo War Room",  combo: "g 2",    group: "terminal" },
  { id: "help",         label: "Mostrar atajos",           combo: "?",      group: "workspace" },
];

export function listShortcutsByGroup(): Record<string, ShortcutDef[]> {
  const out: Record<string, ShortcutDef[]> = {};
  for (const s of SHORTCUTS) {
    if (!out[s.group]) out[s.group] = [];
    out[s.group].push(s);
  }
  return out;
}
