'use client'
/**
 * Dashboard Sector Farma & Salud
 *
 * Datos en vivo desde CIMA AEMPS (cima.aemps.es) · sin auth.
 *   - Catálogo de medicamentos autorizados
 *   - Desabastecimientos / problemas de suministro
 *   - Agregado por laboratorio titular
 *   - Distribución por código ATC (clase terapéutica)
 *   - Buscador de medicamentos
 *
 * Auto-refresh cada 30 min (cache CDN 30 min).
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { EMPRESAS_FARMA, REGULADORES_FARMA } from '@/lib/sources/aemps'
// Sprint Cuaderno N2-wire · notas que mencionan "Farmacéutico" (registry slug 'farma')
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import PillSelect, { PillInput } from '@/components/PillSelect'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'

interface ResumenResp {
  kpis: {
    medicamentos_total: number
    medicamentos_comerc: number
    medicamentos_comerc_pct: number | null
    desabastecimientos_30d: number
    desabastecimientos_90d: number
  }
  sources: Record<string, { ok: boolean; ms: number }>
  fetch_ms: number
}
interface Desabastecimiento {
  cn?: number; nombre?: string; tipo?: number; tipo_label: string; tipo_color: string
  fini: string | null; ffin: string | null; permanente: boolean; activo: boolean; motivo?: string
}
interface DesabastResp {
  items: Desabastecimiento[]; total: number
  por_tipo: Array<{ label: string; n: number; color: string }>
  por_mes: Array<{ t: string; n: number }>
}
interface LabsResp { items: Array<{ label: string; n: number }>; sample_size: number; total_unique_labs: number }
interface AtcResp { items: Array<{ code: string; label: string; color: string; n: number; pct: number }>; total: number }
interface BuscarResp {
  items: Array<{
    nregistro: string; nombre: string; laboratorio: string; forma?: string
    vias?: string[]; atc?: string; atc_label?: string; principios_activos?: string[]
    flags: Record<string, boolean>; aut_date: string | null
  }>
  total: number; pagination: { page: number; returned: number }; fetch_ms: number
}

const ACCENT = '#0EA5E9'
const ACCENT_DARK = '#075985'
const REFRESH_MS = 30 * 60 * 1000

export default function SectorFarmaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [desabast, setDesabast] = useState<DesabastResp | null>(null)
  const [labs, setLabs] = useState<LabsResp | null>(null)
  const [atc, setAtc] = useState<AtcResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, d, l, a] = await Promise.all([
      fetch('/api/sectores/farma/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/farma/desabastecimientos?days=120&page=1&page_size=100').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/farma/laboratorios?limit=20').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/farma/atc').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setDesabast(d); setLabs(l); setAtc(a)
    setUpdatedAt(new Date()); setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        {/* HERO */}
 <section style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.8, textTransform:'uppercase', margin:'0 0 8px' }}>
              SECTORIAL · FARMA & SALUD · DATOS AEMPS EN VIVO
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 10px', lineHeight:1.05 }}>
              Mercado farmacéutico español <em style={{ fontWeight:300, fontStyle:'italic', opacity:0.75 }}>en tiempo real</em>
 </h1>
 <p style={{ fontSize:13.5, opacity:0.8, margin:0, lineHeight:1.5 }}>
              Catálogo de medicamentos autorizados · desabastecimientos activos · ranking de laboratorios titulares ·
              distribución por clase terapéutica ATC. Datos oficiales del Centro de Información de Medicamentos (CIMA · AEMPS).
 </p>
            {updatedAt && (
 <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', fontSize:11, opacity:0.7 }}>
 <span style={{ width:6, height:6, borderRadius:'50%', background:'#86EFAC', boxShadow:'0 0 8px #86EFAC' }}/>
                Última actualización · {updatedAt.toLocaleTimeString('es-ES')} ·
                {resumen?.fetch_ms ? ` ${resumen.fetch_ms} ms` : ''}
 <button onClick={refresh} style={{
                  marginLeft:8, fontSize:10.5, padding:'4px 12px', borderRadius:999,
                  border:'1px solid rgba(255,255,255,0.35)', background:'transparent', color:'#fff',
                  cursor:'pointer', fontFamily:'inherit',
                }}>↻ Actualizar</button>
 </div>
            )}
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
 <HeroKPI label="Medicamentos autorizados" value={resumen?.kpis.medicamentos_total} unit="" accent="#7DD3FC"/>
 <HeroKPI label="Comercializados" value={resumen?.kpis.medicamentos_comerc_pct} unit="%" accent="#86EFAC"/>
 <HeroKPI label="Desabastec. 30 días" value={resumen?.kpis.desabastecimientos_30d} unit="" accent="#FCA5A5" sub="Nuevos problemas"/>
 <HeroKPI label="Desabastec. 90 días" value={resumen?.kpis.desabastecimientos_90d} unit="" accent="#FCD34D"/>
 </div>
 </section>

        {/* ROW 1: Desabastecimientos timeline + Distribución por tipo */}
 <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
 <Panel
            title="Desabastecimientos · evolución últimos 4 meses"
            subtitle={desabast ? `${desabast.total.toLocaleString('es-ES')} problemas en el periodo` : 'Cargando…'}
            sourceUrl="https://cima.aemps.es/cima/publico/listadesabastecimiento.html"
            sourceLabel="AEMPS CIMA"
            sourceTooltip="Listado oficial de problemas de suministro · AEMPS"
          >
            {desabast && <DesabastTimeline data={desabast.por_mes}/>}
 </Panel>
 <Panel title="Tipo de problema de suministro"
            subtitle="Distribución por clasificación AEMPS"
            sourceUrl="https://cima.aemps.es/cima/publico/listadesabastecimiento.html"
            sourceLabel="AEMPS CIMA"
            sourceTooltip="Clasificación de problemas de suministro · AEMPS">
            {desabast && <TipoBreakdown items={desabast.por_tipo}/>}
 </Panel>
 </div>

        {/* ROW 2: Top laboratorios + Distribución ATC */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Top laboratorios titulares"
            subtitle={labs ? `${labs.total_unique_labs.toLocaleString('es-ES')} únicos · sample ${labs.sample_size}` : 'Cargando…'}
            sourceUrl="https://cima.aemps.es/cima/publico/lista.html"
            sourceLabel="AEMPS CIMA"
            sourceTooltip="Buscador de medicamentos · titulares · AEMPS">
            {labs && <LabsRanking items={labs.items}/>}
 </Panel>
 <Panel title="Distribución por clase terapéutica"
            subtitle="Sistema de Clasificación ATC nivel 1"
            sourceUrl="https://cima.aemps.es/cima/publico/lista.html"
            sourceLabel="AEMPS CIMA"
            sourceTooltip="Clasificación ATC · nivel 1 · medicamentos">
            {atc && <AtcDonut items={atc.items}/>}
 </Panel>
 </div>

        {/* ROW 3: Listado de desabastecimientos recientes */}
 <Panel
          title="Problemas de suministro recientes"
          subtitle="Listado oficial AEMPS · ordenado por fecha de inicio"
          marginBottom
          sourceUrl="https://cima.aemps.es/cima/publico/listadesabastecimiento.html"
          sourceLabel="AEMPS CIMA"
          sourceTooltip="Problemas de suministro · listado completo · AEMPS"
        >
          {desabast && <DesabastList items={desabast.items}/>}
 </Panel>

        {/* ROW 4: Buscador de medicamentos */}
 <Panel title="Buscador de medicamentos"
          subtitle="CIMA · 28k+ fichas · filtros por laboratorio, ATC y receta"
          marginBottom
          sourceUrl="https://cima.aemps.es/cima/publico/lista.html"
          sourceLabel="AEMPS CIMA"
          sourceTooltip="Buscador oficial CIMA · ficha técnica de medicamentos">
 <BuscadorMedicamentos/>
 </Panel>

        {/* ROW 5: Empresas + Reguladores */}
 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Empresas farma cotizadas" subtitle={`${EMPRESAS_FARMA.length} compañías · IBEX 35 + selectivos`}>
 <EmpresasGrid/>
 </Panel>
 <Panel title="Reguladores y operadores" subtitle="Marco institucional del sector">
 <RegLista/>
 </Panel>
 </div>

        {/* ROW 6: Licitaciones + Áreas estratégicas */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
 <Panel title="Licitaciones del sector" subtitle="CPV 33 · Equipos médicos, farmacéuticos">
 <LicitacionesShortcut/>
 </Panel>
 <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
 <AreasTematicas/>
 </Panel>
 </div>

        {/* Politeia intel · pharma_signals + AEMPS + EMA */}
        <SectorIntelPanel sector="farma" />

        {loading && <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>Cargando datos AEMPS…</div>}

        {/* Sprint Cuaderno N2-wire · notas del Cuaderno sobre sector Farma */}
        <div style={{ marginTop: 18 }}>
          <CuadernoEntityWidget slug="farma" name="Sector Farmacéutico" accentColor="#EC4899" />
        </div>
 </main>
 </div>
  )
}

