"use client";

import { useState } from "react";
import { Users, Search, TrendingUp, TrendingDown, Minus, Network, ChevronRight } from "lucide-react";
import { DEMO_ACTORS, DEMO_PARTIES } from "@/lib/fixtures/actors";
import { ModeBadge } from "@/components/status/mode-badge";

const ROLES = ["Presidente", "Líder", "Portavoz", "Secretario", "Ministro"];

function SentimentIcon({ s }: { s: "up" | "down" | "stable" }) {
  if (s === "up") return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (s === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export default function ActoresPage() {
  const [parties, setParties] = useState<string[]>([]);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");

  const toggleParty = (p: string) => {
    setParties(parties.includes(p) ? parties.filter(x => x !== p) : [...parties, p]);
  };

  const filtered = DEMO_ACTORS.filter(a => {
    if (parties.length && !parties.includes(a.party)) return false;
    if (role && !a.role.toLowerCase().includes(role.toLowerCase())) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const topExposure = [...DEMO_ACTORS].sort((a, b) => b.exposure - a.exposure).slice(0, 5);

  const partyCounts = DEMO_PARTIES.map(p => ({
    ...p,
    count: DEMO_ACTORS.filter(a => a.party === p.code).length
  })).filter(p => p.count > 0);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Mapa de Actores</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Mapa de Actores</h1>
          <ModeBadge mode="demo" source="fixtures" message="Datos de ejemplo — API en desarrollo" />
        </div>
        <p className="text-text2 text-sm mt-1">Dirigentes, portavoces y líderes con seguimiento de exposición y aprobación pública.</p>
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
          {DEMO_PARTIES.map(p => (
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

      {/* Top exposure */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Actores con mayor exposición esta semana</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {topExposure.map(a => (
            <div key={a.id} className="p-3 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/40 transition cursor-pointer">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                style={{ background: `linear-gradient(135deg, ${a.partyColor}, #00D4FF)` }}
              >
                {initials(a.name)}
              </div>
              <div className="text-sm font-semibold text-text1 leading-tight">{a.name}</div>
              <div className="text-[10px] uppercase text-muted mt-0.5">{a.party}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-cyan1 font-mono text-xs">{a.exposure}</span>
                <SentimentIcon s={a.sentiment} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Actor grid */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Directorio ({filtered.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(a => (
              <div
                key={a.id}
                className="premium-card hover:border-cyan1/40 transition cursor-pointer group"
                style={{ borderLeftColor: a.partyColor, borderLeftWidth: 3 }}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${a.partyColor}, #3B82F6)` }}
                  >
                    {initials(a.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">{a.name}</div>
                    <div className="text-[10px] uppercase text-muted">{a.party}</div>
                  </div>
                </div>
                <div className="text-xs text-text2 mb-1">{a.role}</div>
                <div className="text-[11px] text-muted mb-3 line-clamp-1">{a.bio}</div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Exposición</span><span className="text-cyan1 font-mono">{a.exposure}</span>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${a.exposure}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text2">Aprobación: <span className="text-text1 font-mono">{a.approval}%</span></span>
                    <a className="text-cyan1 hover:underline flex items-center gap-0.5">
                      Ver dossier <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="premium-card">
            <Users className="w-4 h-4 text-cyan1 mb-2" />
            <div className="text-2xl font-bold text-text1">{DEMO_ACTORS.length}</div>
            <div className="text-[11px] text-muted">Actores monitorizados</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
