'use client'

import { useQuery } from '@tanstack/react-query'
import { legislativoApi } from '@/lib/api/legislativo'
import type { VotacionPlenaria } from '@/types/legislativo'

export function useVotaciones(params?: { resultado?: string; iniciativa_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['legislativo', 'votaciones', params],
    queryFn: () => legislativoApi.getVotaciones(params),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data as VotacionPlenaria[],
  })
}
