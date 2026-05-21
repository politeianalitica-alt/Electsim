import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { CRISIS, PLAYBOOKS } from '@/data/crisis-fixture'
import type { Crisis, Playbook } from '@/data/crisis-fixture'
import { deriveCrisisFromSignals } from '@/lib/crisis-derive'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Cascada con 3 niveles:
 *   1. Backend FastAPI /api/intelligence/signals?tipo=crisis (cuando exista)
 *   2. AGREGADOR LIVE · deriva crisis del cluster SIGINT de /api/crisis/signals
 *      (GDELT · INCIBE · CCN-CERT · EMSC · Google News · Wikipedia · Congreso)
 *   3. Fallback estructural · fixture curado (6 crisis verosímiles + 4 playbooks)
 *
 * Los PLAYBOOKS siempre se sirven del fixture (son guías de respuesta · estables
 * por diseño · no derivables de señales en vivo).
 */

interface BackendCrisis {
  crisis?: Crisis[]
  playbooks?: Playbook[]
}

export async function GET(req: NextRequest) {
  // 1. Backend FastAPI
  const result = await callBackend<BackendCrisis>('/api/intelligence/signals?tipo=crisis')
  if (
    result.data &&
    Array.isArray(result.data.crisis) &&
    result.data.crisis.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          crisis: result.data.crisis,
          playbooks: result.data.playbooks ?? PLAYBOOKS,
        },
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // 2. Agregador LIVE · deriva clusters del feed SIGINT
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${proto}://${host}`
  try {
    const liveCrisis = await deriveCrisisFromSignals(baseUrl, req.headers.get('cookie') || '')
    if (liveCrisis && liveCrisis.length > 0) {
      return NextResponse.json(
        withMeta(
          { crisis: liveCrisis, playbooks: PLAYBOOKS },
 'aggregator',
          {
            warnings: [`live_clusters:${liveCrisis.length}`, 'derived_from_sigint_signals'],
            latency_ms: result.latency_ms,
          },
        ),
      )
    }
  } catch (e) {
    console.warn('[crisis] derive failed:', e instanceof Error ? e.message : e)
  }

  // 3. Fallback estructural · fixture
  return NextResponse.json(
    withMeta(
      { crisis: CRISIS, playbooks: PLAYBOOKS },
 'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`, 'aggregator_no_clusters']
          : ['aggregator_no_clusters'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
