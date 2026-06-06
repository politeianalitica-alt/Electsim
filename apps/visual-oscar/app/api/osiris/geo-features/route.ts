import { NextResponse } from 'next/server';
import rivers from './rivers.json';
import points from './points.json';
import areas from './areas.json';

export const dynamic = 'force-dynamic';

/**
 * Politeia — Accidentes geográficos (dataset estático, Natural Earth).
 * - rivers: ríos principales del mundo (líneas).
 * - areas: cordilleras, desiertos, mesetas, cuencas, llanuras, deltas, humedales,
 *   tundras… como POLÍGONOS (áreas sombreadas). Categorías: range, desert,
 *   upland, lowland, wetland, land, tundra.
 * - points: picos individuales, cascadas y otros accidentes puntuales
 *   (puntos con categoría y, en picos, elevación).
 */
export async function GET() {
  return NextResponse.json(
    {
      rivers,
      areas,
      points,
      total_rivers: (rivers as any).features?.length || 0,
      total_areas: (areas as any).features?.length || 0,
      total_points: (points as any[]).length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
