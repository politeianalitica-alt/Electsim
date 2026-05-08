"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Users2, AlertCircle, Check, X, Map, Target, RefreshCw, Download } from "lucide-react";

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

const HUB_TABS = [
  { id: "coaliciones", label: "Coaliciones", icon: Crown },
  { id: "propensity",  label: "Propensity",  icon: Target },
] as const;
type HubTab = typeof HUB_TABS[number]["id"];

interface SwingDistrict { [k: string]: unknown }
interface OportunidadesResponse { n_secciones?: number; secciones?: Array<Record<string, unknown>>; [k: string]: unknown }

const PARTIDOS_PROP = ["pp", "psoe", "vox", "sumar", "junts", "erc", "pnv"];
const CCAA_OPT = ["", "Andalucía", "Cataluña", "Madrid", "Valencia", "País Vasco", "Galicia"];

type PartySeat = { code: string; seats: number; color: string };

const PARTIES: PartySeat[] = [
  { code: "PP",     seats: 137, color: "#1F77FF" },
  { code: "PSOE",   seats: 121, color: "#E03A3E" },
  { code: "VOX",    seats: 33,  color: "#5BC035" },
  { code: "Sumar",  seats: 27,  color: "#D81E5B" },
  { code: "Junts",  seats: 7,   color: "#00C2A8" },
  { code: "ERC",    seats: 7,   color: "#F4B400" },
  { code: "Bildu",  seats: 6,   color: "#A4D65E" },
  { code: "PNV",    seats: 5,   color: "#1D8042" },
  { code: "BNG",    seats: 1,   color: "#7AC143" },
  { code: "Otros",  seats: 6,   color: "#94A3B8" }
];

const COALITIONS = [
  { members: ["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"], total: 167, distance: 28, probability: 62, conflicts: ["Memoria democrática", "Modelo financiación"] },
  { members: ["PP", "VOX"], total: 170, distance: 18, probability: 71, conflicts: ["Política UE", "Agenda climática"] },
  { members: ["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"], total: 173, distance: 38, probability: 48, conflicts: ["Catalunya independencia", "Reforma fiscal"] },
  { members: ["PP", "VOX", "Junts"], total: 177, distance: 52, probability: 22, conflicts: ["Idioma", "Inmigración", "Modelo Estado"] },
  { members: ["PP", "PSOE"], total: 258, distance: 45, probability: 12, conflicts: ["Coalición improbable", "Bloqueo electoral"] }
];

const VOTES = [
  { topic: "Reforma fiscal", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "A" } },
  { topic: "Ley Vivienda", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "N", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "RDL fondos UE", votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Memoria Democrática", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Reforma reglamento", votes: { PSOE: "S", PP: "S", VOX: "N", Sumar: "S", Junts: "A", ERC: "A", Bildu: "A", PNV: "S" } },
  { topic: "Salario mínimo", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Defensa OTAN", votes: { PSOE: "S", PP: "S", VOX: "S", Sumar: "N", Junts: "A", ERC: "N", Bildu: "N", PNV: "S" } },
  { topic: "Ley audiovisual", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Sanidad pública", votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Ley Amnistía", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "A" } }
];

const VOTE_PARTIES = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "Bildu", "PNV"];

function voteCell(v: string) {
  if (v === "S") return "bg-green1/30 text-green1";
  if (v === "N") return "bg-red1/30 text-red1";
  return "bg-amber1/20 text-amber1";
}

