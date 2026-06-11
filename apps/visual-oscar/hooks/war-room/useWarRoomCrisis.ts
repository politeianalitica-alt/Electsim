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
    // Optimistic update CON rollback: si el PATCH falla (devuelve null),
    // se revierte al estado anterior — antes la UI confirmaba un cambio que
    // el servidor no había guardado y el poll de 60s lo deshacía en silencio.
    let prevEstado: EstadoCrisis | undefined
    setCrisis(prev => prev.map(c => {
      if (c.id !== id) return c
      prevEstado = c.estado
      return { ...c, estado }
    }))
    const saved = await warRoomApi.patchCrisisEstado(id, estado)
    if (!saved && prevEstado !== undefined) {
      console.warn(`[war-room] PATCH crisis ${id} falló · revirtiendo a "${prevEstado}"`)
      const restore = prevEstado
      setCrisis(prev => prev.map(c => c.id === id ? { ...c, estado: restore } : c))
    }
  }, [])

  return { crisis, loading, updateEstado }
}
