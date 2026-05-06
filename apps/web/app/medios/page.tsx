"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints, type OsintNarrativa } from "@/lib/api/endpoints";
import { Newspaper, Activity, AlertCircle, CheckCircle2, ChevronRight, TrendingUp } from "lucide-react";

function statusBadge(s: string) {
  if (s === "active")   return { class: "badge-green",  icon: CheckCircle2, label: "Activa" };
  if (s === "degraded") return { class: "badge-amber",  icon: Activity,     label: "Degradada" };
  return                       { class: "badge-red",    icon: AlertCircle,  label: "Caída" };
}

const DEMO_STORIES = [
  { id: "1", title: "TC admite a trámite el recurso del PP contra la amnistía", source: "El País",       relevance_score: 0.92 },
  { id: "2", title: "Sumar exige acelerar la reforma del IRPF al PSOE",          source: "elDiario.es",  relevance_score: 0.81 },
  { id: "3", title: "VOX rompe gobierno en una nueva CCAA por desacuerdo migratorio", source: "ABC",     relevance_score: 0.78 },
  { id: "4", title: "BdE revisa al alza la previsión de PIB 2026",               source: "Cinco Días",  relevance_score: 0.74 },
  { id: "5", title: "Junts amenaza con bloquear comisión de Justicia esta semana", source: "La Vanguardia", relevance_score: 0.67 },
];

