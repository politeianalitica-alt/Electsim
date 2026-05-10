import type { CrisisActiva } from '@/types/inteligencia';

export const revalidate = 120;
const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/crisis`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 120 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    return Response.json({ crisis: [] as CrisisActiva[] });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
