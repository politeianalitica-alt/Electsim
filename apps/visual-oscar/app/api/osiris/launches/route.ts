import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Lanzamientos espaciales (Launch Library 2 / The Space Devs).
 * Próximos lanzamientos con su plataforma localizada. Cacheado agresivamente
 * (la API anónima está limitada a ~15 peticiones/hora).
 */
export async function GET() {
  try {
    const res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=40', {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 PoliteiaOsint' },
    });
    if (!res.ok) return NextResponse.json({ launches: [], total: 0 });
    const data = await res.json();
    const launches = (data.results || []).map((r: any) => {
      const pad = r.pad || {};
      const loc = pad.location || {};
      const lat = parseFloat(pad.latitude), lng = parseFloat(pad.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat, lng,
        name: r.name || '',
        net: r.net || '',
        status: r.status?.abbrev || '',
        pad: pad.name || '',
        location: loc.name || '',
        provider: r.launch_service_provider?.name || '',
      };
    }).filter(Boolean);
    return NextResponse.json({ launches, total: launches.length }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ launches: [], total: 0 });
  }
}
