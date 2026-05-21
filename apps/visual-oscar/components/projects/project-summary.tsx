"use client";

import { useMemo } from "react";
import type { Project } from "@/types/project";
import {
  PROJECT_TYPE_CONFIG,
  PROJECT_STATUS_CONFIG,
  MILESTONE_TYPE_CONFIG,
} from "@/lib/projects/project-config";

export function ProjectSummary({ project }: { project: Project }) {
  const metrics = useMemo(() => {
    const total = project.tasks.length;
    const done = project.tasks.filter(t => t.status === "done").length;
    const inProgress = project.tasks.filter(t => t.status === "in_progress").length;
    const blocked = project.tasks.filter(t => t.status === "blocked").length;
    const overdue = project.tasks.filter(
      t => t.status !== "done" && new Date(t.endDate) < new Date()
    ).length;
    return {
      total, done, inProgress, blocked, overdue,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [project.tasks]);

  const typeConfig = PROJECT_TYPE_CONFIG[project.type];
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
  const upcoming = project.milestones
    .filter(m => !m.achieved)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
 <div className="space-y-6">
 <div
        className="rounded-2xl border border-slate-800 p-5"
        style={{ borderLeftColor: project.color, borderLeftWidth: 4 }}
      >
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
                style={{ background: `${typeConfig.color}25`, color: typeConfig.color }}
              >
                {typeConfig.mark}
 </span>
 <span className="text-xs text-slate-400">{typeConfig.label}</span>
 <span
                className="rounded px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
              >
                {statusConfig.label}
 </span>
 </div>
 <h2 className="text-lg font-bold text-slate-100">{project.title}</h2>
            {project.description && (
 <p className="mt-1 text-xs text-slate-400 max-w-2xl">{project.description}</p>
            )}
 </div>
 <div className="text-right text-[11px] text-slate-500">
 <p>Inicio: {new Date(project.startDate).toLocaleDateString("es-ES")}</p>
 <p>Fin:    {new Date(project.endDate).toLocaleDateString("es-ES")}</p>
 </div>
 </div>

 <div className="mt-4">
 <div className="flex justify-between text-[11px] mb-1">
 <span className="text-slate-400">Progreso global</span>
 <span className="font-semibold text-slate-200">{metrics.completion}%</span>
 </div>
 <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
 <div
              className="h-full rounded-full transition-all"
              style={{ width: `${metrics.completion}%`, background: project.color }}
            />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Tareas",      value: metrics.total,      color: "#94a3b8" },
          { label: "Completadas", value: metrics.done,        color: "#10b981" },
          { label: "En curso",    value: metrics.inProgress,  color: "#6366f1" },
          { label: "Bloqueadas",  value: metrics.blocked,     color: "#ef4444" },
        ].map(m => (
 <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
 <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
 <p className="text-[11px] text-slate-500 mt-0.5">{m.label}</p>
 </div>
        ))}
 </div>

      {upcoming.length > 0 && (
 <div>
 <h3 className="mb-2 text-sm font-semibold text-slate-300">Próximos hitos</h3>
 <div className="space-y-2">
            {upcoming.map(m => {
              const cfg = MILESTONE_TYPE_CONFIG[m.type];
              const isUrgent = new Date(m.date) < new Date();
              return (
 <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    isUrgent ? "border-red-500/30 bg-red-500/5" : "border-slate-800 bg-slate-900"
                  }`}
                >
 <span
                    className="flex-none rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                    style={{ background: `${cfg.color}25`, color: cfg.color }}
                  >
                    {m.type.slice(0, 3).toUpperCase()}
 </span>
 <div className="flex-1">
 <p className="text-xs font-medium text-slate-200">{m.title}</p>
 <p className="text-[10px] text-slate-500">
                      {new Date(m.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
 </p>
 </div>
 <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
                    {cfg.label}
 </span>
 </div>
              );
            })}
 </div>
 </div>
      )}

      {project.tags.length > 0 && (
 <div className="flex flex-wrap gap-1.5">
          {project.tags.map(t => (
 <span key={t} className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
              {t}
 </span>
          ))}
 </div>
      )}
 </div>
  );
}
