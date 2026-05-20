const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.template_id) {
    return Response.json({ error: 'template_id requerido' }, { status: 400 })
  }
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/alerts/rule-templates/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(body),
          cache: 'no-store',
        },
      )
      return Response.json(await res.json().catch(() => ({})), { status: res.status })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
  return Response.json({ error: 'sin backend' }, { status: 502 })
}
