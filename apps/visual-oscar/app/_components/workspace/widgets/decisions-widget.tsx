import type { WorkspaceDecision } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";

export function DecisionsWidget({ decisions, workspaceId }: { decisions: WorkspaceDecision[]; workspaceId: string }) {
  return (
    <WidgetShell
      title="Decisiones recientes"
      badge={decisions.length}
      badgeVariant="info"
      action={{ label: "Ver log", href: `/workspaces/${workspaceId}/overview` }}
    >
      <ul className="space-y-2">
        {decisions.slice(0, 3).map(d => (
          <li key={d.id} className="rounded-lg bg-slate-950 p-2.5 border-l-2 border-indigo-500">
            <p className="text-xs font-semibold text-slate-100 leading-snug mb-1">{d.title}</p>
            <p className="text-[10px] text-slate-400 mb-1">{d.decisionMade}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-indigo-400">{d.decidedBy}</span>
              <span className="text-slate-500">
                {new Date(d.decidedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
            </div>
          </li>
        ))}
        {decisions.length === 0 && (
          <p className="text-sm text-slate-400">Sin decisiones registradas.</p>
        )}
      </ul>
    </WidgetShell>
  );
}
