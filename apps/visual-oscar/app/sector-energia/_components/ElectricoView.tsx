'use client'
/**
 * <ElectricoView /> · Sprint Energía S1
 *
 * Vista "Eléctrico" del nuevo EnergiaShell. Contiene TODO el contenido que
 * antes vivía directamente en `app/sector-energia/page.tsx` (766 líneas),
 * movido aquí SIN cambios funcionales (move + wrap):
 *
 *   - Hero con 4 KPIs en vivo (demanda, mix renovable, PVPC, emisiones)
 *   - <EsiosTabsSection /> · 9 sub-tabs ESIOS en directo (INTACTO)
 *   - NasdaqMacroSnapshot · commodities globales
 *   - EmberSpainElectricity · contexto histórico
 *   - EntsoeSpainPanel · datos UE TSO
 *   - 6 paneles REE (mix, precio, demanda, intercambios, balance, emisiones)
 *   - Empresas líderes + reguladores + licitaciones del sector
 *   - Áreas estratégicas + SectorIntelPanel + CuadernoEntityWidget
 *
 * Datos en vivo desde apidatos.ree.es (Red Eléctrica de España). Auto-refresh
 * cada 5 min (cache CDN 10 min). NO se ha tocado la lógica de fetch ni estados.
 *
 * NOTA · el <AppHeader /> y el contenedor <main>/<div> de página los aporta
 * ahora EnergiaShell; esta vista renderiza solo el contenido (fragmento).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { REGULADORES_ENERGIA } from '@/lib/sources/ree'
import { Panel } from '@/components/SectorPanel'
import { CompanyQuotePanel } from './shared/CompanyQuotePanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { EmberSpainElectricity } from '@/components/energy/EmberSpainElectricity'
import { EntsoeSpainPanel } from '@/components/energy/EntsoeSpainPanel'
// Contexto europeo · FUENTE PRIMARIA energy-charts.info (keyless · Fraunhofer ISE)
import { EuPowerContextPanel } from './EuPowerContextPanel'
// Sprint Energía S3 · contexto europeo ENTSO-E (fuente ADICIONAL · requiere token)
import { EntsoeEuContextPanel } from './EntsoeEuContextPanel'
import { EsiosTabsSection } from '@/components/energy/EsiosTabsSection'
import { NasdaqMacroSnapshot } from '@/components/macro/NasdaqMacroSnapshot'
// Sprint Cuaderno N2-wire · notas que mencionan al sector energía (registry slug 'energia')
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import Glosa from '@/components/Glosa'

// ─── Tipos de respuesta ──────────────────────────────────
interface ResumenResp {
  kpis: {
    demanda_actual_mw: number | null
    demanda_datetime: string | null
    mix_renovable_pct: number | null
    precio_pvpc_eur: number | null
    precio_spot_eur: number | null
    emisiones_co2_g: number | null
  }
  sources: Record<string, { ok: boolean; error?: string }>
  fetch_ms: number
}
interface MixResp {
  items: Array<{ tecnologia: string; color?: string; bucket?: 'Renovable' | 'No-Renovable'; total_mwh: number; pct: number }>
  total_mwh: number
  total_oficial_mwh?: number
  renovable_mwh?: number
  no_renovable_mwh?: number
  renovable_pct?: number
  no_renovable_pct?: number
}
interface PrecioResp {
  series: Array<{
    title: string; color?: string; last_value?: number; last_datetime?: string
    avg: number; max: number; min: number
    points: Array<{ t: string; v: number }>
  }>
}
interface DemandaResp {
  series: Array<{
    title: string; color?: string; last_value?: number
    avg: number; max: number
    points: Array<{ t: string; v: number }>
  }>
}
interface IntercambiosResp {
  series: Array<{ title: string; color?: string; saldo_total_mwh: number; last_value?: number }>
}
interface BalanceResp {
  balance: Array<{ title: string; color?: string; total_gwh: number; points: Array<{ t: string; v: number }> }>
  demanda: Array<{ title: string; points: Array<{ t: string; v: number }> }>
}
interface EmisionesResp {
  series: Array<{ title: string; color?: string; last_value?: number; avg: number; points: Array<{ t: string; v: number }> }>
}

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0d4626'
const REFRESH_MS = 5 * 60 * 1000

// ─── Helpers REE: URLs públicas a categoría ───────────────
// Enlazamos a la página de CATEGORÍA (generacion, demanda, mercados,
// intercambios, balance) en lugar de la sub-sección específica del
// dataset, para una navegación más natural en el visor REE.
const REE_PUBLIC = 'https://www.ree.es/es/datos'
function reeUrl(categoria: 'generacion' | 'demanda' | 'mercados' | 'intercambios' | 'balance'): string {
  return `${REE_PUBLIC}/${categoria}`
}

export function ElectricoView() {
  const [resumen,    setResumen]    = useState<ResumenResp | null>(null)
  const [mix,        setMix]        = useState<MixResp | null>(null)
  const [precio,     setPrecio]     = useState<PrecioResp | null>(null)
  const [demanda,    setDemanda]    = useState<DemandaResp | null>(null)
  const [intercambios, setIntercambios] = useState<IntercambiosResp | null>(null)
  const [balance,    setBalance]    = useState<BalanceResp | null>(null)
  const [emisiones,  setEmisiones]  = useState<EmisionesResp | null>(null)
  const [updatedAt,  setUpdatedAt]  = useState<Date | null>(null)
  const [loading,    setLoading]    = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, m, p, d, i, b, e] = await Promise.all([
      fetch('/api/sectores/energia/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/mix?days=7').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/precio?days=2').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/demanda?days=2').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/intercambios?days=14').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/balance?months=12').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/energia/emisiones?days=14').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setMix(m); setPrecio(p); setDemanda(d)
    setIntercambios(i); setBalance(b); setEmisiones(e)
    setUpdatedAt(new Date()); setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  return (
 <>
      {/* ───── HERO con KPIs en vivo ───── */}
 <section style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
        borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
        display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, alignItems:'center',
      }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.8, textTransform:'uppercase', margin:'0 0 8px' }}>
            {/* Sprint Q-C.5 · "Utilities" anglicismo · "Suministros" es el equivalente ES estándar. */}
            SECTORIAL · ENERGÍA Y SUMINISTROS · DATOS REE EN VIVO
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 10px', lineHeight:1.05 }}>
            Sistema eléctrico español <em style={{ fontWeight:300, fontStyle:'italic', opacity:0.75 }}>en tiempo real</em>
 </h1>
 <p style={{ fontSize:13.5, opacity:0.8, margin:0, lineHeight:1.5 }}>
            Demanda · mix de generación · precios mayoristas · balance mensual · intercambios internacionales · emisiones CO2.
            Datos oficiales de Red Eléctrica de España actualizados cada 5 minutos.
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
 <HeroKPI label="Demanda peninsular" value={resumen?.kpis.demanda_actual_mw} unit="MW" accent="#86EFAC"
            sub={resumen?.kpis.demanda_datetime ? new Date(resumen.kpis.demanda_datetime).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : ''}/>
 <HeroKPI label="Mix renovable" value={resumen?.kpis.mix_renovable_pct} unit="%" accent="#7DD3FC"/>
 {/* Sprint Quality-Q-B.4 · PVPC nunca se explicaba al usuario (auditoría P0).
                        Ahora hover sobre la etiqueta abre tooltip con definición
                        (tarifa regulada para hogares ≤10 kW · publicada por REE). */}
 <HeroKPI label="PVPC · tarifa regulada hogar" glosaTerm="PVPC" value={resumen?.kpis.precio_pvpc_eur} unit="€/MWh" accent="#FCD34D"/>
 <HeroKPI label="Emisiones" value={resumen?.kpis.emisiones_co2_g} unit="g/kWh" accent="#FCA5A5"/>
 </div>
 </section>

      {/* ───── ESIOS · Sistema eléctrico español · 9 sub-tabs en directo ─────
          Sprint ESIOS-DEEP S6 · sección consolidada con 9 vistas (pulso,
          precios PVPC heatmap, mix 10 tech + emisiones, demanda real vs
          prevista + 5 sistemas, intercambios mapa Iberia, predicciones D+1,
          mercado de regulación B2B, sistemas no peninsulares, drill-down
          explorer con export CSV). Estado tab en URL (?esios=...).
          Cero deps · todo SVG inline. Si ESIOS_API_KEY no configurada en
          Vercel env vars → empty state honesto en cada vista. */}
      <EsiosTabsSection />

      {/* ───── Commodities globales · OPEC oil + LBMA gold + US 10Y ─────
          Sprint Nasdaq-Wire · contexto global de precios energéticos y
          tipos largos que afectan al sector. Datos oficiales LBMA/OPEC/FRED
          via /api/nasdaq/snapshot. Si NASDAQ_DATA_LINK_KEY no está
          configurada, muestra empty state honesto. */}
      <div style={{ marginBottom: 14 }}>
        <NasdaqMacroSnapshot
          variant="dashboard"
          subset={['opec_oil', 'gold_lbma_am', 'fred_us_10y_yield']}
        />
      </div>

      {/* ───── Ember Energy · contexto histórico y comparado ───── */}
      <div style={{ marginBottom: 14 }}>
        <EmberSpainElectricity />
      </div>

      {/* ───── ENTSO-E · datos UE oficiales TSO ───── */}
      <div style={{ marginBottom: 14 }}>
        <EntsoeSpainPanel />
      </div>

      {/* ───── Contexto europeo · FUENTE PRIMARIA energy-charts.info ─────
          Precios day-ahead comparados (ES/FR/DE-LU/PT/IT-North) + mix de
          generación ES + flujos cross-border, con datos REALES y SIN token vía
          energy-charts.info (Fraunhofer ISE · CC-BY). Caché 1h + fetches
          secuenciales (anti-429). Sustituye al panel ENTSO-E como fuente
          principal del contexto europeo. */}
      <div style={{ marginBottom: 14 }}>
        <EuPowerContextPanel />
      </div>

      {/* ───── Contexto europeo · ENTSO-E (FUENTE ADICIONAL) ─────
          Sprint Energía S3 · datos oficiales de todos los TSOs UE. Requiere el
          Web API Security Token (ENTSOE_SECURITY_TOKEN); mientras no esté
          configurado, degrada a empty-state. Complementa (no sustituye) al
          panel energy-charts de arriba. */}
      <div style={{ marginBottom: 14 }}>
        <EntsoeEuContextPanel />
      </div>

      {/* ───── ROW 1: Mix de generación + Precio mercado ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel
          title="Mix de generación · últimos 7 días"
          subtitle={mix
            ? `${(mix.total_mwh / 1_000_000).toFixed(2)} TWh · ${mix.renovable_pct ?? 0}% renovable · ${mix.items.length} tecnologías`
            : 'Cargando…'
          }
          sourceUrl={reeUrl('generacion')}
          sourceTooltip="Abrir visor REE · Generación"
        >
          {mix && <MixDonut items={mix.items} renovablePct={mix.renovable_pct} totalTwh={mix.total_mwh / 1_000_000}/>}
 </Panel>
 <Panel
          title="Precio del mercado eléctrico · últimas 24-48 h"
          subtitle="PVPC vs Mercado SPOT"
          sourceUrl={reeUrl('mercados')}
          sourceTooltip="Abrir visor REE · Mercados"
        >
          {precio && <PriceLineChart series={precio.series}/>}
 </Panel>
 </div>

      {/* ───── ROW 2: Demanda peninsular + Intercambios internacionales ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
 <Panel
          title="Demanda peninsular · real vs prevista"
          subtitle={demanda?.series[0]?.last_value ? `${demanda.series[0].last_value.toLocaleString('es-ES')} MW ahora · pico ${demanda.series[0].max.toLocaleString('es-ES')} MW` : 'Cargando…'}
          sourceUrl={reeUrl('demanda')}
          sourceTooltip="Abrir visor REE · Demanda"
        >
          {demanda && <DemandLineChart series={demanda.series}/>}
 </Panel>
 <Panel
          title="Intercambios internacionales · 14 días"
          subtitle="Saldo (importación + / exportación −)"
          sourceUrl={reeUrl('intercambios')}
          sourceTooltip="Abrir visor REE · Intercambios"
        >
          {intercambios && <IntercambiosBar series={intercambios.series}/>}
 </Panel>
 </div>

      {/* ───── ROW 3: Balance mensual ───── */}
 <Panel
        title="Balance eléctrico mensual · últimos 12 meses"
        subtitle="Generación renovable vs no renovable · GWh"
        marginBottom
        sourceUrl={reeUrl('balance')}
        sourceTooltip="Abrir visor REE · Balance"
      >
        {balance && <BalanceStacked balance={balance.balance}/>}
 </Panel>

      {/* ───── ROW 4: Emisiones CO2 + Top empresas (primitiva compartida) ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
 <Panel
          title="Emisiones CO2 · últimos 14 días"
          subtitle="g CO2 / kWh por tecnología no renovable"
          sourceUrl={reeUrl('generacion')}
          sourceTooltip="Abrir visor REE · Generación"
        >
          {emisiones && <EmisionesList series={emisiones.series}/>}
 </Panel>
 <CompanyQuotePanel
          energias={['electrico']}
          title="Empresas líderes del sector"
          subtitle="Eléctricas e integradas del catálogo · cotización en vivo"
        />
 </div>

      {/* ───── ROW 5: Reguladores + Licitaciones del sector ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Reguladores y operadores" subtitle="Marco institucional del sector">
 <RegLista/>
 </Panel>
 <Panel title="Licitaciones del sector" subtitle="CPV 09 · Combustibles, electricidad, energía">
 <LicitacionesShortcut/>
 </Panel>
 </div>

      {/* ───── ROW 6: Áreas temáticas ───── */}
 <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
 <AreasTematicas/>
 </Panel>

      {/* Politeia intel · commodities energía (Brent, TTF, Henry Hub, carbón) · compact */}
      <SectorIntelPanel
        sector="energia"
        compact
        detailHref="/commodities?category=energy"
        detailLabel="Ver futuros · Vesper →"
      />

      {loading && (
 <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>
          Cargando datos REE…
 </div>
      )}

      {/* Sprint Cuaderno N2-wire · widget que muestra notas del Cuaderno mencionando "Energía" */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
 </>
  )
}

