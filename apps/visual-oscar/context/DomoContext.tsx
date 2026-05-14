'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DataSource, Dataset, WidgetFilter, DomoStats } from '@/types/domo'

export interface DomoNotification {
  id: string
  type: 'alert' | 'job_failed' | 'sync_complete' | 'quality_fail' | 'info'
  title: string
  message: string
  relatedId?: string
  timestamp: string
  read: boolean
}

interface DomoContextValue {
  activeSource:    DataSource | null
  setActiveSource: (source: DataSource | null) => void
  activeDataset:    Dataset | null
  setActiveDataset: (dataset: Dataset | null) => void
  globalFilters:    WidgetFilter[]
  setGlobalFilters: (filters: WidgetFilter[]) => void
  addGlobalFilter:    (filter: WidgetFilter) => void
  removeGlobalFilter: (index: number) => void
  clearGlobalFilters: () => void
  stats:    DomoStats | null
  setStats: (stats: DomoStats | null) => void
  notifications: DomoNotification[]
  addNotification:      (n: Omit<DomoNotification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications:   () => void
  unreadCount: number
}

const DomoContext = createContext<DomoContextValue | null>(null)

export function DomoProvider({ children }: { children: ReactNode }) {
  const [activeSource,  setActiveSource]  = useState<DataSource | null>(null)
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null)
  const [globalFilters, setGlobalFilters] = useState<WidgetFilter[]>([])
  const [stats,         setStats]         = useState<DomoStats | null>(null)
  const [notifications, setNotifications] = useState<DomoNotification[]>([])

  const addGlobalFilter = useCallback((filter: WidgetFilter) => {
    setGlobalFilters(prev => [...prev, filter])
  }, [])

  const removeGlobalFilter = useCallback((index: number) => {
    setGlobalFilters(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearGlobalFilters = useCallback(() => setGlobalFilters([]), [])

  const addNotification = useCallback(
    (n: Omit<DomoNotification, 'id' | 'timestamp' | 'read'>) => {
      const notification: DomoNotification = {
        ...n,
        id: Math.random().toString(36).slice(2, 11),
        timestamp: new Date().toISOString(),
        read: false,
      }
      setNotifications(prev => [notification, ...prev].slice(0, 50))
    },
    [],
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const clearNotifications = useCallback(() => setNotifications([]), [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <DomoContext.Provider
      value={{
        activeSource, setActiveSource,
        activeDataset, setActiveDataset,
        globalFilters, setGlobalFilters,
        addGlobalFilter, removeGlobalFilter, clearGlobalFilters,
        stats, setStats,
        notifications, addNotification, markNotificationRead, clearNotifications,
        unreadCount,
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
