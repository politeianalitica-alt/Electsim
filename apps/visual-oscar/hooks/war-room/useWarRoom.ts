import { useCallback, useEffect, useState } from 'react'
import { warRoomApi } from '@/lib/api/war-room'
import type { WarRoomSnapshot } from '@/types/war-room'

/**
 * Snapshot principal del War Room.
 *
 * getSnapshot() devuelve null cuando la API falla: antes ese null se
 * confundía con "cargando" y la página mostraba un spinner eterno sin
 * mensaje ni reintento. Ahora se distingue error de loading y se expone
 * retry() para el botón Reintentar.
 */
export function useWarRoom() {
  const [data, setData] = useState<WarRoomSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    warRoomApi.getSnapshot().then(d => {
      setData(d)
      setError(d === null)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}
