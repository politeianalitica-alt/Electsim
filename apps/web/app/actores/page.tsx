"use client";

import { useState } from "react";
import { Users, Search, TrendingUp, TrendingDown, Minus, Network, ChevronRight } from "lucide-react";

type Actor = {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  role: string;
  bio: string;
  exposure: number;
  approval: number;
  sentiment: "up" | "down" | "stable";
};

const PARTIES: { code: string; color: string }[] = [
  { code: "PSOE", color: "#E03A3E" },
  { code: "PP", color: "#1F77FF" },
  { code: "VOX", color: "#5BC035" },
  { code: "Sumar", color: "#D81E5B" },
  { code: "Junts", color: "#00C2A8" },
  { code: "ERC", color: "#F4B400" },
  { code: "PNV", color: "#1D8042" },
  { code: "Bildu", color: "#A4D65E" },
  { code: "Podemos", color: "#6E2A78" }
];

const ROLES = ["Presidente", "Líder", "Portavoz", "Secretario", "Ministro"];

const ACTORS: Actor[] = [
  { id: "1", name: "Pedro Sánchez", party: "PSOE", partyColor: "#E03A3E", role: "Presidente del Gobierno", bio: "Secretario General del PSOE desde 2017.", exposure: 96, approval: 38, sentiment: "down" },
  { id: "2", name: "Alberto Núñez Feijóo", party: "PP", partyColor: "#1F77FF", role: "Líder de la oposición", bio: "Presidente del PP desde 2022.", exposure: 91, approval: 42, sentiment: "up" },
  { id: "3", name: "Santiago Abascal", party: "VOX", partyColor: "#5BC035", role: "Presidente", bio: "Líder y fundador de VOX.", exposure: 78, approval: 28, sentiment: "stable" },
  { id: "4", name: "Yolanda Díaz", party: "Sumar", partyColor: "#D81E5B", role: "Vicepresidenta segunda", bio: "Ministra de Trabajo y líder de Sumar.", exposure: 74, approval: 36, sentiment: "down" },
  { id: "5", name: "Isabel Díaz Ayuso", party: "PP", partyColor: "#1F77FF", role: "Presidenta CAM", bio: "Presidenta de la Comunidad de Madrid.", exposure: 88, approval: 45, sentiment: "up" },
  { id: "6", name: "Carles Puigdemont", party: "Junts", partyColor: "#00C2A8", role: "Presidente", bio: "Expresidente de la Generalitat.", exposure: 71, approval: 22, sentiment: "stable" },
  { id: "7", name: "Oriol Junqueras", party: "ERC", partyColor: "#F4B400", role: "Presidente", bio: "Líder histórico de ERC.", exposure: 58, approval: 27, sentiment: "down" },
  { id: "8", name: "Ione Belarra", party: "Podemos", partyColor: "#6E2A78", role: "Secretaria General", bio: "Líder de Podemos desde 2021.", exposure: 49, approval: 19, sentiment: "down" },
  { id: "9", name: "Andoni Ortuzar", party: "PNV", partyColor: "#1D8042", role: "Presidente EBB", bio: "Presidente del PNV desde 2013.", exposure: 41, approval: 35, sentiment: "stable" },
  { id: "10", name: "Aitor Esteban", party: "PNV", partyColor: "#1D8042", role: "Portavoz Congreso", bio: "Portavoz del PNV en el Congreso.", exposure: 47, approval: 38, sentiment: "stable" },
  { id: "11", name: "Gabriel Rufián", party: "ERC", partyColor: "#F4B400", role: "Portavoz Congreso", bio: "Portavoz de ERC en el Congreso.", exposure: 62, approval: 24, sentiment: "up" },
  { id: "12", name: "Iván Espinosa de los Monteros", party: "Independiente", partyColor: "#94A3B8", role: "Empresario", bio: "Ex portavoz parlamentario de VOX.", exposure: 38, approval: 32, sentiment: "stable" },
  { id: "13", name: "Cuca Gamarra", party: "PP", partyColor: "#1F77FF", role: "Secretaria General", bio: "Secretaria General del PP.", exposure: 55, approval: 31, sentiment: "stable" },
  { id: "14", name: "Félix Bolaños", party: "PSOE", partyColor: "#E03A3E", role: "Ministro de Justicia", bio: "Ministro de la Presidencia y Justicia.", exposure: 67, approval: 33, sentiment: "down" },
  { id: "15", name: "Patxi López", party: "PSOE", partyColor: "#E03A3E", role: "Portavoz Congreso", bio: "Portavoz del PSOE en el Congreso.", exposure: 53, approval: 36, sentiment: "stable" },
  { id: "16", name: "Mertxe Aizpurua", party: "Bildu", partyColor: "#A4D65E", role: "Portavoz Congreso", bio: "Portavoz de EH Bildu en el Congreso.", exposure: 44, approval: 26, sentiment: "up" },
  { id: "17", name: "María Jesús Montero", party: "PSOE", partyColor: "#E03A3E", role: "Vicepresidenta primera", bio: "Vicepresidenta y ministra de Hacienda.", exposure: 64, approval: 32, sentiment: "down" },
  { id: "18", name: "Borja Sémper", party: "PP", partyColor: "#1F77FF", role: "Portavoz nacional", bio: "Vicesecretario de Cultura del PP.", exposure: 51, approval: 37, sentiment: "up" },
  { id: "19", name: "Pablo Bustinduy", party: "Sumar", partyColor: "#D81E5B", role: "Ministro Derechos Sociales", bio: "Ministro y dirigente de Sumar.", exposure: 39, approval: 29, sentiment: "stable" },
  { id: "20", name: "Salvador Illa", party: "PSOE", partyColor: "#E03A3E", role: "Presidente Generalitat", bio: "Presidente de la Generalitat de Cataluña.", exposure: 69, approval: 41, sentiment: "up" },
  { id: "21", name: "Jorge Buxadé", party: "VOX", partyColor: "#5BC035", role: "Eurodiputado", bio: "Vicepresidente de Acción Política de VOX.", exposure: 35, approval: 23, sentiment: "stable" },
  { id: "22", name: "Ernest Urtasun", party: "Sumar", partyColor: "#D81E5B", role: "Ministro de Cultura", bio: "Ministro y dirigente de Sumar.", exposure: 42, approval: 28, sentiment: "stable" },
  { id: "23", name: "Marta Lois", party: "Sumar", partyColor: "#D81E5B", role: "Portavoz Congreso", bio: "Portavoz de Sumar en el Congreso.", exposure: 31, approval: 25, sentiment: "down" },
  { id: "24", name: "Mariano Rajoy", party: "PP", partyColor: "#1F77FF", role: "Ex Presidente", bio: "Expresidente del Gobierno (2011-2018).", exposure: 24, approval: 30, sentiment: "stable" }
];

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

  const filtered = ACTORS.filter(a => {
    if (parties.length && !parties.includes(a.party)) return false;
    if (role && !a.role.toLowerCase().includes(role.toLowerCase())) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const topExposure = [...ACTORS].sort((a, b) => b.exposure - a.exposure).slice(0, 5);

  const partyCounts = PARTIES.map(p => ({
    ...p,
    count: ACTORS.filter(a => a.party === p.code).length
  })).filter(p => p.count > 0);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Mapa de Actores</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Mapa de Actores</h1>
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
            <div className="text-2xl font-bold text-text1">{ACTORS.length}</div>
            <div className="text-[11px] text-muted">Actores monitorizados</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
