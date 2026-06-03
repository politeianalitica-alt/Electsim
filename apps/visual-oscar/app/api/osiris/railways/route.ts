import { NextResponse } from 'next/server';
import railways from './railways.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Red ferroviaria mundial (Natural Earth 10m railroads, dominio
 * público). ~25.000 líneas de vía simplificadas (Douglas-Peucker) cubriendo
 * todos los continentes. Capa estática de contexto (infraestructura).
 * Propiedades por feature: { c: continente, s: scalerank }.
 */
export async function GET() {
  return NextResponse.json(
    { railways, total: (railways as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
