const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 3600

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '1y'
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/${encodeURIComponent(params.slug)}/technical?range=${range}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 3600 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), slug: params.slug }, { status: 502 })
  }
  return Response.json({ slug: params.slug, indicators: null, signal: 'neutro' })
}
