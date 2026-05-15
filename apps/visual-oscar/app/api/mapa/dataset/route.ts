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
import {
  getSondeosVivos,
  estimacionPonderada,
} from '@/lib/sources/encuestas-pesos'
import {
  calcularEscanosNacional,
  type Partido,
} from '@/lib/sources/dhondt-provincial'
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
  // PERO sustituye HEMI_DATASETS.estimacion y NOW por los datos EN VIVO
  // calculados con D'Hondt provincial sobre los sondeos curados.
  const colors: Record<string, string> = {
    pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
    erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
    cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', otros:'#9E9E9E',
  }
  const names: Record<string, string> = {
    pp:'PP', psoe:'PSOE', vox:'VOX', sumar:'Sumar',
    erc:'ERC', junts:'Junts', pnv:'PNV', bildu:'EH Bildu',
    cc:'CC', bng:'BNG', upn:'UPN', otros:'Otros',
  }

  const hemi_datasets = { ...HEMI_DATASETS }
  const now: typeof NOW = NOW
  let liveOk = false

  try {
    const sondeosVivos = await getSondeosVivos(30)
    const est = estimacionPonderada(sondeosVivos)
    const pctMap: Partial<Record<Partido, number>> = {}
    for (const [s, e] of Object.entries(est.partidos)) pctMap[s as Partido] = e.pct
    const seats = calcularEscanosNacional(pctMap)

    // hemi_datasets.estimacion en vivo
    const live: typeof HEMI_DATASETS.estimacion = []
    for (const [partido, esc] of Object.entries(seats)) {
      if (esc <= 0) continue
      const id = partido.toLowerCase()
      live.push({
        id, name: names[id] || partido, color: colors[id] || '#9E9E9E', seats: esc,
      })
    }
    hemi_datasets.estimacion = live.sort((a, b) => b.seats - a.seats)

    // NOW (lista de partidos con %, IC y bloque) en vivo
    const bloqueMap: Record<string, 'izquierda' | 'derecha' | 'otros'> = {
      pp:'derecha', vox:'derecha', cc:'derecha', upn:'derecha',
      psoe:'izquierda', sumar:'izquierda', erc:'izquierda', bildu:'izquierda', bng:'izquierda',
      junts:'otros', pnv:'otros', otros:'otros',
    }
    const liveNow: typeof NOW = []
    for (const [partido, esc] of Object.entries(seats)) {
      if (esc <= 0) continue
      const id = partido.toLowerCase()
      const e = est.partidos[partido]
      if (!e) continue
      liveNow.push({
        siglas: names[id] || partido,
        pct: e.pct,
        ci_inf: e.ic80_inf,
        ci_sup: e.ic80_sup,
        seats: esc,
        color: colors[id] || '#9E9E9E',
        bloque: bloqueMap[id] || 'otros',
      })
    }
    if (liveNow.length > 0) {
      // Reemplazar NOW
      ;(now as typeof NOW).length = 0
      ;(now as typeof NOW).push(...liveNow)
    }
    liveOk = true
  } catch { /* fall through */ }

  return NextResponse.json(
    withMeta(
      {
        hemi_datasets,
        hemi_historic: HEMI_HISTORIC,
        hist_2023: HIST_2023,
        elecciones: ELECCIONES,
        now,
        ccaa: CCAA,
        series: SERIES,
      },
      liveOk ? 'backend' : 'mock',
      {
        warnings: result.error ? [`backend_unreachable:${result.error}`] :
                  liveOk ? ['live_estimation_from_electocracia'] :
                  ['electoral_historical_endpoint_not_yet_in_backend'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
