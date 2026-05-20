const BACKEND = process.env.BACKEND_URL ?? ''

export async function POST(req: Request) {
  const body = await req.json()
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/recipe-sensitivity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.BACKEND_API_KEY ?? '',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ base_cost: 0, shocks: [], error: 'no backend' })
}
