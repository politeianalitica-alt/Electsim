"use client";

import { useMemo } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { useWorkspaceAnalytics } from "@/hooks/workspace/use-workspace-analytics";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { buildExecutiveContext } from "@/lib/workspace/analytics-builder";
import { DashboardKpiStrip } from "@/components/analytics/dashboard-kpi-strip";
import { BarBlock, PieBlock, ActivityArea } from "@/components/analytics/dynamic-analytics";
import { ExecutiveSummaryPanel } from "@/components/analytics/executive-summary-panel";

export default function ReportingPage({ params }: { params: { workspaceId: string } }) {
  const { data, isLoading } = useWorkspaceAnalytics(params.workspaceId);

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

  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const workspaceName = workspace?.name ?? "Politeia";

  if (!data || isLoading) {
    return (
      <div style={{ padding: 24, color: WS.ink3, fontSize: 13 }}>Cargando analytics…</div>
    );
  }

  return (
    <div>
      <WorkspaceViewHeader
        view="reporting"
        eyebrow="Workspace · Reportes"
        title="Dashboard & Reporting"
        description="Analytics ejecutivo del workspace · gráficos en tiempo real · síntesis Ollama"
        badge={`${data.kpis.reduce((s, k) => s + k.value, 0)} señales`}
      />

      {/* KPI strip */}
      <div style={{ marginBottom: 18 }}>
        <DashboardKpiStrip kpis={data.kpis} />
      </div>

      {/* Charts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <ActivityArea data={data.weeklyActivity} />
        <PieBlock title="Documentos por tipo" hint={`${data.documentsByKind.reduce((s, d) => s + d.value, 0)} docs`} data={data.documentsByKind} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <BarBlock title="Issues por severidad" data={data.issuesBySeverity} />
        <BarBlock title="Acciones por estado"  data={data.actionsByStatus} />
        <BarBlock title="Proyectos por riesgo" data={data.projectsRisk} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <BarBlock title="Top oportunidades" hint="score 0-100" data={data.opportunityScore} />
        <div
          style={{
            background: WS.surface,
            border: `1px solid ${WS.border}`,
            borderRadius: 14,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: WS.ink2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Proyectos top
          </div>
          {data.topProjects.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px", alignItems: "center", gap: 10, fontSize: 12 }}>
              <span style={{ color: WS.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
              <span style={{ color: WS.ink3, fontSize: 11 }}>{p.progress}%</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: WS.surface2, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${p.progress}%`,
                      height: "100%",
                      background:
                        p.riskLevel === "critical" ? WS.danger
                        : p.riskLevel === "high" ? WS.warn
                        : WS.accent,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {data.topProjects.length === 0 && (
            <span style={{ fontSize: 12, color: WS.ink3 }}>Sin proyectos activos.</span>
          )}
        </div>
      </div>

      {/* Executive summary */}
      <ExecutiveSummaryPanel workspaceName={workspaceName} context={context} />
    </div>
  );
}
