import { NextResponse } from 'next/server';
import data from './data.json';

// Infraestructura digital: puntos de intercambio de internet (IXP), estaciones
// de aterrizaje de cables submarinos y apagones/cortes de internet notables.
// Los aterrizajes se sirven EN VIVO desde TeleGeography (~1.917 estaciones
// globales); IXP y shutdowns siguen siendo dataset curado OSINT.
export const dynamic = 'force-dynamic';

export async function GET() {
  let landings: any[] = data.landings;
  try {
    const r = await fetch('https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (PoliteiaOSINT)' },
    });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.features) && j.features.length > 0) {
        landings = j.features
          .map((f: any) => ({
            lat: f.geometry?.coordinates?.[1],
            lng: f.geometry?.coordinates?.[0],
            name: f.properties?.name || 'Estación de aterrizaje',
            id: f.properties?.id,
          }))
          .filter((l: any) => typeof l.lat === 'number' && typeof l.lng === 'number');
      }
    }
  } catch {
    // fallback al dataset curado local
  }

  return NextResponse.json(
    {
      ixps: data.ixps,
      landings,
      shutdowns: data.shutdowns,
      total: data.ixps.length + landings.length + data.shutdowns.length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
