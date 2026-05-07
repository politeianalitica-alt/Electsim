"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Globe2, AlertTriangle, Flag, Anchor, RefreshCw } from "lucide-react";

function riskColor(r: number) {
  if (r >= 80) return "#EF4444";
  if (r >= 60) return "#F59E0B";
  if (r >= 40) return "#3B82F6";
  return "#10B981";
}

function statusBadge(s: string) {
  if (s === "war" || s === "guerra") return "badge-red";
  if (s === "tense" || s === "tenso") return "badge-amber";
  return "badge-blue";
}

function statusLabel(s: string) {
  if (s === "war" || s === "guerra") return "Guerra";
  if (s === "tense" || s === "tenso") return "Tenso";
  return "Vigilar";
}

function levelBadge(l: string) {
  if (l === "high" || l === "alta") return "badge-red";
  if (l === "medium" || l === "media") return "badge-amber";
  return "badge-blue";
}

function levelLabel(l: string) {
  if (l === "high" || l === "alta") return "Alta";
  if (l === "medium" || l === "media") return "Media";
  return "Baja";
}

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function GeopoliticaPage() {
  const { data: kpis, refetch: refetchKpis } = useQuery({
    queryKey: ["geo", "kpis"],
    queryFn: () => endpoints.geoKpis().catch(() => null),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });

  const { data: eventos = [], isLoading: loadingEventos, refetch } = useQuery({
    queryKey: ["geo", "eventos"],
    queryFn: () => endpoints.geoEventos(7).catch(() => []),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 8 * 60 * 1000,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["geo", "riesgo-pais"],
    queryFn: () => endpoints.geoRiesgoPais().catch(() => []),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 25 * 60 * 1000,
  });

  const { data: presencia = [] } = useQuery({
    queryKey: ["geo", "presencia"],
    queryFn: () => endpoints.geoPresenciaEspana().catch(() => []),
    staleTime: 60 * 60 * 1000,
  });

  const kpiItems = kpis ?? { eventos_criticos_24h: "—", paises_escalada: "—", conflictos_activos: "—", sanctions_espana: "—" };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia / Geopolítica</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Geopolítica & RRII</h1>
          <p className="text-text2 text-sm mt-1">Eventos internacionales, riesgo país e impacto sobre los intereses españoles.</p>
        </div>
        <button
          onClick={() => { refetch(); refetchKpis(); }}
          className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loadingEventos ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Eventos críticos 24h</div>
          <div className="text-2xl font-bold text-red1">{kpiItems.eventos_criticos_24h ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Países con escalada</div>
          <div className="text-2xl font-bold text-amber1">{kpiItems.paises_escalada ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Conflictos activos</div>
          <div className="text-2xl font-bold text-red1">{kpiItems.conflictos_activos ?? "—"}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Sanciones afectan ES</div>
          <div className="text-2xl font-bold text-cyan1">{kpiItems.sanctions_espana ?? "—"}</div>
        </div>
      </div>

      {/* Country grid */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de riesgo país</h2>
          <span className="ml-auto badge badge-cyan">{countries.length} países</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {countries.map((c: any) => (
            <div
              key={c.code}
              className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
              style={{ borderLeftColor: riskColor(c.risk), borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Flag className="w-3.5 h-3.5 text-text2" />
                <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{c.code}</span>
              </div>
              <div className="text-sm font-bold text-text1 leading-tight mb-1.5">{c.name}</div>
              <div className="flex items-center justify-between">
                <span className={`badge ${statusBadge(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
                <span className="font-mono text-xs" style={{ color: riskColor(c.risk) }}>{c.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Eventos esta semana</h2>
            <span className="ml-auto badge badge-amber">{eventos.length}</span>
          </div>
          {eventos.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin eventos registrados.</p>
          ) : (
            <ul className="space-y-3">
              {eventos.map((e: any, i: number) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyan1 font-mono">{formatDate(e.date ?? e.fecha_evento)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted">{e.country ?? e.pais_principal}</span>
                    </div>
                    <span className="badge badge-cyan">{e.type ?? e.tipo_evento}</span>
                  </div>
                  <p className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug mb-2">
                    {e.description ?? e.titulo}
                  </p>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Impacto sobre España</span>
                      <span className="font-mono" style={{ color: riskColor(e.impact ?? e.impacto_espana ?? 0) }}>
                        {e.impact ?? e.impacto_espana ?? 0}
                      </span>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${e.impact ?? e.impacto_espana ?? 0}%`,
                          backgroundColor: riskColor(e.impact ?? e.impacto_espana ?? 0),
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Presence */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Presencia española en el exterior</h2>
          </div>
          {presencia.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin datos de presencia.</p>
          ) : (
            <ul className="space-y-3">
              {presencia.map((p: any, i: number) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-text1">{p.territory ?? p.territorio}</h3>
                    <span className={`badge ${levelBadge(p.level ?? p.nivel_alerta)} shrink-0`}>
                      {levelLabel(p.level ?? p.nivel_alerta)}
                    </span>
                  </div>
                  <p className="text-xs text-text2 leading-relaxed">{p.status ?? p.estado}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
