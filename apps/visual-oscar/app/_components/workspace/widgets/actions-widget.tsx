"use client";

import { useState } from "react";
import type { WorkspaceAction } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";
import { BadgePriority } from "../badges";
import { getActionsByUrgency } from "@/lib/workspace/workspace-selectors";

interface ActionsWidgetProps {
  actions: WorkspaceAction[];
  workspaceId: string;
}

export function ActionsWidget({ actions, workspaceId }: ActionsWidgetProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const pending = getActionsByUrgency(actions.filter(a => a.status !== "done"));

  function isOverdue(due: string) {
    return new Date(due) < new Date();
  }

  return (
    <WidgetShell
      title="Acciones pendientes"
      badge={pending.length - completed.size}
      badgeVariant={pending.some(a => isOverdue(a.dueDate)) ? "critical" : "warning"}
      action={{ label: "Ver todas", href: `/workspaces/${workspaceId}/overview` }}
    >
      {pending.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center gap-2">
          <div className="text-lg font-bold tracking-wider text-emerald-400">OK</div>
          <p className="text-sm font-semibold text-slate-200">Día limpio</p>
          <p className="text-[11px] text-slate-500">Sin acciones pendientes</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {pending.slice(0, 6).map(a => {
            const done = completed.has(a.id);
            const overdue = isOverdue(a.dueDate) && !done;
            return (
              <li
                key={a.id}
                className={`rounded-lg p-2.5 transition-colors ${
                  done ? "bg-slate-950 opacity-50" : "bg-slate-950 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setCompleted(s => new Set(s).add(a.id))}
                    className="mt-0.5 h-3.5 w-3.5 flex-none rounded border border-slate-600 hover:border-emerald-500 flex items-center justify-center"
                  >
                    {done && <span className="text-[9px] font-bold text-emerald-400">x</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${done ? "line-through text-slate-500" : "text-slate-100"}`}>
                      {a.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <BadgePriority value={a.priority} />
                      <span className={`text-[10px] ${overdue ? "text-red-400 font-semibold" : "text-slate-500"}`}>
                        {overdue ? "vencida" : new Date(a.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
