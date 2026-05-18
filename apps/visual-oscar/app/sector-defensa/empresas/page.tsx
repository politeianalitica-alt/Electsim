'use client'
/**
 * /sector-defensa/empresas
 * Grid de 23 empresas cotizadas defensa europeas + globales con cotización en vivo.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'

interface Quote { precio: number | null; variacion_pct: number | null; variacion_abs: number | null; moneda: string; mercadoAbierto: boolean | null }
interface Empresa {
  ticker: string; exchange: string; moneda: string; nombre: string; nombre_corto: string
  pais: string; pais_nombre: string; sede: string; empleados: number
  revenue_total_USD_b: number; revenue_defensa_USD_b: number; pct_defensa: number
  ranking_sipri: number; segmentos: string[]; logo_url?: string
  cotizacion?: Quote | null
}

export default function EmpresasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPais, setFilterPais] = useState('todos')
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/defense/empresas').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setEmpresas(d.empresas || [])
      setLoading(false)
    })
  }, [])

  const filtered = empresas.filter(e => {
    if (filterPais !== 'todos' && e.pais !== filterPais) return false
    if (q && !(e.nombre.toLowerCase().includes(q.toLowerCase()) || e.segmentos.some(s => s.toLowerCase().includes(q.toLowerCase())))) return false
    return true
  })

  // Stats agregados
  const totalRevenue = filtered.reduce((s, e) => s + (e.revenue_defensa_USD_b || 0), 0)
  const totalEmpleados = filtered.reduce((s, e) => s + (e.empleados || 0), 0)
  const subiendoHoy = filtered.filter(e => (e.cotizacion?.variacion_pct ?? 0) > 0).length
  const bajandoHoy = filtered.filter(e => (e.cotizacion?.variacion_pct ?? 0) < 0).length

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · EMPRESAS COTIZADAS
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Empresas cotizadas de defensa
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          {empresas.length} compañías europeas + globales · cotización en vivo Yahoo Finance · click en ficha para detalle estructura, programas, joint ventures, sanciones
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <KPI label="EMPRESAS" value={String(filtered.length)} color="#1d1d1f"/>
        <KPI label="REVENUE DEFENSA AGREGADO" value={`${(totalRevenue).toFixed(0)} bn$`} color="#1F4E8C"/>
        <KPI label="EMPLEADOS GLOBALES" value={`${(totalEmpleados / 1000).toFixed(0)}k`} color="#7C3AED"/>
        <KPI label="HOY ↑ / ↓" value={`${subiendoHoy} / ${bajandoHoy}`} color={subiendoHoy > bajandoHoy ? '#16A34A' : '#DC2626'}/>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa, segmento, ticker…"
            style={{ padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          <select value={filterPais} onChange={e => setFilterPais(e.target.value)} style={{ padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
            <option value="todos">Todos los países</option>
            <option value="ES">España</option><option value="FR">Francia</option><option value="DE">Alemania</option>
            <option value="GB">Reino Unido</option><option value="IT">Italia</option><option value="SE">Suecia</option>
            <option value="NO">Noruega</option><option value="PL">Polonia</option><option value="IL">Israel</option>
            <option value="US">Estados Unidos</option>
          </select>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 30, color: '#86868b' }}>Cargando cotizaciones…</p>}

      <Panel title={`${filtered.length} empresas cotizadas`} subtitle="Cotización Yahoo Finance · revenue defensa SIPRI 2024 · click para ficha completa">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 }}>
          {filtered.map(e => <EmpresaCard key={e.ticker} e={e}/>)}
        </div>
      </Panel>
    </div>
  )
}

function EmpresaCard({ e }: { e: Empresa }) {
  const c = e.cotizacion
  const varColor = c?.variacion_pct == null ? '#9CA3AF' : c.variacion_pct > 0 ? '#16A34A' : '#DC2626'
  return (
    <Link href={`/sector-defensa/empresas/${encodeURIComponent(e.ticker)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ padding: 14, background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, borderLeft: '4px solid #1F4E8C' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre_corto}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{e.ticker}</span>
              <span style={{ color: '#9CA3AF' }}> · {e.exchange}</span>
            </p>
          </div>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#525258', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{e.pais}</span>
        </div>

        {/* Cotización */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: 8, background: c?.precio == null ? '#FAFAFA' : `${varColor}10`, borderRadius: 6 }}>
          {c?.precio != null ? (
            <>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
                {c.precio.toLocaleString('es-ES', { maximumFractionDigits: 2 })} {c.moneda}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: varColor }}>
                {(c.variacion_pct ?? 0) > 0 ? '+' : ''}{c.variacion_pct?.toFixed(2)}%
              </span>
              {c.mercadoAbierto && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 4px #16A34A' }}/>}
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>No cotizada / sin datos</span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>REVENUE DEFENSA</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
              {e.revenue_defensa_USD_b.toFixed(1)} bn$
              <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 500 }}> · {e.pct_defensa}%</span>
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>RANKING SIPRI</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#7C3AED', fontFamily: 'var(--font-display)' }}>
              #{e.ranking_sipri}
              <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 500 }}> · {(e.empleados / 1000).toFixed(0)}k emp</span>
            </p>
          </div>
        </div>

        {/* Segmentos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {e.segmentos.slice(0, 4).map(s => (
            <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#F5F5F7', color: '#3a3a3d' }}>{s}</span>
          ))}
        </div>

        <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#1F4E8C', fontWeight: 600 }}>Ver ficha completa →</p>
      </div>
    </Link>
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
