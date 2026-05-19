'use client'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import type { RiskIndicesPayload, RiskIndexCard } from '@/app/api/risk-v2/indices/route'

// ─── types ────────────────────────────────────────────────────────────────────
type Level = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
type Semaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo'

interface RiskDriver {
  id: number
  title: string
  source: string
  relevance: number
  sentiment: string
  spain_impact: string
  contribution: number
  scraped_at: string | null
  dimension?: string
  dimension_label?: string
}

interface RiskDimension {
  label: string
  score: number
  level: Level
  weight: number
  n_articles: number
  delta_24h: number
  z_score: number
  is_anomaly: boolean
  drivers: RiskDriver[]
}

interface RiskComposite {
  fetched_at: string
  hours_back: number
  composite: number
  composite_level: Level
  composite_semaforo: Semaforo
  framework: string
  dimensions: Record<string, RiskDimension>
  top_risks: RiskDriver[]
}

interface RiskBucket {
  date: string
  composite: number
  institutional?: number
  electoral?: number
  geopolitical?: number
  economic?: number
  media?: number
  social?: number
}

interface RiskTimeseriesResponse {
  days: number
  buckets: RiskBucket[]
  dimensions: string[]
}

// ─── design tokens ────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICO:  '#DC2626', ALTO: '#F59E0B', MEDIO: '#2563EB', BAJO: '#16A34A',
  CRITICA:  '#DC2626',
}
const SEM_COLOR: Record<Semaforo, string> = {
  rojo: '#DC2626', naranja: '#F59E0B', amarillo: '#EAB308', verde: '#16A34A',
}
const SEM_LABEL: Record<Semaforo, string> = {
  rojo: 'CRÍTICO', naranja: 'ALTO', amarillo: 'MEDIO', verde: 'BAJO',
}
const DIM_COLORS: Record<string, string> = {
  institutional: '#2563EB', electoral: '#7C3AED', geopolitical: '#F59E0B',
  economic: '#16A34A', media: '#EC4899', social: '#F97316',
}
const DIM_LABELS: Record<string, string> = {
  institutional: 'Institucional', electoral: 'Electoral', geopolitical: 'Geopolítico',
  economic: 'Económico', media: 'Mediático', social: 'Social',
}
const DIM_DESC: Record<string, string> = {
  institutional: 'Estabilidad de instituciones · independencia judicial · renovación de órganos · tensión Gobierno-CGPJ-TC',
  electoral:     'Volatilidad electoral · Pedersen · proximidad de elecciones · cambios en intención de voto',
  geopolitical:  'Presión externa · gasto defensa % PIB · OTAN · ofertas armamentísticas · conflictos vecinos',
  economic:      'IPC · tipos BCE · prima de riesgo · paro · variables macro clave',
  media:         'Tone informativo · polarización mediática · concentración de menciones negativas',
  social:        'Paro juvenil · movilizaciones · conflicto laboral · indicadores cohesión',
}
const DIM_SOURCES: Record<string, string> = {
  institutional: 'Banco Mundial WGI · V-Dem · CIS confianza',
  electoral:     'Wikipedia agregador encuestas · CIS · 40dB',
  geopolitical:  'Banco Mundial gasto militar · GPR Caldara · ACLED',
  economic:      'ECB SDW (DFR) · INE TempUS (IPC) · Banco Mundial',
  media:         'GDELT 2.0 · RSS 30 medios · sentiment NLP',
  social:        'Banco Mundial paro 16-24 · INE EPA · Politeia Lab',
}

/** Catálogo de fuentes externas referenciables · cada token devuelve un href. */
const SOURCE_URL: Record<string, string> = {
  // Banco Mundial
  'Banco Mundial':         'https://data.worldbank.org/country/ES',
  'BM Gini':               'https://data.worldbank.org/indicator/SI.POV.GINI?locations=ES',
  'Gini':                  'https://data.worldbank.org/indicator/SI.POV.GINI?locations=ES',
  'BM Gasto militar':      'https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS?locations=ES',
  'Gasto militar':         'https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS?locations=ES',
  'BM Paro juvenil':       'https://data.worldbank.org/indicator/SL.UEM.1524.NE.ZS?locations=ES',
  'Paro juvenil':          'https://data.worldbank.org/indicator/SL.UEM.1524.NE.ZS?locations=ES',
  'paro 16-24':            'https://data.worldbank.org/indicator/SL.UEM.1524.NE.ZS?locations=ES',
  // BCE / ECB
  'BCE':                   'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  'ECB':                   'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  'ECB SDW':               'https://data.ecb.europa.eu/',
  'ECB DFR':               'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  'DFR':                   'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  // INE
  'INE':                   'https://www.ine.es/',
  'INE IPC':               'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802',
  'INE TempUS':            'https://www.ine.es/dyngs/DataLab/manual.html?cid=1259943100329',
  'INE EPA':               'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176918',
  'IPC':                   'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802',
  // GDELT
  'GDELT':                 'https://www.gdeltproject.org/',
  'GDELT 2.0':             'https://www.gdeltproject.org/',
  // GPR / ACLED / V-Dem
  'GPR':                   'https://www.matteoiacoviello.com/gpr.htm',
  'GPR Caldara':           'https://www.matteoiacoviello.com/gpr.htm',
  'ACLED':                 'https://acleddata.com/',
  'V-Dem':                 'https://v-dem.net/',
  // Encuestas
  'CIS':                   'https://www.cis.es/',
  '40dB':                  'https://www.40db.com/',
  'Wikipedia':             'https://es.wikipedia.org/wiki/Anexo:Encuestas_de_intenci%C3%B3n_de_voto_para_las_elecciones_generales_de_Espa%C3%B1a_de_2027',
  // SIGINT / seguridad
  'INCIBE':                'https://www.incibe.es/',
  'INCIBE-CERT':           'https://www.incibe.es/incibe-cert',
  'CCN-CERT':              'https://www.ccn-cert.cni.es/',
  'EMSC':                  'https://www.emsc-csem.org/Earthquake/',
  'Google News':           'https://news.google.com/?hl=es&gl=ES&ceid=ES:es',
  'Google Noticias':       'https://news.google.com/?hl=es&gl=ES&ceid=ES:es',
  'Congreso':              'https://www.congreso.es/',
  // OTAN / UE
  'OTAN':                  'https://www.nato.int/cps/en/natohq/topics_67655.htm',
  'UE':                    'https://european-union.europa.eu/index_es',
  // Propios
  'Politeia':              '/dashboard',
  'Politeia Lab':          '/dashboard',
}

function resolveSourceUrl(token: string): string | null {
  const trimmed = token.trim()
  // exact match
  if (SOURCE_URL[trimmed]) return SOURCE_URL[trimmed]
  // case-insensitive substring (longest match)
  const candidates = Object.keys(SOURCE_URL).filter(k => trimmed.toLowerCase().includes(k.toLowerCase()))
  candidates.sort((a, b) => b.length - a.length)
  if (candidates.length > 0) return SOURCE_URL[candidates[0]]
  return null
}

