import { NextResponse } from 'next/server';
import rivers from './rivers.json';
import points from './points.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Accidentes geográficos (dataset estático, Natural Earth).
 * - rivers: ríos principales del mundo (líneas).
 * - points: picos, cordilleras, desiertos, mesetas, cuencas, deltas, valles,
 *   cascadas, cabos… (puntos con categoría y, en picos, elevación).
 */
export async function GET() {
  return NextResponse.json(
    {
      rivers,
      points,
      total_rivers: (rivers as any).features?.length || 0,
      total_points: (points as any[]).length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
