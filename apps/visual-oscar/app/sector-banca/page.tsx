'use client'
/**
 * Dashboard Sector Banca & Seguros
 *
 * Datos en vivo:
 *   - ECB SDW: DFR (deposit facility), MRO, EURIBOR 12M/6M, bond 10Y ESP
 *   - World Bank: crédito sector privado %PIB, NPL, capital bancario
 *
 * Auto-refresh cada 60 min.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_BANCA, REGULADORES_BANCA, AREAS_BANCA, PROGRAMAS_BANCA,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#1F4E8C'
const ACCENT_DARK = '#0d2e58'
const REFRESH_MS = 60 * 60 * 1000

interface ResumenResp {
  kpis: {
    euribor_12m: number | null; euribor_12m_t?: string
    dfr_ecb: number | null; dfr_ecb_t?: string
    mro_ecb: number | null
    bond_10y_esp: number | null; bond_10y_t?: string
    credito_pib_pct: number | null; credito_pib_year?: number
    npl_pct: number | null; npl_year?: number
    bank_capital_pct: number | null; bank_capital_year?: number
  }
  fetch_ms: number
}
interface TiposResp {
  points: Array<{ t: string; dfr: number | null; mro: number | null }>
  last: { dfr?: number; mro?: number }
}
interface EuriborResp {
  points: Array<{ t: string; euribor_12m: number | null; euribor_6m: number | null; bond_10y: number | null }>
}
interface CreditoResp {
  serie_credito_pib: Array<{ t: string; v: number | null }>
  serie_npl: Array<{ t: string; v: number | null }>
  serie_capital: Array<{ t: string; v: number | null }>
  serie_deuda_publica: Array<{ t: string; v: number | null }>
}
interface ComparativaResp {
  items: Array<{
    iso3: string; pais: string; destacado: boolean
    credito_pib: number | null; credito_year?: number
    npl_pct: number | null; npl_year?: number
  }>
  year: number
}

export default function SectorBancaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [tipos, setTipos] = useState<TiposResp | null>(null)
  const [euribor, setEuribor] = useState<EuriborResp | null>(null)
  const [credito, setCredito] = useState<CreditoResp | null>(null)
  const [comparativa, setComparativa] = useState<ComparativaResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, t, e, c, cmp] = await Promise.all([
      fetch('/api/sectores/banca/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/banca/tipos-ecb?days=730').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/banca/euribor?nult=48').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/banca/credito').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/banca/comparativa-europa').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setTipos(t); setEuribor(e); setCredito(c); setComparativa(cmp)
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
 <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · BANCA & SEGUROS · ECB SDW + WORLD BANK EN VIVO"
          title="Sistema financiero español en datos abiertos"
          sub="Tipos del BCE (DFR, MRO) · EURIBOR 12M y 6M · Bono 10Y España · crédito al sector privado · NPL y capital bancario · comparativa europea · 10 entidades cotizadas (Santander, BBVA, CaixaBank, Sabadell, Bankinter, Mapfre, Catalana Occ., Línea Directa, Renta 4) y 7 reguladores (BdE, CNMV, DGSFP, BCE, EBA, EIOPA, AEB)."
          updatedAt={updatedAt} fetchMs={resumen?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
 <HeroKPI
              label={`EURIBOR 12M (${resumen?.kpis.euribor_12m_t?.slice(0, 7) || ''})`}
              value={resumen?.kpis.euribor_12m} unit="%" decimals={3} accent="#FCD34D"/>
 <HeroKPI
              label={`Tipo depósito BCE (${resumen?.kpis.dfr_ecb_t || ''})`}
              value={resumen?.kpis.dfr_ecb} unit="%" decimals={2} accent="#7DD3FC"
              sub={resumen?.kpis.mro_ecb != null ? `MRO ${resumen.kpis.mro_ecb}%` : ''}/>
 <HeroKPI
              label={`Crédito al privado (${resumen?.kpis.credito_pib_year || ''})`}
              value={resumen?.kpis.credito_pib_pct} unit="% PIB" decimals={1} accent="#86EFAC"/>
 <HeroKPI
              label={`Bono 10Y España (${resumen?.kpis.bond_10y_t?.slice(0, 7) || ''})`}
              value={resumen?.kpis.bond_10y_esp} unit="%" decimals={3} accent="#FCA5A5"/>
 </>}
        />

        {/* ROW 1: Tipos ECB + EURIBOR */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Tipos oficiales del BCE · 24 meses"
            subtitle={tipos ? `DFR ${tipos.last.dfr}% · MRO ${tipos.last.mro}% (último valor)` : 'Cargando…'}
            sourceUrl="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html"
            sourceLabel="ECB"
            sourceTooltip="Tipos oficiales del Banco Central Europeo">
            {tipos && <TiposECBChart points={tipos.points}/>}
 </Panel>
 <Panel title="EURIBOR 12M y 6M · 4 años"
            subtitle="Comparado con bono 10Y España · BCE SDW"
            sourceUrl="https://data.ecb.europa.eu/data/datasets/FM"
            sourceLabel="ECB SDW"
            sourceTooltip="EURIBOR · Financial Markets dataset (BCE)">
            {euribor && <EuriborChart points={euribor.points}/>}
 </Panel>
 </div>

        {/* ROW 2: Crédito + Comparativa europea */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:14, marginBottom:14 }}>
 <Panel title="Crédito al sector privado · % PIB"
            subtitle="Banco Mundial · serie histórica 25 años"
            sourceUrl="https://datos.bancomundial.org/indicador/FS.AST.PRVT.GD.ZS?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Crédito al sector privado · % PIB · serie España">
            {credito && <CreditoChart series={credito}/>}
 </Panel>
 <Panel title="Comparativa europea"
            subtitle={comparativa ? `Año ${comparativa.year} · crédito %PIB y NPL` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/FS.AST.PRVT.GD.ZS"
            sourceLabel="Banco Mundial"
            sourceTooltip="Comparativa europea · crédito y morosidad">
            {comparativa && <ComparativaTable items={comparativa.items}/>}
 </Panel>
 </div>

        {/* ROW 3: NPL + Capital bancario */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Préstamos morosos (NPL) · % sobre total"
            subtitle="Banco Mundial · serie post-crisis 2010-2024"
            sourceUrl="https://datos.bancomundial.org/indicador/FB.AST.NPER.ZS?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="NPL · préstamos morosos % sobre total · España">
            {credito && <NplChart points={credito.serie_npl}/>}
 </Panel>
 <Panel title="Capital bancario · % activos"
            subtitle="Banco Mundial · ratio solvencia agregado"
            sourceUrl="https://datos.bancomundial.org/indicador/FB.BNK.CAPA.ZS?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Capital bancario · ratio % activos · España">
            {credito && <CapitalChart points={credito.serie_capital}/>}
 </Panel>
 </div>

        {/* ROW 4: Programas */}
 <Panel title="Programas y políticas activas" subtitle="Recargo extraordinario · Bono Sequía · SAREB · Cliente único" marginBottom>
 <ProgramasGrid programas={PROGRAMAS_BANCA} columns={4}/>
 </Panel>

        {/* ROW 5: Empresas + Reguladores */}
 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Empresas cotizadas del sector" subtitle={`${EMPRESAS_BANCA.length} entidades · IBEX 35, selectivos y BME Growth`}>
 <EmpresasGrid empresas={EMPRESAS_BANCA} accent={ACCENT}/>
 </Panel>
 <Panel title="Reguladores y supervisores" subtitle="Marco institucional banca + seguros (nacional + UE)">
 <RegLista reguladores={REGULADORES_BANCA}/>
 </Panel>
 </div>

        {/* ROW 6: Licitaciones + Áreas */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
 <Panel title="Licitaciones del sector" subtitle="CPV 66 · Servicios financieros y de seguros">
 <LicitacionesShortcut cpv_div="66" label="financieros y seguros"/>
 </Panel>
 <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
 <AreasTematicas areas={AREAS_BANCA}/>
 </Panel>
 </div>

        {loading && <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>Cargando datos ECB + WB…</div>}
 </main>
 </div>
  )
}

// ─── Visualizaciones específicas ──────────────────────────

/** Tipos BCE (DFR + MRO) · serie de líneas con 2 series. */
function TiposECBChart({ points }: { points: Array<{ t: string; dfr: number | null; mro: number | null }> }) {
  const valid = points.filter(p => p.dfr != null || p.mro != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 520, H = 200, P = 30
  const allValues = valid.flatMap(p => [p.dfr, p.mro].filter((v): v is number => v != null))
  const maxY = Math.max(...allValues) + 0.5
  const minY = Math.max(0, Math.min(...allValues) - 0.5)
  const range = maxY - minY || 1

  const path = (key: 'dfr' | 'mro') => valid.map((p, i) => {
    const v = p[key]
    if (v == null) return null
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - (v - minY) / range) * (H - 2 * P)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).filter(Boolean).map((s, i) => `${i === 0 ? 'M' : 'L'}${s}`).join(' ')

  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
 <path d={path('mro')} fill="none" stroke="#1F4E8C" strokeWidth={2.5}/>
 <path d={path('dfr')} fill="none" stroke="#7C3AED" strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return (
 <g key={`hover-${p.t}`}>
              {p.dfr != null && (
 <circle cx={x} cy={P + (1 - (p.dfr - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>DFR · {p.t.slice(0,10)}: {p.dfr.toFixed(2)}%</title>
 </circle>
              )}
              {p.mro != null && (
 <circle cx={x} cy={P + (1 - (p.mro - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>MRO · {p.t.slice(0,10)}: {p.mro.toFixed(2)}%</title>
 </circle>
              )}
 </g>
          )
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t.slice(0, 7)}</text>
        })}
 <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(2)}%</text>
 <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(2)}%</text>
 </svg>
 <div style={{ display:'flex', gap:14, fontSize:11, marginTop:6 }}>
 <span style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ width:14, height:2, background:'#1F4E8C' }}/>
 <strong style={{ color:'#3a3a3d' }}>MRO</strong>
 <span style={{ color:'#86868b' }}>· tipo principal refinanciación</span>
 </span>
 <span style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ width:14, height:2, background:'#7C3AED' }}/>
 <strong style={{ color:'#3a3a3d' }}>DFR</strong>
 <span style={{ color:'#86868b' }}>· tipo depósito</span>
 </span>
 </div>
 </div>
  )
}

