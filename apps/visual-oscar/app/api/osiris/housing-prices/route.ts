import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * Politeia — Precio de la vivienda (€/m²).
 *
 * España: precio medio del m² de vivienda libre por comunidad autónoma
 * (dato oficial del ecosistema INE/MITMA, último disponible ~2024, redondeado
 * y orientativo). Se ENRIQUECE en vivo con la variación interanual del Índice
 * de Precios de Vivienda (IPV) del INE — esos sí son datos del INE en directo
 * (API Tempus3, tabla 79540).
 *
 * Otros países: precio medio nacional aproximado (€/m²) donde existe dato
 * oficial publicado. Marcados como "media nacional aprox." con su año.
 *
 * Nota de honestidad: ni el INE ni Eurostat publican €/m² por API abierta
 * (solo un ÍNDICE base 2015=100). Por eso los €/m² son una instantánea
 * oficial curada y la parte "live" es la variación del IPV.
 */

interface PriceRow {
  scope: 'ccaa' | 'country';
  name: string;
  lat: number;
  lng: number;
  price: number;      // €/m²
  year: number;
  source: string;
  yoy?: number;       // variación interanual % (INE, solo España si live OK)
}

// ── España · €/m² vivienda libre por CCAA (MITMA/INE, ~2024, orientativo) ──
const SPAIN_CCAA: Array<Omit<PriceRow, 'scope' | 'source'>> = [
  { name: 'Madrid',              lat: 40.42, lng: -3.70, price: 3300, year: 2024 },
  { name: 'Illes Balears',       lat: 39.60, lng: 2.90,  price: 3750, year: 2024 },
  { name: 'País Vasco',          lat: 43.00, lng: -2.62, price: 2950, year: 2024 },
  { name: 'Cataluña',            lat: 41.80, lng: 1.70,  price: 2450, year: 2024 },
  { name: 'Canarias',            lat: 28.30, lng: -16.5, price: 2050, year: 2024 },
  { name: 'Cantabria',           lat: 43.20, lng: -4.03, price: 1750, year: 2024 },
  { name: 'C. Valenciana',       lat: 39.40, lng: -0.60, price: 1700, year: 2024 },
  { name: 'Andalucía',           lat: 37.40, lng: -4.80, price: 1650, year: 2024 },
  { name: 'Navarra',             lat: 42.70, lng: -1.65, price: 1650, year: 2024 },
  { name: 'Aragón',              lat: 41.40, lng: -0.90, price: 1500, year: 2024 },
  { name: 'Galicia',             lat: 42.80, lng: -8.00, price: 1450, year: 2024 },
  { name: 'Asturias',            lat: 43.30, lng: -5.99, price: 1420, year: 2024 },
  { name: 'La Rioja',            lat: 42.30, lng: -2.50, price: 1350, year: 2024 },
  { name: 'Castilla y León',     lat: 41.70, lng: -4.80, price: 1320, year: 2024 },
  { name: 'Región de Murcia',    lat: 38.00, lng: -1.50, price: 1250, year: 2024 },
  { name: 'Castilla-La Mancha',  lat: 39.40, lng: -3.30, price: 1080, year: 2024 },
  { name: 'Extremadura',         lat: 39.20, lng: -6.10, price: 950,  year: 2024 },
];

