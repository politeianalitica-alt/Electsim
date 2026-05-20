const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts${qs ? `?${qs}` : ''}`,
        { headers: { 'X-API-Key': API_KEY }, cache: 'no-store' },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), n_items: 0, items: [] }, { status: 502 })
  }
  return Response.json({ n_items: 0, items: [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
      const err = await res.text()
      return Response.json({ error: err || `status ${res.status}` }, { status: res.status })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'no backend configurado' }, { status: 502 })
}
