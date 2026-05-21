"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import {
  SLASH_COMMANDS,
  suggestForKind,
  buildBlock,
  type SlashCommandKind,
  type SlashCommandSuggestion,
} from "@/lib/docs/slash-commands";

interface Props {
  workspaceId: string;
  /** Triggered when user presses a slash. Owner page calls open() with raw text. */
  isOpen:    boolean;
  /** Texto que sigue al "/" (lo que va completando el usuario). */
  query:     string;
  onCancel:  () => void;
  onInsert:  (markdown: string, source: string) => void;
  /** Posición sugerida del popup (top/left en px relativos al viewport). */
  anchor?:   { top: number; left: number } | null;
}

export function SlashCommandPopup({ workspaceId, isOpen, query, onCancel, onInsert, anchor }: Props) {
  const [kind, setKind]           = useState<SlashCommandKind | null>(null);
  const [selectedIdx, setSel]     = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Si el usuario aún no ha confirmado el kind, mostramos los comandos coincidentes
  const matchingCommands = useMemo(() => {
    if (kind) return [];
    return SLASH_COMMANDS.filter(c => c.trigger.startsWith(query.toLowerCase()));
  }, [kind, query]);

  // Si el kind ya está fijado, mostramos sugerencias de esa entidad
  const suggestions: SlashCommandSuggestion[] = useMemo(() => {
    if (!kind) return [];
    const subq = query.split(" ").slice(1).join(" ");
    return suggestForKind(kind, workspaceId, subq);
  }, [kind, query, workspaceId]);

  useEffect(() => { setSel(0); }, [query, kind]);

  useEffect(() => {
    if (!isOpen) {
      setKind(null);
      setSel(0);
    }
  }, [isOpen]);

  // Detectar cuando el query coincide exactamente con un trigger → activamos ese kind
  useEffect(() => {
    if (kind) return;
    const exact = SLASH_COMMANDS.find(c => c.trigger === query.toLowerCase().split(" ")[0]);
    if (exact) setKind(exact.kind);
  }, [query, kind]);

  // Manejo de teclas
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const n = (kind ? suggestions.length : matchingCommands.length) - 1;
        setSel(s => Math.min(s + 1, n));
      }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!kind && matchingCommands[selectedIdx]) {
          setKind(matchingCommands[selectedIdx].kind);
          return;
        }
        if (kind && suggestions[selectedIdx]) {
          const res = buildBlock(kind, suggestions[selectedIdx].id, workspaceId);
          onInsert(res.markdown, res.source);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, kind, matchingCommands, suggestions, selectedIdx, onCancel, onInsert, workspaceId]);

  if (!isOpen) return null;

  return (
 <div
      ref={wrapRef}
      style={{
        position: "fixed",
        top: anchor?.top ?? 200,
        left: anchor?.left ?? 80,
        zIndex: 400,
        width: 360,
        background: WS.surface,
        border: `1px solid ${WS.borderStrong}`,
        borderRadius: 12,
        boxShadow: "0 10px 32px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.06)",
        overflow: "hidden",
        fontFamily: WS.font,
      }}
    >
 <div style={{ padding: "8px 12px", borderBottom: `1px solid ${WS.border}`, fontSize: 10.5, fontWeight: 700, color: WS.ink3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {kind ? `/${kind} · escribe para filtrar` : "Comandos disponibles"}
 </div>
 <div style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
        {(kind ? suggestions : matchingCommands).map((it, idx) => {
          const isSelected = idx === selectedIdx;
          const label = kind ? (it as SlashCommandSuggestion).label : (it as { label: string }).label;
          const hint = kind ? (it as SlashCommandSuggestion).hint : (it as { hint: string }).hint;
          return (
 <button
              key={(it as any).id ?? (it as any).trigger}
              onClick={() => {
                if (!kind) { setKind((it as any).kind); return; }
                const res = buildBlock(kind, (it as SlashCommandSuggestion).id, workspaceId);
                onInsert(res.markdown, res.source);
              }}
              onMouseEnter={() => setSel(idx)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 14px",
                background: isSelected ? WS.accentSubtle : "transparent",
                border: "none",
                fontFamily: WS.font,
                cursor: "pointer",
              }}
            >
 <div style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? WS.accent : WS.ink, marginBottom: 1 }}>
                {label}
 </div>
              {hint && <div style={{ fontSize: 11, color: WS.ink3 }}>{hint}</div>}
 </button>
          );
        })}
        {(kind ? suggestions.length === 0 : matchingCommands.length === 0) && (
 <div style={{ padding: "10px 14px", fontSize: 12, color: WS.ink3 }}>Sin coincidencias.</div>
        )}
 </div>
 <div style={{ padding: "6px 12px", borderTop: `1px solid ${WS.border}`, fontSize: 10, color: WS.ink3, display: "flex", gap: 12 }}>
 <span>↑↓ navegar</span><span>↵ insertar</span><span>Esc cancelar</span>
 </div>
 </div>
  );
}
