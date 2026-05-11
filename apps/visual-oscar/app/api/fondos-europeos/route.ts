import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import {
  COMPONENTES,
  PERTES,
  CONVOCATORIAS,
  HITOS,
  BENEFICIARIOS,
  MFP_FONDOS,
  PRTR_TOTALS,
} from '@/data/fondos-europeos-fixture'
import type {
  Componente,
  Perte,
  Convocatoria,
  Hito,
  Beneficiario,
  MfpFondo,
  PrtrTotals,
} from '@/data/fondos-europeos-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/opendata/datasets?q=PRTR` (o endpoint dedicado de
// fondos europeos, cuando exista). Mientras tanto, sirve los datasets curados
// (componentes PRTR, PERTEs, convocatorias, hitos, beneficiarios, MFP) con
// `_meta.source='mock'`.

interface BackendFondos {
  componentes?: Componente[]
  pertes?: Perte[]
  convocatorias?: Convocatoria[]
  hitos?: Hito[]
  beneficiarios?: Beneficiario[]
  mfp_fondos?: MfpFondo[]
  prtr_totals?: PrtrTotals
}

export async function GET() {
  const result = await callBackend<BackendFondos>('/api/opendata/datasets?q=PRTR')

  if (
    result.data &&
    Array.isArray(result.data.componentes) &&
    result.data.componentes.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          componentes: result.data.componentes,
          pertes: result.data.pertes ?? [],
          convocatorias: result.data.convocatorias ?? [],
          hitos: result.data.hitos ?? [],
          beneficiarios: result.data.beneficiarios ?? [],
          mfp_fondos: result.data.mfp_fondos ?? [],
          prtr_totals: result.data.prtr_totals ?? PRTR_TOTALS,
        },
        'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  return NextResponse.json(
    withMeta(
      {
        componentes: COMPONENTES,
        pertes: PERTES,
        convocatorias: CONVOCATORIAS,
        hitos: HITOS,
        beneficiarios: BENEFICIARIOS,
        mfp_fondos: MFP_FONDOS,
        prtr_totals: PRTR_TOTALS,
      },
      'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['prtr_dataset_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
