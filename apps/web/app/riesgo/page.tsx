"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, AlertTriangle, Camera, ChevronRight, TrendingUp, Zap, Download } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

interface RiskIndexComponentes {
  senales_criticas_24h: number;
  leyes_alto_impacto_7d: number;
  sentimiento_politicos: number;
  iniciativas_pendientes: number;
}
interface RiskIndex { score: number; nivel: string; componentes: RiskIndexComponentes }
interface ScenarioResult {
  scenario?: Record<string, unknown>;
  ccaa?: string | null;
  results?: Record<string, unknown>[];
}

const CCAA_LIST = ["Todas", "Andalucía", "Cataluña", "Madrid", "Valencia", "País Vasco", "Galicia", "Castilla y León", "Aragón"];

const SUGGEST_FEATURES: Record<string, Record<string, string>> = {
  electoral:    { tasa_paro: "13.0", aprobacion_gobierno: "28.0" },
  legislativo:  { iniciativas_pendientes: "15" },
  legislative:  { iniciativas_pendientes: "15" },
  media:        { polarizacion: "0.85" },
  geopolitico:  { crisis_internacional: "true" },
};

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

  // ── Estado: scenario expansion per signal ─────────────────────────────────
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const score = summary?.score ?? 0;
  const banda = summary?.banda ?? "—";
  const kpis  = summary?.kpis ?? [];
  const dimensions = heatmap?.dimensions ?? [];
  const severities = heatmap?.severities ?? ["Alta", "Media", "Baja"];
  const componentes = (riskIndex as RiskIndex | undefined)?.componentes ?? {
    senales_criticas_24h: 0, leyes_alto_impacto_7d: 0, sentimiento_politicos: 0, iniciativas_pendientes: 0,
  };

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

      {/* Breakdown del índice de riesgo (4 componentes) */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
          Desglose del índice de riesgo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BreakdownCard
            label="Señales críticas (24h)"
            value={componentes.senales_criticas_24h}
            barPct={Math.min(100, (componentes.senales_criticas_24h * 5 / 30) * 100)}
            barColor="bg-red1"
            subtitle="señales de urgencia ≥4"
          />
          <BreakdownCard
            label="Leyes alto impacto (7d)"
            value={componentes.leyes_alto_impacto_7d}
            barPct={Math.min(100, (componentes.leyes_alto_impacto_7d * 3 / 20) * 100)}
            barColor="bg-amber1"
            subtitle="iniciativas legislativas de alto impacto"
          />
          <SentimentBreakdownCard sentiment={componentes.sentimiento_politicos}/>
          <BreakdownCard
            label="Iniciativas pendientes"
            value={componentes.iniciativas_pendientes}
            barPct={Math.min(100, (componentes.iniciativas_pendientes * 0.5 / 15) * 100)}
            barColor="bg-cyan1"
            subtitle="últimos 30 días"
          />
        </div>
      </section>

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
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => setExpandedSignal(expandedSignal === i ? null : i)}
                          className="text-xs text-cyan1 hover:underline inline-flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3"/>
                          {expandedSignal === i ? "Cerrar" : "Simular escenario"}
                        </button>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-text2 hover:underline inline-flex items-center gap-1">
                            Fuente <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {expandedSignal === i && (
                        <ScenarioSimulator
                          signalArea={s.area || "electoral"}
                          signalTitle={s.title}
                        />
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

// ── Sub-components ──────────────────────────────────────────────────────────
function BreakdownCard({ label, value, barPct, barColor, subtitle }: {
  label: string; value: number; barPct: number; barColor: string; subtitle: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-text2">{label}</span>
      </div>
      <div className="text-3xl font-bold text-text1 font-mono">{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{subtitle}</div>
      <div className="mt-2 h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${barPct}%`, transition: "width 600ms ease" }} />
      </div>
    </div>
  );
}

function SentimentBreakdownCard({ sentiment }: { sentiment: number }) {
  const pct = Math.max(0, Math.min(100, ((1 - sentiment) / 2) * 100));
  const badge = sentiment > 0.1 ? { cls: "badge-green", txt: "positivo" }
              : sentiment < -0.1 ? { cls: "badge-red",   txt: "negativo" }
              : { cls: "badge-cyan",  txt: "neutro" };
  return (
    <div className="kpi-card">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-text2">Sentimiento político</span>
        <span className={`badge ${badge.cls}`}>{badge.txt}</span>
      </div>
      <div className="text-3xl font-bold text-text1 font-mono">
        {sentiment >= 0 ? "+" : ""}{sentiment.toFixed(2)}
      </div>
      <div className="text-[10px] text-muted mt-0.5">media políticos activos</div>
      <div className="mt-2 h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className="h-full bg-blue1" style={{ width: `${pct}%`, transition: "width 600ms ease" }} />
      </div>
    </div>
  );
}

function ScenarioSimulator({ signalArea, signalTitle }: { signalArea: string; signalTitle: string }) {
  const [ccaa, setCcaa] = useState<string>("Todas");
  const [features, setFeatures] = useState<Record<string, string>>(SUGGEST_FEATURES[signalArea] ?? {});

  const mut = useMutation<ScenarioResult, Error, void>({
    mutationFn: async () => {
      const features_override: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(features)) {
        if (v === "true") features_override[k] = true;
        else if (v === "false") features_override[k] = false;
        else if (!isNaN(Number(v))) features_override[k] = Number(v);
        else features_override[k] = v;
      }
      const r = await fetch(`${INTEL_BASE}/intelligence/propensity/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features_override,
          ccaa: ccaa === "Todas" ? null : ccaa,
        }),
      });
      if (!r.ok) throw new Error("scenario fail");
      return r.json();
    },
  });

  const updateFeature = (key: string, value: string) =>
    setFeatures(prev => ({ ...prev, [key]: value }));

  const downloadCSV = () => {
    const results = mut.data?.results ?? [];
    if (results.length === 0) return;
    const cols = Object.keys(results[0]);
    const csv = [
      cols.join(","),
      ...results.map(row => cols.map(c => JSON.stringify(row[c] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `scenario-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const results = mut.data?.results ?? [];
  const cols = results.length > 0 ? Object.keys(results[0]).slice(0, 6) : [];

  return (
    <div className="mt-3 p-3 rounded-lg bg-cyan1/5 border border-cyan1/20">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan1 mb-2">
        Simulación · {signalTitle.slice(0, 60)}
      </h4>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-text2 block mb-1">CCAA</label>
          <select
            value={ccaa}
            onChange={e => setCcaa(e.target.value)}
            className="w-full text-xs bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none"
          >
            {CCAA_LIST.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {Object.entries(features).map(([k, v]) => (
          <div key={k}>
            <label className="text-[10px] text-text2 block mb-1 truncate" title={k}>{k}</label>
            <input
              type="text"
              value={v}
              onChange={e => updateFeature(k, e.target.value)}
              className="w-full text-xs bg-bg3 border border-border1 rounded px-2 py-1 text-text1 font-mono focus:border-cyan1 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="text-xs px-3 py-1.5 rounded bg-cyan1 text-bg font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <Zap className="w-3 h-3"/> {mut.isPending ? "Simulando..." : "Ejecutar simulación"}
      </button>

      {/* Results */}
      {mut.isSuccess && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge badge-amber">Secciones afectadas: {results.length}</span>
            {results.length > 0 && (
              <button
                onClick={downloadCSV}
                className="text-[10px] px-2 py-1 rounded bg-bg3 border border-border1 hover:border-cyan1/40 inline-flex items-center gap-1 text-text2"
              >
                <Download className="w-3 h-3"/> CSV
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-text2">
                  <tr>{cols.map(c => <th key={c} className="text-left py-1 pr-2 font-medium">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-border1">
                      {cols.map(c => (
                        <td key={c} className="py-1 pr-2 font-mono text-text1">
                          {String(row[c] ?? "—").slice(0, 30)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mut.isError && (
        <p className="text-xs text-red1 mt-2">Error en la simulación. Inténtalo de nuevo.</p>
      )}
    </div>
  );
}
