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

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/sectores/${params.id}/eventos?${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 600 },
      });
      if (res.ok) return Response.json(await res.json());
    }
    const empty: { eventos: EventoSectorial[] } = { eventos: [] };
    return Response.json(empty);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
