import { NextResponse } from 'next/server';
import volcanoes from './volcanoes.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Volcanes (Smithsonian Global Volcanism Program, Holoceno).
 * ~1.215 volcanes con tipo, elevación, país y última erupción conocida.
 */
export async function GET() {
  return NextResponse.json(
    { volcanoes, total: (volcanoes as any[]).length },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
