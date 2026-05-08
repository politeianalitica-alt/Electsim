"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Newspaper, Activity, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, ExternalLink, X } from "lucide-react";

function statusBadge(s: string) {
  if (s === "active") return { class: "badge-green", icon: CheckCircle2, label: "Activa" };
  if (s === "degraded") return { class: "badge-amber", icon: Activity, label: "Degradada" };
  return { class: "badge-red", icon: AlertCircle, label: "Caída" };
}

export default function MediosPage() {
  const [activeSrc, setActiveSrc] = useState<string | null>(null);

  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ["media", "top-stories"],
    queryFn: () => endpoints.mediaTopStories(15),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
  const { data: narratives = [], isLoading: loadingNarratives } = useQuery({
    queryKey: ["media", "narratives"],
    queryFn: () => endpoints.mediaNarratives(),
    staleTime: 120_000,
    refetchInterval: 600_000,
  });
  const { data: sourceHealth, isLoading: loadingSourceHealth } = useQuery({
    queryKey: ["media", "source-health"],
    queryFn: () => endpoints.mediaSourceHealth(),
    staleTime: 300_000,
    refetchInterval: 900_000,
  });

  const sources = sourceHealth?.sources ?? [];
  const totalSources = (sourceHealth?.active ?? 0) + (sourceHealth?.degraded ?? 0) + (sourceHealth?.down ?? 0);

  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    stories.forEach(s => { if (s.source) seen.add(s.source); });
    return Array.from(seen).sort();
  }, [stories]);

  const filteredStories = useMemo(() => {
    if (!activeSrc) return stories;
    return stories.filter(s => s.source === activeSrc);
  }, [stories, activeSrc]);

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
          <div className="text-2xl font-bold text-green1">{sourceHealth?.active ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Degradadas</div>
          <div className="text-2xl font-bold text-amber1">{sourceHealth?.degraded ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Caídas</div>
          <div className="text-2xl font-bold text-red1">{sourceHealth?.down ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Total catálogo</div>
          <div className="text-2xl font-bold text-cyan1">{totalSources || "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top stories */}
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top stories — Selección editorial</h2>
          </div>

          {/* Source filter chips */}
          {uniqueSources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setActiveSrc(null)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition ${!activeSrc ? "bg-cyan1 text-bg border-cyan1 font-semibold" : "border-border1 text-text2 hover:border-cyan1/40"}`}
              >
                Todas
              </button>
              {uniqueSources.map(src => (
                <button
                  key={src}
                  onClick={() => setActiveSrc(activeSrc === src ? null : src)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${activeSrc === src ? "bg-cyan1/10 text-cyan1 border-cyan1/40" : "border-border1 text-text2 hover:border-cyan1/40"}`}
                >
                  {src}
                  {activeSrc === src && <X className="w-2.5 h-2.5"/>}
                </button>
              ))}
            </div>
          )}

          <ul className="space-y-3">
            {loadingStories
              ? Array.from({ length: 6 }).map((_, i) => <li key={i} className="p-3 rounded-lg animate-pulse h-12 bg-bg3/30" />)
              : filteredStories.length === 0
                ? <li className="text-xs text-muted italic">Sin top stories disponibles ahora.</li>
                : filteredStories.map(s => (
                    <li key={s.id} className="group p-3 rounded-lg hover:bg-bg3 transition flex items-start gap-3">
                      <span className="text-cyan1 font-mono text-xs mt-0.5 shrink-0">{(s.relevance_score * 100).toFixed(0)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted">{s.source}</div>
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-text1 group-hover:text-cyan1 transition flex items-start gap-1"
                          >
                            {s.title}
                            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition"/>
                          </a>
                        ) : (
                          <div className="text-sm text-text1 group-hover:text-cyan1 transition">{s.title}</div>
                        )}
                        <div className="mt-1.5 h-0.5 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${s.relevance_score * 100}%`, transition: "width 600ms ease" }} />
                        </div>
                      </div>
                    </li>
                  ))}
          </ul>
        </section>

        {/* Source health */}
        <aside className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Salud de fuentes</h2>
          <ul className="space-y-2">
            {loadingSourceHealth
              ? Array.from({ length: 8 }).map((_, i) => <li key={i} className="h-7 animate-pulse bg-bg3/30 rounded" />)
              : sources.length === 0
                ? <li className="text-xs text-muted italic">Sin datos de salud por ahora.</li>
                : sources.slice(0, 12).map((src: any) => {
                    const sb = statusBadge(src.status || "active");
                    const Icon = sb.icon;
                    return (
                      <li key={src.name} className="flex items-center justify-between text-sm p-2 rounded hover:bg-bg3 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${src.status === "active" ? "text-green1" : src.status === "degraded" ? "text-amber1" : "text-red1"}`} />
                          <span className="text-text1 truncate">{src.name}</span>
                        </div>
                        <span className="text-[10px] text-muted shrink-0 ml-2">{src.articles_24h ?? "—"}</span>
                      </li>
                    );
                  })}
          </ul>
        </aside>
      </div>

      {/* Narratives */}
      <NarrativesSection narratives={narratives} loading={loadingNarratives}/>
    </div>
  );
}