export default ElectricoView

// ─── Componentes de visualización ──────────────────────────

/**
 * HeroKPI · KPI estrella del hero del sector.
 *
 * Sprint Quality-Q-B.4 · `label` ahora acepta ReactNode para poder embeber
 * <Glosa term="PVPC" />. Opcionalmente se puede pasar `glosaTerm` como
 * shortcut y el componente envuelve el label automáticamente.
 */
function HeroKPI({
  label,
  value,
  unit,
  accent,
  sub,
  glosaTerm,
}: {
  label: React.ReactNode
  value: number | null | undefined
  unit: string
  accent: string
  sub?: string
  /** Si se pasa, el label se envuelve en <Glosa> para tooltip-on-hover. */
  glosaTerm?: string
}) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: 2 })
  const labelNode = glosaTerm ? <Glosa term={glosaTerm} variant="kpi">{label}</Glosa> : label
  return (
 <div style={{
      background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
      borderRadius:12, padding:'12px 14px',
    }}>
 <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.72, marginBottom:4 }}>
        {labelNode}
 </div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color: accent }}>
        {display}<span style={{ fontSize:11, fontWeight:600, marginLeft:5, opacity:0.85 }}>{unit}</span>
 </div>
      {sub && <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{sub}</div>}
 </div>
  )
}

