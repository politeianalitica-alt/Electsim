import { NextResponse } from 'next/server';
import lighthouses from './lighthouses.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Faros y ayudas a la navegación (OpenStreetMap, man_made=lighthouse).
 * ~7.900 faros con nombre.
 */
export async function GET() {
  return NextResponse.json(
    { lighthouses, total: (lighthouses as any[]).length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
