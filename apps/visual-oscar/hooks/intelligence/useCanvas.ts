'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { CanvasSnapshot, Canvas, TipoCanvas } from '@/types/intelligence'

export function useCanvasList(tipo?: TipoCanvas) {
  const [data, setData] = useState<CanvasSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getCanvas(tipo)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [tipo])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useCanvas(id: string | null) {
  const [data, setData] = useState<Canvas | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    intelligenceApi.getCanvasById(id)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => { if (id) refetch() }, [id, refetch])

  return { data, isLoading, isError, refetch }
}