// Donut chart con bucket Renovable / No-Renovable y orden por bucket
function MixDonut({ items, renovablePct, totalTwh }: {
  items: Array<{ tecnologia: string; color?: string; bucket?: 'Renovable' | 'No-Renovable'; total_mwh: number; pct: number }>
  renovablePct?: number
  totalTwh?: number
}) {
  const radius = 70
  const stroke = 20
  const circ = 2 * Math.PI * radius
  // Ordenar Renovable primero · luego por % desc dentro de cada bucket
  const sorted = [...items].sort((a, b) => {
    if (a.bucket !== b.bucket) return (a.bucket === 'Renovable' ? -1 : 1)
    return b.pct - a.pct
  })
  let acum = 0
  const renovItems = sorted.filter(i => i.bucket === 'Renovable')
  const noRenovItems = sorted.filter(i => i.bucket === 'No-Renovable')
  return (
 <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:18, alignItems:'center' }}>
 <svg width={radius * 2 + stroke} height={radius * 2 + stroke} viewBox={`0 0 ${radius * 2 + stroke} ${radius * 2 + stroke}`}>
 <g transform={`translate(${radius + stroke / 2},${radius + stroke / 2}) rotate(-90)`}>
          {sorted.map((it) => {
            const len = (it.pct / 100) * circ
            const offset = -acum
            acum += len
            return (
 <circle
                key={it.tecnologia}
                r={radius} fill="none"
                stroke={it.color || '#9CA3AF'}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={offset}
                style={{ cursor:'pointer' }}
              >
 <title>{it.tecnologia} ({it.bucket || 'Otro'}): {it.pct.toFixed(2)}% · {it.total_mwh.toLocaleString('es-ES')} MWh</title>
 </circle>
            )
          })}
 </g>
 <text x="50%" y="44%" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, fill:'#1d1d1f' }}>
          {(totalTwh ?? items.reduce((a, i) => a + i.total_mwh, 0) / 1_000_000).toFixed(2)}
 </text>
 <text x="50%" y="52%" textAnchor="middle" style={{ fontSize:10, fill:'#6e6e73', fontWeight:600 }}>TWh · 7 días</text>
        {renovablePct != null && (
 <text x="50%" y="64%" textAnchor="middle" style={{ fontSize:11, fill:'#16A34A', fontWeight:700, fontFamily:'var(--font-display)' }}>
            {renovablePct.toFixed(1)}% renovable
 </text>
        )}
 </svg>
 <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:10.5 }}>
        {renovItems.length > 0 && (
 <>
 <li style={{ marginBottom:4 }}>
 <strong style={{ color:'#16A34A', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:800 }}>
                Renovables · {renovItems.reduce((s, i) => s + i.pct, 0).toFixed(1)}%
 </strong>
 </li>
            {renovItems.map(it => (
 <li key={it.tecnologia} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
 <span style={{ width:8, height:8, borderRadius:2, background: it.color || '#9CA3AF', flexShrink:0 }}/>
 <span style={{ flex:1, color:'#3a3a3d', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.tecnologia}</span>
 <span style={{ color:'#16A34A', fontWeight:700, fontFamily:'var(--font-display)' }}>{it.pct.toFixed(1)}%</span>
 </li>
            ))}
 </>
        )}
        {noRenovItems.length > 0 && (
 <>
 <li style={{ margin:'8px 0 4px' }}>
 <strong style={{ color:'#DC2626', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:800 }}>
                No renovables · {noRenovItems.reduce((s, i) => s + i.pct, 0).toFixed(1)}%
 </strong>
 </li>
            {noRenovItems.map(it => (
 <li key={it.tecnologia} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
 <span style={{ width:8, height:8, borderRadius:2, background: it.color || '#9CA3AF', flexShrink:0 }}/>
 <span style={{ flex:1, color:'#3a3a3d', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.tecnologia}</span>
 <span style={{ color:'#525258', fontWeight:700, fontFamily:'var(--font-display)' }}>{it.pct.toFixed(1)}%</span>
 </li>
            ))}
 </>
        )}
 </ul>
 </div>
  )
}

