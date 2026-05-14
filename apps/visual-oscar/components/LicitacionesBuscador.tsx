'use client'
/**
 * Buscador en vivo de licitaciones · agrega Catalunya Socrata + PLACSP nacional
 *
 * Inspirado en BquantFinance/licitaciones-espana v2026.02 pero atacando
 * los endpoints públicos en tiempo real (sin descarga de parquet).
 *
 * GET /api/licitaciones/buscar?q=&desde=&hasta=&cpv=&tipo=&min_importe=&fuente=&limit=
 */
import { useEffect, useMemo, useState } from 'react'

interface NormalizedContrato {
  id: string
  fuente: 'CATALUNYA_SOCRATA' | 'PLACSP'
  fuente_label: string
  expediente: string
  organo: string
  ambito?: string
  objeto: string
  tipo_contrato?: string
  procedimiento?: string
  cpv?: string
  lugar_ejecucion?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  importe_adjudicacion_iva?: number
  adjudicatario?: string
  ofertas_recibidas?: number
  estado?: string
  fecha_publicacion?: string
  url?: string
}

interface SearchResponse {
  items: NormalizedContrato[]
  stats: {
    total: number
    importe_total_M: number
    por_fuente: Record<string, number>
    por_tipo: Record<string, number>
    fetch_ms: number
    sources: Array<{ fuente: string; ok: boolean; items: number; ms: number; error?: string }>
  }
  pagination: { limit: number; offset: number; total_estimado: number | null }
  filters: Record<string, unknown>
}

const TIPO_OPTIONS = ['', 'Serveis', 'Obres', 'Subministrament', 'Mixt', 'Concessió'] as const
const FUENTE_LABEL: Record<string, string> = {
  all: 'Todas las fuentes',
  catalunya: 'Generalitat de Catalunya',
  placsp: 'PLACSP nacional',
}
const FUENTE_COLOR: Record<string, string> = {
  CATALUNYA_SOCRATA: '#F97316',
  PLACSP: '#1F4E8C',
}

const CPV_PRESETS = [
  { code: '',     label: 'Cualquier CPV' },
  { code: '33',   label: '33 · Sanitario' },
  { code: '45',   label: '45 · Construcción' },
  { code: '48',   label: '48 · Software' },
  { code: '72',   label: '72 · Servicios TI' },
  { code: '79',   label: '79 · Servicios empresariales' },
  { code: '85',   label: '85 · Servicios sociales' },
  { code: '60',   label: '60 · Transporte' },
  { code: '09',   label: '09 · Energía' },
  { code: '50',   label: '50 · Mantenimiento' },
]

