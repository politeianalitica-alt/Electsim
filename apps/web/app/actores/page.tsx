"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users, Search, TrendingUp, TrendingDown, Minus, Network, ChevronRight } from "lucide-react";
import { endpoints, type PersonaPublica } from "@/lib/api/endpoints";

// Mapa partido → color (el backend no siempre los devuelve)
const PARTY_COLORS: Record<string, string> = {
  PSOE:    "#E03A3E",
  PP:      "#1F77FF",
  VOX:     "#5BC035",
  Sumar:   "#D81E5B",
  SUMAR:   "#D81E5B",
  Junts:   "#00C2A8",
  JUNTS:   "#00C2A8",
  ERC:     "#F4B400",
  PNV:     "#1D8042",
  Bildu:   "#A4D65E",
  "EH Bildu": "#A4D65E",
  Podemos: "#6E2A78",
  Independiente: "#94A3B8",
};

const PARTIES_FILTER = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "PNV", "Bildu", "Podemos"];
const ROLES = ["Presidente", "Líder", "Portavoz", "Secretario", "Ministro"];

function partyColor(partyCode?: string): string {
  if (!partyCode) return "#94A3B8";
  return PARTY_COLORS[partyCode] || PARTY_COLORS[partyCode.toUpperCase()] || "#94A3B8";
}

function SentimentIcon({ s }: { s?: string }) {
  if (s === "ascendente" || s === "up") return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (s === "descendente" || s === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(p => p[0] || "").join("").toUpperCase();
}

export default function ActoresPage() {
  const [parties, setParties] = useState<string[]>([]);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");

  // Datos reales desde /intelligence/personas
  const partidoFilter = parties.length === 1 ? parties[0] : undefined;
  const { data: actors = [], isLoading } = useQuery({
    queryKey: ["personas", partidoFilter, search],
    queryFn: () => endpoints.intelligence.personasList({
      partido: partidoFilter,
      search:  search.trim() || undefined,
      limit:   100,
    }),
    staleTime: 120_000,
  });

  const toggleParty = (p: string) => {
    setParties(parties.includes(p) ? parties.filter(x => x !== p) : [...parties, p]);
  };

  // Filtros locales adicionales (multi-partido, role)
  const filtered = useMemo(() => {
    return actors.filter(a => {
      if (parties.length > 1 && a.partido && !parties.includes(a.partido)) return false;
      if (role && a.cargo_actual && !a.cargo_actual.toLowerCase().includes(role.toLowerCase())) return false;
      return true;
    });
  }, [actors, parties, role]);

  const topExposure = useMemo(() => {
    return [...actors]
      .sort((a, b) => (b.score_influencia ?? 0) - (a.score_influencia ?? 0))
      .slice(0, 5);
  }, [actors]);

  const partyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    actors.forEach(a => {
      if (a.partido) counts[a.partido] = (counts[a.partido] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([code, count]) => ({ code, color: partyColor(code), count }))
      .sort((a, b) => b.count - a.count);
  }, [actors]);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Mapa de Actores</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Mapa de Actores</h1>
        <p className="text-text2 text-sm mt-1">
          Dirigentes, portavoces y líderes con seguimiento de exposición y aprobación pública.
          {!isLoading && actors.length > 0 && <span className="ml-2 text-cyan1">{actors.length} actores en BD</span>}
        </p>
      </header>

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
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1"
          >
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {PARTIES_FILTER.map(code => (
            <button
              key={code}
              onClick={() => toggleParty(code)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                parties.includes(code)
                  ? "border-cyan1 bg-cyan1/10 text-cyan1"
                  : "border-border1 text-text2 hover:border-cyan1/40"
              }`}
              style={parties.includes(code) ? {} : { borderLeftColor: partyColor(code), borderLeftWidth: 3 }}
            >
              {code}
            </button>
          ))}
        </div>
      </section>

      {/* Top exposure */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Mayor influencia</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg animate-pulse h-32 bg-bg3/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topExposure.map(a => {
              const color = partyColor(a.partido);
              return (
                <div key={a.id} className="p-3 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/40 transition cursor-pointer">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                    style={{ background: `linear-gradient(135deg, ${color}, #00D4FF)` }}
                  >
                    {initials(a.nombre_completo)}
                  </div>
                  <div className="text-sm font-semibold text-text1 leading-tight">{a.nombre_completo}</div>
                  <div className="text-[10px] uppercase text-muted mt-0.5">{a.partido || "—"}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-cyan1 font-mono text-xs">{a.score_influencia ?? "—"}</span>
                    <SentimentIcon s={a.tendencia_sentimiento}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Actor grid */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Directorio ({filtered.length})</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="premium-card animate-pulse h-40 bg-bg3/30" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="premium-card text-center py-10 text-muted text-sm">
              <Users className="w-8 h-8 text-muted mx-auto mb-2" />
              <p>Sin actores en /intelligence/personas con estos filtros.</p>
              <p className="text-[11px] mt-2">Quita filtros o verifica que la tabla persona_publica tenga datos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(a => {
                const color = partyColor(a.partido);
                const exposure = Math.round(a.score_influencia ?? 0);
                const sentiment = a.sentimiento_actual ?? 0;
                return (
                  <Link
                    key={a.id}
                    href={`/actores/${a.id}`}
                    className="premium-card hover:border-cyan1/40 transition cursor-pointer group block"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, #3B82F6)` }}
                      >
                        {initials(a.nombre_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">{a.nombre_completo}</div>
                        <div className="text-[10px] uppercase text-muted">{a.partido || "—"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-text2 mb-1">{a.cargo_actual || "—"}</div>
                    <div className="text-[11px] text-muted mb-3 line-clamp-1">{a.ambito || a.tipo || ""}</div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted mb-0.5">
                          <span>Influencia</span><span className="text-cyan1 font-mono">{exposure}</span>
                        </div>
                        <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${Math.min(100, exposure)}%`, transition: "width 600ms ease" }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text2">
                          Sentimiento: <span className={sentiment > 0 ? "text-green1 font-mono" : sentiment < 0 ? "text-red1 font-mono" : "text-text1 font-mono"}>
                            {sentiment > 0 ? "+" : ""}{sentiment.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-cyan1 hover:underline flex items-center gap-0.5 cursor-pointer">
                          Ver dossier <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="premium-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Resumen por partido</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 animate-pulse bg-bg3/30 rounded" />)}
              </div>
            ) : (
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
            )}
          </div>
          <button className="w-full premium-card hover:border-cyan1/40 transition text-left flex items-center gap-3 group">
            <Network className="w-5 h-5 text-cyan1" />
            <div className="flex-1">
              <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">Red de relaciones</div>
              <div className="text-[11px] text-muted">/intelligence/personas/&#123;id&#125;/grafo</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
          <div className="premium-card">
            <Users className="w-4 h-4 text-cyan1 mb-2" />
            <div className="text-2xl font-bold text-text1">{actors.length}</div>
            <div className="text-[11px] text-muted">Actores monitorizados</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
