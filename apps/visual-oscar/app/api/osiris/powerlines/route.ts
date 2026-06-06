import { NextResponse } from 'next/server';
import powerlines from './powerlines.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Red eléctrica de alta tensión (OpenStreetMap, power=line con
 * voltaje >= 100 kV). Líneas de transmisión simplificadas (Douglas-Peucker).
 */
export async function GET() {
  return NextResponse.json(
    { powerlines, total: (powerlines as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
