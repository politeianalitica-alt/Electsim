"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Crown, Users2, AlertCircle, RefreshCw } from "lucide-react";

function voteCell(v: string) {
  if (v === "S") return "bg-green1/30 text-green1";
  if (v === "N") return "bg-red1/30 text-red1";
  return "bg-amber1/20 text-amber1";
}

function partyColor(code: string, seats: { partido: string; color: string }[]): string {
  return seats.find(s => s.partido === code)?.color ?? "#94A3B8";
}

function hemicycleSeats(parties: { partido: string; color: string; escanos: number }[]) {
  const ideoOrder = ["Sumar", "Bildu", "ERC", "BNG", "PSOE", "PNV", "Junts", "Otros", "PP", "VOX"];
  const sorted = ideoOrder
    .map(c => parties.find(p => p.partido === c))
    .filter(Boolean) as typeof parties;
  const remaining = parties.filter(p => !ideoOrder.includes(p.partido));
  const ordered = [...sorted, ...remaining];

  const allColors: string[] = [];
  ordered.forEach(p => {
    for (let i = 0; i < p.escanos; i++) allColors.push(p.color);
  });

  const total = allColors.length;
  const rings = 8;
  const cx = 250, cy = 230;
  const ringSeats: number[] = [];
  let totalWeights = 0;
  for (let r = 0; r < rings; r++) totalWeights += r + 1;
  for (let r = 0; r < rings; r++) ringSeats.push(Math.round(((r + 1) / totalWeights) * total));
  ringSeats[rings - 1] += total - ringSeats.reduce((a, b) => a + b, 0);

  const seats: { x: number; y: number; color: string; idx: number }[] = [];
  let placed = 0;
  for (let r = 0; r < rings; r++) {
    const radius = 70 + r * 22;
    const count = ringSeats[r];
    for (let s = 0; s < count; s++) {
      const angle = Math.PI - (s / Math.max(count - 1, 1)) * Math.PI;
      seats.push({
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle),
        color: allColors[placed] || "#94A3B8",
        idx: placed,
      });
      placed++;
    }
  }
  return seats;
}

const VOTE_PARTIES = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "Bildu", "PNV"];

