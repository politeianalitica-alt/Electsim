const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 1800

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '1mo'
  const interval = searchParams.get('interval') ?? '1d'

  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/${encodeURIComponent(params.slug)}/price?range=${range}&interval=${interval}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 1800 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), slug: params.slug, ohlc: [] }, { status: 502 })
  }
  return Response.json({ slug: params.slug, available: false, ohlc: [] })
}
