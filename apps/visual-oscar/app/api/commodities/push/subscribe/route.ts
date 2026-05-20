const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'body inválido' }, { status: 400 })
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      return Response.json(data, { status: res.status })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'sin backend' }, { status: 502 })
}
