'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/estudio/api-client'
import type { DomoNotification } from '@/types/domo'

interface NotificationsCtx {
  notifications: DomoNotification[]
  unreadCount: number
  isLoading: boolean
  markRead: (id: string) => void
  markAllRead: () => void
  deleteNotification: (id: string) => void
  refetch: () => void
}

const Ctx = createContext<NotificationsCtx>({
  notifications: [],
  unreadCount:  0,
  isLoading:    false,
  markRead:     () => {},
  markAllRead:  () => {},
  deleteNotification: () => {},
  refetch:      () => {},
})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey:        ['domo', 'notifications'],
    queryFn:         () => notificationsApi.list({ limit: 50 }),
    staleTime:       30_000,
    refetchInterval: 60_000,
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'notifications'] }),
  })

  return (
    <Ctx.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      markRead:     markReadMutation.mutate,
      markAllRead:  () => markAllReadMutation.mutate(),
      deleteNotification: deleteMutation.mutate,
      refetch,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useNotifications() {
  return useContext(Ctx)
}
