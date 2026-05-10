'use client'
import { useState, useMemo, useRef } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ── projection helpers ────────────────────────────────────────────────────────
function projX(lon: number, W = 900) { return ((lon + 180) / 360) * W }
function projY(lat: number, H = 460) { return ((90 - lat) / 180) * H }

// Spain-viewport projection (lat 35.9–43.8, lon -9.3–4.3)
const ES_LAT_MIN = 35.9, ES_LAT_MAX = 43.8, ES_LON_MIN = -9.3, ES_LON_MAX = 4.3
function esProjX(lon: number, W = 560) { return ((lon - ES_LON_MIN) / (ES_LON_MAX - ES_LON_MIN)) * W }
function esProjY(lat: number, H = 380) { return ((ES_LAT_MAX - lat) / (ES_LAT_MAX - ES_LAT_MIN)) * H }

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

// ── safe array helper — handles string | string[] | null | undefined ──────────
function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string' && val.trim().length > 0) return [val]
  return []
}

// ── continent SVG paths (equirectangular 900×460) ─────────────────────────────
// Coordinates pre-computed: x = (lon+180)/360*900, y = (90-lat)/180*460
const AFRICA_D =
  'M435 138 L475 135 L513 148 L538 153 L558 192 L578 200 L560 258 ' +
  'L540 287 L530 304 L513 317 L495 320 L480 317 L488 302 ' +
  'L408 304 L413 294 L420 276 L413 200 L405 192 L408 176 Z'

const NAMERICA_D =
  'M30 92 L50 51 L98 51 L175 51 L238 51 L295 69 L320 110 ' +
  'L283 118 L263 141 L250 166 L225 176 L210 179 L175 174 ' +
  'L158 148 L150 143 L140 113 L125 90 L68 79 L43 69 Z'

const SAMERICA_D =
  'M255 210 L295 200 L363 243 L355 292 L320 317 L288 371 L280 371 ' +
  'L270 337 L263 307 L250 243 Z'

const EUROPE_D =
  'M428 135 L458 120 L490 133 L505 135 L520 133 L538 120 L535 97 ' +
  'L505 82 L513 49 L488 49 L463 69 L438 79 L438 102 L445 107 L428 123 Z'

const ASIA_D =
  'M520 133 L540 128 L570 123 L580 136 L608 166 L650 210 L650 174 ' +
  'L680 174 L695 174 L705 225 L750 217 L755 200 L755 133 ' +
  'L773 141 L778 148 L803 120 L808 95 L700 43 L600 43 L525 51 Z'

const AUSTRALIA_D =
  'M738 320 L750 320 L773 312 L795 320 L828 315 L833 299 ' +
  'L823 287 L795 269 L760 271 Z'

const GREENLAND_D =
  'M340 77 L415 33 L400 15 L338 15 L265 36 Z'

const CONTINENTS = [
  { id: 'namerica', d: NAMERICA_D },
  { id: 'samerica', d: SAMERICA_D },
  { id: 'europe',   d: EUROPE_D },
  { id: 'africa',   d: AFRICA_D },
  { id: 'asia',     d: ASIA_D },
  { id: 'australia',d: AUSTRALIA_D },
  { id: 'greenland',d: GREENLAND_D },
]

// ── CCAA abbreviations (ISO → short label) ────────────────────────────────────
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
  if (factor === 'energia') return '#f59e0b'
  if (factor === 'migracion') return '#ef4444'
  if (factor === 'seguridad') return '#dc2626'
  if (factor === 'comercio') return '#3b82f6'
  return '#6366f1'
}
function urgencyColor(u: number) {
  if (u >= 5) return '#dc2626'
  if (u >= 4) return '#f59e0b'
  if (u >= 3) return '#3b82f6'
  return 'rgba(148,163,184,0.5)'
}
function dimColor(dim: string) {
  if (dim === 'energia') return '#f59e0b'
  if (dim === 'comercio') return '#3b82f6'
  if (dim === 'seguridad') return '#dc2626'
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
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
} as const
const TEXT_PRIMARY = 'rgba(226,232,240,0.95)'
const TEXT_SECONDARY = 'rgba(148,163,184,0.7)'
const ACCENT_GRAD = 'linear-gradient(135deg, #0ea5e9, #6366f1)'
const SHADOW = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'

// ── types ─────────────────────────────────────────────────────────────────────
interface GeoStats {
  osint_24h: number
  alertas_activas: number
  paises_monitorizados: number
  presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
}
interface RiesgoItem {
  pais: string; iso: string; score: number; interes_espana: number; lat: number; lon: number; categoria: string
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string; urgencia: number; categoria: string; resumen: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string; paises: unknown
  descripcion_corta?: string; descripcion: string; fuente: string
  cadena_causal?: unknown; fuentes_detalle?: Array<{ titulo: string; fuente: string; url?: string; fecha: string; confianza: number }>
  probabilidad?: number; horizonte?: string; confianza_sistema?: number
}
interface ImpactoItem {
  id: string; titulo: string; dimension: string; severidad: number; horizonte: string; descripcion: string; paises_origen: unknown
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

// ── sub-components ────────────────────────────────────────────────────────────
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      marginBottom: 28,
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            border: 'none',
            borderBottom: active === i ? '2px solid #0ea5e9' : '2px solid transparent',
            background: active === i ? 'rgba(14,165,233,0.08)' : 'transparent',
            padding: '12px 20px',
            marginBottom: -1,
            fontSize: 12,
            fontWeight: active === i ? 600 : 500,
            color: active === i ? TEXT_PRIMARY : TEXT_SECONDARY,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            transition: 'all 150ms',
          }}
        >
          {t}
        </button>
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

