import { getSectorMeta } from '@/config/sectores';
import type { KPISectorial } from '@/types/sectores';
import type { SectorFuente } from '@/config/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const meta = getSectorMeta(params.id);
  if (!meta) return Response.json({ error: 'sector not found' }, { status: 404 });

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}/kpis`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: meta.fuentes_datos[0]?.revalidate_s ?? 3600 },
      });
      if (res.ok) return Response.json(await res.json());
    }

    const kpis = await fetchKPIsFromSources(params.id, meta.fuentes_datos);
    return Response.json({ kpis });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}

async function fetchKPIsFromSources(
  _sectorId: string,
  fuentes: SectorFuente[]
): Promise<KPISectorial[]> {
  const results: KPISectorial[] = [];

  for (const fuente of fuentes) {
    // Each source returns sin_datos until backend integration is available
    results.push({
      id: fuente.id,
      nombre: fuente.nombre,
      nombre_corto: fuente.nombre.split(' · ')[1] ?? fuente.nombre,
      valor: null,
      unidad: '',
      tendencia: 'sin_datos',
      periodo: '',
      fuente_id: fuente.id,
    });
  }

  return results;
}
