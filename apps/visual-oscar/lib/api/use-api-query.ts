'use client'

/**
 * Hooks de React Query envolviendo el cliente tipado de visual-oscar.
 *
 * `useApiQuery(['key'], () => endpoints.X.Y())` devuelve la misma forma que
 * `useQuery`, pero el `data` ya viene tipado, y exponemos `meta`, `isLive`
 * y `error` separados para UI honesta (badges, banners).
 *
 * Sustituye al hook casero `useApi.ts` (que sigue funcionando para llamadas
 * one-shot, pero el patrón nuevo es React Query).
 */

import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query'
import type { ApiResult } from './client'

type QueryKey = readonly unknown[]

/**
 * `useApiQuery` — wrapper sobre `useQuery` que aplana `ApiResult<T>` para que
 * los componentes accedan a `data` (puro T), `meta`, `isLive` directamente.
 */
export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<ApiResult<T>>,
  options?: Omit<UseQueryOptions<ApiResult<T>, Error, ApiResult<T>>, 'queryKey' | 'queryFn'>,
) {
  const result = useQuery<ApiResult<T>, Error>({
    queryKey: queryKey as unknown[],
    queryFn,
    ...options,
  })

  return {
    /** Datos limpios (sin `_meta`). Puede ser undefined si aún no cargó. */
    data: result.data?.data,
    /** Metadatos de la respuesta (source, ts, warnings). */
    meta: result.data?.meta,
    /** True si la respuesta llegó del backend real. */
    isLive: result.data?.isLive ?? false,
    /** Mensaje de error si lo hubo. */
    apiError: result.data?.error,
    // Estados de React Query
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  }
}

/**
 * `useApiMutation` — wrapper sobre `useMutation` para POSTs/PUTs.
 * El componente recibe `mutate(payload)` y, al terminar, `data`/`meta`.
 */
export function useApiMutation<T, P = void>(
  mutationFn: (payload: P) => Promise<ApiResult<T>>,
) {
  const result = useMutation<ApiResult<T>, Error, P>({ mutationFn })
  return {
    mutate: result.mutate,
    mutateAsync: result.mutateAsync,
    data: result.data?.data,
    meta: result.data?.meta,
    isLive: result.data?.isLive ?? false,
    apiError: result.data?.error,
    isPending: result.isPending,
    isError: result.isError,
    error: result.error,
    reset: result.reset,
  }
}
