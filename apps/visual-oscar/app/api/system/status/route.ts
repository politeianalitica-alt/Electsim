import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { AI_CONFIG } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// LLM status real basado en la config actual del Next.js (no del backend).
// El backend FastAPI puede tener su propia config (ej: "ollama-or-cloud")
// pero quien hace las llamadas LLM desde el dashboard somos NOSOTROS, así
// que reportamos NUESTRO provider real para que la UI no engañe al usuario.
function getLlmStatus() {
  if (AI_CONFIG.provider === 'anthropic') {
    return {
      provider: 'anthropic',
      model: AI_CONFIG.anthropicModel,
      fast_model: AI_CONFIG.anthropicFastModel,
      status: 'ready' as const,
    }
  }
  if (AI_CONFIG.provider === 'ollama') {
    return {
      provider: 'ollama',
      model: AI_CONFIG.defaultModel,
      status: 'idle' as const,
    }
  }
  return { provider: 'none', model: 'mock', status: 'fallback' as const }
}

export async function GET() {
  const ourLlm = getLlmStatus()

  // Intenta backend real primero (politeia_v3.py · GET /api/system/status)
  const real = await fromBackend<Record<string, unknown>>('/api/system/status')
  if (real) {
    // Override: el provider REAL es el del Next.js (Anthropic/Ollama).
    // El backend puede reportar otra cosa pero eso refleja SU LLM interno,
    // no el que usa el dashboard del usuario.
    return NextResponse.json(withMeta({ ...real, llm: ourLlm, llm_dashboard: ourLlm, llm_backend: (real as { llm?: unknown }).llm ?? null }, 'backend'))
  }

  // Fallback mock con timestamp dinámico (cambia cada llamada)
  const now = Date.now()
  return NextResponse.json(withMeta({
    api: 'ok',
    db: 'ok',
    llm: ourLlm,
    pipelines: { ingestion: 'idle', last_run: new Date(now - 1_800_000).toISOString() },
    modules: ['intelligence', 'market', 'analytics', 'opposition', 'campana'],
    uptime_s: Math.floor(now / 1000) % 86400,
  }, 'mock'))
}
