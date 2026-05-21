'use client'
/**
 * Screener genérico (empresas / órganos / CPV).
 * Tabla rankeada por nº de contratos, con filtros año/CPV/tipo/procedimiento.
 * Selectores con visual del hemiciclo (PillSelect).
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CPV_DIVISIONS, TIPOS_CONTRATO, PROCEDIMIENTOS } from '@/lib/socrata-catalunya'
import PillSelect, { PillInput } from '@/components/PillSelect'

interface AggRow { key: string; label: string; n_contratos: number }

type Modo = 'empresas' | 'organos' | 'cpv'

interface Props { modo: Modo }

const TITULOS: Record<Modo, { titulo: string; sub: string; col: string; linkBase?: string }> = {
  empresas: {
    titulo: 'Top empresas adjudicatarias',
    sub: 'Ranking por número de contratos en Catalunya Open Data',
    col: 'NIF · Empresa',
    linkBase: '/licitaciones/adjudicatario',
  },
  organos: {
    titulo: 'Top órganos contratantes',
    sub: 'Entidades públicas con más contratos publicados',
    col: 'DIR3 · Órgano',
    linkBase: '/licitaciones/organo',
  },
  cpv: {
    titulo: 'Top sectores (CPV)',
    sub: 'Divisiones CPV con más contratos publicados',
    col: 'CPV',
  },
}

const ANIO_OPTIONS = Array.from({ length: 25 }, (_, i) => 2026 - i).map(y => ({ value: String(y), label: String(y) }))

export default function LicitacionesScreener({ modo }: Props) {
  const [q, setQ] = useState('')
  const [anio, setAnio] = useState<string>('')
  const [cpvDiv, setCpvDiv] = useState<string>('')
  const [tipoContrato, setTipoContrato] = useState<string>('')
  const [procedimiento, setProcedimiento] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [items, setItems] = useState<AggRow[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchMs, setFetchMs] = useState<number | null>(null)
  const PAGE_SIZE = 50

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (anio) sp.set('anio', anio)
    if (cpvDiv && modo !== 'cpv') sp.set('cpv_div', cpvDiv)
    if (tipoContrato) sp.set('tipo_contrato', tipoContrato)
    if (procedimiento) sp.set('procedimiento', procedimiento)
    sp.set('page', String(page))
    sp.set('page_size', String(PAGE_SIZE))
    return `/api/licitaciones/screener/${modo}?${sp.toString()}`
  }, [modo, q, anio, cpvDiv, tipoContrato, procedimiento, page])

  const run = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(queryUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { items: AggRow[]; pagination: { has_more: boolean }; fetch_ms: number }
      setItems(json.items)
      setHasMore(json.pagination.has_more)
      setFetchMs(json.fetch_ms)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown'); setItems([])
    } finally { setLoading(false) }
  }

  useEffect(() => { run() /* eslint-disable-next-line */ }, [page])
  useEffect(() => { setPage(1); run() /* eslint-disable-next-line */ }, [modo])

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); run() }
  const T = TITULOS[modo]
  const maxN = Math.max(1, ...items.map(it => it.n_contratos))

  const cpvOptions = CPV_DIVISIONS.map(c => ({ value: c.code, label: `${c.code} · ${c.label.slice(0, 28)}` }))
  const tipoOptions = TIPOS_CONTRATO.map(t => ({ value: t, label: t }))
  const procOptions = PROCEDIMIENTOS.map(p => ({ value: p, label: p }))

  return (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, overflow:'hidden' }}>
 <header style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F5F5F7' }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:8, marginBottom:12 }}>
 <div>
 <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, letterSpacing:'-0.02em', color:'#1d1d1f' }}>
              {T.titulo}
 </h2>
 <p style={{ margin:'4px 0 0', fontSize:12, color:'#6e6e73' }}>{T.sub}</p>
 </div>
          {fetchMs != null && <span style={{ fontSize:11, color:'#86868b' }}>{items.length} resultados · {fetchMs} ms</span>}
 </div>
 <form onSubmit={onSubmit} style={{ display:'grid', gridTemplateColumns: modo === 'cpv' ? '2fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr 1fr auto', gap:8, alignItems:'center' }}>
 <PillInput
            value={q} onChange={setQ}
            placeholder="Filtrar por palabra clave…"
            ariaLabel="Filtrar"
          />
 <PillSelect
            value={anio} onChange={setAnio}
            options={ANIO_OPTIONS}
            placeholder="Año: todos"
            ariaLabel="Año"
          />
          {modo !== 'cpv' && (
 <PillSelect
              value={cpvDiv} onChange={setCpvDiv}
              options={cpvOptions}
              placeholder="CPV: todos"
              ariaLabel="CPV"
            />
          )}
 <PillSelect
            value={tipoContrato} onChange={setTipoContrato}
            options={tipoOptions}
            placeholder="Tipo: todos"
            ariaLabel="Tipo"
          />
 <PillSelect
            value={procedimiento} onChange={setProcedimiento}
            options={procOptions}
            placeholder="Procedimiento: todos"
            ariaLabel="Procedimiento"
          />
 <button type="submit" disabled={loading} style={{
            padding:'9px 18px', borderRadius:999, border:'none',
            background: loading ? '#9CA3AF' : '#1d1d1f', color:'#fff',
            fontSize:12, fontWeight:600, cursor: loading ? 'wait' : 'pointer', fontFamily:'inherit',
            transition:'all 160ms',
          }}>
            {loading ? '…' : 'Aplicar'}
 </button>
 </form>
 </header>

 <div style={{ padding:'0 22px 22px' }}>
        {error && <div style={{ padding:'30px', color:'#DC2626', fontSize:13 }}>Error: {error}</div>}
        {!error && (
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
 <thead>
 <tr style={{ borderBottom:'1px solid #ECECEF' }}>
 <Th width={50}>#</Th>
 <Th>{T.col}</Th>
 <Th width={140} align="right">Nº contratos</Th>
 <Th width={300}>Distribución</Th>
 </tr>
 </thead>
 <tbody>
              {items.map((row, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1
                const link = T.linkBase ? `${T.linkBase}/${encodeURIComponent(row.key)}` : null
                return (
 <tr key={row.key} style={{ borderBottom:'1px solid #F5F5F7' }}>
 <Td><span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#86868b' }}>{rank}</span></Td>
 <Td>
                      {link ? (
 <Link href={link} style={{ color:'#1F4E8C', textDecoration:'none' }}>
 <div style={{ fontWeight:600, color:'#1d1d1f' }}>{row.label}</div>
 <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace' }}>{row.key}</div>
 </Link>
                      ) : (
 <>
 <div style={{ fontWeight:600, color:'#1d1d1f' }}>{row.label}</div>
 <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace' }}>{row.key}</div>
 </>
                      )}
 </Td>
 <Td align="right">
 <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1F4E8C' }}>
                        {row.n_contratos.toLocaleString('es-ES')}
 </span>
 </Td>
 <Td>
 <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${(row.n_contratos / maxN) * 100}%`, height:'100%', background:'#1F4E8C' }}/>
 </div>
 </Td>
 </tr>
                )
              })}
 </tbody>
 </table>
        )}
        {!error && !loading && items.length === 0 && (
 <div style={{ padding:'40px', textAlign:'center', color:'#86868b', fontSize:13 }}>Sin resultados</div>
        )}

        {items.length > 0 && (
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
 <span style={{ fontSize:11, color:'#86868b' }}>Página {page}</span>
 <div style={{ display:'flex', gap:6 }}>
 <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || loading} style={pagBtn(page === 1)}>‹ Anterior</button>
 <button onClick={() => setPage(page + 1)} disabled={!hasMore || loading} style={pagBtn(!hasMore)}>Siguiente ›</button>
 </div>
 </div>
        )}
 </div>
 </section>
  )
}

function Th({ children, align = 'left', width }: { children: React.ReactNode; align?: 'left' | 'right'; width?: number }) {
  return (
 <th style={{
      textAlign: align, padding:'10px 8px', fontSize:9.5, fontWeight:800,
      letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase',
      width: width ? `${width}px` : 'auto',
    }}>{children}</th>
  )
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align, padding:'10px 8px', verticalAlign:'middle', fontSize:12 }}>{children}</td>
}
function pagBtn(disabled: boolean): React.CSSProperties {
  return {
    padding:'7px 14px', borderRadius:999, border:'1px solid '+(disabled ? '#ECECEF' : '#1d1d1f'),
    background: disabled ? '#F5F5F7' : '#fff',
    color: disabled ? '#9CA3AF' : '#1d1d1f',
    fontSize:11.5, fontWeight: disabled ? 500 : 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily:'inherit', transition:'all 160ms',
  }
}