/** EURIBOR 12M + 6M + bono 10Y España. */
function EuriborChart({ points }: { points: Array<{ t: string; euribor_12m: number | null; euribor_6m: number | null; bond_10y: number | null }> }) {
  const valid = points.filter(p => p.euribor_12m != null || p.euribor_6m != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 520, H = 200, P = 30
  const allValues = valid.flatMap(p => [p.euribor_12m, p.euribor_6m, p.bond_10y].filter((v): v is number => v != null))
  const maxY = Math.max(...allValues) * 1.1
  const minY = Math.max(-1, Math.min(...allValues) * 0.9)
  const range = maxY - minY || 1

  const path = (key: 'euribor_12m' | 'euribor_6m' | 'bond_10y') => valid.map((p, i) => {
    const v = p[key]
    if (v == null) return null
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - (v - minY) / range) * (H - 2 * P)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).filter(Boolean).map((s, i) => `${i === 0 ? 'M' : 'L'}${s}`).join(' ')

  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
 <path d={path('bond_10y')} fill="none" stroke="#DC2626" strokeWidth={2}/>
 <path d={path('euribor_12m')} fill="none" stroke="#FCD34D" strokeWidth={2.5}/>
 <path d={path('euribor_6m')} fill="none" stroke="#0EA5E9" strokeWidth={2}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return (
 <g key={`hover-${p.t}`}>
              {p.euribor_12m != null && (
 <circle cx={x} cy={P + (1 - (p.euribor_12m - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>EURIBOR 12M · {p.t.slice(0,7)}: {p.euribor_12m.toFixed(3)}%</title>
 </circle>
              )}
              {p.euribor_6m != null && (
 <circle cx={x} cy={P + (1 - (p.euribor_6m - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>EURIBOR 6M · {p.t.slice(0,7)}: {p.euribor_6m.toFixed(3)}%</title>
 </circle>
              )}
              {p.bond_10y != null && (
 <circle cx={x} cy={P + (1 - (p.bond_10y - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>Bono 10Y ESP · {p.t.slice(0,7)}: {p.bond_10y.toFixed(3)}%</title>
 </circle>
              )}
 </g>
          )
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t.slice(0, 7)}</text>
        })}
 <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(1)}%</text>
 <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(1)}%</text>
 </svg>
 <div style={{ display:'flex', gap:14, fontSize:11, marginTop:6, flexWrap:'wrap' }}>
 <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:2, background:'#FCD34D' }}/><strong style={{ color:'#3a3a3d' }}>EURIBOR 12M</strong></span>
 <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:2, background:'#0EA5E9' }}/><strong style={{ color:'#3a3a3d' }}>EURIBOR 6M</strong></span>
 <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:2, background:'#DC2626' }}/><strong style={{ color:'#3a3a3d' }}>Bono 10Y España</strong></span>
 </div>
 </div>
  )
}