// ─── Componentes ─────────────────────────────────────────

function HeroKPI({ label, value, unit, accent, sub }: { label: string; value: number | null | undefined; unit: string; accent: string; sub?: string }) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  return (
 <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'12px 14px' }}>
 <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.72, marginBottom:4 }}>{label}</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color: accent }}>
        {display}<span style={{ fontSize:11, fontWeight:600, marginLeft:5, opacity:0.85 }}>{unit}</span>
 </div>
      {sub && <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{sub}</div>}
 </div>
  )
}

function DesabastTimeline({ data }: { data: Array<{ t: string; n: number }> }) {
  if (!data.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const max = Math.max(...data.map(d => d.n))
  const W = 700, H = 140, P = 12
  const colW = (W - 2 * P) / data.length
  return (
 <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display:'block' }}>
      {[0, 0.5, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
      ))}
      {data.map((d, i) => {
        const h = (d.n / max) * (H - 2 * P)
        return (
 <g key={d.t}>
 <rect
              x={P + i * colW + 2}
              y={H - P - h}
              width={colW - 4}
              height={h}
              fill="#0EA5E9" rx={2}>
 <title>{d.t}: {d.n} desabastecimientos</title>
 </rect>
 <text x={P + i * colW + colW / 2} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{d.t.slice(2)}</text>
 </g>
        )
      })}
 </svg>
  )
}

