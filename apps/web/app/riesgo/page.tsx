"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import {
  Activity, AlertTriangle, TrendingUp, Shield, RefreshCw,
  Zap, Target, BarChart3, Calendar,
} from "lucide-react";

// ── helpers ─────────────────────────────────────────────────────────────────

function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 60) return "#F59E0B";
  if (v >= 40) return "#3B82F6";
  return "#10B981";
}
function dimColor(v: number): string {
  if (v >= 75) return "text-red1";
  if (v >= 60) return "text-amber1";
  if (v >= 40) return "text-blue1";
  return "text-green1";
}
function trendArrow(trend: string) {
  if (trend === "rising")  return { symbol: "▲", color: "text-red1" };
  if (trend === "falling") return { symbol: "▼", color: "text-green1" };
  return { symbol: "→", color: "text-text2" };
}
function statusDot(status: string) {
  if (status === "red")    return "bg-red1";
  if (status === "yellow") return "bg-amber1";
  return "bg-green1";
}

const DOMAIN_LABELS: Record<string, string> = {
  legislative: "Legislativo", media: "Mediático", coalition: "Coalición",
  actors: "Actores", economic: "Económico", geopolitical: "Geopolítico",
  territorial: "Territorial", system: "Sistémico",
};

// ── Sparkline ────────────────────────────────────────────────────────────────

