'use client'

/**
 * React Query provider — caché compartido, refetch on focus desactivado,
 * staleTime 60s (60% de las pantallas pueden usar este default).
 *
 * Para endpoints muy en vivo (ticker, alertas urgentes), pasar `staleTime: 0`
 * y `refetchInterval: X_000` en el `useQuery` específico.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
