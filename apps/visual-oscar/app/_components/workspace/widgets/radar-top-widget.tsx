"use client";

import { useRouter } from "next/navigation";
import type { WorkspaceOpportunity } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";

export function RadarTopWidget({
  opportunities,
  workspaceId,
}: {
  opportunities: WorkspaceOpportunity[];
  workspaceId: string;
}) {
  const router = useRouter();
  return (
 <WidgetShell
      title="Radar · Top 3"
      badge={opportunities.length}
      badgeVariant="ok"
      action={{ label: "Ver radar", href: `/workspaces/${workspaceId}/terminal` }}
    >
      {opportunities.length === 0 ? (
 <p className="text-sm text-[#6e6e73]">Sin oportunidades del radar.</p>
      ) : (
 <ul className="space-y-2">
          {opportunities.map(opp => {
            const scoreColor =
              opp.score >= 80 ? "rgb(74 222 128)"
              : opp.score >= 65 ? "rgb(129 140 248)"
              : "rgb(251 191 36)";
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(opp.windowEnd).getTime() - Date.now()) / 86_400_000)
            );
            return (
 <li
                key={opp.id}
                className="rounded-lg bg-[#fbfbfd] p-2.5 hover:bg-[#f5f5f7]/60 transition-colors cursor-pointer"
                onClick={() => router.push(`/workspaces/${workspaceId}/docs`)}
              >
 <div className="flex items-start justify-between gap-2 mb-1.5">
 <p className="text-xs font-semibold text-[#1d1d1f] leading-snug flex-1">
                    {opp.title}
 </p>
 <div className="text-right flex-none">
 <div className="text-base font-bold" style={{ color: scoreColor }}>
                      {opp.score}
 </div>
 <div className="text-[9px] text-[#6e6e73]">SCORE</div>
 </div>
 </div>
 <p className="text-[10px] text-[#6e6e73] mb-1">{opp.area}</p>
 <p className="text-[10px] text-[#6e6e73] leading-snug line-clamp-2">
                  ▸ {opp.recommendedAction}
 </p>
 <p className="text-[10px] text-[#8e8e93] mt-1">{daysLeft} días de ventana</p>
 </li>
            );
          })}
 </ul>
      )}
 </WidgetShell>
  );
}
