"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { alerts as wsAlertsAll } from "@/lib/workspace/mock-data";

type Sev = "critical" | "high" | "normal" | "low";
interface Notif {
  id: string;
  title: string;
  source: string;
  severity: Sev;
  createdAt: string;
  kind: "workspace" | "osint";
}

const SEV_COLOR: Record<Sev, string> = {
  critical: WS.danger,
  high: "#FF9500",
  normal: WS.accent,
  low: WS.ink3,
};

function seenKey(ws: string) {
  return `politeia:notif:seen:${ws}`;
}
function loadSeen(ws: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(ws));
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}
function saveSeen(ws: string, s: Set<string>) {
  try {
    localStorage.setItem(seenKey(ws), JSON.stringify([...s]));
  } catch {}
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function WorkspaceNotifications({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [osint, setOsint] = useState<Notif[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set()); // se hidrata tras montar
  const ref = useRef<HTMLDivElement>(null);

  // Alertas propias del workspace (activas) — deterministas en SSR y cliente
  const wsItems = useMemo<Notif[]>(
    () =>
      wsAlertsAll
        .filter((a) => a.workspaceId === workspaceId && a.status === "active")
        .map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source,
          severity: a.severity as Sev,
          createdAt: a.createdAt,
          kind: "workspace" as const,
        })),
    [workspaceId]
  );

  // Hidratar "leídos" tras montar (evita desajuste de hidratación)
  useEffect(() => {
    setSeen(loadSeen(workspaceId));
  }, [workspaceId]);

  // Alertas OSINT en vivo (terremotos significativos) — tras montar + polling
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/osiris/earthquakes");
        if (!res.ok) return;
        const json = await res.json();
        const eqs: any[] = json?.earthquakes ?? [];
        const items: Notif[] = eqs
          .filter((e) => Number(e.magnitude) >= 4.5)
          .slice(0, 10)
          .map((e) => ({
            id: "eq_" + (e.id ?? `${e.place}_${e.magnitude}`),
            title: `Terremoto M${Number(e.magnitude).toFixed(1)} · ${e.place ?? "—"}`,
            source: "USGS · OSINT",
            severity: Number(e.magnitude) >= 6 ? "critical" : "high",
            createdAt: e.time ?? e.createdAt ?? new Date().toISOString(),
            kind: "osint" as const,
          }));
        if (alive) setOsint(items);
      } catch {}
    };
    load();
    const t = setInterval(load, 180000); // 3 min
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const all = useMemo(
    () => [...osint, ...wsItems].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [osint, wsItems]
  );
  const unread = all.filter((n) => !seen.has(n.id)).length;

  // Cerrar al pulsar fuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const markAll = () => {
    const s = new Set(all.map((n) => n.id));
    setSeen(s);
    saveSeen(workspaceId, s);
  };

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
          background: open ? WS.accentSubtle : "transparent",
          color: open ? WS.accent : WS.ink3, position: "relative",
          transition: "background 120ms, color 120ms",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 1.5a3.5 3.5 0 0 0-3.5 3.5c0 3-1.2 4-1.5 4.5h10c-.3-.5-1.5-1.5-1.5-4.5A3.5 3.5 0 0 0 8 1.5Z" />
          <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, minWidth: 14, height: 14, padding: "0 3px",
            borderRadius: 99, background: WS.danger, color: "#fff", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${WS.bg}`,
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 34, right: 0, width: 320, maxHeight: 420, overflowY: "auto",
          background: WS.bg, border: `1px solid ${WS.border}`, borderRadius: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)", zIndex: 500, fontFamily: WS.font,
        }} className="styled-scrollbar">
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 12px", borderBottom: `1px solid ${WS.border}`, position: "sticky", top: 0, background: WS.bg,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: WS.ink }}>Notificaciones</span>
            {unread > 0 && (
              <button onClick={markAll} style={{
                background: "none", border: "none", cursor: "pointer", color: WS.accent, fontSize: 10.5, padding: 0,
              }}>Marcar leídas</button>
            )}
          </div>
          {all.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center", color: WS.ink3, fontSize: 11.5 }}>Sin notificaciones</div>
          ) : (
            all.map((n) => {
              const isUnread = !seen.has(n.id);
              return (
                <div key={n.id} style={{
                  display: "flex", gap: 9, padding: "9px 12px", borderBottom: `1px solid ${WS.border}`,
                  background: isUnread ? WS.accentSubtle : "transparent",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_COLOR[n.severity], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: WS.ink, lineHeight: 1.4 }}>{n.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2, fontSize: 9.5, color: WS.ink3 }}>
                      <span style={{ color: n.kind === "osint" ? WS.accent : WS.ink3 }}>{n.source}</span>
                      <span>·</span>
                      <span>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
