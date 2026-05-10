import type { PanelIndices, IndiceCompuesto, IdIndice } from '@/types/inteligencia';

export const revalidate = 300;
const BACKEND = process.env.BACKEND_URL ?? '';

const ID_LABELS: Record<IdIndice, string> = {
  riesgo_politico: 'Riesgo político',
  estabilidad_gobernabilidad: 'Estabilidad gobernabilidad',
  temperatura_politica: 'Temperatura política',
  exposicion_exterior: 'Exposición exterior',
  vulnerabilidad_macro: 'Vulnerabilidad macro',
  actividad_legislativa: 'Actividad legislativa',
};

const INDICES_VACIOS: IndiceCompuesto[] = (Object.keys(ID_LABELS) as IdIndice[]).map(id => ({
  id,
  nombre: ID_LABELS[id],
  descripcion: '',
  valor: 0,
  nivel: 'bajo' as const,
  variacion_7d: 0,
  variacion_30d: 0,
  componentes: [],
  timestamp: new Date().toISOString(),
}));

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/indices`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: PanelIndices = {
      generado_en: new Date().toISOString(),
      indices: INDICES_VACIOS,
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
