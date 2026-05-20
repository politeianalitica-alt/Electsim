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
 <li key={d.id} className="rounded-lg bg-[#fbfbfd] p-2.5 border-l-2 border-indigo-500">
 <p className="text-xs font-semibold text-[#1d1d1f] leading-snug mb-1">{d.title}</p>
 <p className="text-[10px] text-[#6e6e73] mb-1">{d.decisionMade}</p>
 <div className="flex items-center justify-between text-[10px]">
 <span className="text-indigo-400">{d.decidedBy}</span>
 <span className="text-[#6e6e73]">
                {new Date(d.decidedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
 </span>
 </div>
 </li>
        ))}
        {decisions.length === 0 && (
 <p className="text-sm text-[#6e6e73]">Sin decisiones registradas.</p>
        )}
 </ul>
 </WidgetShell>
  );
}
