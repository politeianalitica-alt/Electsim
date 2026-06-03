import { NextResponse } from 'next/server';
import airports from './airports.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Aeropuertos (OurAirports). ~5.278 aeropuertos grandes y medianos
 * del mundo con código IATA, ciudad y país.
 */
export async function GET() {
  return NextResponse.json(
    { airports, total: (airports as any[]).length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
