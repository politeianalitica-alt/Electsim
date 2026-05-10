import type { SenalCritica } from '@/types/inteligencia';

const BACKEND = process.env.BACKEND_URL ?? '';
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/senales?${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    return Response.json({ senales: [] as SenalCritica[] });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
