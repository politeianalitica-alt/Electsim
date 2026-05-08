"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map, Filter, RefreshCw } from "lucide-react";

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";

interface LegItem {
  id?: string | number;
  titulo?: string;
  nivel?: string;
  region?: string;
  ai_impact_level?: string;
  ai_relevance?: number;
  ai_category?: string;
  sectores_afectados?: string[];
  map_lat?: number;
  map_lon?: number;
}

// Bbox aprox España continental + Baleares: lat 36-44, lon -9 a 4
// Canarias se mostrará como inset (overlay box)
const SVG_W = 720;
const SVG_H = 360;
const LAT_MIN = 36, LAT_MAX = 44, LON_MIN = -9, LON_MAX = 4;

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W;
  const y = SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return [x, y];
}

// Silueta simplificada de España continental + Baleares (polygon paths aproximados)
const SPAIN_PATH = `
  M 80 110 L 110 90 L 145 80 L 175 75 L 215 70 L 260 75
  L 295 70 L 330 75 L 365 85 L 395 90 L 430 95 L 465 100
  L 495 110 L 525 130 L 555 145 L 580 165 L 600 185
  L 615 215 L 620 245 L 615 275 L 600 290 L 580 295
  L 545 300 L 505 305 L 460 310 L 415 305 L 370 300
  L 325 295 L 280 290 L 235 285 L 195 275 L 160 265
  L 130 250 L 110 230 L 95 205 L 85 175 L 80 145 Z
`;

// Baleares (recuadro)
const BALEARES_PATH = `
  M 580 230 L 605 225 L 615 240 L 605 250 L 585 248 Z
`;

interface Props { sourcePath?: string }

