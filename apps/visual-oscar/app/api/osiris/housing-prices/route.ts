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
  scope: 'muni' | 'country';
  name: string;
  lat: number;
  lng: number;
  price: number;      // €/m²
  year: number;
  source: string;
  ccaa?: string;      // para emparejar la variación INE por CCAA
  yoy?: number;       // variación interanual % (INE, solo España si live OK)
}

// ── España · €/m² por municipio (capitales de provincia + grandes ciudades) ──
// Snapshot oficial orientativo ~2024 (€/m² vivienda libre, ecosistema INE/MITMA),
// redondeado. `ccaa` se usa para colgar la variación interanual del IPV (INE live).
const SPAIN_MUNI: Array<Omit<PriceRow, 'scope' | 'source'>> = [
  { name: 'Donostia / San Sebastián', lat: 43.32, lng: -1.98, price: 5500, year: 2024, ccaa: 'País Vasco' },
  { name: 'Barcelona',          lat: 41.39, lng: 2.17,  price: 4400, year: 2024, ccaa: 'Cataluña' },
  { name: 'Madrid',             lat: 40.42, lng: -3.70, price: 4200, year: 2024, ccaa: 'Madrid' },
  { name: 'Palma',              lat: 39.57, lng: 2.65,  price: 3700, year: 2024, ccaa: 'Illes Balears' },
  { name: "L'Hospitalet",       lat: 41.36, lng: 2.10,  price: 3500, year: 2024, ccaa: 'Cataluña' },
  { name: 'Marbella',           lat: 36.51, lng: -4.89, price: 3500, year: 2024, ccaa: 'Andalucía' },
  { name: 'Bilbao',             lat: 43.26, lng: -2.93, price: 3300, year: 2024, ccaa: 'País Vasco' },
  { name: 'Málaga',             lat: 36.72, lng: -4.42, price: 3000, year: 2024, ccaa: 'Andalucía' },
  { name: 'Cádiz',              lat: 36.53, lng: -6.29, price: 2700, year: 2024, ccaa: 'Andalucía' },
  { name: 'Vitoria-Gasteiz',    lat: 42.85, lng: -2.67, price: 2700, year: 2024, ccaa: 'País Vasco' },
  { name: 'Pamplona',           lat: 42.81, lng: -1.64, price: 2700, year: 2024, ccaa: 'Navarra' },
  { name: 'Santander',          lat: 43.46, lng: -3.81, price: 2550, year: 2024, ccaa: 'Cantabria' },
  { name: 'Valencia',           lat: 39.47, lng: -0.38, price: 2450, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Girona',             lat: 41.98, lng: 2.82,  price: 2450, year: 2024, ccaa: 'Cataluña' },
  { name: 'Sevilla',            lat: 37.39, lng: -5.99, price: 2400, year: 2024, ccaa: 'Andalucía' },
  { name: 'A Coruña',           lat: 43.37, lng: -8.40, price: 2350, year: 2024, ccaa: 'Galicia' },
  { name: 'Las Palmas de G.C.', lat: 28.12, lng: -15.43, price: 2300, year: 2024, ccaa: 'Canarias' },
  { name: 'Alicante',           lat: 38.35, lng: -0.48, price: 2150, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Granada',            lat: 37.18, lng: -3.60, price: 2100, year: 2024, ccaa: 'Andalucía' },
  { name: 'Sta. Cruz de Tenerife', lat: 28.47, lng: -16.25, price: 2100, year: 2024, ccaa: 'Canarias' },
  { name: 'Vigo',               lat: 42.24, lng: -8.72, price: 2100, year: 2024, ccaa: 'Galicia' },
  { name: 'Zaragoza',           lat: 41.65, lng: -0.89, price: 2050, year: 2024, ccaa: 'Aragón' },
  { name: 'Gijón',              lat: 43.53, lng: -5.66, price: 2000, year: 2024, ccaa: 'Asturias' },
  { name: 'Salamanca',          lat: 40.97, lng: -5.66, price: 2000, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Oviedo',             lat: 43.36, lng: -5.85, price: 1950, year: 2024, ccaa: 'Asturias' },
  { name: 'Tarragona',          lat: 41.12, lng: 1.25,  price: 1900, year: 2024, ccaa: 'Cataluña' },
  { name: 'Burgos',             lat: 42.34, lng: -3.70, price: 1900, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Logroño',            lat: 42.47, lng: -2.45, price: 1900, year: 2024, ccaa: 'La Rioja' },
  { name: 'Pontevedra',         lat: 42.43, lng: -8.64, price: 1850, year: 2024, ccaa: 'Galicia' },
  { name: 'Valladolid',         lat: 41.65, lng: -4.72, price: 1800, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Segovia',            lat: 40.95, lng: -4.12, price: 1700, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Córdoba',            lat: 37.89, lng: -4.78, price: 1700, year: 2024, ccaa: 'Andalucía' },
  { name: 'Guadalajara',        lat: 40.63, lng: -3.16, price: 1700, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Ourense',            lat: 42.34, lng: -7.86, price: 1650, year: 2024, ccaa: 'Galicia' },
  { name: 'Almería',            lat: 36.84, lng: -2.46, price: 1600, year: 2024, ccaa: 'Andalucía' },
  { name: 'Toledo',             lat: 39.86, lng: -4.02, price: 1600, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Huesca',             lat: 42.14, lng: -0.41, price: 1600, year: 2024, ccaa: 'Aragón' },
  { name: 'Huelva',             lat: 37.26, lng: -6.94, price: 1550, year: 2024, ccaa: 'Andalucía' },
  { name: 'Castellón',          lat: 39.99, lng: -0.04, price: 1500, year: 2024, ccaa: 'C. Valenciana' },
  { name: 'Murcia',             lat: 37.99, lng: -1.13, price: 1500, year: 2024, ccaa: 'Región de Murcia' },
  { name: 'León',               lat: 42.60, lng: -5.57, price: 1500, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Lugo',               lat: 43.01, lng: -7.56, price: 1500, year: 2024, ccaa: 'Galicia' },
  { name: 'Lleida',             lat: 41.62, lng: 0.62,  price: 1450, year: 2024, ccaa: 'Cataluña' },
  { name: 'Albacete',           lat: 38.99, lng: -1.86, price: 1400, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Cáceres',            lat: 39.47, lng: -6.37, price: 1400, year: 2024, ccaa: 'Extremadura' },
  { name: 'Palencia',           lat: 42.01, lng: -4.53, price: 1400, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Soria',              lat: 41.76, lng: -2.46, price: 1400, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Ávila',              lat: 40.66, lng: -4.70, price: 1350, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Zamora',             lat: 41.50, lng: -5.74, price: 1350, year: 2024, ccaa: 'Castilla y León' },
  { name: 'Teruel',             lat: 40.34, lng: -1.11, price: 1350, year: 2024, ccaa: 'Aragón' },
  { name: 'Mérida',             lat: 38.92, lng: -6.34, price: 1300, year: 2024, ccaa: 'Extremadura' },
  { name: 'Badajoz',            lat: 38.88, lng: -6.97, price: 1300, year: 2024, ccaa: 'Extremadura' },
  { name: 'Cuenca',             lat: 40.07, lng: -2.14, price: 1300, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Jaén',               lat: 37.77, lng: -3.79, price: 1250, year: 2024, ccaa: 'Andalucía' },
  { name: 'Ciudad Real',        lat: 38.99, lng: -3.93, price: 1200, year: 2024, ccaa: 'Castilla-La Mancha' },
  { name: 'Ceuta',              lat: 35.89, lng: -5.31, price: 2100, year: 2024, ccaa: 'Ceuta' },
  { name: 'Melilla',            lat: 35.29, lng: -2.94, price: 2000, year: 2024, ccaa: 'Melilla' },
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
    ...SPAIN_MUNI.map((r) => ({
      ...r, scope: 'muni' as const,
      source: '€/m² vivienda libre (MITMA/INE) · aprox.',
      yoy: matchCcaaYoY(r.ccaa ?? '', ine.byCcaa) ?? ine.national ?? undefined,
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
