const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 600

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/recipes/${encodeURIComponent(params.slug)}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 600 },
        },
      )
      if (res.ok) return Response.json(await res.json())
      if (res.status === 404) return Response.json({ error: 'no encontrada' }, { status: 404 })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ slug: params.slug, available: false })
}
