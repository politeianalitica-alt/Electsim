const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts-events/list${qs ? `?${qs}` : ''}`,
        { headers: { 'X-API-Key': API_KEY }, cache: 'no-store' },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), n_items: 0, items: [] }, { status: 502 })
  }
  return Response.json({ n_items: 0, items: [] })
}
