'use client'
/**
 * /sector-energia/empresas · Sprint Energía S9
 *
 * Grid filtrable de empresas energéticas (catálogo `EMPRESAS_ENERGIA`) con
 * cotización en vivo (Finnhub). Filtros: país, tipo de energía, búsqueda libre.
 * KPIs agregados (nº empresas, españolas, subidas/bajadas hoy). Cards
 * `EnergyCompanyCard` que enlazan a la ficha drill-down.
 *
 * Patrón replicado de /sector-defensa/empresas. Cotizaciones que degraden se
 * marcan honestamente (CLAUDE.md). Cero emojis · Unicode (↑ ↓ →).
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AppHeader from '../../_components/AppHeader'
import { Panel } from '@/components/SectorPanel'
import { EnergyCompanyCard } from '../_components/EnergyCompanyCard'
import type { EnergyCompanyListItem, EnergiaTipo } from '@/lib/energia/types'

const ACCENT = '#16A34A'

const ENERGIA_OPTS: Array<{ id: EnergiaTipo | 'todas'; label: string }> = [
  { id: 'todas', label: 'Todas las energías' },
  { id: 'electrico', label: 'Eléctrico' },
  { id: 'renovables', label: 'Renovables' },
  { id: 'nuclear', label: 'Nuclear' },
  { id: 'petroleo', label: 'Petróleo' },
  { id: 'gas', label: 'Gas' },
  { id: 'hidrogeno', label: 'Hidrógeno' },
]

export default function EnergiaEmpresasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [companies, setCompanies] = useState<EnergyCompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPais, setFilterPais] = useState('todos')
  const [filterEnergia, setFilterEnergia] = useState<EnergiaTipo | 'todas'>('todas')
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/energia/empresas', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setCompanies(d.data as EnergyCompanyListItem[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Lista de países presentes (para el desplegable).
  const paises = useMemo(() => {
    const set = new Set(companies.map((c) => c.pais))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [companies])

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (filterPais !== 'todos' && c.pais !== filterPais) return false
      if (filterEnergia !== 'todas' && !c.energias.includes(filterEnergia)) return false
      if (q) {
        const needle = q.toLowerCase()
        const hay =
          c.nombre.toLowerCase().includes(needle) ||
          (c.ticker || '').toLowerCase().includes(needle) ||
          c.segmentos.some((s) => s.toLowerCase().includes(needle))
        if (!hay) return false
      }
      return true
    })
  }, [companies, filterPais, filterEnergia, q])

  // KPIs agregados sobre el set filtrado.
  const espanolas = filtered.filter((c) => c.es_espanola).length
  const subiendo = filtered.filter((c) => (c.quote?.change_percent ?? 0) > 0 && c.quote?.available).length
  const bajando = filtered.filter((c) => (c.quote?.change_percent ?? 0) < 0 && c.quote?.available).length

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 12, fontSize: 11.5 }}>
          <Link href="/sector-energia" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>← Sector Energía</Link>
          <span style={{ color: '#9CA3AF', margin: '0 6px' }}>·</span>
          <span style={{ color: '#6e6e73' }}>Empresas energéticas</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
            ENERGÍA · EMPRESAS COTIZADAS
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
            Empresas del sector energético
          </h1>
          <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
            {companies.length} compañías españolas tier-1 + majors globales · cotización en vivo (Finnhub) ·
            click en una ficha para estructura societaria (OpenCorporates) y energías en que opera.
          </p>
        </div>

        {/* KPIs agregados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KPI label="EMPRESAS" value={String(filtered.length)} color="#1d1d1f" />
          <KPI label="ESPAÑOLAS" value={String(espanolas)} color={ACCENT} />
          <KPI label="HOY ↑" value={String(subiendo)} color={ACCENT} />
          <KPI label="HOY ↓" value={String(bajando)} color="#DC2626" />
        </div>

        {/* Filtros */}
        <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa, ticker, segmento…"
              style={{ padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}
            />
            <select
              value={filterEnergia}
              onChange={(e) => setFilterEnergia(e.target.value as EnergiaTipo | 'todas')}
              style={{ padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}
            >
              {ENERGIA_OPTS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <select
              value={filterPais}
              onChange={(e) => setFilterPais(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}
            >
              <option value="todos">Todos los países</option>
              {paises.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: 30, color: '#86868b' }}>Cargando empresas y cotizaciones…</p>}

        {!loading && (
          <Panel
            title={`${filtered.length} empresas`}
            subtitle="Cotización Finnhub (tiempo real) · estructura societaria OpenCorporates en la ficha"
          >
            {filtered.length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#86868b', padding: 12 }}>Ninguna empresa coincide con los filtros.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {filtered.map((c) => (
                  <EnergyCompanyCard key={c.slug} company={c} />
                ))}
              </div>
            )}
          </Panel>
        )}
      </main>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
