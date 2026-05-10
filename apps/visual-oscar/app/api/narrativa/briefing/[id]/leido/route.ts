export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!BACKEND) return Response.json({ id: params.id, leido: true })
  try {
    const res = await fetch(`${BACKEND}/api/v1/narrativa/briefing/${params.id}/leido`, {
      method: 'PATCH',
      headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
    })
    if (res.ok) return Response.json(await res.json())
    return Response.json({ id: params.id, leido: true })
  } catch {
    return Response.json({ id: params.id, leido: true })
  }
}
