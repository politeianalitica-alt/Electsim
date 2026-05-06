"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import { BriefingGeneratePanel } from "@/components/briefings/briefing-generate-panel";
import { BriefingViewer } from "@/components/briefings/briefing-viewer";
import { BriefingHistory } from "@/components/briefings/briefing-history";
import { ExportPanel } from "@/components/briefings/export-panel";
import type { BriefingDocument, BriefingListItem, BriefingRequest } from "@/lib/types/briefings";
import type { DataMode } from "@/lib/types/status";

export default function BriefingsPage() {
  const qc = useQueryClient();
  const [currentBriefing, setCurrentBriefing] = useState<BriefingDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Morning briefing (legacy endpoint — keeps backward compat)
  const morningQ = useQuery({
    queryKey: ["morning-briefing"],
    queryFn: () => endpoints.morningBriefing("default"),
    staleTime: 5 * 60_000,
  });

  // Generate briefing mutation
  const generateMutation = useMutation({
    mutationFn: (req: BriefingRequest) => endpoints.briefingGenerate(req),
    onSuccess: (doc) => {
      setCurrentBriefing(doc);
      setSelectedId(doc.id);
      qc.invalidateQueries({ queryKey: ["briefings-list-v2"] });
    },
  });

  // Load a briefing from history
  const detailMutation = useMutation({
    mutationFn: (id: string) => endpoints.briefingDetail(id),
    onSuccess: (doc) => {
      setCurrentBriefing(doc);
    },
  });

  const handleHistorySelect = (item: BriefingListItem) => {
    setSelectedId(item.id);
    detailMutation.mutate(item.id);
  };

  const mode = (currentBriefing?.mode ?? morningQ.data?.mode ?? "fallback") as DataMode;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Briefings de Inteligencia</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generacion, lectura, archivo y exportacion de briefings ejecutivos con señales trazables.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ModeBadge mode={mode} />
          <a href="/analisis" className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-1">
            Analysis Hub
          </a>
          <a href="/fuentes" className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-1">
            Fuentes
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar — history + generate */}
        <div className="lg:col-span-1 space-y-4">
          <BriefingGeneratePanel
            onGenerate={(req) => generateMutation.mutate(req)}
            isLoading={generateMutation.isPending}
          />

          {generateMutation.isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
              Error al generar briefing. Comprueba que el backend esta activo.
            </div>
          )}

          <BriefingHistory
            onSelect={handleHistorySelect}
            selectedId={selectedId}
          />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Export bar */}
          {currentBriefing && (
            <ExportPanel briefingId={currentBriefing.id} briefingTitle={currentBriefing.title} />
          )}

          {/* Loading states */}
          {(generateMutation.isPending || detailMutation.isPending) && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-zinc-500 text-sm">
                {generateMutation.isPending ? "Generando briefing con IA..." : "Cargando briefing..."}
              </p>
              <p className="text-zinc-700 text-xs mt-2">
                {generateMutation.isPending ? "Esto puede tardar 10-30 segundos." : ""}
              </p>
            </div>
          )}

          {/* Generated briefing */}
          {currentBriefing && !generateMutation.isPending && !detailMutation.isPending && (
            <BriefingViewer briefing={currentBriefing} />
          )}

          {/* Empty state — show morning briefing teaser */}
          {!currentBriefing && !generateMutation.isPending && !detailMutation.isPending && (
            <div className="space-y-4">
              {/* Morning briefing quick view (legacy) */}
              {morningQ.isLoading && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center text-zinc-600 text-sm">
                  Cargando briefing matinal...
                </div>
              )}
              {morningQ.data && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">Ultimo briefing matinal</h2>
                    <ModeBadge mode={(morningQ.data.mode as DataMode) ?? "fallback"} />
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {morningQ.data.executive_summary}
                  </p>
                  {(morningQ.data.key_alerts ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Alertas clave</p>
                      <ul className="space-y-1.5">
                        {(morningQ.data.key_alerts ?? []).slice(0, 3).map((a, i) => (
                          <li key={i} className="text-xs text-zinc-400 flex gap-2">
                            <span className="text-amber-400 flex-shrink-0">[{a.level ?? "info"}]</span>
                            <span>{a.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600">
                    Usa el panel izquierdo para generar un briefing completo con Analysis Hub + IA.
                  </p>
                </div>
              )}
              {morningQ.isError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
                  Backend no disponible. Arranca el servidor con:{" "}
                  <code className="font-mono text-xs">uvicorn api.main:app --reload --port 8000</code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
