import { getSectorMeta } from '@/config/sectores';
import type { SectorReport } from '@/types/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';

/**
 * /api/sectores/[id]
 *
 * Devuelve el SectorReport del sector solicitado. Estrategia:
 *   1. Si el sector NO está en config → 404 (esto sí es legítimo).
 *   2. Si el backend FastAPI responde 200 → devolver sus datos.
 *   3. Cualquier otro caso (backend 404, 500, timeout, DNS error,
 *      tunnel caído, sin BACKEND_URL…) → devolver SectorReport vacío
 *      con score 0 para que la página renderice y no rompa.
 *
 * NUNCA devolvemos 502 al cliente: el `useSector` hook lanza Error en
 * cualquier respuesta != 2xx y la página muestra "Error cargando sector".
 */
const empty = (id: string): SectorReport => ({
  sector_id: id,
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
});

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const meta = getSectorMeta(params.id);
  if (!meta) return Response.json({ error: 'sector not found' }, { status: 404 });

  if (BACKEND) {
    try {
      // Timeout corto · si el backend no responde en 5s, caemos a vacío
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) return Response.json(await res.json());
      // Cualquier non-OK del backend → no propagar, caer a vacío
    } catch {
      // Timeout, DNS error, tunnel caído, etc. → caer a vacío
    }
  }
  return Response.json(empty(params.id));
}
