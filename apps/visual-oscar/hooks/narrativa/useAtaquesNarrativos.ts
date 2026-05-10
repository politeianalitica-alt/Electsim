'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { narrativaApi } from '@/lib/api/narrativa'
import type { AtaqueNarrativo } from '@/types/narrativa'

export function useAtaquesNarrativos(pollingMs = 120_000) {
  const [ataques, setAtaques] = useState<AtaqueNarrativo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    narrativaApi.getAtaques()
      .then(r => { setAtaques(r.ataques); setError(null) })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, pollingMs)
    return () => clearInterval(id)
  }, [load, pollingMs])

  const totals = useMemo(() => ({
    total:    ataques.length,
    criticos: ataques.filter(a => a.severidad === 'CRÍTICA').length,
    altos:    ataques.filter(a => a.severidad === 'ALTA').length,
    activos:  ataques.filter(a => a.fase !== 'Cerrado' && a.fase !== 'Decayendo').length,
    sospAvg:  ataques.length
      ? Math.round(ataques.reduce((s, a) => s + a.cuentasSospechosas, 0) / ataques.length)
      : 0,
  }), [ataques])

  const topHashtags = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of ataques)
      for (const h of a.hashtags)
        if (h.hostil) map.set(h.h, (map.get(h.h) ?? 0) + h.vol)
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([h, v]) => ({ h, v }))
  }, [ataques])

  const topAmplificadores = useMemo(() => {
    const map = new Map<string, { menciones: number; tipo: string; pos: string }>()
    for (const a of ataques)
      for (const am of a.amplificadores) {
        const cur = map.get(am.nombre) ?? { menciones: 0, tipo: am.tipo, pos: am.posicion }
        cur.menciones += am.menciones
        map.set(am.nombre, cur)
      }
    return Array.from(map.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.menciones - a.menciones)
      .slice(0, 10)
  }, [ataques])

  return { ataques, loading, error, totals, topHashtags, topAmplificadores, refetch: load }
}
