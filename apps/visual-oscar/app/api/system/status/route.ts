import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Intenta backend real primero (politeia_v3.py · GET /api/system/status)
  const real = await fromBackend<Record<string, unknown>>('/api/system/status')
  if (real) return NextResponse.json(withMeta(real, 'backend'))

  // Fallback mock con timestamp dinámico (cambia cada llamada)
  const now = Date.now()
  return NextResponse.json(withMeta({
    api: 'ok',
    db: 'ok',
    llm: { provider: 'ollama', model: 'qwen2.5:7b', status: 'idle' },
    pipelines: { ingestion: 'idle', last_run: new Date(now - 1_800_000).toISOString() },
    modules: ['intelligence', 'market', 'analytics', 'opposition', 'campana'],
    uptime_s: Math.floor(now / 1000) % 86400,
  }, 'mock'))
}
