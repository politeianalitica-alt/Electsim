'use client'

import { useApi } from '@/lib/useApi'
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

interface MacroDatasetData {
  kpis: Indic[]
  comparativa: ComparativaRow[]
  ipc_comp: IpcComp[]
  vivienda: ViviendaItem[]
  mercados: MercadoItem[]
  salarios: SalarioItem[]
  calendario: CalendarioItem[]
  sectores: SectorItem[]
  voter_profiles: VoterProfile[]
  hist_cycles: HistCycle[]
  impacto_politico: ImpactoRow[]
}

export function useMacroDataset() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<MacroDatasetData>('/api/macro/dataset', { refreshInterval: 5 * 60_000 })

  return {
    kpis: data?.kpis ?? [],
    comparativa: data?.comparativa ?? [],
    ipcComp: data?.ipc_comp ?? [],
    vivienda: data?.vivienda ?? [],
    mercados: data?.mercados ?? [],
    salarios: data?.salarios ?? [],
    calendario: data?.calendario ?? [],
    sectores: data?.sectores ?? [],
    voterProfiles: data?.voter_profiles ?? [],
    histCycles: data?.hist_cycles ?? [],
    impactoPolitico: data?.impacto_politico ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
