export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { evidencia_id: string; score: -2 | -1 | 0 | 1 | 2; nota?: string }
    try {
      if (BACKEND) {
        const res = await fetch(`${BACKEND}/api/v1/intelligence/hipotesis/${params.id}/ach`, {
          method: 'PATCH',
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) return Response.json(await res.json())
      }
    } catch {}
    return Response.json({ ok: true, hipotesis_id: params.id, ...body })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