// Line chart simple para precios (PVPC vs SPOT)
function PriceLineChart({ series }: { series: Array<{ title: string; color?: string; points: Array<{ t: string; v: number }>; last_value?: number; avg: number; max: number; min: number }> }) {
  const allValues = series.flatMap(s => s.points.map(p => p.v))
  if (!allValues.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos disponibles</div>
  const max = Math.max(...allValues)
  const min = Math.min(...allValues)
  const range = max - min || 1
  const W = 520, H = 160, P = 8
  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1}/>
        ))}
        {series.slice(0, 3).map(s => {
          if (!s.points.length) return null
          const path = s.points.map((p, i) => {
            const x = P + (i / (s.points.length - 1)) * (W - 2 * P)
            const y = P + (1 - (p.v - min) / range) * (H - 2 * P)
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          }).join(' ')
          return <path key={s.title} d={path} fill="none" stroke={s.color || '#1F4E8C'} strokeWidth={2}/>
        })}
        {series.slice(0, 3).map(s => s.points.map((p, i) => {
          const x = P + (i / (s.points.length - 1)) * (W - 2 * P)
          const y = P + (1 - (p.v - min) / range) * (H - 2 * P)
          return (
 <circle key={`${s.title}-${i}`} cx={x} cy={y} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>{s.title} · {p.t}: {p.v.toFixed(2)} €/MWh</title>
 </circle>
          )
        }))}
 </svg>
 <ul style={{ listStyle:'none', margin:'10px 0 0', padding:0, display:'flex', gap:14, flexWrap:'wrap' }}>
        {series.slice(0, 3).map(s => (
 <li key={s.title} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
 <span style={{ width:8, height:8, borderRadius:2, background: s.color || '#1F4E8C' }}/>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{s.title}</span>
 <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>{s.last_value?.toFixed(2) ?? '—'} €/MWh</span>
 <span style={{ color:'#86868b' }}>· media {s.avg.toFixed(0)}</span>
 </li>
        ))}
 </ul>
 </div>
  )
}

