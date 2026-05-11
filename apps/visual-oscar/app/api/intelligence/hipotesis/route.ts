import type { Hipotesis, HipotesisACH } from '@/types/intelligence'
import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { MOCK_HIPOTESIS, MOCK_ACH_SCORES, MOCK_EVIDENCIAS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// El dominio "hipótesis" tiene una respuesta especial (matriz ACH con
// evidencias y scores), por eso no usa el helper genérico `listDomain`.

export async function GET(req: Request) {
  const url = new URL(req.url)
  const canvas_id = url.searchParams.get('canvas_id') ?? 'cnv-001'

  // Intento backend: si responde con `items` o `matriz`, lo usamos.
  const result = await callBackend<HipotesisACH>(
    `/api/intelligence/hipotesis?canvas_id=${encodeURIComponent(canvas_id)}`,
  )
  if (result.data && (result.data.hipotesis?.length ?? 0) > 0) {
    return NextResponse.json(withMeta(result.data, 'backend', { latency_ms: result.latency_ms }))
  }

  // Fallback: ACH curado en `_mock.ts`.
  const hipotesis = MOCK_HIPOTESIS.filter(h => h.canvas_id === canvas_id)
  const evidenciaIds = new Set(MOCK_ACH_SCORES.map(s => s.evidencia_id))
  const evidencias = MOCK_EVIDENCIAS.filter(e => evidenciaIds.has(e.id))
  const matriz = MOCK_ACH_SCORES.filter(s => hipotesis.some(h => h.id === s.hipotesis_id))
  const data: HipotesisACH = { canvas_id, hipotesis, evidencias, matriz }
  return NextResponse.json(
    withMeta(data, 'mock', {
      warnings: result.error ? [`backend_unreachable:${result.error}`] : ['empty_dataset'],
      latency_ms: result.latency_ms,
    }),
  )
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { canvas_id: string; enunciado: string; orden?: number }
    const result = await callBackend<Hipotesis>('/api/intelligence/hipotesis', {
      method: 'POST',
      body: JSON.stringify({ claim: body.enunciado, data: { canvas_id: body.canvas_id, orden: body.orden ?? 0 } }),
    })
    if (result.data) {
      return NextResponse.json(withMeta(result.data, 'backend', { latency_ms: result.latency_ms }))
    }
    // Fallback local (no persistido).
    const item: Hipotesis = {
      id: `hip-${Date.now()}`,
      canvas_id: body.canvas_id,
      enunciado: body.enunciado,
      orden: body.orden ?? 0,
    }
    void nowIso()
    return NextResponse.json(withMeta(item, 'mock', { warnings: ['backend_unreachable:create_not_persisted'] }))
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
