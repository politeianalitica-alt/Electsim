import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Ruta de vuelo por callsign.
 * Usa adsbdb.com (libre, sin key): devuelve aeropuerto de ORIGEN y DESTINO
 * cuando la ruta es PÚBLICA. Para vuelos privados/militares devuelve
 * `public:false` (adsbdb no publica ni origen ni destino → "ruta no pública").
 * Cachea en memoria: una ruta callsign→aeropuertos no cambia durante el vuelo.
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type Airport = { lat: number; lng: number; code: string; name: string; city?: string; country?: string };
type RouteResult = { public: boolean; origin: Airport | null; destination: Airport | null };

const cache = new Map<string, { data: RouteResult; t: number }>();
const TTL = 1800000; // 30 min

function pickAirport(a: any): Airport | null {
  if (!a) return null;
  const lat = a.latitude, lng = a.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    lat, lng,
    code: a.icao_code || a.iata_code || '',
    name: a.name || '',
    city: a.municipality || undefined,
    country: a.country_iso_name || undefined,
  };
}

export async function GET(req: NextRequest) {
  const cs = (req.nextUrl.searchParams.get('callsign') || '').trim().toUpperCase();
  if (!cs || cs.length < 3) {
    return NextResponse.json({ public: false, origin: null, destination: null });
  }

  const cached = cache.get(cs);
  if (cached && Date.now() - cached.t < TTL) {
    return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }

  let result: RouteResult = { public: false, origin: null, destination: null };
  try {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const d = await res.json();
      const fr = d && d.response && typeof d.response === 'object' ? d.response.flightroute : null;
      if (fr) {
        const origin = pickAirport(fr.origin);
        const destination = pickAirport(fr.destination);
        result = { public: !!(origin && destination), origin, destination };
      }
    }
  } catch {
    /* red caída → ruta no pública */
  }

  cache.set(cs, { data: result, t: Date.now() });
  if (cache.size > 5000) { const k = cache.keys().next().value; if (k) cache.delete(k); }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
}
