"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Filter, Check, ArrowUpRight, RefreshCw, Bell } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

const FILTERS = ["Todas", "Críticas", "Altas", "Medias", "Bajas", "Sin leer"];

const DEMO_ALERTS = [
  { id: "1", title: "CRÍTICO: Recurso amnistía admitido por TC", body: "El TC admite a trámite el recurso contra la Ley de Amnistía. Implicaciones en la estabilidad de la coalición de gobierno.", level: "critical", source: "Monitor judicial", created_at: new Date(Date.now() - 1800000).toISOString(), read: false, category: "legal" },
  { id: "2", title: "Bloqueo Junts en Comisión de Justicia", body: "Junts vota en contra en 3 votaciones consecutivas. Riesgo de obstrucción en Ley de Vivienda.", level: "high", source: "Monitor legislativo", created_at: new Date(Date.now() - 3600000).toISOString(), read: false, category: "legislativo" },
  { id: "3", title: "Narrativa 'crisis de gobierno' pico mediático +340%", body: "Portadas convergentes en ABC, El Mundo y La Razón. Amplificación coordinada detectada en X.", level: "high", source: "Narrative Engine", created_at: new Date(Date.now() - 7200000).toISOString(), read: false, category: "media" },
  { id: "4", title: "PP consolida ventaja: brecha +5.8pp", body: "Tres sondeos consecutivos: PP 33.2% (+1.8pp), PSOE 27.4% (-0.6pp). Mayoría PP+VOX: 178 escaños.", level: "medium", source: "Motor nowcasting v2.3", created_at: new Date(Date.now() - 10800000).toISOString(), read: false, category: "electoral" },
  { id: "5", title: "Tensión diplomática España-Marruecos activa", body: "Exteriores convoca al embajador marroquí. Presiones migratorias elevadas.", level: "high", source: "Módulo Geopolítica", created_at: new Date(Date.now() - 14400000).toISOString(), read: false, category: "geopolitico" },
  { id: "6", title: "IPC abril 3.8% — supera expectativas", body: "El IPC supera el consenso (3.4%). BdE podría revisar proyecciones de inflación para 2026.", level: "medium", source: "Macro pipeline", created_at: new Date(Date.now() - 21600000).toISOString(), read: true, category: "economico" },
  { id: "7", title: "Pedro Sánchez: score influencia en mínimo (41/100)", body: "Caída de 9 puntos en 30 días. Sentimiento mediático -0.31. Apariciones -23%.", level: "medium", source: "Actor scoring engine", created_at: new Date(Date.now() - 28800000).toISOString(), read: false, category: "actores" },
  { id: "9", title: "Ley de Vivienda: aprobación en riesgo", body: "Sin 176 votos sin Junts. Negociaciones en curso. Votación próxima semana.", level: "critical", source: "Monitor legislativo", created_at: new Date(Date.now() - 43200000).toISOString(), read: false, category: "legislativo" },
];

function levelClasses(level: string) {
  if (level === "critical") return { bar: "bg-red1", text: "text-red1", badge: "badge-red", label: "CRÍTICA" };
  if (level === "high") return { bar: "bg-red1/70", text: "text-red1", badge: "badge-red", label: "ALTA" };
  if (level === "medium") return { bar: "bg-amber1", text: "text-amber1", badge: "badge-amber", label: "MEDIA" };
  return { bar: "bg-blue1", text: "text-blue1", badge: "badge-blue", label: "BAJA" };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `hace ${h}h`;
  return `hace ${m}m`;
}

export default function AlertasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("Todas");
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  const { data: apiAlerts, isLoading, refetch } = useQuery({
    queryKey: ["alerts", "list"],
    queryFn: () => endpoints.alertsList(false).catch(() => null),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
    retry: false,
  });

  const rawAlerts = (apiAlerts && Array.isArray(apiAlerts) && apiAlerts.length > 0)
    ? apiAlerts
    : DEMO_ALERTS;

  const alerts = rawAlerts.map(a => ({
    ...a,
    read: a.read || readSet.has(a.id),
    category: (a as any).category ?? "general",
    time: timeAgo(a.created_at ?? new Date().toISOString()),
  }));

  const markRead = (id: string) => setReadSet(prev => new Set([...prev, id]));
  const markAllRead = () => setReadSet(new Set(alerts.map(a => a.id)));

  const filtered = alerts.filter(a => {
    if (filter === "Todas") return true;
    if (filter === "Sin leer") return !a.read;
    if (filter === "Críticas") return a.level === "critical";
    if (filter === "Altas") return a.level === "high";
    if (filter === "Medias") return a.level === "medium";
    if (filter === "Bajas") return a.level === "low";
    return true;
  });

  const unread = alerts.filter(a => !a.read).length;
  const critical = alerts.filter(a => a.level === "critical" && !a.read).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Bandeja operativa</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Alertas de Inteligencia</h1>
          <p className="text-text2 text-sm mt-1">
            {unread} sin leer · {critical > 0 && <span className="text-red1 font-semibold">{critical} críticas · </span>}
            {alerts.length} totales · priorizadas por riesgo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button
            onClick={markAllRead}
            className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Marcar leídas
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Críticas", value: alerts.filter(a => a.level === "critical").length, color: "text-red1" },
          { label: "Altas", value: alerts.filter(a => a.level === "high").length, color: "text-red1/70" },
          { label: "Sin leer", value: unread, color: "text-amber1" },
          { label: "Total", value: alerts.length, color: "text-cyan1" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

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

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="premium-card text-center py-8 text-muted text-sm">
            No hay alertas con el filtro seleccionado.
          </div>
        )}
        {filtered.map(a => {
          const cls = levelClasses(a.level);
          return (
            <article
              key={a.id}
              className={`premium-card cursor-pointer hover:border-cyan1/30 transition-opacity ${a.read ? "opacity-60" : ""}`}
              onClick={() => markRead(a.id)}
            >
              <div className="flex gap-4">
                <span className={`w-1 self-stretch rounded-full ${cls.bar} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`badge ${cls.badge}`}>{cls.label}</span>
                    <span className="badge bg-bg3 text-text2 border border-border1 text-[10px]">
                      {(a as any).category ?? "general"}
                    </span>
                    {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-cyan1 animate-pulse" />}
                    <span className="text-[10px] text-muted ml-auto">{a.time ?? timeAgo(a.created_at)}</span>
                  </div>
                  <h3 className="text-base font-bold text-text1 mb-1">{a.title}</h3>
                  <p className="text-sm text-text2 leading-relaxed">{a.body}</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted">Fuente: {a.source}</span>
                    <div className="flex gap-3">
                      <button className="text-cyan1 hover:underline">Investigar</button>
                      <button className="text-cyan1 hover:underline flex items-center gap-1">
                        Detalle <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