function RiskSparkline({ data, width = 400, height = 56 }: {
  data: number[]; width?: number; height?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const toX = (i: number) => (i / (n - 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * (height - 8) - 4;

  const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  // filled area
  const area = `${toX(0)},${height} ${pts} ${toX(n - 1)},${height}`;
  const last = data[data.length - 1];
  const col = gaugeColor(last);

  // threshold line at 65
  const threshY = toY(65);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* threshold */}
      <line x1={0} y1={threshY} x2={width} y2={threshY}
        stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5" />
      <text x={width - 2} y={threshY - 2} fill="#F59E0B" fontSize="8" textAnchor="end" opacity="0.7">alerta</text>
      {/* area fill */}
      <polygon points={area} fill={col} fillOpacity="0.10" />
      {/* line */}
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" />
      {/* last dot */}
      <circle cx={toX(n - 1)} cy={toY(last)} r="3.5" fill={col} />
    </svg>
  );
}

// ── Timeline mini-chart ───────────────────────────────────────────────────────

function TimelineChart({ data, width = 500, height = 72 }: {
  data: { date: string; score: number; event?: string | null; severity?: string }[];
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const scores = data.map(d => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const n = data.length;
  const toX = (i: number) => (i / (n - 1)) * width;
  const toY = (v: number) => height - 12 - ((v - min) / range) * (height - 20);

  const pts = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(" ");
  const area = `${toX(0)},${height} ${pts} ${toX(n - 1)},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
      <polygon points={area} fill="#00D4FF" fillOpacity="0.07" />
      <polyline points={pts} fill="none" stroke="#00D4FF" strokeWidth="1.5" />
      {data.map((d, i) => {
        if (!d.event) return null;
        const x = toX(i); const y = toY(d.score);
        const col = d.severity === "critical" ? "#EF4444" : d.severity === "high" ? "#F59E0B" : "#3B82F6";
        return (
          <g key={i} className="cursor-default group">
            <circle cx={x} cy={y} r="4" fill={col} />
            <line x1={x} y1={y + 4} x2={x} y2={height - 4} stroke={col} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
            <text x={x} y={height} textAnchor="middle" fill={col} fontSize="7" opacity="0.9"
              style={{ fontFamily: "monospace" }}>
              {d.date.slice(5)}
            </text>
          </g>
        );
      })}
      {/* date labels for non-event points */}
      {data.filter((d, i) => !d.event && (i === 0 || i === n - 1)).map((d, _, arr) => {
        const i = data.indexOf(d);
        return (
          <text key={i} x={toX(i)} y={height} textAnchor={i === 0 ? "start" : "end"}
            fill="#64748B" fontSize="7">
            {d.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

function ScenarioCard({ sc }: { sc: any }) {
  const impactColor = sc.impact >= 85 ? "text-red1" : sc.impact >= 70 ? "text-amber1" : "text-blue1";
  const probColor = sc.probability >= 50 ? "text-amber1" : "text-text2";
  return (
    <div className="p-3 rounded-lg border border-border1 hover:border-cyan1/30 transition">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-semibold text-text1 leading-snug">{sc.title}</div>
        <div className="shrink-0 text-right">
          <div className={`text-xs font-mono font-bold ${probColor}`}>P={sc.probability}%</div>
          <div className={`text-[10px] ${impactColor}`}>imp {sc.impact}</div>
        </div>
      </div>
      <div className="text-[11px] text-text2 line-clamp-2 mb-2">{sc.description}</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {(sc.domains ?? []).map((d: string) => (
          <span key={d} className="badge badge-blue text-[9px]">{DOMAIN_LABELS[d] ?? d}</span>
        ))}
      </div>
      {sc.triggers?.length > 0 && (
        <div className="text-[10px] text-muted">
          <span className="text-red1/80 font-semibold">Desencadenantes: </span>
          {sc.triggers.slice(0, 2).join(" · ")}
        </div>
      )}
      {sc.mitigations?.length > 0 && (
        <div className="text-[10px] text-muted mt-0.5">
          <span className="text-green1/80 font-semibold">Mitigación: </span>
          {sc.mitigations.slice(0, 1).join("")}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RiesgoPage() {
  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["risk", "overview"],
    queryFn: () => endpoints.riskOverviewV2().catch(() => null),
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["risk", "scenarios"],
    queryFn: () => endpoints.riskScenarios().catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["risk", "timeline"],
    queryFn: () => endpoints.riskTimeline(30).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const globalScore: number   = (overview as any)?.global_score ?? 0;
  const globalLevel: string   = (overview as any)?.level ?? "unknown";
  const globalTrend: string   = (overview as any)?.trend ?? "stable";
  const trendDelta: number    = (overview as any)?.trend_delta ?? 0;
  const kpis: any[]           = (overview as any)?.kpis ?? [];
  const dimensions: any[]     = (overview as any)?.dimensions ?? [];
  const topSignals: any[]     = (overview as any)?.top_signals ?? [];
  const crisisSignals: any[]  = (overview as any)?.crisis_signals ?? [];
  const earlyWarnings: any[]  = (overview as any)?.early_warnings ?? [];
  const spark: number[]       = (overview as any)?.spark ?? [];

  const arrow = trendArrow(globalTrend);

  // Weighted contribution: each dimension contributes weight * score to global
  const totalWeight = dimensions.reduce((s: number, d: any) => s + (d.weight ?? 0), 0) || 1;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia / Monitor de Riesgo</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Monitor de Riesgo Político</h1>
          <p className="text-text2 text-sm mt-1">
            Señales activas · heat map por dimensión · escenarios prospectivos
            {(overview as any)?.mode === "demo" && (
              <span className="ml-2 badge badge-cyan">demo</span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </header>

      {/* KPI row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.slice(0, 4).map((k: any, i: number) => (
            <div key={i} className="kpi-card">
              <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
              <div className="text-2xl font-bold" style={{
                color: k.color === "red" ? "#EF4444" : k.color === "green" ? "#10B981"
                     : k.color === "amber" ? "#F59E0B" : "#00D4FF",
              }}>
                {k.value}
              </div>
              {k.delta !== undefined && (
                <div className={`text-xs mt-1 ${k.delta > 0 ? "text-red1" : k.delta < 0 ? "text-green1" : "text-muted"}`}>
                  {k.delta > 0 ? "+" : ""}{k.delta} {k.trend === "rising" ? "▲" : k.trend === "falling" ? "▼" : "→"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Top row: gauge + spark + early warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gauge */}
        <div className="premium-card flex flex-col items-center py-6">
          <div className="text-xs uppercase tracking-wider text-text2 mb-4">Índice de Riesgo Global</div>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={gaugeColor(globalScore)}
                strokeWidth="12"
                strokeDasharray={`${globalScore * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: gaugeColor(globalScore) }}>{globalScore}</span>
              <span className="text-[10px] text-muted uppercase">riesgo</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`text-sm font-bold ${arrow.color}`}>{arrow.symbol}</span>
            <span className="text-xs text-text2 capitalize">
              {globalLevel} · {trendDelta > 0 ? `+${trendDelta}` : trendDelta}pts 30d
            </span>
          </div>

          {/* Early warnings */}
          {earlyWarnings.length > 0 && (
            <div className="mt-4 w-full space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-text2">Alertas tempranas</div>
              {earlyWarnings.slice(0, 6).map((ew: any) => (
                <div key={ew.indicator_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(ew.status)}`} />
                    <span className="text-text2 truncate">{ew.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="font-mono text-muted text-[10px]">{ew.value}</span>
                    <span className={`text-[9px] ${trendArrow(ew.trend).color}`}>
                      {trendArrow(ew.trend).symbol}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 30-day spark + timeline */}
        <section className="premium-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Evolución 30 días</h2>
            {spark.length > 0 && (
              <span className="ml-auto text-[10px] text-muted font-mono">
                mín {Math.min(...spark)} · máx {Math.max(...spark)}
              </span>
            )}
          </div>

          {spark.length > 0 ? (
            <div className="mb-4">
              <RiskSparkline data={spark} height={56} />
              <div className="flex justify-between text-[9px] text-muted mt-1">
                <span>−30d</span><span>hoy</span>
              </div>
            </div>
          ) : (
            <div className="h-14 flex items-center justify-center mb-4">
              <span className="text-xs text-muted">Sin historial disponible</span>
            </div>
          )}

          {/* Timeline events */}
          {(timeline as any[]).length > 0 && (
            <div className="border-t border-border1 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-cyan1" />
                <span className="text-[10px] uppercase tracking-wider text-text2">Eventos clave</span>
              </div>
              <TimelineChart data={timeline as any[]} height={72} />
              <div className="mt-3 space-y-1">
                {(timeline as any[]).filter(t => t.event).slice(0, 4).map((t: any, i: number) => {
                  const col = t.severity === "critical" ? "text-red1" : t.severity === "high" ? "text-amber1" : "text-blue1";
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-muted font-mono shrink-0">{t.date.slice(5)}</span>
                      <span className={`font-mono shrink-0 ${col}`}>{t.score}</span>
                      <span className="text-text2 truncate">{t.event}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dimensions heatmap */}
          <div className="border-t border-border1 pt-3 mt-3">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-2">Dimensiones de riesgo — contribución ponderada</div>
            <div className="space-y-2">
              {dimensions.slice(0, 8).map((d: any) => {
                const arr = trendArrow(d.trend);
                const weight = d.weight ?? 0;
                const contribution = ((weight / totalWeight) * d.score).toFixed(1);
                return (
                  <div key={d.domain} className="flex items-center gap-2">
                    <div className="w-24 shrink-0">
                      <div className="text-xs font-medium text-text1 truncate">{DOMAIN_LABELS[d.domain] ?? d.label}</div>
                      <div className="text-[9px] text-muted">{(weight * 100).toFixed(0)}% peso</div>
                    </div>
                    {/* weighted bar */}
                    <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${d.score}%`, backgroundColor: gaugeColor(d.score) }}
                      />
                    </div>
                    <div className="flex items-center gap-1 w-20 justify-end shrink-0">
                      <span className={`text-[10px] ${arr.color}`}>{arr.symbol}</span>
                      <span className={`text-sm font-bold tabular-nums ${dimColor(d.score)}`}>{d.score}</span>
                      <span className="text-[9px] text-muted">({contribution})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Signals + crisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top signals */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Señales activas</h2>
            <span className="ml-auto badge badge-cyan">{topSignals.length}</span>
          </div>
          {topSignals.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin señales activas.</p>
          ) : (
            <ul className="space-y-3">
              {topSignals.slice(0, 5).map((s: any) => (
                <li key={s.signal_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-text1 leading-snug">{s.title}</div>
                    <div className="shrink-0 text-right">
                      <div className={`text-xs font-mono font-bold ${s.severity === "critical" ? "text-red1" : s.severity === "high" ? "text-amber1" : "text-blue1"}`}>
                        {s.impact ?? "—"}↑
                      </div>
                      <div className="text-[9px] text-muted">{s.velocity}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-text2 line-clamp-2 mb-1">{s.description}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <span className="badge badge-blue">{DOMAIN_LABELS[s.domain] ?? s.domain}</span>
                    <span>P={s.probability}%</span>
                    <span className="ml-auto">{s.time_horizon}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Crisis signals */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Crisis potenciales</h2>
            <span className="ml-auto badge badge-red">{crisisSignals.length}</span>
          </div>
          {crisisSignals.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin escenarios de crisis.</p>
          ) : (
            <ul className="space-y-3">
              {crisisSignals.slice(0, 3).map((c: any) => (
                <li key={c.crisis_id} className="p-3 rounded-lg border border-red1/20 hover:border-red1/40 transition cursor-pointer group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-text1 group-hover:text-red1 transition">{c.title}</div>
                    <span className={`text-xs font-mono shrink-0 ${c.severity === "critical" ? "text-red1" : "text-amber1"}`}>
                      P={c.probability}%
                    </span>
                  </div>
                  <div className="text-[11px] text-text2 line-clamp-2 mb-2">{c.description}</div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(c.domains_affected ?? []).map((dom: string) => (
                      <span key={dom} className="badge badge-blue text-[9px]">{DOMAIN_LABELS[dom] ?? dom}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted">Impacto: {c.time_to_impact}</span>
                    {c.recommended_action && (
                      <span className="text-cyan1 truncate">→ {c.recommended_action}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {topSignals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber1" />
              <span className="text-xs text-text2">
                {topSignals.filter((s: any) => s.velocity === "fast").length} señales acelerando ·{" "}
                {topSignals.filter((s: any) => s.severity === "critical").length} críticas
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Scenarios */}
      {(scenarios as any[]).length > 0 && (
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Escenarios prospectivos</h2>
            <span className="ml-auto badge badge-cyan">{(scenarios as any[]).length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(scenarios as any[]).slice(0, 6).map((sc: any) => (
              <ScenarioCard key={sc.scenario_id} sc={sc} />
            ))}
          </div>
        </section>
      )}

      {/* Dimension detail cards */}
      {dimensions.length > 0 && (
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Análisis dimensional</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {dimensions.slice(0, 8).map((d: any) => {
              const arr = trendArrow(d.trend);
              return (
                <div key={d.domain} className="p-3 rounded-lg border border-border1 hover:border-cyan1/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text1 truncate">{DOMAIN_LABELS[d.domain] ?? d.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-xs ${arr.color}`}>{arr.symbol}</span>
                      <span className={`text-sm font-bold tabular-nums ${dimColor(d.score)}`}>{d.score}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg3 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: gaugeColor(d.score) }} />
                  </div>
                  {/* evidence */}
                  {(d.evidence ?? []).slice(0, 1).map((ev: any, ei: number) => (
                    <div key={ei} className="text-[9px] text-muted italic truncate mb-1">
                      "{ev.excerpt}" — {ev.source}
                    </div>
                  ))}
                  {(d.drivers ?? []).slice(0, 2).map((dr: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[10px] text-text2">
                      <span className="truncate flex-1">{dr.label}</span>
                      <span className={`font-mono shrink-0 ml-1 ${dr.trend === "rising" ? "text-red1" : "text-muted"}`}>
                        {dr.contribution}%
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Drivers ranking */}
      {dimensions.length > 0 && (
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top drivers de riesgo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dimensions
              .flatMap((d: any) => (d.drivers ?? []).map((dr: any) => ({
                ...dr,
                domainLabel: DOMAIN_LABELS[d.domain] ?? d.label,
                domainColor: gaugeColor(d.score),
              })))
              .sort((a: any, b: any) => b.contribution - a.contribution)
              .slice(0, 10)
              .map((dr: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-text1 truncate">{dr.label}</span>
                      <span className="text-xs font-mono text-amber1 shrink-0 ml-2">{dr.contribution}%</span>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${dr.contribution}%`, backgroundColor: dr.domainColor }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-muted shrink-0 w-16 text-right truncate">{dr.domainLabel}</span>
                </div>
              ))
            }
          </div>
        </section>
      )}
    </div>
  );
}
