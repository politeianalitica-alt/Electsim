import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { CRISIS, PLAYBOOKS } from '@/data/crisis-fixture'
import type { Crisis, Playbook } from '@/data/crisis-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/intelligence/signals?tipo=crisis` (cuando exista
// adaptador de señales-crisis con stakeholders/hitos/acciones). Mientras
// tanto, sirve las 6 crisis curadas + 4 playbooks con
// `_meta.source='mock'` y `_warnings=['crisis_endpoint_not_yet_in_backend']`.

interface BackendCrisis {
  crisis?: Crisis[]
  playbooks?: Playbook[]
}

export async function GET() {
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
          playbooks: result.data.playbooks ?? [],
        },
        'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: fixture (6 crisis · DANA, aranceles, apagón, FGE, INE, sequía + 4 playbooks).
  return NextResponse.json(
    withMeta(
      { crisis: CRISIS, playbooks: PLAYBOOKS },
      'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['crisis_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
