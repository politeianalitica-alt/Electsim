"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Activity, AlertTriangle, TrendingUp, Shield, RefreshCw } from "lucide-react";

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
  if (trend === "rising") return { symbol: "▲", color: "text-red1" };
  if (trend === "falling") return { symbol: "▼", color: "text-green1" };
  return { symbol: "→", color: "text-text2" };
}

function statusDot(status: string) {
  if (status === "red") return "bg-red1";
  if (status === "yellow") return "bg-amber1";
  return "bg-green1";
}

export default function RiesgoPage() {
  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["risk", "overview"],
    queryFn: () => endpoints.riskOverviewV2().catch(() => null),
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const globalScore: number = (overview as any)?.global_score ?? 0;
  const globalLevel: string = (overview as any)?.level ?? "unknown";
  const globalTrend: string = (overview as any)?.trend ?? "stable";
  const kpis: any[] = (overview as any)?.kpis ?? [];
  const dimensions: any[] = (overview as any)?.dimensions ?? [];
  const topSignals: any[] = (overview as any)?.top_signals ?? [];
  const crisisSignals: any[] = (overview as any)?.crisis_signals ?? [];
  const earlyWarnings: any[] = (overview as any)?.early_warnings ?? [];

  const arrow = trendArrow(globalTrend);

  // Build heatmap from dimensions
  const domainLabelMap: Record<string, string> = {
    legislative: "Legislativo", media: "Mediático", coalition: "Coalición",
    actors: "Actores", economic: "Económico", geopolitical: "Geopolítico",
    territorial: "Territorial", system: "Sistémico",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia / Monitor de Riesgo</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Monitor de Riesgo</h1>
          <p className="text-text2 text-sm mt-1">Señales activas, heat map por dimensión y análisis de crisis.</p>
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
              <div className="text-2xl font-bold" style={{ color: k.color === "red" ? "#EF4444" : k.color === "green" ? "#10B981" : k.color === "amber" ? "#F59E0B" : "#00D4FF" }}>
                {k.value}
              </div>
              {k.delta !== undefined && (
                <div className={`text-xs mt-1 ${k.delta > 0 ? "text-red1" : k.delta < 0 ? "text-green1" : "text-muted"}`}>
                  {k.delta > 0 ? "+" : ""}{k.delta} {k.trend}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge global */}
        <div className="premium-card flex flex-col items-center justify-center py-6">
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
            <span className="text-xs text-text2 capitalize">{globalLevel} · {globalTrend}</span>
          </div>

          {/* Alertas tempranas */}
          {earlyWarnings.length > 0 && (
            <div className="mt-4 w-full space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-text2">Alertas tempranas</div>
              {earlyWarnings.slice(0, 4).map((ew: any) => (
                <div key={ew.indicator_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(ew.status)}`} />
                    <span className="text-text2 truncate">{ew.label}</span>
                  </div>
                  <span className="font-mono text-muted shrink-0 ml-2">{ew.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dimensions heat map */}
        <section className="premium-card lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Dimensiones de Riesgo</h2>
          <div className="space-y-3">
            {dimensions.slice(0, 8).map((d: any) => {
              const arr = trendArrow(d.trend);
              return (
                <div key={d.domain} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <div className="text-xs font-medium text-text1 truncate">{domainLabelMap[d.domain] ?? d.label}</div>
                    <div className={`text-[10px] ${dimColor(d.score)}`}>{d.severity}</div>
                  </div>
                  <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.score}%`, backgroundColor: gaugeColor(d.score) }}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-16 justify-end shrink-0">
                    <span className={`text-xs ${arr.color}`}>{arr.symbol}</span>
                    <span className={`text-sm font-bold tabular-nums ${dimColor(d.score)}`}>{d.score}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top drivers */}
          {dimensions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border1">
              <div className="text-[10px] uppercase tracking-wider text-text2 mb-2">Principales drivers</div>
              <div className="space-y-1.5">
                {dimensions
                  .flatMap((d: any) => (d.drivers ?? []).map((dr: any) => ({ ...dr, domain: d.label })))
                  .sort((a: any, b: any) => b.contribution - a.contribution)
                  .slice(0, 5)
                  .map((dr: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-text2 truncate flex-1">{dr.label}</span>
                      <span className="text-muted shrink-0">{dr.domain}</span>
                      <span className="font-mono text-amber1 shrink-0">{dr.contribution}%</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top signals */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Señales activas</h2>
            <span className="ml-auto badge badge-cyan">{topSignals.length}</span>
          </div>
          {topSignals.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin señales activas en el sistema.</p>
          ) : (
            <ul className="space-y-3">
              {topSignals.slice(0, 5).map((s: any) => (
                <li key={s.signal_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-text1 leading-snug">{s.title}</div>
                    <span className={`shrink-0 text-xs font-mono ${s.severity === "critical" ? "text-red1" : s.severity === "high" ? "text-amber1" : "text-blue1"}`}>
                      {s.impact ?? "—"}↑
                    </span>
                  </div>
                  <div className="text-[11px] text-text2 line-clamp-2 mb-1">{s.description}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <span className="badge badge-blue">{domainLabelMap[s.domain] ?? s.domain}</span>
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
            <p className="text-sm text-muted text-center py-8">Sin escenarios de crisis identificados.</p>
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
                      <span key={dom} className="badge badge-blue text-[9px]">{domainLabelMap[dom] ?? dom}</span>
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
                    <span className="text-xs font-bold text-text1 truncate">{domainLabelMap[d.domain] ?? d.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-xs ${arr.color}`}>{arr.symbol}</span>
                      <span className={`text-sm font-bold tabular-nums ${dimColor(d.score)}`}>{d.score}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg3 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: gaugeColor(d.score) }} />
                  </div>
                  {(d.drivers ?? []).slice(0, 2).map((dr: any, i: number) => (
                    <div key={i} className="text-[10px] text-text2 truncate">{dr.label}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
