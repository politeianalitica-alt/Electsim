import { getSectorIds } from '@/config/sectores';
import type { SectoresIndex, ScoreSectorial } from '@/types/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 300;

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/sectores/index`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      });
      if (res.ok) return Response.json(await res.json());
    }

    const emptyScore: ScoreSectorial = {
      score_riesgo: 0,
      score_actividad_legislativa: 0,
      score_volatilidad: 0,
      nivel: 'bajo',
      tendencia: 'sin_datos',
      timestamp: new Date().toISOString(),
    };

    const empty: SectoresIndex = {
      sectores: getSectorIds().map(id => ({
        id,
        score: { ...emptyScore },
        kpis_destacados: [],
        alertas_count: 0,
        ultima_actualizacion: new Date().toISOString(),
      })),
      generado_en: new Date().toISOString(),
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