// ── NarrativesSection: expandable cards + summary stats + lifecycle progress ─
function NarrativesSection({ narratives, loading }: { narratives: any[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const stats = {
    total:       narratives.length,
    peak:        narratives.filter(n => n.lifecycle === "peak").length,
    emergence:   narratives.filter(n => n.lifecycle === "emergence").length,
    decline:     narratives.filter(n => n.lifecycle === "decline").length,
  };

  const lifecycleSteps: Array<"emergence" | "peak" | "decline"> = ["emergence", "peak", "decline"];

  return (
    <section className="premium-card" id="narrativas">
      <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">Narrativas activas</h2>

      {/* Summary stats row */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="px-3 py-1.5 rounded-full bg-bg3 border border-border1">
          Total: <strong className="text-text1 font-mono">{stats.total}</strong>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-red1/10 border border-red1/30">
          En peak: <strong className="text-red1 font-mono">{stats.peak}</strong>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-amber1/10 border border-amber1/30">
          Emergentes: <strong className="text-amber1 font-mono">{stats.emergence}</strong>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-bg3 border border-border1">
          En declive: <strong className="text-muted font-mono">{stats.decline}</strong>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 h-28 rounded-lg animate-pulse bg-bg3/30" />
          ))}
        </div>
      ) : narratives.length === 0 ? (
        <p className="text-xs text-muted italic">Sin narrativas activas detectadas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narratives.map(n => {
            const isExpanded = expanded === n.id;
            const stepIdx = lifecycleSteps.indexOf(n.lifecycle as any);
            return (
              <div
                key={n.id}
                onClick={() => setExpanded(isExpanded ? null : n.id)}
                className="p-4 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/30 transition group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition leading-tight">
                    {n.frame_label}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${n.lifecycle === "peak" ? "badge-red" : n.lifecycle === "emergence" ? "badge-amber" : "badge-cyan"}`}>
                      {n.lifecycle}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-text2 transition-transform ${isExpanded ? "rotate-180" : ""}`}/>
                  </div>
                </div>
                {!isExpanded && n.central_claim && (
                  <p className="text-xs text-text2 leading-relaxed mb-2 line-clamp-2">{n.central_claim}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-text2 mb-2 flex-wrap">
                  <span>{n.article_count} artículos</span>
                  <span>·</span>
                  <span>Velocidad: <span className={n.velocity === "up" ? "text-red1" : "text-text2"}>{n.velocity === "up" ? "▲ subiendo" : "→ estable"}</span></span>
                  {n.dominant_emotion && <><span>·</span><span className="badge badge-cyan text-[10px]">{n.dominant_emotion}</span></>}
                </div>

                {isExpanded && (
                  <>
                    {n.central_claim && (
                      <blockquote className="border-l-2 border-cyan1 pl-3 text-xs text-text2 italic my-3">
                        {n.central_claim}
                      </blockquote>
                    )}
                    {(n.promoters?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Promotores</div>
                        <div className="flex flex-wrap gap-1.5">
                          {n.promoters.map((p: string) => (
                            <span key={p} className="badge badge-cyan text-[10px]">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(n.opponents?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Detractores</div>
                        <div className="flex flex-wrap gap-1.5">
                          {n.opponents.map((o: string) => (
                            <span key={o} className="badge badge-red text-[10px]">{o}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {n.recommended_action && (
                      <div className="mt-3 p-3 rounded-lg bg-cyan1/5 border border-cyan1/20">
                        <div className="text-[10px] uppercase tracking-wider text-cyan1 mb-1">Acción recomendada</div>
                        <div className="text-xs text-text1">{n.recommended_action}</div>
                      </div>
                    )}
                    {/* Lifecycle progress 3-step */}
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Ciclo de vida</div>
                      <div className="flex items-center gap-1">
                        {lifecycleSteps.map((step, i) => (
                          <div key={step} className="flex items-center flex-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              i === stepIdx ? "bg-cyan1 text-bg" : "bg-bg3 border border-border1 text-muted"
                            }`}>
                              {i + 1}
                            </div>
                            {i < 2 && <div className={`flex-1 h-0.5 ${i < stepIdx ? "bg-cyan1" : "bg-border1"}`}/>}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-muted mt-1">
                        <span>Emergencia</span><span>Pico</span><span>Declive</span>
                      </div>
                    </div>
                  </>
                )}

                {!isExpanded && n.recommended_action && (
                  <div className="text-xs text-cyan1 mt-2 line-clamp-1">→ {n.recommended_action}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
