"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

interface Command {
  id: string;
  label: string;
  category: string;
  href?: string;
  action?: () => void;
  keywords?: string[];
  shortcut?: string;
}

const COMMANDS: Command[] = [
  { id: "go-home", label: "Ir a Inicio", category: "Navegación", href: "/", keywords: ["home", "inicio"], shortcut: "G H" },
  { id: "go-briefings", label: "Ir a Briefings", category: "Navegación", href: "/briefings", keywords: ["briefing", "reporte"], shortcut: "G B" },
  { id: "go-actores", label: "Ir a Mapa de Actores", category: "Navegación", href: "/actores", keywords: ["actores", "politicos"] },
  { id: "go-medios", label: "Ir a Medios & Narrativa", category: "Navegación", href: "/medios", keywords: ["media", "noticias"] },
  { id: "go-alertas", label: "Ir a Alertas", category: "Navegación", href: "/alertas", keywords: ["alert"], shortcut: "G A" },
  { id: "go-workspace", label: "Ir a Workspace", category: "Navegación", href: "/workspace", keywords: ["war", "room", "operaciones"], shortcut: "G W" },
  { id: "go-brain", label: "Ir a Politeia Brain", category: "Navegación", href: "/brain", keywords: ["chat", "ai", "ia"] },
  { id: "go-comms", label: "Ir a Communication Intel", category: "Navegación", href: "/comms", keywords: ["comms", "estrategia"] },
  { id: "go-coalicion", label: "Ir a Gobierno & Coalición", category: "Navegación", href: "/coalicion" },
  { id: "go-legislativo", label: "Ir a Monitor Legislativo", category: "Navegación", href: "/legislativo" },
  { id: "go-geopolitica", label: "Ir a Geopolítica", category: "Navegación", href: "/geopolitica" },
  { id: "go-riesgo", label: "Ir a Termómetro de Riesgo", category: "Navegación", href: "/riesgo" },
  { id: "go-workflows", label: "Ir a Workflows", category: "Navegación", href: "/workflows" },
  { id: "go-memoria", label: "Ir a Memoria del Workspace", category: "Navegación", href: "/memoria" },
  { id: "go-integraciones", label: "Ir a Integraciones", category: "Navegación", href: "/integraciones" },
  { id: "go-settings", label: "Ir a Preferencias", category: "Navegación", href: "/settings" },
  { id: "wf-rapid-briefing", label: "Workflow: Briefing rápido para reunión", category: "Workflows", href: "/workflows?run=rapid_briefing" },
  { id: "wf-crisis", label: "Workflow: Respuesta a crisis", category: "Workflows", href: "/workflows?run=crisis_response" },
  { id: "wf-actor-dossier", label: "Workflow: Crear dossier de actor", category: "Workflows", href: "/workflows?run=actor_dossier" },
  { id: "wf-press-conf", label: "Workflow: Preparación rueda de prensa", category: "Workflows", href: "/workflows?run=press_conference_prep" },
  { id: "act-export-briefing", label: "Acción: Exportar último briefing en PDF", category: "Acciones", keywords: ["pdf", "export"] },
  { id: "act-mark-read", label: "Acción: Marcar todas las alertas como leídas", category: "Acciones" },
  { id: "act-refresh", label: "Acción: Refrescar todos los datos", category: "Acciones" },
  { id: "act-snapshot", label: "Acción: Capturar snapshot del workspace", category: "Acciones" }
];

interface PaletteContext {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const Context = createContext<PaletteContext | null>(null);

export function useCommandPalette() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => { setIsOpen(false); setQuery(""); setHighlightIdx(0); }, []);
  const toggle = useCallback(() => setIsOpen(o => !o), []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, toggle, close]);

  const filtered = COMMANDS.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }).slice(0, 12);

  const handleSelect = (cmd: Command) => {
    close();
    if (cmd.href) router.push(cmd.href);
    if (cmd.action) cmd.action();
  };

  return (
    <Context.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4" onClick={close}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl bg-bg2 border border-border1 rounded-xl shadow-premium overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border1">
              <Search className="w-5 h-5 text-cyan1" />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlightIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i+1, filtered.length-1)); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); setHighlightIdx(i => Math.max(i-1, 0)); }
                  if (e.key === "Enter" && filtered[highlightIdx]) {
                    e.preventDefault();
                    handleSelect(filtered[highlightIdx]);
                  }
                }}
                placeholder="Buscar comandos, páginas, acciones..."
                className="flex-1 bg-transparent text-text1 placeholder-muted focus:outline-none text-base"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-muted text-sm">Sin coincidencias.</div>
              )}
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition ${
                    i === highlightIdx ? "bg-cyan1/10 text-cyan1" : "text-text1 hover:bg-bg3"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted shrink-0 w-24">
                    {cmd.category}
                  </span>
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="text-[10px] font-mono bg-bg3 border border-border1 px-1.5 py-0.5 rounded text-text2">
                      {cmd.shortcut}
                    </span>
                  )}
                  {i === highlightIdx && <ArrowRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border1 flex items-center gap-4 text-[10px] text-muted">
              <span>↑↓ Navegar</span>
              <span>↵ Ejecutar</span>
              <span>Esc Cerrar</span>
            </div>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}
