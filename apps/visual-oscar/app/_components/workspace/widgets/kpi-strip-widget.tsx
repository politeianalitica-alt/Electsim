import Link from "next/link";
import type { WorkspaceOverview } from "@/types/workspace";

interface KpiStripWidgetProps {
  data: WorkspaceOverview;
  workspaceId: string;
}

interface KpiTile {
  id: string;
  label: string;
  value: number | string;
  delta?: string;
  status: "ok" | "warning" | "critical";
  href: string;
}

export function KpiStripWidget({ data, workspaceId }: KpiStripWidgetProps) {
  const overdueCount = data.actions.filter(
    a => a.status !== "done" && new Date(a.dueDate) < new Date()
  ).length;
  const todayCount = data.actions.filter(a => {
    const today = new Date().toISOString().slice(0, 10);
    return a.status !== "done" && a.dueDate.slice(0, 10) === today;
  }).length;

  const riskScore = Math.min(100, data.criticalIssues.length * 18 + data.alerts.length * 8);

  const tiles: KpiTile[] = [
    {
      id: "issues",
      label: "Issues críticos",
      value: data.criticalIssues.length,
      status: data.criticalIssues.length > 1 ? "critical" : data.criticalIssues.length > 0 ? "warning" : "ok",
      href: `/workspaces/${workspaceId}/projects`,
    },
    {
      id: "actions",
      label: "Acciones hoy",
      value: todayCount + overdueCount,
      delta: overdueCount > 0 ? `${overdueCount} vencidas` : undefined,
      status: overdueCount > 0 ? "critical" : todayCount > 0 ? "warning" : "ok",
      href: `/workspaces/${workspaceId}/overview`,
    },
    {
      id: "decisions",
      label: "Decisiones semana",
      value: data.decisions.length,
      status: "ok",
      href: `/workspaces/${workspaceId}/overview`,
    },
    {
      id: "risk",
      label: "Índice de Riesgo Político",
      value: riskScore,
      delta: riskScore > 65 ? "alto" : riskScore > 35 ? "medio" : "bajo",
      status: riskScore > 65 ? "critical" : riskScore > 35 ? "warning" : "ok",
      href: `/workspaces/${workspaceId}/terminal`,
    },
  ];

  return (
    <div className="grid h-full grid-cols-4 gap-3 rounded-xl border border-[#e8e8ed] bg-white p-4">
      {tiles.map(tile => (
        <KpiTileBox key={tile.id} tile={tile} />
      ))}
    </div>
  );
}

function KpiTileBox({ tile }: { tile: KpiTile }) {
  const colors: Record<string, string> = {
    ok:       "rgb(74 222 128)",
    warning:  "rgb(251 191 36)",
    critical: "rgb(248 113 113)",
  };
  return (
    <Link
      href={tile.href}
      className="flex flex-col justify-between rounded-lg bg-[#fbfbfd] p-3 hover:bg-[#f5f5f7]/60 transition-colors"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">
        {tile.label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: colors[tile.status] }}
        >
          {tile.value}
        </span>
        {tile.delta && (
          <span className="text-[10px] text-[#6e6e73]">{tile.delta}</span>
        )}
      </div>
    </Link>
  );
}
