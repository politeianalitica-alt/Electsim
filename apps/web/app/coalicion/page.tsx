"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, BarChart2 } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ElectoralOverviewResponse,
  SwingSimInput,
  SwingSimResult,
  HemicycleSeat,
} from "@/lib/types/electoral";
import {
  ElectoralKpiBar,
  ElectoralHemicycle,
  CoalitionList,
  KingmakerPanel,
  VotingMatrix,
  SwingSimulator,
  ElectoralBrainAnalysis,
  ElectoralPartyBar,
} from "@/components/electoral";

type TabId = "hemiciclo" | "coaliciones" | "kingmakers" | "votaciones" | "simulador";

const TABS: { id: TabId; label: string }[] = [
  { id: "hemiciclo",   label: "Hemiciclo" },
  { id: "coaliciones", label: "Coaliciones" },
  { id: "kingmakers",  label: "Kingmakers" },
  { id: "votaciones",  label: "Votaciones" },
  { id: "simulador",   label: "Simulador & Brain" },
];

const FALLBACK_KPIS = [
  { label: "Escaños PP (líder)", value: 137, unit: "diputados", color: "text-blue1", trend: "+9" },
  { label: "Prob. estabilidad gobierno", value: 41, unit: "%", color: "text-amber1", trend: "-4" },
  { label: "Distancia mayoría", value: 9, unit: "escaños", color: "text-red1", trend: "-2" },
  { label: "Kingmakers activos", value: 3, unit: "partidos", color: "text-cyan1", trend: "stable" },
];

const VOTE_PARTIES = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "Bildu", "PNV"];

export default function CoalicionPage() {
  const [activeTab, setActiveTab] = useState<TabId>("hemiciclo");
  const [swingResult, setSwingResult] = useState<SwingSimResult | null>(null);

  const { data: overview, isLoading, isError } = useQuery<ElectoralOverviewResponse>({
    queryKey: ["electoralOverview"],
    queryFn: () => endpoints.electoralOverview(),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const mode = overview?.mode ?? (isError ? "error" : "demo");
  const parties = overview?.parties ?? [];
  const coalitions = overview?.coalitions ?? [];
  const kingmakers = overview?.kingmakers ?? [];
  const votingRecords = overview?.voting_records ?? [];
  const kpis = overview?.kpis ?? FALLBACK_KPIS;
  const totalSeats = overview?.total_seats ?? 350;
  const majority = overview?.majority_threshold ?? 176;

  // Hemicycle seats — fetched separately (expensive to compute server-side)
  const { data: hemicycleData } = useQuery<{ seats: unknown[]; total_seats: number; mode: string }>({
    queryKey: ["electoralHemicycle"],
    queryFn: () => endpoints.electoralHemicycle(),
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const hemicycleSeats = (hemicycleData?.seats ?? []) as HemicycleSeat[];

  // Swing simulator callback
  const handleSimulate = useCallback(async (swings: SwingSimInput[]): Promise<SwingSimResult> => {
    const result = await endpoints.electoralSimulate({
      swings,
      base_parties: parties.length > 0 ? parties : null,
    });
    setSwingResult(result);
    return result;
  }, [parties]);

  // suppress unused warning — swingResult is consumed by SwingSimulator internally
  void swingResult;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Electoral &amp; Coaliciones</span>
        <div className="flex items-center gap-3 mt-1">
          <Crown className="w-6 h-6 text-amber1" />
          <h1 className="text-3xl font-bold text-text1">Electoral &amp; Coaliciones</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "resultados_electorales" : "fixtures"}
            message={mode === "real" ? "Datos electorales reales" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Proyección de escaños, escenarios de coalición, kingmakers, patrones de voto y simulador.
        </p>
      </header>

      <ElectoralKpiBar kpis={kpis} isLoading={isLoading} />

      {parties.length > 0 && (
        <ElectoralPartyBar parties={parties} majority={majority} />
      )}

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

      {/* Tab: Hemiciclo */}
      {activeTab === "hemiciclo" && (
        <div className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              Composición del Congreso ({totalSeats} escaños · Mayoría: {majority})
            </h2>
          </div>
          {isLoading ? (
            <div className="text-center text-text2 py-8 text-sm">Cargando hemiciclo...</div>
          ) : (
            <ElectoralHemicycle
              seats={hemicycleSeats}
              parties={parties}
              totalSeats={totalSeats}
              majority={majority}
            />
          )}
        </div>
      )}

      {/* Tab: Coaliciones */}
      {activeTab === "coaliciones" && (
        <CoalitionList coalitions={coalitions} parties={parties} isLoading={isLoading} />
      )}

      {/* Tab: Kingmakers */}
      {activeTab === "kingmakers" && (
        <div className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Partidos pivotales</h2>
          </div>
          <KingmakerPanel kingmakers={kingmakers} parties={parties} />
        </div>
      )}

      {/* Tab: Votaciones */}
      {activeTab === "votaciones" && (
        <div className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
            Patrón de voto — últimas votaciones
          </h2>
          <VotingMatrix records={votingRecords} parties={VOTE_PARTIES} />
        </div>
      )}

      {/* Tab: Simulador & Brain */}
      {activeTab === "simulador" && (
        <div className="space-y-6">
          <div className="premium-card">
            <SwingSimulator
              parties={parties.length > 0 ? parties : []}
              onSimulate={handleSimulate}
            />
          </div>
          <ElectoralBrainAnalysis globalMode={mode} />
        </div>
      )}
    </div>
  );
}
