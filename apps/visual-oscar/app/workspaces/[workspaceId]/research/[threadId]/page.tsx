"use client";

import { useState } from "react";
import Link from "next/link";
import { researchRepository } from "@/lib/research/research-repository";
import { useResearchSynthesis } from "@/hooks/research/use-research-synthesis";
import type { SynthesisType } from "@/types/research";
import SaveAiAsDoc from "@/components/workspace/SaveAiAsDoc";

const SYNTHESIS_TYPES: { id: SynthesisType; label: string }[] = [
  { id: "summary",        label: "Resumen ejecutivo" },
  { id: "key_points",     label: "Puntos clave" },
  { id: "entities",       label: "Extraer entidades" },
  { id: "timeline",       label: "Línea de tiempo" },
  { id: "contradictions", label: "Contradicciones" },
  { id: "full_analysis",  label: "Análisis completo" },
];

export default function ResearchThreadPage({
  params,
}: {
  params: { workspaceId: string; threadId: string };
}) {
  const thread = researchRepository.getThreadById(params.threadId, params.workspaceId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeType, setActiveType] = useState<SynthesisType>("summary");
  const { synthesize, syntheses, completion, isLoading, error } = useResearchSynthesis();

  if (!thread) {
    return (
 <div className="flex h-full flex-col items-center justify-center">
 <p className="text-lg font-semibold text-[#1d1d1f] mb-2">Hilo no encontrado</p>
 <Link href={`/workspaces/${params.workspaceId}/research`} className="text-sm text-indigo-400">
          ← Volver a Research
 </Link>
 </div>
    );
  }

  const toggleSource = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedSources = selected.size === 0
    ? thread.sources
    : thread.sources.filter(s => selected.has(s.id));

  return (
 <div className="flex h-full flex-col -mx-7 -my-6">
      {/* Top bar */}
 <div className="flex items-center justify-between border-b border-[#e8e8ed] bg-white px-6 py-3">
 <div>
 <Link href={`/workspaces/${params.workspaceId}/research`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
            ← Research
 </Link>
 <h1 className="text-base font-semibold text-[#1d1d1f] mt-1">{thread.title}</h1>
 </div>
 <div className="flex items-center gap-2">
 <SaveAiAsDoc
            workspaceId={params.workspaceId}
            title={thread.title}
            text={[...syntheses, ...thread.syntheses].map((s: { content?: string }) => s.content ?? "").filter(Boolean).join("\n\n")}
          />
 <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] text-[#6e6e73]">
            {thread.sources.length} fuentes
 </span>
 </div>
 </div>

      {/* Synthesis selector */}
 <div className="flex flex-wrap gap-1.5 border-b border-[#e8e8ed] bg-white px-6 py-2">
        {SYNTHESIS_TYPES.map(st => (
 <button
            key={st.id}
            onClick={() => setActiveType(st.id)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
              activeType === st.id ? "bg-indigo-600 text-white" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            }`}
          >
            {st.label}
 </button>
        ))}
 <button
          onClick={() =>
            synthesize({
              sources: selectedSources,
              type: activeType,
              query: thread.query,
              workspaceContext: { workspaceName: "España 2026", activeIssues: ["Bulos financiación"] },
            })
          }
          disabled={isLoading || selectedSources.length === 0}
          className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isLoading ? "Sintetizando…" : "Sintetizar"}
 </button>
 </div>

 <div className="flex flex-1 overflow-hidden">
        {/* Sources sidebar */}
 <aside className="w-80 flex-none overflow-y-auto border-r border-[#e8e8ed] p-3 space-y-2">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-2">
            Fuentes ({thread.sources.length})
 </p>
          {thread.sources.map(src => {
            const isSel = selected.has(src.id);
            return (
 <button
                key={src.id}
                onClick={() => toggleSource(src.id)}
                className={`block w-full rounded-lg p-2.5 text-left transition-colors ${
                  isSel ? "bg-indigo-500/10 border border-indigo-500/30" : "bg-[#fbfbfd] border border-[#e8e8ed] hover:border-[#b0b0b8]"
                }`}
              >
 <p className="text-xs font-semibold text-[#1d1d1f] mb-1 line-clamp-2">{src.title}</p>
 <p className="text-[10px] text-[#6e6e73] mb-1">
                  {src.type} {src.domain ? `· ${src.domain}` : ""}
 </p>
 <p className="text-[10px] text-[#6e6e73] line-clamp-2">{src.content}</p>
 </button>
            );
          })}
 </aside>

        {/* Center */}
 <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && completion && (
 <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
 <div className="mb-2 flex items-center gap-2">
 <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-indigo-400" />
 <span className="text-xs text-indigo-400 font-semibold">Generando síntesis…</span>
 </div>
 <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{completion}</p>
 </div>
          )}

          {syntheses.map(syn => (
 <div key={syn.id} className="rounded-xl border border-[#e8e8ed] bg-white p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                  {syn.type}
 </span>
 <span className="text-[10px] text-[#6e6e73]">
                  {new Date(syn.generatedAt).toLocaleString("es-ES")}
 </span>
 </div>
 <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{syn.content}</p>
 </div>
          ))}

          {thread.syntheses.map(syn => (
 <div key={syn.id} className="rounded-xl border border-[#e8e8ed] bg-white p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">
                  {syn.type} · histórico
 </span>
 <span className="text-[10px] text-[#6e6e73]">
                  {new Date(syn.generatedAt).toLocaleString("es-ES")}
 </span>
 </div>
 <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">{syn.content}</p>
 </div>
          ))}

          {error && (
 <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              Error: {error}
 </div>
          )}

          {!isLoading && syntheses.length === 0 && thread.syntheses.length === 0 && (
 <p className="text-sm text-[#6e6e73]">
              Selecciona el tipo de síntesis y pulsa «Sintetizar» con las fuentes que quieras incluir.
 </p>
          )}
 </main>
 </div>
 </div>
  );
}