function TipoBreakdown({ items }: { items: Array<{ label: string; n: number; color: string }> }) {
  const total = items.reduce((a, i) => a + i.n, 0)
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {items.slice(0, 8).map(it => {
        const pct = total > 0 ? (it.n / total) * 100 : 0
        return (
 <li key={it.label} title={`${it.label}: ${it.n} desabastecimientos (${pct.toFixed(1)}%)`} style={{ cursor:'help' }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{it.label}</span>
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: it.color }}>
                {it.n.toLocaleString('es-ES')} <span style={{ color:'#86868b', fontWeight:500 }}>· {pct.toFixed(0)}%</span>
 </span>
 </div>
 <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${pct}%`, height:'100%', background: it.color }}/>
 </div>
 </li>
        )
      })}
 </ul>
  )
}

function LabsRanking({ items }: { items: Array<{ label: string; n: number }> }) {
  const max = Math.max(1, ...items.map(i => i.n))
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:6 }}>
      {items.slice(0, 15).map((it, i) => (
 <li key={it.label} title={`#${i+1} ${it.label}: ${it.n} medicamentos en CIMA`} style={{ display:'flex', alignItems:'center', gap:10, fontSize:11.5, cursor:'help' }}>
 <span style={{ width:18, fontFamily:'var(--font-display)', fontWeight:700, color:'#86868b', textAlign:'right' }}>{i + 1}</span>
 <Link href={`/licitaciones?q=${encodeURIComponent(it.label)}`} style={{
            flex:1, color:'#1d1d1f', fontWeight:600, textDecoration:'none',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>{it.label}</Link>
 <div style={{ width:80, height:4, background:'#F5F5F7', borderRadius:2, overflow:'hidden' }}>
 <div style={{ width:`${(it.n / max) * 100}%`, height:'100%', background:'#0EA5E9' }}/>
 </div>
 <span style={{ width:30, textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#0EA5E9' }}>{it.n}</span>
 </li>
      ))}
 </ul>
  )
}

function AtcDonut({ items }: { items: Array<{ code: string; label: string; color: string; pct: number; n: number }> }) {
  const radius = 65
  const stroke = 16
  const circ = 2 * Math.PI * radius
  let acum = 0
  return (
 <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'center' }}>
 <svg width={radius * 2 + stroke} height={radius * 2 + stroke}>
 <g transform={`translate(${radius + stroke / 2},${radius + stroke / 2}) rotate(-90)`}>
          {items.map(it => {
            const len = (it.pct / 100) * circ
            const offset = -acum
            acum += len
            return (
 <circle key={it.code} r={radius} fill="none" stroke={it.color} strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={offset}
                style={{ cursor:'pointer' }}>
 <title>ATC {it.code} · {it.label}: {it.pct.toFixed(1)}% ({it.n.toLocaleString('es-ES')} medicamentos)</title>
 </circle>
            )
          })}
 </g>
 <text x="50%" y="50%" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, fill:'#1d1d1f' }}>{items.length}</text>
 <text x="50%" y="60%" textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>clases ATC</text>
 </svg>
 <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:10.5 }}>
        {items.slice(0, 10).map(it => (
 <li key={it.code} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
 <span style={{ width:8, height:8, borderRadius:2, background: it.color, flexShrink:0 }}/>
 <span style={{ flex:1, color:'#3a3a3d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
 <strong>{it.code}</strong> · {it.label.slice(0, 30)}
 </span>
 <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>{it.pct.toFixed(1)}%</span>
 </li>
        ))}
 </ul>
 </div>
  )
}

