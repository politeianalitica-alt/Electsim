import type { WarRoomSnapshot, CrisisWarRoom, TareaWarRoom, ActoAgenda, MensajeDia, EstadoCrisis, EstadoTarea } from '@/types/war-room'

const BASE = '/api/war-room'

export const warRoomApi = {
  async getSnapshot(): Promise<WarRoomSnapshot | null> {
    try {
      const res = await fetch(`${BASE}/snapshot`, { cache: 'no-store' })
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  async getCrisis(): Promise<CrisisWarRoom[]> {
    try {
      const res = await fetch(`${BASE}/crisis`, { cache: 'no-store' })
      if (!res.ok) return []
      return res.json()
    } catch { return [] }
  },

  async patchCrisisEstado(id: string, estado: EstadoCrisis): Promise<CrisisWarRoom | null> {
    try {
      const res = await fetch(`${BASE}/crisis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  async getTareas(): Promise<TareaWarRoom[]> {
    try {
      const res = await fetch(`${BASE}/tareas`, { cache: 'no-store' })
      if (!res.ok) return []
      return res.json()
    } catch { return [] }
  },

  async patchTareaEstado(id: string, estado: EstadoTarea): Promise<TareaWarRoom | null> {
    try {
      const res = await fetch(`${BASE}/tareas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },

  async getAgenda(): Promise<ActoAgenda[]> {
    try {
      const res = await fetch(`${BASE}/agenda`, { cache: 'no-store' })
      if (!res.ok) return []
      return res.json()
    } catch { return [] }
  },

  async getMensajeDia(): Promise<MensajeDia | null> {
    try {
      const res = await fetch(`${BASE}/mensaje`, { cache: 'no-store' })
      if (!res.ok) return null
      return res.json()
    } catch { return null }
  },
}
