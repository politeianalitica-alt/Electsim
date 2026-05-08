"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";

interface WorldCountryData {
  country_code: string;
  country_name: string;
  article_count: number;
  avg_sentiment: number;
  lat: number;
  lon: number;
}

const DEMO_WORLD: WorldCountryData[] = [
  { country_code: "US", country_name: "Estados Unidos",  article_count: 145, avg_sentiment: -0.12, lat:  39.5, lon:  -98.4 },
  { country_code: "GB", country_name: "Reino Unido",     article_count:  87, avg_sentiment:  0.05, lat:  54.0, lon:   -2.0 },
  { country_code: "DE", country_name: "Alemania",        article_count:  76, avg_sentiment:  0.08, lat:  51.2, lon:   10.5 },
  { country_code: "FR", country_name: "Francia",         article_count:  82, avg_sentiment: -0.05, lat:  46.2, lon:    2.2 },
  { country_code: "IT", country_name: "Italia",          article_count:  65, avg_sentiment:  0.02, lat:  42.8, lon:   12.8 },
  { country_code: "RU", country_name: "Rusia",           article_count:  98, avg_sentiment: -0.45, lat:  61.5, lon:  105.3 },
  { country_code: "CN", country_name: "China",           article_count:  91, avg_sentiment: -0.22, lat:  35.9, lon:  104.2 },
  { country_code: "JP", country_name: "Japón",           article_count:  54, avg_sentiment:  0.12, lat:  36.2, lon:  138.3 },
  { country_code: "BR", country_name: "Brasil",          article_count:  45, avg_sentiment: -0.18, lat: -14.2, lon:  -51.9 },
  { country_code: "IN", country_name: "India",           article_count:  73, avg_sentiment:  0.03, lat:  20.6, lon:   78.9 },
  { country_code: "UA", country_name: "Ucrania",         article_count: 112, avg_sentiment: -0.55, lat:  48.4, lon:   31.2 },
  { country_code: "IL", country_name: "Israel",          article_count:  95, avg_sentiment: -0.48, lat:  31.0, lon:   34.9 },
  { country_code: "MA", country_name: "Marruecos",       article_count:  38, avg_sentiment: -0.10, lat:  31.8, lon:   -7.1 },
  { country_code: "TR", country_name: "Turquía",         article_count:  42, avg_sentiment: -0.15, lat:  39.0, lon:   35.2 },
  { country_code: "SA", country_name: "Arabia Saudí",    article_count:  36, avg_sentiment: -0.20, lat:  23.9, lon:   45.1 },
  { country_code: "MX", country_name: "México",          article_count:  41, avg_sentiment: -0.08, lat:  23.6, lon: -102.6 },
  { country_code: "AR", country_name: "Argentina",       article_count:  33, avg_sentiment: -0.25, lat: -38.4, lon:  -63.6 },
  { country_code: "ZA", country_name: "Sudáfrica",       article_count:  28, avg_sentiment: -0.05, lat: -30.6, lon:   22.9 },
  { country_code: "EG", country_name: "Egipto",          article_count:  31, avg_sentiment: -0.20, lat:  26.8, lon:   30.8 },
  { country_code: "PL", country_name: "Polonia",         article_count:  44, avg_sentiment:  0.10, lat:  51.9, lon:   19.1 },
  { country_code: "NL", country_name: "Países Bajos",    article_count:  39, avg_sentiment:  0.08, lat:  52.1, lon:    5.3 },
  { country_code: "SE", country_name: "Suecia",          article_count:  32, avg_sentiment:  0.15, lat:  60.1, lon:   18.6 },
  { country_code: "NO", country_name: "Noruega",         article_count:  25, avg_sentiment:  0.20, lat:  60.5, lon:    8.5 },
  { country_code: "PT", country_name: "Portugal",        article_count:  29, avg_sentiment:  0.05, lat:  39.4, lon:   -8.2 },
  { country_code: "GR", country_name: "Grecia",          article_count:  27, avg_sentiment: -0.08, lat:  39.1, lon:   21.8 },
  { country_code: "KR", country_name: "Corea del Sur",   article_count:  35, avg_sentiment:  0.05, lat:  35.9, lon:  127.8 },
  { country_code: "IR", country_name: "Irán",            article_count:  48, avg_sentiment: -0.38, lat:  32.4, lon:   53.7 },
  { country_code: "PK", country_name: "Pakistán",        article_count:  40, avg_sentiment: -0.30, lat:  30.4, lon:   69.4 },
  { country_code: "AF", country_name: "Afganistán",      article_count:  38, avg_sentiment: -0.42, lat:  33.9, lon:   67.7 },
  { country_code: "IQ", country_name: "Iraq",            article_count:  42, avg_sentiment: -0.38, lat:  33.2, lon:   43.7 },
  { country_code: "SY", country_name: "Siria",           article_count:  45, avg_sentiment: -0.50, lat:  34.8, lon:   39.0 },
  { country_code: "NG", country_name: "Nigeria",         article_count:  22, avg_sentiment: -0.15, lat:   9.1, lon:    8.7 },
  { country_code: "ET", country_name: "Etiopía",         article_count:  18, avg_sentiment: -0.22, lat:   9.2, lon:   40.5 },
  { country_code: "CA", country_name: "Canadá",          article_count:  46, avg_sentiment:  0.10, lat:  56.1, lon: -106.4 },
  { country_code: "AU", country_name: "Australia",       article_count:  38, avg_sentiment:  0.08, lat: -25.3, lon:  133.8 },
  { country_code: "BE", country_name: "Bélgica",         article_count:  30, avg_sentiment:  0.03, lat:  50.5, lon:    4.5 },
  { country_code: "CH", country_name: "Suiza",           article_count:  28, avg_sentiment:  0.18, lat:  46.8, lon:    8.2 },
  { country_code: "AT", country_name: "Austria",         article_count:  24, avg_sentiment:  0.05, lat:  47.5, lon:   14.6 },
  { country_code: "HU", country_name: "Hungría",         article_count:  26, avg_sentiment: -0.12, lat:  47.2, lon:   19.5 },
  { country_code: "RO", country_name: "Rumania",         article_count:  20, avg_sentiment: -0.05, lat:  45.9, lon:   25.0 },
  { country_code: "CZ", country_name: "R. Checa",        article_count:  22, avg_sentiment:  0.08, lat:  49.8, lon:   15.5 },
  { country_code: "ID", country_name: "Indonesia",       article_count:  30, avg_sentiment:  0.02, lat:  -0.8, lon:  113.9 },
  { country_code: "MY", country_name: "Malasia",         article_count:  18, avg_sentiment:  0.05, lat:   4.2, lon:  101.9 },
  { country_code: "TH", country_name: "Tailandia",       article_count:  20, avg_sentiment: -0.02, lat:  15.9, lon:  100.9 },
  { country_code: "VE", country_name: "Venezuela",       article_count:  32, avg_sentiment: -0.42, lat:   6.4, lon:  -66.6 },
  { country_code: "CO", country_name: "Colombia",        article_count:  25, avg_sentiment: -0.15, lat:   4.6, lon:  -74.3 },
  { country_code: "CL", country_name: "Chile",           article_count:  22, avg_sentiment: -0.10, lat: -35.7, lon:  -71.5 },
  { country_code: "DZ", country_name: "Argelia",         article_count:  20, avg_sentiment: -0.18, lat:  28.0, lon:    1.7 },
  { country_code: "LY", country_name: "Libia",           article_count:  25, avg_sentiment: -0.40, lat:  26.3, lon:   17.2 },
  { country_code: "RS", country_name: "Serbia",          article_count:  18, avg_sentiment: -0.08, lat:  44.0, lon:   21.0 },
];

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";
const W = 800, H = 400;

