"use client";

import { useMemo, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { buildExecutiveContext } from "@/lib/workspace/analytics-builder";
import { useWorkspaceRadar } from "@/hooks/workspace/use-workspace-radar";
import { OpportunityCard } from "@/components/radar/opportunity-card";
import { OpportunityDrawer } from "@/components/radar/opportunity-drawer";
import type { RadarOpportunity } from "@/types/radar";

export default function RadarPage({ params }: { params: { workspaceId: string } }) {
  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const workspaceName = workspace?.name ?? "Politeia";

  const context = useMemo(
    () =>
      buildExecutiveContext({
        issues:        workspaceRepository.getIssues(params.workspaceId),
        actions:       workspaceRepository.getActions(params.workspaceId),
        alerts:        workspaceRepository.getAlerts(params.workspaceId),
        decisions:     workspaceRepository.getDecisions(params.workspaceId),
        documents:     workspaceRepository.getDocuments(params.workspaceId),
        research:      workspaceRepository.getResearchThreads(params.workspaceId),
        projects:      workspaceRepository.getProjects(params.workspaceId),
        opportunities: workspaceRepository.getOpportunities(params.workspaceId),
      }),
    [params.workspaceId]
  );

  const { batch, isLoading, error, generate } = useWorkspaceRadar({
    workspaceId: params.workspaceId,
    workspaceName,
    context,
    autoLoad: true,
  });

  const [selected, setSelected] = useState<RadarOpportunity | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const items = useMemo(() => {
    if (!batch) return [];
    const list = [...batch.opportunities].sort((a, b) => b.score - a.score);
    if (filter === "all") return list;
    return list.filter(o => o.horizon === filter || o.category === filter);
  }, [batch, filter]);

  const categories = useMemo(() => {
    if (!batch) return [];
    return Array.from(new Set(batch.opportunities.map(o => o.category)));
  }, [batch]);

  return (
    <div>
      <WorkspaceViewHeader
        view="radar"
        eyebrow="Workspace · Radar"
        title="Radar de Oportunidades"
        description={`Generación JSON estructurada con PoliteIA · ${
          batch?.source === "anthropic" || batch?.source === "ollama" ? "live"
          : "mock"
        }`}
        badge={batch ? `${batch.opportunities.length} oportunidades` : ""}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => generate()}
              disabled={isLoading}
              style={{
                padding: "6px 14px",
                background: WS.accent,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: WS.font,
              }}
            >
              {isLoading ? "Generando…" : "Regenerar con PoliteIA"}
            </button>
          </div>
        }
      />

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <FilterChip active={filter === "all"}    onClick={() => setFilter("all")}>Todas</FilterChip>
        <FilterChip active={filter === "now"}    onClick={() => setFilter("now")}>Ahora</FilterChip>
        <FilterChip active={filter === "week"}   onClick={() => setFilter("week")}>Semana</FilterChip>
        <FilterChip active={filter === "month"}  onClick={() => setFilter("month")}>Mes</FilterChip>
        <FilterChip active={filter === "quarter"} onClick={() => setFilter("quarter")}>Trimestre</FilterChip>
        <div style={{ width: 1, alignSelf: "stretch", background: WS.border, margin: "0 4px" }} />
        {categories.map(c => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</FilterChip>
        ))}
      </div>

      {error && (
        <div style={{ background: WS.dangerSub, color: WS.danger, padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!batch && !isLoading && (
        <div style={{ padding: 28, textAlign: "center", color: WS.ink3, fontSize: 13 }}>
          Sin batch generado todavía.
        </div>
      )}

      {batch && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {items.map(o => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                selected={selected?.id === o.id}
                onClick={() => setSelected(o)}
              />
            ))}
          </div>

          <div style={{ marginTop: 18, fontSize: 11, color: WS.ink3 }}>
            Generado {new Date(batch.generatedAt).toLocaleString("es-ES")} · fuente: {batch.source}
            {batch.source === "mock" && " · PoliteIA está procesando este módulo"}
          </div>
        </>
      )}

      <OpportunityDrawer
        opportunity={selected}
        onClose={() => setSelected(null)}
        onSendToAgent={(opp) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("politeia:agent:send", { detail: opp }));
          }
        }}
        onCreateAction={() => alert("Crear acción aún no persistente — se conectará al backend en Sprint 11/16")}
        onArchive={() => setSelected(null)}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${active ? WS.accent : WS.border}`,
        background: active ? WS.accentSubtle : "transparent",
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
