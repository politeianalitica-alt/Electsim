'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type AlertSeverity = 'critico' | 'alto' | 'medio' | 'bajo'

export interface GlobalAlert {
  id: string
  titulo: string
  descripcion: string
  severidad: AlertSeverity
  timestamp: string
  pais?: string
  categoria?: string
  leida: boolean
}

interface AlertsContextValue {
  alerts: GlobalAlert[]
  unreadCount: number
  pushAlert: (alert: Omit<GlobalAlert, 'leida'>) => void
  markAsRead: (id: string) => void
  markAllRead: () => void
  clearAlerts: () => void
}

const AlertsContext = createContext<AlertsContextValue | null>(null)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<GlobalAlert[]>([])

  const pushAlert = useCallback((alert: Omit<GlobalAlert, 'leida'>) => {
    setAlerts(prev => {
      // Deduplicate by id
      if (prev.some(a => a.id === alert.id)) return prev
      const newAlert: GlobalAlert = { ...alert, leida: false }
      return [newAlert, ...prev].slice(0, 100) // keep last 100
    })

    // Browser notification for crítico
    if (alert.severidad === 'critico' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`! ALERTA CRÍTICA: ${alert.titulo}`, {
          body: alert.descripcion,
          icon: '/favicon.ico',
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(`! ALERTA CRÍTICA: ${alert.titulo}`, {
              body: alert.descripcion,
            })
          }
        })
      }
    }
  }, [])

  const markAsRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, leida: true })))
  }, [])

  const clearAlerts = useCallback(() => setAlerts([]), [])

  const unreadCount = alerts.filter(a => !a.leida).length

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, pushAlert, markAsRead, markAllRead, clearAlerts }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}
