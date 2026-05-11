'use client'

import { useApi } from '@/lib/useApi'
import { PRTR_TOTALS } from '@/data/fondos-europeos-fixture'
import type {
  Componente,
  Perte,
  Convocatoria,
  Hito,
  Beneficiario,
  MfpFondo,
  PrtrTotals,
} from '@/data/fondos-europeos-fixture'

interface FondosEuropeosData {
  componentes: Componente[]
  pertes: Perte[]
  convocatorias: Convocatoria[]
  hitos: Hito[]
  beneficiarios: Beneficiario[]
  mfp_fondos: MfpFondo[]
  prtr_totals: PrtrTotals
}

export function useFondosEuropeos() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<FondosEuropeosData>('/api/fondos-europeos', { refreshInterval: 5 * 60_000 })

  return {
    componentes: data?.componentes ?? [],
    pertes: data?.pertes ?? [],
    convocatorias: data?.convocatorias ?? [],
    hitos: data?.hitos ?? [],
    beneficiarios: data?.beneficiarios ?? [],
    mfpFondos: data?.mfp_fondos ?? [],
    prtrTotals: data?.prtr_totals ?? PRTR_TOTALS,
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
