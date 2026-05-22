'use client'
/**
 * `<IndicatorDetailPage subtabSlug="..." id="..." />` · reusable page para
 * cualquier subtab v3. Fetcha la metadata del indicador via
 * `/api/macro/{subtabSlug}/indicator/{id}` y delega el render visual a
 * `<IndicatorDetailLayout />`.
 *
 * Como `buildIndicatorDetail` busca el id en TODOS los catálogos
 * registrados, el endpoint funciona aunque el subtabSlug de la URL no
 * coincida con el del registro (útil para cross-links).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { IndicatorDetailLayout } from './IndicatorDetailLayout'
import { getSubtab } from '@/lib/macro/subtab-registry'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface PeersData {
  country: string
  series: { period: string; value: number }[]
  last: { period: string; value: number } | null
}

interface DetailPayload {
  ok: boolean
  id: string
  subtabSlug?: string
  meta: PulsoIndicatorMeta
  data: PulsoFetchResult
  peers: PeersData[] | null
  generated_at: string
}

interface Props {
  subtabSlug: string
  id: string
}

export function IndicatorDetailPage({ subtabSlug, id }: Props) {
  const router = useRouter()
  const config = getSubtab(subtabSlug)
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    fetch(`/api/macro/${subtabSlug}/indicator/${encodeURIComponent(id)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) {
          setError(j?.error || 'indicator_not_found')
          return
        }
        setPayload(j as DetailPayload)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, subtabSlug])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            Macro
          </Link>
          <span>·</span>
          <Link href={`/macro/${subtabSlug}`} style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            {config?.shortLabel || subtabSlug}
          </Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{payload?.meta?.shortLabel || id}</span>
        </div>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Cargando indicador {id}…
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Indicador no disponible · {error}.{' '}
            <Link href={`/macro/${subtabSlug}`} style={{ color: '#7c3aed' }}>
              Volver al subtab
            </Link>
          </div>
        )}

        {payload && <IndicatorDetailLayout payload={payload} />}
      </main>
    </div>
  )
}

export default IndicatorDetailPage
