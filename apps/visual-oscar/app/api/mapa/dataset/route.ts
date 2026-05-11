import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import {
  HEMI_DATASETS,
  HEMI_HISTORIC,
  HIST_2023,
  ELECCIONES,
  NOW,
  CCAA,
  SERIES,
} from '@/data/mapa-fixture'
import type {
  Eleccion,
  EleccionRow,
  HemiHistoricItem,
  NowRow,
  CCAARow,
  SeriesRow,
} from '@/data/mapa-fixture'
import type { HParty } from '@/components/HemicycleAdvanced'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend objetivo: `/api/electoral/historical` (cuando exista). Mientras tanto,
// sirve los datasets curados (HEMI_DATASETS + ELECCIONES 1977-2023 + NOW +
// CCAA + SERIES) con `_meta.source='mock'`.

interface BackendMapa {
  hemi_datasets?: Record<string, HParty[]>
  hemi_historic?: HemiHistoricItem[]
  hist_2023?: EleccionRow[]
  elecciones?: Eleccion[]
  now?: NowRow[]
  ccaa?: CCAARow[]
  series?: SeriesRow[]
}

export async function GET() {
  const result = await callBackend<BackendMapa>('/api/electoral/historical')

  if (
    result.data &&
    result.data.hemi_datasets &&
    Object.keys(result.data.hemi_datasets).length > 0
  ) {
    return NextResponse.json(
      withMeta(
        {
          hemi_datasets: result.data.hemi_datasets,
          hemi_historic: result.data.hemi_historic ?? [],
          hist_2023: result.data.hist_2023 ?? [],
          elecciones: result.data.elecciones ?? [],
          now: result.data.now ?? [],
          ccaa: result.data.ccaa ?? [],
          series: result.data.series ?? [],
        },
        'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: fixture (datasets electorales completos 1977-2023 + estimación 2026).
  return NextResponse.json(
    withMeta(
      {
        hemi_datasets: HEMI_DATASETS,
        hemi_historic: HEMI_HISTORIC,
        hist_2023: HIST_2023,
        elecciones: ELECCIONES,
        now: NOW,
        ccaa: CCAA,
        series: SERIES,
      },
      'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['electoral_historical_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
