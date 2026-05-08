"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

function urgencyClass(u: number): string {
  if (u >= 4) return "text-red1 bg-red1/10 border-red1/30";
  if (u === 3) return "text-amber1 bg-amber1/10 border-amber1/30";
  return "text-cyan1 bg-cyan1/10 border-cyan1/30";
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "ahora";
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

/**
 * Panel de señales en tiempo real desde /intelligence/signals.
 * Diseñado para ir en sidebars (300px ancho).
 * Refresca cada 3 minutos automáticamente.
 */
export function SignalsPanel() {
  const { data: signals = [], isFetching, isLoading } = useQuery({
    queryKey: ["intel-signals-panel"],
    queryFn: () => endpoints.intelligence.signals(2, 240, 8),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });

  return (
    <div className="premium-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan1" />
          Señales activas
        </h3>
        {isFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted" />}
      </div>
      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-16 rounded-lg animate-pulse bg-bg3/30" />
          ))}
        </ul>
      ) : signals.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Sin señales activas</p>
      ) : (
        <ul className="space-y-2">
          {signals.map((s) => (
            <li
              key={s.id}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:opacity-90 transition ${urgencyClass(s.urgencia)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono uppercase tracking-wider text-[9px]">{s.tipo}</span>
                <span className="font-mono text-[9px] opacity-70">{timeAgo(s.created_at)}</span>
              </div>
              <div className="font-semibold leading-snug">{s.titulo}</div>
              {s.resumen && (
                <div className="mt-1 opacity-80 line-clamp-2 text-[11px]">{s.resumen}</div>
              )}
              {s.modulo_origen && (
                <div className="mt-1.5 text-[9px] opacity-60 uppercase tracking-wider">{s.modulo_origen}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
