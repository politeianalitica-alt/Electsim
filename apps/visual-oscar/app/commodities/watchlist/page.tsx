'use client'
/**
 * /commodities/watchlist · vista personalizada del usuario
 */
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommoditySnapshot } from '@/hooks/useCommodities'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import { PriceCard } from '@/components/commodities/PriceCard'
import { fmtPct } from '@/lib/commodities-utils'

export default function WatchlistPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { watchlist, remove, reorder, reset } = useCommodityWatchlist()
  const { items: snapshots, loading } = useCommoditySnapshot(undefined, 60)

  const filtered = useMemo(() => {
    const map = new Map(snapshots.map((s) => [s.slug, s]))
    return watchlist
      .map((slug) => map.get(slug))
      .filter((x): x is NonNullable<typeof x> => x !== undefined)
  }, [watchlist, snapshots])

  const summary = useMemo(() => {
    const valid = filtered.filter((i) => i.change_pct != null)
    if (!valid.length) return { avgChange: 0, gainers: 0, losers: 0 }
    const sum = valid.reduce((s, i) => s + (i.change_pct ?? 0), 0)
    const gainers = valid.filter((i) => (i.change_pct ?? 0) > 0).length
    return {
      avgChange: sum / valid.length,
      gainers,
      losers: valid.length - gainers,
    }
  }, [filtered])

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Mi watchlist
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Listado personalizado · persistido en este navegador. {watchlist.length} commodities seguidas.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Kpi label="Cambio medio" value={fmtPct(summary.avgChange)} color={summary.avgChange >= 0 ? '#16a34a' : '#dc2626'} />
          <Kpi label="Subidas" value={String(summary.gainers)} color="#16a34a" />
          <Kpi label="Bajadas" value={String(summary.losers)} color="#dc2626" />
          <Kpi label="Tamaño" value={String(watchlist.length)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={reset}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ↺ Restablecer default
          </button>
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            Watchlist vacía. Añade desde el{' '}
            <Link href="/commodities" style={{ color: '#7c3aed' }}>dashboard</Link>.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map((it, i) => (
              <div key={it.slug} style={{ position: 'relative' }}>
                <PriceCard
                  item={it}
                  isWatched
                  onToggleWatch={() => remove(it.slug)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    display: 'flex',
                    gap: 2,
                  }}
                >
                  <button
                    onClick={() => reorder(i, Math.max(0, i - 1))}
                    title="Subir"
                    style={tinyBtn}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorder(i, Math.min(filtered.length - 1, i + 1))}
                    title="Bajar"
                    style={tinyBtn}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: color ?? '#111827', margin: '4px 0 0 0' }}>{value}</p>
    </div>
  )
}

const tinyBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  fontSize: 11,
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  cursor: 'pointer',
}
