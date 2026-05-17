import { getSectorMeta } from '@/config/sectores';
import type { ActorSectorial } from '@/types/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  if (!getSectorMeta(params.id)) return Response.json({ error: 'not found' }, { status: 404 });

  if (BACKEND) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}/actores`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 86400 },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) return Response.json(await res.json());
    } catch { /* timeout, DNS, tunnel down → fallback abajo */ }
  }
  const empty: { actores: ActorSectorial[] } = { actores: [] };
  return Response.json(empty);
}
