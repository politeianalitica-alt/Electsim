"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints, type Signal, type OsintNarrativa } from "@/lib/api/endpoints";
import { Activity, AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";

const DIMENSIONS = ["Electoral", "Comunicación", "Legislativo", "Geopolítico", "Económico"];
const TIPO_DIM: Record<string, string> = {
  narrativa_riesgo:        "Comunicación",
  coordinacion_inorganica: "Comunicación",
  legislacion_urgente:     "Legislativo",
  toxicidad_elevada:       "Comunicación",
  erosion_actor:           "Electoral",
  votacion_parlamentaria:  "Legislativo",
  silencio_mediatico:      "Electoral",
  spike_negativo:          "Comunicación",
};

function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 60) return "#F59E0B";
  if (v >= 40) return "#3B82F6";
  return "#10B981";
}

function riskFromSignals(signals: Signal[], dim?: string): number {
  const relevant = dim
    ? signals.filter(s => TIPO_DIM[s.tipo] === dim)
    : signals;
  if (!relevant.length) return 0;
  const score = relevant.reduce((acc, s) => acc + s.urgencia * 20, 0) / relevant.length;
  return Math.min(Math.round(score), 100);
}

function dimColor(v: number): string {
  if (v >= 75) return "text-red1";
  if (v >= 60) return "text-amber1";
  if (v >= 40) return "text-blue1";
  return "text-green1";
}

function cellColor(val: number, sev: string) {
  const intensity = Math.min(val / 12, 1);
  const base = sev === "Alta" ? "239, 68, 68" : sev === "Media" ? "245, 158, 11" : "59, 130, 246";
  return `rgba(${base}, ${0.15 + intensity * 0.55})`;
}

