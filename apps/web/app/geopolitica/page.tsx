"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Globe2, AlertTriangle, Zap, Shield, Map, Brain,
  TrendingUp, ChevronRight, ExternalLink, RefreshCw,
} from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type {
  RiesgoPaisItem, OsintItem, AlertaGeo, ImpactoGeo, PresenciaItem,
} from "@/lib/api/endpoints";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────
function urgColor(u: number) {
  if (u >= 5) return "text-red1";
  if (u >= 4) return "text-red1/80";
  if (u >= 3) return "text-amber1";
  if (u >= 2) return "text-blue1";
  return "text-muted";
}
function urgBorder(u: number) {
  if (u >= 4) return "border-l-red1";
  if (u >= 3) return "border-l-amber1";
  if (u >= 2) return "border-l-cyan1/60";
  return "border-l-border1";
}
function nivelBadge(n: string) {
  if (n === "CRITICO") return "badge-red";
  if (n === "ALTO")    return "badge-amber";
  if (n === "MEDIO")   return "badge-blue";
  return "badge-cyan";
}
function riskColor(s: number) {
  if (s >= 7) return "#EF4444";
  if (s >= 5) return "#F59E0B";
  if (s >= 3) return "#3B82F6";
  return "#10B981";
}
function sevColor(s: number) {
  if (s >= 4) return "text-red1";
  if (s >= 3) return "text-amber1";
  return "text-cyan1";
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return String(iso).slice(0, 16); }
}
function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 60) return `hace ${diff}m`;
  if (diff < 1440) return `hace ${Math.floor(diff/60)}h`;
  return `hace ${Math.floor(diff/1440)}d`;
}

