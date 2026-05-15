'use client'
/**
 * Dashboard Sector Vivienda & Inmobiliario
 *
 * Datos en vivo desde INE TempUS:
 *   - IPV · Índice de Precios de Vivienda nacional (trimestral)
 *   - ETDP · Estadística Transmisión Derechos Propiedad (mensual)
 *   - IPVA · Índice Precios Vivienda Alquiler (anual)
 *
 * Auto-refresh cada 60 min (datos publicados con frecuencia mensual/trimestral).
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { EMPRESAS_VIVIENDA, REGULADORES_VIVIENDA, PROGRAMAS_VIVIENDA } from '@/lib/sources/ine'
import { Panel } from '@/components/SectorPanel'
import MapaProvinciasPrecios from '@/components/MapaProvinciasPrecios'
import BuscadorBarrios from '@/components/BuscadorBarrios'

interface ResumenResp {
  kpis: {
    ipv_indice: number | null; ipv_indice_periodo?: string
    ipv_var_anual: number | null; ipv_var_anual_periodo?: string
    compraventas_mes: number | null; compraventas_mes_periodo?: string
    alquiler_var_anual: number | null; alquiler_var_anual_periodo?: string
  }
  fetch_ms: number
}
interface PreciosResp { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }
interface CompraventasResp {
  points: Array<{ t: string; libre: number; protegida: number; nueva: number; usada: number }>
  totales: { libre: number; protegida: number; nueva: number; usada: number; total: number }
}
interface AlquilerResp { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }
interface MercadoResp {
  ccaa: Array<{ id: string; nombre: string; precio_m2: number; var_anual: number; cod_ine: string }>
  ciudades: Array<{ ciudad: string; ccaa: string; precio_m2: number; var_anual: number }>
  hipotecas: {
    volumen: Array<{ t: string; v: number }>
    tipo_medio: Array<{ t: string; v: number }>
    importe_medio: Array<{ t: string; v: number }>
    ult_volumen: number; ult_tipo: number; ult_importe: number
  }
  visados: { serie: Array<{ t: string; v: number }>; ult: number; var_anual: number }
  resumen: { precio_m2_medio: number; var_anual_media: number; esfuerzo_financiero: number }
}
interface ProvinciasResp {
  provincias: Array<{ cod_prov: string; id: string; nombre: string; precio_m2: number; var_anual: number; ccaa: string }>
  stats: { max: number; min: number; media: number; max_provincia: { nombre: string; precio_m2: number }; min_provincia: { nombre: string; precio_m2: number } }
}

const ACCENT = '#DB2777'        // Pink-600
const ACCENT_DARK = '#831843'   // Pink-900
const REFRESH_MS = 60 * 60 * 1000

export default function SectorViviendaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [precios, setPrecios] = useState<PreciosResp | null>(null)
  const [compras, setCompras] = useState<CompraventasResp | null>(null)
  const [alquiler, setAlquiler] = useState<AlquilerResp | null>(null)
  const [mercado, setMercado] = useState<MercadoResp | null>(null)
  const [provinciasResp, setProvinciasResp] = useState<ProvinciasResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, p, c, a, m, pr] = await Promise.all([
      fetch('/api/sectores/vivienda/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/vivienda/precios?nult=24').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/vivienda/compraventas?nult=18').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/vivienda/alquiler?nult=10').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/vivienda/mercado').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/vivienda/provincias').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setPrecios(p); setCompras(c); setAlquiler(a); setMercado(m); setProvinciasResp(pr)
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
              SECTORIAL · VIVIENDA & INMOBILIARIO · DATOS INE EN VIVO
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 10px', lineHeight:1.05 }}>
              Mercado de la vivienda <em style={{ fontWeight:300, fontStyle:'italic', opacity:0.75 }}>en tiempo real</em>
            </h1>
            <p style={{ fontSize:13.5, opacity:0.8, margin:0, lineHeight:1.5 }}>
              Índice de Precios de Vivienda (IPV) · compraventas por segmento (libre, protegida, nueva, usada) ·
              precios del alquiler (IPVA) · empresas cotizadas, SOCIMIs, promotores, marco regulatorio.
              Datos oficiales del Instituto Nacional de Estadística.
            </p>
            {updatedAt && (
              <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', fontSize:11, opacity:0.7 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#86EFAC', boxShadow:'0 0 8px #86EFAC' }}/>
                Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
                {resumen?.fetch_ms ? ` · ${resumen.fetch_ms} ms` : ''}
                <button onClick={refresh} style={{
                  marginLeft:8, fontSize:10.5, padding:'4px 12px', borderRadius:999,
                  border:'1px solid rgba(255,255,255,0.35)', background:'transparent', color:'#fff',
                  cursor:'pointer', fontFamily:'inherit',
                }}>↻ Actualizar</button>
              </div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            <HeroKPI
              label="Precio medio €/m²"
              value={mercado?.resumen.precio_m2_medio} unit="€" accent="#FCD34D"
              sub="Tinsa IMIE Q4 2025"/>
            <HeroKPI
              label={`Variación IPV (${resumen?.kpis.ipv_var_anual_periodo || ''})`}
              value={resumen?.kpis.ipv_var_anual} unit="%" decimals={1} accent="#FCA5A5"/>
            <HeroKPI
              label="Esfuerzo financiero"
              value={mercado?.resumen.esfuerzo_financiero} unit="%" decimals={1} accent="#FB7185"
              sub="% renta hipoteca · BdE"/>
            <HeroKPI
              label={`Compraventas ${resumen?.kpis.compraventas_mes_periodo || ''}`}
              value={resumen?.kpis.compraventas_mes} unit="" accent="#86EFAC"
              sub="Libre + protegida"/>
            <HeroKPI
              label="Hipotecas/mes"
              value={mercado?.hipotecas.ult_volumen} unit="" accent="#A5F3FC"
              sub={mercado ? `tipo ${mercado.hipotecas.ult_tipo}% · INE H910` : ''}/>
            <HeroKPI
              label={`Alquiler ${resumen?.kpis.alquiler_var_anual_periodo || ''}`}
              value={resumen?.kpis.alquiler_var_anual} unit="%" decimals={1} accent="#7DD3FC"
              sub="Variación anual IPVA"/>
          </div>
        </section>

        {/* ROW 1: IPV evolución + Compraventas mensuales */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel
            title="IPV · Índice de Precios de Vivienda"
            subtitle={precios ? `Trimestral · ${precios.points.length} observaciones · base 2015 = 100` : 'Cargando…'}
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=4960"
            sourceLabel="INE"
            sourceTooltip="IPV · INE · Índice Precios Vivienda trimestral"
          >
            {precios && <PreciosLineChart points={precios.points}/>}
          </Panel>
          <Panel
            title="Compraventas mensuales · Total nacional"
            subtitle={compras ? `Suma 18 meses: ${compras.totales.total.toLocaleString('es-ES')} viviendas` : 'Cargando…'}
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=8169"
            sourceLabel="INE"
            sourceTooltip="Estadística Transmisiones Derechos Propiedad · INE"
          >
            {compras && <CompraventasStacked points={compras.points}/>}
          </Panel>
        </div>

        {/* ROW 2: Distribución compraventas + IPVA Alquiler */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel
            title="Distribución de compraventas · 18 meses"
            subtitle="Por tipología de vivienda"
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=8169"
            sourceLabel="INE"
            sourceTooltip="Compraventas por tipología · INE ETDP"
          >
            {compras && <CompraventasDonut totales={compras.totales}/>}
          </Panel>
          <Panel
            title="IPVA · Índice Precios Vivienda Alquiler"
            subtitle={alquiler ? `${alquiler.points.length} años · variación anual` : 'Cargando…'}
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10309"
            sourceLabel="INE"
            sourceTooltip="IPVA · INE · variación anual del alquiler"
          >
            {alquiler && <AlquilerLineChart points={alquiler.points}/>}
          </Panel>
        </div>

        {/* ROW 2.5: MAPA POLÍTICO de España con precio €/m² por provincia */}
        <Panel
          title="Mapa de precios · España por provincia"
          subtitle={provinciasResp ? `52 provincias · €/m² medio · rango ${provinciasResp.stats.min.toLocaleString('es-ES')} – ${provinciasResp.stats.max.toLocaleString('es-ES')} € · media nacional ${provinciasResp.stats.media.toLocaleString('es-ES')} €` : 'Cargando…'}
          marginBottom
          sourceUrl="https://www.tinsa.es/imie/"
          sourceLabel="Tinsa Vivienda Habitada"
          sourceTooltip="Tinsa Vivienda Habitada · provincial · Q4 2025"
        >
          {provinciasResp ? (
            <MapaProvinciasPrecios provincias={provinciasResp.provincias} compact={false}/>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>
              Cargando mapa…
            </div>
          )}
        </Panel>

        {/* ROW 2.6: BUSCADOR de barrios con precio €/m² */}
        <Panel
          title="Buscador de barrios · €/m²"
          subtitle="100+ barrios de las principales ciudades · busca por nombre, ciudad o distrito"
          marginBottom
          sourceUrl="https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/"
          sourceLabel="Idealista · Tinsa"
          sourceTooltip="Catálogo curado · referencia Idealista + Tinsa Q4 2025"
        >
          <BuscadorBarrios/>
        </Panel>

        {/* ROW 3: Ranking precios CCAA + Top ciudades */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel
            title="Precio €/m² por Comunidad Autónoma"
            subtitle={mercado ? `19 territorios · variación anual entre +2.8% y +9.4%` : 'Cargando…'}
            sourceUrl="https://www.tinsa.es/imie/"
            sourceLabel="Tinsa IMIE"
            sourceTooltip="Índice Mercado Inmobiliario Español · Tinsa Q4 2025"
          >
            {mercado && <RankingCCAA items={mercado.ccaa}/>}
          </Panel>
          <Panel
            title="Top 10 ciudades · €/m²"
            subtitle="Ranking grandes capitales"
            sourceUrl="https://www.tinsa.es/imie/"
            sourceLabel="Tinsa IMIE"
            sourceTooltip="Precios mercado libre vivienda · capital de provincia"
          >
            {mercado && <RankingCiudades items={mercado.ciudades}/>}
          </Panel>
        </div>

        {/* ROW 4: Hipotecas constituidas + Visados obra nueva */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel
            title="Hipotecas constituidas · 24 meses"
            subtitle={mercado ? `Volumen mensual + tipo medio (último: ${mercado.hipotecas.ult_volumen.toLocaleString('es-ES')} hipotecas · tipo ${mercado.hipotecas.ult_tipo}%)` : 'Cargando…'}
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=2999"
            sourceLabel="INE H910"
            sourceTooltip="Estadística de Hipotecas · INE · serie mensual"
          >
            {mercado && <HipotecasChart volumen={mercado.hipotecas.volumen} tipo={mercado.hipotecas.tipo_medio}/>}
          </Panel>
          <Panel
            title="Visados obra nueva · oferta futura"
            subtitle={mercado ? `${mercado.visados.ult.toLocaleString('es-ES')} visados/mes · ${mercado.visados.var_anual >= 0 ? '+' : ''}${mercado.visados.var_anual}% interanual` : 'Cargando…'}
            sourceUrl="https://www.mitma.gob.es/informacion-para-el-ciudadano/informacion-estadistica/vivienda-y-actuaciones-urbanas/estadisticas/edificacion/licencias-municipales-de-obra-mayor"
            sourceLabel="MITMA"
            sourceTooltip="Visados de dirección de obra nueva · Ministerio de Transportes"
          >
            {mercado && <VisadosChart serie={mercado.visados.serie}/>}
          </Panel>
        </div>

        {/* ROW 5: Programas + Empresas */}
        <Panel title="Programas y políticas activas" subtitle="Plan Estatal · Bono Joven · Ley Vivienda · SAREB · NextGen · BTR" marginBottom>
          <ProgramasGrid/>
        </Panel>

        {/* ROW 4: Empresas + Reguladores */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas cotizadas del sector" subtitle={`${EMPRESAS_VIVIENDA.length} compañías · IBEX, SOCIMIs y promotores`}>
            <EmpresasGrid/>
          </Panel>
          <Panel title="Reguladores y operadores" subtitle="Marco institucional vivienda">
            <RegLista/>
          </Panel>
        </div>

        {/* ROW 5: Licitaciones + Áreas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 70 · Servicios inmobiliarios + 45 · Construcción">
            <LicitacionesShortcut/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas/>
          </Panel>
        </div>

        {loading && <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>Cargando datos INE…</div>}
      </main>
    </div>
  )
}

// ─── Componentes ──────────────────────────────────────────

function HeroKPI({ label, value, unit, accent, sub, decimals = 0 }: { label: string; value: number | null | undefined; unit: string; accent: string; sub?: string; decimals?: number }) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
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

function PreciosLineChart({ points }: { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }) {
  const valid = points.filter(p => p.indice != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>

  const W = 500, H = 200, P = 30
  const indices = valid.map(p => p.indice as number)
  const minY = Math.min(...indices) * 0.98
  const maxY = Math.max(...indices) * 1.02

  const pathIndice = valid.map((p, i) => {
    const x = P + (i / (valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Variación anual como barras de fondo
  const varValid = points.filter(p => p.var_anual != null)
  const varMax = Math.max(...varValid.map(p => Math.abs(p.var_anual || 0))) * 1.2

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display:'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        <path d={pathIndice} fill="none" stroke={ACCENT} strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return <circle key={p.t} cx={x} cy={y} r={2.5} fill={ACCENT}><title>{p.t}: {p.indice} (var {p.var_anual?.toFixed(1)}%)</title></circle>
        })}
        {valid.filter((_, i) => i % Math.ceil(valid.length / 6) === 0).map((p) => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 14} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{maxY.toFixed(0)}</text>
        <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{minY.toFixed(0)}</text>
      </svg>
      <div style={{ display:'flex', gap:14, fontSize:11, marginTop:6, flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background: ACCENT }}/>
          <span style={{ color:'#3a3a3d', fontWeight:600 }}>Índice IPV</span>
          {valid.length > 0 && (
            <span style={{ color: ACCENT, fontFamily:'var(--font-display)', fontWeight:700, marginLeft:4 }}>
              {valid[valid.length - 1].indice?.toFixed(2)}
            </span>
          )}
        </span>
        {varValid.length > 0 && (
          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#86868b' }}>· Var. anual último periodo:</span>
            <span style={{ color:'#16A34A', fontFamily:'var(--font-display)', fontWeight:700 }}>
              +{varValid[varValid.length - 1].var_anual?.toFixed(1)}%
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

function CompraventasStacked({ points }: { points: Array<{ t: string; libre: number; protegida: number; nueva: number; usada: number }> }) {
  if (!points.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 500, H = 200, P = 14
  const colW = (W - 2 * P) / points.length
  const maxTotal = Math.max(...points.map(p => p.libre + p.protegida)) * 1.05

  // Color scheme · 4 segmentos: nueva-libre, nueva-prot, usada-libre, usada-prot
  // Usamos saturación para distinguir nueva vs usada y tono para libre vs prot.
  const COLORS = {
    nuevaLibre:   '#DB2777',  // rosa fuerte
    nuevaProt:    '#9D174D',  // burgundy oscuro
    usadaLibre:   '#FCA5A5',  // rosa claro
    usadaProt:    '#FECACA',  // rosa muy claro
  }

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 25}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        {points.map((p, i) => {
          const total = p.libre + p.protegida
          // Estimamos los 4 segmentos manteniendo proporciones nueva/usada
          // y libre/protegida sobre los totales del periodo.
          const totalH = (total / maxTotal) * (H - 2 * P)
          const ratioProt = total > 0 ? p.protegida / total : 0
          // Asumimos misma proporción nueva/usada en libre y protegida
          const totalNueva = p.nueva || 0
          const totalUsada = p.usada || total - totalNueva
          const ratioNueva = (totalNueva + totalUsada) > 0 ? totalNueva / (totalNueva + totalUsada) : 0.18
          const segNuevaLibre  = total * (1 - ratioProt) * ratioNueva
          const segUsadaLibre  = total * (1 - ratioProt) * (1 - ratioNueva)
          const segNuevaProt   = total * ratioProt * ratioNueva
          const segUsadaProt   = total * ratioProt * (1 - ratioNueva)
          const x = P + i * colW + 2
          const w = colW - 4
          // Apilamos de abajo arriba: usadaLibre, nuevaLibre, usadaProt, nuevaProt
          let y = H - P
          const draw = (val: number, color: string, label: string) => {
            const h = (val / maxTotal) * (H - 2 * P)
            y -= h
            return <rect x={x} y={y} width={w} height={h} fill={color}><title>{p.t} · {label}: {Math.round(val).toLocaleString('es-ES')}</title></rect>
          }
          return (
            <g key={p.t}>
              {draw(segUsadaLibre, COLORS.usadaLibre, 'libre · usada')}
              {draw(segNuevaLibre, COLORS.nuevaLibre, 'libre · nueva')}
              {draw(segUsadaProt,  COLORS.usadaProt,  'protegida · usada')}
              {draw(segNuevaProt,  COLORS.nuevaProt,  'protegida · nueva')}
              {i % 2 === 0 && (
                <text x={x + w / 2} y={H + 12} textAnchor="middle" style={{ fontSize:8.5, fill:'#86868b' }}>{p.t.slice(2)}</text>
              )}
            </g>
          )
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{Math.round(maxTotal).toLocaleString('es-ES')}</text>
        {(() => {
          const last = points[points.length - 1]
          const x = P + (points.length - 0.5) * colW
          return (
            <text x={x} y={H - P - (((last.libre + last.protegida) / maxTotal) * (H - 2 * P)) - 4}
              textAnchor="middle" style={{ fontSize:10, fontWeight:700, fill:'#1d1d1f', fontFamily:'var(--font-display)' }}>
              {(last.libre + last.protegida).toLocaleString('es-ES')}
            </text>
          )
        })()}
      </svg>
      {/* Leyenda · 4 segmentos */}
      <div style={{ display:'flex', gap:10, fontSize:10, marginTop:6, flexWrap:'wrap', color:'#3a3a3d' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, background: COLORS.nuevaLibre, borderRadius:2 }}/>Libre · nueva
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, background: COLORS.usadaLibre, borderRadius:2 }}/>Libre · usada
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, background: COLORS.nuevaProt, borderRadius:2 }}/>Protegida · nueva
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, background: COLORS.usadaProt, borderRadius:2 }}/>Protegida · usada
        </span>
      </div>
    </div>
  )
}

