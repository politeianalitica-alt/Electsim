import { useEffect, useState } from 'react'
import { warRoomApi } from '@/lib/api/war-room'
import type { WarRoomSnapshot } from '@/types/war-room'

export function useWarRoom() {
  const [data, setData] = useState<WarRoomSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    warRoomApi.getSnapshot().then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  return { data, loading }
}
