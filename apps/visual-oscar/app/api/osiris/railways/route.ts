import { NextResponse } from 'next/server';
import railways from './railways.json';
import highspeed from './railways-hs.json';
import commuter from './railways-commuter.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Red ferroviaria mundial, separada por tipo de servicio:
 *   · railways  — red convencional/regular (Natural Earth 10m, dominio público)
 *   · highspeed — líneas de alta velocidad (OpenStreetMap, highspeed=yes)
 *   · commuter  — cercanías / suburbano (OpenStreetMap, rutas service=commuter)
 * Líneas simplificadas con Douglas-Peucker. Capa estática de contexto.
 */
export async function GET() {
  return NextResponse.json(
    {
      railways,
      highspeed,
      commuter,
      total: (railways as any).features?.length || 0,
      total_highspeed: (highspeed as any).features?.[0]?.geometry?.coordinates?.length || 0,
      total_commuter: (commuter as any).features?.[0]?.geometry?.coordinates?.length || 0,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