function CreditoChart({ series }: { series: CreditoResp }) {
  const valid = series.serie_credito_pib.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 460, H = 220, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.05
  const minY = Math.min(...values) * 0.95
  const range = maxY - minY || 1

  const path = valid.map((p, i) => {
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.v as number) - minY) / range) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Pico crisis 2008
  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
 <path d={path} fill="none" stroke={ACCENT} strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.v as number) - minY) / range) * (H - 2 * P)
          return <circle key={p.t} cx={x} cy={y} r={2.5} fill={ACCENT}><title>{p.t}: {(p.v as number).toFixed(1)}%</title></circle>
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
 <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(0)}%</text>
 <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(0)}%</text>
 </svg>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:6 }}>
 <span style={{ color:'#86868b' }}>Mínimo: <strong style={{ color:'#1d1d1f' }}>{Math.min(...values).toFixed(1)}%</strong> en {valid.find(p => p.v === Math.min(...values))?.t}</span>
 <span style={{ color:'#86868b' }}>Máximo: <strong style={{ color:'#1d1d1f' }}>{Math.max(...values).toFixed(1)}%</strong> en {valid.find(p => p.v === Math.max(...values))?.t}</span>
 </div>
 </div>
  )
}

function NplChart({ points }: { points: Array<{ t: string; v: number | null }> }) {
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 460, H = 200, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.1
  const minY = 0

  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const v = p.v as number
          const h = ((v - minY) / (maxY - minY)) * (H - 2 * P)
          const w = (W - 2 * P) / valid.length - 4
          return <rect key={p.t} x={x - w / 2} y={H - P - h} width={w} height={h} fill="#DC2626" rx={2}>
 <title>{p.t}: {v.toFixed(2)}%</title>
 </rect>
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
 <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(1)}%</text>
 </svg>
 <div style={{ fontSize:11, marginTop:6, color:'#86868b' }}>
        Pico post-crisis 2014: <strong style={{ color:'#DC2626' }}>{Math.max(...values).toFixed(1)}%</strong>
        · Última lectura: <strong style={{ color:'#16A34A' }}>{values[values.length - 1]?.toFixed(2)}%</strong>
 </div>
 </div>
  )
}

