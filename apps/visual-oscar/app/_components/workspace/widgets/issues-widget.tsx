"use client";

import { useRouter } from "next/navigation";
import type { WorkspaceIssue } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";
import { BadgeSeverity, BadgeStatus } from "../badges";

interface IssuesWidgetProps {
  issues: WorkspaceIssue[];
  workspaceId: string;
}

export function IssuesWidget({ issues, workspaceId }: IssuesWidgetProps) {
  const router = useRouter();
  return (
 <WidgetShell
      title="Issues críticos"
      badge={issues.length}
      badgeVariant={issues.length > 0 ? "critical" : "ok"}
      action={{ label: "Ver todos", href: `/workspaces/${workspaceId}/overview` }}
    >
      {issues.length === 0 ? (
 <p className="text-sm text-[#6e6e73]">Sin issues críticos hoy.</p>
      ) : (
 <ul className="space-y-2">
          {issues.slice(0, 5).map(issue => (
 <li
              key={issue.id}
              className="rounded-lg bg-[#fbfbfd] p-2.5 hover:bg-[#f5f5f7]/60 transition-colors cursor-pointer"
            >
 <div className="flex items-start justify-between gap-2 mb-1.5">
 <p className="text-xs font-semibold text-[#1d1d1f] leading-snug flex-1">
                  {issue.title}
 </p>
 <BadgeSeverity value={issue.severity} />
 </div>
 <p className="text-[11px] text-[#6e6e73] leading-relaxed mb-2 line-clamp-2">
                {issue.summary}
 </p>
 <div className="flex flex-wrap gap-1.5">
 <button
                  onClick={() => router.push(`/workspaces/${workspaceId}/docs`)}
                  className="rounded bg-[#f5f5f7] px-2 py-0.5 text-[10px] text-[#3a3a3d] hover:bg-[#e8e8ed] transition-colors"
                >
                  Crear nota
 </button>
 <button
                  className="rounded bg-[#f5f5f7] px-2 py-0.5 text-[10px] text-[#3a3a3d] hover:bg-[#e8e8ed] transition-colors"
                >
                  Asignar acción
 </button>
 <BadgeStatus value={issue.status} />
 </div>
 </li>
          ))}
 </ul>
      )}
 </WidgetShell>
  );
}