// Línea de demanda peninsular (puede haber 2 series: real, prevista, programada)
function DemandLineChart({ series }: { series: Array<{ title: string; color?: string; points: Array<{ t: string; v: number }>; avg: number; max: number; last_value?: number }> }) {
  const allValues = series.flatMap(s => s.points.map(p => p.v))
  if (!allValues.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos disponibles</div>
  const max = Math.max(...allValues)
  const min = Math.min(...allValues) * 0.95
  const range = max - min || 1
  const W = 700, H = 200, P = 10
  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
 <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1}/>
        ))}
        {series.slice(0, 3).map(s => {
          if (!s.points.length) return null
          const path = s.points.map((p, i) => {
            const x = P + (i / (s.points.length - 1)) * (W - 2 * P)
            const y = P + (1 - (p.v - min) / range) * (H - 2 * P)
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          }).join(' ')
          const dasharray = /prog|prev/i.test(s.title) ? '4 3' : 'none'
          return <path key={s.title} d={path} fill="none" stroke={s.color || '#1F4E8C'} strokeWidth={2} strokeDasharray={dasharray}/>
        })}
        {series.slice(0, 3).map(s => s.points.map((p, i) => {
          const x = P + (i / (s.points.length - 1)) * (W - 2 * P)
          const y = P + (1 - (p.v - min) / range) * (H - 2 * P)
          return (
 <circle key={`${s.title}-${i}`} cx={x} cy={y} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
 <title>{s.title} · {p.t}: {p.v.toLocaleString('es-ES')} MW</title>
 </circle>
          )
        }))}
 </svg>
 <ul style={{ listStyle:'none', margin:'10px 0 0', padding:0, display:'flex', gap:14, flexWrap:'wrap' }}>
        {series.slice(0, 3).map(s => (
 <li key={s.title} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
 <span style={{ width:14, height:2, background: s.color || '#1F4E8C' }}/>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{s.title}</span>
 <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>
              {s.last_value?.toLocaleString('es-ES') ?? '—'} MW
 </span>
 </li>
        ))}
 </ul>
 </div>
  )
}