function CapitalChart({ points }: { points: Array<{ t: string; v: number | null }> }) {
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 460, H = 200, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.1
  const minY = Math.min(...values) * 0.9

  const path = valid.map((p, i) => {
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.v as number) - minY) / (maxY - minY)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
 <path d={path} fill="none" stroke="#16A34A" strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.v as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return <circle key={p.t} cx={x} cy={y} r={3} fill="#16A34A"><title>{p.t}: {(p.v as number).toFixed(2)}%</title></circle>
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
 <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(1)}%</text>
 </svg>
 <div style={{ fontSize:11, marginTop:6, color:'#86868b' }}>
        Tendencia post-Basel III: ratio crece de {values[0]?.toFixed(1)}% a {values[values.length - 1]?.toFixed(1)}%
 </div>
 </div>
  )
}

function ComparativaTable({ items }: { items: ComparativaResp['items'] }) {
  const maxCredito = Math.max(...items.map(i => i.credito_pib ?? 0))
  return (
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
 <thead>
 <tr style={{ borderBottom:'1px solid #ECECEF' }}>
 <Th>País</Th>
 <Th align="right">Crédito % PIB</Th>
 <Th align="right">NPL %</Th>
 <Th>Distribución crédito</Th>
 </tr>
 </thead>
 <tbody>
        {items.map(it => {
          const credito = it.credito_pib ?? 0
          return (
 <tr key={it.iso3} style={{
              borderBottom:'1px solid #F5F5F7',
              background: it.destacado ? '#FCD34D20' : 'transparent',
            }}>
 <Td>
 <strong style={{
                  color: it.destacado ? '#92400E' : '#1d1d1f',
                  fontWeight: it.destacado ? 800 : 600,
                }}>{it.pais}</strong>
 <span style={{ fontSize:9.5, color:'#86868b', fontFamily:'monospace', marginLeft:6 }}>{it.iso3}</span>
 </Td>
 <Td align="right">
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1F4E8C' }}>
                  {credito.toFixed(1)}%
 </span>
 </Td>
 <Td align="right">
                {it.npl_pct != null ? (
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: it.npl_pct < 3 ? '#16A34A' : it.npl_pct < 6 ? '#F97316' : '#DC2626' }}>
                    {it.npl_pct.toFixed(2)}%
 </span>
                ) : <span style={{ color:'#86868b' }}>—</span>}
 </Td>
 <Td>
 <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${(credito / maxCredito) * 100}%`, height:'100%', background: it.destacado ? '#92400E' : '#1F4E8C' }}/>
 </div>
 </Td>
 </tr>
          )
        })}
 </tbody>
 </table>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, padding:'8px 6px', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>{children}</th>
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align, padding:'8px 6px', verticalAlign:'middle' }}>{children}</td>
}
