'use client'
import { useState, useMemo, useRef } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ── projection helpers ────────────────────────────────────────────────────────
function projX(lon: number, W = 900) { return ((lon + 180) / 360) * W }
function projY(lat: number, H = 460) { return ((90 - lat) / 180) * H }

const ES_LAT_MIN = 35.9, ES_LAT_MAX = 43.8, ES_LON_MIN = -9.3, ES_LON_MAX = 4.3
function esProjX(lon: number, W = 560) { return ((lon - ES_LON_MIN) / (ES_LON_MAX - ES_LON_MIN)) * W }
function esProjY(lat: number, H = 380) { return ((ES_LAT_MAX - lat) / (ES_LAT_MAX - ES_LAT_MIN)) * H }

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

// ── continent SVG paths (equirectangular 900×460) ─────────────────────────────
const AFRICA_D =
  'M 432 125 L 455 122 L 478 127 L 513 135 L 527 138 L 535 145 L 555 168 L 563 200 L 577 202 ' +
  'L 572 210 L 555 228 L 548 250 L 540 270 L 530 288 L 495 318 L 482 296 L 473 263 L 465 240 ' +
  'L 460 228 L 458 220 L 448 215 L 442 220 L 438 218 L 430 215 L 415 200 L 408 195 L 408 174 ' +
  'L 414 160 L 425 145 Z'

const EUROPE_D =
  'M 428 137 L 428 118 L 432 107 L 443 97 L 448 87 L 443 79 L 450 68 L 462 62 L 477 56 ' +
  'L 495 51 L 510 48 L 522 49 L 527 60 L 522 67 L 510 72 L 498 82 L 497 95 L 503 110 ' +
  'L 513 118 L 513 125 L 505 122 L 495 117 L 487 120 L 483 115 L 475 122 L 468 128 ' +
  'L 457 125 L 453 122 L 440 122 L 435 130 Z'

const NAMERICA_D =
  'M 25 90 L 48 57 L 75 45 L 95 42 L 143 42 L 175 45 L 222 56 L 265 62 L 292 72 L 318 105 ' +
  'L 310 115 L 290 117 L 268 135 L 252 162 L 240 170 L 248 180 L 235 185 L 222 185 L 215 175 ' +
  'L 208 165 L 195 162 L 175 168 L 162 145 L 155 138 L 143 108 L 128 88 L 75 77 L 48 65 Z'

const SAMERICA_D =
  'M 245 195 L 272 190 L 310 195 L 358 222 L 365 240 L 345 270 L 330 295 L 308 325 ' +
  'L 290 355 L 282 371 L 277 360 L 268 335 L 263 302 L 255 268 L 248 230 L 243 210 Z'

const ASIA_D =
  'M 515 125 L 535 118 L 558 118 L 575 122 L 595 115 L 622 108 L 653 95 L 692 88 L 720 75 ' +
  'L 755 68 L 778 68 L 803 80 L 810 92 L 797 102 L 775 110 L 752 118 L 740 135 L 750 148 ' +
  'L 765 162 L 770 182 L 750 202 L 730 218 L 715 218 L 700 228 L 685 222 L 668 215 ' +
  'L 650 218 L 637 215 L 625 205 L 617 212 L 603 212 L 592 205 L 582 200 L 575 195 ' +
  'L 560 197 L 548 192 L 540 175 L 538 158 L 527 148 Z'

const AUSTRALIA_D =
  'M 735 235 L 750 228 L 768 222 L 790 218 L 815 218 L 833 225 L 838 238 L 830 255 ' +
  'L 820 268 L 808 278 L 797 275 L 782 272 L 762 280 L 748 272 L 738 258 L 735 245 Z'

const GREENLAND_D =
  'M 332 72 L 355 55 L 388 42 L 408 35 L 415 22 L 400 15 L 375 15 L 342 22 L 318 38 L 310 55 Z'

const CONTINENTS = [
  { id: 'namerica',  d: NAMERICA_D },
  { id: 'samerica',  d: SAMERICA_D },
  { id: 'europe',    d: EUROPE_D },
  { id: 'africa',    d: AFRICA_D },
  { id: 'asia',      d: ASIA_D },
  { id: 'australia', d: AUSTRALIA_D },
  { id: 'greenland', d: GREENLAND_D },
]

// ── CCAA abbreviations ────────────────────────────────────────────────────────
const CCAA_ABBR: Record<string, string> = {
  'ES-AN': 'AND', 'ES-AR': 'ARA', 'ES-AS': 'AST', 'ES-CN': 'CAN',
  'ES-CB': 'CAB', 'ES-CM': 'CLM', 'ES-CL': 'CYL', 'ES-CT': 'CAT',
  'ES-EX': 'EXT', 'ES-GA': 'GAL', 'ES-IB': 'BAL', 'ES-RI': 'RIO',
  'ES-MD': 'MAD', 'ES-MC': 'MUR', 'ES-NC': 'NAV', 'ES-PV': 'PVA',
  'ES-VC': 'VAL',
}

// ── color helpers ─────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  CRITICO: '#dc2626', ALTO: '#f59e0b', MEDIO: '#3b82f6', BAJO: '#22c55e',
}
function levelColor(nivel: string) { return LEVEL_COLORS[nivel] ?? '#22c55e' }
function scoreColor(score: number) {
  if (score >= 8) return '#dc2626'
  if (score >= 6) return '#f59e0b'
  if (score >= 4) return '#3b82f6'
  return '#22c55e'
}
function factorColor(factor: string) {
  if (factor === 'energia')    return '#f59e0b'
  if (factor === 'migracion')  return '#ef4444'
  if (factor === 'seguridad')  return '#dc2626'
  if (factor === 'comercio')   return '#3b82f6'
  return '#6366f1'
}
function urgencyColor(u: number) {
  if (u >= 5) return '#dc2626'
  if (u >= 4) return '#f59e0b'
  if (u >= 3) return '#3b82f6'
  return 'rgba(148,163,184,0.5)'
}
function dimColor(dim: string) {
  if (dim === 'energia')     return '#f59e0b'
  if (dim === 'comercio')    return '#3b82f6'
  if (dim === 'seguridad')   return '#dc2626'
  if (dim === 'diplomatica') return '#6366f1'
  return '#0ea5e9'
}
function irgeColor(score: number) {
  if (score >= 70) return '#dc2626'
  if (score >= 50) return '#f59e0b'
  if (score >= 30) return '#3b82f6'
  return '#22c55e'
}
function irgeSemaforo(score: number) {
  if (score >= 70) return 'CRITICO'
  if (score >= 50) return 'ELEVADO'
  if (score >= 30) return 'MODERADO'
  return 'BAJO'
}

// ── safe array helper (backend may return comma-string instead of array) ──────
function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string' && val.trim().length > 0) return [val]
  return []
}

// ── time formatting ───────────────────────────────────────────────────────────
function relTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'ahora'
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `hace ${h}h`
    const d = Math.floor(h / 24)
    return `hace ${d}d`
  } catch { return iso?.slice(0, 10) ?? '—' }
}

// ── CSS constants ─────────────────────────────────────────────────────────────
const CARD = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
} as const
const TEXT_PRIMARY   = 'rgba(226,232,240,0.95)'
const TEXT_SECONDARY = 'rgba(148,163,184,0.7)'
const SHADOW         = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)'

// ── types ─────────────────────────────────────────────────────────────────────
interface GeoStats {
  osint_24h: number; alertas_activas: number
  paises_monitorizados: number; presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
}
interface RiesgoItem {
  pais: string; iso: string; score: number; interes_espana: number
  lat: number; lon: number; categoria: string
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string
  urgencia: number; categoria: string; resumen: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string; paises: unknown
  descripcion_corta?: string; descripcion: string; fuente: string
  cadena_causal?: unknown
  fuentes_detalle?: Array<{ titulo: string; fuente: string; url?: string; fecha: string; confianza: number }>
  probabilidad?: number; horizonte?: string; confianza_sistema?: number
}
interface ImpactoItem {
  id: string; titulo: string; dimension: string; severidad: number
  horizonte: string; descripcion: string; paises_origen: unknown
  escenario_base?: string; escenario_adverso?: string
}
interface ThinkTankItem {
  id: string; titulo: string; fuente: string; fuente_tipo: string; fecha: string
  url: string; resumen: string; urgencia: number; relevancia_espana: number
  paises_detectados: unknown; temas_detectados: unknown
}
interface CcaaItem {
  ccaa: string; ccaa_iso: string; lat: number; lon: number
  score_total: number; score_energia: number; score_migracion: number
  score_seguridad: number; score_comercio: number
  factor_dominante: string; explicacion: string
}
interface ScenarioPoint {
  titulo: string; probabilidad: number; impacto: number; nivel: string
}
interface PuntoPresencia {
  id: string; pais: string; iso3: string; lat: number; lon: number
  categoria: 'militar' | 'energetica' | 'empresarial' | 'diplomatica' | 'diaspora'
  titulo: string; actor: string; descripcion: string
  valor: number; unidad: 'efectivos' | 'residentes' | 'mill_eur' | 'embajada' | 'MW' | 'unidad'
  score_relevancia: number
}
interface PresenciaKpis {
  efectivos: number; diaspora: number; inversion_mill_eur: number
  embajadas: number; fuentes_energia: number
}