function IntercambiosBar({ series }: { series: Array<{ title: string; color?: string; saldo_total_mwh: number }> }) {
  const max = Math.max(1, ...series.map(s => Math.abs(s.saldo_total_mwh)))
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:10 }}>
      {series.map(s => {
        const positive = s.saldo_total_mwh >= 0
        return (
 <li key={s.title} title={`${s.title}: ${(s.saldo_total_mwh / 1000).toFixed(2)} GWh ${positive ? '(importación)' : '(exportación)'}`} style={{ cursor:'help' }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:3 }}>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{s.title}</span>
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: positive ? '#16A34A' : '#DC2626' }}>
                {(s.saldo_total_mwh / 1000).toFixed(1)} GWh
 </span>
 </div>
 <div style={{ display:'flex', alignItems:'center' }}>
 <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', display:'flex' }}>
 <div style={{
                  marginLeft: positive ? '50%' : `${50 - (Math.abs(s.saldo_total_mwh) / max) * 50}%`,
                  width: `${(Math.abs(s.saldo_total_mwh) / max) * 50}%`,
                  height:'100%',
                  background: positive ? '#16A34A' : '#DC2626',
                }}/>
 </div>
 </div>
 </li>
        )
      })}
 </ul>
  )
}

function BalanceStacked({ balance }: { balance: Array<{ title: string; color?: string; total_gwh: number; points: Array<{ t: string; v: number }> }> }) {
  if (!balance.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>

  // Agrupar por fecha t y tecnología
  const meses = Array.from(new Set(balance.flatMap(s => s.points.map(p => p.t)))).sort()
  const W = 1100, H = 220, P = 14
  const colW = (W - 2 * P) / Math.max(1, meses.length)

  // Total por mes para apilar
  const totalsPorMes: Record<string, number> = {}
  for (const m of meses) {
    totalsPorMes[m] = balance.reduce((acc, s) => acc + (s.points.find(p => p.t === m)?.v || 0), 0)
  }
  const maxTotal = Math.max(1, ...Object.values(totalsPorMes))

  return (
 <div>
 <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display:'block' }}>
        {meses.map((m, i) => {
          let acumY = H - P
          return (
 <g key={m}>
              {balance.map(s => {
                const v = s.points.find(p => p.t === m)?.v || 0
                if (v <= 0) return null
                const h = (v / maxTotal) * (H - 2 * P)
                acumY -= h
                return (
 <rect key={s.title}
                    x={P + i * colW + 2}
                    y={acumY}
                    width={colW - 4}
                    height={h}
                    fill={s.color || '#9CA3AF'}>
 <title>{s.title}: {v.toLocaleString('es-ES')} GWh</title>
 </rect>
                )
              })}
 <text x={P + i * colW + colW / 2} y={H + 14} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>
                {m.slice(2)}
 </text>
 </g>
          )
        })}
 </svg>
 <ul style={{ listStyle:'none', margin:'10px 0 0', padding:0, display:'flex', gap:12, flexWrap:'wrap' }}>
        {balance.slice(0, 10).map(s => (
 <li key={s.title} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10.5 }}>
 <span style={{ width:8, height:8, borderRadius:2, background: s.color || '#9CA3AF' }}/>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{s.title}</span>
 <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>{(s.total_gwh / 1000).toFixed(1)} TWh</span>
 </li>
        ))}
 </ul>
 </div>
  )
}

