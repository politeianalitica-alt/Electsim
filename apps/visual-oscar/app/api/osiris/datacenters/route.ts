import { NextResponse } from 'next/server';
import datacenters from './datacenters.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Centros de datos (OpenStreetMap, telecom=data_center /
 * building=data_centre). Puntos con nombre.
 */
export async function GET() {
  return NextResponse.json(
    { datacenters, total: (datacenters as any[]).length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
