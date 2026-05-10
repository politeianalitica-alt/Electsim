import type { TermometroHistorico } from '@/types/inteligencia';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dias = searchParams.get('dias') ?? '30';
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/termometro/historico?dias=${dias}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 3600 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: TermometroHistorico = { serie: [], eventos_marcados: [] };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
