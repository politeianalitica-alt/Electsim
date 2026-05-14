import { getSectorMeta } from '@/config/sectores';
import type { EventoSectorial } from '@/types/sectores';

const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!getSectorMeta(params.id)) return Response.json({ error: 'not found' }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  if (BACKEND) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}/eventos?${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 600 },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) return Response.json(await res.json());
    } catch { /* timeout, DNS, tunnel down → fallback abajo */ }
  }
  const empty: { eventos: EventoSectorial[] } = { eventos: [] };
  return Response.json(empty);
}
