import { NextResponse } from 'next/server';
import CONTROL from '../_data/conflict-control.json';

export const dynamic = 'force-static';

/**
 * Politeia — Control territorial de conflictos (estilo DeepState) para las
 * guerras distintas de Ucrania (Gaza, Líbano, Sudán, Myanmar, RD Congo, Sahel,
 * Siria). GeoJSON de polígonos de control por facción.
 *
 * IMPORTANTE: a diferencia de Ucrania (DeepState live), estos conflictos NO
 * tienen API de control en abierto. Son polígonos APROXIMADOS, curados a partir
 * de OSINT (ISW, Liveuamap, PolGeoNow, prensa). Cada zona lleva su facción,
 * estado, fuente y fecha (`asof`). No es cartografía operativa.
 */
export async function GET() {
  const fc = CONTROL as { type: string; features: any[] };
  return NextResponse.json(
    { control: fc, count: fc.features?.length ?? 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
  );
}
