import { NextResponse } from 'next/server';
import pipelines from './pipelines.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Oleoductos y gasoductos del mundo (OpenStreetMap,
 * man_made=pipeline · substance=oil|gas). Líneas simplificadas (Douglas-Peucker).
 * Propiedad por feature: { k: 'oil' | 'gas' }.
 */
export async function GET() {
  return NextResponse.json(
    { pipelines, total: (pipelines as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
