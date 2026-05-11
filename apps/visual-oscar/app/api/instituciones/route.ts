import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import {
  CCAAS,
  DIPUTACIONES,
  CAPITALES,
  INSULARES,
} from '@/data/instituciones-fixture'
import type {
  CCAA,
  Diputacion,
  Capital,
  Insular,
} from '@/data/instituciones-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/opendata/datasets?q=instituciones` (o endpoint
// definitivo de la guía territorial). Mientras tanto, sirve los datasets
// curados (CCAA, diputaciones, capitales con web, cabildos/consells) con
// `_meta.source='mock'`.

interface BackendInstituciones {
  ccaas?: CCAA[]
  diputaciones?: Diputacion[]
  capitales?: Capital[]
  insulares?: Insular[]
}

export async function GET() {
  const result = await callBackend<BackendInstituciones>('/api/opendata/datasets?q=instituciones')

  if (
    result.data &&
    Array.isArray(result.data.ccaas) &&
    result.data.ccaas.length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          ccaas: result.data.ccaas,
          diputaciones: result.data.diputaciones ?? [],
          capitales: result.data.capitales ?? [],
          insulares: result.data.insulares ?? [],
        },
        'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  return NextResponse.json(
    withMeta(
      {
        ccaas: CCAAS,
        diputaciones: DIPUTACIONES,
        capitales: CAPITALES,
        insulares: INSULARES,
      },
      'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['instituciones_dataset_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
