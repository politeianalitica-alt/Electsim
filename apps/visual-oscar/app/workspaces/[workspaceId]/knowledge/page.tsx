"use client";

import { useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { useWorkspaceKnowledge } from "@/hooks/workspace/use-workspace-knowledge";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";
import { KnowledgeCard } from "@/app/_components/workspace/cards/knowledge-card";

const TYPE_FILTERS = [
  { id: "all",        label: "Todos" },
  { id: "actor",      label: "Actores" },
  { id: "law",        label: "Leyes" },
  { id: "event",      label: "Eventos" },
  { id: "narrative",  label: "Narrativas" },
  { id: "project",    label: "Proyectos" },
];

export default function KnowledgePage({ params }: { params: { workspaceId: string } }) {
  const { data: items, isEmpty } = useWorkspaceKnowledge(params.workspaceId);
  const [type, setType] = useState("all");

  if (isEmpty || !items) {
    return (
 <WorkspaceEmptyState
        view="knowledge"
        eyebrow="Workspace · Conocimiento"
        title="Sin items de conocimiento"
        description="Empieza a construir la memoria institucional del workspace."
        cta="+ Añadir artículo"
      />
    );
  }

  const filtered = type === "all" ? items : items.filter(k => k.entityType === type);
  const allTags = Array.from(new Set(items.flatMap(k => k.tags))).slice(0, 12);

  return (
 <div>
 <WorkspaceViewHeader
        view="knowledge"
        title="Knowledge"
        description="Memoria institucional y artículos de referencia"
        badge={`${items.length} items`}
        actions={<button style={btnStyle}>+ Añadir artículo</button>}
      />

 <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {TYPE_FILTERS.map(t => (
 <button
            key={t.id}
            onClick={() => setType(t.id)}
            style={{
              padding: "5px 12px", borderRadius: 7,
              background: type === t.id ? WS.accent : WS.surface2,
              border: `1px solid ${type === t.id ? "transparent" : WS.border}`,
              color: type === t.id ? "#fff" : WS.ink2,
              fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: WS.font,
            }}
          >
            {t.label}
 </button>
        ))}
 </div>

 <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20 }}>
 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => <KnowledgeCard key={item.id} item={item} />)}
          {filtered.length === 0 && (
 <div style={{ padding: 32, textAlign: "center", color: WS.ink3, fontSize: 13 }}>
              No hay items para este filtro
 </div>
          )}
 </div>

 <div>
 <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase", marginBottom: 10 }}>
            Tags frecuentes
 </div>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {allTags.map(tag => (
 <span key={tag} style={{
                fontSize: 11, background: WS.surface, border: `1px solid ${WS.border}`,
                color: WS.ink3, padding: "4px 10px", borderRadius: 99, cursor: "pointer",
              }}>
                {tag}
 </span>
            ))}
 </div>

 <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase", marginBottom: 10 }}>
            Estadísticas
 </div>
 <div style={{
            background: WS.surface, border: `1px solid ${WS.border}`,
            borderRadius: 12, padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
 <Stat label="Items totales" value={`${items.length}`} />
 <Stat label="Confianza media" value={`${Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length * 100)}%`} />
 <Stat label="Tipos únicos" value={`${new Set(items.map(i => i.entityType)).size}`} />
 </div>
 </div>
 </div>
 </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
 <div style={{ display: "flex", justifyContent: "space-between" }}>
 <span style={{ fontSize: 12, color: WS.ink3 }}>{label}</span>
 <span style={{ fontSize: 12, fontWeight: 600, color: WS.ink }}>{value}</span>
 </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px", background: WS.accent, border: "none",
  borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: WS.font,
};
