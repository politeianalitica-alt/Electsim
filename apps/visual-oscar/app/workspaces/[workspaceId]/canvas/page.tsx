"use client";

import Link from "next/link";
import { canvasRepository } from "@/lib/canvas/canvas-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";

export default function CanvasListPage({ params }: { params: { workspaceId: string } }) {
  const canvases = canvasRepository.list(params.workspaceId);

  if (canvases.length === 0) {
    return (
      <WorkspaceEmptyState
        view="canvas"
        eyebrow="Workspace · Canvas"
        title="Sin canvas activo"
        description="Crea tu primer canvas de investigación visual."
        cta="+ Nuevo canvas"
      />
    );
  }

  return (
    <div>
      <WorkspaceViewHeader
        view="canvas"
        title="Canvas"
        description="Investigación visual e hipótesis"
        badge={`${canvases.length} canvas`}
      />

      <div className="grid grid-cols-2 gap-3">
        {canvases.map(c => (
          <Link
            key={c.id}
            href={`/workspaces/${params.workspaceId}/canvas/${c.id}`}
            className="rounded-xl border border-[#e8e8ed] bg-white p-4 hover:border-indigo-500/40 hover:bg-[#f5f5f7]/60 transition-colors"
          >
            <p className="text-sm font-semibold text-[#1d1d1f] mb-1">{c.title}</p>
            {c.description && (
              <p className="text-xs text-[#6e6e73] mb-3 line-clamp-2">{c.description}</p>
            )}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-[#1d1d1f]">{c.objects.length}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6e6e73]">Objetos</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#1d1d1f]">{c.connections.length}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6e6e73]">Conexiones</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#1d1d1f]">{c.hypotheses.length}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6e6e73]">Hipótesis</p>
              </div>
              <div>
                <p className="text-base font-bold text-amber-400">
                  {c.hypotheses.filter(h => h.status === "investigating" || h.status === "proposed").length}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-[#6e6e73]">Abiertas</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