function DesabastList({ items }: { items: Desabastecimiento[] }) {
  // Por defecto mostramos 5 filas para no inundar el panel; el usuario
  // puede expandir a la lista completa con el botón "Ver más".
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 5
  const visible = expanded ? items : items.slice(0, PREVIEW)
  const hidden = items.length - PREVIEW

  return (
 <div>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
 <thead>
 <tr style={{ borderBottom:'1px solid #ECECEF' }}>
 <Th>Inicio</Th><Th>Medicamento</Th><Th>Tipo</Th><Th>Estado</Th><Th>Motivo</Th>
 </tr>
 </thead>
 <tbody>
          {visible.map((it, i) => (
 <tr key={`${it.cn}-${i}`} style={{ borderBottom:'1px solid #F5F5F7' }}>
 <Td><span style={{ fontWeight:600 }}>{it.fini || '—'}</span></Td>
 <Td>
 <div style={{ fontWeight:600, color:'#1d1d1f', maxWidth:340 }}>{(it.nombre || '—').slice(0, 100)}</div>
                {it.cn && <div style={{ fontSize:9.5, color:'#86868b', fontFamily:'monospace' }}>CN {it.cn}</div>}
 </Td>
 <Td>
 <span style={{
                  fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:4,
                  background:`${it.tipo_color}15`, color: it.tipo_color, border:`1px solid ${it.tipo_color}40`,
                  letterSpacing:'0.04em',
                }}>{it.tipo_label}</span>
 </Td>
 <Td>
                {it.activo ? (
 <span style={{ fontSize:10, color:'#DC2626', fontWeight:700, padding:'2px 6px', borderRadius:4, background:'#FEE2E2' }}>
                    ACTIVO {it.permanente ? '· PERMANENTE' : ''}
 </span>
                ) : (
 <span style={{ fontSize:10, color:'#16A34A', fontWeight:700, padding:'2px 6px', borderRadius:4, background:'#DCFCE7' }}>
                    RESUELTO
 </span>
                )}
                {it.ffin && !it.permanente && <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>fin: {it.ffin}</div>}
 </Td>
 <Td><span style={{ color:'#3a3a3d', fontSize:11, lineHeight:1.4 }}>{(it.motivo || '—').slice(0, 90)}</span></Td>
 </tr>
          ))}
 </tbody>
 </table>
      {hidden > 0 && (
 <div style={{ marginTop:10, textAlign:'center' }}>
 <button onClick={() => setExpanded(v => !v)} style={{
            background:'#FAFAFA', border:'1px solid #ECECEF', borderRadius:999,
            padding:'7px 18px', fontSize:11.5, fontWeight:600, color:'#1d1d1f',
            cursor:'pointer', fontFamily:'inherit',
            transition:'background 150ms, border-color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F1'; e.currentTarget.style.borderColor = '#D6D6DA' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#ECECEF' }}
          >
            {expanded ? `Ver menos · mostrar solo ${PREVIEW}` : `Ver más · ${hidden} filas adicionales ↓`}
 </button>
 </div>
      )}
 </div>
  )
}

function BuscadorMedicamentos() {
  const [q, setQ] = useState('')
  const [lab, setLab] = useState('')
  const [atc, setAtc] = useState('')
  const [comerc, setComerc] = useState<string>('')
  const [receta, setReceta] = useState<string>('')
  const [data, setData] = useState<BuscarResp | null>(null)
  const [loading, setLoading] = useState(false)
  // Vista compacta · mostrar 5 resultados; el botón "Ver más" expande a
  // todos los devueltos por la API (page_size=25).
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 5

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (lab) sp.set('laboratorio', lab)
    if (atc) sp.set('atc', atc)
    if (comerc) sp.set('comerc', comerc)
    if (receta) sp.set('receta', receta)
    sp.set('page_size', '25')
    return `/api/sectores/farma/buscar?${sp.toString()}`
  }, [q, lab, atc, comerc, receta])

  const run = async () => {
    setLoading(true)
    setExpanded(false)  // al lanzar nueva búsqueda, vuelve a vista compacta
    try {
      const res = await fetch(queryUrl)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { run() /* eslint-disable-next-line */ }, [])

  return (
 <div>
 <form onSubmit={e => { e.preventDefault(); run() }} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto', gap:8, marginBottom:12 }}>
 <PillInput value={q} onChange={setQ} placeholder="Nombre del medicamento…" ariaLabel="Buscar"/>
 <PillInput value={lab} onChange={setLab} placeholder="Laboratorio" ariaLabel="Laboratorio"/>
 <PillInput value={atc} onChange={setAtc} placeholder="Código ATC" ariaLabel="ATC"/>
 <PillSelect value={comerc} onChange={setComerc}
          options={[{ value:'1', label:'Solo comercializados' },{ value:'0', label:'Solo no comerc.' }]}
          placeholder="Comerc.: todos" ariaLabel="Comercializado"/>
 <PillSelect value={receta} onChange={setReceta}
          options={[{ value:'1', label:'Con receta' },{ value:'0', label:'Sin receta' }]}
          placeholder="Receta: todos" ariaLabel="Receta"/>
 <button type="submit" disabled={loading} style={{
          padding:'9px 18px', borderRadius:999, border:'none',
          background: loading ? '#9CA3AF' : '#1d1d1f', color:'#fff',
          fontSize:12, fontWeight:600, cursor: loading ? 'wait' : 'pointer', fontFamily:'inherit', transition:'all 160ms',
        }}>{loading ? '…' : 'Buscar'}</button>
 </form>
      {data && (() => {
        const visible = expanded ? data.items : data.items.slice(0, PREVIEW)
        const hidden = data.items.length - PREVIEW
        return (
 <>
 <div style={{ fontSize:11.5, color:'#6e6e73', marginBottom:8 }}>
 <strong>{data.total.toLocaleString('es-ES')}</strong> medicamentos encontrados · mostrando {visible.length} · {data.fetch_ms} ms
 </div>
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:6 }}>
              {visible.map(m => (
 <li key={m.nregistro} style={{
                  padding:'10px 12px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
                  display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
                }}>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                      {m.flags.comercializado && <Tag label="COMERC" color="#16A34A"/>}
                      {m.flags.requiere_receta && <Tag label="RECETA" color="#1F4E8C"/>}
                      {m.flags.huerfano && <Tag label="HUÉRFANO" color="#7C3AED"/>}
                      {m.flags.biosimilar && <Tag label="BIOSIM" color="#F97316"/>}
                      {m.flags.generico && <Tag label="EFG" color="#0EA5E9"/>}
                      {m.flags.triangulo_seguimiento && <Tag label="▼ SEG" color="#DC2626"/>}
                      {m.atc && <Tag label={`ATC ${m.atc.slice(0,4)}`} color="#5B21B6" outline/>}
 </div>
 <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.4 }}>{m.nombre}</div>
 <div style={{ fontSize:10.5, color:'#86868b', marginTop:2 }}>
                      {m.laboratorio} · {m.forma} · {(m.vias || []).join(', ')}
 </div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontSize:9.5, color:'#86868b' }}>nº reg.</div>
 <div style={{ fontFamily:'monospace', fontSize:11, color:'#1d1d1f', fontWeight:700 }}>{m.nregistro}</div>
                    {m.aut_date && <div style={{ fontSize:9, color:'#86868b' }}>aut. {m.aut_date.slice(0, 4)}</div>}
 </div>
 </li>
              ))}
 </ul>
            {hidden > 0 && (
 <div style={{ marginTop:10, textAlign:'center' }}>
 <button onClick={() => setExpanded(v => !v)} style={{
                  background:'#FAFAFA', border:'1px solid #ECECEF', borderRadius:999,
                  padding:'7px 18px', fontSize:11.5, fontWeight:600, color:'#1d1d1f',
                  cursor:'pointer', fontFamily:'inherit',
                  transition:'background 150ms, border-color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F1'; e.currentTarget.style.borderColor = '#D6D6DA' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#ECECEF' }}
                >
                  {expanded ? `Ver menos · mostrar solo ${PREVIEW}` : `Ver más · ${hidden} resultados adicionales ↓`}
 </button>
 </div>
            )}
 </>
        )
      })()}
 </div>
  )
}

