import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Politeia — Sistemas meteorológicos (borrascas, anticiclones y vientos).
 *
 * Fuente: Open-Meteo Forecast API (gratis, sin clave), igual que el estado del
 * mar. Muestrea una rejilla regular sobre la ventana euro-atlántica-mediterránea
 * (donde viven los sistemas sinópticos que afectan a España) y obtiene en cada
 * nodo la presión a nivel del mar (pressure_msl) y el viento a 10 m.
 *
 *   - Borrascas (B)    = mínimos locales de presión (centros de baja).
 *   - Anticiclones (A) = máximos locales de presión (centros de alta).
 *   - Vientos          = vectores de viento submuestreados de la rejilla.
 *
 * Devuelve:
 *   {
 *     centers: [{ lat, lng, type:'low'|'high', pressure, label, intensity }],
 *     winds:   [{ lat, lng, dir, speed, color }],
 *     total, timestamp
 *   }
 */

// Ventana sinóptica: Atlántico Norte + Europa + Mediterráneo + N. de África.
// LAT_MIN=24 para que el barrido (72,69,…,27,24) alcance de verdad el sur (el
// rango es múltiplo de STEP desde 72).
const LNG_MIN = -60, LNG_MAX = 45, LAT_MIN = 24, LAT_MAX = 72, STEP = 3;

interface GridNode {
  lat: number;
  lng: number;
  row: number;
  col: number;
  p: number | null;     // pressure_msl (hPa)
  ws: number | null;    // wind speed (km/h)
  wd: number | null;    // wind direction (deg, "from")
}

function buildGrid(): GridNode[][] {
  const grid: GridNode[][] = [];
  let row = 0;
  for (let lat = LAT_MAX; lat >= LAT_MIN; lat -= STEP, row++) {
    const cols: GridNode[] = [];
    let col = 0;
    for (let lng = LNG_MIN; lng <= LNG_MAX; lng += STEP, col++) {
      cols.push({ lat, lng, row, col, p: null, ws: null, wd: null });
    }
    grid.push(cols);
  }
  return grid;
}

async function fetchBatch(nodes: GridNode[]): Promise<void> {
  try {
    const lats = nodes.map((n) => n.lat).join(',');
    const lngs = nodes.map((n) => n.lng).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
      `&current=pressure_msl,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`;
    const res = await fetch(url, { signal: AbortSignal.timeout(13000) });
    if (!res.ok) return;
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    arr.forEach((d: any, i: number) => {
      const n = nodes[i];
      if (!n || !d?.current) return;
      const p = d.current.pressure_msl;
      const ws = d.current.wind_speed_10m;
      const wd = d.current.wind_direction_10m;
      if (typeof p === 'number') n.p = p;
      if (typeof ws === 'number') n.ws = ws;
      if (typeof wd === 'number') n.wd = wd;
    });
  } catch {
    /* lote fallido: los nodos quedan con null y se ignoran */
  }
}

function windColor(kmh: number): string {
  if (kmh < 12) return '#4FC3F7';   // flojo
  if (kmh < 30) return '#66BB6A';   // moderado
  if (kmh < 50) return '#FFEE58';   // fresco
  if (kmh < 62) return '#FFA726';   // fuerte
  if (kmh < 89) return '#EF5350';   // temporal
  return '#AB47BC';                  // huracanado
}

function lowLabel(p: number): string {
  if (p < 985) return 'Borrasca profunda';
  if (p < 1000) return 'Borrasca';
  return 'Baja presión';
}
function highLabel(p: number): string {
  if (p > 1032) return 'Anticiclón potente';
  if (p > 1020) return 'Anticiclón';
  return 'Alta presión';
}

export async function GET() {
  const grid = buildGrid();
  const flat = grid.flat();

  // Muestreo por lotes (mismo patrón probado en sea-state). CONC alto para que
  // los ~6 lotes quepan en UNA ola y el peor caso de latencia no se acerque a
  // maxDuration (antes 2 olas × 13 s podían rozar los 30 s con cold start).
  const BATCH = 100, CONC = 8;
  const batches: GridNode[][] = [];
  for (let i = 0; i < flat.length; i += BATCH) batches.push(flat.slice(i, i + BATCH));
  for (let i = 0; i < batches.length; i += CONC) {
    await Promise.all(batches.slice(i, i + CONC).map(fetchBatch));
  }

  // ── Detección de centros de presión (extremos locales, radio 1) ──
  const rows = grid.length;
  type Center = { lat: number; lng: number; type: 'low' | 'high'; pressure: number; label: string; intensity: number };
  const rawCenters: Center[] = [];
  for (let r = 1; r < rows - 1; r++) {
    const cols = grid[r].length;
    for (let c = 1; c < cols - 1; c++) {
      const node = grid[r][c];
      if (node.p == null) continue;
      // Vecindario 3×3 con presión válida
      const neigh: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const m = grid[r + dr]?.[c + dc];
          if (m && m.p != null) neigh.push(m.p);
        }
      }
      // Exigir los 8 vecinos válidos: si un lote de Open-Meteo falla, los nodos
      // del hueco quedan null y un nodo-borde podría declararse extremo falso
      // (no se comparan los vecinos que faltan). Con ===8 nunca hay centro
      // fantasma en el borde de un hueco de datos.
      if (neigh.length < 8) continue;
      const isLow = neigh.every((q) => node.p! < q) && node.p < 1010;
      const isHigh = neigh.every((q) => node.p! > q) && node.p > 1018;
      if (isLow) {
        rawCenters.push({ lat: node.lat, lng: node.lng, type: 'low', pressure: node.p, label: lowLabel(node.p), intensity: 1010 - node.p });
      } else if (isHigh) {
        rawCenters.push({ lat: node.lat, lng: node.lng, type: 'high', pressure: node.p, label: highLabel(node.p), intensity: node.p - 1018 });
      }
    }
  }

  // Dedupe: dentro de ~500 km conserva el más intenso de su tipo. Usa distancia
  // REAL (la longitud se comprime con la latitud), no grados crudos: 5° de lng
  // valen ~480 km a 30N pero ~170 km a 72N, lo que fusionaría sistemas distintos.
  const DEDUPE_KM = 500;
  const centers: Center[] = [];
  for (const cand of rawCenters.sort((a, b) => b.intensity - a.intensity)) {
    const near = centers.some((k) => {
      if (k.type !== cand.type) return false;
      const dLat = (k.lat - cand.lat) * 111;
      const dLng = (k.lng - cand.lng) * 111 * Math.cos((cand.lat * Math.PI) / 180);
      return Math.hypot(dLat, dLng) < DEDUPE_KM;
    });
    if (!near) centers.push(cand);
  }

  // ── Vectores de viento (submuestreo: 1 de cada 2 nodos) ──
  const winds: { lat: number; lng: number; dir: number; speed: number; color: string }[] = [];
  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < grid[r].length; c += 2) {
      const n = grid[r][c];
      if (n.ws == null || n.wd == null) continue;
      winds.push({ lat: n.lat, lng: n.lng, dir: n.wd, speed: Math.round(n.ws), color: windColor(n.ws) });
    }
  }

  // Si todo falló (Open-Meteo caído/limitado) NO cacheamos 30 min una respuesta
  // vacía en el edge: cache corto para que se recupere pronto en el próximo hit.
  const empty = centers.length === 0 && winds.length === 0;
  const cache = empty
    ? 'public, s-maxage=60'
    : 'public, s-maxage=1800, stale-while-revalidate=3600';
  return NextResponse.json(
    { centers, winds, total: centers.length + winds.length, timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': cache } },
  );
}
