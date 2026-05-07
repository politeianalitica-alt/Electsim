"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe2, AlertTriangle, Flag, Anchor } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

function riskColor(r: number) {
  if (r >= 80) return "#EF4444";
  if (r >= 60) return "#F59E0B";
  if (r >= 40) return "#3B82F6";
  return "#10B981";
}

function statusBadge(s: string) {
  if (s === "war") return "badge-red";
  if (s === "tense") return "badge-amber";
  return "badge-blue";
}

function levelBadge(l: string) {
  if (l === "high") return "badge-red";
  if (l === "medium") return "badge-amber";
  return "badge-blue";
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch { return iso; }
}

export default function GeopoliticaPage() {
  const { data: kpis } = useQuery({
    queryKey: ["geo", "kpis"],
    queryFn: () => endpoints.geopolitica.kpis(),
    staleTime: 300_000,
    refetchInterval: 600_000,
  });

  const { data: countries = [], isLoading: loadingCountries } = useQuery({
    queryKey: ["geo", "countries"],
    queryFn: () => endpoints.geopolitica.countryRisk(),
    staleTime: 3_600_000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["geo", "events"],
    queryFn: () => endpoints.geopolitica.events(20),
    staleTime: 300_000,
    refetchInterval: 600_000,
  });

  const { data: presence = [] } = useQuery({
    queryKey: ["geo", "presence"],
    queryFn: () => endpoints.geopolitica.spainPresence(),
    staleTime: 86_400_000, // 24h
  });

  // KPI strip
  const kpiList = [
    { label: "Eventos críticos 24h",  value: kpis?.eventos_criticos_24h    ?? 0, color: "text-red1" },
    { label: "Países con escalada",   value: kpis?.paises_escalada_7d      ?? 0, color: "text-amber1" },
    { label: "Conflictos activos",    value: kpis?.conflictos_activos      ?? 0, color: "text-red1" },
    { label: "Impacto España (7d)",   value: kpis?.impacto_espana_alto_7d  ?? 0, color: "text-cyan1" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Geopolítica</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Geopolítica & RRII</h1>
        <p className="text-text2 text-sm mt-1">
          Eventos internacionales, riesgo país e impacto sobre los intereses españoles.
          {kpis?.fuentes_internacionales != null && (
            <span className="ml-2 text-cyan1">{kpis.fuentes_internacionales} medios internacionales</span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiList.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Country grid */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de riesgo país</h2>
        </div>
        {loadingCountries ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-border1 animate-pulse h-24 bg-bg3/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {countries.map(c => (
              <div
                key={c.code + c.name}
                className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
                style={{ borderLeftColor: riskColor(c.risk), borderLeftWidth: 3 }}
                title={`Artículos 7d: ${c.n_articles_7d} · Impacto España alto: ${c.n_high_impact}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Flag className="w-3.5 h-3.5 text-text2" />
                  <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{c.code}</span>
                  {c.delta_7d !== 0 && (
                    <span className={`text-[9px] font-mono ml-auto ${c.delta_7d > 0 ? "text-red1" : "text-green1"}`}>
                      {c.delta_7d > 0 ? "▲" : "▼"}{Math.abs(c.delta_7d)}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-text1 leading-tight mb-1.5">{c.name}</div>
                <div className="flex items-center justify-between">
                  <span className={`badge ${statusBadge(c.status)}`}>
                    {c.status === "war" ? "Guerra" : c.status === "tense" ? "Tenso" : "Vigilar"}
                  </span>
                  <span className="font-mono text-xs" style={{ color: riskColor(c.risk) }}>{c.risk}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Eventos recientes</h2>
          </div>
          <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loadingEvents ? (
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 animate-pulse h-24 bg-bg3/30" />
              ))
            ) : events.length > 0 ? (
              events.map((e, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyan1 font-mono">{fmtDate(e.date)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted">{e.country}</span>
                    </div>
                    <span className="badge badge-cyan">{e.type}</span>
                  </div>
                  <p className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug mb-2">
                    {e.description || e.title}
                  </p>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Impacto sobre España</span>
                      <span className="font-mono" style={{ color: riskColor(e.impact) }}>{e.impact}</span>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${e.impact}%`, backgroundColor: riskColor(e.impact), transition: "width 600ms ease" }} />
                    </div>
                  </div>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan1 hover:underline mt-2 inline-block">
                      {e.source ?? "Ver fuente"} →
                    </a>
                  )}
                </li>
              ))
            ) : (
              <li className="text-xs text-muted italic">Sin eventos relevantes en los últimos 7 días.</li>
            )}
          </ul>
        </section>

        {/* Presence */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Presencia española en el exterior</h2>
          </div>
          <ul className="space-y-3">
            {presence.map((p, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-text1">{p.territory}</h3>
                  <span className={`badge ${levelBadge(p.level)} shrink-0`}>
                    {p.level === "high" ? "Alta" : p.level === "medium" ? "Media" : "Baja"}
                  </span>
                </div>
                <p className="text-xs text-text2 leading-relaxed">{p.status}</p>
                {p.context && (
                  <p className="text-[10px] text-muted mt-1 italic">{p.context}</p>
                )}
                {p.last_updated && (
                  <p className="text-[9px] text-muted mt-1.5">Actualizado: {p.last_updated}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
