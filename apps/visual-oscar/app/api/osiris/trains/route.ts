import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Trenes en directo (multi-país, APIs abiertas sin clave):
 *   · Finlandia  — Fintraffic Digitraffic (REST, km/h)
 *   · Irlanda    — Irish Rail Realtime (XML; sin velocidad)
 *   · EE. UU.    — Amtrak vía amtraker.com (REST, mph → km/h)
 * Cada tren: { lat, lng, number, speed (km/h|null), country, route }.
 */

type Train = { lat: number; lng: number; number: string; speed: number | null; country: string; route?: string };

const MPH_TO_KMH = 1.60934;

async function fetchFinland(): Promise<Train[]> {
  try {
    const res = await fetch('https://rata.digitraffic.fi/api/v1/train-locations/latest/', {
      headers: { 'Digitraffic-User': 'PoliteiaOsint', 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((t: any): Train | null => {
      const c = (t.location || {}).coordinates;
      if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
      return { lat: c[1], lng: c[0], number: String(t.trainNumber ?? ''), speed: typeof t.speed === 'number' ? t.speed : null, country: 'FI' };
    }).filter(Boolean) as Train[];
  } catch { return []; }
}

async function fetchIreland(): Promise<Train[]> {
  try {
    const res = await fetch('http://api.irishrail.ie/realtime/realtime.asmx/getCurrentTrainsXML', {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const out: Train[] = [];
    for (const block of xml.split('<objTrainPositions>').slice(1)) {
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
        return m ? m[1].trim() : '';
      };
      const lat = parseFloat(get('TrainLatitude'));
      const lng = parseFloat(get('TrainLongitude'));
      const status = get('TrainStatus'); // 'R' = running
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
      if (status && status !== 'R') continue;
      out.push({ lat, lng, number: get('TrainCode'), speed: null, country: 'IE', route: get('PublicMessage').split('\\n')[0] || undefined });
    }
    return out;
  } catch { return []; }
}

async function fetchUSA(): Promise<Train[]> {
  try {
    const res = await fetch('https://api-v3.amtraker.com/v3/trains', { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    const data = await res.json();
    const out: Train[] = [];
    for (const key of Object.keys(data || {})) {
      const arr = Array.isArray(data[key]) ? data[key] : [];
      for (const t of arr) {
        const lat = Number(t.lat), lng = Number(t.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
        const v = Number(t.velocity);
        out.push({
          lat, lng,
          number: String(t.trainNum ?? t.trainID ?? ''),
          speed: Number.isFinite(v) ? Math.round(v * MPH_TO_KMH) : null,
          country: 'US',
          route: t.routeName || undefined,
        });
      }
    }
    return out;
  } catch { return []; }
}

export async function GET() {
  const [fi, ie, us] = await Promise.all([fetchFinland(), fetchIreland(), fetchUSA()]);
  const trains = [...fi, ...ie, ...us];
  const byCountry = { FI: fi.length, IE: ie.length, US: us.length };
  return NextResponse.json(
    { trains, total: trains.length, byCountry, source: 'Digitraffic (FI) · Irish Rail (IE) · Amtraker (US)' },
    { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } },
  );
}
