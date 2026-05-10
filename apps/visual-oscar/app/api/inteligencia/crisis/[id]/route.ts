const BACKEND = process.env.BACKEND_URL ?? '';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/inteligencia/crisis/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 120 },
      });
      if (res.ok) return Response.json(await res.json());
      if (res.status === 404) return Response.json({ error: 'not found' }, { status: 404 });
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
