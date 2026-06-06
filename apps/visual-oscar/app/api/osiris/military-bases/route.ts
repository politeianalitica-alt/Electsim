import { NextResponse } from 'next/server';
import bases from './bases.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Bases e instalaciones militares (Wikidata). ~9.900 con coordenadas.
 */
export async function GET() {
  return NextResponse.json(
    { bases, total: (bases as any[]).length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
