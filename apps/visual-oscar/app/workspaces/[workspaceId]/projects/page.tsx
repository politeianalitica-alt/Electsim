"use client";

import Link from "next/link";
import { projectRepository } from "@/lib/projects/project-repository";
import { PROJECT_TYPE_CONFIG, PROJECT_STATUS_CONFIG } from "@/lib/projects/project-config";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";

export default function ProjectsPage({ params }: { params: { workspaceId: string } }) {
  const projects = projectRepository.list(params.workspaceId);

  return (
 <div>
 <WorkspaceViewHeader
        view="projects"
        eyebrow="Workspace · Proyectos"
        title="Projects"
        description="Gestión de proyectos · Gantt, Kanban, Lista, Resumen"
        badge={`${projects.length} proyectos`}
      />

 <div className="grid grid-cols-2 gap-3">
        {projects.map(p => {
          const tCfg = PROJECT_TYPE_CONFIG[p.type];
          const sCfg = PROJECT_STATUS_CONFIG[p.status];
          const done = p.tasks.filter(t => t.status === "done").length;
          const completion = p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
          return (
 <Link
              key={p.id}
              href={`/workspaces/${params.workspaceId}/projects/${p.id}`}
              className="rounded-xl border border-[#e8e8ed] bg-white p-4 hover:border-indigo-500/40 hover:bg-[#f5f5f7]/60 transition-colors"
              style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
            >
 <div className="flex items-start justify-between mb-2">
 <div>
 <p className="text-sm font-semibold text-[#1d1d1f]">{p.title}</p>
 <p className="text-[11px] text-[#6e6e73] mt-0.5">{tCfg.label}</p>
 </div>
 <span
                  className="rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${sCfg.color}20`, color: sCfg.color }}
                >
                  {sCfg.label}
 </span>
 </div>
 <div className="h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden mb-2">
 <div className="h-full rounded-full" style={{ width: `${completion}%`, background: p.color }} />
 </div>
 <div className="flex items-center justify-between text-[10px] text-[#6e6e73]">
 <span>{p.tasks.length} tareas · {done} hechas</span>
 <span>{new Date(p.endDate).toLocaleDateString("es-ES")}</span>
 </div>
 </Link>
          );
        })}
 </div>
 </div>
  );
}
