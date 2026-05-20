"use client";

import { useState } from "react";
import Link from "next/link";
import { projectRepository } from "@/lib/projects/project-repository";
import { GanttView, KanbanView } from "@/components/projects/dynamic-views";
import { ProjectSummary } from "@/components/projects/project-summary";
import { PROJECT_TYPE_CONFIG } from "@/lib/projects/project-config";

type Tab = "timeline" | "kanban" | "list" | "summary";

export default function ProjectPage({
  params,
}: {
  params: { workspaceId: string; projectId: string };
}) {
  const project = projectRepository.getProjectById(params.projectId, params.workspaceId);
  const [tab, setTab] = useState<Tab>("timeline");

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg font-semibold text-[#1d1d1f]">Proyecto no encontrado</p>
        <Link href={`/workspaces/${params.workspaceId}/projects`} className="mt-2 text-sm text-indigo-400">
          ← Volver a Projects
        </Link>
      </div>
    );
  }

  const typeConfig = PROJECT_TYPE_CONFIG[project.type];

  return (
    <div className="flex h-full flex-col -mx-7 -my-6">
      <div className="border-b border-[#e8e8ed] bg-white px-6 py-3">
        <Link href={`/workspaces/${params.workspaceId}/projects`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
          ← Projects
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-base font-semibold text-[#1d1d1f]">{project.title}</h1>
            <p className="text-xs text-[#6e6e73]">{typeConfig.label}</p>
          </div>
          <div className="flex gap-1">
            {(["timeline","kanban","list","summary"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] capitalize transition-colors ${
                  tab === t ? "bg-[#e8e8ed] text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#3a3a3d]"
                }`}
              >
                {t === "timeline" ? "Timeline" : t === "kanban" ? "Kanban" : t === "list" ? "Lista" : "Resumen"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {tab === "timeline" && <GanttView project={project} />}
        {tab === "kanban"   && <KanbanView project={project} />}
        {tab === "summary"  && <ProjectSummary project={project} />}
        {tab === "list" && (
          <div className="rounded-xl border border-[#e8e8ed] bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="border-b border-[#e8e8ed]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Título</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Estado</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Prioridad</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Inicio</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Fin</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#6e6e73]">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map(t => (
                  <tr key={t.id} className="border-b border-[#e8e8ed] hover:bg-[#f5f5f7]/40">
                    <td className="px-3 py-2 text-[#1d1d1f]">{t.title}</td>
                    <td className="px-3 py-2 text-[#3a3a3d] capitalize">{t.status}</td>
                    <td className="px-3 py-2 text-[#3a3a3d] capitalize">{t.priority}</td>
                    <td className="px-3 py-2 text-[#6e6e73]">{new Date(t.startDate).toLocaleDateString("es-ES")}</td>
                    <td className="px-3 py-2 text-[#6e6e73]">{new Date(t.endDate).toLocaleDateString("es-ES")}</td>
                    <td className="px-3 py-2 text-[#6e6e73]">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 rounded-full bg-[#e8e8ed] overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${t.progress}%` }} />
                        </div>
                        <span>{t.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
