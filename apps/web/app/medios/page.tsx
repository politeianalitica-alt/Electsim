"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import {
  Newspaper, Globe2, BarChart2, Radio, MapPin,
  Activity, AlertCircle, CheckCircle2, Database,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { MediaFeed }       from "@/components/media/MediaFeed";
import { BiasSpectrum }    from "@/components/media/BiasSpectrum";
import { SentimentHeatmap } from "@/components/media/SentimentHeatmap";
import { NarrativePanel }  from "@/components/media/NarrativePanel";
import { NarrativeMap }    from "@/components/media/NarrativeMap";

// ── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "feed",       label: "Feed de noticias",   Icon: Newspaper },
  { id: "sesgo",      label: "Sesgo de medios",     Icon: BarChart2 },
  { id: "sentimiento",label: "Sentimiento",         Icon: Activity  },
  { id: "narrativas", label: "Narrativas activas",  Icon: Radio     },
  { id: "mapa",       label: "Mapa narrativo",      Icon: MapPin    },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "text-cyan1",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="kpi-card">
      <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Source health row ────────────────────────────────────────────────────────
function SourceRow({ src }: { src: any }) {
  const status = src.status ?? "active";
  const Icon = status === "active" ? CheckCircle2 : status === "degraded" ? Activity : AlertCircle;
  const colorCls = status === "active" ? "text-green1" : status === "degraded" ? "text-amber1" : "text-red1";
  return (
    <li className="flex items-center justify-between text-xs p-2 rounded hover:bg-bg3 transition">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${colorCls}`} />
        <span className="text-text1 truncate">{src.name}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {src.articles_24h != null && (
          <span className="text-[9px] text-muted">{src.articles_24h} arts.</span>
        )}
        {src.trend === "up"   && <TrendingUp   className="w-3 h-3 text-red1"  />}
        {src.trend === "down" && <TrendingDown className="w-3 h-3 text-green1"/>}
        {src.trend === "flat" && <Minus        className="w-3 h-3 text-muted" />}
      </div>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MediosPage() {
  const [activeTab, setActiveTab] = useState<TabId>("feed");

  // KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["media-intel", "kpis"],
    queryFn: () => endpoints.mediaIntelKpis().catch(() => null),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  // Source health (sidebar)
  const { data: sourceHealth } = useQuery({
    queryKey: ["media-intel", "source-health"],
    queryFn: () => endpoints.mediaIntelSourceHealth().catch(() => null),
    staleTime: 3 * 60 * 1000,
  });

  // Derived KPI values
  const totalArticulos     = kpis?.total_articulos     ?? kpis?.total_articles     ?? "—";
  const articulosHoy       = kpis?.articulos_hoy       ?? kpis?.articles_today     ?? "—";
  const fuentesActivas     = kpis?.fuentes_activas     ?? kpis?.active_sources      ?? "—";
  const articulosInt       = kpis?.articulos_internacionales ?? kpis?.international_articles ?? "—";
  const narrativasCount    = kpis?.narrativas_detectadas ?? kpis?.narratives_count  ?? "—";
  const modeLabel          = kpis?.mode ?? null;

  // Source health list (max 10)
  const shownSources: any[] = (sourceHealth?.sources ?? []).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="label-cap">Inteligencia mediática</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Medios &amp; Narrativa</h1>
          <p className="text-text2 text-sm mt-1">
            Monitorización editorial, sesgo de fuentes, sentimiento por partido y análisis narrativo en tiempo real.
          </p>
        </div>
        {modeLabel && (
          <span className={`badge shrink-0 mt-2 ${modeLabel === "real" ? "badge-green" : "badge-amber"}`}>
            <Database className="w-3 h-3 mr-1 inline-block" />
            {modeLabel === "real" ? "Datos reales" : "Modo demo"}
          </span>
        )}
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="kpi-card h-16 animate-pulse bg-bg3" />
          ))
        ) : (
          <>
            <KpiCard label="Artículos totales"       value={totalArticulos}  color="text-text1" />
            <KpiCard label="Artículos hoy"            value={articulosHoy}    color="text-cyan1" />
            <KpiCard label="Fuentes activas"          value={fuentesActivas}  color="text-green1" />
            <KpiCard label="Artículos internacionales" value={articulosInt}   color="text-blue1" />
            <KpiCard label="Narrativas detectadas"    value={narrativasCount} color="text-amber1" />
          </>
        )}
      </div>

      {/* Main grid: tab panel + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Left: tab panel (3/4 width on xl) */}
        <div className="xl:col-span-3 space-y-4">

          {/* Tab bar */}
          <div className="flex flex-wrap gap-0.5 border-b border-border1 pb-0">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px ${
                  activeTab === id
                    ? "border-cyan1 text-cyan1"
                    : "border-transparent text-text2 hover:text-text1"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="premium-card min-h-[400px]">
            {activeTab === "feed"        && <MediaFeed />}
            {activeTab === "sesgo"       && <BiasSpectrum />}
            {activeTab === "sentimiento" && <SentimentHeatmap />}
            {activeTab === "narrativas"  && <NarrativePanel />}
            {activeTab === "mapa"        && (
              <div className="h-[620px]">
                <NarrativeMap />
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: source health */}
        <aside className="xl:col-span-1 space-y-4">
          <div className="premium-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">
              Salud de fuentes
            </h2>

            {/* Status summary pills */}
            {sourceHealth && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green1">
                  <CheckCircle2 className="w-3 h-3" />
                  {sourceHealth.active ?? 0} activas
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber1">
                  <Activity className="w-3 h-3" />
                  {sourceHealth.degraded ?? 0} degradadas
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-red1">
                  <AlertCircle className="w-3 h-3" />
                  {sourceHealth.down ?? 0} caídas
                </span>
              </div>
            )}

            {shownSources.length > 0 ? (
              <ul className="space-y-1">
                {shownSources.map((src: any) => (
                  <SourceRow key={src.name} src={src} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted py-4 text-center">Sin datos de fuentes.</p>
            )}
          </div>

          {/* Quick-access shortcuts */}
          <div className="premium-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">
              Accesos rápidos
            </h2>
            <ul className="space-y-1">
              {[
                { label: "Feed España",        tab: "feed" as TabId,        note: "últimas 24h" },
                { label: "Espectro ideológico", tab: "sesgo" as TabId,      note: "fuentes por tendencia" },
                { label: "Sentimiento PP/PSOE", tab: "sentimiento" as TabId, note: "evolución diaria" },
                { label: "Narrativas activas",  tab: "narrativas" as TabId,  note: "detección LLM" },
                { label: "Mapa global",         tab: "mapa" as TabId,        note: "cobertura mundial" },
              ].map(({ label, tab, note }) => (
                <li key={tab}>
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-2.5 py-2 rounded text-xs transition flex items-center justify-between gap-2 ${
                      activeTab === tab
                        ? "bg-cyan1/10 text-cyan1"
                        : "text-text2 hover:text-text1 hover:bg-bg3"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] text-muted">{note}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Refresh note */}
          <p className="text-[10px] text-muted text-center px-2">
            Los datos se actualizan cada 10 minutos. Los artículos internacionales provienen de <Globe2 className="w-3 h-3 inline-block mx-0.5" />fuentes globales vía RSS.
          </p>
        </aside>
      </div>
    </div>
  );
}
