"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Globe, Map, MapPin, Compass } from "lucide-react";

type MapView = "world" | "americas" | "europa" | "africa" | "asia" | "spain";

// ── Mercator projection ──────────────────────────────────────────────────────
function project(lon: number, lat: number, w: number, h: number): [number, number] {
  const x = ((lon + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = h / 2 - (w * mercN) / (2 * Math.PI);
  return [x, y];
}

// Project within a bounding box, scaled to fill the SVG viewport
function projectBounded(
  lon: number, lat: number,
  lonMin: number, lonMax: number, latMin: number, latMax: number,
  w: number, h: number,
): [number, number] {
  const BIG = 10000;
  const [fx, fy] = project(lon, lat, BIG, BIG);
  const [minX] = project(lonMin, 0, BIG, BIG);
  const [maxX] = project(lonMax, 0, BIG, BIG);
  const [, minY] = project(0, latMax, BIG, BIG); // higher lat → lower y
  const [, maxY] = project(0, latMin, BIG, BIG);
  const x = ((fx - minX) / (maxX - minX)) * w;
  const y = ((fy - minY) / (maxY - minY)) * h;
  return [Math.round(x), Math.round(y)];
}

// ── Country data ─────────────────────────────────────────────────────────────
const COUNTRY_COORDS: Record<string, [number, number]> = {
  // Europe
  "Spain": [-3.7, 40.4], "France": [2.35, 46.2], "Germany": [10.45, 51.2],
  "Italy": [12.6, 42.5], "UK": [-1.5, 52.5], "Portugal": [-8.2, 39.5],
  "Belgium": [4.47, 50.5], "Netherlands": [5.29, 52.1], "Poland": [19.1, 52.0],
  "Sweden": [18.6, 59.3], "Austria": [14.5, 47.5], "Switzerland": [8.23, 46.8],
  "Norway": [10.8, 59.9], "Finland": [25.7, 61.9], "Denmark": [10.2, 56.3],
  "Romania": [25.0, 45.9], "Hungary": [19.5, 47.2], "Slovakia": [19.7, 48.7],
  "Czech Republic": [15.5, 49.8], "Greece": [21.8, 39.1], "Bulgaria": [25.5, 42.7],
  "Croatia": [15.2, 45.1], "Serbia": [21.0, 44.0], "Ukraine": [31.2, 49.0],
  "Estonia": [25.0, 58.6], "Latvia": [24.8, 56.9], "Lithuania": [23.9, 55.2],
  "Ireland": [-8.0, 53.1], "Iceland": [-19.0, 65.0], "Albania": [20.2, 41.1],
  // Americas
  "United States": [-95.7, 37.1], "Canada": [-96.8, 56.1], "Mexico": [-102.5, 23.6],
  "Brazil": [-51.9, -14.2], "Argentina": [-63.6, -38.4], "Colombia": [-74.3, 4.6],
  "Chile": [-71.5, -35.7], "Peru": [-75.0, -9.2], "Venezuela": [-66.6, 6.4],
  "Bolivia": [-64.7, -16.3], "Ecuador": [-78.0, -1.8], "Paraguay": [-58.4, -23.4],
  "Uruguay": [-56.0, -32.5], "Cuba": [-79.5, 21.5], "Guatemala": [-90.2, 15.8],
  "Honduras": [-86.6, 15.2], "Costa Rica": [-84.0, 9.8], "Panama": [-80.8, 8.5],
  "Puerto Rico": [-66.6, 18.2], "Dominican Republic": [-70.2, 18.8],
  // Africa
  "Morocco": [-7.1, 31.8], "Algeria": [3.0, 28.0], "Egypt": [30.8, 26.8],
  "Tunisia": [9.6, 33.9], "Libya": [17.2, 26.3], "Sudan": [30.2, 15.6],
  "Nigeria": [8.7, 9.1], "South Africa": [25.1, -29.0], "Ethiopia": [40.5, 9.1],
  "Kenya": [37.9, 0.0], "Ghana": [-1.0, 7.9], "Tanzania": [34.9, -6.4],
  "Angola": [17.9, -11.2], "Mozambique": [35.5, -18.7], "Senegal": [-14.5, 14.5],
  "Cameroon": [12.3, 3.9], "Ivory Coast": [-5.6, 7.5], "Mali": [-1.9, 17.6],
  "Niger": [8.1, 17.6], "Congo DR": [23.7, -3.0], "Uganda": [32.3, 1.4],
  "Zambia": [27.8, -13.1], "Zimbabwe": [29.1, -20.2], "Namibia": [18.5, -22.2],
  // Asia
  "China": [104.2, 35.9], "Japan": [138.3, 36.2], "India": [78.9, 20.6],
  "Russia": [60.0, 60.0], "South Korea": [128.0, 36.5], "Indonesia": [113.9, -0.8],
  "Saudi Arabia": [45.1, 24.0], "Pakistan": [69.3, 30.4], "Bangladesh": [90.4, 23.7],
  "Iran": [53.7, 32.4], "Thailand": [100.5, 15.9], "Vietnam": [108.3, 14.1],
  "Malaysia": [109.7, 4.2], "Philippines": [122.6, 12.9], "Myanmar": [96.7, 21.9],
  "Afghanistan": [67.7, 33.9], "Iraq": [43.7, 33.2], "Syria": [38.2, 35.0],
  "UAE": [54.4, 23.4], "Kazakhstan": [67.6, 48.2], "Uzbekistan": [63.1, 41.3],
  "Singapore": [103.8, 1.4], "Taiwan": [121.0, 23.7], "Israel": [34.9, 31.5],
  "Turkey": [35.2, 38.9], "Jordan": [36.8, 31.2], "Lebanon": [35.5, 33.9],
  "Qatar": [51.2, 25.4], "Kuwait": [47.5, 29.4], "Oman": [57.6, 21.5],
  // Oceania (minimal)
  "Australia": [133.8, -25.7], "New Zealand": [172.5, -41.0],
};

const COUNTRY_REGIONS: Record<string, string> = {
  "Spain": "europa", "France": "europa", "Germany": "europa", "Italy": "europa",
  "UK": "europa", "Portugal": "europa", "Belgium": "europa", "Netherlands": "europa",
  "Poland": "europa", "Sweden": "europa", "Austria": "europa", "Switzerland": "europa",
  "Norway": "europa", "Finland": "europa", "Denmark": "europa", "Romania": "europa",
  "Hungary": "europa", "Slovakia": "europa", "Czech Republic": "europa",
  "Greece": "europa", "Bulgaria": "europa", "Croatia": "europa", "Serbia": "europa",
  "Ukraine": "europa", "Estonia": "europa", "Latvia": "europa", "Lithuania": "europa",
  "Ireland": "europa", "Iceland": "europa", "Albania": "europa", "Turkey": "europa",
  "United States": "americas", "Canada": "americas", "Mexico": "americas",
  "Brazil": "americas", "Argentina": "americas", "Colombia": "americas",
  "Chile": "americas", "Peru": "americas", "Venezuela": "americas",
  "Bolivia": "americas", "Ecuador": "americas", "Paraguay": "americas",
  "Uruguay": "americas", "Cuba": "americas", "Guatemala": "americas",
  "Honduras": "americas", "Costa Rica": "americas", "Panama": "americas",
  "Puerto Rico": "americas", "Dominican Republic": "americas",
  "Morocco": "africa", "Algeria": "africa", "Egypt": "africa", "Tunisia": "africa",
  "Libya": "africa", "Sudan": "africa", "Nigeria": "africa", "South Africa": "africa",
  "Ethiopia": "africa", "Kenya": "africa", "Ghana": "africa", "Tanzania": "africa",
  "Angola": "africa", "Mozambique": "africa", "Senegal": "africa",
  "Cameroon": "africa", "Ivory Coast": "africa", "Mali": "africa",
  "Niger": "africa", "Congo DR": "africa", "Uganda": "africa",
  "Zambia": "africa", "Zimbabwe": "africa", "Namibia": "africa",
  "China": "asia", "Japan": "asia", "India": "asia", "Russia": "asia",
  "South Korea": "asia", "Indonesia": "asia", "Saudi Arabia": "asia",
  "Pakistan": "asia", "Bangladesh": "asia", "Iran": "asia", "Thailand": "asia",
  "Vietnam": "asia", "Malaysia": "asia", "Philippines": "asia", "Myanmar": "asia",
  "Afghanistan": "asia", "Iraq": "asia", "Syria": "asia", "UAE": "asia",
  "Kazakhstan": "asia", "Uzbekistan": "asia", "Singapore": "asia", "Taiwan": "asia",
  "Israel": "asia", "Jordan": "asia", "Lebanon": "asia", "Qatar": "asia",
  "Kuwait": "asia", "Oman": "asia",
  "Australia": "oceania", "New Zealand": "oceania",
};

// Bounding boxes per region
const BOUNDS: Record<string, [number, number, number, number]> = {
  // [lonMin, lonMax, latMin, latMax]
  world:    [-180, 180, -60, 80],
  americas: [-170, -30, -58, 75],
  europa:   [-25,  45,  34,  72],
  africa:   [-20,  55,  -38, 40],
  asia:     [20,  150,  -12, 78],
};

// ── Europe polygon paths (viewBox 600×500 → re-used in projectBounded space) ─
// These are pre-computed for the "europa" bounds above
const EUROPE_POLYS: Record<string, { path: string; lx: number; ly: number; name: string }> = {
  "Spain":       { path: "M118,318 L195,285 L228,305 L208,358 L166,378 L122,366 Z", lx: 168, ly: 337, name: "España" },
  "Portugal":    { path: "M96,308 L118,298 L118,358 L106,368 L90,352 Z", lx: 104, ly: 333, name: "Portugal" },
  "France":      { path: "M128,248 L218,238 L238,258 L228,288 L198,288 L158,308 L128,288 Z", lx: 183, ly: 268, name: "Francia" },
  "UK":          { path: "M138,168 L172,163 L183,193 L162,208 L143,203 L133,183 Z", lx: 158, ly: 186, name: "UK" },
  "Germany":     { path: "M228,198 L272,193 L283,228 L262,248 L232,243 L222,222 Z", lx: 252, ly: 220, name: "Alemania" },
  "Italy":       { path: "M228,268 L262,252 L268,292 L252,328 L238,348 L222,318 L228,288 Z", lx: 246, ly: 298, name: "Italia" },
  "Belgium":     { path: "M193,208 L222,203 L222,222 L193,222 Z", lx: 207, ly: 214, name: "Bélgica" },
  "Netherlands": { path: "M198,188 L222,183 L228,203 L198,208 Z", lx: 212, ly: 196, name: "P.Bajos" },
  "Poland":      { path: "M278,188 L328,186 L332,222 L288,228 L272,212 Z", lx: 302, ly: 206, name: "Polonia" },
  "Austria":     { path: "M262,232 L302,228 L306,248 L264,252 Z", lx: 282, ly: 240, name: "Austria" },
  "Switzerland": { path: "M218,242 L248,239 L250,258 L218,260 Z", lx: 233, ly: 250, name: "Suiza" },
  "Sweden":      { path: "M262,98 L292,93 L307,147 L288,162 L262,152 L252,122 Z", lx: 280, ly: 126, name: "Suecia" },
  "Norway":      { path: "M217,82 L262,78 L265,112 L248,128 L218,118 L208,98 Z", lx: 238, ly: 101, name: "Noruega" },
  "Denmark":     { path: "M232,152 L252,148 L256,168 L236,170 Z", lx: 244, ly: 159, name: "Dinamarca" },
  "Finland":     { path: "M297,78 L337,72 L342,127 L312,142 L292,122 Z", lx: 317, ly: 103, name: "Finlandia" },
  "Romania":     { path: "M327,232 L372,227 L376,262 L337,265 Z", lx: 352, ly: 246, name: "Rumanía" },
  "Greece":      { path: "M298,292 L332,288 L336,318 L312,326 Z", lx: 316, ly: 306, name: "Grecia" },
  "Turkey":      { path: "M342,282 L415,278 L420,308 L347,312 Z", lx: 383, ly: 295, name: "Turquía" },
  "Ukraine":     { path: "M337,192 L397,187 L402,227 L342,232 Z", lx: 370, ly: 210, name: "Ucrania" },
  "Slovakia":    { path: "M292,222 L327,219 L330,237 L294,240 Z", lx: 312, ly: 230, name: "Eslovaquia" },
  "Morocco":     { path: "M108,373 L168,368 L172,408 L112,412 Z", lx: 141, ly: 388, name: "Marruecos" },
};

// ── Spain CCAA paths (viewBox 500×440) ─────────────────────────────────────
const CCAA_PATHS: Record<string, { path: string; lx: number; ly: number; name: string }> = {
  "01": { path: "M120,300 L250,290 L270,350 L200,380 L120,360 Z", lx: 190, ly: 335, name: "Andalucía" },
  "02": { path: "M270,180 L340,175 L345,230 L275,235 Z", lx: 308, ly: 205, name: "Aragón" },
  "03": { path: "M145,130 L215,125 L220,165 L150,170 Z", lx: 183, ly: 148, name: "Asturias" },
  "04": { path: "M380,300 L440,295 L445,330 L385,335 Z", lx: 413, ly: 315, name: "Baleares" },
  "05": { path: "M30,350 L90,345 L88,400 L32,405 Z", lx: 60, ly: 375, name: "Canarias" },
  "06": { path: "M195,130 L240,128 L242,160 L197,162 Z", lx: 219, ly: 145, name: "Cantabria" },
  "07": { path: "M200,260 L280,255 L282,310 L202,315 Z", lx: 241, ly: 283, name: "C.-La Mancha" },
  "08": { path: "M160,185 L265,180 L268,250 L162,255 Z", lx: 213, ly: 217, name: "Castilla y León" },
  "09": { path: "M320,170 L420,165 L425,245 L322,248 Z", lx: 372, ly: 207, name: "Cataluña" },
  "10": { path: "M115,270 L195,265 L197,305 L117,308 Z", lx: 156, ly: 287, name: "Extremadura" },
  "11": { path: "M80,140 L150,135 L153,180 L82,183 Z", lx: 116, ly: 158, name: "Galicia" },
  "12": { path: "M280,165 L320,162 L322,185 L282,187 Z", lx: 301, ly: 175, name: "La Rioja" },
  "13": { path: "M240,230 L310,225 L312,270 L242,273 Z", lx: 276, ly: 248, name: "Madrid" },
  "14": { path: "M265,305 L325,300 L327,340 L267,343 Z", lx: 296, ly: 321, name: "Murcia" },
  "15": { path: "M280,140 L330,138 L332,168 L282,170 Z", lx: 306, ly: 154, name: "Navarra" },
  "16": { path: "M220,138 L280,135 L282,165 L222,167 Z", lx: 251, ly: 151, name: "País Vasco" },
  "17": { path: "M315,255 L395,250 L397,300 L317,303 Z", lx: 356, ly: 276, name: "Valencia" },
};

const NARRATIVE_COLORS: Record<string, string> = {
  "Polarización política": "#EF4444",
  "Independentismo territorial": "#F59E0B",
  "Vivienda y alquiler": "#3B82F6",
  "Economía y empleo": "#10B981",
  "Inmigración": "#8B5CF6",
  "Corrupción e integridad": "#F97316",
  "Agenda general": "#64748B",
};

function narrativeColor(n: string): string {
  for (const [key, color] of Object.entries(NARRATIVE_COLORS)) {
    if (n.toLowerCase().includes(key.toLowerCase().split(" ")[0])) return color;
  }
  return "#64748B";
}

// ── Generic bubble map (works for world + each continent) ───────────────────
function BubbleMap({
  data, region, W = 800, H = 420,
}: {
  data: any[];
  region: "world" | "americas" | "africa" | "asia";
  W?: number;
  H?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [lonMin, lonMax, latMin, latMax] = BOUNDS[region] ?? BOUNDS.world;

  // Build count lookup
  const byCountry: Record<string, number> = {};
  for (const r of data) {
    const c = r.source_country || "";
    byCountry[c] = (byCountry[c] || 0) + Number(r.article_count || 0);
  }

  // Filter countries for this region
  const countries = Object.entries(COUNTRY_COORDS).filter(([c]) => {
    if (region === "world") return true;
    return COUNTRY_REGIONS[c] === region;
  });

  const max = Math.max(1, ...Object.values(byCountry));

  const proj = (lon: number, lat: number): [number, number] =>
    region === "world"
      ? project(lon, lat, W, H)
      : projectBounded(lon, lat, lonMin, lonMax, latMin, latMax, W, H);

  // Continent label positions (world only)
  const continentLabels = region === "world" ? [
    { label: "EUROPA",    lon: 15,    lat: 54 },
    { label: "AMÉRICAS",  lon: -80,   lat: 20 },
    { label: "ÁFRICA",    lon: 20,    lat: 5  },
    { label: "ASIA",      lon: 90,    lat: 45 },
    { label: "OCEANÍA",   lon: 140,   lat: -28 },
  ] : [];

  // Grid lines
  const lons = region === "world" ? [-120, -60, 0, 60, 120] : [];
  const lats = region === "world" ? [-30, 0, 30, 60] : [];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg" style={{ background: "#0d1829" }}>
        {/* Ocean base */}
        <rect width={W} height={H} fill="#0d1829" />

        {/* Grid lines */}
        {lons.map(lon => {
          const [x] = proj(lon, 0);
          return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="3,4" />;
        })}
        {lats.map(lat => {
          const [, y] = proj(0, lat);
          return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke={lat === 0 ? "#1e4a6e" : "#1e3a5f"} strokeWidth={lat === 0 ? 1 : 0.5} strokeDasharray={lat === 0 ? undefined : "3,4"} />;
        })}

        {/* Continent labels (world only) */}
        {continentLabels.map(({ label, lon, lat }) => {
          const [cx, cy] = proj(lon, lat);
          return (
            <text key={label} x={cx} y={cy} textAnchor="middle"
              fontSize="9" fill="#1e3a5f" fontWeight="700" letterSpacing="2"
              style={{ userSelect: "none" }}>
              {label}
            </text>
          );
        })}

        {/* Bubbles */}
        {countries.map(([country, [lon, lat]]) => {
          const count = byCountry[country] || 0;
          const r = count > 0 ? Math.min(6 + (count / max) * 32, 40) : (region === "world" ? 3 : 4);
          const [cx, cy] = proj(lon, lat);
          if (cx < -10 || cx > W + 10 || cy < -10 || cy > H + 10) return null;
          const isSpain = country === "Spain";
          const fill = isSpain ? "#00D4FF" : count > 50 ? "#3B82F6" : count > 10 ? "#6366F1" : "#263d5c";
          const showLabel = count > 15 || (region !== "world" && count > 0);
          return (
            <g key={country}
               onMouseEnter={() => setHovered(country)}
               onMouseLeave={() => setHovered(null)}
               className="cursor-pointer">
              {count > 0 && (
                <circle cx={cx} cy={cy} r={r + 6} fill={fill} fillOpacity="0.12" />
              )}
              <circle cx={cx} cy={cy} r={r}
                fill={fill} opacity={count > 0 ? 0.82 : 0.3}
                stroke={isSpain ? "#00D4FF" : count > 0 ? fill : "#334155"}
                strokeWidth={isSpain ? 1.5 : 0.5} />
              {showLabel && (
                <text x={cx} y={cy + r + 10} textAnchor="middle"
                  fontSize="7.5" fill="#94a3b8" fontWeight={isSpain ? "700" : "400"}>
                  {country}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && (
          <g>
            <rect x={8} y={8} width={170} height={40} rx={5}
              fill="#0a1628" stroke="#334155" strokeWidth={1} />
            <text x={16} y={24} fontSize="11" fill="#f1f5f9" fontWeight="600">{hovered}</text>
            <text x={16} y={39} fontSize="10" fill="#00D4FF">
              {byCountry[hovered] ?? 0} artículos
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {([
          ["España", "#00D4FF"],
          [">50 arts.", "#3B82F6"],
          [">10 arts.", "#6366F1"],
          ["Sin datos", "#263d5c"],
        ] as [string, string][]).map(([l, c]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: c }} />
            <span className="text-text2">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Europe choropleth ────────────────────────────────────────────────────────
function EuropeMap({ data }: { data: any[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byCountry: Record<string, { n: number; impact: number }> = {};
  for (const r of data) {
    byCountry[r.source_country || ""] = {
      n: Number(r.article_count || 0),
      impact: Number(r.spain_impact_count || 0),
    };
  }
  const max = Math.max(1, ...Object.values(byCountry).map(v => v.n));

  function fillColor(country: string): string {
    if (country === "Spain") return "#00D4FF";
    const v = byCountry[country];
    if (!v || v.n === 0) return "#162033";
    const t = v.n / max;
    return t > 0.6 ? "#3B82F6" : t > 0.3 ? "#6366F1" : "#334155";
  }

  const hovData = hovered ? byCountry[hovered] : null;
  return (
    <div className="relative">
      <svg viewBox="0 0 500 450" className="w-full rounded-lg" style={{ background: "#0d1829" }}>
        <rect width={500} height={450} fill="#0d1829" />
        {Object.entries(EUROPE_POLYS).map(([key, { path, lx, ly, name }]) => (
          <g key={key} onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
            <path d={path} fill={fillColor(key)} stroke="#1e3a5f" strokeWidth="1" opacity={0.88} />
            <text x={lx} y={ly} textAnchor="middle" fontSize="7"
              fill={key === "Spain" ? "#0f172a" : "#94a3b8"} fontWeight={key === "Spain" ? "700" : "400"}>
              {name}
            </text>
          </g>
        ))}
        {hovered && (
          <g>
            <rect x={8} y={8} width={185} height={52} rx={5} fill="#0a1628" stroke="#334155" strokeWidth={1} />
            <text x={16} y={25} fontSize="11" fill="#f1f5f9" fontWeight="600">{EUROPE_POLYS[hovered]?.name || hovered}</text>
            <text x={16} y={40} fontSize="10" fill="#00D4FF">{hovData?.n || 0} artículos</text>
            <text x={16} y={54} fontSize="9" fill="#94a3b8">{hovData?.impact || 0} con impacto en España</text>
          </g>
        )}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {[["España", "#00D4FF"], ["Alta cobertura", "#3B82F6"], ["Media", "#6366F1"], ["Sin datos", "#162033"]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: c }} />
            <span className="text-text2">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Spain CCAA ────────────────────────────────────────────────────────────────
function SpainCcaaMap({ data }: { data: any[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const byCcaa: Record<string, any> = {};
  for (const r of data) byCcaa[r.codigo_ine] = r;

  const selItem = selected ? byCcaa[selected] : null;
  const hovItem = hovered && !selected ? byCcaa[hovered] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      <div>
        <svg viewBox="0 0 500 440" className="w-full rounded-lg" style={{ background: "#0d1829" }}>
          <rect width={500} height={440} fill="#0d1829" />
          {Object.entries(CCAA_PATHS).map(([code, { path, lx, ly, name }]) => {
            const item = byCcaa[code];
            const narrative = item?.dominant_narrative || "Agenda general";
            const fill = item ? narrativeColor(narrative) : "#263d5c";
            return (
              <g key={code}
                 onMouseEnter={() => setHovered(code)}
                 onMouseLeave={() => setHovered(null)}
                 onClick={() => setSelected(selected === code ? null : code)}
                 className="cursor-pointer">
                <path d={path} fill={fill}
                  stroke={selected === code ? "#ffffff" : "#0d1829"}
                  strokeWidth={selected === code ? 2 : 1}
                  opacity={0.8}
                  className="transition-opacity hover:opacity-100" />
                <text x={lx} y={ly} textAnchor="middle" fontSize="6.5"
                  fill="#f8fafc" fontWeight="600" style={{ pointerEvents: "none" }}>
                  {name}
                </text>
              </g>
            );
          })}
          {hovItem && (
            <g>
              <rect x={8} y={8} width={200} height={60} rx={5} fill="#0a1628" stroke="#334155" strokeWidth={1}/>
              <text x={16} y={26} fontSize="11" fill="#f1f5f9" fontWeight="600">{hovItem.ccaa_nombre}</text>
              <text x={16} y={41} fontSize="10" fill="#94a3b8">{hovItem.article_count} artículos</text>
              <text x={16} y={55} fontSize="9" fill="#00D4FF">{hovItem.dominant_narrative}</text>
            </g>
          )}
        </svg>
      </div>

      <div className="space-y-3">
        <div className="premium-card py-3 px-4">
          <p className="text-[10px] uppercase tracking-wider text-text2 mb-2">Narrativa dominante</p>
          <div className="space-y-1.5">
            {Object.entries(NARRATIVE_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-xs text-text2 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
        {selItem && (
          <div className="premium-card py-3 px-4 border-cyan1/40">
            <p className="text-[10px] uppercase tracking-wider text-cyan1 mb-2">{selItem.ccaa_nombre}</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text2">Artículos</span>
                <span className="text-text1 font-semibold">{selItem.article_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text2">Sentimiento</span>
                <span className={`font-semibold ${Number(selItem.avg_sentiment||0)>0?"text-green1":"text-red1"}`}>
                  {Number(selItem.avg_sentiment||0)>0?"▲ Positivo":Number(selItem.avg_sentiment||0)<-0.05?"▼ Negativo":"→ Neutro"}
                </span>
              </div>
              <div>
                <span className="text-text2 block mb-1">Narrativa dominante</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                  style={{ background: narrativeColor(selItem.dominant_narrative) }}>
                  {selItem.dominant_narrative}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              className="mt-3 text-[10px] text-muted hover:text-text2 transition">× Cerrar detalle</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main NarrativeMap ────────────────────────────────────────────────────────
const VIEWS: { id: MapView; label: string; icon: typeof Globe }[] = [
  { id: "world",    label: "Mundo",       icon: Globe    },
  { id: "americas", label: "Américas",    icon: Compass  },
  { id: "europa",   label: "Europa",      icon: Map      },
  { id: "africa",   label: "África",      icon: Compass  },
  { id: "asia",     label: "Asia",        icon: Compass  },
  { id: "spain",    label: "España CCAA", icon: MapPin   },
];

export function NarrativeMap() {
  const [view, setView] = useState<MapView>("world");

  const worldQ = useQuery({
    queryKey: ["media-intel", "map", "world"],
    queryFn: () => endpoints.mediaIntelMapWorld().catch(() => []),
    staleTime: 5 * 60 * 1000,
  });
  const europeQ = useQuery({
    queryKey: ["media-intel", "map", "europe"],
    queryFn: () => endpoints.mediaIntelMapEurope().catch(() => []),
    staleTime: 5 * 60 * 1000,
    enabled: view === "europa",
  });
  const spainQ = useQuery({
    queryKey: ["media-intel", "map", "spain"],
    queryFn: () => endpoints.mediaIntelMapSpainCcaa().catch(() => []),
    staleTime: 5 * 60 * 1000,
    enabled: view === "spain",
  });

  // Americas, Africa, Asia reuse the world endpoint (same article-by-country data)
  const worldData = worldQ.data || [];

  const loading = (id: MapView) => {
    if (id === "world" || id === "americas" || id === "africa" || id === "asia") return worldQ.isLoading;
    if (id === "europa") return europeQ.isLoading;
    return spainQ.isLoading;
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-0.5 border-b border-border1 pb-2">
        {VIEWS.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition ${
                view === v.id
                  ? "bg-cyan1/15 text-cyan1 border border-cyan1/30 font-semibold"
                  : "text-text2 hover:text-text1 hover:bg-bg3"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-muted self-center">
          {view === "world"
            ? `${Object.keys(COUNTRY_COORDS).length} países mapeados`
            : view === "americas" ? "Norte · Centro · Suramérica"
            : view === "europa"  ? "Cobertura por país"
            : view === "africa"  ? "Cobertura africana"
            : view === "asia"    ? "Cobertura asiática"
            : "17 comunidades autónomas"}
        </span>
      </div>

      {/* Map canvas */}
      {loading(view) ? (
        <div className="h-72 flex items-center justify-center text-text2 text-sm">
          <div className="animate-spin w-5 h-5 border-2 border-cyan1 border-t-transparent rounded-full mr-2" />
          Cargando mapa...
        </div>
      ) : (
        <>
          {view === "world"    && <BubbleMap data={worldData}  region="world"    W={820} H={420} />}
          {view === "americas" && <BubbleMap data={worldData}  region="americas" W={820} H={460} />}
          {view === "europa"   && <EuropeMap data={europeQ.data || []} />}
          {view === "africa"   && <BubbleMap data={worldData}  region="africa"   W={820} H={440} />}
          {view === "asia"     && <BubbleMap data={worldData}  region="asia"     W={820} H={440} />}
          {view === "spain"    && <SpainCcaaMap data={spainQ.data || []} />}
        </>
      )}
    </div>
  );
}