export default function LicitacionesBuscador() {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<string>('')
  const [cpv, setCpv] = useState<string>('')
  const [organo, setOrgano] = useState<string>('')
  const [desde, setDesde] = useState<string>(defaultDesde())
  const [hasta, setHasta] = useState<string>('')
  const [minImporte, setMinImporte] = useState<string>('')
  const [fuente, setFuente] = useState<'all' | 'catalunya' | 'placsp'>('all')
  const [order, setOrder] = useState<'fecha_desc' | 'fecha_asc' | 'importe_desc' | 'importe_asc'>('fecha_desc')
  const [limit, setLimit] = useState<number>(50)
  const [offset, setOffset] = useState<number>(0)

  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (q)          params.set('q', q)
    if (tipo)       params.set('tipo', tipo)
    if (cpv)        params.set('cpv', cpv)
    if (organo)     params.set('organo', organo)
    if (desde)      params.set('desde', desde)
    if (hasta)      params.set('hasta', hasta)
    if (minImporte) params.set('min_importe', minImporte)
    params.set('fuente', fuente)
    params.set('order', order)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return `/api/licitaciones/buscar?${params.toString()}`
  }, [q, tipo, cpv, organo, desde, hasta, minImporte, fuente, order, limit, offset])

  // Fetch (manual via runSearch + auto al cargar 1 vez)
  const runSearch = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(queryUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as SearchResponse
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // Búsqueda automática al cargar
  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-buscar al cambiar paginación
  useEffect(() => {
    if (data) runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, limit, order])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    runSearch()
  }

  return (
    <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:18,
    }}>
      {/* Header */}
      <header style={{
        background:'linear-gradient(135deg,#0d1b2e 0%,#1F4E8C 100%)',
        color:'#fff', padding:'16px 22px',
      }}>
        <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.16em', opacity:0.7, textTransform:'uppercase', margin:'0 0 4px' }}>
          BUSCADOR EN VIVO · DATOS REALES DE CONTRATACIÓN PÚBLICA
        </p>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Buscar licitaciones <em style={{ fontWeight:300, fontStyle:'italic', opacity:0.7 }}>en tiempo real</em>
        </h2>
        <p style={{ fontSize:12, opacity:0.7, margin:0 }}>
          Agrega Generalitat de Catalunya (1M+ contratos) + PLACSP nacional · Sin auth, datos abiertos · Inspirado en{' '}
          <a href="https://github.com/BquantFinance/licitaciones-espana" target="_blank" rel="noreferrer"
            style={{ color:'#fcd34d', textDecoration:'underline' }}>
            BquantFinance/licitaciones-espana
          </a>
        </p>
      </header>

      {/* Form */}
      <form onSubmit={onSubmit} style={{ padding:'18px 22px', borderBottom:'1px solid #F5F5F7', background:'#FAFAFA' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:10 }}>
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar texto libre · objeto, organismo o adjudicatario…"
            style={{
              padding:'10px 14px', borderRadius:10, border:'1px solid #DCDCE0',
              background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
            }}
          />
          <input
            type="text" value={organo} onChange={e => setOrgano(e.target.value)}
            placeholder="Organismo contratante…"
            style={{
              padding:'10px 14px', borderRadius:10, border:'1px solid #DCDCE0',
              background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
            }}
          />
          <select value={cpv} onChange={e => setCpv(e.target.value)} style={selectStyle}>
            {CPV_PRESETS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={selectStyle}>
            <option value="">Cualquier tipo</option>
            {TIPO_OPTIONS.filter(t => t).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fuente} onChange={e => setFuente(e.target.value as typeof fuente)} style={selectStyle}>
            {Object.entries(FUENTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={selectStyle}
          />
          <input
            type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={selectStyle}
          />
          <input
            type="number" value={minImporte} onChange={e => setMinImporte(e.target.value)}
            placeholder="Importe mín (€)" min={0} step={1000}
            style={selectStyle}
          />
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button
            type="submit" disabled={loading}
            style={{
              padding:'10px 22px', borderRadius:10, border:'none',
              background: loading ? '#9CA3AF' : '#1F4E8C', color:'#fff',
              fontSize:13, fontWeight:700, cursor: loading ? 'wait' : 'pointer',
              fontFamily:'inherit', letterSpacing:'0.02em',
            }}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
          <button
            type="button" onClick={() => {
              setQ(''); setTipo(''); setCpv(''); setOrgano(''); setMinImporte('')
              setDesde(defaultDesde()); setHasta(''); setFuente('all'); setOrder('fecha_desc'); setOffset(0)
            }}
            style={{
              padding:'10px 16px', borderRadius:10, border:'1px solid #DCDCE0',
              background:'#fff', color:'#3a3a3d', fontSize:12.5, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}
          >
            Limpiar filtros
          </button>
          <select value={order} onChange={e => { setOrder(e.target.value as typeof order); setOffset(0) }} style={{ ...selectStyle, marginLeft:'auto', minWidth:160 }}>
            <option value="fecha_desc">Más recientes</option>
            <option value="fecha_asc">Más antiguas</option>
            <option value="importe_desc">Mayor importe</option>
            <option value="importe_asc">Menor importe</option>
          </select>
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setOffset(0) }} style={{ ...selectStyle, minWidth:130 }}>
            <option value={25}>25 / página</option>
            <option value={50}>50 / página</option>
            <option value={100}>100 / página</option>
            <option value={200}>200 / página</option>
          </select>
        </div>
      </form>

      {/* Stats banner */}
      {data && (
        <div style={{ padding:'12px 22px', background:'#F5F5F7', display:'flex', gap:18, flexWrap:'wrap', fontSize:12 }}>
          <Stat label="Resultados" value={String(data.stats.total)} accent="#1F4E8C"/>
          <Stat label="Estimado total" value={data.pagination.total_estimado != null ? data.pagination.total_estimado.toLocaleString('es-ES') : '—'} accent="#5B21B6"/>
          <Stat label="∑ Importe" value={`${data.stats.importe_total_M.toLocaleString('es-ES')} M€`} accent="#16A34A"/>
          <Stat label="Latencia" value={`${data.stats.fetch_ms} ms`} accent="#F97316"/>
          <Stat label="Fuentes activas" value={`${data.stats.sources.filter(s => s.ok).length}/${data.stats.sources.length}`} accent="#0F766E"/>
          {data.stats.sources.map(s => (
            <span key={s.fuente} style={{
              fontSize:10, padding:'4px 9px', borderRadius:999,
              background: s.ok ? `${FUENTE_COLOR[s.fuente] || '#525258'}15` : '#FEE2E2',
              color: s.ok ? (FUENTE_COLOR[s.fuente] || '#525258') : '#DC2626',
              border: `1px solid ${s.ok ? (FUENTE_COLOR[s.fuente] || '#525258') + '40' : '#FECACA'}`,
              fontWeight:700, letterSpacing:'0.02em',
            }}>
              {s.fuente.split('_')[0]} · {s.items} · {s.ms}ms{s.error ? ` · ${s.error}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Resultados */}
      <div style={{ padding:'14px 22px 18px' }}>
        {loading && <div style={{ fontSize:12, color:'#6e6e73', padding:'20px 0' }}>Cargando resultados…</div>}
        {error && <div style={{ fontSize:12, color:'#DC2626', padding:'20px 0' }}>Error: {error}</div>}
        {!loading && !error && data && data.items.length === 0 && (
          <div style={{ fontSize:13, color:'#6e6e73', textAlign:'center', padding:'40px 0' }}>
            Sin resultados para los filtros aplicados. Prueba ampliando el rango de fechas o quitando filtros.
          </div>
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#FAFAFA', borderBottom:'1px solid #ECECEF' }}>
                  <Th>Fuente</Th>
                  <Th>Fecha</Th>
                  <Th>Organismo</Th>
                  <Th>Objeto</Th>
                  <Th>Tipo</Th>
                  <Th>CPV</Th>
                  <Th>Adjudicatario</Th>
                  <Th align="right">Importe</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(it => (
                  <tr key={it.id} style={{ borderBottom:'1px solid #F5F5F7' }}>
                    <Td>
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.04em',
                        padding:'2px 7px', borderRadius:4,
                        background: `${FUENTE_COLOR[it.fuente] || '#525258'}15`,
                        color: FUENTE_COLOR[it.fuente] || '#525258',
                        border: `1px solid ${(FUENTE_COLOR[it.fuente] || '#525258')}40`,
                      }}>
                        {it.fuente_label}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight:600, color:'#1d1d1f' }}>{it.fecha_publicacion || '—'}</div>
                      {it.expediente && <div style={{ fontSize:10, color:'#86868b' }}>EXP {it.expediente}</div>}
                    </Td>
                    <Td>
                      <div style={{ fontWeight:600, color:'#1d1d1f', maxWidth:200, lineHeight:1.3 }}>{it.organo}</div>
                      {it.ambito && <div style={{ fontSize:10, color:'#86868b' }}>{it.ambito}</div>}
                    </Td>
                    <Td>
                      <div style={{ color:'#3a3a3d', maxWidth:380, lineHeight:1.4 }}>
                        {it.url ? (
                          <a href={it.url} target="_blank" rel="noreferrer" style={{ color:'#1F4E8C', textDecoration:'none' }}>
                            {truncate(it.objeto, 140)} ↗
                          </a>
                        ) : truncate(it.objeto, 140)}
                      </div>
                      {it.lugar_ejecucion && <div style={{ fontSize:10, color:'#86868b', marginTop:2 }}>{it.lugar_ejecucion}</div>}
                    </Td>
                    <Td>
                      {it.tipo_contrato && (
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:'#F5F5F7', color:'#3a3a3d', fontWeight:600 }}>
                          {it.tipo_contrato}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {it.cpv && <span style={{ fontFamily:'monospace', fontSize:11, color:'#5B21B6' }}>{it.cpv}</span>}
                    </Td>
                    <Td>
                      <div style={{ color:'#1d1d1f', maxWidth:160, lineHeight:1.3 }}>{truncate(it.adjudicatario || '—', 60)}</div>
                    </Td>
                    <Td align="right">
                      {(() => {
                        const v = it.importe_adjudicacion ?? it.importe_licitacion
                        if (!v) return <span style={{ color:'#86868b' }}>—</span>
                        const isAdj = it.importe_adjudicacion != null
                        const fmt = v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(2)}M€`
                          : v >= 1_000
                            ? `${(v / 1_000).toFixed(0)}k€`
                            : `${v.toFixed(0)}€`
                        return (
                          <div>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1F4E8C' }}>{fmt}</div>
                            <div style={{ fontSize:9, color:'#86868b' }}>{isAdj ? 'adjudicado' : 'licitación'}</div>
                          </div>
                        )
                      })()}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, fontSize:12 }}>
              <span style={{ color:'#6e6e73' }}>
                Mostrando {offset + 1}–{offset + data.items.length}
                {data.pagination.total_estimado != null && ` de ${data.pagination.total_estimado.toLocaleString('es-ES')} estimados`}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0 || loading}
                  style={pagBtn(offset === 0)}
                >‹ Anteriores</button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={data.items.length < limit || loading}
                  style={pagBtn(data.items.length < limit)}
                >Siguientes ›</button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align, padding:'8px 8px', fontSize:9.5, fontWeight:800,
      letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase',
    }}>{children}</th>
  )
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td style={{ textAlign: align, padding:'10px 8px', verticalAlign:'top', fontSize:12 }}>
      {children}
    </td>
  )
}
function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'baseline' }}>
      <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color: accent }}>{value}</span>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding:'10px 12px', borderRadius:10, border:'1px solid #DCDCE0',
  background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
}
function pagBtn(disabled: boolean): React.CSSProperties {
  return {
    padding:'7px 14px', borderRadius:8, border:'1px solid #DCDCE0',
    background: disabled ? '#F5F5F7' : '#fff', color: disabled ? '#9CA3AF' : '#1d1d1f',
    fontSize:12, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily:'inherit',
  }
}
function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}
function defaultDesde(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().slice(0, 10)
}
