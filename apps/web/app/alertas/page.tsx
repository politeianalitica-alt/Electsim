"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints, type Signal } from "@/lib/api/endpoints";
import { Filter, Check, ArrowUpRight, Bell, RefreshCw } from "lucide-react";

const URGENCIA_MAP: Record<number, { label: string; bar: string; badge: string }> = {
  5: { label: "CRÍTICA", bar: "bg-red1",    badge: "badge-red" },
  4: { label: "ALTA",    bar: "bg-red1/70", badge: "badge-red" },
  3: { label: "MEDIA",   bar: "bg-amber1",  badge: "badge-amber" },
  2: { label: "BAJA",    bar: "bg-blue1",   badge: "badge-blue" },
  1: { label: "INFO",    bar: "bg-bg3",     badge: "badge-blue" },
};

const TIPO_LABELS: Record<string, string> = {
  narrativa_riesgo:        "narrativa",
  coordinacion_inorganica: "coordinación",
  legislacion_urgente:     "legislativo",
  toxicidad_elevada:       "toxicidad",
  erosion_actor:           "actor",
  votacion_parlamentaria:  "parlamentario",
  silencio_mediatico:      "actor",
  spike_negativo:          "redes sociales",
};

const FILTERS = ["Todas", "Críticas", "Altas", "Medias", "Sin leer"];

function timeAgo(ts?: string): string {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  return `hace ${Math.round(diff / 86400)} días`;
}

export default function AlertasPage() {
  const [filter, setFilter] = useState("Todas");
  const qc = useQueryClient();

  const { data: signals = [], isLoading, refetch } = useQuery({
    queryKey: ["signals", "alertas"],
    queryFn: () =>
      endpoints.signalsActivas().then((r: any) => {
        const items: any[] = Array.isArray(r) ? r : r?.items ?? [];
        const sevMap: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2 };
        return items.map((s: any): Signal => ({
          id: s.id ?? "",
          tipo: s.tipo ?? s.domain ?? "general",
          urgencia: s.urgencia ?? sevMap[s.severity] ?? 2,
          titulo: s.titulo ?? s.title ?? "",
          resumen: s.resumen ?? s.summary ?? "",
          personas: s.personas ?? [],
          orgs: s.orgs ?? [],
          modulo_origen: s.modulo_origen ?? s.domain ?? "",
          leida: s.leida ?? false,
          activa: s.activa ?? true,
          created_at: s.created_at ?? new Date().toISOString(),
        }));
      }).catch(() => [] as Signal[]),
    refetchInterval: 60 * 1000,
  });

  const { data: osintAlertas = [] } = useQuery({
    queryKey: ["osint", "alertas"],
    queryFn: () => endpoints.osintAlertas(72).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => endpoints.signalMarkRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });

  const allAlerts = [
    ...signals.map((s: Signal) => ({
      id: s.id,
      title: s.titulo,
      body: s.resumen,
      urgencia: s.urgencia,
      tipo: s.tipo,
      source: s.modulo_origen,
      time: s.created_at,
      read: s.leida,
      origin: "signal" as const,
    })),
    ...(osintAlertas as any[]).map((a) => ({
      id: `osint-${a.id}`,
      title: (a.title ?? a.descripcion ?? "Alerta").slice(0, 80) as string,
      body: (a.body ?? a.descripcion ?? "") as string,
      urgencia: a.urgencia ?? (a.level === "critical" ? 5 : a.level === "high" ? 4 : a.severidad === "alta" ? 4 : 3) as number,
      tipo: a.tipo ?? a.category ?? "social",
      source: a.source ?? "social_listening" as string,
      time: a.created_at ?? a.creado_en as string,
      read: (a.leida ?? false) as boolean,
      origin: "osint" as const,
    })),
  ].sort((a, b) => b.urgencia - a.urgencia);

  const filtered = allAlerts.filter(a => {
    if (filter === "Todas") return true;
    if (filter === "Sin leer") return !a.read;
    if (filter === "Críticas") return a.urgencia >= 5;
    if (filter === "Altas") return a.urgencia === 4;
    if (filter === "Medias") return a.urgencia === 3;
    return true;
  });

  const unread = allAlerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Bandeja operativa</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Alertas</h1>
          <p className="text-text2 text-sm mt-1">
            {unread} sin leer · {allAlerts.length} totales · priorizadas por urgencia
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Sin leer</div>
          <div className="text-2xl font-bold text-amber1">{unread}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Críticas / Altas</div>
          <div className="text-2xl font-bold text-red1">
            {allAlerts.filter(a => a.urgencia >= 4).length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Motor señales</div>
          <div className="text-2xl font-bold text-cyan1">{signals.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">OSINT</div>
          <div className="text-2xl font-bold text-text1">{osintAlertas.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-text2" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === f
                ? "border-cyan1 bg-cyan1/10 text-cyan1"
                : "border-border1 text-text2 hover:border-cyan1/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg3 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-card text-center py-12">
          <Bell className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-text2">No hay alertas que coincidan con el filtro.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(a => {
            const style = URGENCIA_MAP[a.urgencia] ?? URGENCIA_MAP[1];
            return (
              <li
                key={a.id}
                className={`premium-card flex items-start gap-4 ${a.read ? "opacity-60" : ""} hover:border-cyan1/40 transition`}
              >
                <span className={`w-1 self-stretch rounded-full shrink-0 ${style.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-text1 leading-snug">{a.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${style.badge} text-[10px]`}>{style.label}</span>
                      {!a.read && a.origin === "signal" && (
                        <button
                          onClick={() => markRead.mutate(a.id)}
                          className="text-[10px] text-muted hover:text-cyan1 transition flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" /> Leída
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text2 mb-2">{a.body}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-blue">{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                      <span className="text-muted">{a.source}</span>
                    </div>
                    <span className="text-muted">{timeAgo(a.time)}</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted shrink-0 mt-1" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
