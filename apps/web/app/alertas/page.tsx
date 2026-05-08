"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Filter, Check, ArrowUpRight, RefreshCw } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type { AlertItem } from "@/lib/api/endpoints";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";

const FILTERS = ["Todas", "Críticas", "Altas", "Medias", "Bajas", "Sin leer"];

function levelClasses(level: string) {
  if (level === "critical") return { bar: "bg-red1", text: "text-red1", badge: "badge-red", label: "CRÍTICA" };
  if (level === "high") return { bar: "bg-red1/70", text: "text-red1", badge: "badge-red", label: "ALTA" };
  if (level === "medium") return { bar: "bg-amber1", text: "text-amber1", badge: "badge-amber", label: "MEDIA" };
  return { bar: "bg-blue1", text: "text-blue1", badge: "badge-blue", label: "BAJA" };
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)} h`;
  return `hace ${Math.floor(ms / 86_400_000)} d`;
}

export default function AlertasPage() {
  const [filter, setFilter] = useState("Todas");

  const qc = useQueryClient();
  const { data: alerts = [], isLoading, isFetching } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => endpoints.alertsList(false),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const filtered: AlertItem[] = alerts.filter(a => {
    if (filter === "Todas") return true;
    if (filter === "Sin leer") return !a.read;
    if (filter === "Críticas") return a.level === "critical";
    if (filter === "Altas") return a.level === "high";
    if (filter === "Medias") return a.level === "medium";
    if (filter === "Bajas") return a.level === "low";
    return true;
  });

  const unread = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Bandeja operativa</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Alertas</h1>
          <p className="text-text2 text-sm mt-1">
            {isLoading ? "Cargando…" : <>{unread} sin leer · {alerts.length} totales · priorizadas por riesgo</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["alerts"] })}
            className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Marcar todas leídas
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted shrink-0" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
              filter === f ? "bg-cyan1 text-bg font-semibold" : "bg-bg3 text-text2 hover:text-text1 border border-border1"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 2-column layout: alerts list + signals sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

      {/* Alert list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <article key={i} className="premium-card animate-pulse h-32 bg-bg3/30" />
          ))
        ) : filtered.length === 0 ? (
          <div className="premium-card text-center py-12 text-muted text-sm">
            <AlertTriangle className="w-8 h-8 text-muted mx-auto mb-3" />
            <p>Sin alertas {filter !== "Todas" ? `con filtro "${filter}"` : "activas"}.</p>
          </div>
        ) : filtered.map(a => {
          const cls = levelClasses(a.level);
          return (
            <article key={a.id} className={`premium-card cursor-pointer hover:border-cyan1/30 ${a.read ? "opacity-70" : ""}`}>
              <div className="flex gap-4">
                <span className={`w-1 self-stretch rounded-full ${cls.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`badge ${cls.badge}`}>{cls.label}</span>
                    {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-pulse" />}
                    <span className="text-[10px] text-muted ml-auto">{timeAgo(a.created_at)}</span>
                  </div>
                  <h3 className="text-base font-bold text-text1 mb-1">{a.title}</h3>
                  {a.body && <p className="text-sm text-text2 leading-relaxed">{a.body}</p>}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted">Fuente: {a.source}</span>
                    <div className="flex gap-3">
                      <button className="text-cyan1 hover:underline">Investigar</button>
                      <button className="text-cyan1 hover:underline">Añadir a workspace</button>
                      <button className="text-cyan1 hover:underline flex items-center gap-1">Detalle <ArrowUpRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Signals sidebar */}
      <aside className="space-y-4">
        <SignalsPanel/>
      </aside>

      </div>{/* end grid */}
    </div>
  );
}
