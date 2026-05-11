import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ConfigPayload {
  n_indices: number
  indices: Array<{
    index_id: string
    display_name: string
    icon: string
    description?: string
    components: Array<{
      source_id: string
      metric_name: string
      weight: number
      transform: string
      normalize_method: string
      source_name?: string
    }>
  }>
  sources: Array<{
    source_id: string
    name: string
    cadencia: string
    market: string
    is_active: boolean
    last_fetch?: string | null
    last_error?: string | null
  }>
}

export async function GET() {
  const r = await callBackend<ConfigPayload>('/api/risk-v2/config', { cache: 'no-store' })
  if (r.data && Array.isArray(r.data.indices)) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { n_indices: 0, indices: [], sources: [] },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_config'],
      latency_ms: r.latency_ms,
    },
  ))
}
