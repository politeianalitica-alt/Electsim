import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Trenes en directo (Fintraffic Digitraffic, Finlandia). REST libre,
 * sin clave. Posición, velocidad y número de cada tren circulando.
 */
export async function GET() {
  try {
    const res = await fetch('https://rata.digitraffic.fi/api/v1/train-locations/latest/', {
      headers: { 'Digitraffic-User': 'PoliteiaOsint', 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ trains: [], total: 0 });
    const data = await res.json();
    const trains = (Array.isArray(data) ? data : []).map((t: any) => {
      const c = (t.location || {}).coordinates;
      if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
      return {
        lat: c[1], lng: c[0],
        number: t.trainNumber,
        speed: typeof t.speed === 'number' ? t.speed : null,
        date: t.departureDate || '',
      };
    }).filter(Boolean);
    return NextResponse.json({ trains, total: trains.length, source: 'Fintraffic Digitraffic (Finlandia)' },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } });
  } catch {
    return NextResponse.json({ trains: [], total: 0 });
  }
}
