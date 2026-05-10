import { useCallback, useEffect, useRef, useState } from 'react'
import { warRoomApi } from '@/lib/api/war-room'
import type { CrisisWarRoom, EstadoCrisis } from '@/types/war-room'

export function useWarRoomCrisis() {
  const [crisis, setCrisis] = useState<CrisisWarRoom[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = useCallback(() => {
    warRoomApi.getCrisis().then(data => {
      setCrisis(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetch()
    intervalRef.current = setInterval(fetch, 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetch])

  const updateEstado = useCallback(async (id: string, estado: EstadoCrisis) => {
    // Optimistic update
    setCrisis(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
    await warRoomApi.patchCrisisEstado(id, estado)
  }, [])

  return { crisis, loading, updateEstado }
}