// Hemicycle generation: 350 seats arranged in semicircle rings
function hemicycleSeats() {
  const seats: { x: number; y: number; color: string; idx: number }[] = [];
  const ordered: PartySeat[] = [...PARTIES];
  // Order seats left-to-right by ideology approximation
  const ideoOrder = ["Sumar", "Bildu", "ERC", "BNG", "PSOE", "PNV", "Junts", "Otros", "PP", "VOX"];
  const sortedParties = ideoOrder
    .map(c => ordered.find(p => p.code === c))
    .filter(Boolean) as PartySeat[];

  const allSeatColors: string[] = [];
  sortedParties.forEach(p => {
    for (let i = 0; i < p.seats; i++) allSeatColors.push(p.color);
  });

  const total = 350;
  const rings = 8;
  const cx = 250;
  const cy = 230;
  let placed = 0;
  const ringSeats: number[] = [];
  // Allocate seats per ring proportional to ring index (outer rings hold more)
  let totalWeights = 0;
  for (let r = 0; r < rings; r++) totalWeights += r + 1;
  for (let r = 0; r < rings; r++) {
    ringSeats.push(Math.round(((r + 1) / totalWeights) * total));
  }
  // Adjust last to match exactly
  const diff = total - ringSeats.reduce((a, b) => a + b, 0);
  ringSeats[rings - 1] += diff;

  for (let r = 0; r < rings; r++) {
    const radius = 70 + r * 22;
    const count = ringSeats[r];
    for (let s = 0; s < count; s++) {
      const angle = Math.PI - (s / (count - 1)) * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy - radius * Math.sin(angle);
      seats.push({ x, y, color: allSeatColors[placed] || "#94A3B8", idx: placed });
      placed++;
    }
  }
  return seats;
}

