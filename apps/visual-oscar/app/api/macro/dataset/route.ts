import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import {
  KPIS,
  COMPARATIVA,
  IPC_COMP,
  VIVIENDA,
  MERCADOS,
  SALARIOS,
  CALENDARIO,
  SECTORES,
  VOTER_PROFILES,
  HIST_CYCLES,
  IMPACTO_POLITICO,
} from '@/data/macro-fixture'
import type {
  Indic,
  ComparativaRow,
  IpcComp,
  ViviendaItem,
  MercadoItem,
  SalarioItem,
  CalendarioItem,
  SectorItem,
  VoterProfile,
  HistCycle,
  ImpactoRow,
} from '@/data/macro-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: combinación de `/api/macro/kpis` + `/api/macro/indicators`
// (cuando esos endpoints expongan datos suficientes). Mientras tanto sirve
// el dataset macro 2026 completo con `_meta.source='mock'`.
//
// Esta ruta vive bajo `/api/macro/dataset/` para no colisionar con otras rutas
// existentes bajo `/api/macro/*`.

interface BackendKpis {
  kpis?: Indic[]
}

interface BackendIndicators {
  comparativa?: ComparativaRow[]
  ipc_comp?: IpcComp[]
  vivienda?: ViviendaItem[]
  mercados?: MercadoItem[]
  salarios?: SalarioItem[]
  calendario?: CalendarioItem[]
  sectores?: SectorItem[]
  voter_profiles?: VoterProfile[]
  hist_cycles?: HistCycle[]
  impacto_politico?: ImpactoRow[]
}

export async function GET() {
  const [kpisResult, indicatorsResult] = await Promise.all([
    callBackend<BackendKpis>('/api/macro/kpis'),
    callBackend<BackendIndicators>('/api/macro/indicators'),
  ])

  const backendKpis = kpisResult.data?.kpis
  const backendInd = indicatorsResult.data

  // Considera "backend OK" si al menos KPIs y comparativa vienen del backend.
  const haveKpis = Array.isArray(backendKpis) && backendKpis.length > 0
  const haveIndicators =
    backendInd &&
    Array.isArray(backendInd.comparativa) &&
    backendInd.comparativa.length > 0

  if (haveKpis && haveIndicators) {
    const latency = Math.max(kpisResult.latency_ms, indicatorsResult.latency_ms)
    return NextResponse.json(
      withMeta(
        {
          kpis: backendKpis!,
          comparativa: backendInd!.comparativa ?? COMPARATIVA,
          ipc_comp: backendInd!.ipc_comp ?? IPC_COMP,
          vivienda: backendInd!.vivienda ?? VIVIENDA,
          mercados: backendInd!.mercados ?? MERCADOS,
          salarios: backendInd!.salarios ?? SALARIOS,
          calendario: backendInd!.calendario ?? CALENDARIO,
          sectores: backendInd!.sectores ?? SECTORES,
          voter_profiles: backendInd!.voter_profiles ?? VOTER_PROFILES,
          hist_cycles: backendInd!.hist_cycles ?? HIST_CYCLES,
          impacto_politico: backendInd!.impacto_politico ?? IMPACTO_POLITICO,
        },
 'backend',
        { latency_ms: latency },
      ),
    )
  }

  // Fallback: fixture macro 2026 completo.
  const warnings: string[] = []
  if (kpisResult.error) warnings.push(`kpis:${kpisResult.error}`)
  if (indicatorsResult.error) warnings.push(`indicators:${indicatorsResult.error}`)
  if (warnings.length === 0) warnings.push('macro_dataset_endpoint_not_yet_in_backend')

  return NextResponse.json(
    withMeta(
      {
        kpis: KPIS,
        comparativa: COMPARATIVA,
        ipc_comp: IPC_COMP,
        vivienda: VIVIENDA,
        mercados: MERCADOS,
        salarios: SALARIOS,
        calendario: CALENDARIO,
        sectores: SECTORES,
        voter_profiles: VOTER_PROFILES,
        hist_cycles: HIST_CYCLES,
        impacto_politico: IMPACTO_POLITICO,
      },
 'mock',
      {
        warnings,
        latency_ms: Math.max(kpisResult.latency_ms, indicatorsResult.latency_ms),
      },
    ),
  )
}
