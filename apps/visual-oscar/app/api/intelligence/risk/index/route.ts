import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { MOCK_RISK } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const wantHistory = url.searchParams.has('history')

  if (wantHistory) {
    // Historia: usa el endpoint backend si está disponible.
    const result = await callBackend<{ history?: Array<{ date: string; score: number }> } | Array<{ date: string; score: number }>>(
      '/intelligence/risk-index/history?n=30',
    )
    if (result.data) {
      const arr = Array.isArray(result.data) ? result.data : (result.data.history ?? [])
      if (arr.length > 0) {
        const historia = arr.map(p => ({ ts: new Date(p.date).toISOString(), valor: p.score }))
        return NextResponse.json(withMeta({ historia }, 'backend', { latency_ms: result.latency_ms }))
      }
    }
    const start = new Date('2026-04-27T00:00:00Z').getTime()
    const historia = MOCK_RISK.sparkline.map((v, i) => ({
      ts: new Date(start + i * 86400_000).toISOString(),
      valor: v,
    }))
    return NextResponse.json(
      withMeta({ historia }, 'mock', {
        warnings: result.error ? [`backend_unreachable:${result.error}`] : ['empty_history'],
        latency_ms: result.latency_ms,
      }),
    )
  }

  // Índice de Riesgo Político actual
  const result = await callBackend<{ score: number; nivel: string; componentes: Record<string, number>; timestamp: string }>(
    '/intelligence/risk-index',
  )
  if (result.data) {
    return NextResponse.json(withMeta(result.data, 'backend', { latency_ms: result.latency_ms }))
  }
  return NextResponse.json(
    withMeta(MOCK_RISK, 'mock', {
      warnings: result.error ? [`backend_unreachable:${result.error}`] : ['empty_dataset'],
      latency_ms: result.latency_ms,
    }),
  )
}
