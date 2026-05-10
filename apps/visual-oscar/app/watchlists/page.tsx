'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import IntelHero from '../_components/intel/IntelHero'
import IntelCard from '../_components/intel/IntelCard'
import IntelBadge from '../_components/intel/IntelBadge'
import IntelEmpty from '../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useWatchlists } from '@/hooks/intelligence'
import type { Watchlist } from '@/types/intelligence'

export default function WatchlistsPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, isLoading } = useWatchlists()
  const items = data?.items ?? []
  const [localItems, setLocalItems] = useState<Watchlist[]>([])
  useEffect(() => { setLocalItems(items) }, [items])

  const counts = useMemo(() => ({
    total: localItems.length,
    activas: localItems.filter(w => w.activa).length,
    alertas: localItems.reduce((s, w) => s + w.alertas_count, 0),
  }), [localItems])

  function toggle(id: string) {
    setLocalItems(prev => prev.map(w => w.id === id ? { ...w, activa: !w.activa } : w))
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <IntelHero
          eyebrow="WATCHLISTS · VIGILANCIAS ACTIVAS"
          title={`${counts.activas} watchlists activas`}
          subtitle="Listas de terminos, actores y sectores monitorizados. Generan alertas automaticas cuando se detectan menciones relevantes."
          kpis={[
            { label: 'Activas', value: counts.activas, accent: '#86EFAC' },
            { label: 'Inactivas', value: counts.total - counts.activas, accent: '#86868b' },
            { label: 'Alertas mes', value: counts.alertas, accent: '#FCA5A5' },
            { label: 'Total', value: counts.total, accent: '#7DD3FC' },
          ]}
        />

        {isLoading && <IntelEmpty title="Cargando watchlists" />}
        {!isLoading && localItems.length === 0 && <IntelEmpty title="Sin watchlists" />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {localItems.map(w => (
            <IntelCard key={w.id} padding="18px 20px" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <IntelBadge color={w.activa ? '#16A34A' : '#86868b'} variant="solid" size="xs">{w.activa ? 'Activa' : 'Inactiva'}</IntelBadge>
                <button onClick={() => toggle(w.id)}
                  style={{ background: w.activa ? '#F5F5F7' : '#1F4E8C', color: w.activa ? '#3a3a3d' : '#fff', border: 'none', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {w.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.35 }}>{w.nombre}</h3>
              {w.descripcion && <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 10px', lineHeight: 1.45 }}>{w.descripcion}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {w.terminos.slice(0, 4).map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
                {w.terminos.length > 4 && <span style={{ fontSize: 10.5, color: '#86868b' }}>+{w.terminos.length - 4}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#86868b', borderTop: '1px solid #F5F5F7', paddingTop: 8 }}>
                <span><strong style={{ color: '#1d1d1f', fontWeight: 600 }}>{w.alertas_count}</strong> alertas</span>
                <span>{w.ultima_alerta ? new Date(w.ultima_alerta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin alertas'}</span>
              </div>
            </IntelCard>
          ))}
        </div>
      </main>
    </div>
  )
}
