import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Pronóstico de auroras (NOAA SWPC OVATION, gratis, sin clave).
 * Grid mundial de probabilidad de aurora (0-100). Devolvemos solo los puntos
 * con probabilidad apreciable (>=8) para no saturar el mapa.
 */
export async function GET() {
  try {
    const res = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return NextResponse.json({ points: [], total: 0 });
    const data = await res.json();
    const coords: number[][] = data?.coordinates || [];
    const points = coords
      .filter((c) => c[2] >= 8)
      .map((c) => ({ lng: c[0] > 180 ? c[0] - 360 : c[0], lat: c[1], p: c[2] }));
    return NextResponse.json(
      { points, total: points.length, forecast: data?.['Forecast Time'] || '' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch {
    return NextResponse.json({ points: [], total: 0 });
  }
}
