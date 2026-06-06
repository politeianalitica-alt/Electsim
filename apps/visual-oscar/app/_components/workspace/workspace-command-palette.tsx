"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { WORKSPACE_VIEWS, buildWorkspaceHref } from "@/lib/workspace/navigation";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { ViewIcon, IconClose, IconPlus, IconAgent, IconCalendar, IconZap } from "./workspace-icons";
import type { CommandAction } from "@/types/workspace";
import { SHORTCUTS } from "@/lib/shortcuts/shortcut-registry";
import { docRepository } from "@/lib/docs/doc-repository";
import { crmRepository } from "@/lib/crm/crm-repository";
import { researchRepository } from "@/lib/research/research-repository";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";

// Búsqueda de contenido (no solo acciones): docs, actores, research, conocimiento.
function searchEntities(workspaceId: string, q: string): CommandAction[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const out: CommandAction[] = [];
  const push = (id: string, label: string, description: string, href: string) =>
    out.push({ id, label, description, group: "results" as any, href });
  try {
    docRepository.getDocs(workspaceId)
      .filter((d) => d.title.toLowerCase().includes(query)).slice(0, 4)
      .forEach((d) => push(`res_doc_${d.id}`, d.title, "Documento", buildWorkspaceHref(workspaceId, `docs/${d.id}`)));
    crmRepository.listActors(workspaceId)
      .filter((a: any) => (a.name || "").toLowerCase().includes(query)).slice(0, 4)
      .forEach((a: any) => push(`res_actor_${a.id}`, a.name, `Actor${a.party ? ` · ${a.party}` : ""}`, buildWorkspaceHref(workspaceId, `crm/${a.id}`)));
    researchRepository.getThreads(workspaceId)
      .filter((t) => t.title.toLowerCase().includes(query) || (t.query || "").toLowerCase().includes(query)).slice(0, 3)
      .forEach((t) => push(`res_thr_${t.id}`, t.title, "Research", buildWorkspaceHref(workspaceId, `research/${t.id}`)));
    workspaceRepository.getKnowledgeItems(workspaceId)
      .filter((k) => k.title.toLowerCase().includes(query)).slice(0, 3)
      .forEach((k) => push(`res_kn_${k.id}`, k.title, "Conocimiento", buildWorkspaceHref(workspaceId, "knowledge")));
  } catch { /* repos en modo demo */ }
  return out;
}

interface WorkspaceCommandPaletteProps {
  workspaceId: string;
}

function buildCommands(workspaceId: string): CommandAction[] {
  const navActions: CommandAction[] = WORKSPACE_VIEWS.map(v => ({
    id: `nav_${v.key}`,
    label: v.label,
    description: v.description,
    group: "navigation" as const,
    href: buildWorkspaceHref(workspaceId, v.segment),
  }));

  const createActions: CommandAction[] = [
    { id: "create_issue",    label: "Nuevo issue",           description: "Crear un issue en el workspace",          group: "create",    shortcut: ["C", "I"], href: buildWorkspaceHref(workspaceId, "overview") },
    { id: "create_doc",      label: "Nuevo documento",       description: "Crear un documento en Docs",              group: "create",    href: buildWorkspaceHref(workspaceId, "docs/new") },
    { id: "create_canvas",   label: "Nuevo canvas",          description: "Crear un canvas de investigación visual", group: "create",    href: buildWorkspaceHref(workspaceId, "canvas") },
    { id: "create_project",  label: "Nuevo proyecto",        description: "Crear un proyecto en Projects",           group: "create",    href: buildWorkspaceHref(workspaceId, "projects") },
  ];

  const agentActions: CommandAction[] = [
    { id: "agent_briefing",  label: "Generar briefing",      description: "Pide al agente un resumen ejecutivo",     group: "agent" },
    { id: "agent_summary",   label: "Resumir vista actual",  description: "Resumen de la vista actual",              group: "agent" },
    { id: "agent_risk",      label: "Análisis de riesgos",   description: "Analizar riesgos del workspace",          group: "agent" },
  ];

  // Inyectamos los atajos registrados como acciones del palette (sin duplicar las de navegación que ya existen arriba).
  const shortcutActions: CommandAction[] = SHORTCUTS
    .filter(s => s.group !== "navigation")
    .map(s => ({
      id: `sc_${s.id}`,
      label: s.label,
      description: s.hint || `Atajo: ${s.combo}`,
      group: "workspace",
      shortcut: s.combo.split(/[\s+]/).map(t => t.toUpperCase()),
      href: s.href,
    }));

  return [...navActions, ...createActions, ...agentActions, ...shortcutActions];
}

