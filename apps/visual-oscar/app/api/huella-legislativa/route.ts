import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { EXPEDIENTES, TOP_ORGS, REGISTRO } from '@/data/huella-legislativa-fixture'
import type { ExpedienteHuella, TopOrg, RegistroLobby } from '@/data/huella-legislativa-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/legislative/lobby-trace` (cuando exista). Mientras
// tanto, sirve los 4 expedientes curados + TOP_ORGS + REGISTRO con
// `_meta.source='mock'` y `_warnings=['lobby_trace_endpoint_not_yet_in_backend']`.

interface BackendHuella {
  expedientes?: ExpedienteHuella[]
  top_orgs?: TopOrg[]
  registro?: RegistroLobby[]
}

export async function GET() {
  const result = await callBackend<BackendHuella>('/api/legislative/lobby-trace')

  if (
    result.data &&
    Array.isArray(result.data.expedientes) &&
    result.data.expedientes.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          expedientes: result.data.expedientes,
          top_orgs: result.data.top_orgs ?? [],
          registro: result.data.registro ?? [],
        },
        'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: fixture (4 expedientes curados — IRPF, vivienda, jornada, antitabaco).
  return NextResponse.json(
    withMeta(
      { expedientes: EXPEDIENTES, top_orgs: TOP_ORGS, registro: REGISTRO },
      'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['lobby_trace_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
