"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, AlertTriangle, Camera, ChevronRight, TrendingUp } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

// ── Helpers visuales (mantienen estilo previo) ──────────────────────────────
function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 60) return "#F59E0B";
  if (v >= 40) return "#3B82F6";
  return "#10B981";
}

function kpiColor(c: string) {
  return c === "red" ? "text-red1" : c === "amber" ? "text-amber1" : c === "blue" ? "text-blue1" : "text-green1";
}

function cellColor(val: number, sev: string) {
  const intensity = Math.min(val / 12, 1);
  const base = sev === "Alta" ? "239, 68, 68" : sev === "Media" ? "245, 158, 11" : "59, 130, 246";
  return `rgba(${base}, ${0.15 + intensity * 0.55})`;
}

function impactBadge(impact: string): string {
  if (impact === "Crítico" || impact === "Alto") return "badge-red";
  if (impact === "Medio") return "badge-amber";
  return "badge-blue";
}

export default function RiesgoPage() {
  // ── Live queries ──────────────────────────────────────────────────────────
  // /api/risk/summary  (composite + KPIs dimensionales)
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["risk", "summary"],
    queryFn: () => endpoints.risk.summary(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  // /intelligence/risk-index  (componentes adicionales como senales_criticas_24h)
  const { data: riskIndex } = useQuery({
    queryKey: ["risk", "intelligence-index"],
    queryFn: () => endpoints.intelligence.riskIndex(),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const { data: heatmap, isLoading: loadingHeatmap } = useQuery({
    queryKey: ["risk", "heatmap"],
    queryFn: () => endpoints.risk.heatmap(),
    staleTime: 120_000,
  });

  // Señales reales desde /intelligence/signals (más ricas que /api/risk/signals)
  const { data: intelSignals } = useQuery({
    queryKey: ["risk", "intel-signals"],
    queryFn: () => endpoints.intelligence.signals(3, 4320, 10),
    staleTime: 60_000,
  });

  // Fallback a /api/risk/signals si /intelligence/signals está vacío
  const { data: riskSignalsApi = [], isLoading: loadingSignalsApi } = useQuery({
    queryKey: ["risk", "signals"],
    queryFn: () => endpoints.risk.signals(5),
    staleTime: 60_000,
  });
  const loadingSignals = loadingSignalsApi;
  // Mapear /intelligence/signals al shape de RiskSignal si existen, sino usar /api/risk/signals
  const signals = (intelSignals && intelSignals.length > 0)
    ? intelSignals.slice(0, 5).map(s => ({
        title: s.titulo,
        probability: Math.min(95, (s.urgencia ?? 3) * 18),
        impact: (s.urgencia ?? 3) >= 4 ? "Alto" : (s.urgencia ?? 3) >= 3 ? "Medio" : "Bajo",
        description: s.resumen ?? "",
        area: (s.tipo || "").toLowerCase(),
        url: undefined as string | undefined,
        source: s.modulo_origen,
        sentiment: undefined as string | undefined,
        scraped_at: s.created_at,
      }))
    : riskSignalsApi;

  const { data: history = [] } = useQuery({
    queryKey: ["risk", "history"],
    queryFn: () => endpoints.risk.history(30),
    staleTime: 300_000,
  });

  const snapshotMut = useMutation({
    mutationFn: () => endpoints.risk.snapshot(),
  });

  // ── Derivados ─────────────────────────────────────────────────────────────
  const score = summary?.score ?? 0;
  const banda = summary?.banda ?? "—";
  const kpis  = summary?.kpis ?? [];
  const dimensions = heatmap?.dimensions ?? [];
  const severities = heatmap?.severities ?? ["Alta", "Media", "Baja"];

  // Sparkline desde history.score[]
  const sparkValues = history.length > 0 ? history.map(p => p.score) : [];
  const max = sparkValues.length ? Math.max(...sparkValues) : 100;
  const min = sparkValues.length ? Math.min(...sparkValues) : 0;
  const range = max - min || 1;
  const points = sparkValues.length > 1
    ? sparkValues.map((v, i) => {
        const x = (i / (sparkValues.length - 1)) * 300;
        const y = 60 - ((v - min) / range) * 50;
        return `${x},${y}`;
      }).join(" ")
    : "";

  // Tendencia: actual vs hace 7 días
  const trend = sparkValues.length >= 8
    ? +(sparkValues[sparkValues.length - 1] - sparkValues[sparkValues.length - 8]).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Termómetro de Riesgo</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Termómetro de Riesgo</h1>
        <p className="text-text2 text-sm mt-1">
          Estado consolidado del riesgo en todas las dimensiones operativas.
          {summary && <span className="ml-2 text-cyan1">[{summary.mode}]</span>}
        </p>
      </header>

      {/* Hero gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="premium-card lg:col-span-1 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Riesgo global</div>
          <div className="relative w-48 h-24">
            {loadingSummary ? (
              <div className="w-full h-full animate-pulse bg-bg3 rounded" />
            ) : (
              <svg viewBox="0 0 200 100" className="w-full h-full">
                <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="#1E293B" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  stroke={gaugeColor(score)}
                  strokeWidth="14"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 282} 282`}
                  style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.16,1,0.3,1)" }}
                />
              </svg>
            )}
          </div>
          <div className="text-5xl font-bold mt-2" style={{ color: gaugeColor(score) }}>
            {loadingSummary ? "—" : score.toFixed(1)}
          </div>
          <div className="text-xs text-text2 mt-1">
            Nivel: <span className="font-semibold" style={{ color: gaugeColor(score) }}>{banda}</span>
            {summary?.confianza != null && <span className="ml-2 text-muted">· Conf {(summary.confianza * 100).toFixed(0)}%</span>}
          </div>
          <button
            onClick={() => snapshotMut.mutate()}
            disabled={snapshotMut.isPending}
            className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-cyan1/40 text-cyan1 hover:bg-cyan1/10 transition disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            {snapshotMut.isPending ? "Capturando…" : snapshotMut.isSuccess ? "Snapshot guardado" : "Capturar snapshot"}
          </button>
        </section>

        <section className="lg:col-span-2 grid grid-cols-2 gap-3">
          {loadingSummary
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="kpi-card animate-pulse">
                  <div className="h-3 bg-bg3 rounded w-1/2 mb-2" />
                  <div className="h-7 bg-bg3 rounded w-1/3" />
                </div>
              ))
            : kpis.map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="text-[10px] uppercase tracking-wider text-text2 mb-1 flex items-center justify-between">
                    <span>{k.label}</span>
                    {k.delta != null && k.delta !== 0 && (
                      <span className={k.delta > 0 ? "text-red1" : "text-green1"}>
                        {k.delta > 0 ? "▲" : "▼"} {Math.abs(k.delta)}
                      </span>
                    )}
                  </div>
                  <div className={`text-2xl font-bold ${kpiColor(k.color)}`}>{k.value}</div>
                  <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${k.value}%`, backgroundColor: gaugeColor(k.value), transition: "width 800ms cubic-bezier(0.16,1,0.3,1)" }} />
                  </div>
                </div>
              ))}
        </section>
      </div>

      {/* Heatmap */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Matriz dimensión × severidad</h2>
        {loadingHeatmap ? (
          <div className="h-40 animate-pulse bg-bg3 rounded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted font-normal" />
                  {severities.map(s => (
                    <th key={s} className="text-center p-2 text-muted font-normal uppercase tracking-wider">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensions.map(d => (
                  <tr key={d}>
                    <td className="p-2 text-text1 font-medium">{d}</td>
                    {severities.map(s => {
                      const val = heatmap?.matrix[d]?.[s] ?? 0;
                      return (
                        <td key={s} className="p-2 text-center">
                          <div
                            className="rounded py-3 px-2 font-mono text-text1 cursor-pointer hover:ring-1 hover:ring-cyan1 transition"
                            style={{ backgroundColor: cellColor(val, s) }}
                          >
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top signals */}
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top 5 señales de riesgo</h2>
          </div>
          <ul className="space-y-3">
            {loadingSignals
              ? Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="p-3 rounded-lg border border-border1 animate-pulse">
                    <div className="h-4 bg-bg3 rounded w-3/4 mb-2" />
                    <div className="h-1 bg-bg3 rounded-full w-full mb-2" />
                    <div className="h-3 bg-bg3 rounded w-1/2" />
                  </li>
                ))
              : signals.length > 0
                ? signals.map((s, i) => (
                    <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">{s.title}</h3>
                        <span className={`badge ${impactBadge(s.impact)} shrink-0`}>{s.impact}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] text-muted mb-0.5">
                            <span>Probabilidad</span><span className="text-cyan1 font-mono">{s.probability}%</span>
                          </div>
                          <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber1 to-red1" style={{ width: `${s.probability}%`, transition: "width 800ms cubic-bezier(0.16,1,0.3,1)" }} />
                          </div>
                        </div>
                      </div>
                      {s.description && <p className="text-xs text-text2 mb-2">{s.description}</p>}
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        {s.source && <span className="font-semibold text-text2">{s.source}</span>}
                        <span>· {s.area}</span>
                        {s.sentiment && <span>· {s.sentiment}</span>}
                      </div>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan1 hover:underline inline-flex items-center gap-1 mt-2">
                          Investigar <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </li>
                  ))
                : <li className="text-xs text-muted italic">Sin señales detectadas en los últimos 7 días.</li>}
          </ul>
        </section>

        {/* Time series */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Evolución 30 días</h2>
          </div>
          {sparkValues.length > 1 ? (
            <>
              <svg viewBox="0 0 300 80" className="w-full h-32">
                <defs>
                  <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={gaugeColor(score)} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={gaugeColor(score)} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline points={`0,80 ${points} 300,80`} fill="url(#riskFill)" />
                <polyline points={points} fill="none" stroke={gaugeColor(score)} strokeWidth="1.5" />
              </svg>
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>Mín {min.toFixed(1)}</span>
                <span>Máx {max.toFixed(1)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border1">
                <div className="flex items-center gap-2 text-xs text-text2">
                  <TrendingUp className={`w-3.5 h-3.5 ${trend > 0 ? "text-red1" : trend < 0 ? "text-green1" : "text-muted"}`} />
                  <span>
                    Tendencia:{" "}
                    <span className={trend > 0 ? "text-red1" : trend < 0 ? "text-green1" : "text-muted"}>
                      {trend > 0 ? "+" : ""}{trend} pts
                    </span>{" "}
                    vs hace 7 días
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-32 animate-pulse bg-bg3 rounded" />
          )}
        </section>
      </div>
    </div>
  );
}
