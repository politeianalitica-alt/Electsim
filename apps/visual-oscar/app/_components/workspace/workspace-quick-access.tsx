"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { readRecents, readFavorites, toggleFavorite, isFavorite, type RecentItem } from "@/lib/workspace/recents";

export function WorkspaceQuickAccess() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [favs, setFavs] = useState<RecentItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setRecents(readRecents());
    setFavs(readFavorites());
  };
  useEffect(() => {
    refresh();
    window.addEventListener("politeia:recents:changed", refresh);
    return () => window.removeEventListener("politeia:recents:changed", refresh);
  }, []);
  useEffect(() => {
    if (!open) return;
    refresh();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const go = (path: string) => { setOpen(false); router.push(path); };

  const recentsFiltered = recents.filter((r) => !favs.some((f) => f.path === r.path)).slice(0, 8);

  const Row = ({ item }: { item: RecentItem }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px" }}>
      <button onClick={() => go(item.path)} style={{
        flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer",
        color: WS.ink, fontSize: 11.5, padding: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{item.label}</button>
      <button onClick={() => { toggleFavorite(item); refresh(); }} title={isFavorite(item.path) ? "Quitar de favoritos" : "Fijar"} style={{
        background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
        color: isFavorite(item.path) ? "#E8A33D" : WS.ink3, fontSize: 12, lineHeight: 1,
      }}>{isFavorite(item.path) ? "★" : "☆"}</button>
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((o) => !o)} title="Acceso rápido" style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7,
        border: "none", cursor: "pointer", background: open ? WS.accentSubtle : "transparent", color: open ? WS.accent : WS.ink3,
        transition: "background 120ms, color 120ms",
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" />
        </svg>
      </button>

      {open && (
        <div className="styled-scrollbar" style={{
          position: "absolute", top: 34, right: 0, width: 280, maxHeight: 420, overflowY: "auto",
          background: WS.bg, border: `1px solid ${WS.border}`, borderRadius: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)", zIndex: 500, fontFamily: WS.font, padding: "4px 0",
        }}>
          {favs.length > 0 && (
            <>
              <div style={{ padding: "7px 10px 3px", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase" }}>Favoritos</div>
              {favs.map((f) => <Row key={f.path} item={f} />)}
            </>
          )}
          <div style={{ padding: "7px 10px 3px", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase" }}>Recientes</div>
          {recentsFiltered.length === 0 ? (
            <div style={{ padding: "10px", fontSize: 11, color: WS.ink3, textAlign: "center" }}>Aún no hay recientes</div>
          ) : (
            recentsFiltered.map((r) => <Row key={r.path} item={r} />)
          )}
        </div>
      )}
    </div>
  );
}
