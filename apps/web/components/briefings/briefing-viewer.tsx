"use client";

import { ModeBadge } from "@/components/status/mode-badge";
import { BriefingSectionCard } from "./briefing-section-card";
import type { BriefingDocument } from "@/lib/types/briefings";

const TYPE_LABELS: Record<string, string> = {
  morning: "Briefing matinal",
  client: "Briefing de cliente",
  legislative: "Briefing legislativo",
  crisis: "Briefing de crisis",
  media: "Briefing mediatico",
  geopolitical: "Briefing geopolitico",
  sectorial: "Briefing sectorial",
};

const AUDIENCE_LABELS: Record<string, string> = {
  consultor_politico: "Consultor politico",
  periodista: "Periodista",
  candidato: "Candidato",
  empresa_ibex: "Empresa IBEX",
  unidad_inteligencia: "Unidad de inteligencia",
  general: "General",
};

interface Props {
  briefing: BriefingDocument;
}

export function BriefingViewer({ briefing }: Props) {
  return (
    <div className="space-y-5">
      {/* Meta header */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{briefing.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
              <span>{TYPE_LABELS[briefing.briefing_type] ?? briefing.briefing_type}</span>
              <span>·</span>
              <span>{AUDIENCE_LABELS[briefing.audience] ?? briefing.audience}</span>
              <span>·</span>
              <span>Periodo: {briefing.period}</span>
              {briefing.sector && <><span>·</span><span>{briefing.sector}</span></>}
              {briefing.topic && <><span>·</span><span>{briefing.topic}</span></>}
              <span>·</span>
              <span>{new Date(briefing.generated_at).toLocaleString("es-ES")}</span>
              {briefing.model_used && (
                <><span>·</span><span className="font-mono">{briefing.model_used}</span></>
              )}
              {briefing.latency_ms && (
                <><span>·</span><span>{briefing.latency_ms}ms</span></>
              )}
            </div>
          </div>
          <ModeBadge mode={briefing.mode} />
        </div>

        {/* Warnings */}
        {briefing.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {briefing.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
                <span className="flex-shrink-0">!</span>{w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Executive summary */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resumen ejecutivo</h3>
        <p className="text-zinc-200 leading-relaxed text-sm">{briefing.executive_summary}</p>
      </div>

      {/* Sections */}
      {briefing.sections.map((section) => (
        <BriefingSectionCard key={section.id} section={section} />
      ))}

      {/* Methodology note */}
      {briefing.methodology_note && (
        <div className="rounded-lg border border-zinc-800/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Nota metodologica</h3>
          <p className="text-xs text-zinc-600">{briefing.methodology_note}</p>
        </div>
      )}
    </div>
  );
}
