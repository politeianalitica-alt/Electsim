import { NextResponse } from 'next/server';
import coastPoints from './coast_points.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Politeia — Estado del mar (altura de ola) — Open-Meteo Marine, gratis, sin
 * clave. Consulta ~700 puntos costeros de todo el mundo (muestreados de la línea
 * de costa de Natural Earth) por lotes, para que casi todas las costas tengan su
 * altura de ola actual.
 */
function waveColor(h: number): string {
  if (h < 1) return '#26C6DA';
  if (h < 2) return '#66BB6A';
  if (h < 3) return '#FFEE58';
  if (h < 4) return '#FFA726';
  if (h < 6) return '#EF5350';
  return '#AB47BC';
}

async function fetchBatch(pts: number[][]) {
  try {
    const lats = pts.map((p) => p[1]).join(',');
    const lngs = pts.map((p) => p[0]).join(',');
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&current=wave_height`, {
      signal: AbortSignal.timeout(13000),
    });
    if (!res.ok) return [] as any[];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((d: any, i: number) => {
      const h = d?.current?.wave_height;
      if (typeof h !== 'number' || !pts[i]) return null;
      return { lat: pts[i][1], lng: pts[i][0], h, color: waveColor(h) };
    }).filter(Boolean);
  } catch {
    return [] as any[];
  }
}

export async function GET() {
  const pts = coastPoints as number[][]; // [[lng,lat], ...]
  const BATCH = 90, CONC = 4;
  const batches: number[][][] = [];
  for (let i = 0; i < pts.length; i += BATCH) batches.push(pts.slice(i, i + BATCH));
  const points: any[] = [];
  for (let i = 0; i < batches.length; i += CONC) {
    const r = await Promise.all(batches.slice(i, i + CONC).map(fetchBatch));
    r.forEach((x) => points.push(...x));
  }
  return NextResponse.json(
    { points, total: points.length },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
  );
}
