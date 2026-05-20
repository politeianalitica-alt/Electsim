import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { AI_CONFIG } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Intenta backend real primero (politeia_v3.py · GET /api/system/status)
  const real = await fromBackend<Record<string, unknown>>('/api/system/status')
  if (real) return NextResponse.json(withMeta(real, 'backend'))

  // LLM status real (refleja AI_CONFIG.provider en vez de hardcoded ollama)
  const llmStatus = (() => {
    if (AI_CONFIG.provider === 'anthropic') {
      return { provider: 'anthropic', model: AI_CONFIG.anthropicModel, fast_model: AI_CONFIG.anthropicFastModel, status: 'ready' as const }
    }
    if (AI_CONFIG.provider === 'ollama') {
      return { provider: 'ollama', model: AI_CONFIG.defaultModel, status: 'idle' as const }
    }
    return { provider: 'none', model: 'mock', status: 'fallback' as const }
  })()

  // Fallback mock con timestamp dinámico (cambia cada llamada)
  const now = Date.now()
  return NextResponse.json(withMeta({
    api: 'ok',
    db: 'ok',
    llm: llmStatus,
    pipelines: { ingestion: 'idle', last_run: new Date(now - 1_800_000).toISOString() },
    modules: ['intelligence', 'market', 'analytics', 'opposition', 'campana'],
    uptime_s: Math.floor(now / 1000) % 86400,
  }, 'mock'))
}
