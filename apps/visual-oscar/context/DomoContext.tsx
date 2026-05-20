'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DataSource, Dataset, WidgetFilter, DomoStats } from '@/types/domo'

interface DomoContextValue {
  activeSource:     DataSource | null
  setActiveSource:  (source: DataSource | null) => void
  activeDataset:    Dataset | null
  setActiveDataset: (dataset: Dataset | null) => void
  globalFilters:    WidgetFilter[]
  setGlobalFilters: (filters: WidgetFilter[]) => void
  addGlobalFilter:    (filter: WidgetFilter) => void
  removeGlobalFilter: (index: number) => void
  clearGlobalFilters: () => void
  stats:    DomoStats | null
  setStats: (stats: DomoStats | null) => void
}

const DomoContext = createContext<DomoContextValue | null>(null)

export function DomoProvider({ children }: { children: ReactNode }) {
  const [activeSource,  setActiveSource]  = useState<DataSource | null>(null)
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null)
  const [globalFilters, setGlobalFilters] = useState<WidgetFilter[]>([])
  const [stats,         setStats]         = useState<DomoStats | null>(null)

  const addGlobalFilter = useCallback((filter: WidgetFilter) => {
    setGlobalFilters(prev => [...prev, filter])
  }, [])

  const removeGlobalFilter = useCallback((index: number) => {
    setGlobalFilters(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearGlobalFilters = useCallback(() => setGlobalFilters([]), [])

  return (
 <DomoContext.Provider
      value={{
        activeSource, setActiveSource,
        activeDataset, setActiveDataset,
        globalFilters, setGlobalFilters,
        addGlobalFilter, removeGlobalFilter, clearGlobalFilters,
        stats, setStats,
      }}
    >
      {children}
 </DomoContext.Provider>
  )
}

export function useDomo(): DomoContextValue {
  const ctx = useContext(DomoContext)
  if (!ctx) throw new Error('useDomo debe usarse dentro de DomoProvider')
  return ctx
}
