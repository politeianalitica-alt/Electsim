import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Estaciones terrestres de satélite (red SatNOGS). REST libre.
 * Estaciones de seguimiento de satélites de radioaficionados de todo el mundo.
 */
export async function GET() {
  try {
    const res = await fetch('https://network.satnogs.org/api/stations/?format=json', {
      headers: { 'User-Agent': 'PoliteiaOsint' },
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return NextResponse.json({ stations: [], total: 0 });
    const data = await res.json();
    const stations = (Array.isArray(data) ? data : []).map((s: any) => {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return null;
      const bands = Array.from(new Set((s.antenna || []).map((a: any) => a.band).filter(Boolean)));
      return {
        lat: s.lat, lng: s.lng,
        name: s.name || `Estación ${s.id}`,
        status: s.status || '',
        altitude: s.altitude,
        bands: bands.join(', '),
        id: s.id,
      };
    }).filter(Boolean);
    return NextResponse.json({ stations, total: stations.length },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } });
  } catch {
    return NextResponse.json({ stations: [], total: 0 });
  }
}