function Tag({ label, color, outline }: { label: string; color: string; outline?: boolean }) {
  return (
 <span style={{
      fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4,
      background: outline ? `${color}10` : color,
      color: outline ? color : '#fff',
      border: `1px solid ${color}${outline ? '40' : '00'}`,
      letterSpacing:'0.04em',
    }}>{label}</span>
  )
}

function EmpresasGrid() {
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {EMPRESAS_FARMA.map(e => (
 <li key={e.ticker}>
 <a href={e.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6 }}>
 <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:13.5, color:'#1d1d1f' }}>{e.nombre}</span>
              {e.ibex && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#FCD34D', color:'#92400E' }}>IBEX 35</span>}
 </div>
 <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace', marginTop:2 }}>{e.ticker} · {e.capitalizacion_b}b€</div>
 <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{e.descripcion}</div>
 <div style={{ fontSize:9.5, color:'#0EA5E9', fontWeight:700, marginTop:5, letterSpacing:'0.04em', textTransform:'uppercase' }}>{e.segmento}</div>
 </a>
 </li>
      ))}
 </ul>
  )
}

function RegLista() {
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {REGULADORES_FARMA.map(r => (
 <li key={r.nombre}>
 <a href={r.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
 <div style={{ display:'flex', justifyContent:'space-between', gap:6, alignItems:'baseline' }}>
 <span style={{ fontWeight:700, fontSize:12.5, color:'#1d1d1f' }}>{r.nombre}</span>
 <span style={{ fontSize:10, color:'#86868b' }}>{r.full}</span>
 </div>
 <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{r.competencias}</div>
 </a>
 </li>
      ))}
 </ul>
  )
}

