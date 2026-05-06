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

export function BriefingHistory({ onSelect, selectedId }: Props) {
  const q = useQuery({
    queryKey: ["briefings-list-v2"],
    queryFn: () => endpoints.briefingsListV2({ limit: 20 }),
    refetchInterval: 30_000,
  });

  const items = q.data?.items ?? [];

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
