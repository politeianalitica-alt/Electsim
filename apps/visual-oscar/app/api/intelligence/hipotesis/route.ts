import type { Hipotesis, HipotesisACH } from '@/types/intelligence'
import { MOCK_HIPOTESIS, MOCK_ACH_SCORES, MOCK_EVIDENCIAS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(req: Request) {
  const url = new URL(req.url)
  const canvas_id = url.searchParams.get('canvas_id') ?? 'cnv-001'
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/hipotesis?canvas_id=${canvas_id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const hipotesis = MOCK_HIPOTESIS.filter(h => h.canvas_id === canvas_id)
  const evidenciaIds = new Set(MOCK_ACH_SCORES.map(s => s.evidencia_id))
  const evidencias = MOCK_EVIDENCIAS.filter(e => evidenciaIds.has(e.id))
  const matriz = MOCK_ACH_SCORES.filter(s => hipotesis.some(h => h.id === s.hipotesis_id))
  const result: HipotesisACH = { canvas_id, hipotesis, evidencias, matriz }
  return Response.json(result)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { canvas_id: string; enunciado: string; orden?: number }
    const newItem: Hipotesis = {
      id: `hip-${Date.now()}`,
      canvas_id: body.canvas_id,
      enunciado: body.enunciado,
      orden: body.orden ?? 0,
    }
    void nowIso()
    return Response.json(newItem)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
