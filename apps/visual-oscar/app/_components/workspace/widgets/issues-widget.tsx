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
        <p className="text-sm text-slate-400">Sin issues críticos hoy.</p>
      ) : (
        <ul className="space-y-2">
          {issues.slice(0, 5).map(issue => (
            <li
              key={issue.id}
              className="rounded-lg bg-slate-950 p-2.5 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-semibold text-slate-100 leading-snug flex-1">
                  {issue.title}
                </p>
                <BadgeSeverity value={issue.severity} />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2 line-clamp-2">
                {issue.summary}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => router.push(`/workspaces/${workspaceId}/docs`)}
                  className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Crear nota
                </button>
                <button
                  className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors"
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
