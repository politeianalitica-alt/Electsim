'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { NotebookSnapshot, Notebook } from '@/types/intelligence'

export function useNotebooks() {
  const [data, setData] = useState<NotebookSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getNotebooks()
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useNotebook(id: string | null) {
  const [data, setData] = useState<Notebook | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    intelligenceApi.getNotebook(id)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => { if (id) refetch() }, [id, refetch])

  return { data, isLoading, isError, refetch }
}