const TABS = [
  { id: "teatro",  label: "Teatro Global",    icon: Globe2 },
  { id: "osint",   label: "OSINT",            icon: Shield },
  { id: "alertas", label: "Alertas",          icon: AlertTriangle },
  { id: "impacto", label: "Impacto España",   icon: TrendingUp },
  { id: "espana",  label: "Presencia Española", icon: Map },
  { id: "ia",      label: "Análisis IA",      icon: Brain },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Dark Plotly geo layout shared ─────────────────────────────────────────────
const GEO_LAYOUT_BASE = {
  paper_bgcolor: "rgba(0,0,0,0)",
  geo: {
    bgcolor: "rgba(0,0,0,0)",
    landcolor: "#0d1829",
    oceancolor: "#050A14",
    coastlinecolor: "rgba(148,163,184,0.15)",
    countrycolor: "rgba(148,163,184,0.1)",
    showland: true, showocean: true,
    showcoastlines: true, showframe: false,
    projection: { type: "natural earth" as const },
  },
  margin: { l: 0, r: 0, t: 0, b: 0 },
  font: { color: "#94A3B8", family: "-apple-system, SF Pro, sans-serif", size: 11 },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab]         = useState<TabId>("teatro");
  const [horasOsint, setHorasOsint]  = useState(24);
  const [urgMin, setUrgMin]          = useState(1);
  const [catFilter, setCatFilter]    = useState("todas");
  const [dimFilter, setDimFilter]    = useState("todas");
  const [sevMin, setSevMin]          = useState(2);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: kpis } = useQuery({
    queryKey: ["geo", "kpis"],
    queryFn: () => endpoints.geopolitica.kpis(),
    staleTime: 300_000, refetchInterval: 600_000,
  });
  const { data: geoStatsRaw, isLoading: loadingStats } = useQuery({
    queryKey: ["geo", "geo-stats"],
    queryFn: () => endpoints.geopolitica.geoStats(),
    staleTime: 300_000, refetchInterval: 600_000,
  });
  const { data: riesgoPaisRaw, isLoading: loadingPaises } = useQuery({
    queryKey: ["geo", "riesgo-pais"],
    queryFn: () => endpoints.geopolitica.riesgoPais({ interes_min: 0.2, limit: 30 }),
    staleTime: 600_000, refetchInterval: 1_200_000,
  });
  const { data: osintRaw, isLoading: loadingOsint } = useQuery({
    queryKey: ["geo", "osint", horasOsint, urgMin, catFilter],
    queryFn: () => endpoints.geopolitica.osintFeed({
      horas: horasOsint, urgencia_min: urgMin, relevancia_min: 0.3,
      categoria: catFilter !== "todas" ? catFilter : undefined, limit: 60,
    }),
    staleTime: 120_000, refetchInterval: 300_000,
  });
  const { data: osintStatsRaw } = useQuery({
    queryKey: ["geo", "osint-stats"],
    queryFn: () => endpoints.geopolitica.osintStats(),
    staleTime: 300_000,
  });
  const { data: alertasRaw, isLoading: loadingAlertas } = useQuery({
    queryKey: ["geo", "alertas"],
    queryFn: () => endpoints.geopolitica.alertasGeo({ limite: 60 }),
    staleTime: 120_000, refetchInterval: 300_000,
  });
  const { data: impactosRaw, isLoading: loadingImpactos } = useQuery({
    queryKey: ["geo", "impactos", dimFilter, sevMin],
    queryFn: () => endpoints.geopolitica.impactosGeo({
      dimension: dimFilter !== "todas" ? dimFilter : undefined,
      severidad_min: sevMin, limit: 30,
    }),
    staleTime: 300_000,
  });
  const { data: presenciaRaw, isLoading: loadingPresencia } = useQuery({
    queryKey: ["geo", "presencia"],
    queryFn: () => endpoints.geopolitica.presenciaGeo(),
    staleTime: 3_600_000,
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const paises: RiesgoPaisItem[]  = riesgoPaisRaw?.data ?? [];
  const osint: OsintItem[]        = osintRaw?.data ?? [];
  const alertas: AlertaGeo[]      = alertasRaw?.data ?? [];
  const impactos: ImpactoGeo[]    = impactosRaw?.data ?? [];
  const presencia: PresenciaItem[] = presenciaRaw?.data ?? [];
  const alertasCount: Record<string,number> = geoStatsRaw?.alertas_count ?? {};
  const geoStats: Record<string,number>     = geoStatsRaw?.stats ?? {};

  const fuentesMap = useMemo(() => {
    const m: Record<string, { n: number; maxUrg: number }> = {};
    osint.forEach(it => {
      const f = it.fuente ?? "—";
      m[f] = m[f] ?? { n: 0, maxUrg: 1 };
      m[f].n++;
      m[f].maxUrg = Math.max(m[f].maxUrg, it.urgencia);
    });
    return Object.entries(m).sort((a,b) => b[1].maxUrg - a[1].maxUrg || b[1].n - a[1].n).slice(0, 15);
  }, [osint]);

  const alertasByCriticidad = useMemo(() => {
    const groups: Record<string, AlertaGeo[]> = { CRITICO: [], ALTO: [], MEDIO: [], BAJO: [] };
    alertas.forEach(a => { (groups[a.nivel] ??= []).push(a); });
    return groups;
  }, [alertas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <span className="label-cap">Inteligencia geopolítica</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Geopolítica & RRII</h1>
          {(alertasCount.CRITICO ?? 0) > 0 && (
            <span className="badge badge-red animate-pulse">
              ⚠ {alertasCount.CRITICO} CRÍTICO
            </span>
          )}
        </div>
        <p className="text-text2 text-sm mt-1">
          OSINT · ACLED · GDELT · Análisis LLM — Impacto sobre intereses españoles
        </p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Críticos 24h</div>
          <div className="text-2xl font-bold text-red1">{kpis?.eventos_criticos_24h ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Países escalada</div>
          <div className="text-2xl font-bold text-amber1">{kpis?.paises_escalada_7d ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">OSINT 24h</div>
          <div className="text-2xl font-bold text-cyan1">{geoStats.osint_24h ?? kpis?.fuentes_internacionales ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Alertas ALTO+</div>
          <div className="text-2xl font-bold text-amber1">
            {(alertasCount.CRITICO ?? 0) + (alertasCount.ALTO ?? 0) || "—"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Impacto ESP alto</div>
          <div className="text-2xl font-bold text-blue1">{kpis?.impacto_espana_alto_7d ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Países monitorizados</div>
          <div className="text-2xl font-bold text-green1">{paises.length || "—"}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bg3 rounded-xl w-fit border border-border1">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          const badge = t.id === "alertas"
            ? (alertasCount.CRITICO ?? 0) + (alertasCount.ALTO ?? 0)
            : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? "bg-bg2 text-text1 border border-border1"
                  : "text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {t.label}
              {badge > 0 && (
                <span className="badge badge-red text-[9px] px-1.5 py-0">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Teatro Global ────────────────────────────────────────────── */}
      {tab === "teatro" && (
        <div className="space-y-5">
          {/* Mapa + lista */}
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-5">
            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
                Mapa de Riesgo Global
              </h2>
              {loadingPaises ? (
                <div className="h-[380px] animate-pulse bg-bg3/30 rounded-lg" />
              ) : paises.length === 0 ? (
                <div className="h-[380px] flex items-center justify-center text-text2 text-sm">
                  Sin datos de riesgo país disponibles
                </div>
              ) : (
                <Plot
                  data={[{
                    type: "scattergeo",
                    lat: paises.map(p => p.lat_capital ?? 0),
                    lon: paises.map(p => p.lon_capital ?? 0),
                    text: paises.map(p =>
                      `${p.flag_emoji ?? ""} ${p.nombre}<br>Riesgo: ${p.score_total?.toFixed(1)}/10<br>Interés ESP: ${Math.round((p.interes_espana ?? 0) * 100)}%`
                    ),
                    mode: "markers",
                    marker: {
                      size: paises.map(p => Math.max(8, (p.score_total ?? 0) * 2.8)),
                      color: paises.map(p => p.score_total ?? 0),
                      colorscale: [[0,"#10B981"],[0.5,"#F59E0B"],[1,"#EF4444"]],
                      cmin: 0, cmax: 10,
                      colorbar: {
                        title: "Riesgo", thickness: 10, len: 0.7,
                        tickfont: { color: "#94A3B8", size: 9 },
                        titlefont: { color: "#94A3B8", size: 10 },
                      },
                      line: { width: 0.5, color: "rgba(0,0,0,0.3)" },
                      opacity: 0.9,
                    },
                    hovertemplate: "%{text}<extra></extra>",
                  }] as any}
                  layout={{
                    ...GEO_LAYOUT_BASE,
                    height: 380,
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%" }}
                />
              )}
            </section>

            <aside className="premium-card overflow-y-auto" style={{ maxHeight: 460 }}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">
                Top Países · Riesgo × Interés
              </h2>
              {loadingPaises ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-bg3/30 rounded-lg mb-2" />
                ))
              ) : (
                [...paises]
                  .sort((a,b) => (b.score_total * b.interes_espana) - (a.score_total * a.interes_espana))
                  .slice(0, 15)
                  .map((p, i) => {
                    const sc = riskColor(p.score_total);
                    const trend = { subiendo: "↑", bajando: "↓", estable: "→" }[p.riesgo_tendencia ?? ""] ?? "→";
                    const trendCls = p.riesgo_tendencia === "subiendo" ? "text-red1"
                      : p.riesgo_tendencia === "bajando" ? "text-green1" : "text-muted";
                    return (
                      <div key={i} className="p-2.5 rounded-lg border border-border1 hover:border-cyan1/30 transition mb-2 bg-bg/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-text1">
                            {p.flag_emoji} {p.nombre}
                          </span>
                          <span className={`text-xs font-mono font-bold ${trendCls}`}>
                            {trend} {p.score_total?.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="h-1 bg-bg3 rounded-full overflow-hidden mb-1.5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(p.score_total / 10) * 100}%`, backgroundColor: sc }}
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-muted">
                            Interés: {Math.round((p.interes_espana ?? 0) * 100)}%
                          </span>
                          {(p.empresas_espanolas ?? []).slice(0,2).map(e => (
                            <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-bg3 text-text2 border border-border1">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </aside>
          </div>

          {/* Scatter matrix */}
          {paises.length > 4 && (
            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">
                Matriz Riesgo × Interés España
              </h2>
              <Plot
                data={[{
                  type: "scatter",
                  x: paises.map(p => p.interes_espana ?? 0),
                  y: paises.map(p => p.score_total ?? 0),
                  mode: "markers+text",
                  text: paises.map(p => `${p.flag_emoji ?? ""} ${p.nombre}`),
                  textposition: "top center",
                  textfont: { size: 9, color: "#64748B" },
                  marker: {
                    size: paises.map(p => Math.max(10, (p.score_total ?? 0) * (p.interes_espana ?? 0) * 20)),
                    color: paises.map(p => p.score_total ?? 0),
                    colorscale: [[0,"#10B981"],[0.5,"#F59E0B"],[1,"#EF4444"]],
                    cmin: 0, cmax: 10, opacity: 0.85,
                    line: { width: 1, color: "rgba(148,163,184,0.2)" },
                  },
                  hovertemplate: "<b>%{text}</b><br>Interés: %{x:.0%}<br>Riesgo: %{y:.1f}/10<extra></extra>",
                }] as any}
                layout={{
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "#050A14",
                  height: 280,
                  margin: { l: 50, r: 20, t: 10, b: 50 },
                  xaxis: {
                    title: { text: "Interés para España", font: { color: "#94A3B8", size: 11 } },
                    gridcolor: "rgba(148,163,184,0.08)",
                    tickformat: ".0%", zeroline: false,
                    tickfont: { color: "#94A3B8", size: 10 },
                  },
                  yaxis: {
                    title: { text: "Score Riesgo", font: { color: "#94A3B8", size: 11 } },
                    gridcolor: "rgba(148,163,184,0.08)",
                    zeroline: false, tickfont: { color: "#94A3B8", size: 10 },
                  },
                  shapes: [
                    { type: "line", x0: 0, x1: 1, y0: 7, y1: 7,
                      line: { color: "#EF4444", dash: "dot", width: 1 } },
                    { type: "line", x0: 0.6, x1: 0.6, y0: 0, y1: 10,
                      line: { color: "#00D4FF", dash: "dot", width: 1 } },
                  ],
                  font: { color: "#94A3B8" },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%" }}
              />
            </section>
          )}
        </div>
      )}

      {/* ── TAB: OSINT ───────────────────────────────────────────────────── */}
      {tab === "osint" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="premium-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">
                  Ventana temporal
                </label>
                <select
                  value={horasOsint}
                  onChange={e => setHorasOsint(+e.target.value)}
                  className="w-full bg-bg3 border border-border1 rounded px-2.5 py-1.5 text-xs text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {[6,12,24,48,72,168].map(h => (
                    <option key={h} value={h}>Últimas {h}h</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">
                  Urgencia mín.
                </label>
                <select
                  value={urgMin}
                  onChange={e => setUrgMin(+e.target.value)}
                  className="w-full bg-bg3 border border-border1 rounded px-2.5 py-1.5 text-xs text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {[1,2,3,4,5].map(u => <option key={u} value={u}>≥ {u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">
                  Categoría
                </label>
                <select
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  className="w-full bg-bg3 border border-border1 rounded px-2.5 py-1.5 text-xs text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {["todas","conflicto_armado","terrorismo","diplomacia","energia",
                    "migracion","ciberseguridad","defensa","economia_politica"].map(c => (
                    <option key={c} value={c}>{c === "todas" ? "Todas" : c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="kpi-card text-center">
                    <div className="text-[9px] text-muted uppercase">Total corpus</div>
                    <div className="text-lg font-bold text-cyan1">{(osintStatsRaw as any)?.total ?? 0}</div>
                  </div>
                  <div className="kpi-card text-center">
                    <div className="text-[9px] text-muted uppercase">LLM proc.</div>
                    <div className="text-lg font-bold text-purple-400">{(osintStatsRaw as any)?.procesados_llm ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_200px] gap-5">
            {/* Fuentes sidebar */}
            <aside className="premium-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">
                Fuentes activas
              </h3>
              {loadingOsint ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse bg-bg3/30 rounded mb-1.5" />
                ))
              ) : (
                fuentesMap.map(([fname, fd]) => {
                  const maxUrgCls = fd.maxUrg >= 4 ? "bg-red1" : fd.maxUrg >= 3 ? "bg-amber1" : fd.maxUrg >= 2 ? "bg-cyan1" : "bg-green1";
                  return (
                    <div key={fname} className="flex items-center justify-between py-1.5 border-b border-border1/40">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-text2 truncate">{fname}</div>
                        <div className={`h-0.5 rounded-full mt-1 ${maxUrgCls} opacity-60`}
                          style={{ width: `${Math.min(100, fd.n * 15)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-text2 ml-2 shrink-0">{fd.n}</span>
                    </div>
                  );
                })
              )}
            </aside>

            {/* Main feed */}
            <div className="space-y-3">
              {loadingOsint ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse bg-bg3/30 rounded-lg" />
                ))
              ) : osint.length === 0 ? (
                <div className="premium-card text-center py-10 text-text2 text-sm">
                  Sin señales OSINT para este filtro
                </div>
              ) : (
                osint.slice(0, 25).map((item, i) => (
                  <div
                    key={i}
                    className={`premium-card border-l-4 ${urgBorder(item.urgencia)}`}
                    style={{ padding: "14px 16px" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-text1 leading-snug flex-1">
                        {item.titulo}
                      </span>
                      <div className="shrink-0 text-right">
                        <div className={`text-xs font-black ${urgColor(item.urgencia)}`}>
                          U{item.urgencia}
                        </div>
                        <div className="text-[10px] text-muted">
                          ESP {Math.round((item.relevancia_espana ?? 0) * 100)}%
                        </div>
                      </div>
                    </div>
                    {item.resumen_ollama && (
                      <p className="text-xs text-text2 mt-2 line-clamp-2 leading-relaxed">
                        {item.resumen_ollama}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                      {item.categoria && (
                        <span className="badge badge-cyan text-[9px]">{item.categoria}</span>
                      )}
                      {(item.paises_mencionados ?? []).slice(0,3).map(p => (
                        <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-bg3 text-muted border border-border1/40">{p}</span>
                      ))}
                      <span className="text-[10px] text-muted">{item.fuente}</span>
                      {item.procesado_llm && <span className="text-[9px] text-cyan1 font-bold">LLM</span>}
                      <span className="text-[10px] text-muted ml-auto">{timeAgo(item.fecha_publicacion)}</span>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer"
                          className="text-cyan1 hover:text-cyan1/80 transition">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Señales débiles */}
            <aside className="premium-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-1">
                Señales débiles
              </h3>
              <p className="text-[10px] text-muted mb-3">Horizonte 30-90d</p>
              {osint.filter(i => i.urgencia <= 2).slice(0, 10).map((s, i) => (
                <div key={i} className="py-2.5 border-b border-border1/40">
                  <div className="text-[11px] text-text2 line-clamp-2 leading-snug mb-1">
                    {s.titulo?.slice(0, 90)}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted">
                    <span className="truncate">{s.fuente}</span>
                    <span className="text-cyan1 shrink-0 ml-1">
                      {Math.round((s.relevancia_espana ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
              {osint.filter(i => i.urgencia <= 2).length === 0 && (
                <p className="text-xs text-muted italic">Sin señales débiles</p>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ── TAB: Alertas ─────────────────────────────────────────────────── */}
      {tab === "alertas" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["CRITICO","ALTO","MEDIO","BAJO"].map(nivel => (
              <div key={nivel} className="kpi-card">
                <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{nivel}</div>
                <div className={`text-2xl font-bold ${
                  nivel === "CRITICO" ? "text-red1" :
                  nivel === "ALTO"    ? "text-amber1" :
                  nivel === "MEDIO"   ? "text-cyan1" : "text-green1"
                }`}>
                  {alertasCount[nivel] ?? 0}
                </div>
              </div>
            ))}
          </div>
          {loadingAlertas ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-bg3/30 rounded-lg" />
            ))
          ) : alertas.length === 0 ? (
            <div className="premium-card text-center py-10 text-text2 text-sm">
              Sin alertas geopolíticas activas
            </div>
          ) : (
            ["CRITICO","ALTO","MEDIO","BAJO"].map(nivel => {
              const items = alertasByCriticidad[nivel] ?? [];
              if (!items.length) return null;
              return (
                <div key={nivel}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`badge ${nivelBadge(nivel)}`}>{nivel}</span>
                    <span className="text-xs text-muted">{items.length} alertas</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a, i) => (
                      <div key={i} className={`premium-card border-l-4 ${
                        nivel === "CRITICO" ? "border-l-red1" :
                        nivel === "ALTO"    ? "border-l-amber1" :
                        nivel === "MEDIO"   ? "border-l-cyan1/60" : "border-l-border1"
                      }`} style={{ padding: "12px 16px" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`badge ${nivelBadge(a.nivel)} text-[9px]`}>{a.nivel}</span>
                              <span className="text-sm font-semibold text-text1">{a.titulo}</span>
                            </div>
                            {a.descripcion && (
                              <p className="text-xs text-text2 leading-relaxed mb-2">
                                {a.descripcion}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {(a.paises ?? []).map(p => (
                                <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-bg3 text-text2 border border-border1/40">{p}</span>
                              ))}
                              {a.url_origen && (
                                <a href={a.url_origen} target="_blank" rel="noreferrer"
                                  className="text-[10px] text-cyan1 flex items-center gap-0.5 hover:underline">
                                  fuente <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[10px] text-muted">{fmtDate(a.creada_en)}</div>
                            {!a.leida && (
                              <div className="w-2 h-2 rounded-full bg-cyan1 mt-1.5 ml-auto" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: Impacto España ──────────────────────────────────────────── */}
      {tab === "impacto" && (
        <div className="space-y-5">
          <div className="premium-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">
                  Dimensión
                </label>
                <select
                  value={dimFilter}
                  onChange={e => setDimFilter(e.target.value)}
                  className="w-full bg-bg3 border border-border1 rounded px-2.5 py-1.5 text-xs text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {["todas","energia","economia","seguridad","migracion",
                    "diplomacia","comercio","defensa","ciberseguridad"].map(d => (
                    <option key={d} value={d}>{d === "todas" ? "Todas" : d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">
                  Severidad mín.
                </label>
                <select
                  value={sevMin}
                  onChange={e => setSevMin(+e.target.value)}
                  className="w-full bg-bg3 border border-border1 rounded px-2.5 py-1.5 text-xs text-text1 focus:border-cyan1 focus:outline-none"
                >
                  {[1,2,3,4,5].map(s => <option key={s} value={s}>≥ {s}</option>)}
                </select>
              </div>
              <div className="kpi-card">
                <div className="text-[10px] text-muted uppercase">Impactos activos</div>
                <div className="text-xl font-bold text-cyan1">{impactos.length}</div>
              </div>
              <div className="kpi-card">
                <div className="text-[10px] text-muted uppercase">Severidad ≥4</div>
                <div className="text-xl font-bold text-red1">
                  {impactos.filter(i => i.severidad >= 4).length}
                </div>
              </div>
            </div>
          </div>

          {loadingImpactos ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-bg3/30 rounded-lg" />
            ))
          ) : impactos.length === 0 ? (
            <div className="premium-card text-center py-10 text-text2 text-sm">
              Sin impactos para el filtro seleccionado
            </div>
          ) : (
            [...impactos].sort((a,b) => b.severidad - a.severidad).map((imp, i) => {
              const horizonCls = {
                inmediato: "text-red1", corto_plazo: "text-amber1",
                medio_plazo: "text-cyan1", largo_plazo: "text-green1",
              }[imp.horizonte ?? ""] ?? "text-muted";
              return (
                <div key={i} className={`premium-card border-l-4 ${
                  imp.severidad >= 4 ? "border-l-red1" :
                  imp.severidad >= 3 ? "border-l-amber1" : "border-l-cyan1/50"
                }`} style={{ padding: "14px 16px" }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-text1 flex-1 leading-snug">
                      {imp.titulo}
                    </span>
                    <div className="shrink-0 text-right">
                      <div className={`text-sm font-bold font-mono ${sevColor(imp.severidad)}`}>
                        SEV {imp.severidad}/5
                      </div>
                      <div className={`text-[10px] ${horizonCls}`}>{imp.horizonte}</div>
                      {imp.probabilidad != null && (
                        <div className="text-[10px] text-muted">
                          P={Math.round(imp.probabilidad * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                  {imp.descripcion && (
                    <p className="text-xs text-text2 mt-2 line-clamp-3 leading-relaxed">
                      {imp.descripcion}
                    </p>
                  )}
                  {imp.recomendacion && (
                    <div className="flex items-start gap-1.5 mt-2.5">
                      <ChevronRight className="w-3 h-3 text-cyan1 mt-0.5 shrink-0" />
                      <p className="text-xs text-cyan1 line-clamp-2 leading-relaxed">
                        {imp.recomendacion}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(imp.sectores_afectados ?? []).map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-bg3 text-text2 border border-border1/40">{s}</span>
                    ))}
                    {(imp.empresas_afectadas ?? []).map(e => (
                      <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-amber1/10 text-amber1 border border-amber1/20">{e}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: Presencia Española ──────────────────────────────────────── */}
      {tab === "espana" && (
        <div className="space-y-5">
          <section className="premium-card">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
              Presencia Global Española
            </h2>
            {loadingPresencia ? (
              <div className="h-[400px] animate-pulse bg-bg3/30 rounded-lg" />
            ) : presencia.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-text2 text-sm">
                Sin datos de presencia española disponibles
              </div>
            ) : (
              <Plot
                data={(() => {
                  const cats = ["militar","energetica","empresarial","diplomatica","diaspora"];
                  const catColors: Record<string,string> = {
                    militar: "#EF4444", energetica: "#F59E0B",
                    empresarial: "#3B82F6", diplomatica: "#00D4FF", diaspora: "#A78BFA",
                  };
                  return cats.map(cat => {
                    const items = presencia.filter(p =>
                      (p.categoria ?? p.tipo_presencia) === cat
                    );
                    return {
                      type: "scattergeo",
                      lat: items.map(p => p.lat ?? 0),
                      lon: items.map(p => p.lon ?? 0),
                      text: items.map(p => `${p.pais_nombre ?? p.pais}<br>${p.descripcion ?? ""}`),
                      mode: "markers",
                      name: cat,
                      marker: {
                        size: 10, color: catColors[cat], opacity: 0.88,
                        line: { width: 0.5, color: "rgba(0,0,0,0.3)" },
                      },
                      hovertemplate: "%{text}<extra></extra>",
                    } as any;
                  });
                })()}
                layout={{
                  ...GEO_LAYOUT_BASE,
                  height: 420,
                  legend: {
                    bgcolor: "rgba(5,10,20,0.8)", bordercolor: "rgba(148,163,184,0.15)",
                    borderwidth: 1, font: { size: 11, color: "#94A3B8" },
                    orientation: "h" as const, y: -0.06,
                  },
                  margin: { l: 0, r: 0, t: 0, b: 40 },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%" }}
              />
            )}
          </section>
        </div>
      )}

      {/* ── TAB: Análisis IA ─────────────────────────────────────────────── */}
      {tab === "ia" && (
        <section className="premium-card text-center py-12">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-lg font-bold text-text1 mb-2">Análisis IA · Politeia Brain</h2>
          <p className="text-text2 text-sm mb-4 max-w-md mx-auto">
            Conecta el endpoint{" "}
            <code className="bg-bg3 text-cyan1 px-1.5 py-0.5 rounded text-xs">
              /geopolitica/analisis-pais
            </code>{" "}
            al Brain para análisis LLM en tiempo real de cualquier país en el monitor.
          </p>
          <div className="flex items-center gap-3 justify-center flex-wrap">
            {paises.slice(0, 6).map(p => (
              <button
                key={p.nombre}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg3 border border-border1 text-text2 hover:border-cyan1/40 hover:text-text1 transition"
              >
                {p.flag_emoji} {p.nombre}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-4">
            Próxima funcionalidad — integración con Politeia Brain vía{" "}
            <code className="text-cyan1/80">/api/geo/analisis-pais</code>
          </p>
        </section>
      )}
    </div>
  );
}
