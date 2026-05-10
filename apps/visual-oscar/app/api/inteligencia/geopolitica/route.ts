import type { MapaGeopolitico } from '@/types/inteligencia';

export const revalidate = 600;
const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/geopolitica`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 600 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: MapaGeopolitico = {
      generado_en: new Date().toISOString(),
      eventos_activos: [],
      alertas_globales: [],
      score_exposicion_exterior: 0,
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
