import { NextResponse } from 'next/server';
import agriculture from './agriculture.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Agricultura: grandes regiones de cultivo del mundo (lista curada),
 * como áreas sombreadas coloreadas por tipo de cultivo. Cada feature lleva
 * { name, crop, color }.
 */
export async function GET() {
  return NextResponse.json(
    { agriculture, total: (agriculture as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