export function LegislationMap({ sourcePath = "/intelligence/legislation/impact" }: Props) {
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [minRelevance, setMinRelevance] = useState<number>(6);
  const [daysBack, setDaysBack] = useState<number>(30);
  const [hovered, setHovered] = useState<LegItem | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selected, setSelected] = useState<LegItem | null>(null);

  const { data: legislation = [], isFetching, refetch } = useQuery<LegItem[]>({
    queryKey: ["legislation", "map", level, category, minRelevance, daysBack],
    queryFn: () => {
      const qs = new URLSearchParams({
        min_relevance: String(minRelevance),
        days_back:     String(daysBack),
        limit:         "60",
      });
      if (level)    qs.set("level", level);
      if (category) qs.set("category", category);
      return fetch(`${INTEL_BASE}${sourcePath}?${qs}`)
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []);
    },
    staleTime: 5 * 60_000,
  });

  // Items con coordenadas válidas
  const geoItems = legislation.filter(l =>
    typeof l.map_lat === "number" && typeof l.map_lon === "number" &&
    l.map_lat !== 0 && l.map_lon !== 0
  );

  // Top relevancia
  const topItems = [...legislation]
    .sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0))
    .slice(0, 5);

  // Breakdown por impacto
  const breakdown = {
    high:   legislation.filter(l => l.ai_impact_level === "high").length,
    medium: legislation.filter(l => l.ai_impact_level === "medium").length,
    low:    legislation.filter(l => l.ai_impact_level === "low").length,
  };

  function dotColor(impact?: string): string {
    if (impact === "high")   return "#EF4444";
    if (impact === "medium") return "#F59E0B";
    return "#3B82F6";
  }
  function dotOpacity(impact?: string): number {
    return impact === "low" ? 0.6 : 0.85;
  }

  return (
    <section className="premium-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 flex items-center gap-2">
          <Map className="w-4 h-4 text-cyan1"/>
          Mapa legislativo · Impacto territorial
        </h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border1 text-text2 hover:border-cyan1 hover:text-cyan1 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}/> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap text-xs">
        <Filter className="w-4 h-4 text-text2 shrink-0"/>
        <select value={level} onChange={e => setLevel(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          <option value="">Todos niveles</option>
          <option value="nacional">Nacional</option>
          <option value="regional">Regional</option>
          <option value="local">Local</option>
        </select>
        <input type="text" value={category} onChange={e => setCategory(e.target.value)}
          placeholder="categoría..."
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 placeholder:text-muted focus:border-cyan1 focus:outline-none w-32"/>
        <div className="flex items-center gap-1.5">
          <span className="text-text2">Rel min</span>
          <input type="range" min="1" max="10" value={minRelevance}
            onChange={e => setMinRelevance(parseInt(e.target.value))}
            className="w-24 accent-cyan-400"/>
          <span className="font-mono text-text1 w-4">{minRelevance}</span>
        </div>
        <select value={daysBack} onChange={e => setDaysBack(parseInt(e.target.value))}
          className="bg-bg3 border border-border1 rounded px-2 py-1 text-text1 focus:border-cyan1 focus:outline-none">
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {/* SVG Map */}
      <div className="relative bg-bg3 rounded-lg overflow-hidden mb-4" style={{ height: 380 }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
          {/* Spain outline */}
          <path d={SPAIN_PATH} fill="rgba(31, 78, 140, 0.12)" stroke="rgba(31, 78, 140, 0.5)" strokeWidth="1.5"/>
          <path d={BALEARES_PATH} fill="rgba(31, 78, 140, 0.10)" stroke="rgba(31, 78, 140, 0.4)" strokeWidth="1"/>

          {/* Inset Canarias */}
          <g transform="translate(40, 290)">
            <rect width="100" height="50" fill="rgba(31, 78, 140, 0.06)" stroke="rgba(31, 78, 140, 0.30)" strokeWidth="1" rx="4"/>
            <text x="50" y="14" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="ui-monospace">Canarias</text>
            <circle cx="35" cy="35" r="3" fill="rgba(31, 78, 140, 0.4)"/>
            <circle cx="55" cy="32" r="3" fill="rgba(31, 78, 140, 0.4)"/>
            <circle cx="70" cy="38" r="3" fill="rgba(31, 78, 140, 0.4)"/>
          </g>

          {/* Dots */}
          {geoItems.map((item, i) => {
            const [x, y] = project(item.map_lat!, item.map_lon!);
            return (
              <g key={item.id ?? i}>
                <circle
                  cx={x} cy={y} r={8}
                  fill={dotColor(item.ai_impact_level)}
                  fillOpacity={dotOpacity(item.ai_impact_level)}
                  stroke="white" strokeWidth="1.5"
                  className="cursor-pointer transition-all hover:r-12"
                  onMouseEnter={(e) => {
                    setHovered(item);
                    const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                    if (rect) {
                      const realX = (x / SVG_W) * rect.width;
                      const realY = (y / SVG_H) * rect.height;
                      setHoverPos({ x: realX, y: realY });
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(item)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute pointer-events-none premium-card text-xs max-w-xs"
            style={{ left: Math.min(hoverPos.x + 12, 500), top: Math.max(hoverPos.y - 30, 8) }}
          >
            <p className="font-semibold text-text1 mb-1 line-clamp-2">{hovered.titulo}</p>
            <div className="flex items-center gap-2">
              <span className={`badge ${hovered.ai_impact_level === "high" ? "badge-red" : hovered.ai_impact_level === "medium" ? "badge-amber" : "badge-blue"}`}>
                {hovered.ai_impact_level ?? "—"}
              </span>
              {hovered.region && <span className="text-text2">{hovered.region}</span>}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-bg2/90 backdrop-blur border border-border1 rounded-lg px-3 py-2 text-[10px] flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red1"/> Alto</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber1"/> Medio</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue1"/> Bajo</span>
          <span className="text-muted">· {geoItems.length} normas geo</span>
        </div>
      </div>

      {/* Selected detail panel */}
      {selected && (
        <div className="mb-4 premium-card border-cyan1/30 bg-cyan1/5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-text1">{selected.titulo}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className={`badge ${selected.ai_impact_level === "high" ? "badge-red" : selected.ai_impact_level === "medium" ? "badge-amber" : "badge-blue"}`}>
                  {selected.ai_impact_level ?? "—"}
                </span>
                {selected.nivel && <span className="text-text2">Nivel: <strong className="text-text1">{selected.nivel}</strong></span>}
                {selected.region && <span className="text-text2">Región: <strong className="text-text1">{selected.region}</strong></span>}
                {selected.ai_relevance != null && <span className="text-cyan1 font-mono">R{selected.ai_relevance}</span>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-text2 hover:text-text1 text-xs">cerrar</button>
          </div>
          {(selected.sectores_afectados?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.sectores_afectados!.map(s => (
                <span key={s} className="badge badge-cyan text-[10px]">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom: top items + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text2 mb-2">
            Normas con mayor relevancia
          </h3>
          <div className="space-y-1.5">
            {topItems.length === 0 ? (
              <p className="text-xs text-muted py-2">Sin normas en el periodo seleccionado.</p>
            ) : topItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-bg/50 border border-border1 text-xs">
                <span className={`badge ${it.nivel === "nacional" ? "badge-red" : it.nivel === "regional" ? "badge-amber" : "badge-blue"} shrink-0`}>
                  {it.nivel ?? "—"}
                </span>
                <span className="flex-1 text-text1 line-clamp-1">{it.titulo}</span>
                <span className="text-cyan1 font-mono shrink-0">R{it.ai_relevance ?? 0}</span>
                {(it.sectores_afectados?.length ?? 0) > 0 && (
                  <span className="hidden md:flex flex-wrap gap-1 shrink-0">
                    {it.sectores_afectados!.slice(0, 2).map(s => (
                      <span key={s} className="badge badge-cyan text-[9px]">{s}</span>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text2 mb-2">
            Por impacto
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded bg-bg/50 border border-border1">
              <span className="w-2.5 h-2.5 rounded-full bg-red1"/>
              <span className="text-xs text-text1 flex-1">Alto</span>
              <span className="text-sm font-mono font-bold text-text1">{breakdown.high}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-bg/50 border border-border1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber1"/>
              <span className="text-xs text-text1 flex-1">Medio</span>
              <span className="text-sm font-mono font-bold text-text1">{breakdown.medium}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-bg/50 border border-border1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue1"/>
              <span className="text-xs text-text1 flex-1">Bajo</span>
              <span className="text-sm font-mono font-bold text-text1">{breakdown.low}</span>
            </div>
            <p className="text-[10px] text-muted text-center pt-1">
              Total: <strong className="text-text2">{legislation.length}</strong> normas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
