"use client";

import dynamic from "next/dynamic";

export const KanbanView = dynamic(
  () => import("./kanban-view").then(m => ({ default: m.KanbanView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando Kanban…
      </div>
    ),
  }
);

export const GanttView = dynamic(
  () => import("./gantt-view").then(m => ({ default: m.GanttView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando Gantt…
      </div>
    ),
  }
);
