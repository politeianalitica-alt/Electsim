'use client'

import { useQuery } from '@tanstack/react-query'
import { legislativoApi } from '@/lib/api/legislativo'
import type { GrupoParlamentario } from '@/types/legislativo'

export function useGrupos() {
  return useQuery({
    queryKey: ['legislativo', 'grupos'],
    queryFn: () => legislativoApi.getGrupos(),
    staleTime: 5 * 60 * 1000, // 5 minutes — grupos don't change often
    select: (res) => res.data as GrupoParlamentario[],
  })
}

export function useEstadoLegislativo() {
  return useQuery({
    queryKey: ['legislativo', 'estado'],
    queryFn: () => legislativoApi.getEstado(),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  })
}