export default function RiesgoPage() {
  const { data: signals = [] } = useQuery({
    queryKey: ["signals", "riesgo"],
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
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: narrativas = [] } = useQuery({
    queryKey: ["osint", "narrativas", "riesgo"],
    queryFn: () =>
      endpoints.osintNarrativas({ minRiesgo: 5, horas: 48 }).then((r: any) => {
        const items: any[] = Array.isArray(r) ? r : r?.items ?? [];
        return items.map((n: any, i: number): OsintNarrativa => ({
          id: n.id ?? i,
          titulo: n.titulo ?? n.frame_label ?? "",
          descripcion: n.descripcion ?? n.central_claim ?? "",
          tipo: n.tipo ?? n.lifecycle ?? "narrativa",
          tono: n.tono ?? "negativo",
          actores_mencionados: n.actores_mencionados ?? n.affected_actors ?? [],
          hashtags_clave: n.hashtags_clave ?? [],
          riesgo_narrativo: n.riesgo_narrativo ?? (n.lifecycle === "peak" ? 8 : 5),
          es_coordinada: n.es_coordinada ?? false,
          n_posts: n.n_posts ?? n.article_count ?? 0,
          alcance_total: n.alcance_total ?? 0,
          velocidad_por_hora: n.velocidad_por_hora ?? (n.velocity === "up" ? 4.5 : 1.2),
          score_coordinacion: n.score_coordinacion ?? 0,
          plataformas: n.plataformas ?? {},
          fecha_deteccion: n.fecha_deteccion ?? new Date().toISOString(),
        }));
      }).catch(() => [] as OsintNarrativa[]),
    staleTime: 5 * 60 * 1000,
  });

  const { data: actorsDash } = useQuery({
    queryKey: ["actors", "dashboard"],
    queryFn: () => endpoints.actorsDashboard().catch(() => ({})),
    staleTime: 5 * 60 * 1000,
  });

  const globalRisk = riskFromSignals(signals as Signal[]);
  const dimScores: Record<string, number> = Object.fromEntries(
    DIMENSIONS.map(d => [d, riskFromSignals(signals as Signal[], d)])
  );

  const SEVERITIES = ["Alta", "Media", "Baja"];
  const heatmap: Record<string, Record<string, number>> = {};
  DIMENSIONS.forEach(d => {
    const rel = (signals as Signal[]).filter(s => TIPO_DIM[s.tipo] === d);
    heatmap[d] = {
      Alta: rel.filter(s => s.urgencia >= 4).length,
      Media: rel.filter(s => s.urgencia === 3).length,
      Baja: rel.filter(s => s.urgencia <= 2).length,
    };
  });

  const topSignals = [...(signals as Signal[])]
    .sort((a, b) => b.urgencia - a.urgencia)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor de Riesgo</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Monitor de Riesgo</h1>
        <p className="text-text2 text-sm mt-1">Señales activas, heat map por dimensión y narrativas de riesgo elevado.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge global */}
        <div className="premium-card flex flex-col items-center justify-center py-8">
          <div className="text-xs uppercase tracking-wider text-text2 mb-4">Índice de Riesgo Global</div>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={gaugeColor(globalRisk)}
                strokeWidth="12"
                strokeDasharray={`${globalRisk * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: gaugeColor(globalRisk) }}>{globalRisk}</span>
              <span className="text-[10px] text-muted uppercase">riesgo</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 w-full">
            {DIMENSIONS.slice(0, 4).map(d => (
              <div key={d} className="text-center">
                <div className={`text-lg font-bold ${dimColor(dimScores[d])}`}>{dimScores[d]}</div>
                <div className="text-[10px] text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Heat map */}
        <section className="premium-card lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Mapa de Calor de Riesgos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-text2 font-medium pb-2 pr-4">Dimensión</th>
                  {SEVERITIES.map(s => (
                    <th key={s} className="text-center text-text2 font-medium pb-2 px-2">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map(d => (
                  <tr key={d}>
                    <td className="py-1.5 pr-4 font-medium text-text1">{d}</td>
                    {SEVERITIES.map(s => {
                      const val = heatmap[d]?.[s] ?? 0;
                      return (
                        <td key={s} className="py-1.5 px-2 text-center">
                          <div
                            className="rounded px-2 py-1 font-mono"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top signals */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Señales activas</h2>
            <span className="ml-auto badge badge-cyan">{signals.length}</span>
          </div>
          {topSignals.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin señales activas en el sistema.</p>
          ) : (
            <ul className="space-y-3">
              {topSignals.map((s: Signal) => (
                <li key={s.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-text1 leading-snug">{s.titulo}</div>
                    <span className={`shrink-0 text-xs font-mono ${s.urgencia >= 4 ? "text-red1" : s.urgencia === 3 ? "text-amber1" : "text-blue1"}`}>
                      {s.urgencia}★
                    </span>
                  </div>
                  <div className="text-[11px] text-text2 line-clamp-2 mb-1">{s.resumen}</div>
                  <div className="text-[10px] text-muted">{s.modulo_origen}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Narratives risk */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Narrativas de riesgo</h2>
            <span className="ml-auto badge badge-amber">{narrativas.length}</span>
          </div>
          {narrativas.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin narrativas de riesgo elevado en 48h.</p>
          ) : (
            <ul className="space-y-3">
              {(narrativas as OsintNarrativa[]).slice(0, 5).map(n => (
                <li key={n.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition">{n.titulo}</div>
                    <span className="text-xs text-red1 font-mono shrink-0">{n.riesgo_narrativo?.toFixed(0)}/10</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {n.es_coordinada && <span className="badge badge-red text-[10px]">Coordinada</span>}
                    {n.tipo && <span className="badge badge-blue text-[10px]">{n.tipo}</span>}
                    {n.n_posts !== undefined && (
                      <span className="badge badge-cyan text-[10px]">{n.n_posts} posts</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{n.velocidad_por_hora?.toFixed(1) ?? "0"} posts/hora</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-4 border-t border-border1 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-red1">{(actorsDash as any)?.actores_riesgo_alto ?? 0}</div>
              <div className="text-[10px] text-muted">Actores riesgo alto</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber1">{(actorsDash as any)?.con_sentimiento_negativo ?? 0}</div>
              <div className="text-[10px] text-muted">Sentimiento negativo</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