// ── IRGE computation ──────────────────────────────────────────────────────────
function computeIrge(
  riesgo: RiesgoItem[],
  alertas: AlertaItem[],
  thinkTanks: ThinkTankItem[],
): number | null {
  if (!riesgo.length && !alertas.length && !thinkTanks.length) return null
  // Component 1: Weighted average risk score (0–10 scale)
  const totalInterest = riesgo.reduce((s, r) => s + r.interes_espana, 0)
  const riskScore = totalInterest > 0
    ? riesgo.reduce((s, r) => s + r.score * r.interes_espana, 0) / totalInterest
    : 0
  // Component 2: Alert severity (0–10 scale)
  const critico = alertas.filter(a => a.nivel === 'CRITICO').length
  const alto = alertas.filter(a => a.nivel === 'ALTO').length
  const medio = alertas.filter(a => a.nivel === 'MEDIO').length
  const alertScore = alertas.length > 0
    ? (critico * 10 + alto * 6 + medio * 3) / Math.max(1, alertas.length)
    : 0
  // Component 3: Think-tank urgency (0–10 scale)
  const osintScore = thinkTanks.length > 0
    ? (thinkTanks.reduce((s, t) => s + t.urgencia, 0) / thinkTanks.length) * 2
    : 0
  const raw = riskScore * 0.4 + alertScore * 0.35 + osintScore * 0.25
  return Math.round(Math.min(100, raw * 10))
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
  const [aiQuery, setAiQuery] = useState('')
  const mapRef = useRef<SVGSVGElement>(null)

  const { data: geoStatsRaw } = useApi<GeoStats & { data?: GeoStats }>('/api/geopolitica/stats', { refreshInterval: 60_000 })
  const { data: riesgoRaw } = useApi<{ data: RiesgoItem[] }>('/api/geopolitica/riesgo', { refreshInterval: 120_000 })
  const { data: osintRaw, loading: loadingOsint } = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint', { refreshInterval: 60_000 })
  const { data: alertasRaw } = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 30_000 })
  const { data: impactosRaw } = useApi<{ data: ImpactoItem[] }>('/api/geopolitica/impactos', { refreshInterval: 120_000 })
  const { data: thinkTanksRaw } = useApi<{ data: ThinkTankItem[] }>('/api/geopolitica/think-tanks', { refreshInterval: 120_000 })
  const { data: ccaaRaw } = useApi<{ data: CcaaItem[] }>('/api/geopolitica/ccaa', { refreshInterval: 300_000 })

  const geoStats: GeoStats = (geoStatsRaw as GeoStats) ?? { osint_24h: 0, alertas_activas: 0, paises_monitorizados: 0, presencia_activa: 0, alertas_count: { CRITICO: 0, ALTO: 0, MEDIO: 0 } }
  const riesgo: RiesgoItem[] = riesgoRaw?.data ?? []
  const osint: OsintItem[] = osintRaw?.data ?? []
  const alertas: AlertaItem[] = alertasRaw?.data ?? []
  const impactosReal: ImpactoItem[] = impactosRaw?.data ?? []
  const thinkTanks: ThinkTankItem[] = thinkTanksRaw?.data ?? []
  const ccaa: CcaaItem[] = ccaaRaw?.data ?? []

  // Synthesise impactos from alerts when the real endpoint returns nothing
  const impactos: ImpactoItem[] = useMemo(() => {
    if (impactosReal.length > 0) return impactosReal
    return alertas.map(a => ({
      id: `synth-${a.id}`,
      titulo: a.titulo,
      dimension:
        a.titulo.toLowerCase().includes('energ') ? 'energia' :
        a.titulo.toLowerCase().includes('migr') ? 'diplomatica' :
        a.nivel === 'CRITICO' ? 'seguridad' : 'comercio',
      severidad:
        a.nivel === 'CRITICO' ? 5 : a.nivel === 'ALTO' ? 4 : a.nivel === 'MEDIO' ? 3 : 2,
      horizonte:
        a.horizonte ?? (a.nivel === 'CRITICO' ? 'inmediato' : a.nivel === 'ALTO' ? 'corto' : 'medio'),
      descripcion: a.descripcion_corta ?? a.descripcion,
      paises_origen: toArray(a.paises),
    }))
  }, [impactosReal, alertas])

  const riesgoSorted = [...riesgo].sort((a, b) => b.score - a.score)
  const impactosSorted = [...impactos].sort((a, b) => b.severidad - a.severidad)
  const alertasSorted = [...alertas].sort((a, b) => {
    const order = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
    return (order.indexOf(a.nivel) - order.indexOf(b.nivel)) || (new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  })

  // IRGE
  const irge = useMemo(() => computeIrge(riesgo, alertas, thinkTanks), [riesgo, alertas, thinkTanks])

  // KPI derived
  const kpiCards = [
    { label: 'Señales OSINT 24h',     value: geoStats.osint_24h,            accent: '#0ea5e9' },
    { label: 'Alertas activas',        value: geoStats.alertas_activas,       accent: '#dc2626' },
    { label: 'Países monitorizados',   value: geoStats.paises_monitorizados,  accent: '#22c55e' },
    { label: 'Presencia activa',       value: geoStats.presencia_activa,      accent: '#6366f1' },
  ]

  // Think-tanks processing
  const ttFiltered = thinkTanks
    .filter(t => t.urgencia >= ttUrgMin && (ttNicho === 'all' || toArray(t.temas_detectados).includes(ttNicho)))
    .filter(t => !ttQuery || t.titulo.toLowerCase().includes(ttQuery.toLowerCase()) || t.resumen.toLowerCase().includes(ttQuery.toLowerCase()))
    .sort((a, b) => b.urgencia - a.urgencia || b.relevancia_espana - a.relevancia_espana)

  const ttNichos = Array.from(new Set(thinkTanks.flatMap(t => toArray(t.temas_detectados))))

  // Source stats
  const sourceMap: Record<string, { items: ThinkTankItem[]; maxUrgencia: number; latest: string }> = {}
  for (const t of thinkTanks) {
    if (!sourceMap[t.fuente]) sourceMap[t.fuente] = { items: [], maxUrgencia: 0, latest: t.fecha }
    sourceMap[t.fuente].items.push(t)
    if (t.urgencia > sourceMap[t.fuente].maxUrgencia) sourceMap[t.fuente].maxUrgencia = t.urgencia
    if (t.fecha > sourceMap[t.fuente].latest) sourceMap[t.fuente].latest = t.fecha
  }
  const maxSourceItems = Math.max(1, ...Object.values(sourceMap).map(s => s.items.length))

  // Temas count (for treemap-style visualization)
  const temasCount: Record<string, number> = {}
  for (const t of thinkTanks) {
    for (const tema of toArray(t.temas_detectados)) {
      temasCount[tema] = (temasCount[tema] ?? 0) + 1
    }
  }
  const topTemas = Object.entries(temasCount).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const maxTemas = Math.max(1, topTemas[0]?.[1] ?? 1)

  // Publication timeline (last 7 days buckets)
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

  // Alertas system status
  const hasCritico = alertas.some(a => a.nivel === 'CRITICO')
  const hasAlto = alertas.some(a => a.nivel === 'ALTO')
  const alertasCount = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
  for (const a of alertas) {
    const k = (['CRITICO', 'ALTO', 'MEDIO', 'BAJO'].includes(a.nivel) ? a.nivel : 'BAJO') as keyof typeof alertasCount
    alertasCount[k]++
  }

  // Impactos heatmap
  const HORIZONTES = ['inmediato', 'corto', 'medio', 'largo']
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

  // Scenario P×I scatter data derived from alerts + impactos
  const scenarioPoints: ScenarioPoint[] = useMemo(() => {
    const pts: ScenarioPoint[] = alertas.map(a => ({
      titulo: a.titulo,
      probabilidad: a.probabilidad ?? (a.nivel === 'CRITICO' ? 0.78 : a.nivel === 'ALTO' ? 0.55 : a.nivel === 'MEDIO' ? 0.35 : 0.15),
      impacto: a.nivel === 'CRITICO' ? 4.8 : a.nivel === 'ALTO' ? 3.5 : a.nivel === 'MEDIO' ? 2.4 : 1.3,
      nivel: a.nivel,
    }))
    // Add real impactos as additional points if we have them
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

  // CCAA
  const selectedCcaaData = ccaa.find(c => c.ccaa === selectedCcaa)
  const getCcaaScore = (c: CcaaItem) => {
    if (ccaaDim === 'energia') return c.score_energia
    if (ccaaDim === 'migracion') return c.score_migracion
    if (ccaaDim === 'seguridad') return c.score_seguridad
    return c.score_total
  }
  const maxCcaaScore = Math.max(1, ...ccaa.map(c => getCcaaScore(c)))

  // Top 5 conexiones españa
  const top5Risk = [...riesgo]
    .sort((a, b) => (b.score * b.interes_espana) - (a.score * a.interes_espana))
    .slice(0, 5)

  // Toggle helpers
  function toggleAlert(id: string, set: React.Dispatch<React.SetStateAction<Set<string>>>) {
    set(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const voidOsint = osint
  void voidOsint

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: TEXT_PRIMARY, fontFamily: '-apple-system, "SF Pro Display", In