'use client'

import { useQuery } from '@tanstack/react-query'
import { legislativoApi } from '@/lib/api/legislativo'
import type { Comision } from '@/types/legislativo'

export function useComisiones(camara?: 'congreso' | 'senado' | 'mixta') {
  return useQuery({
    queryKey: ['legislativo', 'comisiones', camara],
    queryFn: () => legislativoApi.getComisiones(camara),
    staleTime: 10 * 60 * 1000,
    select: (res) => res.data as Comision[],
  })
}
