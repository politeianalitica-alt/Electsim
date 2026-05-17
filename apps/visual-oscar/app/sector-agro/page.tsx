'use client'
/**
 * Dashboard Sector Agroalimentario & Rural
 *
 * Datos en vivo · World Bank agricultural indicators (8 series):
 *   - NV.AGR.TOTL.ZS · Agricultura % PIB
 *   - AG.PRD.FOOD.XD · Índice producción alimentos (base 2014-16=100)
 *   - AG.PRD.LVSK.XD · Índice producción ganadera
 *   - AG.PRD.CROP.XD · Índice producción cultivos
 *   - AG.YLD.CREL.KG · Rendimiento cereales kg/ha
 *   - AG.LND.IRIG.AG.ZS · Tierra regada %
 *   - AG.LND.AGRI.ZS · Tierra agraria %
 *   - TX.VAL.AGRI.ZS.UN · Exportaciones agrícolas %
 *
 * Auto-refresh 60 min.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_AGRO, REGULADORES_AGRO, AREAS_AGRO, PROGRAMAS_AGRO,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0d4626'
const REFRESH_MS = 60 * 60 * 1000

interface ResumenResp {
  kpis: {
    agro_pib_pct: number | null; agro_pib_year?: number
    food_index: number | null; food_index_year?: number
    livestock_index: number | null; livestock_year?: number
    crop_index: number | null; crop_year?: number
    cereal_yield_kg: number | null; cereal_yield_year?: number
    tierra_regada_pct: number | null; tierra_regada_year?: number
    arable_per_capita: number | null; arable_year?: number
    exportacion_agr_pct: number | null; exportacion_year?: number
  }
  fetch_ms: number
}
interface ProduccionResp {
  points: Array<{ t: string; food: number | null; livestock: number | null; crop: number | null; pib: number | null }>
}
interface ComparativaResp {
  items: Array<{
    iso3: string; pais: string; destacado: boolean
    agro_pib_pct: number | null; food_index: number | null; livestock_index: number | null
    year?: number
  }>
  year: number
}
interface RendimientoResp {
  serie_cereal_yield: Array<{ t: string; v: number | null }>
  serie_tierra_regada: Array<{ t: string; v: number | null }>
  serie_arable_pc: Array<{ t: string; v: number | null }>
  serie_tierra_agraria: Array<{ t: string; v: number | null }>
}
interface ExportacionResp {
  serie_exp_esp: Array<{ t: string; v: number | null }>
  comparativa: Array<{ iso3: string; country: string; value: number | null }>
}

export default function SectorAgroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [produccion, setProduccion] = useState<ProduccionResp | null>(null)
  const [comparativa, setComparativa] = useState<ComparativaResp | null>(null)
  const [rendimiento, setRendimiento] = useState<RendimientoResp | null>(null)
  const [exportacion, setExportacion] = useState<ExportacionResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, p, c, rd, e] = await Promise.all([
      fetch('/api/sectores/agro/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/agro/produccion').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/agro/comparativa').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/agro/rendimiento').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/agro/exportacion').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setProduccion(p); setComparativa(c); setRendimiento(rd); setExportacion(e)
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
          eyebrow="SECTORIAL · AGROALIMENTARIO & RURAL · WORLD BANK + INE"
          title="Sector primario y agroindustria española"
          sub="Producción agraria · ganadera · cultivos · rendimiento cereales · tierra regada · exportaciones · comparativa europea. 10 empresas tractoras (Ebro, Viscofan IBEX, Borges, Deoleo, Cementos Molins, Mercadona, DIA, Coren, Calvo, Damm) y marco regulatorio nacional + UE (MAPA, AICA, AESAN, FEGA, DG AGRI, COAG/ASAJA/UPA)."
          updatedAt={updatedAt} fetchMs={resumen?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
            <HeroKPI label={`Agro % PIB (${resumen?.kpis.agro_pib_year || ''})`}
              value={resumen?.kpis.agro_pib_pct} unit="%" decimals={2} accent="#86EFAC"/>
            <HeroKPI label={`Índice alim. (${resumen?.kpis.food_index_year || ''})`}
              value={resumen?.kpis.food_index} unit="" decimals={1} accent="#FCD34D" sub="Base 2014-16=100"/>
            <HeroKPI label={`Cereales (${resumen?.kpis.cereal_yield_year || ''})`}
              value={resumen?.kpis.cereal_yield_kg} unit="kg/ha" decimals={0} accent="#7DD3FC"/>
            <HeroKPI label={`Exportac. agr. (${resumen?.kpis.exportacion_year || ''})`}
              value={resumen?.kpis.exportacion_agr_pct} unit="% total" decimals={2} accent="#FCA5A5"/>
          </>}
        />

        {/* ROW 1: Producción triple + Cereales */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Producción agraria · 25 años"
            subtitle={produccion ? `Alimentos · Ganadería · Cultivos (base 2014-2016 = 100)` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/AG.PRD.FOOD.XD?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Índice producción alimentos · serie España"
            apiUrl="/api/sectores/agro/produccion">
            {produccion && <ProduccionTripleChart points={produccion.points}/>}
          </Panel>
          <Panel title="Rendimiento cereales · kg/ha"
            subtitle={rendimiento ? `Tendencia productividad · 25 años de serie` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/AG.YLD.CREL.KG?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Cereal yield (kg/ha) · serie España"
            apiUrl="/api/sectores/agro/rendimiento">
            {rendimiento && <CerealChart points={rendimiento.serie_cereal_yield}/>}
          </Panel>
        </div>

        {/* ROW 2: Comparativa europea + Tierra regada */}
        <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Comparativa europea · agro % PIB"
            subtitle={comparativa ? `Año ${comparativa.year} · 10 economías UE+` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/NV.AGR.TOTL.ZS"
            sourceLabel="Banco Mundial"
            sourceTooltip="Agricultura % PIB · comparativa multi-país"
            apiUrl="/api/sectores/agro/comparativa">
            {comparativa && <ComparativaTable items={comparativa.items}/>}
          </Panel>
          <Panel title="Tierra regada · % superficie agraria"
            subtitle={rendimiento ? `Indicador clave gestión hídrica` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/AG.LND.IRIG.AG.ZS?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Tierra regada · % superficie agraria · España"
            apiUrl="/api/sectores/agro/rendimiento">
            {rendimiento && <TierraRegadaChart points={rendimiento.serie_tierra_regada}/>}
          </Panel>
        </div>

        {/* ROW 3: Exportación + Indicadores ganadería */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Exportaciones agrícolas · % total exportaciones"
            subtitle="Banco Mundial · TX.VAL.AGRI.ZS.UN España"
            sourceUrl="https://datos.bancomundial.org/indicador/TX.VAL.AGRI.ZS.UN?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Exportaciones agrícolas · % total · España"
            apiUrl="/api/sectores/agro/exportacion">
            {exportacion && <ExportLineChart points={exportacion.serie_exp_esp}/>}
          </Panel>
          <Panel title="Comparativa exportaciones agro · % total"
            subtitle={exportacion ? `Año ${exportacion.comparativa[0]?.value ? '2024' : '—'} · ranking 10 países` : 'Cargando…'}
            sourceUrl="https://datos.bancomundial.org/indicador/TX.VAL.AGRI.ZS.UN"
            sourceLabel="Banco Mundial"
            sourceTooltip="Exportaciones agro · ranking comparativo"
            apiUrl="/api/sectores/agro/exportacion">
            {exportacion && <ExportComparativa items={exportacion.comparativa}/>}
          </Panel>
        </div>

        {/* ROW 4: Programas */}
        <Panel title="Programas y políticas activas" subtitle="PERTE Agro · PAC ecoesquemas · Plan Sequía · Ley Cadena" marginBottom>
          <ProgramasGrid programas={PROGRAMAS_AGRO} columns={4}/>
        </Panel>

        {/* ROW 5: Empresas + Reguladores */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas tractoras del sector" subtitle={`${EMPRESAS_AGRO.length} compañías · cotizadas y cooperativas`}>
            <EmpresasGrid empresas={EMPRESAS_AGRO} accent={ACCENT}/>
          </Panel>
          <Panel title="Reguladores y operadores" subtitle="Marco institucional agro nacional + UE">
            <RegLista reguladores={REGULADORES_AGRO}/>
          </Panel>
        </div>

        {/* ROW 6: Licitaciones + Áreas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 03 · Productos agrícolas, ganaderos, pesca">
            <LicitacionesShortcut cpv_div="03" label="agrícolas y pesca"/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas areas={AREAS_AGRO}/>
          </Panel>
        </div>

        {loading && <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>Cargando datos World Bank…</div>}
      </main>
    </div>
  )
}

// ─── Visualizaciones ──────────────────────────────────────

function ProduccionTripleChart({ points }: { points: Array<{ t: string; food: number | null; livestock: number | null; crop: number | null }> }) {
  const valid = points.filter(p => p.food != null || p.livestock != null || p.crop != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 560, H = 230, P = 30
  const allValues = valid.flatMap(p => [p.food, p.livestock, p.crop].filter((v): v is number => v != null))
  const maxY = Math.max(...allValues) * 1.05
  const minY = Math.min(...allValues) * 0.92
  const range = maxY - minY || 1

  const path = (key: 'food' | 'livestock' | 'crop') => valid.map((p, i) => {
    const v = p[key]
    if (v == null) return null
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - (v - minY) / range) * (H - 2 * P)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).filter(Boolean).map((s, i) => `${i === 0 ? 'M' : 'L'}${s}`).join(' ')

  // Línea referencia base 100
  const yRef = P + (1 - (100 - minY) / range) * (H - 2 * P)

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        <line x1={P} x2={W - P} y1={yRef} y2={yRef} stroke="#86868b" strokeDasharray="4 3" strokeWidth={1}/>
        <text x={W - P - 4} y={yRef - 3} textAnchor="end" style={{ fontSize:9, fill:'#86868b' }}>base 100</text>
        <path d={path('crop')} fill="none" stroke="#FCD34D" strokeWidth={2.2}/>
        <path d={path('food')} fill="none" stroke="#16A34A" strokeWidth={2.5}/>
        <path d={path('livestock')} fill="none" stroke="#7C3AED" strokeWidth={2.2}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return (
            <g key={`hover-${p.t}`}>
              {p.food != null && (
                <circle cx={x} cy={P + (1 - (p.food - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
                  <title>Alimentos · {p.t}: {p.food.toFixed(1)} (base 2014-16=100)</title>
                </circle>
              )}
              {p.livestock != null && (
                <circle cx={x} cy={P + (1 - (p.livestock - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
                  <title>Ganadería · {p.t}: {p.livestock.toFixed(1)}</title>
                </circle>
              )}
              {p.crop != null && (
                <circle cx={x} cy={P + (1 - (p.crop - minY) / range) * (H - 2 * P)} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
                  <title>Cultivos · {p.t}: {p.crop.toFixed(1)}</title>
                </circle>
              )}
            </g>
          )
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(0)}</text>
        <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(0)}</text>
      </svg>
      <div style={{ display:'flex', gap:14, fontSize:11, marginTop:6, flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background:'#16A34A' }}/>
          <strong style={{ color:'#3a3a3d' }}>Alimentos</strong>
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background:'#7C3AED' }}/>
          <strong style={{ color:'#3a3a3d' }}>Ganadería</strong>
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background:'#FCD34D' }}/>
          <strong style={{ color:'#3a3a3d' }}>Cultivos</strong>
        </span>
      </div>
    </div>
  )
}

function CerealChart({ points }: { points: Array<{ t: string; v: number | null }> }) {
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 420, H = 200, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.05
  const minY = Math.min(...values) * 0.95

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
          const w = (W - 2 * P) / valid.length - 3
          return <rect key={p.t} x={x - w / 2} y={H - P - h} width={w} height={h} fill={ACCENT} rx={2}>
            <title>{p.t}: {v.toFixed(0)} kg/ha</title>
          </rect>
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(0)}</text>
      </svg>
      <div style={{ fontSize:11, marginTop:6, color:'#86868b' }}>
        Pico: <strong style={{ color: ACCENT }}>{Math.max(...values).toFixed(0)}</strong> kg/ha en {valid.find(p => p.v === Math.max(...values))?.t}
        · Mínimo (sequía): <strong style={{ color:'#DC2626' }}>{Math.min(...values).toFixed(0)}</strong> kg/ha en {valid.find(p => p.v === Math.min(...values))?.t}
      </div>
    </div>
  )
}

function ComparativaTable({ items }: { items: ComparativaResp['items'] }) {
  const maxPib = Math.max(...items.map(i => i.agro_pib_pct ?? 0))
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
      <thead>
        <tr style={{ borderBottom:'1px solid #ECECEF' }}>
          <Th>País</Th>
          <Th align="right">Agro % PIB</Th>
          <Th align="right">Food Idx</Th>
          <Th align="right">Lvstk Idx</Th>
          <Th>Distribución</Th>
        </tr>
      </thead>
      <tbody>
        {items.map(it => (
          <tr key={it.iso3} style={{
            borderBottom:'1px solid #F5F5F7',
            background: it.destacado ? '#FCD34D20' : 'transparent',
          }}>
            <Td>
              <strong style={{ color: it.destacado ? '#92400E' : '#1d1d1f', fontWeight: it.destacado ? 800 : 600 }}>{it.pais}</strong>
              <span style={{ fontSize:9.5, color:'#86868b', fontFamily:'monospace', marginLeft:6 }}>{it.iso3}</span>
            </Td>
            <Td align="right">
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: ACCENT }}>
                {(it.agro_pib_pct ?? 0).toFixed(2)}%
              </span>
            </Td>
            <Td align="right">
              {it.food_index != null ? <span style={{ color:'#3a3a3d', fontWeight:600 }}>{it.food_index.toFixed(0)}</span> : <span style={{ color:'#86868b' }}>—</span>}
            </Td>
            <Td align="right">
              {it.livestock_index != null ? <span style={{ color:'#3a3a3d', fontWeight:600 }}>{it.livestock_index.toFixed(0)}</span> : <span style={{ color:'#86868b' }}>—</span>}
            </Td>
            <Td>
              <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${((it.agro_pib_pct ?? 0) / maxPib) * 100}%`, height:'100%', background: it.destacado ? '#92400E' : ACCENT }}/>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TierraRegadaChart({ points }: { points: Array<{ t: string; v: number | null }> }) {
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 420, H = 200, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.05
  const minY = Math.min(...values) * 0.95

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
        <path d={path} fill="none" stroke="#0EA5E9" strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.v as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return <circle key={p.t} cx={x} cy={y} r={3} fill="#0EA5E9"><title>{p.t}: {(p.v as number).toFixed(2)}%</title></circle>
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(1)}%</text>
        <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(1)}%</text>
      </svg>
      <div style={{ fontSize:11, marginTop:6, color:'#86868b' }}>
        Tierra regada · evolución plurianual del riego en superficie agraria · indicador transición hídrica
      </div>
    </div>
  )
}

function ExportLineChart({ points }: { points: Array<{ t: string; v: number | null }> }) {
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 420, H = 200, P = 30
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.1
  const minY = 0

  const path = valid.map((p, i) => {
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.v as number) - minY) / (maxY - minY)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  // area
  const area = `${path} L${P + (W - 2 * P)},${H - P} L${P},${H - P} Z`
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        <path d={area} fill="#16A34A20" />
        <path d={path} fill="none" stroke={ACCENT} strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.v as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return (
            <circle key={`hover-${p.t}`} cx={x} cy={y} r={6} fill="transparent" style={{ cursor:'crosshair' }}>
              <title>{p.t}: {(p.v as number).toFixed(2)}% sobre total exportaciones</title>
            </circle>
          )
        })}
        {valid.filter((_, i) => i % Math.max(1, Math.ceil(valid.length / 6)) === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(1)}%</text>
      </svg>
      <div style={{ fontSize:11, marginTop:6, color:'#86868b' }}>
        Última lectura: <strong style={{ color: ACCENT }}>{values[values.length - 1]?.toFixed(2)}%</strong> sobre total exportaciones
      </div>
    </div>
  )
}

function ExportComparativa({ items }: { items: Array<{ iso3: string; country: string; value: number | null }> }) {
  const max = Math.max(...items.map(i => i.value ?? 0))
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
      {items.slice(0, 10).map(it => {
        const pct = it.value ?? 0
        const isEsp = it.iso3 === 'ESP'
        return (
          <li key={it.iso3}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:3 }}>
              <span style={{ color: isEsp ? '#92400E' : '#3a3a3d', fontWeight: isEsp ? 800 : 600, background: isEsp ? '#FCD34D40' : 'transparent', padding: isEsp ? '0 4px' : 0, borderRadius:3 }}>
                {it.country}
              </span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: ACCENT }}>{pct.toFixed(2)}%</span>
            </div>
            <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${(pct / max) * 100}%`, height:'100%', background: isEsp ? '#92400E' : ACCENT }}/>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, padding:'8px 6px', fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>{children}</th>
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align, padding:'8px 6px', verticalAlign:'middle' }}>{children}</td>
}
