import type { Escenario } from '@/types/inteligencia';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') ?? '';
  try {
    if (BACKEND) {
      const res = await fetch(
 `${BACKEND}/api/v1/inteligencia/escenarios${estado ? `?estado=${estado}` : ''}`,
        { headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' }, next: { revalidate: 600 } }
      );
      if (res.ok) return Response.json(await res.json());
    }
    return Response.json({ escenarios: [] as Escenario[] });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