// ── IRGE computation ──────────────────────────────────────────────────────────
function computeIrge(riesgo: RiesgoItem[], alertas: AlertaItem[], thinkTanks: ThinkTankItem[]): number | null {
  if (!riesgo.length && !alertas.length && !thinkTanks.length) return null
  const totalInterest = riesgo.reduce((s, r) => s + r.interes_espana, 0)
  const riskScore = totalInterest > 0
    ? riesgo.reduce((s, r) => s + r.score * r.interes_espana, 0) / totalInterest
    : 0
  const critico = alertas.filter(a => a.nivel === 'CRITICO').length
  const alto    = alertas.filter(a => a.nivel === 'ALTO').length
  const medio   = alertas.filter(a => a.nivel === 'MEDIO').length
  const alertScore = alertas.length > 0
    ? (critico * 10 + alto * 6 + medio * 3) / Math.max(1, alertas.length)
    : 0
  const osintScore = thinkTanks.length > 0
    ? (thinkTanks.reduce((s, t) => s + t.urgencia, 0) / thinkTanks.length) * 2
    : 0
  const raw = riskScore * 0.4 + alertScore * 0.35 + osintScore * 0.25
  return Math.round(Math.min(100, raw * 10))
}

// ── Arc Gauge SVG ─────────────────────────────────────────────────────────────
function ArcGauge({ score }: { score: number | null }) {
  const s = score ?? 0
  const angle = Math.PI - (s / 100) * Math.PI
  const endX  = 110 + 90 * Math.cos(angle)
  const endY  = 110 - 90 * Math.sin(angle)
  const gaugeId = 'irge-gauge-grad'
  const color = score !== null ? irgeColor(score) : 'rgba(148,163,184,0.3)'

  // tick marks at 30%, 50%, 70%
  const ticks = [30, 50, 70].map(pct => {
    const a = Math.PI - (pct / 100) * Math.PI
    const x1 = 110 + 82 * Math.cos(a)
    const y1 = 110 - 82 * Math.sin(a)
    const x2 = 110 + 96 * Math.cos(a)
    const y2 = 110 - 96 * Math.sin(a)
    return { x1, y1, x2, y2 }
  })

  return (
    <svg viewBox="0 0 220 130" style={{ width: 220, height: 130, flexShrink: 0 }}>
      <defs>
        <linearGradient id={gaugeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#22c55e" />
          <stop offset="50%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d="M 20 110 A 90 90 0 0 1 200 110"
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} strokeLinecap="round" />
      {/* Progress */}
      {score !== null && (
        <path d={`M 20 110 A 90 90 0 0 1 ${endX} ${endY}`}
          fill="none" stroke={`url(#${gaugeId})`} strokeWidth={10} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      )}
      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      ))}
      {/* Score label */}
      <text x={110} y={100} textAnchor="middle" fill={color}
        fontSize={36} fontWeight={900} fontFamily="-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
        style={{ letterSpacing: '-0.04em' }}>
        {score ?? '—'}
      </text>
      {score !== null && (
        <text x={110} y={116} textAnchor="middle" fill={color}
          fontSize={9} fontWeight={700} fontFamily="-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
          style={{ letterSpacing: '0.08em' }}>
          {irgeSemaforo(score)}
        </text>
      )}
      {/* Zone labels */}
      <text x={18}  y={125} fill="rgba(148,163,184,0.5)" fontSize={7.5} textAnchor="middle">BAJO</text>
      <text x={202} y={125} fill="rgba(148,163,184,0.5)" fontSize={7.5} textAnchor="middle">CRITICO</text>
    </svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 6,
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
      marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      {items.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} style={{
          border: active === i ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
          background: active === i ? 'rgba(14,165,233,0.12)' : 'transparent',
          color: active === i ? TEXT_PRIMARY : TEXT_SECONDARY,
          borderRadius: 8, padding: '8px 18px',
          fontSize: 11, fontWeight: active === i ? 700 : 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          transition: 'all 150ms',
        }}>{t}</button>
      ))}
    </div>
  )
}

function LevelBadge({ nivel }: { nivel: string }) {
  const c = levelColor(nivel)
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
      background: `${c}20`, color: c, letterSpacing: '0.05em',
      border: `1px solid ${c}40`,
    }}>{nivel}</span>
  )
}

function ScorePill({ score }: { score: number }) {
  const c = scoreColor(score)
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: `${c}20`, color: c,
    }}>{score.toFixed(1)}</span>
  )
}

