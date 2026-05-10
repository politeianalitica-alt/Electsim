'use client'

import { useQuery } from '@tanstack/react-query'
import { legislativoApi } from '@/lib/api/legislativo'
import type { IniciativaLegislativa } from '@/types/legislativo'

interface IniciativasParams {
  tipo?: string
  estado?: string
  grupo?: string
  limit?: number
  offset?: number
}

export function useIniciativas(params?: IniciativasParams) {
  return useQuery({
    queryKey: ['legislativo', 'iniciativas', params],
    queryFn: () => legislativoApi.getIniciativas(params),
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data as IniciativaLegislativa[],
  })
}

export function useIniciativa(id: string | null) {
  return useQuery({
    queryKey: ['legislativo', 'iniciativa', id],
    queryFn: () => legislativoApi.getIniciativa(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data as IniciativaLegislativa,
  })
}

export function useFeedLegislativo(limit = 20) {
  return useQuery({
    queryKey: ['legislativo', 'feed', limit],
    queryFn: () => legislativoApi.getFeed(limit),
    staleTime: 60 * 1000, // 1 minute for feed
    refetchInterval: 3 * 60 * 1000,
    select: (res) => res.data as IniciativaLegislativa[],
  })
}
