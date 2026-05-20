const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts/${encodeURIComponent(params.id)}`,
        { headers: { 'X-API-Key': API_KEY }, cache: 'no-store' },
      )
      if (res.ok) return Response.json(await res.json())
      if (res.status === 404) return Response.json({ error: 'not found' }, { status: 404 })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'backend not configured' }, { status: 502 })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts/${encodeURIComponent(params.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
          body: JSON.stringify(body),
          cache: 'no-store',
        },
      )
      if (res.ok) return Response.json(await res.json())
      return Response.json({ error: await res.text() }, { status: res.status })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'backend not configured' }, { status: 502 })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts/${encodeURIComponent(params.id)}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': API_KEY },
          cache: 'no-store',
        },
      )
      if (res.ok) return Response.json(await res.json())
      return Response.json({ error: await res.text() }, { status: res.status })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'backend not configured' }, { status: 502 })
}
