'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import LicitacionesNav from '@/components/LicitacionesNav'
import { cpvDivLabel } from '@/lib/socrata-catalunya'

interface AggRow { key: string; label: string; n_contratos: number }
interface FichaResp {
  ficha: {
    nif: string; nombre: string; es_pyme: boolean
    n_contratos: number; importe_total: number; importe_medio: number; importe_max: number
    primer_contrato?: string; ultimo_contrato?: string
  }
  contratos: Array<{
    id: string; expediente: string; objeto: string; organo: string; organo_dir3?: string
    importe_adjudicacion?: number; importe_licitacion?: number; cpv?: string; cpv_div?: string
    fecha_publicacion?: string; tipo_contrato?: string; procedimiento?: string; url?: string
  }>
  top_organos: AggRow[]
  top_cpv: AggRow[]
  evolucion_anio: Array<{ anio: number; n: number }>
  fetch_ms: number
}

export default function AdjudicatarioPage() {
  const router = useRouter()
  const params = useParams<{ nif: string }>()
  const nif = decodeURIComponent(params.nif)

  const [data, setData] = useState<FichaResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  useEffect(() => {
    fetch(`/api/licitaciones/adjudicatario/${encodeURIComponent(nif)}?limit=100`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [nif])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        <LicitacionesNav/>
        {loading && <div style={{ padding:40, textAlign:'center', color:'#86868b' }}>Cargando ficha…</div>}
        {error && <div style={{ padding:40, color:'#DC2626' }}>Error: {error}</div>}
        {data && (
          <>
            {/* Hero */}
            <section style={{
              background:'linear-gradient(135deg,#0F766E 0%,#0d4540 100%)',
              borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
            }}>
              <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
                EMPRESA ADJUDICATARIA · NIF {data.ficha.nif}
              </p>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em', margin:'0 0 8px', lineHeight:1.1 }}>
                {data.ficha.nombre}
              </h1>
              <p style={{ fontSize:13, opacity:0.75, margin:0 }}>
                {data.ficha.n_contratos.toLocaleString('es-ES')} contratos publicados ·
                {data.ficha.es_pyme && ' · PYME'}
                {data.ficha.primer_contrato && ` · primer registro ${data.ficha.primer_contrato}`}
                {data.ficha.ultimo_contrato && ` · último ${data.ficha.ultimo_contrato}`}
              </p>
            </section>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
              <KPI label="Total contratos" value={data.ficha.n_contratos.toLocaleString('es-ES')} accent="#1F4E8C"/>
              <KPI label="Importe acumulado" value={fmtImporte(data.ficha.importe_total)} accent="#16A34A"/>
              <KPI label="Importe medio" value={fmtImporte(data.ficha.importe_medio)} accent="#7C3AED"/>
              <KPI label="Importe máximo" value={fmtImporte(data.ficha.importe_max)} accent="#F97316"/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18 }}>
              {/* Contratos recientes */}
              <section style={panel}>
                <h2 style={panelTitle}>Contratos recientes</h2>
                <div style={{ maxHeight:600, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                    <thead style={{ position:'sticky', top:0, background:'#fff' }}>
                      <tr style={{ borderBottom:'1px solid #ECECEF' }}>
                        <Th>Fecha</Th><Th>Órgano</Th><Th>Objeto</Th>
                        <Th align="right">Importe</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.contratos.map(c => (
                        <tr key={c.id} style={{ borderBottom:'1px solid #F5F5F7' }}>
                          <Td>{c.fecha_publicacion || '—'}</Td>
                          <Td>
                            <Link href={`/licitaciones/organo/${encodeURIComponent(c.organo_dir3 || c.organo)}`} style={{ color:'#1F4E8C', textDecoration:'none' }}>
                              {c.organo}
                            </Link>
                          </Td>
                          <Td>
                            {c.url
                              ? <a href={c.url} target="_blank" rel="noreferrer" style={{ color:'#3a3a3d', textDecoration:'none' }}>{trunc(c.objeto, 90)} ↗</a>
                              : trunc(c.objeto, 90)}
                            {c.cpv && <div style={{ fontSize:10, color:'#86868b', marginTop:2 }}>CPV {c.cpv}</div>}
                          </Td>
                          <Td align="right">
                            {(c.importe_adjudicacion ?? c.importe_licitacion)
                              ? <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1F4E8C' }}>{fmtImporte(c.importe_adjudicacion ?? c.importe_licitacion ?? 0)}</span>
                              : <span style={{ color:'#86868b' }}>—</span>}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Sidebar: Top órganos / CPV / evolución */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <section style={panel}>
                  <h2 style={panelTitle}>Top órganos contratantes</h2>
                  <RankList items={data.top_organos} linkBase="/licitaciones/organo" colorBar="#1F4E8C"/>
                </section>
                <section style={panel}>
                  <h2 style={panelTitle}>Top CPV</h2>
                  <RankList items={data.top_cpv} colorBar="#5B21B6" labelOverride={r => `${r.key} · ${cpvDivLabel(r.key)}`}/>
                </section>
                <section style={panel}>
                  <h2 style={panelTitle}>Evolución por año</h2>
                  <YearChart data={data.evolucion_anio}/>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ ...panel, padding:'14px 18px' }}>
      <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: accent, letterSpacing:'-0.02em' }}>{value}</div>
    </div>
  )
}
function RankList({ items, linkBase, colorBar, labelOverride }: { items: AggRow[]; linkBase?: string; colorBar: string; labelOverride?: (r: AggRow) => string }) {
  const max = Math.max(1, ...items.map(it => it.n_contratos))
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0 }}>
      {items.slice(0, 8).map(it => (
        <li key={it.key} style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:11.5, color:'#3a3a3d', fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {linkBase
                ? <Link href={`${linkBase}/${encodeURIComponent(it.key)}`} style={{ color:'inherit', textDecoration:'none' }}>{labelOverride ? labelOverride(it) : it.label}</Link>
                : (labelOverride ? labelOverride(it) : it.label)}
            </span>
            <span style={{ fontSize:11, fontWeight:700, color: colorBar }}>{it.n_contratos.toLocaleString('es-ES')}</span>
          </div>
          <div style={{ height:4, background:'#F5F5F7', borderRadius:2, marginTop:3, overflow:'hidden' }}>
            <div style={{ width:`${(it.n_contratos / max) * 100}%`, height:'100%', background: colorBar }}/>
          </div>
        </li>
      ))}
    </ul>
  )
}
function YearChart({ data }: { data: Array<{ anio: number; n: number }> }) {
  const max = Math.max(1, ...data.map(d => d.n))
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120 }}>
      {data.map(d => (
        <div key={d.anio} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div title={`${d.n} contratos en ${d.anio}`} style={{
            width:'100%', height: `${(d.n / max) * 100}%`, minHeight:2,
            background:'#1F4E8C', borderRadius:'2px 2px 0 0',
          }}/>
          <span style={{ fontSize:9, color:'#86868b' }}>{String(d.anio).slice(2)}</span>
        </div>
      ))}
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, padding:'8px 6px', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>{children}</th>
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align, padding:'8px 6px', verticalAlign:'top' }}>{children}</td>
}

const panel: React.CSSProperties = {
  background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px',
}
const panelTitle: React.CSSProperties = {
  margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:700,
  letterSpacing:'-0.01em', color:'#1d1d1f',
}
function fmtImporte(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M €`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k €`
  return `${v.toFixed(0)} €`
}
function trunc(s: string, n: number): string {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}
