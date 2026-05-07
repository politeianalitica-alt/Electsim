"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type NowcastingEstimate } from "@/lib/api/endpoints";
import { RefreshCw, TrendingUp, TrendingDown, Minus, BarChart2, Activity } from "lucide-react";

const PARTY_COLORS: Record<string, string> = {
  PP: "#1F77FF", PSOE: "#E03A3E", VOX: "#5BC035", Sumar: "#D81E5B",
  Junts: "#00C2A8", ERC: "#F4B400", PNV: "#1D8042", Bildu: "#A4D65E",
  Podemos: "#6E2A78",
};

const TIME_WINDOWS = [
  { label: "30d", dias: 30 },
  { label: "60d", dias: 60 },
  { label: "90d", dias: 90 },
  { label: "180d", dias: 180 },
  { label: "1a", dias: 365 },
];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 bg-bg3 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

// Guard: API may return numeric fields as strings
function toNum(v: any): number { return Number(v) || 0; }

function CIBadge({ inf, sup }: { inf: any; sup: any }) {
  return (
    <span className="text-[10px] text-muted font-mono">
      [{toNum(inf).toFixed(1)}, {toNum(sup).toFixed(1)}]
    </span>
  );
}

function SparkSeries({ data, color, width = 120, height = 40 }: {
  data: { fecha_estimacion: string; estimacion_pct: any; ic_95_inf: any; ic_95_sup: any }[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const vals = data.map(d => toNum(d.estimacion_pct));
  const min = Math.min(...vals, ...data.map(d => toNum(d.ic_95_inf)));
  const max = Math.max(...vals, ...data.map(d => toNum(d.ic_95_sup)));
  const range = max - min || 1;
  const cnt = data.length;

  const toX = (i: number) => (i / (cnt - 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * height;

  // CI band polygon
  const topPts = data.map((d, i) => `${toX(i)},${toY(toNum(d.ic_95_sup))}`).join(" ");
  const botPts = [...data].reverse().map((d, i) => `${toX(cnt - 1 - i)},${toY(toNum(d.ic_95_inf))}`).join(" ");
  const ciPoly = `${topPts} ${botPts}`;

  // Main line
  const linePts = data.map((d, i) => `${toX(i)},${toY(toNum(d.estimacion_pct))}`).join(" ");
  const lastY = toY(vals[vals.length - 1]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
      <polygon points={ciPoly} fill={color} fillOpacity="0.15" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={width} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

export default function NowcastingPage() {
  const [selectedParty, setSelectedParty] = useState("PP");
  const [timeWindow, setTimeWindow] = useState(90);

  const { data: current = [], isLoading, refetch } = useQuery({
    queryKey: ["nowcasting", "current"],
    queryFn: () => endpoints.nowcastingCurrent().catch(() => []),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const { data: serie = [] } = useQuery({
    queryKey: ["nowcasting", "serie", selectedParty, timeWindow],
    queryFn: () => endpoints.nowcastingSerie(selectedParty, timeWindow).catch(() => []),
    staleTime: 10 * 60 * 1000,
  });

  const { data: casas = [] } = useQuery({
    queryKey: ["nowcasting", "casas"],
    queryFn: () => endpoints.nowcastingCasas().catch(() => []),
    staleTime: 30 * 60 * 1000,
  });

  const maxPct = Math.max(...current.map((e: NowcastingEstimate) => toNum(e.estimacion_pct)), 40);
  const updatedAt = current[0]?.fecha_estimacion
    ? new Date(current[0].fecha_estimacion).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    : "—";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <span className="label-cap">Inteligencia / Nowcasting</span>
          <h1 className="text-3xl font-bold text-text1 mt-1">Nowcasting Electoral</h1>
          <p className="text-text2 text-sm mt-1">
            Estimaciones de voto agregadas · {current.length > 0 ? `${current.length} partidos · ${updatedAt}` : "Cargando..."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-md bg-bg3 border border-border1 hover:border-cyan1/40 text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </header>

      {/* Main party ranking */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Intención de voto — estimación actual</h2>
          <span className="ml-auto badge badge-cyan">{current[0]?.modelo ?? "agregado"}</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-bg3 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {current.map((e: NowcastingEstimate, i: number) => {
              const color = e.color || PARTY_COLORS[e.partido] || "#64748B";
              return (
                <li
                  key={e.partido}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    selectedParty === e.partido ? "border-cyan1/50 bg-bg3" : "border-border1 hover:border-cyan1/30"
                  }`}
                  onClick={() => setSelectedParty(e.partido)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted w-4 text-center">{i + 1}</span>
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-text1">{e.partido}</span>
                        <div className="flex items-center gap-3">
                          <CIBadge inf={e.ic_95_inf} sup={e.ic_95_sup} />
                          <span className="text-lg font-bold tabular-nums" style={{ color }}>
                            {toNum(e.estimacion_pct).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <MiniBar value={toNum(e.estimacion_pct)} max={maxPct} color={color} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time series */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              Evolución — {selectedParty}
            </h2>
            <div className="ml-auto flex items-center gap-1">
              {TIME_WINDOWS.map(w => (
                <button
                  key={w.dias}
                  onClick={() => setTimeWindow(w.dias)}
                  className={`text-[10px] px-2 py-1 rounded border transition ${
                    timeWindow === w.dias
                      ? "border-cyan1 bg-cyan1/10 text-cyan1"
                      : "border-border1 text-muted hover:border-cyan1/40"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {serie.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-muted">Sin datos para {selectedParty}</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <div className="relative" style={{ height: 160 }}>
                <SparkSeries
                  data={serie}
                  color={PARTY_COLORS[selectedParty] || "#00D4FF"}
                  width={600}
                  height={140}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>{serie[0]?.fecha_estimacion ? new Date(serie[0].fecha_estimacion).toLocaleDateString("es-ES") : ""}</span>
                <span className="font-bold text-text1">
                  {toNum(serie[serie.length - 1]?.estimacion_pct).toFixed(1)}%
                </span>
                <span>{serie[serie.length - 1]?.fecha_estimacion ? new Date(serie[serie.length - 1].fecha_estimacion).toLocaleDateString("es-ES") : ""}</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border1 grid grid-cols-4 gap-2 text-center">
            {current.filter((e: NowcastingEstimate) => ["PP", "PSOE", "VOX", "Sumar"].includes(e.partido)).map((e: NowcastingEstimate) => (
              <button
                key={e.partido}
                onClick={() => setSelectedParty(e.partido)}
                className={`p-2 rounded-lg border transition ${
                  selectedParty === e.partido ? "border-cyan1/50 bg-bg3" : "border-border1 hover:border-cyan1/30"
                }`}
              >
                <div className="text-[10px] font-semibold" style={{ color: e.color || PARTY_COLORS[e.partido] }}>
                  {e.partido}
                </div>
                <div className="text-xs font-bold text-text1">{toNum(e.estimacion_pct).toFixed(1)}%</div>
              </button>
            ))}
          </div>
        </section>

        {/* Polling houses */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Casas encuestadoras</h2>
          </div>
          {casas.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Sin datos de cobertura.</p>
          ) : (
            <ul className="space-y-2">
              {casas.map((c: any, i: number) => (
                <li key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg3 transition">
                  <span className="text-[10px] font-mono text-muted w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text1 truncate">{c.casa_encuestadora}</div>
                    <div className="text-[10px] text-muted">
                      muestra ~{Math.round(c.muestra_media).toLocaleString("es-ES")} ·{" "}
                      última: {c.ultima_encuesta ? new Date(c.ultima_encuesta).toLocaleDateString("es-ES") : "—"}
                    </div>
                  </div>
                  <span className="badge badge-cyan shrink-0 font-mono">{c.n_encuestas}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Nowcasting data table */}
      <section className="premium-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
          Tabla completa de estimaciones
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border1">
                <th className="text-left p-2 text-muted font-normal">Partido</th>
                <th className="text-right p-2 text-muted font-normal">Estimación</th>
                <th className="text-right p-2 text-muted font-normal">IC 95% inf</th>
                <th className="text-right p-2 text-muted font-normal">IC 95% sup</th>
                <th className="text-right p-2 text-muted font-normal">N encuestas</th>
                <th className="text-right p-2 text-muted font-normal">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {current.map((e: NowcastingEstimate) => (
                <tr key={e.partido} className="border-t border-border1 hover:bg-bg3 transition">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color || PARTY_COLORS[e.partido] }} />
                      <span className="text-text1 font-semibold">{e.partido}</span>
                    </div>
                  </td>
                  <td className="p-2 text-right font-bold tabular-nums" style={{ color: e.color || PARTY_COLORS[e.partido] }}>
                    {toNum(e.estimacion_pct).toFixed(2)}%
                  </td>
                  <td className="p-2 text-right text-muted tabular-nums">{toNum(e.ic_95_inf).toFixed(2)}%</td>
                  <td className="p-2 text-right text-muted tabular-nums">{toNum(e.ic_95_sup).toFixed(2)}%</td>
                  <td className="p-2 text-right text-muted tabular-nums">{e.n_encuestas}</td>
                  <td className="p-2 text-right text-muted">
                    {new Date(e.fecha_estimacion).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
