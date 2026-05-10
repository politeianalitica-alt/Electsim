import { getSectorMeta } from '@/config/sectores';
import type { SectorReport } from '@/types/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const meta = getSectorMeta(params.id);
  if (!meta) return Response.json({ error: 'sector not found' }, { status: 404 });

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      });
      if (res.ok) return Response.json(await res.json());
      if (res.status === 404) return Response.json({ error: 'not found' }, { status: 404 });
    }

    const empty: SectorReport = {
      sector_id: params.id,
      generado_en: new Date().toISOString(),
      score: {
        score_riesgo: 0,
        score_actividad_legislativa: 0,
        score_volatilidad: 0,
        nivel: 'bajo',
        tendencia: 'sin_datos',
        timestamp: new Date().toISOString(),
      },
      kpis: [],
      actores: [],
      eventos_recientes: [],
      iniciativas_legislativas_ids: [],
      alertas: [],
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