function DimBadge({ dim }: { dim: string }) {
  const c = dimColor(dim)
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 600,
      background: `${c}20`, color: c, border: `1px solid ${c}30`,
    }}>{dim}</span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: TEXT_SECONDARY, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
    }}>{children}</div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [hoverAlerts, setHoverAlerts] = useState<Set<string>>(new Set())
  const [expandAlerts, setExpandAlerts] = useState<Set<string>>(new Set())
  const [expandImpactos, setExpandImpactos] = useState<Set<string>>(new Set())
  const [selectedCcaa, setSelectedCcaa] = useState<string | null>(null)
  const [ccaaDim, setCcaaDim] = useState<'total' | 'energia' | 'migracion' | 'seguridad'>('total')
  const [ttQuery, setTtQuery] = useState('')
  const [ttUrgMin, setTtUrgMin] = useState(1)
  const [ttNicho, setTtNicho] = useState('all')
  const [alertFilter, setAlertFilter] = useState<'TODOS' | 'CRITICO' | 'ALTO' | 'MEDIO'>('TODOS')
  const [presenciaLayer, setPresenciaLayer] = useState<'todas' | 'militar' | 'energetica' | 'empresarial' | 'diplomatica' | 'diaspora'>('todas')
  const [presenciaTooltip, setPresenciaTooltip] = useState<{ x: number; y: number; content: PuntoPresencia } | null>(null)
  const mapRef = useRef<SVGSVGElement>(null)

  const { data: geoStatsRaw }                      = useApi<GeoStats & { data?: GeoStats }>('/api/geopolitica/stats', { refreshInterval: 60_000 })
  const { data: riesgoRaw }                        = useApi<{ data: RiesgoItem[] }>('/api/geopolitica/riesgo', { refreshInterval: 120_000 })
  const { data: osintRaw, loading: loadingOsint }  = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint', { refreshInterval: 60_000 })
  const { data: alertasRaw }                       = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 30_000 })
  const { data: impactosRaw }                      = useApi<{ data: ImpactoItem[] }>('/api/geopolitica/impactos', { refreshInterval: 120_000 })
  const { data: thinkTanksRaw }                    = useApi<{ data: ThinkTankItem[] }>('/api/geopolitica/think-tanks', { refreshInterval: 120_000 })
  const { data: ccaaRaw }                          = useApi<{ data: CcaaItem[] }>('/api/geopolitica/ccaa', { refreshInterval: 300_000 })
  const { data: presenciaRaw }                     = useApi<{ data: PuntoPresencia[]; kpis: PresenciaKpis }>('/api/geopolitica/presencia', { refreshInterval: 300_000 })

  const geoStats: GeoStats  = (geoStatsRaw as GeoStats) ?? { osint_24h: 0, alertas_activas: 0, paises_monitorizados: 0, presencia_activa: 0, alertas_count: { CRITICO: 0, ALTO: 0, MEDIO: 0 } }
  const riesgo: RiesgoItem[]       = riesgoRaw?.data ?? []
  const osint: OsintItem[]         = osintRaw?.data ?? []
  const alertas: AlertaItem[]      = alertasRaw?.data ?? []
  const impactosReal: ImpactoItem[]= impactosRaw?.data ?? []
  const thinkTanks: ThinkTankItem[]= thinkTanksRaw?.data ?? []
  const ccaa: CcaaItem[]           = ccaaRaw?.data ?? []
  const presencia: PuntoPresencia[] = presenciaRaw?.data ?? []
  const presenciaKpis: PresenciaKpis = presenciaRaw?.kpis ?? { efectivos: 0, diaspora: 0, inversion_mill_eur: 0, embajadas: 0, fuentes_energia: 0 }
  const presenciaFiltered = presenciaLayer === 'todas' ? presencia : presencia.filter(p => p.categoria === presenciaLayer)
  void osint

  const impactos: ImpactoItem[] = useMemo(() => {
    if (impactosReal.length > 0) return impactosReal
    return alertas.map(a => ({
      id: `synth-${a.id}`,
      titulo: a.titulo,
      dimension:
        a.titulo.toLowerCase().includes('energ') ? 'energia' :
        a.titulo.toLowerCase().includes('migr')  ? 'diplomatica' :
        a.nivel === 'CRITICO'                     ? 'seguridad' : 'comercio',
      severidad:
        a.nivel === 'CRITICO' ? 5 : a.nivel === 'ALTO' ? 4 : a.nivel === 'MEDIO' ? 3 : 2,
      horizonte:
        a.horizonte ?? (a.nivel === 'CRITICO' ? 'inmediato' : a.nivel === 'ALTO' ? 'corto' : 'medio'),
      descripcion: a.descripcion_corta ?? a.descripcion,
      paises_origen: toArray(a.paises),
    }))
  }, [impactosReal, alertas])

  const riesgoSorted   = [...riesgo].sort((a, b) => b.score - a.score)
  const impactosSorted = [...impactos].sort((a, b) => b.severidad - a.severidad)
  const alertasSorted  = [...alertas].sort((a, b) => {
    const order = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
    return (order.indexOf(a.nivel) - order.indexOf(b.nivel)) ||
           (new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  })

  const irge = useMemo(() => computeIrge(riesgo, alertas, thinkTanks), [riesgo, alertas, thinkTanks])

  const kpiCards = [
    { label: 'Senales OSINT 24h',     value: geoStats.osint_24h,           accent: '#0ea5e9' },
    { label: 'Alertas activas',        value: geoStats.alertas_activas,      accent: '#dc2626' },
    { label: 'Paises monitorizados',   value: geoStats.paises_monitorizados, accent: '#22c55e' },
    { label: 'Presencia activa',       value: geoStats.presencia_activa,     accent: '#6366f1' },
  ]

  const ttFiltered = thinkTanks
    .filter(t => t.urgencia >= ttUrgMin && (ttNicho === 'all' || toArray(t.temas_detectados).includes(ttNicho)))
    .filter(t => !ttQuery || t.titulo.toLowerCase().includes(ttQuery.toLowerCase()) || t.resumen.toLowerCase().includes(ttQuery.toLowerCase()))
    .sort((a, b) => b.urgencia - a.urgencia || b.relevancia_espana - a.relevancia_espana)

  const ttNichos = Array.from(new Set(thinkTanks.flatMap(t => toArray(t.temas_detectados))))

  const sourceMap: Record<string, { items: ThinkTankItem[]; maxUrgencia: number; latest: string }> = {}
  for (const t of thinkTanks) {
    if (!sourceMap[t.fuente]) sourceMap[t.fuente] = { items: [], maxUrgencia: 0, latest: t.fecha }
    sourceMap[t.fuente].items.push(t)
    if (t.urgencia > sourceMap[t.fuente].maxUrgencia) sourceMap[t.fuente].maxUrgencia = t.urgencia
    if (t.fecha > sourceMap[t.fuente].latest) sourceMap[t.fuente].latest = t.fecha
  }
  const maxSourceItems = Math.max(1, ...Object.values(sourceMap).map(s => s.items.length))

  const temasCount: Record<string, number> = {}
  for (const t of thinkTanks) {
    for (const tema of toArray(t.temas_detectados)) {
      temasCount[tema] = (temasCount[tema] ?? 0) + 1
    }
  }
  const topTemas = Object.entries(temasCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxTemas = Math.max(1, topTemas[0]?.[1] ?? 1)

  const timelineBuckets = useMemo(() => {
    const buckets: Record<string, number> = {}
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000)
      buckets[d.toISOString().slice(0, 10)] = 0
    }
    for (const t of thinkTanks) {
      const day = t.fecha?.slice(0, 10)
      if (day && buckets[day] !== undefined) buckets[day]++
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }))
  }, [thinkTanks])
  const maxBucket = Math.max(1, ...timelineBuckets.map(b => b.count))

  const hasCritico = alertas.some(a => a.nivel === 'CRITICO')
  const hasAlto    = alertas.some(a => a.nivel === 'ALTO')
  const alertasCount = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
  for (const a of alertas) {
    const k = (['CRITICO', 'ALTO', 'MEDIO', 'BAJO'].includes(a.nivel) ? a.nivel : 'BAJO') as keyof typeof alertasCount
    alertasCount[k]++
  }

  const HORIZONTES  = ['inmediato', 'corto', 'medio', 'largo']
  const DIMENSIONES = ['energia', 'comercio', 'seguridad', 'diplomatica']
  type HeatCell = { count: number; avgSeveridad: number }
  const heatmap: Record<string, Record<string, HeatCell>> = {}
  for (const h of HORIZONTES) {
    heatmap[h] = {}
    for (const d of DIMENSIONES) {
      const bucket = impactos.filter(i => i.horizonte === h && i.dimension === d)
      heatmap[h][d] = { count: bucket.length, avgSeveridad: bucket.length ? bucket.reduce((s, i) => s + i.severidad, 0) / bucket.length : 0 }
    }
  }

  const scenarioPoints: ScenarioPoint[] = useMemo(() => {
    const pts: ScenarioPoint[] = alertas.map(a => ({
      titulo: a.titulo,
      probabilidad: a.probabilidad ?? (a.nivel === 'CRITICO' ? 0.78 : a.nivel === 'ALTO' ? 0.55 : a.nivel === 'MEDIO' ? 0.35 : 0.15),
      impacto: a.nivel === 'CRITICO' ? 4.8 : a.nivel === 'ALTO' ? 3.5 : a.nivel === 'MEDIO' ? 2.4 : 1.3,
      nivel: a.nivel,
    }))
    for (const imp of impactosReal) {
      if (!pts.find(p => p.titulo === imp.titulo)) {
        pts.push({
          titulo: imp.titulo,
          probabilidad: 0.5,
          impacto: imp.severidad,
          nivel: imp.severidad >= 4 ? 'ALTO' : imp.severidad >= 3 ? 'MEDIO' : 'BAJO',
        })
      }
    }
    return pts
  }, [alertas, impactosReal])

  const selectedCcaaData = ccaa.find(c => c.ccaa === selectedCcaa)
  const getCcaaScore = (c: CcaaItem) => {
    if (ccaaDim === 'energia')   return c.score_energia
    if (ccaaDim === 'migracion') return c.score_migracion
    if (ccaaDim === 'seguridad') return c.score_seguridad
    return c.score_total
  }
  const maxCcaaScore = Math.max(1, ...ccaa.map(c => getCcaaScore(c)))

  const top5Risk = [...riesgo]
    .sort((a, b) => (b.score * b.interes_espana) - (a.score * a.interes_espana))
    .slice(0, 5)

  function toggleSet(id: string, set: React.Dispatch<React.SetStateAction<Set<string>>>) {
    set(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  // IRGE component bars
  const irgeComponents = [
    {
      label: 'Riesgo pais',
      value: riesgo.length > 0 ? (riesgo.slice(0, 3).reduce((s, r) => s + r.score, 0) / 3) / 10 : 0,
      display: riesgo.length > 0 ? (riesgo.slice(0, 3).reduce((s, r) => s + r.score, 0) / 3).toFixed(1) : '—',
      color: '#0ea5e9',
    },
    {
      label: 'Alertas activas',
      value: Math.min(1, alertas.length / 20),
      display: String(alertas.length),
      color: '#dc2626',
    },
    {
      label: 'Senales OSINT',
      value: Math.min(1, thinkTanks.length / 50),
      display: String(thinkTanks.length),
      color: '#6366f1',
    },
  ]

  // Theater definitions for Tab 5
  const THEATERS = [
    {
      id: 'med-occ',
      nombre: 'Mediterraneo Occidental',
      paises: ['Marruecos', 'Argelia', 'Libia', 'Tunez'],
      riesgos: ['Migracion', 'Energia', 'Terrorismo'],
      intereses: ['Estrecho de Gibraltar', 'Gas ENDESA / Argelia', 'Ceuta y Melilla', 'Pesca Atlantico'],
      color: '#0ea5e9',
    },
    {
      id: 'sahel',
      nombre: 'Sahel y Africa Subsahariana',
      paises: ['Mali', 'Niger', 'Sudan', 'Burkina Faso'],
      riesgos: ['Golpes de Estado', 'Terrorismo', 'Flujos migratorios'],
      intereses: ['Operaciones Repsol', 'Contencion migratoria', 'Presencia diplomatica'],
      color: '#f59e0b',
    },
    {
      id: 'atlantico',
      nombre: 'Atlantico Norte y Europa',
      paises: ['Ucrania', 'Rusia', 'Polonia', 'Alemania'],
      riesgos: ['Escalada militar', 'Cadenas de suministro', 'Precios energia'],
      intereses: ['Gasto en defensa NATO', 'Rutas de gas', 'Exportaciones UE'],
      color: '#22c55e',
    },
    {
      id: 'mena',
      nombre: 'MENA y Golfo Persico',
      paises: ['Iran', 'Israel', 'Arabia Saudi', 'Turquia'],
      riesgos: ['Precio petroleo', 'Proliferacion armament', 'Tension confes.'],
      intereses: ['Importaciones energia', 'Banco Sabadell / Gulf', 'Telefonica MENA'],
      color: '#6366f1',
    },
  ]

  // Inject dynamic alert data into theaters
  const theatersWithData = THEATERS.map(th => {
    const relatedAlerts = alertas.filter(a =>
      th.paises.some(p => toArray(a.paises).some(ap => ap.toLowerCase().includes(p.toLowerCase())) ||
        a.titulo.toLowerCase().includes(p.toLowerCase()))
    )
    const maxLevel = relatedAlerts.some(a => a.nivel === 'CRITICO') ? 'CRITICO' :
                     relatedAlerts.some(a => a.nivel === 'ALTO')    ? 'ALTO'    :
                     relatedAlerts.some(a => a.nivel === 'MEDIO')   ? 'MEDIO'   : 'BAJO'
    const levelCounts = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
    for (const a of relatedAlerts) {
      const k = (['CRITICO','ALTO','MEDIO','BAJO'].includes(a.nivel) ? a.nivel : 'BAJO') as keyof typeof levelCounts
      levelCounts[k]++
    }
    return { ...th, relatedAlerts, maxLevel, levelCounts }
  })

  const alertasFiltered = alertFilter === 'TODOS' ? alertasSorted : alertasSorted.filter(a => a.nivel === alertFilter)

  // Sector exposure from impactos
  const SECTORS = [
    { key: 'energia',    label: 'Energia', color: '#f59e0b' },
    { key: 'comercio',   label: 'Comercio', color: '#3b82f6' },
    { key: 'seguridad',  label: 'Seguridad', color: '#dc2626' },
    { key: 'diplomatica',label: 'Diplomatica', color: '#6366f1' },
    { key: 'migracion',  label: 'Migracion', color: '#ef4444' },
  ]
  const maxSectorCount = Math.max(1, ...SECTORS.map(s => impactos.filter(i => i.dimension === s.key).length))

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: TEXT_PRIMARY, fontFamily: '-apple-system, "SF Pro Display", Inter, system-ui, sans-serif' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 64px' }}>

        {/* ── IRGE ARC GAUGE HEADER ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2,12,27,0.98) 0%, rgba(10,25,50,0.95) 50%, rgba(2,12,27,0.98) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 16, padding: '24px 28px',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: '220px 1fr auto',
          gap: 32,
          alignItems: 'center',
          boxShadow: SHADOW,
        }}>
          {/* LEFT — arc gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ArcGauge score={irge} />
            <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
              IRGE — Indice de Riesgo Geopolitico
            </div>
          </div>

          {/* CENTER — label + component bars */}
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: irge !== null ? irgeColor(irge) : TEXT_SECONDARY, letterSpacing: '-0.02em' }}>
                  {irge ?? '—'}<span style={{ fontSize: 13, fontWeight: 400, color: TEXT_SECONDARY }}>/100</span>
                </span>
                {irge !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                    color: irgeColor(irge), textTransform: 'uppercase',
                    padding: '2px 10px', borderRadius: 999,
                    background: `${irgeColor(irge)}18`,
                    border: `1px solid ${irgeColor(irge)}35`,
                  }}>{irgeSemaforo(irge)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Bajo', pct: '0–30', color: '#22c55e' },
                  { label: 'Moderado', pct: '30–50', color: '#3b82f6' },
                  { label: 'Elevado', pct: '50–70', color: '#f59e0b' },
                  { label: 'Critico', pct: '70+', color: '#dc2626' },
                ].map(z => (
                  <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: z.color }} />
                    <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>{z.label} <span style={{ color: 'rgba(148,163,184,0.4)' }}>{z.pct}</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Component breakdown bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {irgeComponents.map(c => (
                <div key={c.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{c.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.display}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${clamp(c.value * 100, 0, 100)}%`, height: 4,
                      background: c.color, borderRadius: 2,
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                      boxShadow: `0 0 8px ${c.color}60`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — KPI chips 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, minWidth: 260 }}>
            {kpiCards.map(k => (
              <div key={k.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${k.accent}`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <TabBar
          items={['MAPA GLOBAL', 'PRESENCIA EXTERIOR', 'ESPANA CCAA', 'OSINT', 'ALERTAS', 'IMPACTO', 'TEATRO']}
          active={tab}
          onChange={setTab}
        />

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 0 — MAPA GLOBAL
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
            {/* Map */}
            <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden' }}>
              <svg
                ref={mapRef}
                viewBox="0 0 900 460"
                style={{ width: '100%', background: '#020c1b', display: 'block' }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Graticule */}
                {[-60, -30, 0, 30, 60].map(lat => (
                  <line key={`h${lat}`} x1={0} y1={projY(lat)} x2={900} y2={projY(lat)}
                    stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                ))}
                {[-120, -60, 0, 60, 120].map(lon => (
                  <line key={`v${lon}`} x1={projX(lon)} y1={0} x2={projX(lon)} y2={460}
                    stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                ))}
                {/* Equator */}
                <line x1={0} y1={projY(0)} x2={900} y2={projY(0)}
                  stroke="rgba(64,96,160,0.22)" strokeWidth={0.8} strokeDasharray="6 4" />

                {/* Continents */}
                {CONTINENTS.map(c => (
                  <path key={c.id} d={c.d}
                    fill="rgba(30,58,95,0.52)"
                    stroke="rgba(56,100,160,0.32)"
                    strokeWidth={0.7}
                  />
                ))}

                {/* Animated connection lines: Spain to top 5 */}
                {top5Risk.map((r, idx) => {
                  const x1 = projX(-3.7), y1 = projY(40.4)
                  const x2 = projX(r.lon), y2 = projY(r.lat)
                  const offset = idx * 3
                  return (
                    <line key={`line-${r.iso}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="rgba(14,165,233,0.22)" strokeWidth={1.2}
                      strokeDasharray="5 4"
                      style={{ animation: `dashMove ${2 + idx * 0.3}s linear infinite`, animationDelay: `${offset * 0.1}s` }}
                    />
                  )
                })}

                {/* Risk bubbles */}
                {riesgoSorted.map(r => {
                  const cx = projX(r.lon)
                  const cy = projY(r.lat)
                  const radius = clamp(r.score * 3.5, 5, 30)
                  const fill = scoreColor(r.score)
                  const isCritico = r.score >= 8
                  return (
                    <g key={r.iso}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                        setTooltip({
                          x: (cx / 900) * rect.width + rect.left,
                          y: (cy / 460) * rect.height + rect.top - 52,
                          text: `${r.pais}  |  Riesgo: ${r.score.toFixed(1)}  |  Interes ES: ${r.interes_espana.toFixed(1)}`,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'default' }}
                    >
                      {isCritico && (
                        <circle cx={cx} cy={cy} r={radius + 6}
                          fill="none" stroke={fill} strokeWidth={1.2} strokeOpacity={0.3}
                          style={{ animation: 'pulseRing 2s ease-in-out infinite' }}
                        />
                      )}
                      <circle cx={cx} cy={cy} r={radius}
                        fill={fill} fillOpacity={0.72}
                        stroke="rgba(255,255,255,0.18)" strokeWidth={0.8}
                        style={{ filter: `drop-shadow(0 0 4px ${fill}50)` }}
                      />
                      {radius >= 14 && (
                        <text x={cx} y={cy + 3.5} textAnchor="middle"
                          fill="white" fontSize={8.5} fontWeight={700}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {r.iso.slice(0, 2)}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Spain marker */}
                {(() => {
                  const cx = projX(-3.7), cy = projY(40.4)
                  const pts = Array.from({ length: 5 }, (_, k) => {
                    const a  = (k * 72 - 90) * Math.PI / 180
                    const a2 = (k * 72 - 90 + 36) * Math.PI / 180
                    return `${cx + 9 * Math.cos(a)},${cy + 9 * Math.sin(a)} ${cx + 4 * Math.cos(a2)},${cy + 4 * Math.sin(a2)}`
                  }).join(' ')
                  return (
                    <g>
                      <polygon points={pts} fill="#0ea5e9"
                        stroke="rgba(255,255,255,0.6)" strokeWidth={1}
                        style={{ filter: 'drop-shadow(0 0 7px rgba(14,165,233,0.9))' }} />
                      <text x={cx + 13} y={cy + 4}
                        fill="#7dd3fc" fontSize={9} fontWeight={700}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        ESP
                      </text>
                    </g>
                  )
                })()}
              </svg>

              {/* Legend */}
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Riesgo:</span>
                {[
                  { label: 'Critico >=8', color: '#dc2626' },
                  { label: 'Alto >=6',    color: '#f59e0b' },
                  { label: 'Medio >=4',   color: '#3b82f6' },
                  { label: 'Bajo',        color: '#22c55e' },
                  { label: 'Espana',      color: '#0ea5e9' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{l.label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: TEXT_SECONDARY }}>{riesgoSorted.length} paises monitorizados</span>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Top 5 risk */}
              <div style={{ ...CARD, padding: '16px 18px', boxShadow: SHADOW }}>
                <SectionLabel>Maxima exposicion</SectionLabel>
                {top5Risk.length === 0 ? (
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Sin datos disponibles</div>
                ) : (
                  top5Risk.map((r, i) => (
                    <div key={r.iso} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <span style={{ fontSize: 10, color: TEXT_SECONDARY, minWidth: 14, fontWeight: 700 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pais}</div>
                        <div style={{ fontSize: 9, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.categoria}</div>
                      </div>
                      <ScorePill score={r.score} />
                    </div>
                  ))
                )}
              </div>

              {/* Legend card */}
              <div style={{ ...CARD, padding: '14px 16px' }}>
                <SectionLabel>Dimensiones de riesgo</SectionLabel>
                {[
                  { label: 'Seguridad',    color: '#dc2626' },
                  { label: 'Energia',      color: '#f59e0b' },
                  { label: 'Migracion',    color: '#ef4444' },
                  { label: 'Comercio',     color: '#3b82f6' },
                  { label: 'Diplomatica',  color: '#6366f1' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'fixed', left: tooltip.x, top: tooltip.y,
            background: '#0d1f3a', border: '1px solid rgba(14,165,233,0.3)',
            borderRadius: 8, padding: '8px 14px', fontSize: 12, color: TEXT_PRIMARY,
            pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)', transform: 'translateX(-50%)',
          }}>
            {tooltip.text}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1 — PRESENCIA EXTERIOR
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 1 && (() => {
          const LAYER_COLORS: Record<string, string> = {
            militar:     '#dc2626',
            energetica:  '#f59e0b',
            empresarial: '#3b82f6',
            diplomatica: '#06b6d4',
            diaspora:    '#8b5cf6',
          }
          const LAYER_LABELS: Record<string, string> = {
            militar:     'Misiones Militares',
            energetica:  'Energetica',
            empresarial: 'Empresarial',
            diplomatica: 'Diplomatica',
            diaspora:    'Diaspora',
          }

          function presenciaRadius(p: PuntoPresencia): number {
            if (p.unidad === 'efectivos')  return clamp(p.valor / 80, 8, 28)
            if (p.unidad === 'residentes') return clamp(p.valor / 20000, 8, 32)
            if (p.unidad === 'mill_eur')   return clamp(p.valor / 2000, 8, 30)
            return 12
          }

          function formatValor(p: PuntoPresencia): string {
            if (p.unidad === 'efectivos')  return `${p.valor.toLocaleString()} efectivos`
            if (p.unidad === 'residentes') return p.valor >= 1e6 ? `${(p.valor / 1e6).toFixed(2)}M residentes` : `${(p.valor / 1000).toFixed(0)}K residentes`
            if (p.unidad === 'mill_eur')   return `${p.valor.toLocaleString()} M EUR invertidos`
            if (p.unidad === 'embajada')   return 'Sede diplomatica'
            if (p.unidad === 'MW')         return `${p.valor.toLocaleString()} MW`
            return String(p.valor)
          }

          const layerCounts: Record<string, number> = { militar: 0, energetica: 0, empresarial: 0, diplomatica: 0, diaspora: 0 }
          for (const p of presencia) {
            if (layerCounts[p.categoria] !== undefined) layerCounts[p.categoria]++
          }

          return (
            <div>
              {/* Section A — KPI strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Efectivos desplegados', value: presenciaKpis.efectivos.toLocaleString(), accent: '#dc2626', border: '600/1200' },
                  { label: 'Diaspora',               value: `${(presenciaKpis.diaspora / 1e6).toFixed(2)}M`,           accent: '#8b5cf6' },
                  { label: 'Inversion exterior',     value: `${(presenciaKpis.inversion_mill_eur / 1000).toFixed(0)} B EUR`, accent: '#3b82f6' },
                  { label: 'Embajadas y Consuls.',   value: String(presenciaKpis.embajadas),                            accent: '#06b6d4' },
                  { label: 'Fuentes de energia',     value: String(presenciaKpis.fuentes_energia),                      accent: '#f59e0b' },
                ].map(k => (
                  <div key={k.label} style={{
                    ...CARD, padding: '14px 16px', boxShadow: SHADOW,
                    borderLeft: `3px solid ${k.accent}`,
                  }}>
                    <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Section B — Layer filter + world map */}
              <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden', marginBottom: 20 }}>
                {/* Layer filter pills */}
                <div style={{ padding: '12px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { key: 'todas',      label: 'TODAS',           color: '#0ea5e9' },
                    { key: 'militar',    label: 'MISIONES MILITARES', color: '#dc2626' },
                    { key: 'energetica', label: 'ENERGETICA',      color: '#f59e0b' },
                    { key: 'empresarial',label: 'EMPRESARIAL',     color: '#3b82f6' },
                    { key: 'diplomatica',label: 'DIPLOMATICA',     color: '#06b6d4' },
                    { key: 'diaspora',   label: 'DIASPORA',        color: '#8b5cf6' },
                  ] as const).map(lyr => {
                    const isActive = presenciaLayer === lyr.key
                    return (
                      <button key={lyr.key} onClick={() => setPresenciaLayer(lyr.key)} style={{
                        border: `1px solid ${isActive ? lyr.color : 'rgba(255,255,255,0.1)'}`,
                        background: isActive ? `${lyr.color}18` : 'transparent',
                        color: isActive ? lyr.color : TEXT_SECONDARY,
                        borderRadius: 999, padding: '4px 14px', fontSize: 10, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                        letterSpacing: '0.06em', transition: 'all 150ms',
                      }}>{lyr.label}</button>
                    )
                  })}
                </div>

                {/* SVG world map */}
                <svg
                  viewBox="0 0 900 460"
                  style={{ width: '100%', background: '#020c1b', display: 'block', marginTop: 8 }}
                  onMouseLeave={() => setPresenciaTooltip(null)}
                >
                  {/* Graticule */}
                  {[-60, -30, 0, 30, 60].map(lat => (
                    <line key={`ph${lat}`} x1={0} y1={projY(lat)} x2={900} y2={projY(lat)}
                      stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                  ))}
                  {[-120, -60, 0, 60, 120].map(lon => (
                    <line key={`pv${lon}`} x1={projX(lon)} y1={0} x2={projX(lon)} y2={460}
                      stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                  ))}
                  <line x1={0} y1={projY(0)} x2={900} y2={projY(0)}
                    stroke="rgba(64,96,160,0.22)" strokeWidth={0.8} strokeDasharray="6 4" />

                  {/* Continents */}
                  {CONTINENTS.map(c => (
                    <path key={c.id} d={c.d}
                      fill="rgba(30,58,95,0.52)"
                      stroke="rgba(56,100,160,0.32)"
                      strokeWidth={0.7}
                    />
                  ))}

                  {/* Presence bubbles */}
                  {presenciaFiltered.map(p => {
                    const cx = projX(p.lon)
                    const cy = projY(p.lat)
                    const r  = presenciaRadius(p)
                    const color = LAYER_COLORS[p.categoria] ?? '#6366f1'
                    return (
                      <g key={p.id}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                          setPresenciaTooltip({
                            x: (cx / 900) * rect.width + rect.left,
                            y: (cy / 460) * rect.height + rect.top - 8,
                            content: p,
                          })
                        }}
                        onMouseLeave={() => setPresenciaTooltip(null)}
                        style={{ cursor: 'default' }}
                      >
                        <circle cx={cx} cy={cy} r={r}
                          fill={color} fillOpacity={0.75}
                          stroke="rgba(255,255,255,0.15)" strokeWidth={0.8}
                          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
                        />
                        {r >= 14 && (
                          <text x={cx} y={cy + 3.5} textAnchor="middle"
                            fill="white" fontSize={8} fontWeight={700}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {p.iso3.slice(0, 2)}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Spain marker */}
                  {(() => {
                    const cx = projX(-3.7), cy = projY(40.4)
                    const pts = Array.from({ length: 5 }, (_, k) => {
                      const a  = (k * 72 - 90) * Math.PI / 180
                      const a2 = (k * 72 - 90 + 36) * Math.PI / 180
                      return `${cx + 9 * Math.cos(a)},${cy + 9 * Math.sin(a)} ${cx + 4 * Math.cos(a2)},${cy + 4 * Math.sin(a2)}`
                    }).join(' ')
                    return (
                      <g>
                        <polygon points={pts} fill="#0ea5e9"
                          stroke="rgba(255,255,255,0.6)" strokeWidth={1}
                          style={{ filter: 'drop-shadow(0 0 7px rgba(14,165,233,0.9))' }} />
                        <text x={cx + 13} y={cy + 4}
                          fill="#7dd3fc" fontSize={9} fontWeight={700}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          ESP
                        </text>
                      </g>
                    )
                  })()}
                </svg>

                {/* Legend strip */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capas:</span>
                  {(['militar', 'energetica', 'empresarial', 'diplomatica', 'diaspora'] as const).map(lyr => (
                    <div key={lyr} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: LAYER_COLORS[lyr] }} />
                      <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>
                        {LAYER_LABELS[lyr]} <span style={{ color: 'rgba(148,163,184,0.45)' }}>({layerCounts[lyr]})</span>
                      </span>
                    </div>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: TEXT_SECONDARY }}>{presenciaFiltered.length} puntos visibles</span>
                </div>
              </div>

              {/* Section C — Detail cards 2-column grid */}
              {presenciaFiltered.length > 0 && (
                <div>
                  <SectionLabel>Detalle de presencia — {presenciaLayer === 'todas' ? 'todas las capas' : LAYER_LABELS[presenciaLayer]}</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                    {presenciaFiltered.map(p => {
                      const color = LAYER_COLORS[p.categoria] ?? '#6366f1'
                      const scoreC = p.score_relevancia >= 8 ? '#dc2626' : p.score_relevancia >= 6 ? '#f59e0b' : p.score_relevancia >= 4 ? '#3b82f6' : '#22c55e'
                      return (
                        <div key={p.id} style={{
                          ...CARD,
                          borderLeft: `3px solid ${color}`,
                          padding: '14px 16px',
                        }}>
                          {/* Top row: category badge + actor + score */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '2px 9px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                              background: `${color}20`, color, border: `1px solid ${color}35`,
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>{p.categoria}</span>
                            <span style={{
                              padding: '2px 9px', borderRadius: 999, fontSize: 9, fontWeight: 600,
                              background: 'rgba(255,255,255,0.06)', color: TEXT_SECONDARY,
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}>{p.actor}</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: scoreC }} />
                              <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>{p.score_relevancia.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Title */}
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 3, lineHeight: 1.4 }}>{p.titulo}</div>

                          {/* Country subtitle */}
                          <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 6 }}>
                            {p.pais} <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: 10 }}>({p.iso3})</span>
                          </div>

                          {/* Description */}
                          <p style={{
                            fontSize: 11, color: TEXT_SECONDARY, margin: '0 0 10px', lineHeight: 1.6,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>{p.descripcion}</p>

                          {/* Bottom: valor formatted */}
                          <div style={{ fontSize: 11, fontWeight: 700, color }}>
                            {formatValor(p)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {presenciaFiltered.length === 0 && (
                <div style={{ ...CARD, padding: '48px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                  Sin datos de presencia exterior disponibles — pipeline no conectado
                </div>
              )}

              {/* Presencia tooltip */}
              {presenciaTooltip && (
                <div style={{
                  position: 'fixed',
                  left: presenciaTooltip.x,
                  top: presenciaTooltip.y - 44,
                  background: '#0d1f3a', border: `1px solid ${LAYER_COLORS[presenciaTooltip.content.categoria] ?? 'rgba(14,165,233,0.3)'}50`,
                  borderRadius: 10, padding: '10px 14px', fontSize: 12, color: TEXT_PRIMARY,
                  pointerEvents: 'none', zIndex: 9999,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.7)', transform: 'translateX(-50%)',
                  maxWidth: 280,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>{presenciaTooltip.content.titulo}</div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 2 }}>
                    {presenciaTooltip.content.pais} · {presenciaTooltip.content.actor}
                  </div>
                  <div style={{
                    fontSize: 11, color: TEXT_SECONDARY, marginBottom: 6,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{presenciaTooltip.content.descripcion}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: LAYER_COLORS[presenciaTooltip.content.categoria] ?? '#0ea5e9' }}>
                    {formatValor(presenciaTooltip.content)}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2 — ESPANA CCAA
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 2 && (
          <div>
            {/* Dimension filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {(['total', 'energia', 'migracion', 'seguridad'] as const).map(d => (
                <button key={d} onClick={() => setCcaaDim(d)} style={{
                  border: `1px solid ${ccaaDim === d ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`,
                  background: ccaaDim === d ? 'rgba(14,165,233,0.15)' : 'transparent',
                  color: ccaaDim === d ? '#0ea5e9' : TEXT_SECONDARY,
                  borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                  letterSpacing: '0.06em', transition: 'all 150ms',
                }}>{d === 'total' ? 'Total' : d}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
              {/* CCAA bubble map */}
              <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden', minHeight: 400 }}>
                {ccaa.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 420, flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 12, padding: '18px 28px', fontSize: 13, color: '#f59e0b', textAlign: 'center', maxWidth: 360,
                    }}>
                      Datos de riesgo CCAA no disponibles. El pipeline de territorio no ha sido ejecutado.
                    </div>
                  </div>
                ) : (
                  <svg viewBox="0 0 560 380" style={{ width: '100%', background: '#020c1b', display: 'block' }}>
                    {/* Grid */}
                    {[36, 38, 40, 42, 44].map(lat => (
                      <line key={`el${lat}`} x1={0} y1={esProjY(lat)} x2={560} y2={esProjY(lat)}
                        stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                    ))}
                    {[-8, -4, 0, 4].map(lon => (
                      <line key={`ev${lon}`} x1={esProjX(lon)} y1={0} x2={esProjX(lon)} y2={380}
                        stroke="rgba(64,96,160,0.09)" strokeWidth={0.6} />
                    ))}

                    {ccaa.map(c => {
                      const cx = esProjX(c.lon)
                      const cy = esProjY(c.lat)
                      const sc = getCcaaScore(c)
                      const r  = clamp(14 + (sc / maxCcaaScore) * 16, 14, 30)
                      const fill = factorColor(c.factor_dominante)
                      const isSelected = selectedCcaa === c.ccaa
                      const label = CCAA_ABBR[c.ccaa_iso] ?? c.ccaa.slice(0, 3).toUpperCase()
                      return (
                        <g key={c.ccaa} onClick={() => setSelectedCcaa(isSelected ? null : c.ccaa)} style={{ cursor: 'pointer' }}>
                          {isSelected && (
                            <circle cx={cx} cy={cy} r={r + 8}
                              fill="none" stroke={fill} strokeWidth={1.5} strokeOpacity={0.5}
                              style={{ filter: `drop-shadow(0 0 6px ${fill}60)` }}
                            />
                          )}
                          <circle cx={cx} cy={cy} r={r}
                            fill={fill} fillOpacity={isSelected ? 0.88 : 0.58}
                            stroke={isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                            strokeWidth={isSelected ? 1.5 : 0.8}
                            style={{ filter: isSelected ? `drop-shadow(0 0 6px ${fill}60)` : 'none' }}
                          />
                          <text x={cx} y={cy + 3.5} textAnchor="middle"
                            fill="white" fontSize={8} fontWeight={700}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                )}
              </div>

              {/* Detail panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...CARD, padding: '16px 18px' }}>
                  <SectionLabel>Factor dominante</SectionLabel>
                  {[
                    { factor: 'energia',    color: '#f59e0b' },
                    { factor: 'migracion',  color: '#ef4444' },
                    { factor: 'seguridad',  color: '#dc2626' },
                    { factor: 'comercio',   color: '#3b82f6' },
                    { factor: 'diplomatica',color: '#6366f1' },
                  ].map(f => (
                    <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, textTransform: 'capitalize' }}>{f.factor}</span>
                    </div>
                  ))}
                </div>

                {selectedCcaaData ? (
                  <div style={{ ...CARD, padding: '16px 18px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 2 }}>{selectedCcaaData.ccaa}</div>
                    <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{selectedCcaaData.ccaa_iso}</div>
                    <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: '0 0 14px', lineHeight: 1.6 }}>{selectedCcaaData.explicacion}</p>
                    {[
                      { label: 'Total',     value: selectedCcaaData.score_total,     color: '#6366f1' },
                      { label: 'Energia',   value: selectedCcaaData.score_energia,   color: '#f59e0b' },
                      { label: 'Migracion', value: selectedCcaaData.score_migracion, color: '#ef4444' },
                      { label: 'Seguridad', value: selectedCcaaData.score_seguridad, color: '#dc2626' },
                      { label: 'Comercio',  value: selectedCcaaData.score_comercio,  color: '#3b82f6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ marginBottom: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color }}>{value?.toFixed(1)}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${clamp((value / 10) * 100, 0, 100)}%`,
                            height: 4, borderRadius: 2, background: color,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...CARD, padding: '20px 18px', fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 1.6 }}>
                    Selecciona una comunidad autonoma para ver el desglose dimensional
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3 — OSINT
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 3 && (
          <div>
            {/* Top row: timeline + theme bars */}
            {thinkTanks.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, marginBottom: 20 }}>
                {/* Theme horizontal bars */}
                <div style={{ ...CARD, padding: '18px 20px' }}>
                  <SectionLabel>Temas — distribucion de cobertura</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {topTemas.map(([tema, count]) => {
                      const pct = count / maxTemas
                      const color = pct > 0.7 ? '#dc2626' : pct > 0.5 ? '#f59e0b' : pct > 0.3 ? '#3b82f6' : '#6366f1'
                      return (
                        <div key={tema} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 120, fontSize: 10, color: TEXT_SECONDARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{tema}</div>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct * 100}%`, height: 6, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 22, textAlign: 'right' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Publication velocity */}
                <div style={{ ...CARD, padding: '18px 20px' }}>
                  <SectionLabel>Velocidad publicacion — 7 dias</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64, marginBottom: 10 }}>
                    {timelineBuckets.map(b => (
                      <div key={b.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max(4, (b.count / maxBucket) * 52)}px`,
                          background: b.count > 0 ? 'linear-gradient(180deg, #0ea5e9, #6366f1)' : 'rgba(255,255,255,0.06)',
                          borderRadius: 3,
                        }} />
                        <span style={{ fontSize: 7.5, color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>{b.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: 9, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Fuentes activas</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0ea5e9' }}>{Object.keys(sourceMap).length}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
              {/* Source list */}
              <div style={{ ...CARD, padding: '16px 18px' }}>
                <SectionLabel>Fuentes activas</SectionLabel>
                {Object.entries(sourceMap).length === 0 ? (
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Sin fuentes disponibles</div>
                ) : (
                  Object.entries(sourceMap).map(([fuente, info]) => (
                    <div key={fuente} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: TEXT_PRIMARY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                          {fuente.length > 22 ? fuente.slice(0, 22) + '…' : fuente}
                        </span>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                            background: `${urgencyColor(info.maxUrgencia)}25`, color: urgencyColor(info.maxUrgencia),
                          }}>U{info.maxUrgencia}</span>
                          <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>{relTime(info.latest)}</span>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(info.items.length / maxSourceItems) * 100}%`,
                          height: 3, borderRadius: 2, background: urgencyColor(info.maxUrgencia),
                        }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Feed */}
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={ttUrgMin} onChange={e => setTtUrgMin(Number(e.target.value))} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
                  }}>
                    {[1, 2, 3, 4, 5].map(v => <option key={v} value={v} style={{ background: '#0d1b2e' }}>Urgencia min {v}</option>)}
                  </select>
                  <select value={ttNicho} onChange={e => setTtNicho(e.target.value)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', maxWidth: 180,
                  }}>
                    <option value="all" style={{ background: '#0d1b2e' }}>Todos los temas</option>
                    {ttNichos.map(n => <option key={n} value={n} style={{ background: '#0d1b2e' }}>{n}</option>)}
                  </select>
                  <input type="text" placeholder="Buscar..." value={ttQuery}
                    onChange={e => setTtQuery(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 12px', fontSize: 11,
                      fontFamily: 'inherit', outline: 'none', minWidth: 160,
                    }}
                  />
                  <span style={{ fontSize: 10, color: TEXT_SECONDARY, marginLeft: 'auto' }}>
                    {loadingOsint ? 'Cargando...' : `${ttFiltered.length} resultados`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {loadingOsint && thinkTanks.length === 0 && [0, 1, 2].map(i => (
                    <div key={i} style={{ ...CARD, padding: '18px', height: 96, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
                      <div style={{ height: 8, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 6 }} />
                      <div style={{ height: 8, width: '75%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                    </div>
                  ))}
                  {!loadingOsint && ttFiltered.length === 0 && (
                    <div style={{ ...CARD, padding: '36px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                      Sin senales OSINT que coincidan con los filtros seleccionados
                    </div>
                  )}
                  {ttFiltered.map(t => {
                    const borderColor = urgencyColor(t.urgencia)
                    const relES = t.relevancia_espana >= 7 ? '#22c55e' : t.relevancia_espana >= 4 ? '#f59e0b' : '#dc2626'
                    return (
                      <div key={t.id} style={{
                        ...CARD, borderLeft: `4px solid ${borderColor}`, padding: '14px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            background: `${borderColor}20`, color: borderColor, border: `1px solid ${borderColor}40`,
                          }}>U{t.urgencia}</span>
                          {t.fuente_tipo && (
                            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                              {t.fuente_tipo}
                            </span>
                          )}
                          {/* Relevancia dot */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: relES }} />
                            <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>ES {t.relevancia_espana?.toFixed(1)}</span>
                          </div>
                          <span style={{ fontSize: 10, color: TEXT_SECONDARY, marginLeft: 'auto' }}>{relTime(t.fecha)}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6, lineHeight: 1.4 }}>
                          {t.url ? (
                            <a href={t.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: TEXT_PRIMARY, textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#0ea5e9')}
                              onMouseLeave={e => (e.currentTarget.style.color = TEXT_PRIMARY)}>
                              {t.titulo}
                            </a>
                          ) : t.titulo}
                        </div>
                        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 10px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {t.resumen}
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 500 }}>{t.fuente}</span>
                          {toArray(t.paises_detectados).slice(0, 3).map(p => (
                            <span key={p} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(14,165,233,0.12)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.18)' }}>{p}</span>
                          ))}
                          {toArray(t.temas_detectados).slice(0, 2).map(tm => (
                            <span key={tm} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.18)' }}>{tm}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4 — ALERTAS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 4 && (
          <div>
            {/* Status strip */}
            <div style={{
              ...CARD,
              background: hasCritico ? 'rgba(220,38,38,0.07)' : hasAlto ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.04)',
              border: hasCritico ? '1px solid rgba(220,38,38,0.18)' : hasAlto ? '1px solid rgba(245,158,11,0.18)' : '1px solid rgba(34,197,94,0.13)',
              padding: '14px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {hasCritico && (
                  <div style={{ position: 'relative', width: 8, height: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#dc2626',
                      animation: 'criticalPulse 1.4s ease-in-out infinite',
                    }} />
                  </div>
                )}
                <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_SECONDARY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Estado del sistema</span>
              </div>
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: levelColor(n), flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 10, color: levelColor(n), fontWeight: 700, letterSpacing: '0.04em' }}>{n}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: TEXT_PRIMARY, lineHeight: 1 }}>{alertasCount[n]}</span>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {(['TODOS', 'CRITICO', 'ALTO', 'MEDIO'] as const).map(f => (
                <button key={f} onClick={() => setAlertFilter(f)} style={{
                  border: `1px solid ${alertFilter === f ? (f === 'TODOS' ? 'rgba(14,165,233,0.3)' : `${levelColor(f)}40`) : 'rgba(255,255,255,0.08)'}`,
                  background: alertFilter === f ? (f === 'TODOS' ? 'rgba(14,165,233,0.1)' : `${levelColor(f)}15`) : 'transparent',
                  color: alertFilter === f ? (f === 'TODOS' ? '#0ea5e9' : levelColor(f)) : TEXT_SECONDARY,
                  borderRadius: 999, padding: '5px 14px', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em',
                  transition: 'all 150ms',
                }}>{f}</button>
              ))}
              <span style={{ fontSize: 10, color: TEXT_SECONDARY, alignSelf: 'center', marginLeft: 4 }}>
                {alertasFiltered.length} alertas
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertasFiltered.map(a => {
                const lc       = levelColor(a.nivel)
                const expanded = expandAlerts.has(a.id)
                const hovered  = hoverAlerts.has(a.id)
                return (
                  <div key={a.id} style={{
                    ...CARD,
                    borderLeft: `4px solid ${lc}`,
                    padding: '16px 18px',
                    background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={() => setHoverAlerts(prev => new Set(prev).add(a.id))}
                    onMouseLeave={() => setHoverAlerts(prev => { const s = new Set(prev); s.delete(a.id); return s })}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <LevelBadge nivel={a.nivel} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, flex: 1, lineHeight: 1.4 }}>{a.titulo}</span>
                      <span style={{ fontSize: 10, color: TEXT_SECONDARY, flexShrink: 0 }}>{relTime(a.fecha)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 10px', lineHeight: 1.65 }}>
                      {a.descripcion_corta ?? a.descripcion}
                    </p>

                    {/* Causal chain */}
                    {(() => { const cadena = toArray(a.cadena_causal); return cadena.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                        {cadena.map((node, idx) => {
                          const isLast = idx === cadena.length - 1
                          const progress = idx / Math.max(1, cadena.length - 1)
                          const nodeColor = isLast ? '#dc2626' : progress > 0.5 ? '#f59e0b' : 'rgba(148,163,184,0.5)'
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{
                                fontSize: 10, padding: '3px 10px', borderRadius: 8, fontWeight: 500,
                                background: isLast ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${nodeColor}30`,
                                color: isLast ? '#fca5a5' : TEXT_SECONDARY,
                              }}>{node}</span>
                              {!isLast && <span style={{ color: 'rgba(148,163,184,0.35)', fontSize: 11 }}>→</span>}
                            </div>
                          )
                        })}
                      </div>
                    ); })()}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {a.probabilidad !== undefined && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                          P {(a.probabilidad * 100).toFixed(0)}%
                        </span>
                      )}
                      {a.horizonte && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: TEXT_SECONDARY, border: '1px solid rgba(255,255,255,0.08)' }}>
                          {a.horizonte}
                        </span>
                      )}
                      {a.confianza_sistema !== undefined && (
                        <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>Confianza: {(a.confianza_sistema * 100).toFixed(0)}%</span>
                      )}
                      {a.fuentes_detalle && a.fuentes_detalle.length > 0 && (
                        <button
                          onClick={() => toggleSet(a.id, setExpandAlerts)}
                          style={{
                            marginLeft: 'auto', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: TEXT_SECONDARY, borderRadius: 7, padding: '3px 12px', fontSize: 10,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                          }}
                        >
                          {expanded ? 'Ocultar fuentes' : `${a.fuentes_detalle.length} fuentes`}
                        </button>
                      )}
                    </div>

                    {expanded && a.fuentes_detalle && (
                      <div style={{
                        marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12,
                        background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 14px',
                      }}>
                        {a.fuentes_detalle.map((fd, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 10 }}>
                            <div>
                              {fd.url ? (
                                <a href={fd.url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 11, color: '#7dd3fc', textDecoration: 'none' }}>
                                  {fd.titulo}
                                </a>
                              ) : (
                                <span style={{ fontSize: 11, color: TEXT_PRIMARY }}>{fd.titulo}</span>
                              )}
                              <span style={{ fontSize: 10, color: TEXT_SECONDARY, marginLeft: 8 }}>{fd.fuente} · {fd.fecha?.slice(0, 10)}</span>
                            </div>
                            <span style={{ fontSize: 10, color: '#22c55e', flexShrink: 0, fontWeight: 600 }}>
                              {(fd.confianza * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {alertas.length === 0 && (
                <div style={{ ...CARD, padding: '48px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                  Sin alertas activas en este momento
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5 — IMPACTO
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 5 && (
          <div>
            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Impactos activos',       value: impactos.length, color: '#0ea5e9' },
                { label: 'Dimensiones afectadas',  value: new Set(impactos.map(i => i.dimension)).size, color: '#6366f1' },
                { label: 'Severidad media',        value: impactos.length ? (impactos.reduce((s, i) => s + i.severidad, 0) / impactos.length).toFixed(1) : '—', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ ...CARD, padding: '16px 20px', borderLeft: `3px solid ${k.color}`, boxShadow: SHADOW }}>
                  <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* P×I Matrix */}
            {scenarioPoints.length > 0 && (
              <div style={{ ...CARD, padding: '22px 26px', marginBottom: 20, boxShadow: SHADOW }}>
                <SectionLabel>Matriz Probabilidad x Impacto — RANE Key Forecast Questions</SectionLabel>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 560 300" style={{ width: '100%', maxHeight: 300 }}>
                    {/* Quadrant backgrounds */}
                    <rect x={52} y={10} width={228} height={142} fill="rgba(34,197,94,0.04)" rx={4} />
                    <rect x={280} y={10} width={272} height={142} fill="rgba(245,158,11,0.06)" rx={4} />
                    <rect x={52} y={152} width={228} height={138} fill="rgba(59,130,246,0.06)" rx={4} />
                    <rect x={280} y={152} width={272} height={138} fill="rgba(220,38,38,0.08)" rx={4} />

                    {/* Quadrant labels */}
                    {[
                      { x: 76, y: 28, text: 'VIGILANCIA',    color: '#22c55e' },
                      { x: 304, y: 28, text: 'PREPARACION',  color: '#f59e0b' },
                      { x: 76, y: 170, text: 'PLANIFICACION',color: '#3b82f6' },
                      { x: 304, y: 170, text: 'CRITICO',      color: '#dc2626' },
                    ].map(q => (
                      <text key={q.text} x={q.x} y={q.y} fill={q.color} fontSize={7.5} fontWeight={700} opacity={0.6} letterSpacing="0.06em">{q.text}</text>
                    ))}

                    {/* Axes */}
                    <line x1={52} y1={290} x2={552} y2={290} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
                    <line x1={52} y1={10}  x2={52}  y2={290} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
                    <line x1={280} y1={10} x2={280} y2={290} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="4 3" />
                    <line x1={52} y1={152} x2={552} y2={152} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="4 3" />

                    <text x={302} y={286} fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="middle">PROBABILIDAD</text>
                    <text x={14}  y={152} fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="middle" transform="rotate(-90, 14, 152)">IMPACTO</text>

                    {[0, 25, 50, 75, 100].map(v => {
                      const x = 52 + (v / 100) * 500
                      return (
                        <g key={v}>
                          <line x1={x} y1={290} x2={x} y2={293} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          <text x={x} y={300} fill="rgba(148,163,184,0.45)" fontSize={7} textAnchor="middle">{v}%</text>
                        </g>
                      )
                    })}
                    {[0, 1, 2, 3, 4, 5].map(v => {
                      const y = 290 - (v / 5) * 280
                      return (
                        <g key={v}>
                          <line x1={49} y1={y} x2={52} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          <text x={44} y={y + 3} fill="rgba(148,163,184,0.45)" fontSize={7} textAnchor="end">{v}</text>
                        </g>
                      )
                    })}

                    {scenarioPoints.map((s, idx) => {
                      const cx = 52 + s.probabilidad * 500
                      const cy = 290 - (s.impacto / 5) * 280
                      const c  = levelColor(s.nivel)
                      return (
                        <g key={idx}>
                          <circle cx={cx} cy={cy} r={8} fill={c} fillOpacity={0.65}
                            stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          {scenarioPoints.length <= 6 && (
                            <text x={cx + 11} y={cy + 3} fill={TEXT_PRIMARY} fontSize={7} fontWeight={500}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}>
                              {s.titulo.slice(0, 30)}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
                {impactosReal.length === 0 && alertas.length > 0 && (
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, marginTop: 8 }}>
                    Escenarios inferidos de alertas activas — pipeline de impactos no conectado
                  </div>
                )}
              </div>
            )}

            {/* Sector exposure bars */}
            <div style={{ ...CARD, padding: '18px 22px', marginBottom: 20 }}>
              <SectionLabel>Exposicion por sector estrategico</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SECTORS.map(s => {
                  const count = impactos.filter(i => i.dimension === s.key).length
                  const avgSev = count > 0 ? impactos.filter(i => i.dimension === s.key).reduce((sum, i) => sum + i.severidad, 0) / count : 0
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 90, fontSize: 11, color: TEXT_SECONDARY, fontWeight: 500, flexShrink: 0 }}>{s.label}</div>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(count / maxSectorCount) * 100}%`,
                          height: 8, borderRadius: 4, background: s.color,
                          boxShadow: count > 0 ? `0 0 8px ${s.color}50` : 'none',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, minWidth: 18, textAlign: 'right' }}>{count}</span>
                      {count > 0 && (
                        <span style={{ fontSize: 10, color: TEXT_SECONDARY, minWidth: 60 }}>sev {avgSev.toFixed(1)}/5</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Impact cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {impactosSorted.map(imp => {
                const hColor  = imp.horizonte === 'inmediato' || imp.horizonte === 'corto' ? '#dc2626' : imp.horizonte === 'medio' ? '#f59e0b' : '#22c55e'
                const expanded = expandImpactos.has(imp.id)
                return (
                  <div key={imp.id} style={{ ...CARD, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: `${scoreColor(imp.severidad * 2)}20`, color: scoreColor(imp.severidad * 2),
                        border: `1px solid ${scoreColor(imp.severidad * 2)}30`,
                      }}>Severidad {imp.severidad}/5</span>
                      <DimBadge dim={imp.dimension} />
                      <span style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: `${hColor}12`, color: hColor, border: `1px solid ${hColor}22`,
                      }}>{imp.horizonte}</span>
                      {imp.id.startsWith('synth-') && (
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.18)' }}>
                          inferido
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 7 }}>{imp.titulo}</div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(imp.severidad / 5) * 100}%`, height: 4, borderRadius: 2,
                        background: scoreColor(imp.severidad * 2), transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 8px', lineHeight: 1.65 }}>{imp.descripcion}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {toArray(imp.paises_origen).map(p => (
                        <span key={p} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(14,165,233,0.1)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.18)' }}>{p}</span>
                      ))}
                      {(imp.escenario_base || imp.escenario_adverso) && (
                        <button
                          onClick={() => toggleSet(imp.id, setExpandImpactos)}
                          style={{
                            marginLeft: 'auto', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: TEXT_SECONDARY, borderRadius: 7, padding: '3px 12px', fontSize: 10,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {expanded ? 'Ocultar escenarios' : 'Ver escenarios'}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {imp.escenario_base && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escenario base</div>
                            <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.6 }}>{imp.escenario_base}</p>
                          </div>
                        )}
                        {imp.escenario_adverso && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escenario adverso</div>
                            <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.6 }}>{imp.escenario_adverso}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {impactos.length === 0 && alertas.length === 0 && (
                <div style={{ ...CARD, padding: '48px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                  Sin datos de impacto disponibles — pipeline no ejecutado
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6 — TEATRO (Teatros Estrategicos)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 6 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.6, maxWidth: 720 }}>
                Vision por teatros de operacion estrategica. Cada teatro agrupa paises con vectores de riesgo compartidos
                y proyecta el impacto sobre intereses nacionales de alta prioridad.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
              {theatersWithData.map(th => {
                const levelC = levelColor(th.maxLevel)
                const totalAlerts = th.relatedAlerts.length
                const maxLC = Math.max(1, totalAlerts)
                return (
                  <div key={th.id} style={{
                    ...CARD,
                    borderLeft: `4px solid ${th.color}`,
                    padding: '20px 22px',
                    boxShadow: SHADOW,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle glow overlay */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, ${th.color}60, transparent)`,
                    }} />

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY, marginBottom: 4, letterSpacing: '-0.01em' }}>
                          {th.nombre}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {th.paises.map(p => (
                            <span key={p} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: `${th.color}12`, color: th.color, border: `1px solid ${th.color}25` }}>{p}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <LevelBadge nivel={th.maxLevel} />
                        {totalAlerts > 0 && (
                          <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Risk vectors */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Vectores de riesgo</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {th.riesgos.map((r, i) => {
                          const rColor = i === 0 ? '#dc2626' : i === 1 ? '#f59e0b' : '#3b82f6'
                          return (
                            <span key={r} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: `${rColor}12`, color: rColor, border: `1px solid ${rColor}22` }}>{r}</span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Key interests */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Intereses nacionales</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {th.intereses.map(int => (
                          <li key={int} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11, color: TEXT_SECONDARY, lineHeight: 1.4 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: th.color, marginTop: 5, flexShrink: 0 }} />
                            {int}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Alert bar chart */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Alertas por nivel</div>
                      {totalAlerts === 0 ? (
                        <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Sin alertas registradas para este teatro</div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 36 }}>
                          {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(n => {
                            const cnt = th.levelCounts[n]
                            const barH = Math.max(4, (cnt / maxLC) * 32)
                            const c   = levelColor(n)
                            return (
                              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
                                <div style={{ width: '100%', height: barH, background: cnt > 0 ? c : 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                                <span style={{ fontSize: 8, color: cnt > 0 ? c : TEXT_SECONDARY, fontWeight: cnt > 0 ? 700 : 400 }}>{cnt > 0 ? cnt : ''}</span>
                              </div>
                            )
                          })}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', height: '100%' }}>
                            {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(n => (
                              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 5, height: 5, borderRadius: 1, background: levelColor(n) }} />
                                <span style={{ fontSize: 7.5, color: TEXT_SECONDARY }}>{n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes pulseRing {
          0%, 100% { opacity: 0.3; r: 0; transform: scale(1); }
          50%       { opacity: 0.12; }
        }
        @keyframes criticalPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.3); }
        }
        @keyframes dashMove {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -18; }
        }
      `}</style>
    </div>
  )
}
