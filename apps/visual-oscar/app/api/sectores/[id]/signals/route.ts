/**
 * Proxy Next.js → FastAPI · /api/v1/sectores/{id}/signals
 *
 * Devuelve la lista de señales unificadas (BOE + prensa) del sector.
 * Capa de inteligencia transversal descrita en el PDF Bloque 10.
 *
 * Estrategia: si BACKEND_URL responde 200 → propagar. Cualquier otro
 * caso (404, 500, timeout, sin backend) → devolver { signals: [] }
 * para que el componente renderice "Sin señales" en vez de romper.
 */
import { getSectorMeta } from '@/config/sectores';
import type { SectorSignalsResponse } from '@/types/sector-signals';

const BACKEND = process.env.BACKEND_URL ?? '';

const empty = (id: string): SectorSignalsResponse => ({
  sector_id: id,
  days: 7,
  total: 0,
  signals: [],
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const meta = getSectorMeta(params.id);
  if (!meta) return Response.json({ error: 'sector_not_found' }, { status: 404 });

  const url = new URL(req.url);
  const days = url.searchParams.get('days') ?? '7';
  const limit = url.searchParams.get('limit') ?? '30';

  if (BACKEND) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `${BACKEND}/api/v1/sectores/${params.id}/signals?days=${days}&limit=${limit}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 300 },
          signal: controller.signal,
        },
      );
      clearTimeout(t);
      if (res.ok) return Response.json(await res.json());
    } catch {
      // timeout, DNS, tunnel caído → caer a vacío
    }
  }
  return Response.json(empty(params.id));
}
