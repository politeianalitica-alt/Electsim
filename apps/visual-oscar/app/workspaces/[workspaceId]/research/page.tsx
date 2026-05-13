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
        title="Research"
        description="Hilos de investigación, monitor RSS y base de conocimiento"
        badge={`${threads.length} hilos`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/workspaces/${params.workspaceId}/research/feeds`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 transition-colors"
            >
              Monitor RSS
            </Link>
            <Link
              href={`/workspaces/${params.workspaceId}/research/knowledge`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 transition-colors"
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
            className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">{t.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">Query: «{t.query}»</p>
              </div>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                {t.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span>{t.sources.length} fuentes</span>
              <span>{t.syntheses.length} síntesis</span>
              <span>Actualizado {new Date(t.updatedAt).toLocaleDateString("es-ES")}</span>
            </div>
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-slate-400">Sin hilos de investigación todavía.</p>
        )}
      </div>
    </div>
  );
}