const GROUP_LABELS: Record<string, string> = {
  results: "Resultados",
  navigation: "Navegar",
  create: "Crear",
  agent: "Agente IA",
  workspace: "Workspace",
};

const GROUP_ORDER = ["results", "navigation", "create", "agent", "workspace"];

export function WorkspaceCommandPalette({ workspaceId }: WorkspaceCommandPaletteProps) {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = buildCommands(workspaceId);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const entityResults = searchEntities(workspaceId, query);
  const allItems = [...entityResults, ...filtered];

  const grouped = GROUP_ORDER.reduce<Record<string, CommandAction[]>>((acc, g) => {
    const items = allItems.filter(c => c.group === g);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selected]) {
      execute(flatFiltered[selected]);
    }
  }

  function execute(action: CommandAction) {
    close();
    if (action.href) router.push(action.href);
  }

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
 <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "12vh",
    }}>
      {/* Backdrop */}
 <div
        onClick={close}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
 <div style={{
        position: "relative", zIndex: 1,
        width: 560, maxHeight: "60vh",
        background: WS.surface2,
        border: `1px solid ${WS.borderStrong}`,
        borderRadius: 16,
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: WS.font,
      }}>

        {/* Input */}
 <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${WS.border}`,
        }}>
 <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={WS.ink3} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
 <circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>
 </svg>
 <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o ejecutar acción…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 14, color: WS.ink, fontFamily: WS.font,
            }}
          />
 <button onClick={close} style={{ background: "transparent", border: "none", cursor: "pointer", color: WS.ink3, display: "flex" }}>
 <IconClose size={12} />
 </button>
 </div>

        {/* Results */}
 <div style={{ overflowY: "auto", maxHeight: "calc(60vh - 52px)", padding: "6px" }}>
          {Object.entries(grouped).map(([group, items]) => (
 <div key={group}>
 <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3,
                textTransform: "uppercase", padding: "8px 10px 4px",
              }}>
                {GROUP_LABELS[group]}
 </div>
              {items.map(action => {
                const idx = flatIndex++;
                const isSelected = idx === selected;
                return (
 <button
                    key={action.id}
                    onClick={() => execute(action)}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 9,
                      background: isSelected ? WS.surface3 : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                      fontFamily: WS.font,
                    }}
                  >
 <span style={{ color: isSelected ? WS.accent : WS.ink3, flexShrink: 0 }}>
                      {action.group === "navigation" ? (
 <ViewIcon view={action.id.replace("nav_", "")} size={13} />
                      ) : action.group === "create" ? (
 <IconPlus size={13} />
                      ) : action.group === "agent" ? (
 <IconAgent size={13} />
                      ) : (
 <IconZap size={13} />
                      )}
 </span>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? WS.ink : WS.ink2 }}>
                        {action.label}
 </div>
                      {action.description && (
 <div style={{ fontSize: 11, color: WS.ink3, marginTop: 1 }}>
                          {action.description}
 </div>
                      )}
 </div>
                    {action.shortcut && (
 <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {action.shortcut.map(k => (
 <span key={k} style={{
                            fontSize: 9.5, background: WS.surface, border: `1px solid ${WS.border}`,
                            padding: "1px 5px", borderRadius: 4, color: WS.ink3,
                          }}>{k}</span>
                        ))}
 </div>
                    )}
 </button>
                );
              })}
 </div>
          ))}

          {flatFiltered.length === 0 && (
 <div style={{ padding: "32px 0", textAlign: "center", color: WS.ink3, fontSize: 13 }}>
              Sin resultados para «{query}»
 </div>
          )}
 </div>

        {/* Footer hint */}
 <div style={{
          padding: "8px 14px",
          borderTop: `1px solid ${WS.border}`,
          display: "flex", gap: 12,
          fontSize: 10.5, color: WS.ink3,
        }}>
 <span>↑↓ navegar</span>
 <span>↵ abrir</span>
 <span>Esc cerrar</span>
 </div>
 </div>
 </div>
  );
}
