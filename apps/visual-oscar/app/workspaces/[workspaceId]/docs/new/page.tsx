"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DOC_TEMPLATES } from "@/lib/docs/doc-templates";
import { docRepository } from "@/lib/docs/doc-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";

export default function NewDocPage({ params }: { params: { workspaceId: string } }) {
  const router = useRouter();

  const handleSelect = (templateId: string) => {
    const tpl = DOC_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const newDoc = docRepository.createDoc(params.workspaceId, tpl);
    router.push(`/workspaces/${params.workspaceId}/docs/${newDoc.id}`);
  };

  return (
 <div>
 <WorkspaceViewHeader
        view="docs"
        title="Nuevo documento"
        description="Selecciona una plantilla para empezar"
        actions={
 <Link
            href={`/workspaces/${params.workspaceId}/docs`}
            className="rounded-lg border border-[#e8e8ed] px-3 py-1.5 text-xs text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
          >
            Cancelar
 </Link>
        }
      />

 <div className="grid grid-cols-2 gap-3">
        {DOC_TEMPLATES.map(tpl => (
 <button
            key={tpl.id}
            onClick={() => handleSelect(tpl.id)}
            className="text-left rounded-xl border border-[#e8e8ed] bg-white p-4 hover:border-indigo-500/50 hover:bg-[#f5f5f7]/60 transition-colors"
          >
 <div className="flex items-start justify-between mb-2">
 <div>
 <p className="text-sm font-semibold text-[#1d1d1f] mb-1">{tpl.name}</p>
 <p className="text-xs text-[#6e6e73] leading-relaxed">{tpl.description}</p>
 </div>
 <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] text-[#6e6e73]">
                {tpl.estimatedMinutes}m
 </span>
 </div>
 <div className="flex flex-wrap gap-1 mt-3">
              {tpl.tags.map(t => (
 <span key={t} className="rounded bg-[#f5f5f7] px-1.5 py-0.5 text-[10px] text-[#6e6e73]">
                  {t}
 </span>
              ))}
 </div>
 </button>
        ))}
 </div>
 </div>
  );
}
