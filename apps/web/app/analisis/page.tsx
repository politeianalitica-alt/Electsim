"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { DataMode } from "@/lib/types/status";
import type { AnalysisSignal, SignalSeverity, SignalTrend } from "@/lib/types/analysis";

const PERIOD_OPTIONS = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

const SEVERITY_COLORS: Record<SignalSeverity, string> = {
  critical: "border-red-500/50 bg-red-500/5",
  high: "border-orange-500/50 bg-orange-500/5",
  medium: "border-amber-500/50 bg-amber-500/5",
  low: "border-zinc-700 bg-zinc-900/30",
};

const SEVERITY_BADGE: Record<SignalSeverity, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-zinc-700 text-zinc-400",
};

const TREND_LABEL: Record<SignalTrend, string> = {
  up: "Subiendo",
  down: "Bajando",
  stable: "Estable",
  new: "Nueva",
};

const DOMAIN_LABELS: Record<string, string> = {
  electoral: "Electoral", legislative: "Legislativo", media: "Medios",
  economic: "Económico", risk: "Riesgo", geopolitical: "Geopolítica",
  actors: "Actores", workspace: "Workspace", system: "Sistema",
};

export default function AnalisisPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("24h");

  const hubQ = useQuery({
    queryKey: ["analysis-hub", period],
    queryFn: () => endpoints.analysisHub({ period }).catch(() => null),
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => endpoints.analysisRefresh({ period, workspace_id: "default", force: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis-hub"] });
    },
  });

  const data = hubQ.data;
  const mode = (data?.mode ?? "fallback") as DataMode;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis Hub</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Lectura transversal de señales electorales, legislativas, mediáticas, económicas, geopolíticas y de riesgo.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ModeBadge mode={mode} source={data?.meta?.source} />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["analysis-hub"] })}
            className="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Actualizar
          </button>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="px-3 py-1.5 rounded text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white"
          >
            {refreshMutation.isPending ? "Regenerando..." : "Regenerar analisis"}
          </button>
        </div>
      </div>

      {hubQ.isLoading && (
        <div className="p-8 text-center text-zinc-500">Generando análisis...</div>
      )}

      {hubQ.isError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-center gap-2">
          <span>⚠</span>
          <span>API no responde — los datos se actualizarán cuando la conexión se restaure.</span>
        </div>
      )}

      {data && (
        <>
          {/* Executive Summary */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Resumen ejecutivo</h2>
              <div className="flex items-center gap-2">
                <ModeBadge mode={mode} />
                <span className="text-xs text-zinc-600">
                  {new Date(data.generated_at).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
            <p className="text-zinc-200 text-sm leading-relaxed">{data.executive_summary}</p>
            {data.meta?.message && (
              <p className="text-xs text-zinc-600 mt-2 italic">{data.meta.message}</p>
            )}
          </div>

          {/* Top Signals */}
          {data.top_signals.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Señales prioritarias ({data.top_signals.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {data.top_signals.map((signal: AnalysisSignal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Changed 24h */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Cambios en el periodo
              </h2>
              {data.changed_24h.length === 0 ? (
                <EmptyState message="Sin cambios detectados en el periodo seleccionado." />
              ) : (
                <div className="space-y-2">
                  {data.changed_24h.map((s: AnalysisSignal) => (
                    <div key={s.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                      <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${SEVERITY_BADGE[s.severity]}`}>
                        {s.severity}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{DOMAIN_LABELS[s.domain] ?? s.domain} · {TREND_LABEL[s.trend]}</p>
                      </div>
                      {s.target_route && (
                        <a href={s.target_route} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0 mt-0.5">
                          Abrir
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Risks + Data health + Actions */}
            <div className="space-y-4">
              {/* Risks */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Riesgos</h3>
                {data.risks.length === 0 ? (
                  <p className="text-xs text-zinc-600">Sin riesgos críticos detectados.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.risks.map((r: AnalysisSignal) => (
                      <li key={r.id} className="text-xs">
                        <span className={`inline-block px-1 py-0.5 rounded font-bold uppercase mr-1.5 ${SEVERITY_BADGE[r.severity]}`}>
                          {r.severity}
                        </span>
                        <span className="text-zinc-300">{r.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Opportunities */}
              {data.opportunities.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Oportunidades</h3>
                  <ul className="space-y-2">
                    {data.opportunities.map((o: AnalysisSignal) => (
                      <li key={o.id} className="text-xs text-zinc-300">{o.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source health */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Salud de datos</h3>
                  <a href="/fuentes" className="text-[10px] text-blue-400 hover:text-blue-300">Ver fuentes</a>
                </div>
                {data.source_health_summary.total != null ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total fuentes</span>
                      <span className="text-white">{String(data.source_health_summary.total ?? "—")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Activas</span>
                      <span className="text-green-400">{String(data.source_health_summary.active ?? "—")}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">Datos de fuentes no disponibles.</p>
                )}
              </div>

              {/* Recommended actions */}
              {data.recommended_next_actions.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Acciones recomendadas</h3>
                  <ul className="space-y-1.5">
                    {data.recommended_next_actions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-300">
                        <span className="text-zinc-600 flex-shrink-0 mt-0.5">›</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SignalCard({ signal }: { signal: AnalysisSignal }) {
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${SEVERITY_COLORS[signal.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${SEVERITY_BADGE[signal.severity]}`}>
            {signal.severity}
          </span>
          <span className="text-[10px] text-zinc-500">{DOMAIN_LABELS[signal.domain] ?? signal.domain}</span>
          <span className="text-[10px] text-zinc-600">{TREND_LABEL[signal.trend]}</span>
        </div>
        {signal.target_route && (
          <a href={signal.target_route} className="text-[10px] text-blue-400 hover:text-blue-300 flex-shrink-0">
            Abrir modulo
          </a>
        )}
      </div>
      <p className="text-sm font-medium text-white">{signal.title}</p>
      <p className="text-xs text-zinc-400 leading-relaxed">{signal.summary}</p>
      {signal.recommended_action && (
        <p className="text-xs text-blue-300 italic">{signal.recommended_action}</p>
      )}
      {signal.score !== null && (
        <p className="text-[10px] text-zinc-600">Score: {signal.score?.toFixed(0)}</p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-6 text-center text-sm text-zinc-600">
      {message}
    </div>
  );
}
