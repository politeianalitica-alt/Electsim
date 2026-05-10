import type { PanelMacro } from '@/types/inteligencia';

export const revalidate = 3600;
const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/macro`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 3600 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: PanelMacro = {
      generado_en: new Date().toISOString(),
      indicadores: [],
      score_estabilidad_macro: 0,
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