function projectWorld(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [x, y];
}

function sentColor(s: number): string {
  if (s > 0.15) return "#10B981";
  if (s < -0.15) return "#EF4444";
  return "#94A3B8";
}

export function NarrativeMapWorld() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hovered, setHovered] = useState<WorldCountryData | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: worldData } = useQuery<WorldCountryData[]>({
    queryKey: ["media", "world-narrative-map"],
    queryFn: () =>
      fetch(`${INTEL_BASE}/api/media/narratives/world-map`)
        .then(r => (r.ok ? r.json() : DEMO_WORLD))
        .catch(() => DEMO_WORLD),
    staleTime: 15 * 60_000,
    placeholderData: DEMO_WORLD,
  });

  const data = worldData ?? DEMO_WORLD;
  const maxCount = Math.max(...data.map(d => d.article_count), 1);

  return (
    <section className="premium-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
            Narrativas por país — cobertura internacional
          </h2>
        </div>
        <div className="text-[10px] text-muted">Scroll para zoom · arrastrar para navegar</div>
      </div>

      <div
        ref={containerRef}
        className="relative bg-bg3 rounded-lg overflow-hidden select-none"
        style={{ height: 420, cursor: dragging ? "grabbing" : "grab" }}
        onWheel={e => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.85 : 1.18;
          setScale(s => Math.max(0.5, Math.min(8, s * delta)));
        }}
        onMouseDown={e => {
          setDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
        }}
        onMouseMove={e => {
          if (!dragging) return;
          setPan({ x: dragStart.panX + (e.clientX - dragStart.x), y: dragStart.panY + (e.clientY - dragStart.y) });
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => { setDragging(false); setHovered(null); }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          {/* Ocean background */}
          <rect width={W} height={H} fill="rgba(15,23,42,0.6)" />

          {/* Grid lines (parallels) */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const [, y] = projectWorld(lat, 0);
            return (
              <line key={`lat-${lat}`} x1={0} y1={y} x2={W} y2={y}
                stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
            );
          })}
          {/* Grid lines (meridians) */}
          {[-120, -60, 0, 60, 120].map(lon => {
            const [x] = projectWorld(0, lon);
            return (
              <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={H}
                stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
            );
          })}

          {/* Country bubbles — apply zoom/pan transform */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {data.map(c => {
              const [x, y] = projectWorld(c.lat, c.lon);
              const r = Math.max(4, Math.min(20, (c.article_count / maxCount) * 18 + 4));
              const color = sentColor(c.avg_sentiment);

              return (
                <g
                  key={c.country_code}
                  onMouseEnter={e => {
                    setHovered(c);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      const svgX = (x * scale + pan.x) / W * rect.width;
                      const svgY = (y * scale + pan.y) / H * rect.height;
                      setHoverPos({ x: svgX, y: svgY });
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Glow */}
                  <circle cx={x} cy={y} r={r + 3} fill={color} fillOpacity={0.12} />
                  {/* Main bubble */}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={color} fillOpacity={0.65}
                    stroke="white" strokeWidth={1 / scale}
                    className="cursor-pointer"
                  />
                  {/* Country code label (only show if bubble big enough) */}
                  {r > 8 && (
                    <text
                      x={x} y={y + 0.5}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(5, 8 / scale)} fill="white" fontWeight="bold" fontFamily="ui-monospace"
                      style={{ pointerEvents: "none" }}
                    >
                      {c.country_code}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button
            onClick={() => setScale(s => Math.min(8, s * 1.3))}
            className="w-7 h-7 bg-bg2/90 border border-border1 rounded text-text1 hover:border-cyan1 flex items-center justify-center text-sm font-bold"
          >
            +
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.5, s * 0.77))}
            className="w-7 h-7 bg-bg2/90 border border-border1 rounded text-text1 hover:border-cyan1 flex items-center justify-center text-sm font-bold"
          >
            −
          </button>
          <button
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="w-7 h-7 bg-bg2/90 border border-border1 rounded text-text1 hover:border-cyan1 flex items-center justify-center text-[10px]"
            title="Reset"
          >
            ⊙
          </button>
        </div>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute pointer-events-none premium-card text-xs max-w-[200px] z-20"
            style={{
              left: Math.min(hoverPos.x + 12, (containerRef.current?.clientWidth ?? 600) - 210),
              top: Math.max(hoverPos.y - 30, 8),
            }}
          >
            <div className="font-bold text-text1 mb-1">{hovered.country_name}</div>
            <div className="text-muted">{hovered.article_count} artículos</div>
            <div className={`font-mono text-xs mt-1 ${hovered.avg_sentiment > 0.1 ? "text-green1" : hovered.avg_sentiment < -0.1 ? "text-red1" : "text-text2"}`}>
              Sentimiento: {hovered.avg_sentiment >= 0 ? "+" : ""}{(hovered.avg_sentiment * 100).toFixed(0)}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-bg2/80 px-2 py-1 rounded flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green1" />Positivo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#94A3B8" }} />Neutro
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red1" />Negativo
          </span>
          <span className="text-muted">· Tamaño = volumen</span>
        </div>
      </div>
    </section>
  );
}
