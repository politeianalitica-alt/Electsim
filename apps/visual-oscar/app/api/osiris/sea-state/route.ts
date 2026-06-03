import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Estado del mar (altura de ola) — Open-Meteo Marine, gratis, sin
 * clave. Grid oceánico mundial (se excluyen las grandes masas continentales);
 * cada punto trae la altura significativa de ola actual.
 */
// Cajas continentales aproximadas a excluir (lat0,lat1,lng0,lng1)
const LAND: number[][] = [
  [15, 72, -168, -52],   // Norteamérica
  [-56, 13, -82, -34],   // Sudamérica
  [-35, 37, -18, 52],    // África
  [35, 71, -10, 60],     // Europa
  [5, 78, 60, 180],      // Asia
  [-45, -10, 112, 154],  // Australia
];
function isLand(lat: number, lng: number) {
  return LAND.some(([a, b, c, d]) => lat >= a && lat <= b && lng >= c && lng <= d);
}
function waveColor(h: number): string {
  if (h < 1) return '#26C6DA';
  if (h < 2) return '#66BB6A';
  if (h < 3) return '#FFEE58';
  if (h < 4) return '#FFA726';
  if (h < 6) return '#EF5350';
  return '#AB47BC';
}

export async function GET() {
  try {
    const pts: Array<[number, number]> = [];
    for (let lat = -55; lat <= 65; lat += 18) {
      for (let lng = -170; lng <= 175; lng += 18) {
        if (!isLand(lat, lng)) pts.push([lat, lng]);
      }
    }
    const lats = pts.map((p) => p[0]).join(',');
    const lngs = pts.map((p) => p[1]).join(',');
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&current=wave_height`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ points: [], total: 0 });
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    const points = arr.map((d: any, i: number) => {
      const h = d?.current?.wave_height;
      if (typeof h !== 'number' || !pts[i]) return null;
      return { lat: pts[i][0], lng: pts[i][1], h, color: waveColor(h) };
    }).filter(Boolean);
    return NextResponse.json(
      { points, total: points.length },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json({ points: [], total: 0 });
  }
}
