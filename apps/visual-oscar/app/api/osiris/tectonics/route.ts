import { NextResponse } from 'next/server';
import plates from './plates.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Placas tectónicas (límites de placas, Peter Bird PB2002, dominio
 * público vía fraxen/tectonicplates). 241 líneas de borde de placa.
 */
export async function GET() {
  return NextResponse.json(
    { plates, total: (plates as any).features?.length || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
