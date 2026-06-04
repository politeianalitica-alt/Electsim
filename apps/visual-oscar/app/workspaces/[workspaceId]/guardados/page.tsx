"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WS } from "@/lib/workspace/workspace-utils";
import { readInbox, removeFromInbox, type MapInboxItem } from "@/lib/workspace/map-inbox";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";

export default function GuardadosPage({ params }: { params: { workspaceId: string } }) {
  const [items, setItems] = useState<MapInboxItem[]>([]);
  const [promoted, setPromoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = () => setItems(readInbox());
    load();
    window.addEventListener("politeia:inbox:changed", load);
    return () => window.removeEventListener("politeia:inbox:changed", load);
  }, []);

  const remove = (id: string) => {
    removeFromInbox(id);
    setItems(readInbox());
  };

  const toKnowledge = (it: MapInboxItem) => {
    workspaceRepository.createKnowledgeItem(params.workspaceId, {
      title: it.title,
      entityType: it.kind === "país" ? "actor" : "event",
      summary: `Enviado desde el mapa OSINT · ${it.source}${it.lat != null ? ` · ${it.lat.toFixed(2)}, ${it.lng?.toFixed(2)}` : ""}`,
      tags: [it.kind, it.source].filter(Boolean),
    });
    setPromoted((p) => new Set(p).add(it.id));
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 880, margin: "0 auto", fontFamily: WS.font }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: WS.ink, margin: 0 }}>Guardados del mapa</h1>
        <span style={{ fontSize: 12, color: WS.ink3 }}>{items.length} {items.length === 1 ? "entidad" : "entidades"}</span>
      </div>
      <p style={{ fontSize: 12.5, color: WS.ink3, margin: "0 0 18px" }}>
        Entidades enviadas desde los popups del mapa OSINT con «★ Guardar en workspace».
      </p>

      {items.length === 0 ? (
        <div style={{
          border: `1px dashed ${WS.border}`, borderRadius: 12, padding: "40px 20px", textAlign: "center", color: WS.ink3,
        }}>
          <div style={{ fontSize: 13, color: WS.ink2, marginBottom: 6 }}>Aún no has guardado nada</div>
          <div style={{ fontSize: 12, marginBottom: 14 }}>Abre el mapa OSINT, pulsa cualquier entidad y dale a «★ Guardar en workspace».</div>
          <Link href="/osint-global" style={{
            display: "inline-block", fontSize: 12, fontWeight: 600, color: WS.accent,
            border: `1px solid ${WS.accent}`, borderRadius: 8, padding: "7px 14px", textDecoration: "none",
          }}>Abrir mapa OSINT →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={{
              border: `1px solid ${WS.border}`, borderRadius: 10, padding: "11px 14px", background: WS.bg,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: WS.ink, marginBottom: 3 }}>{it.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 10, color: WS.ink3 }}>
                  <span style={{ background: WS.surface2, padding: "1px 7px", borderRadius: 4, textTransform: "capitalize" }}>{it.kind}</span>
                  <span style={{ background: WS.surface2, padding: "1px 7px", borderRadius: 4 }}>{it.source}</span>
                  {it.lat != null && it.lng != null && (
                    <span style={{ color: WS.ink3 }}>{it.lat.toFixed(2)}, {it.lng.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {it.lat != null && it.lng != null && (
                  <Link href={`/osint-global?lat=${it.lat}&lng=${it.lng}&zoom=6`} title="Ver en el mapa" style={{
                    fontSize: 11, color: WS.ink3, textDecoration: "none", border: `1px solid ${WS.border}`,
                    borderRadius: 7, padding: "5px 9px",
                  }}>Mapa</Link>
                )}
                <button
                  onClick={() => toKnowledge(it)}
                  disabled={promoted.has(it.id)}
                  style={{
                    fontSize: 11, fontWeight: 600, cursor: promoted.has(it.id) ? "default" : "pointer",
                    color: promoted.has(it.id) ? "#34C759" : WS.accent,
                    border: `1px solid ${promoted.has(it.id) ? "#34C75955" : WS.accent}`,
                    background: "transparent", borderRadius: 7, padding: "5px 9px",
                  }}
                >{promoted.has(it.id) ? "✓ En conocimiento" : "A conocimiento"}</button>
                <button
                  onClick={() => remove(it.id)}
                  title="Quitar"
                  style={{
                    fontSize: 13, cursor: "pointer", color: WS.ink3, border: `1px solid ${WS.border}`,
                    background: "transparent", borderRadius: 7, padding: "3px 9px", lineHeight: 1,
                  }}
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
