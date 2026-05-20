import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import {
  PRESIDENTE,
  VICEPRESIDENCIAS,
  MINISTROS,
  APOYOS,
  HITOS,
} from '@/data/gobierno-coalicion-fixture'
import type {
  Ministro,
  Apoyo,
  Hito,
} from '@/data/gobierno-coalicion-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/legislative/government-composition` (cuando exista).
// Mientras tanto, sirve PRESIDENTE + 3 vicepresidencias + 18 ministros +
// 11 apoyos + 10 hitos con `_meta.source='mock'` y
// `_warnings=['government_composition_endpoint_not_yet_in_backend']`.

interface BackendGobierno {
  presidente?: Ministro
  vicepresidencias?: Ministro[]
  ministros?: Ministro[]
  apoyos?: Apoyo[]
  hitos?: Hito[]
}

export async function GET() {
  const result = await callBackend<BackendGobierno>('/api/legislative/government-composition')

  if (
    result.data &&
    result.data.presidente &&
    Array.isArray(result.data.ministros) &&
    result.data.ministros.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          presidente: result.data.presidente,
          vicepresidencias: result.data.vicepresidencias ?? [],
          ministros: result.data.ministros,
          apoyos: result.data.apoyos ?? [],
          hitos: result.data.hitos ?? [],
        },
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: fixture (Gobierno de coalición XV Legislatura).
  return NextResponse.json(
    withMeta(
      {
        presidente: PRESIDENTE,
        vicepresidencias: VICEPRESIDENCIAS,
        ministros: MINISTROS,
        apoyos: APOYOS,
        hitos: HITOS,
      },
 'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['government_composition_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
