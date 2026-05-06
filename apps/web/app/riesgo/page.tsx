"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type { RiskOverviewResponse, RiskScenario, RiskTimelinePoint } from "@/lib/types/risk_rich";
import {
  RiskKpiBar,
  RiskGauge,
  RiskSparkline,
  RiskDimensionGrid,
  RiskSignalList,
  RiskCrisisAlert,
  RiskEarlyWarning,
  RiskScenarioCard,
  RiskTimeline,
  RiskHeatmap,
  RiskBrainAnalysis,
} from "@/components/risk";

type TabId = "monitor" | "señales" | "escenarios" | "timeline" | "brain";

const TABS: { id: TabId; label: string }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "señales", label: "Señales" },
  { id: "escenarios", label: "Escenarios" },
  { id: "timeline", label: "Timeline" },
  { id: "brain", label: "Brain" },
];

const FALLBACK_KPIS = [
  { label: "Score global", value: 67, color: "amber", delta: 3, trend: "rising" as const },
  { label: "Crisis activas", value: 3, color: "red", delta: 1, trend: "rising" as const },
  { label: "Señales críticas", value: 8, color: "red", delta: 2, trend: "rising" as const },
  { label: "Indicadores en verde", value: 4, color: "green", delta: -1, trend: "falling" as const },
];

const FALLBACK_SPARK = [52,55,51,58,60,57,63,61,66,64,62,67,65,68,70,67,72,69,74,71,73,75,72,76,74,71,68,72,74,67];

export default function RiesgoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("monitor");

  const { data, isLoading, isError } = useQuery<RiskOverviewResponse>({
    queryKey: ["risk", "overview-v2"],
    queryFn: () => endpoints.riskOverviewV2(),
    staleTime: 3 * 60_000,
    retry: 1,
  });

  const { data: scenariosData } = useQuery<{ scenarios: RiskScenario[]; mode: string }>({
    queryKey: ["risk", "scenarios"],
    queryFn: () => endpoints.riskScenarios() as Promise<{ scenarios: RiskScenario[]; mode: string }>,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const { data: timelineData } = useQuery<{ timeline: RiskTimelinePoint[]; mode: string }>({
    queryKey: ["risk", "timeline"],
    queryFn: () => endpoints.riskTimeline() as Promise<{ timeline: RiskTimelinePoint[]; mode: string }>,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const mode = data?.mode ?? (isError ? "error" : "fallback");
  const globalScore = data?.global_score ?? 67;
  const level = data?.level ?? "high";
  const trendDelta = data?.trend_delta ?? 3;
  const kpis = data?.kpis ?? FALLBACK_KPIS;
  const dimensions = data?.dimensions ?? [];
  const crisisSignals = data?.crisis_signals ?? [];
  const topSignals = data?.top_signals ?? [];
  const earlyWarnings = data?.early_warnings ?? [];
  const spark = data?.spark ?? FALLBACK_SPARK;
  const scenarios = scenariosData?.scenarios ?? [];
  const timelinePoints = timelineData?.timeline ?? [];

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Riesgo & Crisis</span>
        <div className="flex items-center gap-3 mt-1">
          <Shield className="w-6 h-6 text-cyan1" />
          <h1 className="text-3xl font-bold text-text1">Riesgo & Crisis Intelligence</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "signal_politeia" : "fixtures"}
            message={mode === "real" ? "Datos en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Centro de inteligencia de riesgos: señales, crisis, escenarios y alertas tempranas.
        </p>
      </header>

      <RiskKpiBar kpis={kpis} isLoading={isLoading} />

      {crisisSignals.length > 0 && <RiskCrisisAlert signals={crisisSignals} />}

      <nav className="flex gap-1 border-b border-border1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg ${
              activeTab === t.id
                ? "text-cyan1 border-b-2 border-cyan1 bg-bg3/50"
                : "text-text2 hover:text-text1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === "monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Gauge + sparkline + early warnings */}
          <div className="space-y-6">
            <section className="premium-card flex flex-col items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 self-start">Score Global</h2>
              <RiskGauge score={globalScore} level={level} trendDelta={trendDelta} />
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Últimos 30 días</span>
                  <span className="font-mono">{spark[spark.length - 1]}</span>
                </div>
                <RiskSparkline spark={spark} />
              </div>
            </section>

            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">Alertas tempranas</h2>
              <RiskEarlyWarning indicators={earlyWarnings} />
            </section>
          </div>

          {/* Middle: Dimensions */}
          <div className="space-y-4">
            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Dimensiones de riesgo</h2>
              <RiskDimensionGrid dimensions={dimensions} />
            </section>
          </div>

          {/* Right: Top signals */}
          <div>
            <section className="premium-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber1" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Señales principales</h2>
              </div>
              <RiskSignalList signals={topSignals.slice(0, 4)} />
            </section>
          </div>
        </div>
      )}

      {activeTab === "señales" && (
        <div className="space-y-4">
          <section className="premium-card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber1" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Todas las señales</h2>
            </div>
            <RiskSignalList signals={topSignals} />
          </section>
          <section className="premium-card">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Mapa de calor</h2>
            <RiskHeatmap cells={dimensions.map(d => ({ domain: d.domain, label: d.label, score: d.score, severity: d.severity, trend: d.trend }))} />
          </section>
        </div>
      )}

      {activeTab === "escenarios" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scenarios.map(s => (
              <RiskScenarioCard key={s.scenario_id} scenario={s} />
            ))}
            {!scenarios.length && (
              <div className="col-span-3 text-center py-8 text-text2 text-sm">Sin escenarios disponibles.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <section className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Evolución del riesgo</h2>
          <RiskTimeline points={timelinePoints} />
        </section>
      )}

      {activeTab === "brain" && (
        <section className="premium-card">
          <RiskBrainAnalysis globalScore={globalScore} />
        </section>
      )}
    </div>
  );
}
