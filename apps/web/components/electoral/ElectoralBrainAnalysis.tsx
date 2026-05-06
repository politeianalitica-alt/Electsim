"use client";

import { useState } from "react";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ElectoralBriefingRequest,
  ElectoralBriefingResponse,
} from "@/lib/types/electoral";

const FOCUS_OPTIONS: { value: string; label: string }[] = [
  { value: "coalition_risk", label: "Riesgo de coalición" },
  { value: "seat_changes", label: "Cambios en escaños" },
  { value: "kingmaker", label: "Partido pivotal" },
  { value: "electoral_outlook", label: "Perspectiva electoral" },
  { value: "legislative_risk", label: "Riesgo legislativo" },
];

export function ElectoralBrainAnalysis({
  globalMode,
}: {
  globalMode: string;
}) {
  const [focus, setFocus] = useState("coalition_risk");
  const [extraContext, setExtraContext] = useState("");
  const [result, setResult] = useState<ElectoralBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setResult(null);
    const payload: ElectoralBriefingRequest = {
      focus,
      extra_context: extraContext || null,
    };
    try {
      const res = await endpoints.electoralBriefing(payload);
      setResult(res);
    } catch {
      setResult({
        briefing: "Error al conectar con Brain. Inténtalo de nuevo.",
        key_points: [],
        risk_indicators: [],
        mode: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">
          Brain Analysis — Electoral
        </h3>
        <Sparkles className="w-3.5 h-3.5 text-amber1 ml-auto" />
      </div>

      {/* Focus selector */}
      <div className="space-y-2">
        <label className="label-cap">Foco de análisis</label>
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 focus:outline-none focus:border-cyan1"
        >
          {FOCUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Extra context */}
      <div className="space-y-2">
        <label className="label-cap">Contexto adicional (opcional)</label>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="Añade contexto específico para el análisis…"
          rows={3}
          className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1 resize-none"
        />
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan1 text-bg1 text-sm font-bold hover:bg-cyan1/80 transition disabled:opacity-50"
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Analizar
      </button>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-lg border border-cyan1/20 bg-cyan1/5 space-y-3">
          <pre className="whitespace-pre-wrap text-xs text-text1 font-sans leading-relaxed">
            {result.briefing}
          </pre>

          {result.key_points.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                Puntos clave
              </p>
              <ul className="space-y-1">
                {result.key_points.map((kp, i) => (
                  <li key={i} className="text-xs text-text2 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan1 shrink-0 mt-1" />
                    {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.risk_indicators.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                Indicadores de riesgo
              </p>
              <div className="flex flex-wrap gap-1">
                {result.risk_indicators.map((ri, i) => (
                  <span key={i} className="badge badge-amber text-[10px]">
                    {ri}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
