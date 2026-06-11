'use client'
/**
 * /puertos · Dashboard maestro · Puertos & Comercio Global.
 *
 * Tabs: Mapa mundial · Puertos críticos · Fletes · Chokepoints · Comercio España.
 * Refresh manual + auto-refresh por hook. Filtros por país/tipo/región.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import MaritimoShell from './_components/MaritimoShell'
import MaritimoVisionGlobal from './_components/MaritimoVisionGlobal'
import { isAuthenticated } from '@/lib/auth'
import {
  usePortCatalog,
  usePortSnapshotAll,
  useFreightSnapshot,
  useChokepoints,
  useVesselCatalog,
  useSpainFlows,
  useTopPartners,
  usePortsDataSources,
} from '@/hooks/usePorts'
import { WorldShippingMap } from '@/components/ports/WorldShippingMap'
import { PORTS_SEED, VESSELS_SEED } from '@/lib/ports-seed'
import { PortCongestionCard } from '@/components/ports/PortCongestionCard'
import { FreightSnapshotGrid } from '@/components/ports/FreightSnapshotGrid'
import { ChokepointRiskCard } from '@/components/ports/ChokepointRiskCard'
import { DataSourcesBanner } from '@/components/ports/DataSourcesBanner'
import { PortWatchSpainPanel } from '@/components/ports/PortWatchSpainPanel'
import { ChokepointsDashboard } from '@/components/ports/ChokepointsDashboard'
import { DailyTradePanel } from '@/components/ports/DailyTradePanel'
import { useCommoditySnapshot } from '@/hooks/useCommodities'
import { PriceCard } from '@/components/commodities/PriceCard'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import type { CommodityCategory } from '@/types/commodities'

const ACCENT = '#0e7490' // teal portuario

type Tab = 'mapa' | 'puertos' | 'fletes' | 'chokepoints' | 'comercio_es' | 'vesper'

export default function PortsDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  // Soporta deep-link ?tab=vesper desde la nav
  const initialTab = (searchParams.get('tab') as Tab) || 'mapa'
  const [tab, setTab] = useState<Tab>(initialTab)
  const dataSources = usePortsDataSources()
  const [country, setCountry] = useState<string>('')
  const [type_, setType] = useState<string>('')
  const [query, setQuery] = useState('')

  // Hooks de API · enriquecen los seeds embebidos. NUNCA dejamos `catalog`
  // o `vessels` vacíos: si la API falla (auth expirada, red, cold start),
  // el componente sigue dibujando los 40+ puertos seed y los 50 vessels
  // del bundle. El usuario nunca ve un mapa en blanco · degradación graceful.
  const { items: catalogApi } = usePortCatalog(country || undefined, type_ || undefined)
  const { items: vesselsApi } = useVesselCatalog()
  const catalog = catalogApi.length > 0 ? catalogApi : (PORTS_SEED as any[])
  const vessels = vesselsApi.length > 0 ? vesselsApi : (VESSELS_SEED as any[])
  const { items: snapshot, isLive, refresh: refreshSnapshot } = usePortSnapshotAll(40)
  const { items: freight } = useFreightSnapshot()
  const { items: chokepoints } = useChokepoints()
  const { data: spainFlows } = useSpainFlows()
  const { items: topExports } = useTopPartners('ESP', 'export', 5)
  const { items: topImports } = useTopPartners('ESP', 'import', 5)

  // Merge snapshot KPIs into catalog para el mapa
  const mapPorts = useMemo(() => {
    const snap = new Map(snapshot.map((s) => [s.slug, s]))
    return catalog.map((p) => {
      const s = snap.get(p.slug)
      return {
        ...p,
        congestion_pct: s?.congestion_pct,
        vessels_anchored: s?.vessels_anchored,
      }
    })
  }, [catalog, snapshot])

  // Síntesis de buques mock para el mapa · posicionados sobre puertos.
  // Cada vessel lleva la bandera `is_synthetic: true` para que el mapa los
  // pinte en gris/ámbar punteado y el usuario sepa que NO son AIS real.
  // Cuando AISStream esté activo, el worker poblará `vessel_positions` y este
  // bloque se sustituirá por una lectura real.
  const mapVessels = useMemo(() => {
    if (!catalog.length || !vessels.length) return []
    return vessels.slice(0, 80).map((v, i) => {
      const p = catalog[(i * 7) % catalog.length]
      const offsetLat = ((i * 13) % 11 - 5) / 6
      const offsetLon = ((i * 17) % 11 - 5) / 4
      return {
        imo: v.imo,
        name: v.name,
        ts: new Date().toISOString(),
        lat: p.lat + offsetLat,
        lon: p.lon + offsetLon,
        is_synthetic: true,
      }
    })
  }, [catalog, vessels])

  const filteredSnap = useMemo(() => {
    const ql = query.trim().toLowerCase()
    let out = snapshot.slice()
    if (ql) out = out.filter((s) => s.slug.includes(ql) || s.name.toLowerCase().includes(ql))
    if (country) out = out.filter((s) => s.country_iso === country.toUpperCase())
    if (type_) out = out.filter((s) => s.type === type_)
    // Ordena por congestión descendente · ports sin dato van al final
    out.sort((a, b) => (b.congestion_pct ?? -1) - (a.congestion_pct ?? -1))
    return out
  }, [snapshot, query, country, type_])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <MaritimoShell />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 20px' }}>
        <header style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            PUERTOS · COMERCIO GLOBAL · FLETES · CHOKEPOINTS
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
            Inteligencia portuaria mundial
          </h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
            {catalog.length} puertos críticos · {vessels.length} buques seed · {freight.length} índices de flete · {chokepoints.length} corredores
            {isLive ? (
              <span style={{ color: '#16a34a', marginLeft: 8 }}>· LIVE</span>
            ) : (
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>· synthetic/cache</span>
            )}
          </p>
        </header>

        {/* Resumen ejecutivo marítimo · datos vivos (AIS · flota · comercio ES) */}
        <div style={{ marginBottom: 18 }}>
          <MaritimoVisionGlobal />
        </div>

        {/* Mapa Politeia (OSIRIS) con capas marítimas · debajo de "Inteligencia marítima global" */}
        <div style={{ marginBottom: 18, borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <iframe
            src="/osint-global?embed=1&lat=37.5&lon=15&zoom=4.3&layers=maritime,ship_cargo,ship_tanker,ship_passenger,ship_fishing,ship_highspeed,ship_military,ship_other,port_container,port_commercial,port_energy,port_naval"
            title="Mapa Politeia · capas marítimas"
            loading="lazy"
            style={{ width: '100%', height: 600, border: 0, display: 'block' }}
          />
        </div>

        {/* Banner estado de fuentes externas (AIS, Comtrade, Yahoo, ACLED, OpenSanctions) */}
        <DataSourcesBanner status={dataSources.status} loading={dataSources.loading} />

        {/* IMF PortWatch · actividad portuaria oficial */}
        <div style={{ margin: '14px 0' }}>
          <PortWatchSpainPanel />
        </div>

        {/* Comercio marítimo diario · Mundo vs España */}
        <div style={{ margin: '14px 0' }}>
          <DailyTradePanel country="Spain" />
        </div>

        {/* Chokepoints marítimos · series diarias 37d */}
        <div style={{ margin: '14px 0' }}>
          <ChokepointsDashboard />
        </div>

        {/* Tabs internos */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {(
            [
              ['mapa', 'Mapa mundial'],
              ['puertos', 'Puertos críticos'],
              ['fletes', 'Fletes'],
              ['chokepoints', 'Chokepoints'],
              ['comercio_es', 'Comercio España'],
              ['vesper', 'Commodities (Vesper)'],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: tab === key ? '#fff' : '#334155',
                background: tab === key ? ACCENT : '#fff',
                border: '1px solid ' + (tab === key ? ACCENT : '#e2e8f0'),
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'mapa' && (
          <section>
            <WorldShippingMap
              ports={mapPorts as any}
              vessels={mapVessels as any}
              height={520}
              onSelectPort={(slug) => router.push(`/puertos/${slug}`)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
              {filteredSnap.slice(0, 8).map((s) => (
                <PortCongestionCard key={s.slug} port={s} />
              ))}
            </div>
          </section>
        )}

        {tab === 'puertos' && (
          <section>
            <Toolbar
              query={query}
              setQuery={setQuery}
              country={country}
              setCountry={setCountry}
              type_={type_}
              setType={setType}
              onRefresh={refreshSnapshot}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {filteredSnap.map((s) => (
                <PortCongestionCard key={s.slug} port={s} />
              ))}
              {filteredSnap.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    background: '#fff',
                    border: '1px dashed #e5e7eb',
                    borderRadius: 8,
                    color: '#64748b',
                    fontSize: 13,
                    gridColumn: '1/-1',
                    textAlign: 'center',
                  }}
                >
                  Sin puertos para los filtros actuales.
                </div>
              ) : null}
            </div>
          </section>
        )}

        {tab === 'fletes' && (
          <section>
            <FreightSnapshotGrid items={freight} />
            <p style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
              BDI · BCI · BPI · BDTI · BCTI · FBX (Freightos Baltic Index). Datos sintéticos
              estables; con `YAHOO_FALLBACK` activo se reemplazan por tickers reales.
            </p>
          </section>
        )}

        {tab === 'chokepoints' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {chokepoints.map((ck) => (
              <ChokepointRiskCard key={ck.slug} ck={ck} />
            ))}
          </section>
        )}

        {tab === 'vesper' && <VesperTab />}

        {tab === 'comercio_es' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card title="Top destinos exportación ESP">
              {topExports.length ? (
                <TopList items={topExports} />
              ) : (
                <Empty>Sin datos de top partners.</Empty>
              )}
            </Card>
            <Card title="Top orígenes importación ESP">
              {topImports.length ? (
                <TopList items={topImports} />
              ) : (
                <Empty>Sin datos de top partners.</Empty>
              )}
            </Card>
            <Card title="Flujos comerciales España (Comext seed)">
              {spainFlows?.items?.length ? (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>Partner</th>
                      <th style={th}>HS</th>
                      <th style={th}>Flujo</th>
                      <th style={{ ...th, textAlign: 'right' }}>USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spainFlows.items.slice(0, 12).map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={td}>{f.partner_iso}</td>
                        <td style={td}>{f.hs_code}</td>
                        <td style={td}>{f.flow_kind}</td>
                        <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {f.value_usd.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty>Sin flujos disponibles.</Empty>
              )}
            </Card>
            <Card title="Acceso directo">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
                <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <Link href="/puertos/comercio" style={linkStyle}>→ Explorar bilateral (cualquier país)</Link>
                </li>
                <li style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <Link href="/puertos/fletes" style={linkStyle}>→ Análisis técnico de fletes</Link>
                </li>
                <li style={{ padding: '6px 0' }}>
                  <Link href="/puertos/chokepoints" style={linkStyle}>→ Riesgo en corredores</Link>
                </li>
              </ul>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }
const linkStyle: React.CSSProperties = { color: ACCENT, textDecoration: 'none', fontWeight: 600 }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0, letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{children}</p>
}

function TopList({ items }: { items: Array<{ partner_iso: string; partner_name?: string; value_usd?: number | null; share_pct?: number | null }> }) {
  return (
    <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12 }}>
      {items.map((it, i) => (
        <li key={i} style={{ padding: '4px 0' }}>
          <strong>{it.partner_name ?? it.partner_iso}</strong>{' '}
          <span style={{ color: '#64748b' }}>
            · {it.value_usd != null
              ? `${it.value_usd.toLocaleString('es-ES', { maximumFractionDigits: 0 })} USD`
              : '— USD'}{' '}
            · {it.share_pct != null ? `${it.share_pct.toFixed(1)}%` : '—'}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Toolbar({
  query,
  setQuery,
  country,
  setCountry,
  type_,
  setType,
  onRefresh,
}: {
  query: string
  setQuery: (v: string) => void
  country: string
  setCountry: (v: string) => void
  type_: string
  setType: (v: string) => void
  onRefresh: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar puerto…"
        style={{ flex: 1, minWidth: 180, padding: '7px 11px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
      />
      <input
        value={country}
        onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
        placeholder="ISO (ES, NL…)"
        style={{ width: 110, padding: '7px 11px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
      />
      <select
        value={type_}
        onChange={(e) => setType(e.target.value)}
        style={{ padding: '7px 11px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
      >
        <option value="">Todos los tipos</option>
        {['container', 'bulk', 'tanker', 'lng', 'cruise', 'mixed', 'chokepoint'].map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        onClick={onRefresh}
        style={{
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 700,
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
  )
}


// ─────────────────────────────────────────────────────────────────
// Vesper tab · Commodities embebido en /puertos
// ─────────────────────────────────────────────────────────────────

function VesperTab() {
  const [category, setCategory] = useState<CommodityCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const { items, fetchedAt, loading, isLive, refresh } = useCommoditySnapshot(
    category === 'all' ? undefined : category,
    40,
  )
  const { includes, toggle, watchlist } = useCommodityWatchlist()

  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase()
    let out = items.slice()
    if (ql) out = out.filter((i) => i.slug.includes(ql) || i.name.toLowerCase().includes(ql))
    out.sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
    return out
  }, [items, query])

  const categories: Array<CommodityCategory | 'all'> = [
    'all', 'grains', 'energy', 'metals', 'softs', 'dairy', 'oils', 'meat',
  ]

  return (
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <p style={{ fontSize: 11, letterSpacing: 1.0, color: '#7c3aed', fontWeight: 700, margin: 0 }}>
            VESPER · COMMODITIES MUNDIALES
          </p>
          <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>
            40+ activos · precios spot vía Yahoo Finance ·{' '}
            {isLive ? <span style={{ color: '#16a34a' }}>LIVE</span> : <span style={{ color: '#f59e0b' }}>offline</span>}
            {' · '}
            <Link href="/commodities" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              ir a vista completa →
            </Link>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (trigo, brent, copper…)"
            style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f9fafb' }}
          />
          <button
            onClick={refresh}
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#7c3aed', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            ↻
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: category === c ? '#fff' : '#475569',
              background: category === c ? '#7c3aed' : '#fff',
              border: '1px solid ' + (category === c ? '#7c3aed' : '#e2e8f0'),
              borderRadius: 999,
              cursor: 'pointer',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {c}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
          {watchlist.length} en watchlist
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#94a3b8' }}>Cargando precios…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94a3b8' }}>Sin commodities para los filtros.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
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
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
          Datos actualizados: {new Date(fetchedAt).toLocaleString('es-ES')}
        </p>
      ) : null}
    </section>
  )
}
