'use client'
/**
 * `/macro/pulso/indicator/[id]` · 9 subtabs verticales.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppHeader from '../../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { IndicatorDetailLayout } from '@/components/macro/pulso/IndicatorDetailLayout'
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
  meta: PulsoIndicatorMeta
  data: PulsoFetchResult
  peers: PeersData[] | null
  generated_at: string
}

export default function IndicatorDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  useEffect(() => {
    if (!params?.id) return
    let alive = true
    setLoading(true)
    fetch(`/api/macro/pulso/indicator/${encodeURIComponent(params.id)}`, { cache: 'force-cache' })
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
  }, [params?.id])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            Macro
          </Link>
          <span>·</span>
          <Link href="/macro/pulso" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            Pulso
          </Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{payload?.meta?.shortLabel || params?.id}</span>
        </div>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Cargando indicador {params?.id}…
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Indicador no disponible · {error}.{' '}
            <Link href="/macro/pulso" style={{ color: '#7c3aed' }}>
              Volver a Pulso macro
            </Link>
          </div>
        )}

        {payload && <IndicatorDetailLayout payload={payload} />}
      </main>
    </div>
  )
}
