import type { MatrizRiesgo } from '@/types/inteligencia';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 300;

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/riesgo`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: MatrizRiesgo = {
      generado_en: new Date().toISOString(),
      score_global: 0,
      nivel_global: 'bajo',
      dimensiones: [],
      horizonte_30d: { periodo: '30d', score_esperado: 0, rango_min: 0, rango_max: 0, probabilidad_escalada: 0, eventos_clave: [] },
      horizonte_90d: { periodo: '90d', score_esperado: 0, rango_min: 0, rango_max: 0, probabilidad_escalada: 0, eventos_clave: [] },
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
