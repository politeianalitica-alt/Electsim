import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { COMPETIDORES, WIN_LOSS, INFORMES_HISTORICO } from '@/data/competidores-fixture'
import type { Competidor, WinLossEntry, InformeGenerado } from '@/data/competidores-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/crm/organizations?type=competidor` (cuando el módulo
// CRM tenga el enriquecimiento competitivo · totalAdj12m, fortalezas/debilidades,
// historial win/loss, etc.). Mientras tanto, sirve los 6 competidores curados
// + win/loss + histórico informes con `_meta.source='mock'` y
// `_warnings=['competitors_endpoint_not_yet_in_backend']`.

interface BackendCompetidores {
  competidores?: Competidor[]
  win_loss?: WinLossEntry[]
  informes?: InformeGenerado[]
}

export async function GET() {
  const result = await callBackend<BackendCompetidores>(
 '/api/crm/organizations?type=competidor',
  )

  if (
    result.data &&
    Array.isArray(result.data.competidores) &&
    result.data.competidores.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          competidores: result.data.competidores,
          win_loss: result.data.win_loss ?? [],
          informes: result.data.informes ?? [],
        },
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: fixture (6 competidores · ACS, Ferrovial, Indra, Sacyr, FCC, Acciona
  // + 8 win/loss + 8 informes históricos).
  return NextResponse.json(
    withMeta(
      {
        competidores: COMPETIDORES,
        win_loss: WIN_LOSS,
        informes: INFORMES_HISTORICO,
      },
 'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['competitors_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
