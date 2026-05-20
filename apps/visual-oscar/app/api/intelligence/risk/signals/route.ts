import type { SignalsSnapshot } from '@/types/intelligence'
import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { MOCK_SIGNALS, nowIso } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Backend real: /intelligence/signals filtrado por urgencia alta.
  const result = await callBackend<unknown[]>('/intelligence/signals?urgencia_min=3&limit=50')
  if (Array.isArray(result.data) && result.data.length > 0) {
    return NextResponse.json(
      withMeta(
        { items: result.data, total: result.data.length, generado_en: nowIso() } as SignalsSnapshot,
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }
  return NextResponse.json(
    withMeta(
      { items: MOCK_SIGNALS, total: MOCK_SIGNALS.length, generado_en: nowIso() } as SignalsSnapshot,
 'mock',
      {
        warnings: result.error ? [`backend_unreachable:${result.error}`] : ['empty_dataset'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
