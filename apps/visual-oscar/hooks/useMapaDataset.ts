'use client'

import { useApi } from '@/lib/useApi'
import type {
  Eleccion,
  EleccionRow,
  HemiHistoricItem,
  NowRow,
  CCAARow,
  SeriesRow,
} from '@/data/mapa-fixture'
import type { HParty } from '@/components/HemicycleAdvanced'

interface MapaDatasetData {
  hemi_datasets: Record<string, HParty[]>
  hemi_historic: HemiHistoricItem[]
  hist_2023: EleccionRow[]
  elecciones: Eleccion[]
  now: NowRow[]
  ccaa: CCAARow[]
  series: SeriesRow[]
}

export function useMapaDataset() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<MapaDatasetData>('/api/mapa/dataset', { refreshInterval: 5 * 60_000 })

  return {
    hemiDatasets: data?.hemi_datasets ?? {},
    hemiHistoric: data?.hemi_historic ?? [],
    hist2023: data?.hist_2023 ?? [],
    elecciones: data?.elecciones ?? [],
    now: data?.now ?? [],
    ccaa: data?.ccaa ?? [],
    series: data?.series ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
