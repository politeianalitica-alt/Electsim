'use client'
/**
 * /commodities · Dashboard maestro Vesper-style
 *
 * Sprint 1 frontend: grid de precios live + filtros + watchlist localStorage.
 * Sprint 2 añadirá: heatmap, banner ticker, category performance.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommoditySnapshot } from '@/hooks/useCommodities'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import { PriceCard } from '@/components/commodities/PriceCard'
import { CategoryTabs } from '@/components/commodities/CategoryTabs'
import { MarketSummaryBanner } from '@/components/commodities/MarketSummaryBanner'
import { PriceHeatmap } from '@/components/commodities/PriceHeatmap'
import { CategoryPerformanceBar } from '@/components/commodities/CategoryPerformanceBar'
import type { CommodityCategory, CommoditySnapshot } from '@/types/commodities'

const ACCENT = '#7c3aed'

export default function CommoditiesDashboard() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [category, setCategory] = useState<CommodityCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'change_desc' | 'change_asc' | 'price'>('change_desc')
  const [onlyWatch, setOnlyWatch] = useState(false)

  const { items, fetchedAt, loading, error, refresh, isLive } = useCommoditySnapshot(
    category === 'all' ? undefined : category,
    40,
  )
  const { watchlist, toggle, includes } = useCommodityWatchlist()

  const filtered = useMemo<CommoditySnapshot[]>(() => {
    const ql = query.trim().toLowerCase()
    let out = items.slice()
    if (ql) {
      out = out.filter(
        (i) => i.slug.includes(ql) || i.name.toLowerCase().includes(ql),
      )
    }
    if (onlyWatch) out = out.filter((i) => includes(i.slug))
    out.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'price') return (b.last_price ?? 0) - (a.last_price ?? 0)
      const ac = a.change_pct ?? 0
      const bc = b.change_pct ?? 0
      return sort === 'change_desc' ? bc - ac : ac - bc
    })
    return out
  }, [items, query, sort, onlyWatch, includes])

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <header style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            COMMODITIES · INTELIGENCIA DE PRECIOS
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '4px 0 0 0' }}>
            Mercado global en directo
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            40+ commodities (granos, aceites, lácteos, softs, energía, metales). Precios
            spot vía Yahoo Finance · refresco automático cada 30 min.
            {isLive ? (
              <span style={{ color: '#16a34a', marginLeft: 8 }}>· LIVE</span>
            ) : (
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>· offline / fallback</span>
            )}
          </p>
        </header>

        {/* Nav interna del módulo */}
        <nav
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {[
            { href: '/commodities', label: 'Precios' },
            { href: '/commodities/forecast', label: 'Forecast IA' },
            { href: '/commodities/supply-demand', label: 'Oferta & Demanda' },
            { href: '/commodities/recipe-cost', label: 'Coste de Producto' },
            { href: '/commodities/technical', label: 'Análisis Técnico' },
            { href: '/commodities/alerts', label: 'Alertas' },
            { href: '/commodities/watchlist', label: 'Mi Watchlist' },
          ].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <MarketSummaryBanner items={items} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CategoryTabs active={category} onChange={setCategory} />

          {items.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                gap: 16,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <PriceHeatmap items={items} />
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <CategoryPerformanceBar items={items} />
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (trigo, brent, copper…)"
              style={{
                flex: 1,
                minWidth: 200,
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: '#fff',
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: '#fff',
              }}
            >
              <option value="change_desc">↑ Más subida</option>
              <option value="change_asc">↓ Más bajada</option>
              <option value="name">A → Z</option>
              <option value="price">Precio</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
              <input
                type="checkbox"
                checked={onlyWatch}
                onChange={(e) => setOnlyWatch(e.target.checked)}
              />
              Sólo watchlist ({watchlist.length})
            </label>
            <button
              onClick={refresh}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: ACCENT,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              ↻ Actualizar
            </button>
          </div>

          {error ? (
            <div
              style={{
                padding: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                color: '#991b1b',
                fontSize: 13,
              }}
            >
              Error al cargar precios: {String(error)}
            </div>
          ) : null}

          {loading ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Cargando precios…</p>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                background: '#fff',
                border: '1px dashed #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                color: '#6b7280',
                textAlign: 'center',
              }}
            >
              Sin commodities para los filtros actuales.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {filtered.map((it) => (
                <PriceCard
                  key={it.slug}
                  item={it}
                  isWatched={includes(it.slug)}
                  onToggleWatch={() => toggle(it.slug)}
                />
              ))}
            </div>
          )}

          {fetchedAt ? (
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
              Datos actualizados: {new Date(fetchedAt).toLocaleString('es-ES')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