function LicitacionesShortcut() {
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ id: string; objeto: string; organo: string; importe?: number; url?: string }>>([])
  useEffect(() => {
    fetch('/api/licitaciones/buscar?cpv_div=33&page_size=5&sort=date_desc')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setCount(d.pagination?.total_estimado ?? d.stats?.total ?? 0)
        setItems((d.items || []).slice(0, 5).map((it: { id: string; objeto: string; organo: string; importe_adjudicacion?: number; importe_licitacion?: number; url?: string }) => ({
          id: it.id, objeto: it.objeto, organo: it.organo,
          importe: it.importe_adjudicacion ?? it.importe_licitacion,
          url: it.url,
        })))
      })
  }, [])
  return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
 <span style={{ fontSize:11, color:'#6e6e73' }}>Últimos contratos publicados</span>
 <Link href="/licitaciones?cpv_div=33" style={{ fontSize:11, color:'#1F4E8C', textDecoration:'none', fontWeight:600 }}>
          Ver buscador {count != null && `· ${count.toLocaleString('es-ES')} en total ›`}
 </Link>
 </div>
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
        {items.length === 0 && <li style={{ fontSize:11, color:'#86868b' }}>Cargando…</li>}
        {items.map(it => (
 <li key={it.id} style={{ padding:'8px 10px', background:'#FAFAFA', borderRadius:8, border:'1px solid #ECECEF' }}>
 <a href={it.url || '#'} target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'none' }}>
 <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600, lineHeight:1.4 }}>{it.objeto.length > 90 ? it.objeto.slice(0, 89) + '…' : it.objeto}</div>
 <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10.5 }}>
 <span style={{ color:'#86868b' }}>{it.organo}</span>
                {it.importe && (
 <span style={{ fontFamily:'var(--font-display)', color:'#1F4E8C', fontWeight:700 }}>
                    {(it.importe / 1_000_000).toFixed(2)}M €
 </span>
                )}
 </div>
 </a>
 </li>
        ))}
 </ul>
 </div>
  )
}