function EmisionesList({ series }: { series: Array<{ title: string; color?: string; last_value?: number; avg: number }> }) {
  const max = Math.max(1, ...series.map(s => Math.abs(s.avg)))
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:9 }}>
      {series.slice(0, 8).map(s => (
 <li key={s.title} title={`${s.title}: ${s.avg.toFixed(1)} g CO2/kWh emisiones medias · último ${s.last_value?.toFixed(1) ?? '—'} g/kWh`} style={{ cursor:'help' }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:3 }}>
 <span style={{ color:'#3a3a3d', fontWeight:600 }}>{s.title}</span>
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#DC2626' }}>{s.avg.toFixed(0)} g/kWh</span>
 </div>
 <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${(Math.abs(s.avg) / max) * 100}%`, height:'100%', background: s.color || '#DC2626' }}/>
 </div>
 </li>
      ))}
 </ul>
  )
}

// EmpresasGrid (legacy · lib/sources/ree) → ahora vía
// <CompanyQuotePanel energias={['electrico']} /> (shared · catálogo + cotización).

function RegLista() {
  return (
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {REGULADORES_ENERGIA.map(r => (
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
  const [items, setItems] = useState<Array<{ id: string; objeto: string; organo: string; importe?: number; fecha_publicacion?: string; url?: string }>>([])
  useEffect(() => {
    fetch('/api/licitaciones/buscar?cpv_div=09&page_size=5&sort=date_desc')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setCount(d.pagination?.total_estimado ?? d.stats?.total ?? 0)
        setItems((d.items || []).slice(0, 5).map((it: { id: string; objeto: string; organo: string; importe_adjudicacion?: number; importe_licitacion?: number; fecha_publicacion?: string; url?: string }) => ({
          id: it.id, objeto: it.objeto, organo: it.organo,
          importe: it.importe_adjudicacion ?? it.importe_licitacion,
          fecha_publicacion: it.fecha_publicacion, url: it.url,
        })))
      })
  }, [])
  return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
 <span style={{ fontSize:11, color:'#6e6e73' }}>Últimos contratos publicados</span>
 <Link href="/licitaciones?cpv_div=09" style={{ fontSize:11, color:'#1F4E8C', textDecoration:'none', fontWeight:600 }}>
          Ver buscador {count != null && `· ${count.toLocaleString('es-ES')} en total ›`}
 </Link>
 </div>
 <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
        {items.length === 0 && <li style={{ fontSize:11, color:'#86868b' }}>Cargando…</li>}
        {items.map(it => (
 <li key={it.id} style={{ padding:'8px 10px', background:'#FAFAFA', borderRadius:8, border:'1px solid #ECECEF' }}>
 <a href={it.url || '#'} target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'none' }}>
 <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600, lineHeight:1.4 }}>
                {it.objeto.length > 90 ? it.objeto.slice(0, 89) + '…' : it.objeto}
 </div>
 <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10.5 }}>
 <span style={{ color:'#86868b' }}>{it.organo}</span>
                {it.importe ? (
 <span style={{ fontFamily:'var(--font-display)', color:'#1F4E8C', fontWeight:700 }}>
                    {(it.importe / 1_000_000).toFixed(2)}M €
 </span>
                ) : <span style={{ color:'#86868b' }}>{it.fecha_publicacion}</span>}
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
    { titulo: 'Transición energética', desc: 'PNIEC 2023-2030 · descarbonización · Fondos Next Generation', color:'#16A34A' },
    { titulo: 'Renovables y autoconsumo', desc: 'Fotovoltaica · eólica · solar térmica · comunidades energéticas', color:'#0EA5E9' },
    { titulo: 'Mercados mayoristas', desc: 'OMIE · MIBEL · spot · contrato bilateral · futuros', color:'#7C3AED' },
    { titulo: 'Hidrógeno y gas renovable', desc: 'Estrategia H2 verde · biometano · refinerías → gigafactorías', color:'#F97316' },
    { titulo: 'Almacenamiento energético', desc: 'Bombeo hidráulico · baterías Li-ion · CAES · estrategia 2030', color:'#5B21B6' },
    { titulo: 'Tarifas y consumidor', desc: 'PVPC · CNMC · pobreza energética · tarifa 2.0TD · bono social', color:'#DC2626' },
    { titulo: 'Redes y operación', desc: 'REE · OS · congestiones · interconexión Francia · Pirineos', color:'#1F4E8C' },
    { titulo: 'Gas natural', desc: 'Enagás · GNL Sagunto · Argelia · diversificación post-Rusia', color:'#0F766E' },
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