// ── Otros países · €/m² medio nacional aproximado (fuentes nacionales) ──
const COUNTRIES: Array<Omit<PriceRow, 'scope' | 'source' | 'yoy'>> = [
  { name: 'Portugal',        lat: 39.5,  lng: -8.0,  price: 1700, year: 2024 },
  { name: 'Francia',         lat: 46.6,  lng: 2.4,   price: 3100, year: 2024 },
  { name: 'Alemania',        lat: 51.2,  lng: 10.4,  price: 3600, year: 2024 },
  { name: 'Italia',          lat: 42.8,  lng: 12.6,  price: 2050, year: 2024 },
  { name: 'Países Bajos',    lat: 52.2,  lng: 5.3,   price: 3900, year: 2024 },
  { name: 'Reino Unido',     lat: 53.0,  lng: -1.5,  price: 3500, year: 2024 },
  { name: 'Irlanda',         lat: 53.2,  lng: -8.0,  price: 3300, year: 2024 },
  { name: 'Bélgica',         lat: 50.6,  lng: 4.6,   price: 2700, year: 2024 },
  { name: 'Austria',         lat: 47.6,  lng: 14.1,  price: 4500, year: 2024 },
  { name: 'Suiza',           lat: 46.8,  lng: 8.2,   price: 7800, year: 2024 },
  { name: 'Luxemburgo',      lat: 49.8,  lng: 6.1,   price: 8500, year: 2024 },
  { name: 'Polonia',         lat: 52.0,  lng: 19.4,  price: 2100, year: 2024 },
  { name: 'Suecia',          lat: 60.1,  lng: 15.6,  price: 3600, year: 2024 },
  { name: 'Dinamarca',       lat: 56.0,  lng: 10.0,  price: 3400, year: 2024 },
  { name: 'Noruega',         lat: 61.0,  lng: 8.5,   price: 4600, year: 2024 },
  { name: 'Grecia',          lat: 39.0,  lng: 22.0,  price: 1600, year: 2024 },
  { name: 'Estados Unidos',  lat: 39.5,  lng: -98.0, price: 3000, year: 2024 },
];

export function priceColor(eur: number): string {
  if (eur < 1200) return '#2E7D32';   // muy asequible
  if (eur < 1800) return '#9CCC65';
  if (eur < 2500) return '#FFEE58';
  if (eur < 3500) return '#FFA726';
  if (eur < 5000) return '#FF7043';
  return '#D32F2F';                     // muy caro
}

/** Variación interanual del IPV nacional (INE, tabla 79540) en vivo. */
async function fetchIneYoY(): Promise<{ national: number | null; byCcaa: Record<string, number> }> {
  const out = { national: null as number | null, byCcaa: {} as Record<string, number> };
  try {
    const res = await fetch('https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/79540?nult=1', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return out;
    const series = await res.json();
    if (!Array.isArray(series)) return out;
    for (const s of series) {
      const nombre: string = s?.Nombre ?? '';
      // Solo variaciones anuales del índice GENERAL (no nueva/segunda mano)
      if (!/Variación anual/i.test(nombre) || !/General/i.test(nombre)) continue;
      const data = s?.Data;
      const val = Array.isArray(data) && data.length ? data[data.length - 1]?.Valor : null;
      if (typeof val !== 'number') continue;
      if (/Nacional/i.test(nombre)) out.national = val;
      else {
        const ccaa = nombre.split('.')[0].trim();
        if (ccaa) out.byCcaa[ccaa] = val;
      }
    }
  } catch {
    /* INE no disponible: se devuelve el €/m² curado sin la variación live */
  }
  return out;
}

// Normaliza nombres de CCAA del INE a los de nuestra tabla (acentos/variantes).
function matchCcaaYoY(name: string, byCcaa: Record<string, number>): number | undefined {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const target = norm(name);
  for (const [k, v] of Object.entries(byCcaa)) {
    const kk = norm(k);
    if (kk === target || kk.includes(target.split(' ')[0]) || target.includes(kk.split(' ')[0])) return v;
  }
  return undefined;
}

export async function GET() {
  const ine = await fetchIneYoY();

  const rows: PriceRow[] = [
    ...SPAIN_CCAA.map((r) => ({
      ...r, scope: 'ccaa' as const,
      source: '€/m² vivienda libre (MITMA/INE)',
      yoy: matchCcaaYoY(r.name, ine.byCcaa) ?? ine.national ?? undefined,
    })),
    ...COUNTRIES.map((r) => ({
      ...r, scope: 'country' as const,
      source: 'Media nacional aprox.',
    })),
  ];

  return NextResponse.json(
    {
      rows,
      spain_yoy: ine.national,             // variación IPV nacional INE (live)
      total: rows.length,
      note: '€/m² oficial orientativo (último disponible). Variación interanual = INE IPV en vivo.',
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
