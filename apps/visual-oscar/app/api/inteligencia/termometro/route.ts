import type { TermometroSnapshot } from '@/types/inteligencia';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 300;

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/termometro`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: TermometroSnapshot = {
      timestamp: new Date().toISOString(),
      temperatura: 0,
      nivel: 'calma',
      variacion_24h: 0,
      variacion_7d: 0,
      dimensiones: [],
      senales_activas_count: 0,
    };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
