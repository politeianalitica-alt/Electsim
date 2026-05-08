"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

interface SpainCcaaData {
  ccaa: string;
  dominant_category: string;
  article_count: number;
  avg_sentiment: number;
  top_headlines: string[];
}

const CCAA_CENTROIDS: Record<string, { lat: number; lon: number; short: string }> = {
  "Andalucía":          { lat: 37.45, lon: -4.50,  short: "AND" },
  "Cataluña":           { lat: 41.80, lon:  1.50,  short: "CAT" },
  "Madrid":             { lat: 40.42, lon: -3.70,  short: "MAD" },
  "Valencia":           { lat: 39.47, lon: -0.38,  short: "VAL" },
  "Galicia":            { lat: 42.80, lon: -8.00,  short: "GAL" },
  "País Vasco":         { lat: 43.00, lon: -2.70,  short: "PVA" },
  "Navarra":            { lat: 42.70, lon: -1.60,  short: "NAV" },
  "Aragón":             { lat: 41.50, lon: -0.88,  short: "ARA" },
  "Castilla y León":    { lat: 41.80, lon: -4.00,  short: "CYL" },
  "Castilla-La Mancha": { lat: 39.50, lon: -3.00,  short: "CLM" },
  "Extremadura":        { lat: 39.50, lon: -6.10,  short: "EXT" },
  "Murcia":             { lat: 37.90, lon: -1.30,  short: "MUR" },
  "Asturias":           { lat: 43.30, lon: -5.90,  short: "AST" },
  "Cantabria":          { lat: 43.18, lon: -4.00,  short: "CAN" },
  "La Rioja":           { lat: 42.28, lon: -2.50,  short: "RIO" },
  "Baleares":           { lat: 39.57, lon:  2.90,  short: "BAL" },
  "Canarias":           { lat: 28.30, lon:-15.60,  short: "CAN" },
};

const CATEGORY_COLORS: Record<string, string> = {
  politica:       "#E03A3E",
  economia:       "#F59E0B",
  sanidad:        "#10B981",
  educacion:      "#3B82F6",
  vivienda:       "#8B5CF6",
  justicia:       "#DC2626",
  energia:        "#F97316",
  inmigracion:    "#64748B",
  generalista:    "#00D4FF",
  agenda_oficial: "#94A3B8",
};

function catColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toLowerCase()] ?? "#94A3B8";
}

const DEMO_SPAIN: SpainCcaaData[] = [
  { ccaa: "Andalucía",          dominant_category: "politica",    article_count: 48, avg_sentiment: -0.15, top_headlines: ["Elecciones en Andalucía"] },
  { ccaa: "Cataluña",           dominant_category: "politica",    article_count: 62, avg_sentiment: -0.25, top_headlines: ["Independentismo en la agenda"] },
  { ccaa: "Madrid",             dominant_category: "economia",    article_count: 89, avg_sentiment:  0.05, top_headlines: ["Impacto económico Madrid"] },
  { ccaa: "Valencia",           dominant_category: "vivienda",    article_count: 31, avg_sentiment: -0.20, top_headlines: ["Crisis vivienda Valencia"] },
  { ccaa: "Galicia",            dominant_category: "sanidad",     article_count: 22, avg_sentiment:  0.10, top_headlines: ["Sanidad en Galicia"] },
  { ccaa: "País Vasco",         dominant_category: "energia",     article_count: 28, avg_sentiment:  0.08, top_headlines: ["Energía e industria vasca"] },
  { ccaa: "Navarra",            dominant_category: "politica",    article_count: 15, avg_sentiment: -0.05, top_headlines: ["Gobierno navarro"] },
  { ccaa: "Aragón",             dominant_category: "energia",     article_count: 19, avg_sentiment:  0.12, top_headlines: ["Energías renovables en Aragón"] },
  { ccaa: "Castilla y León",    dominant_category: "economia",    article_count: 25, avg_sentiment: -0.08, top_headlines: ["Economía rural CyL"] },
  { ccaa: "Castilla-La Mancha", dominant_category: "inmigracion", article_count: 18, avg_sentiment: -0.30, top_headlines: ["Migrantes en CLM"] },
  { ccaa: "Extremadura",        dominant_category: "educacion",   article_count: 14, avg_sentiment:  0.05, top_headlines: ["Educación en Extremadura"] },
  { ccaa: "Murcia",             dominant_category: "inmigracion", article_count: 22, avg_sentiment: -0.35, top_headlines: ["Frontera sur Murcia"] },
  { ccaa: "Asturias",           dominant_category: "economia",    article_count: 17, avg_sentiment: -0.12, top_headlines: ["Industria asturiana"] },
  { ccaa: "Cantabria",          dominant_category: "generalista", article_count: 10, avg_sentiment:  0.02, top_headlines: ["Noticias de Cantabria"] },
  { ccaa: "La Rioja",           dominant_category: "economia",    article_count:  8, avg_sentiment:  0.15, top_headlines: ["Vino y economía riojana"] },
  { ccaa: "Baleares",           dominant_category: "vivienda",    article_count: 24, avg_sentiment: -0.28, top_headlines: ["Especulación en Baleares"] },
  { ccaa: "Canarias",           dominant_category: "inmigracion", article_count: 35, avg_sentiment: -0.40, top_headlines: ["Crisis migratoria Canarias"] },
];