function CompraventasDonut({ totales }: { totales: { libre: number; protegida: number; nueva: number; usada: number } }) {
  // Donut por libre vs protegida
  const radius = 65
  const stroke = 18
  const circ = 2 * Math.PI * radius
  const total1 = totales.libre + totales.protegida
  const segments1 = [
    { label: 'Libre', value: totales.libre, color:'#DB2777' },
    { label: 'Protegida', value: totales.protegida, color:'#FCA5A5' },
  ]
  let acum = 0

  return (
    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:18, alignItems:'center' }}>
      <svg width={radius * 2 + stroke} height={radius * 2 + stroke}>
        <g transform={`translate(${radius + stroke / 2},${radius + stroke / 2}) rotate(-90)`}>
          {segments1.map(s => {
            const len = (s.value / total1) * circ
            const offset = -acum
            acum += len
            return (
              <circle key={s.label} r={radius} fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={offset}
                style={{ cursor:'pointer' }}>
                <title>{s.label}: {s.value.toLocaleString('es-ES')} compraventas ({((s.value/total1)*100).toFixed(1)}%)</title>
              </circle>
            )
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, fill:'#1d1d1f' }}>
          {(total1 / 1000).toFixed(0)}k
        </text>
        <text x="50%" y="58%" textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>compraventas</text>
      </svg>
      <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:11.5 }}>
        <li style={{ marginBottom:6 }}>
          <strong style={{ color:'#86868b', fontSize:9.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Régimen</strong>
        </li>
        {segments1.map(s => (
          <li key={s.label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
            <span style={{ width:10, height:10, borderRadius:2, background: s.color, flexShrink:0 }}/>
            <span style={{ flex:1, color:'#3a3a3d', fontWeight:600 }}>{s.label}</span>
            <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>
              {s.value.toLocaleString('es-ES')} <span style={{ color:'#86868b', fontWeight:500 }}>· {((s.value / total1) * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
        <li style={{ marginTop:10, marginBottom:6 }}>
          <strong style={{ color:'#86868b', fontSize:9.5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Antigüedad</strong>
        </li>
        <li style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, fontSize:11.5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'#0EA5E9' }}/>
          <span style={{ flex:1, color:'#3a3a3d', fontWeight:600 }}>Vivienda nueva</span>
          <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>{totales.nueva.toLocaleString('es-ES')}</span>
        </li>
        <li style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'#0F766E' }}/>
          <span style={{ flex:1, color:'#3a3a3d', fontWeight:600 }}>Segunda mano</span>
          <span style={{ color:'#1F4E8C', fontWeight:700, fontFamily:'var(--font-display)' }}>{totales.usada.toLocaleString('es-ES')}</span>
        </li>
      </ul>
    </div>
  )
}

// ─── RankingCCAA · barras horizontales con precio €/m² + var anual ──────
function RankingCCAA({ items }: { items: Array<{ id: string; nombre: string; precio_m2: number; var_anual: number }> }) {
  const max = Math.max(...items.map(i => i.precio_m2))
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:4 }}>
      {items.map(c => {
        const pct = (c.precio_m2 / max) * 100
        const varColor = c.var_anual > 7 ? '#DC2626' : c.var_anual > 4 ? '#D97706' : '#16A34A'
        return (
          <li key={c.id} style={{
            display:'grid', gridTemplateColumns:'120px 1fr 70px 50px', gap:8, alignItems:'center',
            padding:'4px 6px', borderRadius:6, fontSize:11,
          }}>
            <span style={{ color:'#1d1d1f', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nombre}</span>
            <div style={{ background:'#F5F5F7', borderRadius:4, height:8, overflow:'hidden', position:'relative' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg, #DB2777, #831843)', borderRadius:4 }}/>
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', textAlign:'right' }}>
              {c.precio_m2.toLocaleString('es-ES')}€
            </span>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:999,
              background:`${varColor}14`, color: varColor, border:`1px solid ${varColor}33`,
              textAlign:'center',
            }}>
              {c.var_anual >= 0 ? '+' : ''}{c.var_anual.toFixed(1)}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ─── RankingCiudades · cards verticales con €/m² ─────────────────────────
function RankingCiudades({ items }: { items: Array<{ ciudad: string; ccaa: string; precio_m2: number; var_anual: number }> }) {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:5 }}>
      {items.map((c, i) => {
        const varColor = c.var_anual > 7 ? '#DC2626' : c.var_anual > 4 ? '#D97706' : '#16A34A'
        return (
          <li key={c.ciudad} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'7px 10px', background:'#FAFAFA', borderRadius:8, border:'1px solid #ECECEF',
          }}>
            <span style={{
              width:22, height:22, borderRadius:'50%', background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'1px solid #ECECEF', fontSize:10, fontWeight:800, color:'#6e6e73', flexShrink:0,
            }}>{i + 1}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.ciudad}</div>
              <div style={{ fontSize:9.5, color:'#86868b' }}>{c.ccaa}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>
                {c.precio_m2.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', fontWeight:500 }}> €/m²</span>
              </div>
              <div style={{ fontSize:9.5, fontWeight:700, color: varColor, marginTop:2 }}>
                {c.var_anual >= 0 ? '+' : ''}{c.var_anual.toFixed(1)}%
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── HipotecasChart · barras volumen + línea tipo medio (eje doble) ─────
function HipotecasChart({ volumen, tipo }: { volumen: Array<{ t: string; v: number }>; tipo: Array<{ t: string; v: number }> }) {
  if (!volumen.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 500, H = 200, P = 28
  const colW = (W - 2 * P) / volumen.length
  const maxVol = Math.max(...volumen.map(p => p.v)) * 1.1
  const tipoMin = Math.min(...tipo.map(p => p.v)) * 0.9
  const tipoMax = Math.max(...tipo.map(p => p.v)) * 1.1
  const tipoPath = tipo.map((p, i) => {
    const x = P + i * colW + colW / 2
    const y = P + (1 - (p.v - tipoMin) / (tipoMax - tipoMin)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 25}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        {/* Barras volumen */}
        {volumen.map((p, i) => {
          const h = (p.v / maxVol) * (H - 2 * P)
          const x = P + i * colW + 1
          const w = colW - 2
          return (
            <rect key={p.t} x={x} y={H - P - h} width={w} height={h} fill="#DB2777" fillOpacity={0.85}>
              <title>{p.t} · {p.v.toLocaleString('es-ES')} hipotecas</title>
            </rect>
          )
        })}
        {/* Línea tipo medio */}
        <path d={tipoPath} fill="none" stroke="#1F4E8C" strokeWidth={2}/>
        {tipo.map((p, i) => {
          const x = P + i * colW + colW / 2
          const y = P + (1 - (p.v - tipoMin) / (tipoMax - tipoMin)) * (H - 2 * P)
          return <circle key={p.t} cx={x} cy={y} r={2} fill="#1F4E8C"><title>{p.t} · tipo medio {p.v.toFixed(2)}%</title></circle>
        })}
        {/* Etiquetas X */}
        {volumen.filter((_, i) => i % 4 === 0).map((p) => {
          const i = volumen.findIndex(v => v.t === p.t)
          const x = P + i * colW + colW / 2
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:8.5, fill:'#86868b' }}>{p.t.slice(2)}</text>
        })}
        {/* Eje izq · volumen */}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#DB2777', fontWeight:700 }}>{Math.round(maxVol / 1000)}k</text>
        <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>0</text>
        {/* Eje der · tipo */}
        <text x={W - 4} y={P + 4} textAnchor="end" style={{ fontSize:9, fill:'#1F4E8C', fontWeight:700 }}>{tipoMax.toFixed(1)}%</text>
        <text x={W - 4} y={H - P + 4} textAnchor="end" style={{ fontSize:9, fill:'#86868b' }}>{tipoMin.toFixed(1)}%</text>
      </svg>
      <div style={{ display:'flex', gap:14, fontSize:10.5, marginTop:6, flexWrap:'wrap', color:'#3a3a3d' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, background:'#DB2777', borderRadius:2 }}/>Hipotecas mensuales
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:14, height:2, background:'#1F4E8C' }}/>Tipo medio %
        </span>
      </div>
    </div>
  )
}

// ─── VisadosChart · línea simple obra nueva ─────────────────────────────
function VisadosChart({ serie }: { serie: Array<{ t: string; v: number }> }) {
  if (!serie.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>
  const W = 400, H = 200, P = 22
  const max = Math.max(...serie.map(p => p.v)) * 1.1
  const min = Math.min(...serie.map(p => p.v)) * 0.9
  const path = serie.map((p, i) => {
    const x = P + (i / (serie.length - 1)) * (W - 2 * P)
    const y = P + (1 - (p.v - min) / (max - min)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  // Area para énfasis
  const areaPath = `${path} L ${(P + (W - 2 * P)).toFixed(1)},${(H - P).toFixed(1)} L ${P},${(H - P).toFixed(1)} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block' }}>
      <defs>
        <linearGradient id="visadosGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3}/>
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0}/>
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(g => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
      ))}
      <path d={areaPath} fill="url(#visadosGrad)"/>
      <path d={path} fill="none" stroke="#0EA5E9" strokeWidth={2.5}/>
      {serie.map((p, i) => {
        const x = P + (i / (serie.length - 1)) * (W - 2 * P)
        const y = P + (1 - (p.v - min) / (max - min)) * (H - 2 * P)
        return <circle key={p.t} cx={x} cy={y} r={2} fill="#0EA5E9"><title>{p.t} · {p.v.toLocaleString('es-ES')} visados</title></circle>
      })}
      {serie.filter((_, i) => i % 4 === 0).map((p) => {
        const i = serie.findIndex(v => v.t === p.t)
        const x = P + (i / (serie.length - 1)) * (W - 2 * P)
        return <text key={p.t} x={x} y={H + 10} textAnchor="middle" style={{ fontSize:8.5, fill:'#86868b' }}>{p.t.slice(2)}</text>
      })}
      <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{Math.round(max / 1000)}k</text>
      <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{Math.round(min / 1000)}k</text>
    </svg>
  )
}

function AlquilerLineChart({ points }: { points: Array<{ t: string; indice: number | null; var_anual: number | null }> }) {
  const valid = points.filter(p => p.indice != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos disponibles</div>
  const W = 500, H = 200, P = 24
  const indices = valid.map(p => p.indice as number)
  const minY = Math.min(...indices) * 0.98
  const maxY = Math.max(...indices) * 1.02
  const path = valid.map((p, i) => {
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display:'block' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        <path d={path} fill="none" stroke="#0EA5E9" strokeWidth={2.5}/>
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.indice as number) - minY) / (maxY - minY)) * (H - 2 * P)
          return (
            <g key={p.t}>
              <circle cx={x} cy={y} r={3} fill="#0EA5E9"><title>{p.t}: {p.indice} (var {p.var_anual?.toFixed(1)}%)</title></circle>
              <text x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
              {p.var_anual != null && (
                <text x={x} y={y - 8} textAnchor="middle" style={{ fontSize:9, fontWeight:700, fill: p.var_anual > 0 ? '#16A34A' : '#DC2626' }}>
                  {p.var_anual > 0 ? '+' : ''}{p.var_anual.toFixed(1)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ProgramasGrid() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
      {PROGRAMAS_VIVIENDA.map(p => (
        <li key={p.programa} style={{
          padding:'12px 16px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
          borderLeft:`4px solid ${p.color}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3, gap:6 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{p.programa}</span>
            <span style={{
              fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999,
              background:`${p.color}20`, color: p.color, letterSpacing:'0.04em', whiteSpace:'nowrap',
            }}>{p.estado.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.4, margin:'4px 0' }}>{p.descripcion}</div>
          {p.presupuesto_b > 0 && (
            <div style={{ textAlign:'right', fontSize:10.5, color:'#1F4E8C', fontFamily:'var(--font-display)', fontWeight:700 }}>
              {p.presupuesto_b}b € presupuesto
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function EmpresasGrid() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {EMPRESAS_VIVIENDA.map(e => (
        <li key={e.nombre}>
          <a href={e.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6 }}>
              <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:13.5, color:'#1d1d1f' }}>{e.nombre}</span>
              {e.ibex && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#FCD34D', color:'#92400E' }}>IBEX 35</span>}
            </div>
            {e.ticker !== '—' && <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace', marginTop:2 }}>{e.ticker} {e.capitalizacion_b > 0 && `· ${e.capitalizacion_b}b€`}</div>}
            <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{e.descripcion}</div>
            <div style={{ fontSize:9.5, color: ACCENT, fontWeight:700, marginTop:5, letterSpacing:'0.04em', textTransform:'uppercase' }}>{e.segmento}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

function RegLista() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {REGULADORES_VIVIENDA.map(r => (
        <li key={r.nombre}>
          <a href={r.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:6, alignItems:'baseline' }}>
              <span style={{ fontWeight:700, fontSize:12.5, color:'#1d1d1f' }}>{r.nombre}</span>
              <span style={{ fontSize:10, color:'#86868b', maxWidth:200, textAlign:'right' }}>{r.full}</span>
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
    fetch('/api/licitaciones/buscar?cpv_div=70&page_size=5&sort=date_desc')
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
        <Link href="/licitaciones?cpv_div=70" style={{ fontSize:11, color:'#1F4E8C', textDecoration:'none', fontWeight:600 }}>
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
    { titulo: 'Acceso vivienda joven', desc: 'Bono alquiler · ICO Avales · vivienda asequible · sucesor PEV', color:'#0EA5E9' },
    { titulo: 'Ley Vivienda 12/2023', desc: 'Zonas tensionadas · IRAV · gran tenedor · 5 viviendas urbanas', color:'#DC2626' },
    { titulo: 'Vivienda social y SAREB', desc: 'Cesión 50.000 viviendas · CCAA receptoras · alquiler asequible', color:'#16A34A' },
    { titulo: 'Build to Rent (BTR)', desc: 'Aedas · Neinor · Stoneshield · pipelines 25k+ viviendas alquiler', color:'#7C3AED' },
    { titulo: 'Rehabilitación NextGen', desc: 'PRTR · 510k viviendas · ITE · DIGITALIZA hogar · CO2 reducción', color:'#F97316' },
    { titulo: 'SOCIMIs y mercado financiero', desc: 'Colonial · Merlin · Lar España · IBEX inmobiliario · BME Growth', color:'#5B21B6' },
    { titulo: 'Hipotecas y tipos', desc: 'EURIBOR · IRPH · BdE supervisión · subrogaciones · novaciones', color:'#1F4E8C' },
    { titulo: 'Suelo finalista y urbanismo', desc: 'PGOU · revisiones LOTUR · transformación CT/MD · costas', color:'#0F766E' },
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