function AreasTematicas() {
  const areas = [
    { titulo: 'Innovación oncológica', desc: 'CAR-T, terapias dirigidas, inmunoterapia · acceso público vs precio', color:'#5B21B6' },
    { titulo: 'Política de precios', desc: 'CIPM · sistema precios referencia · co-financiación CCAA', color:'#DC2626' },
    { titulo: 'Desabastecimientos', desc: 'AEMPS lista oficial · cadena de suministro · stock estratégico', color:'#F97316' },
    { titulo: 'Genéricos y biosimilares', desc: 'EFG · MAB · cuota mercado España vs UE · patentes', color:'#0EA5E9' },
    { titulo: 'Vacunas y salud pública', desc: 'Calendario vacunal · pandemia · viruela del mono · COVID', color:'#16A34A' },
    { titulo: 'Listas de espera SNS', desc: 'Quirúrgicas · consultas · pruebas · indicador clave gestión', color:'#7C3AED' },
    { titulo: 'IA en salud', desc: 'Diagnóstico imagen · drug discovery · regulación AEMPS/EMA', color:'#06B6D4' },
    { titulo: 'Sanidad privada y mutuas', desc: 'Adeslas, Asisa, Sanitas, MAPFRE · concertación con SNS', color:'#0F766E' },
  ]
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
      {areas.map(a => (
 <li key={a.titulo} style={{
          padding:'12px 14px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
          borderTop:`3px solid ${a.color}`,
        }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.01em' }}>{a.titulo}</div>
 <div style={{ fontSize:11, color:'#3a3a3d', marginTop:5, lineHeight:1.4 }}>{a.desc}</div>
 </li>
      ))}
 </ul>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
 <th style={{
      textAlign:'left', padding:'8px 8px', fontSize:9.5, fontWeight:800,
      letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase',
    }}>{children}</th>
  )
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding:'8px 8px', verticalAlign:'top' }}>{children}</td>
}
