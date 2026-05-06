"use client";

import { useState } from "react";
import type { BriefingRequest, BriefingType, BriefingAudience } from "@/lib/types/briefings";

const TYPES: Array<{ value: BriefingType; label: string }> = [
  { value: "morning", label: "Matinal" },
  { value: "client", label: "Cliente" },
  { value: "legislative", label: "Legislativo" },
  { value: "crisis", label: "Crisis" },
  { value: "media", label: "Medios / Narrativa" },
  { value: "geopolitical", label: "Geopolitico" },
  { value: "sectorial", label: "Sectorial" },
];

const AUDIENCES: Array<{ value: BriefingAudience; label: string }> = [
  { value: "general", label: "General" },
  { value: "consultor_politico", label: "Consultor politico" },
  { value: "periodista", label: "Periodista" },
  { value: "candidato", label: "Candidato" },
  { value: "empresa_ibex", label: "Empresa IBEX" },
  { value: "unidad_inteligencia", label: "Unidad de inteligencia" },
];

const PERIODS = ["24h", "7d", "30d"];

interface Props {
  onGenerate: (req: BriefingRequest) => void;
  isLoading: boolean;
}

export function BriefingGeneratePanel({ onGenerate, isLoading }: Props) {
  const [type, setType] = useState<BriefingType>("morning");
  const [audience, setAudience] = useState<BriefingAudience>("general");
  const [period, setPeriod] = useState("24h");
  const [workspaceId, setWorkspaceId] = useState("default");
  const [sector, setSector] = useState("");
  const [topic, setTopic] = useState("");
  const [includeMethodology, setIncludeMethodology] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);

  const handleGenerate = () => {
    onGenerate({
      briefing_type: type,
      audience,
      workspace_id: workspaceId,
      sector: sector || null,
      topic: topic || null,
      period,
      force_refresh: false,
      include_methodology: includeMethodology,
      include_evidence: includeEvidence,
      language: "es",
    });
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300">Generar briefing</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BriefingType)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Audiencia</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as BriefingAudience)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Periodo</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Workspace</label>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            placeholder="default"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Sector (opcional)</label>
          <input
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            placeholder="energia, tecnologia..."
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Tema (opcional)</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            placeholder="regulacion, narrativa..."
          />
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={includeMethodology} onChange={(e) => setIncludeMethodology(e.target.checked)} />
          Incluir metodologia
        </label>
        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={includeEvidence} onChange={(e) => setIncludeEvidence(e.target.checked)} />
          Incluir evidencias
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium text-white transition-colors"
      >
        {isLoading ? "Generando briefing..." : "Generar briefing"}
      </button>
    </div>
  );
}
