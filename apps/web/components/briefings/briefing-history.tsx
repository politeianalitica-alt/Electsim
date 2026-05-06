"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { BriefingListItem } from "@/lib/types/briefings";

const TYPE_LABELS: Record<string, string> = {
  morning: "Matinal", client: "Cliente", legislative: "Legislativo",
  crisis: "Crisis", media: "Medios", geopolitical: "Geopolitico", sectorial: "Sectorial",
};

interface Props {
  onSelect: (item: BriefingListItem) => void;
  selectedId: string | null;
}

const DEMO_ITEMS: BriefingListItem[] = [
  { id: "demo-1", briefing_type: "morning", title: "Briefing Matinal — Hoy", audience: "consultor_politico", workspace_id: "default", period: "today", summary_preview: "PP mantiene ventaja +5pp. Tensión legislativa por Ley de Vivienda. Narrativa 'crisis' en medios +340%.", generated_at: new Date(Date.now() - 3600000).toISOString(), mode: "demo" },
  { id: "demo-2", briefing_type: "legislative", title: "Análisis Legislativo — Ley de Vivienda", audience: "consultor_politico", workspace_id: "default", period: "week", summary_preview: "Proyecto de Ley de Vivienda en fase crítica. Junts condiciona apoyo. Votación prevista 12 de mayo.", generated_at: new Date(Date.now() - 86400000).toISOString(), mode: "demo" },
  { id: "demo-3", briefing_type: "geopolitical", title: "Inteligencia Geopolítica — Marruecos", audience: "unidad_inteligencia", workspace_id: "default", period: "week", summary_preview: "Crisis diplomática Marruecos-España. Presiones migratorias en Ceuta. Impacto en relaciones bilaterales.", generated_at: new Date(Date.now() - 172800000).toISOString(), mode: "demo" },
  { id: "demo-4", briefing_type: "media", title: "Monitor de Narrativas — Medios", audience: "consultor_politico", workspace_id: "default", period: "today", summary_preview: "Análisis de narrativas: 7 marcos activos. Cobertura negativa del gobierno en medios de derecha.", generated_at: new Date(Date.now() - 259200000).toISOString(), mode: "demo" },
];

export function BriefingHistory({ onSelect, selectedId }: Props) {
  const q = useQuery({
    queryKey: ["briefings-list-v2"],
    queryFn: () => endpoints.briefingsListV2({ limit: 20 }).catch(() => ({ items: [], total: 0 })),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = (q.data?.items && q.data.items.length > 0) ? q.data.items : DEMO_ITEMS;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Historial</h3>
      {q.isLoading && <p className="text-xs text-zinc-600">Cargando...</p>}
      {!q.isLoading && items.length === 0 && (
        <p className="text-xs text-zinc-600">Sin briefings guardados. Genera el primero.</p>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className={`w-full text-left rounded-lg border p-3 transition-colors ${
            selectedId === item.id
              ? "border-blue-500/50 bg-blue-500/10"
              : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] text-zinc-500">{TYPE_LABELS[item.briefing_type] ?? item.briefing_type}</span>
            <ModeBadge mode={item.mode} />
          </div>
          <p className="text-xs text-zinc-300 leading-snug line-clamp-2">{item.summary_preview}</p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {new Date(item.generated_at).toLocaleString("es-ES", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </button>
      ))}
    </div>
  );
}
