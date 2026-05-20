"use client";

import Link from "next/link";
import { researchRepository } from "@/lib/research/research-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";

export default function ResearchListPage({ params }: { params: { workspaceId: string } }) {
  const threads = researchRepository.getThreads(params.workspaceId);

  return (
    <div>
      <WorkspaceViewHeader
        view="research"
        eyebrow="Workspace · Investigación"
        title="Research"
        description="Hilos de investigación, monitor RSS y base de conocimiento"
        badge={`${threads.length} hilos`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/workspaces/${params.workspaceId}/research/feeds`}
              className="rounded-lg border border-[#e8e8ed] px-3 py-1.5 text-xs text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
            >
              Monitor RSS
            </Link>
            <Link
              href={`/workspaces/${params.workspaceId}/research/knowledge`}
              className="rounded-lg border border-[#e8e8ed] px-3 py-1.5 text-xs text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
            >
              Knowledge base
            </Link>
          </div>
        }
      />

      <div className="space-y-2">
        {threads.map(t => (
          <Link
            key={t.id}
            href={`/workspaces/${params.workspaceId}/research/${t.id}`}
            className="block rounded-xl border border-[#e8e8ed] bg-white p-4 hover:border-indigo-500/40 hover:bg-[#f5f5f7]/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f]">{t.title}</p>
                <p className="text-xs text-[#6e6e73] mt-0.5">Query: «{t.query}»</p>
              </div>
              <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] text-[#3a3a3d]">
                {t.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#6e6e73]">
              <span>{t.sources.length} fuentes</span>
              <span>{t.syntheses.length} síntesis</span>
              <span>Actualizado {new Date(t.updatedAt).toLocaleDateString("es-ES")}</span>
            </div>
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-[#6e6e73]">Sin hilos de investigación todavía.</p>
        )}
      </div>
    </div>
  );
}