const INTEL_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";
const SVG_W = 720, SVG_H = 360;
const LAT_MIN = 36, LAT_MAX = 44, LON_MIN = -9, LON_MAX = 4;

// Spain outline path — copied from LegislationMap.tsx
const SPAIN_PATH = `
  M 80 110 L 110 90 L 145 80 L 175 75 L 215 70 L 260 75
  L 295 70 L 330 75 L 365 85 L 395 90 L 430 95 L 465 100
  L 495 110 L 525 130 L 555 145 L 580 165 L 600 185
  L 615 215 L 620 245 L 615 275 L 600 290 L 580 295
  L 545 300 L 505 305 L 460 310 L 415 305 L 370 300
  L 325 295 L 280 290 L 235 285 L 195 275 L 160 265
  L 130 250 L 110 230 L 95 205 L 85 175 L 80 145 Z
`;

// Baleares path — copied from LegislationMap.tsx
const BALEARES_PATH = `
  M 580 230 L 605 225 L 615 240 L 605 250 L 585 248 Z
`;

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W;
  const y = SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return [x, y];
}

export function NarrativeMapSpain() {
  const [hovered, setHovered] = useState<SpainCcaaData | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const { data: ccaaData } = useQuery<SpainCcaaData[]>({
    queryKey: ["media", "spain-narrative-map"],
    queryFn: () =>
      fetch(`${INTEL_BASE}/api/media/narratives/spain-map`)
        .then(r => (r.ok ? r.json() : DEMO_SPAIN))
        .catch(() => DEMO_SPAIN),
    staleTime: 10 * 60_000,
    placeholderData: DEMO_SPAIN,
  });

  const data = ccaaData ?? DEMO_SPAIN;
  const byName = Object.fromEntries(data.map(d => [d.ccaa, d]));

  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
          Narrativas dominantes por CCAA
        </h2>
        <span className="text-[10px] text-muted ml-2">Basado en prensa regional</span>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-muted capitalize">{cat.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <div className="relative bg-bg3 rounded-lg overflow-hidden" style={{ height: 380 }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
          {/* Spain outline */}
          <path d={SPAIN_PATH} fill="rgba(31,78,140,0.12)" stroke="rgba(31,78,140,0.5)" strokeWidth="1.5" />
          <path d={BALEARES_PATH} fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.4)" strokeWidth="1" />

          {/* Canarias inset */}
          <g transform="translate(40, 290)">
            <rect width="100" height="50" fill="rgba(31,78,140,0.06)" stroke="rgba(31,78,140,0.3)" strokeWidth="1" rx="4" />
            <text x="50" y="14" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace">Canarias</text>
          </g>

          {/* CCAA circles */}
          {Object.entries(CCAA_CENTROIDS).map(([ccaaName, centroid]) => {
            const d = byName[ccaaName];
            if (!d) return null;

            let [x, y] = project(centroid.lat, centroid.lon);
            // Canarias: place in inset box
            if (ccaaName === "Canarias") { x = 90; y = 325; }

            const r = Math.max(8, Math.min(22, 6 + d.article_count / 5));
            const color = catColor(d.dominant_category);
            const sentColor =
              d.avg_sentiment > 0.1 ? "#10B981" :
              d.avg_sentiment < -0.1 ? "#EF4444" :
              "#94A3B8";

            return (
              <g key={ccaaName}>
                {/* Glow ring */}
                <circle cx={x} cy={y} r={r + 4} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
                {/* Main circle */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color} fillOpacity={0.75}
                  stroke="white" strokeWidth="1.5"
                  className="cursor-pointer"
                  onMouseEnter={e => {
                    setHovered(d);
                    const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                    if (rect) {
                      setHoverPos({
                        x: (x / SVG_W) * rect.width,
                        y: (y / SVG_H) * rect.height,
                      });
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* CCAA abbreviation */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={r > 12 ? "9" : "7"} fill="white" fontWeight="bold" fontFamily="ui-monospace"
                  style={{ pointerEvents: "none" }}
                >
                  {centroid.short}
                </text>
                {/* Sentiment dot */}
                <circle cx={x + r - 3} cy={y - r + 3} r="4" fill={sentColor} stroke="white" strokeWidth="1" />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute pointer-events-none premium-card text-xs max-w-[220px]"
            style={{ left: Math.min(hoverPos.x + 12, 480), top: Math.max(hoverPos.y - 30, 8) }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: catColor(hovered.dominant_category) }} />
              <span className="font-bold text-text1">{hovered.ccaa}</span>
            </div>
            <div className="text-muted capitalize mb-1">
              {hovered.dominant_category.replace("_", " ")} · {hovered.article_count} artículos
            </div>
            <div className={`text-[10px] mb-1 ${hovered.avg_sentiment > 0.1 ? "text-green1" : hovered.avg_sentiment < -0.1 ? "text-red1" : "text-text2"}`}>
              Sentimiento: {hovered.avg_sentiment >= 0 ? "+" : ""}{(hovered.avg_sentiment * 100).toFixed(0)}
            </div>
            {hovered.top_headlines[0] && (
              <div className="text-[9px] text-text2 line-clamp-2 italic">{hovered.top_headlines[0]}</div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 right-2 text-[9px] text-muted bg-bg2/80 px-2 py-1 rounded">
          Tamaño = volumen · Punto = sentimiento
        </div>
      </div>
    </section>
  );
}