export default function CoalicionPage() {
  const { data: coalData, isLoading: loadingCoal, refetch } = useQuery({
    queryKey: ["coaliciones", "viables"],
    queryFn: () => endpoints.coalicionesViables().catch(() => null),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  });

  const { data: votesData = [] } = useQuery({
    queryKey: ["coaliciones", "votos"],
    queryFn: () => endpoints.coalicionesVotos().catch(() => []),
    staleTime: 10 * 60 * 1000,
  });

  const seats = coalData?.seats ?? [
    { partido: "PP",     color: "#1F77FF", escanos: 137 },
    { partido: "PSOE",   color: "#E03A3E", escanos: 121 },
    { partido: "VOX",    color: "#5BC035", escanos: 33  },
    { partido: "Sumar",  color: "#D81E5B", escanos: 27  },
    { partido: "Junts",  color: "#00C2A8", escanos: 7   },
    { partido: "ERC",    color: "#F4B400", escanos: 7   },
    { partido: "Bildu",  color: "#A4D65E", escanos: 6   },
    { partido: "PNV",    color: "#1D8042", escanos: 5   },
    { partido: "BNG",    color: "#7AC143", escanos: 1   },
    { partido: "Otros",  color: "#94A3B8", escanos: 6   },
  ];

  const coalitions = coalData?.coalitions ?? [
    { members: ["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"], total: 167, distancia: 28, probability: 62, es_minima: false, conflicts: ["Memoria democrática", "Modelo financiación"] },
    { members: ["PP", "VOX"],                                     total: 170, distancia: 18, probability: 71, es_minima: true,  conflicts: ["Política UE", "Agenda climática"] },
    { members: ["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"],total: 173, distancia: 38, probability: 48, es_minima: false, conflicts: ["Catalunya independencia", "Reforma fiscal"] },
    { members: ["PP", "VOX", "Junts"],                            total: 177, distancia: 52, probability: 22, es_minima: false, conflicts: ["Idioma", "Inmigración", "Modelo Estado"] },
    { members: ["PP", "PSOE"],                                    total: 258, distancia: 45, probability: 12, es_minima: true,  conflicts: ["Coalición improbable", "Bloqueo electoral"] },
  ];

  const totalSeats = coalData?.total_seats ?? seats.reduce((a, b) => a + b.escanos, 0);
  const majority = coalData?.majority ?? (Math.floor(totalSeats / 2) + 1);
  const pivotal = coalData?.pivotal_party ?? "Junts";
  const pivotalCount = coalData?.pivotal_coalition_count ?? 0;

  const hemSeats = hemicycleSeats(seats);

  const votes = votesData.length > 0 ? votesData : [
    { topic: "Reforma fiscal",      votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "A" } },
    { topic: "Ley Vivienda",         votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "N", ERC: "S", Bildu: "S", PNV: "S" } },
    { topic: "RDL fondos UE",        votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
    { topic: "Memoria Democrática",  votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
    { topic: "Reforma reglamento",   votes: { PSOE: "S", PP: "S", VOX: "N", Sumar: "S", Junts: "A", ERC: "A", Bildu: "A", PNV: "S" } },
    { topic: "Salario mínimo",       votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
    { topic: "Defensa OTAN",         votes: { PSOE: "S", PP: "S", VOX: "S", Sumar: "N", Junts: "A", ERC: "N", Bildu: "N", PNV: "S" } },
    { topic: "Ley Amnistía",         votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "A" } },
    { topic: "Sanidad pública",      votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
    { topic: "Ley audiovisual",      votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia / Gobierno & Coalición</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Gobierno & Coalición</h1>
          <p className="text-text2 text-sm mt-1">Composición del Congreso, escenarios de coalición viables y patrones de voto.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loadingCoal ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hemicycle */}
        <section className="premium-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              Composición del Congreso ({totalSeats})
            </h2>
            <span className="badge badge-blue">mayoría: {majority}</span>
          </div>
          <svg viewBox="0 0 500 270" className="w-full">
            {hemSeats.map(s => (
              <circle key={s.idx} cx={s.x} cy={s.y} r="4.5" fill={s.color} stroke="#0D1320" strokeWidth="0.8">
                <title>{seats.find(p => p.color === s.color)?.partido ?? ""}</title>
              </circle>
            ))}
            <text x="250" y="263" textAnchor="middle" fontSize="10" fill="#64748B">
              Mayoría absoluta: {majority} escaños
            </text>
          </svg>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {seats.map(p => (
              <div key={p.partido} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-text1 font-semibold">{p.partido}</span>
                <span className="text-muted font-mono">{p.escanos}</span>
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
            {coalitions.map((c, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    {c.total} esc. {c.total >= majority ? "✓" : "✗"} {c.es_minima ? "· mín." : ""}
                  </div>
                  <span className={`font-mono text-sm ${c.probability >= 60 ? "text-green1" : c.probability >= 40 ? "text-amber1" : "text-muted"}`}>
                    {c.probability}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.members.map(m => (
                    <span
                      key={m}
                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                      style={{ backgroundColor: partyColor(m, seats) }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-muted mb-1">Distancia ideológica</div>
                <div className="h-1 bg-bg3 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-green1 to-red1" style={{ width: `${c.distancia}%` }} />
                </div>
                {c.conflicts.length > 0 && (
                  <div className="text-[11px] text-amber1 truncate">Tensiones: {c.conflicts.join(", ")}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Pivotal party */}
      <section className="premium-card border-l-4" style={{ borderLeftColor: partyColor(pivotal, seats) }}>
        <div className="flex items-start gap-3">
          <Crown className="w-6 h-6 text-amber1 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber1 mb-1">Kingmaker / Partido pivotal</div>
            <h3 className="text-lg font-bold text-text1">{pivotal}</h3>
            <p className="text-sm text-text2 mt-1">
              Partido con mayor capacidad de bloqueo estructural según el análisis de Shapley.
              {pivotalCount > 0 && ` Aparece en ${pivotalCount} escenarios de coalición viables.`}
            </p>
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-text2">Escaños: <span className="text-cyan1 font-mono">
                {seats.find(s => s.partido === pivotal)?.escanos ?? "—"}
              </span></span>
              {pivotalCount > 0 && (
                <span className="text-text2">Coaliciones pivotales: <span className="text-cyan1 font-mono">{pivotalCount}</span></span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Voting matrix */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
            Patrón de voto — últimas {votes.length} votaciones
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted font-normal">Iniciativa</th>
                {VOTE_PARTIES.map(p => (
                  <th key={p} className="p-2 text-center">
                    <span className="font-semibold" style={{ color: partyColor(p, seats) }}>{p}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {votes.map((v: any, i: number) => (
                <tr key={i} className="border-t border-border1">
                  <td className="p-2 text-text1">{v.topic ?? v.titulo ?? v.topic_label}</td>
                  {VOTE_PARTIES.map(p => {
                    const voteVal = (v.votes ?? v.votos ?? {})[p] ?? "—";
                    return (
                      <td key={p} className="p-1 text-center">
                        <span className={`inline-block w-7 py-0.5 rounded text-[10px] font-bold ${voteVal !== "—" ? voteCell(voteVal) : "text-muted"}`}>
                          {voteVal}
                        </span>
                      </td>
                    );
                  })}
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
    </div>
  );
}