export default function CoalicionPage() {
  const [hubTab, setHubTab] = useState<HubTab>("coaliciones");
  const seats = hemicycleSeats();
  const totalSeats = PARTIES.reduce((a, b) => a + b.seats, 0);
  const majority = Math.ceil(totalSeats / 2) + 1;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Gobierno & Coalición</span>
        <h1 className="text-3xl font-bold text-text1 mt-1">Gobierno & Coalición</h1>
        <p className="text-text2 text-sm mt-1">Composición del Congreso, escenarios de coalición viables y patrones de voto.</p>
      </header>

      {/* Hub tabs */}
      <div className="border-b border-border1 flex gap-1">
        {HUB_TABS.map(t => {
          const Icon = t.icon;
          const active = hubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setHubTab(t.id)}
              className={`px-4 py-2 -mb-px text-sm flex items-center gap-2 border-b-2 transition ${
                active ? "border-cyan1 text-cyan1 font-semibold" : "border-transparent text-text2 hover:text-text1"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {hubTab === "propensity" && <PropensityTab/>}

      {hubTab === "coaliciones" && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hemicycle */}
        <section className="premium-card lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Composición del Congreso (350)</h2>
          <svg viewBox="0 0 500 270" className="w-full">
            {seats.map(s => (
              <circle key={s.idx} cx={s.x} cy={s.y} r="4.5" fill={s.color} stroke="#0D1320" strokeWidth="0.8" />
            ))}
            <text x="250" y="265" textAnchor="middle" className="fill-text2 text-[10px]">Mayoría absoluta: {majority}</text>
          </svg>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {PARTIES.map(p => (
              <div key={p.code} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-text1 font-semibold">{p.code}</span>
                <span className="text-muted font-mono">{p.seats}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Coalitions */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Users2 className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Coaliciones viables</h2>
          </div>
          <ul className="space-y-3">
            {COALITIONS.map((c, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted flex items-center gap-1.5">
                    {c.total} escaños
                    {c.total >= majority
                      ? <Check className="w-3 h-3 text-green1 inline"/>
                      : <X className="w-3 h-3 text-red1 inline"/>}
                  </div>
                  <span className="text-cyan1 font-mono text-sm">{c.probability}%</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.members.map(m => {
                    const p = PARTIES.find(x => x.code === m);
                    return (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style={{ backgroundColor: p?.color || "#94A3B8" }}>
                        {m}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted mb-1">Distancia ideológica</div>
                <div className="h-1 bg-bg3 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-green1 to-red1" style={{ width: `${c.distance}%` }} />
                </div>
                {c.conflicts.length > 0 && (
                  <div className="text-[11px] text-amber1">Tensiones: {c.conflicts.join(", ")}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Pivotal */}
      <section className="premium-card border-l-4" style={{ borderLeftColor: "#F4B400" }}>
        <div className="flex items-start gap-3">
          <Crown className="w-6 h-6 text-amber1 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber1 mb-1">Kingmaker / Partido pivotal</div>
            <h3 className="text-lg font-bold text-text1">Junts per Catalunya</h3>
            <p className="text-sm text-text2 mt-1">
              Con 7 escaños y posición pivotal en 8 de 10 votaciones recientes, Junts mantiene capacidad de bloqueo
              estructural. Su voto decide la viabilidad legislativa del bloque progresista en materias clave.
            </p>
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-text2">Pivotalidad: <span className="text-cyan1 font-mono">82%</span></span>
              <span className="text-text2">Votos decisivos 2025: <span className="text-cyan1 font-mono">11</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Voting matrix */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Patrón de voto — últimas 10 votaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted font-normal">Iniciativa</th>
                {VOTE_PARTIES.map(p => {
                  const party = PARTIES.find(x => x.code === p);
                  return (
                    <th key={p} className="p-2 text-center">
                      <span className="text-text1 font-semibold" style={{ color: party?.color }}>{p}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {VOTES.map((v, i) => (
                <tr key={i} className="border-t border-border1">
                  <td className="p-2 text-text1">{v.topic}</td>
                  {VOTE_PARTIES.map(p => (
                    <td key={p} className="p-1 text-center">
                      <span className={`inline-block w-7 py-0.5 rounded text-[10px] font-bold ${voteCell((v.votes as any)[p])}`}>
                        {(v.votes as any)[p]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-muted">
          <span><span className="inline-block w-3 h-3 rounded-sm bg-green1/30 mr-1 align-middle" />Sí</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-red1/30 mr-1 align-middle" />No</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-amber1/20 mr-1 align-middle" />Abstención</span>
        </div>
      </section>
      </>
      )}
    </div>
  );
}

// ── Propensity sub-tab ──────────────────────────────────────────────────────
function PropensityTab() {
  const [subTab, setSubTab] = useState<"swing" | "oportunidades">("swing");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-xs">
        {[
          { id: "swing" as const, label: "Swing Districts" },
          { id: "oportunidades" as const, label: "Oportunidades" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-full transition ${
              subTab === t.id
                ? "bg-cyan1 text-bg font-semibold"
                : "bg-bg3 border border-border1 text-text2 hover:text-text1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "swing" && <SwingDistrictsView/>}
      {subTab === "oportunidades" && <OportunidadesView/>}
    </div>
  );
}

function SwingDistrictsView() {
  const [partidoA, setPartidoA] = useState<string>("pp");
  const [partidoB, setPartidoB] = useState<string>("psoe");
  const [n, setN] = useState<number>(50);

  const { data = [], isFetching, refetch } = useQuery<SwingDistrict[]>({
    queryKey: ["propensity", "swing", partidoA, partidoB, n],
    queryFn: () => fetch(
      `${INTEL_BASE}/intelligence/propensity/swing-districts?partido_a=${partidoA}&partido_b=${partidoB}&n=${n}`
    ).then(r => r.json()).catch(() => []),
    staleTime: 5 * 60_000,
  });

  // First 6 columns from response
  const cols = data.length > 0 ? Object.keys(data[0]).slice(0, 6) : [];
  const [shown, setShown] = useState(20);

  return (
    <section className="premium-card">
      <div className="flex items-center gap-3 mb-4 flex-wrap text-xs">
        <select value={partidoA} onChange={e => setPartidoA(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          {PARTIDOS_PROP.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>
        <span className="text-text2">vs</span>
        <select value={partidoB} onChange={e => setPartidoB(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          {PARTIDOS_PROP.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-text2">N</span>
          <input type="range" min="50" max="500" step="10" value={n}
            onChange={e => setN(parseInt(e.target.value))}
            className="w-24 accent-cyan-400"/>
          <span className="font-mono text-text1 w-10">{n}</span>
        </div>
        <button
          onClick={() => refetch()}
          className="ml-auto px-3 py-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}/> Actualizar
        </button>
      </div>

      <div className="mb-3">
        <span className="badge badge-amber">{data.length} secciones competitivas</span>
      </div>

      {isFetching ? (
        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-bg3 rounded animate-pulse"/>)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">Sin datos disponibles.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-text2 border-b border-border1">
                <tr>{cols.map(c => <th key={c} className="text-left py-2 pr-3 font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {data.slice(0, shown).map((row, i) => (
                  <tr key={i} className="border-b border-border1/50 hover:bg-bg3 transition">
                    {cols.map(c => (
                      <td key={c} className="py-2 pr-3 font-mono text-text1">
                        {String(row[c] ?? "—").slice(0, 50)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown < data.length && (
            <button
              onClick={() => setShown(s => s + 20)}
              className="mt-3 px-3 py-1.5 text-xs rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1"
            >
              Mostrar más ({data.length - shown} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function OportunidadesView() {
  const [partido, setPartido] = useState<string>("pp");
  const [umbral, setUmbral] = useState<number>(0.05);
  const [ccaa, setCcaa] = useState<string>("");

  const { data, isFetching, refetch } = useQuery<OportunidadesResponse>({
    queryKey: ["propensity", "oportunidades", partido, umbral, ccaa],
    queryFn: () => {
      const qs = new URLSearchParams({ umbral: String(umbral) });
      if (ccaa) qs.set("ccaa", ccaa);
      return fetch(`${INTEL_BASE}/intelligence/propensity/oportunidades/${partido}?${qs}`)
        .then(r => r.json())
        .catch(() => ({ n_secciones: 0, secciones: [] }));
    },
    staleTime: 5 * 60_000,
  });

  const secciones = data?.secciones ?? [];
  const cols = secciones.length > 0 ? Object.keys(secciones[0]).slice(0, 5) : [];

  const downloadCSV = () => {
    if (secciones.length === 0) return;
    const header = cols.join(",");
    const rows = secciones.map(s => cols.map(c => JSON.stringify(s[c] ?? "")).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `oportunidades-${partido}-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="premium-card">
      <div className="flex items-center gap-3 mb-4 flex-wrap text-xs">
        <span className="text-text2">Partido:</span>
        <select value={partido} onChange={e => setPartido(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          {PARTIDOS_PROP.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>
        <span className="text-text2">Umbral</span>
        <input type="range" min="0.01" max="0.20" step="0.01" value={umbral}
          onChange={e => setUmbral(parseFloat(e.target.value))}
          className="w-24 accent-cyan-400"/>
        <span className="font-mono text-text1 w-10">{umbral.toFixed(2)}</span>
        <select value={ccaa} onChange={e => setCcaa(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          {CCAA_OPT.map(c => <option key={c} value={c}>{c || "Todas CCAA"}</option>)}
        </select>
        <button
          onClick={() => refetch()}
          className="ml-auto px-3 py-1.5 rounded bg-bg3 border border-border1 hover:border-cyan1/40 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}/> Actualizar
        </button>
      </div>

      <div className="kpi-card mb-4">
        <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Secciones con oportunidad</div>
        <div className="text-3xl font-bold text-cyan1 font-mono">{data?.n_secciones ?? 0}</div>
      </div>

      {isFetching ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-bg3 rounded animate-pulse"/>)}
        </div>
      ) : secciones.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">Sin oportunidades sobre el umbral.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-text2 border-b border-border1">
                <tr>{cols.map(c => <th key={c} className="text-left py-2 pr-3 font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {secciones.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-border1/50">
                    {cols.map(c => (
                      <td key={c} className="py-2 pr-3 font-mono text-text1">
                        {String(row[c] ?? "—").slice(0, 50)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={downloadCSV}
            className="mt-3 px-3 py-1.5 text-xs rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1 inline-flex items-center gap-1.5"
          >
            <Download className="w-3 h-3"/> Descargar CSV
          </button>
        </>
      )}
    </section>
  );
}