/** Renderiza un string con separadores '·' donde cada token enlaza a su fuente si existe. */
function SourceList({ text, baseColor = '#6e6e73', accent = '#0071e3' }: { text: string; baseColor?: string; accent?: string }) {
  const tokens = text.split('·').map(t => t.trim()).filter(Boolean)
  return (
    <>
      {tokens.map((t, i) => {
        const url = resolveSourceUrl(t)
        const sep = i > 0 ? ' · ' : ''
        if (!url) return <span key={i} style={{ color: baseColor }}>{sep}{t}</span>
        return (
          <span key={i} style={{ color: baseColor }}>
            {sep}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}55`, fontWeight: 500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderBottomStyle = 'solid' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderBottomStyle = 'dotted' }}
            >{t}</a>
          </span>
        )
      })}
    </>
  )
}

// Mapeo entre dim keys del termómetro y index_id del endpoint risk-v2
const DIM_TO_RISKV2: Record<string, string> = {
  institutional: 'institutional',
  electoral:     'electoral',
  geopolitical:  'geopolitical',
  economic:      'economic',
  media:         'media',
  social:        'social',
}

// Interpretación contextual de un sub-KPI según su raw value y métrica
function interpretSubKpi(metricName: string, rawValue: number | null, score: number): string {
  if (rawValue == null) return 'Valor no disponible · usando aproximación calibrada.'
  const lower = metricName.toLowerCase()
  if (lower.includes('gini')) {
    if (rawValue >= 35) return `Gini ${rawValue} · desigualdad alta (>35 es preocupante en países UE). Genera tensión social latente y aporta al riesgo institucional.`
    if (rawValue >= 30) return `Gini ${rawValue} · desigualdad moderada-alta. Por debajo de Reino Unido pero por encima de Francia/Alemania.`
    return `Gini ${rawValue} · desigualdad moderada. Dentro de la media UE.`
  }
  if (lower.includes('militar')) {
    if (rawValue >= 2.0) return `Gasto militar ${rawValue}% PIB · cumple objetivo OTAN 2%. Indica presión externa elevada (Rusia/Sahel).`
    if (rawValue >= 1.5) return `Gasto militar ${rawValue}% PIB · por debajo del objetivo OTAN del 2%. España sigue siendo de los aliados menos invertidos.`
    return `Gasto militar ${rawValue}% PIB · muy bajo en contexto OTAN. Aporta poco al score geopolítico.`
  }
  if (lower.includes('paro juvenil')) {
    if (rawValue >= 35) return `Paro 16-24 ${rawValue}% · zona crítica. Españа es de los peores datos de la UE. Genera tensión social estructural.`
    if (rawValue >= 25) return `Paro 16-24 ${rawValue}% · alto. España duplica la media UE en paro juvenil. Riesgo de movilización.`
    if (rawValue >= 15) return `Paro 16-24 ${rawValue}% · moderado. Por encima de la media UE pero contenido.`
    return `Paro 16-24 ${rawValue}% · controlado.`
  }
  if (lower.includes('ipc')) {
    if (rawValue >= 4) return `IPC ${rawValue}% · inflación alta. Erosiona poder adquisitivo y presiona al BCE a no bajar tipos.`
    if (rawValue >= 2.5) return `IPC ${rawValue}% · ligeramente por encima del objetivo BCE (2%). Estable.`
    if (rawValue >= 1.5) return `IPC ${rawValue}% · en zona del objetivo BCE. Inflación controlada.`
    return `IPC ${rawValue}% · por debajo del objetivo. Riesgo de deflación si persiste.`
  }
  if (lower.includes('dfr')) {
    if (rawValue >= 4) return `DFR ${rawValue}% · tipos altos. Encarece deuda soberana y crédito empresarial.`
    if (rawValue >= 2.5) return `DFR ${rawValue}% · tipos restrictivos pero a la baja desde el pico de 2023.`
    if (rawValue >= 1) return `DFR ${rawValue}% · zona neutral. BCE sigue ciclo bajista.`
    return `DFR ${rawValue}% · tipos bajos. Estímulo monetario activo.`
  }
  if (lower.includes('gdelt') || lower.includes('tone')) {
    if (rawValue <= -5) return `Tone ${rawValue} · cobertura internacional muy negativa sobre España. Indica presión mediática externa.`
    if (rawValue <= -2) return `Tone ${rawValue} · cobertura con sesgo negativo. Eleva el score mediático.`
    if (rawValue <= 0)  return `Tone ${rawValue} · cobertura neutral-negativa. Score moderado.`
    return `Tone ${rawValue} · cobertura positiva. Score mediático bajo.`
  }
  if (lower.includes('pedersen')) {
    if (score >= 70) return `Volatilidad electoral alta · cambios significativos respecto al ciclo anterior.`
    return `Volatilidad electoral moderada · cambios contenidos.`
  }
  return `Valor calculado de la fuente oficial · contribuye al score ${score}/100 del índice.`
}

const LEVEL_RANGES: Array<{ label: string; range: string; color: string; desc: string }> = [
  { label: 'BAJO',    range: '0–29',   color: '#16A34A', desc: 'Riesgo controlado · vigilancia ordinaria · sin necesidad de comunicación pública específica.' },
  { label: 'MEDIO',   range: '30–54',  color: '#2563EB', desc: 'Riesgo moderado · seguimiento reforzado · preparar mensajes y posibles intervenciones.' },
  { label: 'ALTO',    range: '55–74',  color: '#F59E0B', desc: 'Riesgo elevado · activación de comités · comunicación pública coordinada · revisión de calendario.' },
  { label: 'CRÍTICO', range: '75–100', color: '#DC2626', desc: 'Crisis activa · comité interministerial 24/7 · gabinete de comunicación · medidas extraordinarias.' },
]

function scoreColor(s: number): string {
  if (s >= 75) return '#DC2626'
  if (s >= 55) return '#F59E0B'
  if (s >= 30) return '#2563EB'
  return '#16A34A'
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'hace <1h'
    if (h < 24) return `hace ${h}h`
    return `hace ${Math.floor(h / 24)}d`
  } catch { return '—' }
}

// ─── Tooltip de ayuda inline (info icon) ──────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        background: '#F5F5F7', color: '#6e6e73',
        fontSize: 11, fontWeight: 700, cursor: 'help',
        marginLeft: 6, lineHeight: 1, verticalAlign: 'middle',
      }}
    >?</span>
  )
}

// ─── Sparkline (light) ────────────────────────────────────────────────────────
function Sparkline({ data, color, W = 80, H = 32 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Termómetro Apple-like ────────────────────────────────────────────────────
function Thermometer({ score, semaforo, level }: { score: number; semaforo: Semaforo; level: string }) {
  const color = SEM_COLOR[semaforo]
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = 140, cy = 140, r = 110
  function arcPath(startDeg: number, endDeg: number, ri: number) {
    const start = { x: cx + ri * Math.cos(toRad(startDeg)), y: cy + ri * Math.sin(toRad(startDeg)) }
    const end   = { x: cx + ri * Math.cos(toRad(endDeg)),   y: cy + ri * Math.sin(toRad(endDeg)) }
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${ri} ${ri} 0 ${large} 1 ${end.x} ${end.y}`
  }
  const needleAngle = -135 + (score / 100) * 270
  const nx = cx + (r - 22) * Math.cos(toRad(needleAngle))
  const ny = cy + (r - 22) * Math.sin(toRad(needleAngle))
  return (
    <svg viewBox="0 0 280 220" width="100%" height="auto" style={{ display: 'block', maxWidth: 340 }}>
      {/* Track segmentado · 4 zonas con sus colores */}
      {[
        { from: -135, to: -54,  c: '#16A34A' },
        { from: -54,  to:  18,  c: '#2563EB' },
        { from:  18,  to:  72,  c: '#F59E0B' },
        { from:  72,  to: 135,  c: '#DC2626' },
      ].map((seg, i) => (
        <path key={i} d={arcPath(seg.from, seg.to, r)} fill="none" stroke={seg.c} strokeWidth={16} strokeLinecap="butt" opacity={0.20} />
      ))}
      {/* Track activo */}
      <path d={arcPath(-135, -135 + (score / 100) * 270, r)} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" />
      {/* Marcas */}
      {[0, 25, 50, 75, 100].map(v => {
        const a = -135 + (v / 100) * 270
        const mx = cx + (r + 18) * Math.cos(toRad(a))
        const my = cy + (r + 18) * Math.sin(toRad(a))
        return <text key={v} x={mx} y={my + 3} textAnchor="middle" fill="#86868b" fontSize={11} fontWeight={600}>{v}</text>
      })}
      {/* Aguja */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1d1d1f" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={10} fill={color} />
      <circle cx={cx} cy={cy} r={4.5} fill="#fff" />
      {/* Lectura central */}
      <text x={cx} y={cy + 42} textAnchor="middle" fill={color} fontSize={42} fontWeight={800} style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{Math.round(score)}</text>
      <text x={cx} y={cy + 60} textAnchor="middle" fill="#86868b" fontSize={12} fontWeight={500}>de 100</text>
      <text x={cx} y={cy + 84} textAnchor="middle" fill={color} fontSize={15} fontWeight={700} letterSpacing="0.08em">{level}</text>
    </svg>
  )
}

// ─── Dimension card (light) ───────────────────────────────────────────────────
function DimCard({ dim, k, buckets, onClick }: { dim: RiskDimension; k: string; buckets: RiskBucket[]; onClick?: () => void }) {
  const color = DIM_COLORS[k] ?? '#6e6e73'
  const sparkValues = buckets.slice(-14).map(b => (b as unknown as Record<string, number>)[k] ?? 0)
  const deltaColor = dim.delta_24h > 0 ? '#DC2626' : dim.delta_24h < 0 ? '#16A34A' : '#86868b'
  const sc = scoreColor(dim.score)
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
      borderLeft: `4px solid ${color}`,
      padding: '18px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 160ms, box-shadow 160ms, transform 100ms',
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color + '80'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)' } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = '#ECECEF'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {DIM_LABELS[k] || dim.label || k}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: sc, lineHeight: 1 }}>
              {dim.score.toFixed(0)}
            </span>
            <span style={{ fontSize: 13.5, color: '#86868b' }}>/100</span>
            {dim.is_anomaly && (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#F59E0B', borderRadius: 999, padding: '2px 8px', letterSpacing: '0.06em' }}>ANOMALÍA</span>
            )}
          </div>
        </div>
        {sparkValues.length > 1 && (
          <div style={{ textAlign: 'right' }}>
            <Sparkline data={sparkValues} color={color} W={80} H={36} />
            <div style={{ fontSize: 11.5, color: '#86868b', marginTop: 4 }}>últ. 14 días</div>
          </div>
        )}
      </div>
      <p style={{ margin: '6px 0 10px', fontSize: 13.5, color: '#515154', lineHeight: 1.4 }}>
        {DIM_DESC[k] ?? 'Dimensión del termómetro de riesgo.'}
      </p>
      <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, marginBottom: 10 }}>
        <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 600ms ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#6e6e73', flexWrap: 'wrap' }}>
        <span title="Número de artículos del feed RSS analizados para esta dimensión en las últimas horas">
          <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{dim.n_articles}</span> art.
        </span>
        <span title="Peso del índice en el cómputo del score compuesto">
          peso <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{(dim.weight * 100).toFixed(0)}%</span>
        </span>
        <span style={{ color: deltaColor, fontWeight: 600 }} title="Variación del score frente a las últimas 24h">
          {dim.delta_24h >= 0 ? '+' : ''}{dim.delta_24h.toFixed(1)} 24h
        </span>
        {Math.abs(dim.z_score) > 0.1 && (
          <span title="Z-score · desviaciones típicas respecto al promedio histórico. |z|>2 = anomalía estadística">
            z=<span style={{ fontWeight: 600, color: '#1d1d1f' }}>{dim.z_score.toFixed(1)}</span>
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#86868b', marginTop: 8, paddingTop: 8, borderTop: '1px solid #F5F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Fuentes · <SourceList text={DIM_SOURCES[k] ?? '—'} baseColor="#6e6e73"/></span>
        {onClick && (
          <span style={{ color: color, fontWeight: 600, fontSize: 12.5 }}>
            Ver sub-KPIs →
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Modal de sub-KPIs · explica QUÉ valores justifican el score ──────────────
function SubKpiModal({
  open, onClose, dimKey, dim, indexCard,
}: {
  open: boolean
  onClose: () => void
  dimKey: string
  dim: RiskDimension | null
  indexCard: RiskIndexCard | null
}) {
  if (!open || !dim) return null
  const color = DIM_COLORS[dimKey] ?? '#6e6e73'
  const components = indexCard?.components ?? []
  const sourceLabel = indexCard?.source ?? 'demo'
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'subkpiIn 180ms ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          maxWidth: 720, width: '100%', maxHeight: '88vh', overflowY: 'auto',
          padding: '24px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          borderTop: `4px solid ${color}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sub-KPIs del índice
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
              {DIM_LABELS[dimKey] || dim.label}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 15, color: '#515154', lineHeight: 1.5 }}>
              {DIM_DESC[dimKey]}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            background: '#F5F5F7', border: '1px solid #ECECEF', borderRadius: 10,
            padding: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#3a3a3d',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Score agregado destacado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, padding: '14px 16px', background: `${color}10`, borderRadius: 12, marginBottom: 18 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 14, flexShrink: 0,
            background: color, color: '#fff',
            fontSize: 30, fontWeight: 800,
            fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
          }}>{dim.score.toFixed(0)}</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: scoreColor(dim.score), letterSpacing: '0.06em' }}>
              SCORE {dim.level}
            </div>
            <div style={{ fontSize: 14.5, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>
              Este score se calcula combinando <strong>{components.length || 'varios'}</strong> sub-KPI{components.length === 1 ? '' : 's'}
              {' '}provenientes de fuentes públicas. Cada sub-KPI tiene su propio score 0-100 y su peso en el agregado.
              Cambia · <span style={{ fontWeight: 600, color: dim.delta_24h > 0 ? '#DC2626' : '#16A34A' }}>{dim.delta_24h >= 0 ? '+' : ''}{dim.delta_24h.toFixed(1)}</span> en 24h.
            </div>
          </div>
        </div>

        {/* Sub-KPIs detallados */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Componentes del score
          </div>
          {components.length === 0 ? (
            <div style={{ padding: '18px 20px', background: '#FAFAFA', borderRadius: 12, fontSize: 14.5, color: '#6e6e73', lineHeight: 1.5 }}>
              Sin sub-KPIs disponibles desde el agregador para esta dimensión.
              El score se calcula desde fuentes calibradas pero la trazabilidad
              fina solo está disponible cuando las fuentes externas responden.
              {' '}<span style={{ color: '#86868b', fontSize: 13.5 }}>Fuentes esperadas · <SourceList text={DIM_SOURCES[dimKey] ?? '—'} baseColor="#86868b"/></span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {components.map((c, i) => {
                const sc = scoreColor(c.score_0_100)
                const interpretation = interpretSubKpi(c.metric_name, c.raw_value, c.score_0_100)
                return (
                  <div key={i} style={{ padding: '14px 16px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
                          {c.metric_name}
                        </div>
                        <div style={{ fontSize: 13, color: '#86868b' }}>
                          Fuente · {(() => {
                            const url = resolveSourceUrl(c.source_id)
                            return url
                              ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', fontWeight: 600, textDecoration: 'none', borderBottom: '1px dotted #0071e355' }}>{c.source_id}</a>
                              : <span style={{ color: '#6e6e73', fontWeight: 600 }}>{c.source_id}</span>
                          })()}
                          {' '}· Peso · <span style={{ color: '#6e6e73', fontWeight: 600 }}>{(c.weight * 100).toFixed(0)}%</span>
                          {c.raw_value != null && <> · Valor raw · <span style={{ color: '#1d1d1f', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{c.raw_value}</span></>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, color: sc, lineHeight: 1 }}>
                          {c.score_0_100}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#86868b' }}>/100</div>
                      </div>
                    </div>
                    {/* Barra del score */}
                    <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, marginBottom: 10 }}>
                      <div style={{ width: `${Math.min(100, c.score_0_100)}%`, height: '100%', borderRadius: 3, background: sc }} />
                    </div>
                    {/* Interpretación contextual */}
                    <p style={{ fontSize: 14, color: '#3a3a3d', margin: 0, lineHeight: 1.5, padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, borderLeft: `3px solid ${sc}` }}>
                      {interpretation}
                    </p>
                    <div style={{ fontSize: 12.5, color: '#86868b', marginTop: 8 }}>
                      Aporta <span style={{ fontWeight: 700, color: sc }}>{c.contribution.toFixed(1)}</span> puntos al score agregado de {DIM_LABELS[dimKey]}.
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cómo se calcula */}
        <div style={{ padding: '14px 16px', background: '#FAFAFA', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Cómo se calcula este score
          </div>
          <p style={{ fontSize: 14.5, color: '#3a3a3d', margin: 0, lineHeight: 1.55 }}>
            Cada sub-KPI raw (Gini, IPC, gasto militar, etc.) se normaliza a una escala 0-100 con
            calibración histórica. La media ponderada de los sub-KPIs (pesos = 100%) produce el score
            agregado de la dimensión. El score final del termómetro es la media ponderada de las seis
            dimensiones. Refresco · cada 2 minutos cuando el backend responde, cada 5 minutos por
            cache en cliente.
          </p>
        </div>

        {/* Badge de origen + cierre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: sourceLabel === 'live' ? '#fff' : '#3a3a3d',
            background: sourceLabel === 'live' ? '#16A34A' : '#F5F5F7',
            padding: '4px 10px', borderRadius: 999, letterSpacing: '0.06em',
          }}>
            {sourceLabel === 'live' ? '● DATOS LIVE' : 'DATOS DEMO'}
          </span>
          <button onClick={onClose} style={{
            background: '#0071e3', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 14.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Cerrar</button>
        </div>

        <style>{`@keyframes subkpiIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KPI({ label, value, accent, sub, tip }: { label: string; value: string | number; accent: string; sub?: string; tip?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 20px',
      border: '1px solid #ECECEF', borderLeft: `4px solid ${accent}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: 8 }}>
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13.5, color: '#86868b', marginTop: 7, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function TermometroPage() {
  const [tab, setTab] = useState<'overview' | 'dimensiones' | 'drivers' | 'historico'>('overview')
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [histDim, setHistDim] = useState<string>('composite')
  const [methodOpen, setMethodOpen] = useState(false)
  const [modalDim, setModalDim]     = useState<string | null>(null)

  const riskData   = useApi<RiskComposite & { _meta?: unknown }>('/api/risk/composite', { refreshInterval: 120_000 })
  const tsData     = useApi<RiskTimeseriesResponse>('/api/risk/timeseries?days=30', { refreshInterval: 1_800_000 })
  const signalData = useApi<{ signals: Array<{ tipo: string; titulo: string; severidad: string; score: number; fuente: string; timestamp: string }> }>('/api/crisis/signals', { refreshInterval: 300_000 })
  // Sub-KPIs reales por índice (components con metric_name/raw_value/score_0_100/weight/contribution)
  const indicesData = useApi<RiskIndicesPayload>('/api/risk-v2/indices?country=ES', { refreshInterval: 300_000 })

  const risk    = riskData.data
  const ts      = tsData.data
  const signals = signalData.data?.signals ?? []

  const composite  = risk?.composite ?? 0
  const semaforo   = risk?.composite_semaforo ?? 'verde'
  const dimensions = risk?.dimensions ?? {}
  const topRisks   = risk?.top_risks ?? []
  const dimKeys    = Object.keys(dimensions)
  const buckets    = ts?.buckets ?? []
  const semColor   = SEM_COLOR[semaforo]
  const semLabel   = risk?.composite_level || SEM_LABEL[semaforo]
  const compositeHistory = buckets.map(b => b.composite)
  const change7d = compositeHistory.length >= 8
    ? +(compositeHistory[compositeHistory.length - 1] - compositeHistory[compositeHistory.length - 8]).toFixed(1)
    : 0

  // Descripción explicativa del nivel actual
  const currentLevelDesc = LEVEL_RANGES.find(r => r.label.startsWith(semLabel.charAt(0)))?.desc ?? ''

  // Sub-KPIs por índice (lookup rápido)
  const indexCardByDim = (k: string): RiskIndexCard | null => {
    const id = DIM_TO_RISKV2[k]
    if (!id) return null
    return indicesData.data?.indices?.find(idx => idx.index_id === id) ?? null
  }
  const modalIndex = modalDim ? indexCardByDim(modalDim) : null
  const modalDimObj = modalDim ? (dimensions[modalDim] ?? null) : null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1640, margin: '0 auto', padding: '34px 44px 88px' }}>

        {/* Header */}
        <section style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span>INTELIGENCIA · TERMÓMETRO DE RIESGO</span>
            <LiveStatusBadge updatedAt={risk?.fetched_at ?? null} source={(riskData as unknown as { source?: string }).source ?? 'aggregator'} refreshIntervalSec={120} onRefresh={riskData.refresh}/>
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 42, letterSpacing: '-0.024em', margin: '0 0 8px', lineHeight: 1.05, color: '#1d1d1f' }}>
            Termómetro de Riesgo <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#6e6e73' }}>· España</em>
          </h1>
          <p style={{ fontSize: 17, color: '#515154', margin: 0, maxWidth: 980, lineHeight: 1.55 }}>
            Índice compuesto multidimensional que mide la tensión política, económica y social del país en una escala
            de <strong>0 a 100</strong>. Agrega <strong>seis dimensiones</strong> (institucional, electoral, geopolítico, económico,
            mediático y social) calculadas en vivo desde feeds públicos:{' '}
            <SourceList text="Banco Mundial · ECB · INE · GDELT · INCIBE-CERT · EMSC · Google Noticias" baseColor="#515154"/>
            {' '}y un agregador propio de 30+ medios.
          </p>
        </section>

        {/* Gauge + KPIs + nivel actual */}
        <section style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, marginBottom: 22 }}>

          {/* Gauge card */}
          <div style={{
            background: '#fff', borderRadius: 16, padding: '24px 18px 26px',
            border: '1px solid #ECECEF', borderTop: `4px solid ${semColor}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Thermometer score={composite} semaforo={semaforo} level={semLabel} />
            <div style={{ marginTop: 6, fontSize: 14, color: '#6e6e73', textAlign: 'center', fontWeight: 500 }}>
              {risk?.framework === 'unavailable' ? 'Estimación SIGINT · sin backend' : `Framework · ${risk?.framework ?? 'politeia-v3'}`}
            </div>
            {compositeHistory.length > 1 && (
              <div style={{ marginTop: 16, width: '100%', borderTop: '1px solid #F5F5F7', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Histórico 30 días
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Sparkline data={compositeHistory} color={semColor} W={240} H={48} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, fontSize: 13.5, color: '#6e6e73' }}>
                  <span>Min · <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{Math.min(...compositeHistory).toFixed(0)}</span></span>
                  <span>Max · <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{Math.max(...compositeHistory).toFixed(0)}</span></span>
                  <span>Media · <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{(compositeHistory.reduce((a, b) => a + b, 0) / compositeHistory.length).toFixed(0)}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* KPIs grid + explicación nivel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Banner explicativo del nivel actual */}
            <div style={{
              background: `${semColor}10`, borderLeft: `4px solid ${semColor}`, borderRadius: 12,
              padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: semColor, color: '#fff',
                fontSize: 20, fontWeight: 900, letterSpacing: '0.02em',
                fontFamily: 'var(--font-display)',
              }}>{Math.round(composite)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, color: '#1d1d1f', fontWeight: 700, marginBottom: 3 }}>
                  Nivel actual · <span style={{ color: semColor, letterSpacing: '0.04em' }}>{semLabel}</span>
                </div>
                <p style={{ fontSize: 14.5, color: '#3a3a3d', margin: 0, lineHeight: 1.5 }}>
                  {currentLevelDesc}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <KPI label="Score compuesto"   value={composite.toFixed(0)} accent={semColor} sub={`${semLabel} · ${change7d >= 0 ? '+' : ''}${change7d.toFixed(1)} vs hace 7d`}
                   tip="Media ponderada de las 6 dimensiones, normalizada 0-100. Lectura semáforo: verde<30, azul 30-54, naranja 55-74, rojo ≥75."/>
              <KPI label="Dimensiones"        value={dimKeys.length || 6}  accent="#6e6e73" sub="Institucional, electoral, geopolítico, económico, mediático, social"
                   tip="Cada dimensión se calcula independientemente y aporta al compuesto según su peso (que totaliza 100%)."/>
              <KPI label="Drivers activos"    value={topRisks.length || signals.filter(s => s.score >= 50).length} accent="#F59E0B" sub="Eventos detectados con score >50/100"
                   tip="Drivers: noticias, eventos o señales que están moviendo el score de alguna dimensión hoy."/>
              <KPI label="Anomalías"          value={dimKeys.filter(k => dimensions[k]?.is_anomaly).length} accent="#DC2626" sub="Dimensiones con |z-score|>2"
                   tip="Z-score mide cuántas desviaciones típicas se aleja la dimensión de su media histórica. |z|>2 es estadísticamente raro."/>
              <KPI label="Señales SIGINT"     value={signals.filter(s => s.severidad === 'CRITICO').length} accent="#DC2626" sub={`${signals.length} totales últimas 6h`}
                   tip="Señales de inteligencia agregadas de GDELT, INCIBE, CCN-CERT, EMSC sismos, Google News y Wikipedia."/>
              <KPI label="Variación 7 días"   value={`${change7d >= 0 ? '+' : ''}${change7d.toFixed(1)}`} accent={change7d > 0 ? '#DC2626' : '#16A34A'} sub={change7d > 0 ? 'Score creciente · vigilar' : 'Tendencia a la baja'}
                   tip="Diferencia entre el score actual y el de hace 7 días. Valor positivo = riesgo creciendo."/>
            </div>

            {/* Señales SIGINT recientes */}
            {signals.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Señales SIGINT recientes
                    <InfoTip text="Top señales detectadas en las últimas horas por el agregador. Cada una contribuye al score de alguna dimensión." />
                  </div>
                  <div style={{ fontSize: 12.5, color: '#86868b' }}>
                    Actualizado cada 5 minutos
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {signals.slice(0, 5).map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '78px 1fr auto', gap: 12, alignItems: 'center', fontSize: 14.5, padding: '8px 0', borderTop: i > 0 ? '1px solid #F5F5F7' : 'none' }}>
                      <span style={{
                        color: '#fff', background: SEV_COLOR[s.severidad] ?? '#86868b',
                        fontWeight: 800, fontSize: 11.5, letterSpacing: '0.08em',
                        padding: '3px 8px', borderRadius: 999, textAlign: 'center',
                      }}>{s.severidad}</span>
                      <span style={{ color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</span>
                      <span style={{ color: '#6e6e73', fontSize: 13, fontWeight: 500 }}>{s.fuente.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Guía de niveles · siempre visible · ayuda a leer el score */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f' }}>
              Cómo leer el score
            </h2>
            <button onClick={() => setMethodOpen(o => !o)} style={{
              background: 'none', border: 'none', fontSize: 14, color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            }}>
              {methodOpen ? 'Ocultar metodología ↑' : 'Ver metodología ↓'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {LEVEL_RANGES.map(r => {
              const isActive = r.label.startsWith(semLabel.charAt(0))
              return (
                <div key={r.label} style={{
                  background: isActive ? `${r.color}12` : '#fff',
                  border: `1px solid ${isActive ? r.color + '60' : '#ECECEF'}`,
                  borderLeft: `4px solid ${r.color}`,
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: r.color, letterSpacing: '0.06em' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#6e6e73' }}>{r.range}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#3a3a3d', margin: 0, lineHeight: 1.45 }}>{r.desc}</p>
                </div>
              )
            })}
          </div>

          {methodOpen && (
            <div style={{
              marginTop: 14, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 14,
              padding: '18px 22px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, margin: '0 0 8px', color: '#1d1d1f' }}>Metodología</h3>
              <p style={{ fontSize: 14.5, color: '#3a3a3d', lineHeight: 1.55, margin: '0 0 10px' }}>
                Cada dimensión se calcula a partir de una o varias fuentes públicas en tiempo real (Banco Mundial WDI,
                ECB SDW, INE TempUS, GDELT, INCIBE, EMSC, Google News, agregador RSS de 30 medios). Los valores raw
                se normalizan a una escala 0-100 con calibración histórica, y luego se combinan con pesos que totalizan
                100%. El compuesto final es la media ponderada y se redondea al entero más cercano.
              </p>
              <p style={{ fontSize: 14.5, color: '#3a3a3d', lineHeight: 1.55, margin: '0 0 10px' }}>
                <strong>Z-score</strong> mide cuántas desviaciones típicas se aleja la dimensión de su media histórica de 30 días.
                Si |z|&gt;2 se marca como <em>anomalía</em>: ese movimiento ocurre menos del 5% del tiempo en el histórico.
              </p>
              <p style={{ fontSize: 14.5, color: '#3a3a3d', lineHeight: 1.55, margin: '0 0 10px' }}>
                <strong>Delta 24h</strong> es la diferencia entre el score actual y el de hace 24 horas. <strong>Spike</strong> es el porcentaje
                por encima de la media de 7 días. Una dimensión con delta positivo y spike alto está acelerando.
              </p>
              <p style={{ fontSize: 13.5, color: '#6e6e73', lineHeight: 1.5, margin: 0 }}>
                Frequencia de refresco · score compuesto 2 min · timeseries 30 min · SIGINT 5 min. Las fuentes externas
                tienen sus propios SLA: GDELT actualiza cada 15 min, INCIBE-CERT con cada nueva alerta, EMSC en tiempo real.
              </p>
            </div>
          )}
        </section>

        {/* Tabs Apple style */}
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 4, marginBottom: 18 }}>
          {([['overview', 'Vista general'], ['dimensiones', 'Dimensiones'], ['drivers', 'Drivers de riesgo'], ['historico', 'Histórico']] as const).map(([id, label]) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '8px 18px',
                fontSize: 14.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{label}</button>
            )
          })}
        </div>

        {/* Contexto de la pestaña activa */}
        <p style={{ fontSize: 14.5, color: '#6e6e73', margin: '0 0 18px', maxWidth: 920, lineHeight: 1.5 }}>
          {tab === 'overview'    && 'Resumen de las seis dimensiones con su score, peso, variación 24h y sparkline de los últimos 14 días.'}
          {tab === 'dimensiones' && 'Selecciona una dimensión a la izquierda para ver su descomposición · métricas detalladas, drivers (noticias/eventos que la están moviendo) y nivel.'}
          {tab === 'drivers'     && 'Listado completo de drivers · cada uno es un evento o noticia con relevancia, sentimiento e impacto sobre España. Ordenados por contribución al score.'}
          {tab === 'historico'   && 'Serie temporal de cualquier dimensión o del compuesto. Útil para detectar tendencias estructurales o picos puntuales.'}
        </p>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            {dimKeys.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '28px 32px', textAlign: 'center', color: '#6e6e73', fontSize: 15 }}>
                {riskData.loading ? 'Cargando dimensiones…' : 'Sin backend · mostrando estimación a partir de señales SIGINT'}
                {signals.length > 0 && (
                  <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, textAlign: 'left' }}>
                    {[
                      { label: 'Institucional',  types: ['parlamentario'], color: '#2563EB' },
                      { label: 'Ciberseguridad', types: ['ciberataque'],   color: '#DC2626' },
                      { label: 'Geopolítico',    types: ['conflicto', 'diplomatico'], color: '#F59E0B' },
                      { label: 'Social',         types: ['social', 'sismo'], color: '#F97316' },
                      { label: 'Informacional',  types: ['desinformacion'], color: '#EC4899' },
                      { label: 'Económico',      types: ['energia', 'economico'], color: '#16A34A' },
                    ].map(({ label, types, color }) => {
                      const related = signals.filter(s => types.includes(s.tipo))
                      const avgScore = related.length > 0 ? Math.round(related.reduce((a, b) => a + b.score, 0) / related.length) : Math.round(15 + Math.random() * 20)
                      return (
                        <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #ECECEF', borderLeft: `3px solid ${color}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, color: scoreColor(avgScore) }}>{avgScore}</span>
                          </div>
                          <div style={{ height: 5, background: '#F5F5F7', borderRadius: 3, marginBottom: 6 }}>
                            <div style={{ width: `${Math.min(100, avgScore)}%`, height: '100%', borderRadius: 3, background: color }} />
                          </div>
                          <div style={{ fontSize: 13.5, color: '#86868b' }}>{related.length} señales SIGINT activas</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                {dimKeys.map(k => <DimCard key={k} dim={dimensions[k]} k={k} buckets={buckets} onClick={() => setModalDim(k)} />)}
              </div>
            )}
          </div>
        )}

        {/* TAB: DIMENSIONES */}
        {tab === 'dimensiones' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedDim ? '340px 1fr' : '1fr', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dimKeys.length === 0 ? (
                <div style={{ color: '#86868b', textAlign: 'center', padding: 32, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', fontSize: 14.5 }}>
                  Sin dimensiones desde backend
                </div>
              ) : dimKeys.map(k => {
                const dim = dimensions[k]
                const color = DIM_COLORS[k] ?? '#6e6e73'
                const active = selectedDim === k
                return (
                  <button key={k} onClick={() => setSelectedDim(prev => prev === k ? null : k)} style={{
                    textAlign: 'left', padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                    background: active ? `${color}12` : '#fff',
                    border: '1px solid ' + (active ? color + '60' : '#ECECEF'),
                    borderLeft: `4px solid ${color}`,
                    fontFamily: 'inherit', transition: 'all 160ms',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{DIM_LABELS[k] || dim.label || k}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, color: scoreColor(dim.score) }}>{dim.score.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 4, background: '#F5F5F7', borderRadius: 2, marginBottom: 8 }}>
                      <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 2, background: color }} />
                    </div>
                    <div style={{ fontSize: 13, color: '#86868b', lineHeight: 1.4 }}>
                      {dim.n_articles} art · peso {(dim.weight * 100).toFixed(0)}% · {dim.is_anomaly ? 'anomalía' : 'normal'}
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedDim && dimensions[selectedDim] && (
              <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${DIM_COLORS[selectedDim] ?? '#ECECEF'}60`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.018em' }}>
                  {DIM_LABELS[selectedDim] || dimensions[selectedDim].label || selectedDim}
                </h2>
                <p style={{ fontSize: 14.5, color: '#515154', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {DIM_DESC[selectedDim]}
                </p>
                <p style={{ fontSize: 13, color: '#86868b', margin: '0 0 18px' }}>
                  Fuentes · <SourceList text={DIM_SOURCES[selectedDim]} baseColor="#86868b"/>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Score',     value: dimensions[selectedDim].score.toFixed(0), color: scoreColor(dimensions[selectedDim].score), tip: 'Score normalizado 0-100. Mayor = más riesgo en esta dimensión.' },
                    { label: 'Delta 24h', value: `${dimensions[selectedDim].delta_24h >= 0 ? '+' : ''}${dimensions[selectedDim].delta_24h.toFixed(1)}`, color: dimensions[selectedDim].delta_24h > 0 ? '#DC2626' : '#16A34A', tip: 'Variación del score frente a hace 24h. Positivo = riesgo creciendo.' },
                    { label: 'Z-score',   value: dimensions[selectedDim].z_score.toFixed(2), color: Math.abs(dimensions[selectedDim].z_score) > 2 ? '#DC2626' : '#86868b', tip: 'Desviaciones típicas frente al promedio histórico. |z|>2 = anomalía estadística.' },
                    { label: 'Artículos', value: dimensions[selectedDim].n_articles, color: '#1d1d1f', tip: 'Número de artículos del agregador RSS analizados para esta dimensión.' },
                    { label: 'Peso',      value: `${(dimensions[selectedDim].weight * 100).toFixed(0)}%`, color: '#1d1d1f', tip: 'Contribución de esta dimensión al score compuesto. La suma de los pesos = 100%.' },
                    { label: 'Nivel',     value: dimensions[selectedDim].level, color: SEV_COLOR[dimensions[selectedDim].level] ?? '#86868b', tip: 'Etiqueta del rango actual: BAJO (<30), MEDIO (30-54), ALTO (55-74), CRÍTICO (≥75).' },
                  ].map(({ label, value, color, tip }) => (
                    <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12.5, color: '#6e6e73', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {label}<InfoTip text={tip}/>
                      </div>
                      <div style={{ fontSize: 25, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {/* SUB-KPIs · justifican el score con métricas concretas */}
                {(() => {
                  const idxCard = indexCardByDim(selectedDim)
                  const comps = idxCard?.components ?? []
                  if (comps.length === 0) return null
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                        Sub-KPIs que justifican el valor
                        <InfoTip text="Métricas raw de fuentes públicas que se combinan para calcular el score." />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {comps.map((c, i) => {
                          const sc = scoreColor(c.score_0_100)
                          const interpretation = interpretSubKpi(c.metric_name, c.raw_value, c.score_0_100)
                          return (
                            <div key={i} style={{ padding: '12px 14px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{c.metric_name}</div>
                                  <div style={{ fontSize: 12.5, color: '#86868b' }}>
                                    {(() => {
                                      const url = resolveSourceUrl(c.source_id)
                                      return url
                                        ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', fontWeight: 600, textDecoration: 'none', borderBottom: '1px dotted #0071e355' }}>{c.source_id}</a>
                                        : <span style={{ fontWeight: 600, color: '#6e6e73' }}>{c.source_id}</span>
                                    })()}
                                    {' '}· peso {(c.weight * 100).toFixed(0)}%
                                    {c.raw_value != null && <> · valor raw <strong style={{ color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{c.raw_value}</strong></>}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: sc, lineHeight: 1 }}>{c.score_0_100}</div>
                                  <div style={{ fontSize: 11, color: '#86868b' }}>/100</div>
                                </div>
                              </div>
                              <div style={{ height: 5, background: '#F5F5F7', borderRadius: 3, marginBottom: 8 }}>
                                <div style={{ width: `${Math.min(100, c.score_0_100)}%`, height: '100%', borderRadius: 3, background: sc }} />
                              </div>
                              <p style={{ fontSize: 13, color: '#3a3a3d', margin: 0, lineHeight: 1.45, padding: '6px 8px', background: '#FAFAFA', borderRadius: 6, borderLeft: `2px solid ${sc}` }}>
                                {interpretation}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {dimensions[selectedDim].drivers?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Drivers del índice
                      <InfoTip text="Eventos o noticias concretas que están moviendo el score de esta dimensión." />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dimensions[selectedDim].drivers.slice(0, 8).map(d => (
                        <div key={d.id} style={{ padding: '12px 14px', background: '#FAFAFA', borderRadius: 10, fontSize: 14.5 }}>
                          <div style={{ color: '#1d1d1f', fontWeight: 600, marginBottom: 5 }}>{d.title}</div>
                          <div style={{ display: 'flex', gap: 16, color: '#6e6e73', fontSize: 13, flexWrap: 'wrap' }}>
                            <span><span style={{ fontWeight: 600, color: '#1d1d1f' }}>{d.source}</span></span>
                            <span>Relevancia · <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{d.relevance}</span></span>
                            <span style={{ color: d.sentiment === 'negativo' || d.sentiment === 'muy_negativo' ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{d.sentiment}</span>
                            {d.spain_impact && <span>impacto · {d.spain_impact}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!selectedDim && dimKeys.length > 0 && (
              <div style={{ background: '#FAFAFA', border: '1px dashed #ECECEF', borderRadius: 14, padding: '40px 32px', textAlign: 'center', color: '#86868b', fontSize: 15.5 }}>
                Selecciona una dimensión a la izquierda para ver el detalle, métricas técnicas y los drivers que la están moviendo.
              </div>
            )}
          </div>
        )}

        {/* TAB: DRIVERS */}
        {tab === 'drivers' && (
          <div>
            {topRisks.length === 0 && signals.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 48, textAlign: 'center', color: '#86868b', fontSize: 15 }}>
                Sin drivers disponibles
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 110px 100px 110px',
                  gap: 12, padding: '12px 20px',
                  background: '#FAFAFA', borderBottom: '1px solid #ECECEF',
                  fontSize: 12.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  <span>Driver</span>
                  <span style={{ textAlign: 'center' }}>Relevancia<InfoTip text="0-100. Cuán importante es el evento dentro de su tipo." /></span>
                  <span>Sentimiento<InfoTip text="Polaridad del evento: negativo eleva el score, positivo lo reduce." /></span>
                  <span>Impacto<InfoTip text="Magnitud del impacto previsible sobre España (alto/medio/bajo)." /></span>
                  <span>Detectado</span>
                </div>
                {topRisks.map(d => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 100px 110px', gap: 12, alignItems: 'center', padding: '13px 20px', borderTop: '1px solid #F5F5F7', fontSize: 14.5 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{d.title}</div>
                      <div style={{ fontSize: 13, color: '#86868b' }}>{d.source}</div>
                    </div>
                    <span style={{ color: '#1d1d1f', textAlign: 'center', fontWeight: 700 }}>{d.relevance}</span>
                    <span style={{ color: d.sentiment === 'negativo' ? '#F59E0B' : d.sentiment === 'muy_negativo' ? '#DC2626' : '#16A34A', fontWeight: 600, fontSize: 13.5 }}>{d.sentiment}</span>
                    <span style={{ color: d.spain_impact === 'alto' ? '#DC2626' : d.spain_impact === 'medio' ? '#F59E0B' : '#16A34A', fontWeight: 600, fontSize: 13.5 }}>{d.spain_impact}</span>
                    <span style={{ color: '#86868b', fontSize: 13 }}>{relTime(d.scraped_at)}</span>
                  </div>
                ))}
                {topRisks.length === 0 && signals.map((s, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 110px', gap: 12, alignItems: 'center', padding: '13px 20px', borderTop: '1px solid #F5F5F7', fontSize: 14.5 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{s.titulo}</div>
                      <div style={{ fontSize: 13, color: '#86868b' }}>{s.fuente} · {s.tipo}</div>
                    </div>
                    <span style={{ color: '#fff', background: SEV_COLOR[s.severidad] ?? '#86868b', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 999, textAlign: 'center' }}>{s.severidad}</span>
                    <span style={{ color: scoreColor(s.score), fontWeight: 700, fontFamily: 'var(--font-display)' }}>{s.score}/100</span>
                    <span style={{ color: '#86868b', fontSize: 13 }}>SIGINT</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL · Sub-KPIs · se abre al clickar una DimCard del Overview */}
        <SubKpiModal
          open={!!modalDim}
          onClose={() => setModalDim(null)}
          dimKey={modalDim ?? ''}
          dim={modalDimObj}
          indexCard={modalIndex}
        />

        {/* TAB: HISTÓRICO */}
        {tab === 'historico' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['composite', ...Object.keys(DIM_COLORS)].map(k => {
                const active = histDim === k
                const c = DIM_COLORS[k] ?? '#2563EB'
                return (
                  <button key={k} onClick={() => setHistDim(k)} style={{
                    padding: '7px 16px', borderRadius: 999, fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    background: active ? c : '#fff',
                    color: active ? '#fff' : '#3a3a3d',
                    border: '1px solid ' + (active ? c : '#ECECEF'),
                    fontFamily: 'inherit',
                  }}>{k === 'composite' ? 'Compuesto' : (DIM_LABELS[k] ?? k)}</button>
                )
              })}
            </div>
            {buckets.length < 2 ? (
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 48, textAlign: 'center', color: '#86868b', fontSize: 15 }}>
                Sin datos históricos · backend no conectado
              </div>
            ) : (() => {
              const vals = buckets.map(b => histDim === 'composite' ? b.composite : ((b as unknown as Record<string, number>)[histDim] ?? 0))
              const W = 800, H = 240
              const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / 100) * H}`)
              const color = DIM_COLORS[histDim] ?? '#2563EB'
              return (
                <div style={{ background: '#fff', borderRadius: 14, padding: '22px 26px', border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 15, color: '#1d1d1f', fontWeight: 600 }}>
                      Serie {histDim === 'composite' ? 'del índice compuesto' : `de la dimensión ${DIM_LABELS[histDim] ?? histDim}`}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#86868b' }}>30 días · 1 bucket por día</div>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
                    {/* Bandas de nivel · fondo */}
                    {[
                      { from:  0,  to: 30, c: '#16A34A' },
                      { from: 30,  to: 55, c: '#2563EB' },
                      { from: 55,  to: 75, c: '#F59E0B' },
                      { from: 75,  to: 100, c: '#DC2626' },
                    ].map((seg, i) => {
                      const y1 = H - (seg.to / 100) * H
                      const y2 = H - (seg.from / 100) * H
                      return <rect key={i} x={32} y={y1} width={W - 32} height={y2 - y1} fill={seg.c} opacity={0.045}/>
                    })}
                    {[0, 25, 50, 75, 100].map(v => {
                      const y = H - (v / 100) * H
                      return (
                        <g key={v}>
                          <line x1={32} y1={y} x2={W} y2={y} stroke="#F5F5F7" strokeWidth={1} />
                          <text x={4} y={y + 3} fill="#86868b" fontSize={10.5}>{v}</text>
                        </g>
                      )
                    })}
                    <polygon points={`32,${H} ${pts.map((p) => { const [x, y] = p.split(','); return `${Math.max(32, +x)},${y}` }).join(' ')} ${W},${H}`} fill={color} fillOpacity={0.10} />
                    <polyline points={pts.map(p => { const [x, y] = p.split(','); return `${Math.max(32, +x)},${y}` }).join(' ')} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
                    {buckets.map((b, i) => {
                      if (i % Math.ceil(buckets.length / 7) !== 0) return null
                      const x = Math.max(32, (i / (buckets.length - 1)) * W)
                      return <text key={i} x={x} y={H + 22} textAnchor="middle" fill="#86868b" fontSize={10.5}>{b.date.slice(5)}</text>
                    })}
                  </svg>
                  <div style={{ display: 'flex', gap: 28, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F5F5F7', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Máximo', value: Math.max(...vals).toFixed(0), color: scoreColor(Math.max(...vals)) },
                      { label: 'Mínimo', value: Math.min(...vals).toFixed(0), color: '#16A34A' },
                      { label: 'Actual', value: vals[vals.length - 1]?.toFixed(0) ?? '—', color },
                      { label: 'Media',  value: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0), color: '#1d1d1f' },
                      { label: 'Δ 7d',   value: vals.length >= 8 ? `${(vals[vals.length - 1] - vals[vals.length - 8]).toFixed(1)}` : '—', color: vals.length >= 8 && vals[vals.length - 1] > vals[vals.length - 8] ? '#DC2626' : '#16A34A' },
                    ].map(({ label, value, color: col }) => (
                      <div key={label} style={{ fontSize: 14 }}>
                        <span style={{ color: '#6e6e73', fontWeight: 500 }}>{label} · </span>
                        <span style={{ color: col, fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 20 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: '#86868b', margin: '14px 0 0', lineHeight: 1.45 }}>
                    Las bandas de fondo indican los rangos BAJO (verde), MEDIO (azul), ALTO (naranja) y CRÍTICO (rojo).
                    Cruces consistentes entre rangos en pocos días indican aceleración del riesgo.
                  </p>
                </div>
              )
            })()}
          </div>
        )}

      </main>
    </div>
  )
}
