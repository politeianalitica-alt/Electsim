'use client'

import { useQuery } from '@tanstack/react-query'
import { legislativoApi } from '@/lib/api/legislativo'
import type { HuellaLegislativa, EventoAgenda } from '@/types/legislativo'

export function useHuellaLegislativa(periodo?: string) {
  return useQuery({
    queryKey: ['legislativo', 'huella', periodo],
    queryFn: () => legislativoApi.getHuella(periodo),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data as HuellaLegislativa,
  })
}

export function useAgendaLegislativa(params?: { dias?: number; tipo?: string }) {
  return useQuery({
    queryKey: ['legislativo', 'agenda', params],
    queryFn: () => legislativoApi.getAgenda(params),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data as EventoAgenda[],
  })
}