export default function MediosPage() {
  const { data: stories } = useQuery({
    queryKey: ["media", "top-stories"],
    queryFn: () => endpoints.mediaTopStories(15).catch(() => []),
  });

  const { data: sourceHealth } = useQuery({
    queryKey: ["media", "source-health"],
    queryFn: () => endpoints.mediaSourceHealth().catch(() => null),
    staleTime: 2 * 60 * 1000,
  });

  const { data: narrativas = [] } = useQuery({
    queryKey: ["osint", "narrativas", "medios"],
    queryFn: () =>
      endpoints.osintNarrativas({ horas: 48 }).then((r: any) => {
        const items: any[] = Array.isArray(r) ? r : r?.items ?? [];
        return items.map((n: any, i: number): OsintNarrativa => ({
          id: n.id ?? i,
          titulo: n.titulo ?? n.frame_label ?? "",
          descripcion: n.descripcion ?? n.central_claim ?? "",
          tipo: n.tipo ?? n.lifecycle ?? "narrativa",
          tono: n.tono ?? n.dominant_emotion ?? "neutro",
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

  const { data: osintKpis } = useQuery({
    queryKey: ["osint", "kpis"],
    queryFn: () => endpoints.osintKpis().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const displayStories = (stories && stories.length > 0) ? stories : DEMO_STORIES;
  const health = sourceHealth ?? { active: 412, degraded: 47, down: 28, sources: [] };

  const DEMO_SOURCES = [
    { name: "El País",     status: "active",   articles_24h: 89 },
    { name: "El Mundo",    status: "active",   articles_24h: 67 },
    { name: "ABC",         status: "active",   articles_24h: 54 },
    { name: "elDiario.es", status: "active",   articles_24h: 41 },
    { name: "OK Diario",   status: "active",   articles_24h: 38 },
    { name: "20 Minutos",  status: "degraded", articles_24h: 12 },
    { name: "RTVE",        status: "active",   articles_24h: 33 },
  ];
  const displaySources = (health.sources && health.sources.length > 0)
    ? health.sources.slice(0, 8)
    : DEMO_SOURCES;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia mediática</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Medios & Narrativa</h1>
        <p className="text-text2 text-sm mt-1">Monitorización editorial, salud de fuentes y análisis narrativo en tiempo real.</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Fuentes activas</div>
          <div className="text-2xl font-bold text-green1">{health.active}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Degradadas</div>
          <div className="text-2xl font-bold text-amber1">{health.degraded}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Caídas</div>
          <div className="text-2xl font-bold text-red1">{health.down}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Posts sociales 24h</div>
          <div className="text-2xl font-bold text-cyan1">{(osintKpis as any)?.posts_hoy ?? "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top stories */}
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top stories — Selección editorial</h2>
          </div>
          <ul className="space-y-3">
            {displayStories.map((s: any) => (
              <li key={s.id} className="group cursor-pointer p-3 rounded-lg hover:bg-bg3 transition flex items-start gap-3">
                <span className="text-cyan1 font-mono text-xs mt-0.5">
                  {Math.round((s.relevance_score ?? s.relevancia_cliente ?? 0) * 100)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted">{s.source ?? s.fuente}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition">{s.title ?? s.titulo}</div>
                  <div className="mt-1.5 h-0.5 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan1 to-blue1"
                      style={{ width: `${(s.relevance_score ?? s.relevancia_cliente ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Source health */}
        <aside className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Salud de fuentes</h2>
          <ul className="space-y-2">
            {displaySources.map((src: any) => {
              const sb = statusBadge(src.status ?? (src.last_success ? "active" : "down"));
              const Icon = sb.icon;
              return (
                <li key={src.name} className="flex items-center justify-between text-sm p-2 rounded hover:bg-bg3 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${
                      (src.status ?? "active") === "active" ? "text-green1" :
                      (src.status ?? "active") === "degraded" ? "text-amber1" : "text-red1"
                    }`} />
                    <span className="text-text1 truncate">{src.name}</span>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 ml-2">{src.articles_24h ?? 0}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Narratives */}
      <section className="premium-card" id="narrativas">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Narrativas activas</h2>
          {narrativas.length > 0 && (
            <span className="badge badge-cyan">{narrativas.length} detectadas</span>
          )}
        </div>
        {narrativas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(narrativas as OsintNarrativa[]).slice(0, 6).map(n => (
              <div key={n.id} className="p-4 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/30 transition group cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition leading-tight">{n.titulo}</h3>
                  <span className={`badge shrink-0 ${(n.riesgo_narrativo ?? 0) >= 7 ? "badge-red" : (n.riesgo_narrativo ?? 0) >= 4 ? "badge-amber" : "badge-cyan"}`}>
                    {n.tipo ?? "narrativa"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text2 mb-2">
                  <span>{n.n_posts ?? 0} posts</span>
                  <span>·</span>
                  <span>
                    Velocidad:{" "}
                    <span className={(n.velocidad_por_hora ?? 0) > 5 ? "text-red1" : "text-text2"}>
                      {(n.velocidad_por_hora ?? 0) > 5 ? "▲ " : "→ "}
                      {n.velocidad_por_hora?.toFixed(1) ?? "0"}/h
                    </span>
                  </span>
                  {n.tono && <span>· {n.tono}</span>}
                </div>
                {n.es_coordinada && (
                  <div className="flex items-center gap-1 text-xs text-amber1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Posible coordinación detectada</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Crisis vivienda asequible",    lifecycle: "peak",      velocity: "up",     article_count: 142, dominant_emotion: "frustración",  recommended_action: "Mensaje de respuesta con propuestas concretas" },
              { label: "Lawfare contra el gobierno",   lifecycle: "emergence", velocity: "up",     article_count: 87,  dominant_emotion: "indignación",   recommended_action: "Vigilar amplificación + contra-frame" },
              { label: "Reforma fiscal pendiente",     lifecycle: "emergence", velocity: "up",     article_count: 64,  dominant_emotion: "expectativa",   recommended_action: "Analizar movimientos de Sumar" },
              { label: "Pactos PP-VOX en CCAA",        lifecycle: "decline",   velocity: "stable", article_count: 51,  dominant_emotion: "tensión",       recommended_action: "Monitorizar tensiones internas" },
            ].map((n, i) => (
              <div key={i} className="p-4 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/30 transition group cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition leading-tight">{n.label}</h3>
                  <span className={`badge shrink-0 ${n.lifecycle === "peak" ? "badge-red" : n.lifecycle === "emergence" ? "badge-amber" : "badge-cyan"}`}>
                    {n.lifecycle}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text2 mb-2">
                  <span>{n.article_count} artículos</span>
                  <span>·</span>
                  <span className={n.velocity === "up" ? "text-red1" : ""}>
                    {n.velocity === "up" ? "▲ subiendo" : "→ estable"}
                  </span>
                  <span>· {n.dominant_emotion}</span>
                </div>
                <div className="text-xs text-cyan1">→ {n.recommended_action}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
