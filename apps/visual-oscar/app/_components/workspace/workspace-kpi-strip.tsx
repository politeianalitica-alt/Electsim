import { WS } from "@/lib/workspace/workspace-utils";
import type { WorkspaceSummary } from "@/types/workspace";

interface KpiItem {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  delta?: number;
}

interface WorkspaceKpiStripProps {
  workspace: WorkspaceSummary;
  extra?: KpiItem[];
}

export function WorkspaceKpiStrip({ workspace, extra = [] }: WorkspaceKpiStripProps) {
  const items: KpiItem[] = [
    { label: "Issues activos",    value: workspace.issueCount,        color: WS.danger,  sub: "en seguimiento" },
    { label: "Acciones pendientes", value: workspace.pendingActions,  color: WS.warn,    sub: "esta semana" },
    { label: "Decisiones",         value: workspace.decisionsThisWeek, color: WS.accent, sub: "tomadas esta semana" },
    { label: "Equipo",             value: workspace.teamMembers,       color: WS.success, sub: "miembros activos" },
    ...extra,
  ];

  return (
 <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: 12,
      marginBottom: 28,
    }}>
      {items.map((kpi, i) => (
 <div key={i} style={{
          background: WS.surface,
          border: `1px solid ${WS.border}`,
          borderRadius: 12,
          padding: "14px 16px",
        }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase", marginBottom: 8 }}>
            {kpi.label}
 </div>
 <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
 <span style={{ fontSize: 28, fontWeight: 700, color: kpi.color ?? WS.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {kpi.value}
 </span>
            {kpi.delta !== undefined && (
 <span style={{ fontSize: 11, color: kpi.delta >= 0 ? WS.success : WS.danger, fontWeight: 600 }}>
                {kpi.delta >= 0 ? "+" : ""}{kpi.delta}
 </span>
            )}
 </div>
          {kpi.sub && (
 <div style={{ fontSize: 11, color: WS.ink3, marginTop: 4 }}>{kpi.sub}</div>
          )}
 </div>
      ))}
 </div>
  );
}
