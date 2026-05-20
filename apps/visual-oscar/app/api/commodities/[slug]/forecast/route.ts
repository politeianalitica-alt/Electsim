const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 3600

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const horizon = searchParams.get('horizon') ?? '30'
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/${encodeURIComponent(params.slug)}/forecast?horizon=${horizon}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 3600 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), slug: params.slug, forecast: [] }, { status: 502 })
  }
  return Response.json({ slug: params.slug, horizon: Number(horizon), forecast: [] })
}
