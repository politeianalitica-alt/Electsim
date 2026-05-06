"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Camera, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import {
  DEMO_DIMENSIONS,
  DEMO_SEVERITIES,
  DEMO_HEATMAP,
} from "@/lib/fixtures/risk";
import type { DataMode } from "@/lib/types/status";
import type { RiskKpiItem, RiskSignalItem } from "@/lib/types/risk_api";

function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 60) return "#F59E0B";
  if (v >= 40) return "#3B82F6";
  return "#10B981";
}

function kpiColorClass(color: string) {
  if (color === "red") return "text-red1";
  if (color === "amber") return "text-amber1";
  if (color === "blue") return "text-blue1";
  return "text-green1";
}

function cellColor(val: number, sev: string) {
  const intensity = Math.min(val / 12, 1);
  const base = sev === "Alta" ? "239, 68, 68" : sev === "Media" ? "245, 158, 11" : "59, 130, 246";
  return `rgba(${base}, ${0.15 + intensity * 0.55})`;
}

export default function RiesgoPage() {
  const { data: riskData } = useQuery({
    queryKey: ["risk", "overview"],
    queryFn: () => endpoints.riskOverview(),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const globalScore = riskData?.global_score ?? 67;
  const kpis: RiskKpiItem[] = riskData?.kpis ?? [
    { label: "Riesgo político", value: 72, color: "red" },
    { label: "Riesgo legislativo", value: 58, color: "amber" },
    { label: "Riesgo mediático", value: 61, color: "amber" },
    { label: "Estabilidad coalición", value: 44, color: "blue" },
  ];
  const signals: RiskSignalItem[] = riskData?.signals ?? [];
  const spark: number[] = riskData?.spark ?? [52, 55, 51, 58, 60, 57, 63, 61, 66, 64, 62, 67, 65, 68, 70, 67, 72, 69, 74, 71, 73, 75, 72, 76, 74, 71, 68, 72, 74, 71];
  const trendDelta = riskData?.trend_delta ?? 5;
  const mode: DataMode = riskData?.mode ?? "fallback";

  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const points = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * 300;
    const y = 60 - ((v - min) / (max - min)) * 50;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Termómetro de Riesgo</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Termómetro de Riesgo</h1>
          <ModeBadge mode={mode} source="api/risk/overview" />
        </div>
        <p className="text-text2 text-sm mt-1">Estado consolidado del riesgo en todas las dimensiones operativas.</p>
      </header>

      {/* Hero gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="premium-card lg:col-span-1 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Riesgo global</div>
          <div className="relative w-48 h-24">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="#1E293B" strokeWidth="14" fill="none" strokeLinecap="round" />
              <path
                d="M 10 100 A 90 90 0 0 1 190 100"
                stroke={gaugeColor(globalScore)}
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(globalScore / 100) * 282} 282`}
              />
            </svg>
          </div>
          <div className="text-5xl font-bold mt-2" style={{ color: gaugeColor(globalScore) }}>{globalScore}</div>
          <div className="text-xs text-text2 mt-1">
            Nivel: <span className="font-semibold" style={{ color: gaugeColor(globalScore) }}>
              {riskData?.level ?? "Elevado"}
            </span>
          </div>
          <button className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-cyan1/40 text-cyan1 hover:bg-cyan1/10 transition">
            <Camera className="w-3.5 h-3.5" />
            Capturar snapshot
          </button>
        </section>

        <section className="lg:col-span-2 grid grid-cols-2 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
              <div className={`text-2xl font-bold ${kpiColorClass(k.color)}`}>{k.value}</div>
              <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${k.value}%`, backgroundColor: gaugeColor(k.value) }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Heatmap — kept as fixture; no real-time API yet */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Matriz dimensión × severidad</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted font-normal"></th>
                {DEMO_SEVERITIES.map(s => (
                  <th key={s} className="text-center p-2 text-muted font-normal uppercase tracking-wider">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_DIMENSIONS.map(d => (
                <tr key={d}>
                  <td className="p-2 text-text1 font-medium">{d}</td>
                  {DEMO_SEVERITIES.map(s => {
                    const val = DEMO_HEATMAP[d][s as keyof typeof DEMO_HEATMAP[typeof d]];
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
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top signals */}
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top señales de riesgo</h2>
          </div>
          {signals.length === 0 ? (
            <div className="text-sm text-text2 text-center py-8">Cargando señales…</div>
          ) : (
            <ul className="space-y-3">
              {signals.map((s, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">{s.title}</h3>
                    <span className={`badge ${s.impact === "Alto" ? "badge-red" : "badge-amber"} shrink-0`}>{s.impact}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] text-muted mb-0.5">
                        <span>Probabilidad</span><span className="text-cyan1 font-mono">{s.probability}%</span>
                      </div>
                      <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber1 to-red1" style={{ width: `${s.probability}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-text2 mb-2">{s.description}</p>
                  <span className="text-xs text-cyan1 inline-flex items-center gap-1">
                    Investigar <ChevronRight className="w-3 h-3" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Time series */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Evolución 30 días</h2>
          </div>
          <svg viewBox="0 0 300 80" className="w-full h-32">
            <defs>
              <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={`0,80 ${points} 300,80`} fill="url(#riskFill)" />
            <polyline points={points} fill="none" stroke="#F59E0B" strokeWidth="1.5" />
          </svg>
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>Mín {min}</span>
            <span>Máx {max}</span>
          </div>
          <div className="mt-4 pt-4 border-t border-border1">
            <div className="flex items-center gap-2 text-xs text-text2">
              {trendDelta >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-amber1" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-green1" />
              )}
              <span>
                Tendencia:{" "}
                <span className={trendDelta >= 0 ? "text-amber1" : "text-green1"}>
                  {trendDelta >= 0 ? "+" : ""}{trendDelta}pts
                </span>{" "}
                vs hace 7 días
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
