import { useCallback, useEffect, useRef, useState } from 'react'
import { warRoomApi } from '@/lib/api/war-room'
import type { TareaWarRoom, EstadoTarea } from '@/types/war-room'

const ESTADOS: EstadoTarea[] = ['Pendiente', 'En curso', 'Completada']

export function useWarRoomTareas() {
  const [tareas, setTareas] = useState<TareaWarRoom[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = useCallback(() => {
    warRoomApi.getTareas().then(data => {
      setTareas(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetch()
    intervalRef.current = setInterval(fetch, 120_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetch])

  const cycleEstado = useCallback(async (id: string) => {
    const tarea = tareas.find(t => t.id === id)
    if (!tarea) return
    const next = ESTADOS[(ESTADOS.indexOf(tarea.estado) + 1) % ESTADOS.length]
    // Optimistic update
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: next } : t))
    await warRoomApi.patchTareaEstado(id, next)
  }, [tareas])

  return { tareas, loading, cycleEstado }
}
