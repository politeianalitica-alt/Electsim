"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Newspaper, Activity, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

const DEMO_SOURCES = {
  active: 412, degraded: 47, down: 28,
  sources: [
    { name: "El País",         status: "active",   last_success: "hace 5 min",  articles_24h: 89 },
    { name: "El Mundo",        status: "active",   last_success: "hace 8 min",  articles_24h: 67 },
    { name: "ABC",             status: "active",   last_success: "hace 12 min", articles_24h: 54 },
    { name: "elDiario.es",     status: "active",   last_success: "hace 15 min", articles_24h: 41 },
    { name: "OK Diario",       status: "active",   last_success: "hace 3 min",  articles_24h: 38 },
    { name: "20 Minutos",      status: "degraded", last_success: "hace 4 h",    articles_24h: 12 },
    { name: "La Razón",        status: "down",     last_success: "hace 18 h",   articles_24h: 0 },
    { name: "RTVE",            status: "active",   last_success: "hace 7 min",  articles_24h: 33 }
  ]
};

const DEMO_NARRATIVES = [
  { frame_label: "Crisis vivienda asequible", lifecycle: "peak", velocity: "up", article_count: 142, dominant_emotion: "frustración", recommended_action: "Mensaje de respuesta con propuestas concretas" },
  { frame_label: "Lawfare contra el gobierno", lifecycle: "emergence", velocity: "up", article_count: 87, dominant_emotion: "indignación", recommended_action: "Vigilar amplificación + contra-frame" },
  { frame_label: "Reforma fiscal pendiente", lifecycle: "emergence", velocity: "up", article_count: 64, dominant_emotion: "expectativa", recommended_action: "Analizar movimientos de Sumar" },
  { frame_label: "Pactos PP-VOX en CCAA", lifecycle: "decline", velocity: "stable", article_count: 51, dominant_emotion: "tensión", recommended_action: "Monitorizar tensiones internas" }
];

function statusBadge(s: string) {
  if (s === "active") return { class: "badge-green", icon: CheckCircle2, label: "Activa" };
  if (s === "degraded") return { class: "badge-amber", icon: Activity, label: "Degradada" };
  return { class: "badge-red", icon: AlertCircle, label: "Caída" };
}

export default function MediosPage() {
  const { data: stories } = useQuery({
    queryKey: ["media", "top-stories"],
    queryFn: () => endpoints.mediaTopStories(15).catch(() => [])
  });

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
          <div className="text-2xl font-bold text-green1">{DEMO_SOURCES.active}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Degradadas</div>
          <div className="text-2xl font-bold text-amber1">{DEMO_SOURCES.degraded}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Caídas</div>
          <div className="text-2xl font-bold text-red1">{DEMO_SOURCES.down}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Artículos 24h</div>
          <div className="text-2xl font-bold text-cyan1">14.820</div>
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
            {(stories && stories.length > 0 ? stories : [
              { id: "1", title: "TC admite a trámite el recurso del PP contra la amnistía", source: "El País", relevance_score: 0.92 },
              { id: "2", title: "Sumar exige acelerar la reforma del IRPF al PSOE", source: "elDiario.es", relevance_score: 0.81 },
              { id: "3", title: "VOX rompe gobierno en una nueva CCAA por desacuerdo migratorio", source: "ABC", relevance_score: 0.78 },
              { id: "4", title: "BdE revisa al alza la previsión de PIB 2026", source: "Cinco Días", relevance_score: 0.74 },
              { id: "5", title: "Investigación judicial al hermano de la ex pareja de un alto cargo", source: "OK Diario", relevance_score: 0.69 },
              { id: "6", title: "Junts amenaza con bloquear comisión de Justicia esta semana", source: "La Vanguardia", relevance_score: 0.67 },
              { id: "7", title: "Feijóo presenta plan de vivienda para jóvenes", source: "El Mundo", relevance_score: 0.62 }
            ]).map((s: any) => (
              <li key={s.id} className="group cursor-pointer p-3 rounded-lg hover:bg-bg3 transition flex items-start gap-3">
                <span className="text-cyan1 font-mono text-xs mt-0.5">{(s.relevance_score * 100).toFixed(0)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted">{s.source}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition">{s.title}</div>
                  <div className="mt-1.5 h-0.5 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${s.relevance_score * 100}%` }} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
              </li>
            ))}
          </ul>
        </section>

        {/* Source health */}
        <aside className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Salud de fuentes</h2>
          <ul className="space-y-2">
            {DEMO_SOURCES.sources.map(src => {
              const sb = statusBadge(src.status);
              const Icon = sb.icon;
              return (
                <li key={src.name} className="flex items-center justify-between text-sm p-2 rounded hover:bg-bg3 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${src.status === "active" ? "text-green1" : src.status === "degraded" ? "text-amber1" : "text-red1"}`} />
                    <span className="text-text1 truncate">{src.name}</span>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 ml-2">{src.articles_24h}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Narratives */}
      <section className="premium-card" id="narrativas">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Narrativas activas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_NARRATIVES.map((n, i) => (
            <div key={i} className="p-4 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/30 transition group cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition leading-tight">
                  {n.frame_label}
                </h3>
                <span className={`badge ${n.lifecycle === "peak" ? "badge-red" : n.lifecycle === "emergence" ? "badge-amber" : "badge-cyan"} shrink-0`}>
                  {n.lifecycle}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text2 mb-2">
                <span>{n.article_count} artículos</span>
                <span>·</span>
                <span>Velocidad: <span className={n.velocity === "up" ? "text-red1" : "text-text2"}>{n.velocity === "up" ? "▲ subiendo" : "→ estable"}</span></span>
                <span>·</span>
                <span>{n.dominant_emotion}</span>
              </div>
              <div className="text-xs text-cyan1 mt-2">→ {n.recommended_action}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
