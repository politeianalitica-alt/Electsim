"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type Actor } from "@/lib/api/endpoints";
import { Users, Search, TrendingUp, TrendingDown, Minus, Network, ChevronRight, AlertTriangle } from "lucide-react";

const PARTIES: { code: string; color: string }[] = [
  { code: "PSOE",      color: "#E03A3E" },
  { code: "PP",        color: "#1F77FF" },
  { code: "VOX",       color: "#5BC035" },
  { code: "Sumar",     color: "#D81E5B" },
  { code: "Junts",     color: "#00C2A8" },
  { code: "ERC",       color: "#F4B400" },
  { code: "PNV",       color: "#1D8042" },
  { code: "Bildu",     color: "#A4D65E" },
  { code: "Podemos",   color: "#6E2A78" },
];

const PARTY_COLORS: Record<string, string> = Object.fromEntries(PARTIES.map(p => [p.code, p.color]));

function partyColor(partido?: string): string {
  if (!partido) return "#64748B";
  const found = PARTIES.find(p => partido.toLowerCase().includes(p.code.toLowerCase()));
  return found?.color ?? "#64748B";
}

function SentimentIcon({ s }: { s?: string; val?: number }) {
  const trend = s ?? "";
  if (trend === "subiendo" || trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (trend === "bajando" || trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function influenceToDisplay(score: number): number {
  // DB stores raw mention count; normalize to 0-100 for display
  return Math.min(Math.round(score), 100);
}

function approvalFromSentiment(s: number): number {
  // Map [-1, 1] → [0, 100]
  return Math.round(((s + 1) / 2) * 100);
}

export default function ActoresPage() {
  const [parties, setParties] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data: actors = [], isLoading, isError } = useQuery({
    queryKey: ["actors", "list"],
    queryFn: () =>
      endpoints.actorsList({ limit: 100 })
        .then((r: any) => (Array.isArray(r) ? r : r?.actors ?? []))
        .catch(() => [] as Actor[]),
    staleTime: 2 * 60 * 1000,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["actors", "dashboard"],
    queryFn: () => endpoints.actorsDashboard().catch(() => ({})),
    staleTime: 5 * 60 * 1000,
  });

  const { data: signals = [] } = useQuery({
    queryKey: ["signals", "activas"],
    queryFn: () => endpoints.signalsActivas(3).catch(() => []),
    staleTime: 60 * 1000,
  });

  const toggleParty = (p: string) => {
    setParties(parties.includes(p) ? parties.filter(x => x !== p) : [...parties, p]);
  };

  const filtered = actors.filter((a: Actor) => {
    if (parties.length && !parties.some(p => (a.partido ?? "").toLowerCase().includes(p.toLowerCase()))) return false;
    if (search && !a.nombre_completo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const topInfluencia = [...actors].sort((a: Actor, b: Actor) => b.score_influencia - a.score_influencia).slice(0, 5);

  const partyCounts = PARTIES.map(p => ({
    ...p,
    count: actors.filter((a: Actor) => (a.partido ?? "").toLowerCase().includes(p.code.toLowerCase())).length,
  })).filter(p => p.count > 0);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Mapa de Actores</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Mapa de Actores</h1>
        <p className="text-text2 text-sm mt-1">
          {isLoading ? "Cargando..." : `${actors.length} actores monitorizados`}
          {isError && " · Datos de referencia activos"}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Actores activos</div>
          <div className="text-2xl font-bold text-cyan1">{(dashboard as any)?.actores_activos ?? actors.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Riesgo alto</div>
          <div className="text-2xl font-bold text-red1">{(dashboard as any)?.actores_riesgo_alto ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Señales sin leer</div>
          <div className="text-2xl font-bold text-amber1">{(dashboard as any)?.señales_sin_leer ?? signals.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Partidos</div>
          <div className="text-2xl font-bold text-text1">{(dashboard as any)?.n_partidos ?? PARTIES.length}</div>
        </div>
      </div>

      {/* Active signals strip */}
      {signals.length > 0 && (
        <div className="premium-card border-amber1/30 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber1">Señales activas</span>
          </div>
          {signals.slice(0, 3).map((s: any) => (
            <div key={s.id} className="flex items-start gap-3 p-2 rounded-lg bg-bg/50 border border-border1">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.urgencia >= 4 ? "bg-red1" : "bg-amber1"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text1 font-medium truncate">{s.titulo}</div>
                <div className="text-xs text-text2 mt-0.5 line-clamp-1">{s.resumen}</div>
              </div>
              <span className="text-[10px] text-muted shrink-0">{s.modulo_origen}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <section className="premium-card">
        <div className="flex items-center gap-3 mb-3">
          <Search className="w-4 h-4 text-cyan1" />
          <input
            type="text"
            placeholder="Buscar actor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PARTIES.map(p => (
            <button
              key={p.code}
              onClick={() => toggleParty(p.code)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                parties.includes(p.code)
                  ? "border-cyan1 bg-cyan1/10 text-cyan1"
                  : "border-border1 text-text2 hover:border-cyan1/40"
              }`}
              style={parties.includes(p.code) ? {} : { borderLeftColor: p.color, borderLeftWidth: 3 }}
            >
              {p.code}
            </button>
          ))}
        </div>
      </section>

      {/* Top influencia */}
      {topInfluencia.length > 0 && (
        <section className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Mayor influencia esta semana</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topInfluencia.map((a: Actor) => (
              <div key={a.id} className="p-3 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/40 transition cursor-pointer">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                  style={{ background: `linear-gradient(135deg, ${partyColor(a.partido)}, #00D4FF)` }}
                >
                  {initials(a.nombre_completo)}
                </div>
                <div className="text-sm font-semibold text-text1 leading-tight">{a.nombre_completo}</div>
                <div className="text-[10px] uppercase text-muted mt-0.5">{a.partido}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-cyan1 font-mono text-xs">{influenceToDisplay(a.score_influencia)}</span>
                  <SentimentIcon s={a.tendencia_sentimiento} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Actor grid */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              Directorio ({filtered.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="premium-card animate-pulse h-36 bg-bg3" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((a: Actor) => {
                const pColor = partyColor(a.partido);
                const approval = approvalFromSentiment(a.sentimiento_actual ?? 0);
                const influence = influenceToDisplay(a.score_influencia);
                return (
                  <div
                    key={a.id}
                    className="premium-card hover:border-cyan1/40 transition cursor-pointer group"
                    style={{ borderLeftColor: pColor, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${pColor}, #3B82F6)` }}
                      >
                        {initials(a.nombre_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">
                          {a.nombre_completo}
                        </div>
                        <div className="text-[10px] uppercase text-muted">{a.partido}</div>
                      </div>
                      {a.score_riesgo >= 7 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red1 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-text2 mb-1">{a.cargo_actual}</div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted mb-0.5">
                          <span>Influencia</span>
                          <span className="text-cyan1 font-mono">{influence}</span>
                        </div>
                        <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${influence}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text2">
                          Sentimiento: <span className="text-text1 font-mono">{approval}%</span>
                        </span>
                        <SentimentIcon s={a.tendencia_sentimiento} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="premium-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Resumen por partido</h3>
            <ul className="space-y-2">
              {partyCounts.map(p => (
                <li key={p.code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-text1">{p.code}</span>
                  </div>
                  <span className="text-muted font-mono">{p.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <button className="w-full premium-card hover:border-cyan1/40 transition text-left flex items-center gap-3 group">
            <Network className="w-5 h-5 text-cyan1" />
            <div className="flex-1">
              <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">Red de relaciones</div>
              <div className="text-[11px] text-muted">Visualizar grafo de actores</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
          <div className="kpi-card">
            <Users className="w-4 h-4 text-cyan1 mb-2" />
            <div className="text-2xl font-bold text-text1">{actors.length}</div>
            <div className="text-[11px] text-muted">Actores monitorizados</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
