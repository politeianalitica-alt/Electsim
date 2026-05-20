"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { inboxRepository } from "@/lib/inbox/inbox-repository";
import type { InboxItem, InboxStatus, InboxSource } from "@/types/inbox";
import { useHotkeys } from "@/lib/terminal/use-hotkeys";

const STORAGE_KEY = (ws: string) => `politeia:inbox:status:${ws}`;

const SOURCE_LABEL: Record<InboxSource, string> = {
  rss: "RSS",
  boe: "BOE",
  google_alerts: "Alerts",
  twitter: "X",
  newsletter: "News",
  agent: "Agente",
  manual: "Manual",
};

const SOURCE_COLOR: Record<InboxSource, string> = {
  rss: "#0071e3",
  boe: "#7e57c2",
  google_alerts: "#26a69a",
  twitter: "#1d9bf0",
  newsletter: "#d97706",
  agent: "#2d8a39",
  manual: "#6e6e73",
};

export function InboxView({ workspaceId }: { workspaceId: string }) {
  const [statusMap, setStatusMap] = useState<Record<string, InboxStatus>>({});
  const [filterSource, setFilterSource] = useState<InboxSource | "all">("all");
  const [filterStatus, setFilterStatus] = useState<InboxStatus | "all">("unread");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  // Persistencia
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(workspaceId));
      if (raw) setStatusMap(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [workspaceId]);

  const persist = useCallback((map: Record<string, InboxStatus>) => {
    setStatusMap(map);
    try { window.localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify(map)); } catch { /* ignore */ }
  }, [workspaceId]);

  const allItems = useMemo(
    () => inboxRepository.list(workspaceId, statusMap),
    [workspaceId, statusMap]
  );

  const filtered = useMemo(() => {
    return allItems.filter(it => {
      if (filterSource !== "all" && it.source !== filterSource) return false;
      if (filterStatus !== "all" && it.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!it.title.toLowerCase().includes(q) && !it.excerpt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allItems, filterSource, filterStatus, search]);

  const counts = inboxRepository.countByStatus(allItems);

  const selected = useMemo(
    () => filtered.find(i => i.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  // Actions ----------------------------------------------------------
  const setStatus = useCallback((id: string, status: InboxStatus) => {
    persist({ ...statusMap, [id]: status });
  }, [persist, statusMap]);

  const moveSelection = useCallback((delta: number) => {
    if (!filtered.length) return;
    const idx = filtered.findIndex(i => i.id === (selected?.id ?? ""));
    const next = filtered[Math.max(0, Math.min(filtered.length - 1, idx + delta))];
    if (next) setSelectedId(next.id);
  }, [filtered, selected]);

  // Hotkeys ---------------------------------------------------------
  useHotkeys([
    { combo: "j", ignoreInInputs: true, handler: () => moveSelection(1) },
    { combo: "k", ignoreInInputs: true, handler: () => moveSelection(-1) },
    { combo: "a", ignoreInInputs: true, handler: () => selected && setStatus(selected.id, "archived") },
    { combo: "c", ignoreInInputs: true, handler: () => {
        if (!selected) return;
        setStatus(selected.id, "actioned");
        alert(`Issue creado: «${selected.title}»\n(En producción → POST /api/workspace/issues)`);
      } },
    { combo: "n", ignoreInInputs: true, handler: () => {
        if (!selected) return;
        setStatus(selected.id, "actioned");
        alert(`Añadido al notebook: «${selected.title}»`);
      } },
    { combo: "shift+k", ignoreInInputs: true, handler: () => {
        if (!selected) return;
        setStatus(selected.id, "actioned");
        alert(`Añadido al canvas: «${selected.title}»`);
      } },
    { combo: "r", ignoreInInputs: true, handler: () => selected && setStatus(selected.id, "read") },
    { combo: "/", ignoreInInputs: true, handler: () => {
        const el = document.querySelector<HTMLInputElement>("[data-inbox-search]");
        el?.focus();
      } },
  ]);

  // ─── Render ────────────────────────────────────────────────────────
  return (
 <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, minHeight: "calc(100vh - 200px)" }}>
      {/* Lista */}
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Filtros */}
 <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
        }}>
 <input
            data-inbox-search
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en el inbox… (/ para enfocar)"
            style={{
              padding: "9px 12px",
              border: `1px solid ${WS.border}`,
              borderRadius: 10,
              fontSize: 13,
              background: WS.surface,
              color: WS.ink,
              fontFamily: WS.font,
              outline: "none",
            }}
          />
 <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11 }}>
            {(["unread", "read", "archived", "actioned", "all"] as const).map(s => (
 <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>
                {s === "all" ? "Todo" : labelStatus(s)} {s !== "all" && counts[s] !== undefined && <span style={{ opacity: .65 }}>· {counts[s]}</span>}
 </FilterChip>
            ))}
 </div>
 </div>

        {/* Sources strip */}
 <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
 <FilterChip active={filterSource === "all"} onClick={() => setFilterSource("all")}>Todas</FilterChip>
          {(Object.keys(SOURCE_LABEL) as InboxSource[]).map(s => (
 <FilterChip key={s} active={filterSource === s} onClick={() => setFilterSource(s)}>
              {SOURCE_LABEL[s]}
 </FilterChip>
          ))}
 </div>

        {/* Items */}
 <div
          ref={itemsContainerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {filtered.map(it => (
 <InboxRow
              key={it.id}
              item={it}
              isSelected={selected?.id === it.id}
              onClick={() => setSelectedId(it.id)}
            />
          ))}
          {filtered.length === 0 && (
 <div style={{
              padding: 32, color: WS.ink3, fontSize: 13,
              textAlign: "center", background: WS.surface,
              border: `1px dashed ${WS.border}`, borderRadius: 12,
            }}>
              Sin items para los filtros actuales.
 </div>
          )}
 </div>
 </div>

      {/* Detalle */}
 <div style={{
        position: "sticky",
        top: 0,
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 14,
        padding: 18,
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {selected ? (
 <>
 <div style={{ fontSize: 10.5, color: WS.ink3, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {selected.origin} · {SOURCE_LABEL[selected.source]}
 </div>
 <h2 style={{ fontSize: 17, lineHeight: 1.3, color: WS.ink, fontWeight: 700, margin: 0 }}>
              {selected.title}
 </h2>
 <p style={{ fontSize: 13.5, color: WS.ink2, margin: 0, lineHeight: 1.55 }}>
              {selected.excerpt}
 </p>

            {/* Score visual */}
 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <div style={{ fontSize: 30, fontWeight: 700, color: WS.accent, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {selected.score}
 </div>
 <div style={{ flex: 1, height: 6, background: WS.surface2, borderRadius: 99, overflow: "hidden" }}>
 <div style={{ width: `${selected.score}%`, height: "100%", background: WS.accent }} />
 </div>
 <div style={{ fontSize: 10, color: WS.ink3, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>
                Score
 </div>
 </div>

            {selected.entities.length > 0 && (
 <div>
 <Section title="Entidades">
 <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.entities.map(e => (
 <span key={e.id} style={{
                        fontSize: 11, padding: "3px 9px", borderRadius: 99,
                        background: WS.surface2, color: WS.ink, border: `1px solid ${WS.border}`,
                      }}>
 <span style={{ color: WS.ink3, marginRight: 4, fontSize: 10 }}>{e.type}</span>
                        {e.name}
 </span>
                    ))}
 </div>
 </Section>
 </div>
            )}

            {selected.tags.length > 0 && (
 <Section title="Tags">
 <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selected.tags.map(t => (
 <span key={t} style={{ fontSize: 10.5, color: WS.ink3, background: WS.surface2, padding: "2px 7px", borderRadius: 99 }}>
                      #{t}
 </span>
                  ))}
 </div>
 </Section>
            )}

 <Section title="Acciones rápidas">
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
 <ActionBtn label="Crear issue (C)" primary onClick={() => setStatus(selected.id, "actioned")} />
 <ActionBtn label="Notebook (N)" onClick={() => setStatus(selected.id, "actioned")} />
 <ActionBtn label="Canvas (Shift+K)" onClick={() => setStatus(selected.id, "actioned")} />
 <ActionBtn label="Archivar (A)" onClick={() => setStatus(selected.id, "archived")} />
                {selected.url && (
 <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 12px",
                      background: WS.surface2,
                      border: `1px solid ${WS.border}`,
                      borderRadius: 9,
                      fontSize: 12,
                      fontWeight: 600,
                      color: WS.ink,
                      textDecoration: "none",
                    }}
                  >
                    Abrir fuente original ↗
 </a>
                )}
 </div>
 </Section>

 <div style={{ fontSize: 10.5, color: WS.ink3 }}>
              Recibido {new Date(selected.receivedAt).toLocaleString("es-ES")}
 </div>
 </>
        ) : (
 <div style={{ color: WS.ink3, fontSize: 13 }}>Selecciona un item para verlo aquí.</div>
        )}
 </div>
 </div>
  );
}

function InboxRow({
  item,
  isSelected,
  onClick,
}: {
  item: InboxItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const opacity = item.status === "archived" ? 0.5 : 1;
  return (
 <button
      onClick={onClick}
      style={{
        textAlign: "left",
        display: "grid",
        gridTemplateColumns: "44px 1fr 70px",
        gap: 12,
        padding: "10px 12px",
        border: `1px solid ${isSelected ? WS.accent : WS.border}`,
        borderRadius: 11,
        background: isSelected ? WS.accentSubtle : WS.surface,
        cursor: "pointer",
        opacity,
        fontFamily: WS.font,
        alignItems: "start",
      }}
    >
 <div style={{
        fontSize: 19, fontWeight: 700, color: WS.accent,
        letterSpacing: "-0.04em", textAlign: "center",
      }}>{item.score}</div>
 <div style={{ minWidth: 0 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
 <span style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: SOURCE_COLOR[item.source],
            background: `${SOURCE_COLOR[item.source]}1f`,
            padding: "1px 7px",
            borderRadius: 99,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            {SOURCE_LABEL[item.source]}
 </span>
 <span style={{ fontSize: 11, color: WS.ink3 }}>{item.origin}</span>
          {item.status === "unread" && <span style={{ width: 6, height: 6, borderRadius: 99, background: WS.accent, marginLeft: "auto" }} />}
 </div>
 <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, lineHeight: 1.35, marginBottom: 2 }}>
          {item.title}
 </div>
 <div style={{ fontSize: 11.5, color: WS.ink3, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.excerpt}
 </div>
 </div>
 <div style={{ fontSize: 10.5, color: WS.ink3, textAlign: "right" }}>
        {relativeTime(item.receivedAt)}
 </div>
 </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
 <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 11.5,
        fontWeight: 600,
        border: `1px solid ${active ? WS.accent : WS.border}`,
        background: active ? WS.accentSubtle : WS.surface,
        color: active ? WS.accent : WS.ink2,
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: WS.font,
      }}
    >
      {children}
 </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
 <div>
 <div style={{ fontSize: 10, color: WS.ink3, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        {title}
 </div>
      {children}
 </div>
  );
}

function ActionBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
 <button
      onClick={onClick}
      style={{
        padding: "7px 10px",
        background: primary ? WS.accent : WS.surface2,
        color: primary ? "#fff" : WS.ink,
        border: primary ? "none" : `1px solid ${WS.border}`,
        borderRadius: 9,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: WS.font,
      }}
    >
      {label}
 </button>
  );
}

function labelStatus(s: InboxStatus): string {
  if (s === "unread")   return "Sin leer";
  if (s === "read")     return "Leído";
  if (s === "archived") return "Archivado";
  return "Procesado";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1)  return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24)   return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
