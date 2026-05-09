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
  id: string; titulo: string; nivel: string; fecha: string; paises: string[]
  descripcion_corta?: string; descripcion: string; fuente: string
  cadena_causal?: string[]; fuentes_detalle?: Array<{ titulo: string; fuente: string; url?: string; fecha: string; confianza: number }>
  probabilidad?: number; horizonte?: string; confianza_sistema?: number
}
interface ImpactoItem {
  id: string; titulo: string; dimension: string; severidad: number; horizonte: string; descripcion: string; paises_origen: string[]
  escenario_base?: string; escenario_adverso?: string
}
interface ThinkTankItem {
  id: string; titulo: string; fuente: string; fuente_tipo: string; fecha: string
  url: string; resumen: string; urgencia: number; relevancia_espana: number
  paises_detectados: string[]; temas_detectados: string[]
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
      paises_origen: a.paises ?? [],
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
    .filter(t => t.urgencia >= ttUrgMin && (ttNicho === 'all' || t.temas_detectados?.includes(ttNicho)))
    .filter(t => !ttQuery || t.titulo.toLowerCase().includes(ttQuery.toLowerCase()) || t.resumen.toLowerCase().includes(ttQuery.toLowerCase()))
    .sort((a, b) => b.urgencia - a.urgencia || b.relevancia_espana - a.relevancia_espana)

  const ttNichos = Array.from(new Set(thinkTanks.flatMap(t => t.temas_detectados ?? [])))

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
    for (const tema of (t.temas_detectados ?? [])) {
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
    <div style={{ minHeight: '100vh', background: '#050d1a', color: TEXT_PRIMARY, fontFamily: '-apple-system, "SF Pro Display", Inter, system-ui, sans-serif' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* ── IRGE Module Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.90) 50%, rgba(15,23,42,0.95) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16,
          padding: '22px 28px',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: '220px 1fr auto',
          gap: 28,
          alignItems: 'center',
        }}>
          {/* IRGE score */}
          <div>
            <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              IRGE — Indice de Riesgo Geopolitico Espana
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 54, fontWeight: 900, lineHeight: 1,
                color: irge !== null ? irgeColor(irge) : TEXT_SECONDARY,
                letterSpacing: '-0.04em',
              }}>
                {irge ?? '—'}
              </span>
              {irge !== null && (
                <span style={{ fontSize: 20, color: TEXT_SECONDARY, fontWeight: 400 }}>/100</span>
              )}
            </div>
            {irge !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                color: irgeColor(irge), textTransform: 'uppercase',
              }}>
                {irgeSemaforo(irge)}
              </span>
            )}
          </div>

          {/* Gauge bar + components */}
          <div>
            <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 6 }}>
              <div style={{
                width: `${irge ?? 0}%`,
                height: 8, borderRadius: 4,
                background: 'linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #dc2626 100%)',
                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
              {/* Zone markers */}
              {[30, 50, 70].map(v => (
                <div key={v} style={{
                  position: 'absolute', top: -2, left: `${v}%`,
                  width: 2, height: 12, background: 'rgba(255,255,255,0.15)',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              {['Bajo', 'Moderado', 'Elevado', 'Critico'].map(l => (
                <span key={l} style={{ fontSize: 9, color: TEXT_SECONDARY, letterSpacing: '0.04em' }}>{l}</span>
              ))}
            </div>
            {/* Component breakdown */}
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Riesgo pais', value: riesgo.length > 0 ? (riesgo.slice(0,3).reduce((s,r)=>s+r.score,0)/3).toFixed(1) : '—', color: '#0ea5e9' },
                { label: 'Alertas activas', value: alertas.length, color: '#dc2626' },
                { label: 'Senales OSINT', value: thinkTanks.length, color: '#6366f1' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KPI strip (right column) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {kpiCards.map((k) => (
              <div key={k.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${k.accent}`,
                borderRadius: 10,
                padding: '10px 14px',
              }}>
                <div style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.accent }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        <TabBar
          items={['Mapa Global', 'Espana CCAA', 'OSINT Intelligence', 'Alertas & Senales', 'Impacto', 'Analisis IA']}
          active={tab}
          onChange={setTab}
        />

        {/* ── TAB 0 — MAPA GLOBAL ── */}
        {tab === 0 && (
          <div>
            <div style={{ ...CARD, boxShadow: SHADOW, padding: 0, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
              <svg
                ref={mapRef}
                viewBox="0 0 900 460"
                style={{ width: '100%', background: '#020c1b', display: 'block' }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Continent fills */}
                {CONTINENTS.map(c => (
                  <path
                    key={c.id}
                    d={c.d}
                    fill="rgba(30,58,95,0.55)"
                    stroke="rgba(56,100,160,0.35)"
                    strokeWidth={0.8}
                  />
                ))}

                {/* Graticule */}
                {[-60, -30, 0, 30, 60].map(lat => (
                  <line key={`h${lat}`}
                    x1={0} y1={projY(lat)} x2={900} y2={projY(lat)}
                    stroke="rgba(64,96,160,0.1)" strokeWidth={0.6} />
                ))}
                {[-120, -60, 0, 60, 120].map(lon => (
                  <line key={`v${lon}`}
                    x1={projX(lon)} y1={0} x2={projX(lon)} y2={460}
                    stroke="rgba(64,96,160,0.1)" strokeWidth={0.6} />
                ))}

                {/* Equator line */}
                <line x1={0} y1={projY(0)} x2={900} y2={projY(0)}
                  stroke="rgba(64,96,160,0.25)" strokeWidth={1} strokeDasharray="6 4" />

                {/* Connection lines: Spain to top 5 */}
                {top5Risk.map(r => (
                  <line key={`line-${r.iso}`}
                    x1={projX(-3.7)} y1={projY(40.4)}
                    x2={projX(r.lon)} y2={projY(r.lat)}
                    stroke="rgba(6,182,212,0.3)" strokeWidth={1.4}
                    strokeDasharray="5 4"
                  />
                ))}

                {/* Risk bubbles */}
                {riesgoSorted.map(r => {
                  const cx = projX(r.lon)
                  const cy = projY(r.lat)
                  const radius = clamp(r.score * 3.5, 5, 32)
                  const fill = scoreColor(r.score)
                  return (
                    <g key={r.iso}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                        setTooltip({
                          x: (cx / 900) * rect.width + rect.left,
                          y: (cy / 460) * rect.height + rect.top - 48,
                          text: `${r.pais}  Score: ${r.score.toFixed(1)}  |  Interes ES: ${r.interes_espana.toFixed(1)}`,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'default' }}
                    >
                      <circle cx={cx} cy={cy} r={radius}
                        fill={fill} fillOpacity={0.75}
                        stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                      />
                      <circle cx={cx} cy={cy} r={radius}
                        fill="none" stroke={fill} strokeWidth={1.5} strokeOpacity={0.4}
                        style={{ animation: 'none' }}
                      />
                      {radius >= 14 && (
                        <text x={cx} y={cy + 3.5} textAnchor="middle" fill="white" fontSize={9} fontWeight={700}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {r.iso.slice(0, 2)}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Spain star marker */}
                {(() => {
                  const cx = projX(-3.7), cy = projY(40.4)
                  const pts = Array.from({ length: 5 }, (_, k) => {
                    const a = (k * 72 - 90) * Math.PI / 180
                    const a2 = (k * 72 - 90 + 36) * Math.PI / 180
                    return `${cx + 9 * Math.cos(a)},${cy + 9 * Math.sin(a)} ${cx + 4 * Math.cos(a2)},${cy + 4 * Math.sin(a2)}`
                  }).join(' ')
                  return (
                    <polygon points={pts} fill="#0ea5e9"
                      stroke="rgba(255,255,255,0.6)" strokeWidth={1.2}
                      style={{ filter: 'drop-shadow(0 0 6px rgba(14,165,233,0.8))' }}
                    />
                  )
                })()}

                {/* Spain label */}
                <text x={projX(-3.7) + 12} y={projY(40.4) + 4}
                  fill="#7dd3fc" fontSize={9} fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  ESP
                </text>
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div style={{
                  position: 'fixed', left: tooltip.x, top: tooltip.y,
                  background: '#0d1f3a', border: '1px solid rgba(14,165,233,0.3)',
                  borderRadius: 8, padding: '8px 14px', fontSize: 12, color: TEXT_PRIMARY,
                  pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  transform: 'translateX(-50%)',
                }}>
                  {tooltip.text}
                </div>
              )}

              {/* Legend */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Riesgo:</span>
                {[
                  { label: 'Critico >=8', color: '#dc2626' },
                  { label: 'Alto >=6', color: '#f59e0b' },
                  { label: 'Medio >=4', color: '#3b82f6' },
                  { label: 'Bajo', color: '#22c55e' },
                  { label: 'Espana', color: '#0ea5e9' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{l.label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: TEXT_SECONDARY }}>{riesgoSorted.length} paises monitorizados</span>
              </div>
            </div>

            {/* Risk table */}
            <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['#', 'Pais', 'Score riesgo', 'Interes Espana', 'Categoria'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: h === 'Pais' || h === 'Categoria' || h === '#' ? 'left' : 'right',
                        fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riesgoSorted.map((r, i) => (
                    <tr key={r.iso} style={{
                      borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}
                    >
                      <td style={{ padding: '10px 16px', color: TEXT_SECONDARY, fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_PRIMARY }}>{r.pais}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}><ScorePill score={r.score} /></td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: TEXT_SECONDARY }}>{r.interes_espana.toFixed(1)}</td>
                      <td style={{ padding: '10px 16px' }}><DimBadge dim={r.categoria} /></td>
                    </tr>
                  ))}
                  {riesgoSorted.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12 }}>Sin datos de riesgo disponibles</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 1 — ESPANA CCAA ── */}
        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['total', 'energia', 'migracion', 'seguridad'] as const).map(d => (
                <button key={d} onClick={() => setCcaaDim(d)} style={{
                  border: `1px solid ${ccaaDim === d ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`,
                  background: ccaaDim === d ? 'rgba(14,165,233,0.15)' : 'transparent',
                  color: ccaaDim === d ? '#0ea5e9' : TEXT_SECONDARY,
                  borderRadius: 999, padding: '5px 14px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                  transition: 'all 150ms',
                }}>{d === 'total' ? 'Total' : d.charAt(0).toUpperCase() + d.slice(1)}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
              {/* CCAA SVG bubble map */}
              <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden', minHeight: 400 }}>
                {ccaa.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 12, padding: '16px 24px', fontSize: 13, color: '#f59e0b', textAlign: 'center',
                    }}>
                      Datos de riesgo CCAA no disponibles — pipeline no ejecutado
                    </div>
                  </div>
                ) : (
                  <svg viewBox="0 0 560 380" style={{ width: '100%', background: '#020c1b', display: 'block' }}>
                    {/* Spain outline graticule */}
                    {[36, 38, 40, 42, 44].map(lat => (
                      <line key={`el${lat}`} x1={0} y1={esProjY(lat)} x2={560} y2={esProjY(lat)}
                        stroke="rgba(64,96,160,0.1)" strokeWidth={0.6} />
                    ))}
                    {[-8, -4, 0, 4].map(lon => (
                      <line key={`ev${lon}`} x1={esProjX(lon)} y1={0} x2={esProjX(lon)} y2={380}
                        stroke="rgba(64,96,160,0.1)" strokeWidth={0.6} />
                    ))}

                    {ccaa.map(c => {
                      const cx = esProjX(c.lon)
                      const cy = esProjY(c.lat)
                      const sc = getCcaaScore(c)
                      const r = clamp(14 + (sc / maxCcaaScore) * 14, 14, 28)
                      const fill = factorColor(c.factor_dominante)
                      const isSelected = selectedCcaa === c.ccaa
                      // Derive label: prefer CCAA_ABBR lookup, fallback to first 3 chars of name
                      const label = CCAA_ABBR[c.ccaa_iso] ?? c.ccaa.slice(0, 3).toUpperCase()
                      return (
                        <g key={c.ccaa} onClick={() => setSelectedCcaa(isSelected ? null : c.ccaa)} style={{ cursor: 'pointer' }}>
                          <circle cx={cx} cy={cy} r={r + (isSelected ? 3 : 0)}
                            fill={fill} fillOpacity={isSelected ? 0.9 : 0.6}
                            stroke={isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          <text x={cx} y={cy + 3.5} textAnchor="middle" fill="white"
                            fontSize={8} fontWeight={700} style={{ pointerEvents: 'none', userSelect: 'none' }}>
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
                <div style={{ ...CARD, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Factor dominante</div>
                  {[
                    { factor: 'energia', color: '#f59e0b' },
                    { factor: 'migracion', color: '#ef4444' },
                    { factor: 'seguridad', color: '#dc2626' },
                    { factor: 'comercio', color: '#3b82f6' },
                    { factor: 'diplomatica', color: '#6366f1' },
                  ].map(f => (
                    <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, textTransform: 'capitalize' }}>{f.factor}</span>
                    </div>
                  ))}
                </div>

                {selectedCcaaData ? (
                  <div style={{ ...CARD, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 4 }}>{selectedCcaaData.ccaa}</div>
                    <div style={{
                      fontSize: 9, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', marginBottom: 10, opacity: 0.6,
                    }}>{selectedCcaaData.ccaa_iso}</div>
                    <div style={{ fontSize: 10, color: TEXT_SECONDARY, marginBottom: 10, lineHeight: 1.5 }}>{selectedCcaaData.explicacion}</div>
                    {[
                      { label: 'Total', value: selectedCcaaData.score_total, color: '#6366f1' },
                      { label: 'Energia', value: selectedCcaaData.score_energia, color: '#f59e0b' },
                      { label: 'Migracion', value: selectedCcaaData.score_migracion, color: '#ef4444' },
                      { label: 'Seguridad', value: selectedCcaaData.score_seguridad, color: '#dc2626' },
                      { label: 'Comercio', value: selectedCcaaData.score_comercio, color: '#3b82f6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color }}>{value?.toFixed(1)}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                          <div style={{
                            width: `${clamp((value / 10) * 100, 0, 100)}%`,
                            height: 4, borderRadius: 2, background: color,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...CARD, padding: '14px 16px', fontSize: 11, color: TEXT_SECONDARY, textAlign: 'center' }}>
                    Pulsa una CCAA para ver el desglose
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2 — OSINT INTELLIGENCE ── */}
        {tab === 2 && (
          <div>
            {/* Synthesis section: theme treemap + timeline sparkline */}
            {thinkTanks.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, marginBottom: 20 }}>
                {/* Theme bars (treemap-style) */}
                <div style={{ ...CARD, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                    Temas — distribucion de cobertura
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {topTemas.map(([tema, count]) => {
                      const pct = count / maxTemas
                      const bg = pct > 0.7 ? '#dc2626' : pct > 0.5 ? '#f59e0b' : pct > 0.3 ? '#3b82f6' : '#6366f1'
                      return (
                        <div key={tema} style={{
                          background: `${bg}18`,
                          border: `1px solid ${bg}35`,
                          borderRadius: 8,
                          padding: `${6 + pct * 4}px ${10 + pct * 4}px`,
                          fontSize: clamp(10 + pct * 3, 10, 13),
                          fontWeight: pct > 0.5 ? 700 : 500,
                          color: pct > 0.5 ? TEXT_PRIMARY : TEXT_SECONDARY,
                          display: 'flex', alignItems: 'center', gap: 6,
                          cursor: 'default',
                        }}>
                          <span>{tema}</span>
                          <span style={{ fontSize: 9, color: bg, fontWeight: 700 }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Publication timeline sparkline */}
                <div style={{ ...CARD, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                    Publicaciones — 7 dias
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
                    {timelineBuckets.map(b => (
                      <div key={b.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max(6, (b.count / maxBucket) * 44)}px`,
                          background: b.count > 0 ? ACCENT_GRAD : 'rgba(255,255,255,0.06)',
                          borderRadius: 3,
                          transition: 'height 0.3s ease',
                        }} />
                        <span style={{ fontSize: 8, color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>
                          {b.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: 9, color: TEXT_SECONDARY, marginBottom: 4 }}>Fuentes activas</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0ea5e9' }}>{Object.keys(sourceMap).length}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...CARD, padding: '16px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Fuentes activas</div>
                  {Object.entries(sourceMap).length === 0 ? (
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Sin fuentes</div>
                  ) : (
                    Object.entries(sourceMap).map(([fuente, info]) => (
                      <div key={fuente} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: TEXT_PRIMARY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                            {fuente.length > 22 ? fuente.slice(0, 22) + '…' : fuente}
                          </span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                              background: `${urgencyColor(info.maxUrgencia)}30`, color: urgencyColor(info.maxUrgencia),
                            }}>U{info.maxUrgencia}</span>
                            <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>{relTime(info.latest)}</span>
                          </div>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                          <div style={{
                            width: `${(info.items.length / maxSourceItems) * 100}%`,
                            height: 3, borderRadius: 2, background: urgencyColor(info.maxUrgencia),
                          }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right column */}
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={ttUrgMin} onChange={e => setTtUrgMin(Number(e.target.value))} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 10px', fontSize: 12,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}>
                    {[1, 2, 3, 4, 5].map(v => <option key={v} value={v} style={{ background: '#0d1b2e' }}>Urgencia min {v}</option>)}
                  </select>
                  <select value={ttNicho} onChange={e => setTtNicho(e.target.value)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 10px', fontSize: 12,
                    fontFamily: 'inherit', cursor: 'pointer', maxWidth: 180,
                  }}>
                    <option value="all" style={{ background: '#0d1b2e' }}>Todos los temas</option>
                    {ttNichos.map(n => <option key={n} value={n} style={{ background: '#0d1b2e' }}>{n}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Buscar..." value={ttQuery}
                    onChange={e => setTtQuery(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: TEXT_PRIMARY, borderRadius: 8, padding: '6px 12px', fontSize: 12,
                      fontFamily: 'inherit', outline: 'none', minWidth: 160,
                    }}
                  />
                  <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginLeft: 'auto' }}>
                    {loadingOsint ? 'Cargando...' : `${ttFiltered.length} resultados`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {loadingOsint && thinkTanks.length === 0 && (
                    [0, 1, 2].map(i => (
                      <div key={i} style={{
                        ...CARD, padding: '16px 18px', height: 100,
                        background: 'rgba(255,255,255,0.02)',
                      }}>
                        <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
                        <div style={{ height: 8, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 6 }} />
                        <div style={{ height: 8, width: '75%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                      </div>
                    ))
                  )}
                  {!loadingOsint && ttFiltered.length === 0 && (
                    <div style={{ ...CARD, padding: '32px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                      Sin senales OSINT — ejecutar pipeline
                    </div>
                  )}
                  {ttFiltered.map(t => {
                    const borderColor = t.urgencia >= 5 ? '#dc2626' : t.urgencia >= 4 ? '#f59e0b' : t.urgencia >= 3 ? '#3b82f6' : 'rgba(255,255,255,0.1)'
                    return (
                      <div key={t.id} style={{
                        ...CARD,
                        borderLeft: `3px solid ${borderColor}`,
                        padding: '14px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            background: `${borderColor}20`, color: borderColor,
                            border: `1px solid ${borderColor}40`,
                          }}>U{t.urgencia}</span>
                          {t.fuente_tipo && (
                            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                              {t.fuente_tipo}
                            </span>
                          )}
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
                          {t.paises_detectados?.slice(0, 3).map(p => (
                            <span key={p} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(14,165,233,0.15)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.2)' }}>{p}</span>
                          ))}
                          {t.temas_detectados?.slice(0, 2).map(tm => (
                            <span key={tm} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{tm}</span>
                          ))}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>Relevancia ES</span>
                            <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                              <div style={{ width: `${clamp((t.relevancia_espana / 10) * 100, 0, 100)}%`, height: 3, borderRadius: 2, background: ACCENT_GRAD }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3 — ALERTAS & SENALES ── */}
        {tab === 3 && (
          <div>
            <div style={{
              ...CARD,
              background: hasCritico ? 'rgba(220,38,38,0.08)' : hasAlto ? 'rgba(245,158,11,0.06)' : 'rgba(34,197,94,0.05)',
              border: hasCritico ? '1px solid rgba(220,38,38,0.2)' : hasAlto ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(34,197,94,0.15)',
              padding: '14px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Estado del sistema</span>
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: levelColor(n), flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: levelColor(n), fontWeight: 700 }}>{n}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: TEXT_PRIMARY }}>{alertasCount[n]}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertasSorted.map(a => {
                const lc = levelColor(a.nivel)
                const expanded = expandAlerts.has(a.id)
                const hovered = hoverAlerts.has(a.id)
                return (
                  <div key={a.id} style={{
                    ...CARD,
                    borderLeft: `3px solid ${lc}`,
                    padding: '14px 18px',
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
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 10px', lineHeight: 1.6 }}>
                      {a.descripcion_corta ?? a.descripcion}
                    </p>

                    {a.cadena_causal && a.cadena_causal.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {a.cadena_causal.map((node, idx) => {
                          const isLast = idx === a.cadena_causal!.length - 1
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 10, padding: '3px 10px', borderRadius: 8, fontWeight: 500,
                                background: isLast ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.05)',
                                border: isLast ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                color: isLast ? '#fca5a5' : TEXT_SECONDARY,
                              }}>{node}</span>
                              {!isLast && <span style={{ color: TEXT_SECONDARY, fontSize: 11, opacity: 0.5 }}>→</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}

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
                          onClick={() => toggleAlert(a.id, setExpandAlerts)}
                          style={{
                            marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                            color: TEXT_SECONDARY, borderRadius: 6, padding: '2px 10px', fontSize: 10,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                          }}
                        >
                          {expanded ? 'Ocultar fuentes' : `Ver ${a.fuentes_detalle.length} fuentes`}
                        </button>
                      )}
                    </div>

                    {expanded && a.fuentes_detalle && (
                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                        {a.fuentes_detalle.map((fd, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 10 }}>
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
                            <span style={{ fontSize: 10, color: '#22c55e', flexShrink: 0 }}>
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
                <div style={{ ...CARD, padding: '40px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                  Sin alertas activas
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4 — IMPACTO DOMESTICO ── */}
        {tab === 4 && (
          <div>
            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Impactos activos', value: impactos.length, color: '#0ea5e9' },
                { label: 'Dimensiones afectadas', value: new Set(impactos.map(i => i.dimension)).size, color: '#6366f1' },
                { label: 'Severidad media', value: impactos.length ? (impactos.reduce((s, i) => s + i.severidad, 0) / impactos.length).toFixed(1) : '—', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ ...CARD, padding: '14px 18px', borderLeft: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Scenario P×I matrix */}
            {scenarioPoints.length > 0 && (
              <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  Matriz Probabilidad × Impacto
                </div>
                <div style={{ fontSize: 10, color: TEXT_SECONDARY, marginBottom: 16 }}>
                  Escenarios derivados de alertas activas — metodologia RANE Key Forecast Questions
                </div>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 480 260" style={{ width: '100%', maxHeight: 260 }}>
                    {/* Background quadrants */}
                    <rect x={48} y={8} width={192} height={124} fill="rgba(34,197,94,0.05)" />
                    <rect x={240} y={8} width={232} height={124} fill="rgba(245,158,11,0.07)" />
                    <rect x={48} y={132} width={192} height={120} fill="rgba(59,130,246,0.07)" />
                    <rect x={240} y={132} width={232} height={120} fill="rgba(220,38,38,0.09)" />

                    {/* Quadrant labels */}
                    {[
                      { x: 72, y: 24, text: 'Vigilancia', color: '#22c55e' },
                      { x: 264, y: 24, text: 'Preparacion', color: '#f59e0b' },
                      { x: 72, y: 148, text: 'Planificacion', color: '#3b82f6' },
                      { x: 264, y: 148, text: 'CRITICO', color: '#dc2626' },
                    ].map(q => (
                      <text key={q.text} x={q.x} y={q.y} fill={q.color} fontSize={8} fontWeight={700} opacity={0.7}>{q.text}</text>
                    ))}

                    {/* Axes */}
                    <line x1={48} y1={252} x2={472} y2={252} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                    <line x1={48} y1={8} x2={48} y2={252} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

                    {/* Axis dividers */}
                    <line x1={240} y1={8} x2={240} y2={252} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 3" />
                    <line x1={48} y1={132} x2={472} y2={132} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 3" />

                    {/* Axis labels */}
                    <text x={260} y={250} fill="rgba(148,163,184,0.7)" fontSize={8} textAnchor="middle">Probabilidad →</text>
                    <text x={12} y={140} fill="rgba(148,163,184,0.7)" fontSize={8} textAnchor="middle"
                      transform="rotate(-90, 12, 140)">Impacto →</text>

                    {/* P axis ticks */}
                    {[0, 25, 50, 75, 100].map(v => {
                      const x = 48 + (v / 100) * 424
                      return (
                        <g key={v}>
                          <line x1={x} y1={252} x2={x} y2={255} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          <text x={x} y={266} fill="rgba(148,163,184,0.5)" fontSize={7} textAnchor="middle">{v}%</text>
                        </g>
                      )
                    })}

                    {/* Impact axis ticks */}
                    {[0, 1, 2, 3, 4, 5].map(v => {
                      const y = 252 - (v / 5) * 244
                      return (
                        <g key={v}>
                          <line x1={45} y1={y} x2={48} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          <text x={40} y={y + 3} fill="rgba(148,163,184,0.5)" fontSize={7} textAnchor="end">{v}</text>
                        </g>
                      )
                    })}

                    {/* Scenario points */}
                    {scenarioPoints.map((s, idx) => {
                      const cx = 48 + s.probabilidad * 424
                      const cy = 252 - (s.impacto / 5) * 244
                      const c = levelColor(s.nivel)
                      return (
                        <g key={idx}>
                          <circle cx={cx} cy={cy} r={8} fill={c} fillOpacity={0.7}
                            stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          {scenarioPoints.length <= 6 && (
                            <text x={cx + 11} y={cy + 3} fill={TEXT_PRIMARY} fontSize={7.5} fontWeight={500}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}>
                              {s.titulo.slice(0, 28)}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
                {impactosReal.length === 0 && alertas.length > 0 && (
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, marginTop: 8, fontStyle: 'italic' }}>
                    Escenarios inferidos de alertas activas — conectar pipeline de impactos para datos reales
                  </div>
                )}
              </div>
            )}

            {/* Severity heatmap */}
            <div style={{ ...CARD, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Matriz de severidad — Horizonte × Dimension</div>
              <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr)', gap: 6 }}>
                <div />
                {DIMENSIONES.map(d => (
                  <div key={d} style={{ fontSize: 9, fontWeight: 700, color: dimColor(d), textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{d}</div>
                ))}
                {HORIZONTES.map(h => (
                  <>
                    <div key={h} style={{ fontSize: 9, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', textTransform: 'capitalize', fontWeight: 600 }}>{h}</div>
                    {DIMENSIONES.map(d => {
                      const cell = heatmap[h]?.[d] ?? { count: 0, avgSeveridad: 0 }
                      const bg = cell.count === 0 ? 'rgba(255,255,255,0.04)' :
                        cell.avgSeveridad >= 5 ? 'rgba(220,38,38,0.7)' :
                          cell.avgSeveridad >= 4 ? 'rgba(245,158,11,0.6)' :
                            cell.avgSeveridad >= 3 ? 'rgba(59,130,246,0.5)' :
                              'rgba(255,255,255,0.08)'
                      return (
                        <div key={d} style={{
                          height: 44, borderRadius: 6, background: bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, fontWeight: 800, color: cell.count > 0 ? 'rgba(255,255,255,0.92)' : TEXT_SECONDARY,
                          border: cell.count > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        }}>
                          {cell.count > 0 ? cell.count : ''}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
              {impactos.length === 0 && (
                <div style={{ marginTop: 14, fontSize: 11, color: TEXT_SECONDARY, textAlign: 'center' }}>
                  Sin datos de impacto — ejecutar pipeline de impactos para poblar la matriz
                </div>
              )}
            </div>

            {/* Impact cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {impactosSorted.map(imp => {
                const hColor = imp.horizonte === 'inmediato' || imp.horizonte === 'corto' ? '#dc2626' : imp.horizonte === 'medio' ? '#f59e0b' : '#22c55e'
                const expanded = expandImpactos.has(imp.id)
                return (
                  <div key={imp.id} style={{ ...CARD, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: `${scoreColor(imp.severidad * 2)}20`, color: scoreColor(imp.severidad * 2),
                        border: `1px solid ${scoreColor(imp.severidad * 2)}30`,
                      }}>Severidad {imp.severidad}/5</span>
                      <DimBadge dim={imp.dimension} />
                      <span style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: `${hColor}15`, color: hColor, border: `1px solid ${hColor}25`,
                      }}>{imp.horizonte}</span>
                      {imp.id.startsWith('synth-') && (
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                          inferido
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6 }}>{imp.titulo}</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                        <div style={{
                          width: `${(imp.severidad / 5) * 100}%`, height: 4, borderRadius: 2,
                          background: scoreColor(imp.severidad * 2),
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 8px', lineHeight: 1.6 }}>{imp.descripcion}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {imp.paises_origen.map(p => (
                        <span key={p} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: 'rgba(14,165,233,0.12)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.2)' }}>{p}</span>
                      ))}
                      {(imp.escenario_base || imp.escenario_adverso) && (
                        <button
                          onClick={() => toggleAlert(imp.id, setExpandImpactos)}
                          style={{
                            marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                            color: TEXT_SECONDARY, borderRadius: 6, padding: '2px 10px', fontSize: 10,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {expanded ? 'Ocultar escenarios' : 'Ver escenarios'}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {imp.escenario_base && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escenario base</div>
                            <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.5 }}>{imp.escenario_base}</p>
                          </div>
                        )}
                        {imp.escenario_adverso && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escenario adverso</div>
                            <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.5 }}>{imp.escenario_adverso}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {impactos.length === 0 && alertas.length === 0 && (
                <div style={{ ...CARD, padding: '40px 20px', textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
                  Sin datos de impacto disponibles
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5 — ANALISIS IA ── */}
        {tab === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...CARD, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Politeia Brain</div>
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Modulo de analisis geopolitico</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: TEXT_SECONDARY,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999, padding: '4px 12px',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />
                  No conectado
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.75, margin: 0 }}>
                  Sistema de analisis geopolitico estrategico basado en corpus OSINT. Permite consultar en lenguaje natural sobre paises, conflictos y riesgos para actores e intereses espanoles.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { title: 'Consulta RAG', desc: 'Acceso vectorial a todo el corpus OSINT procesado. Respuestas con citas a fuentes primarias.' },
                  { title: 'Briefing Diario', desc: 'Sintesis automatica de los eventos de las ultimas 24h con impacto en intereses nacionales.' },
                  { title: 'Analisis de Pais', desc: 'Perfil completo de riesgo con evaluacion de estabilidad, relaciones bilaterales y proyecciones 90 dias.' },
                ].map(c => (
                  <div key={c.title} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 6 }}>{c.title}</div>
                    <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.55 }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...CARD, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Consulta geopolitica</div>
              <textarea
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                placeholder="Consulta sobre cualquier pais o situacion geopolitica..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: TEXT_PRIMARY, borderRadius: 10, padding: '10px 14px', fontSize: 13,
                  fontFamily: 'inherit', resize: 'none', outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
                {['Riesgo Repsol en Libia', 'Migracion Canarias 90d', 'Tension Marruecos-Espana'].map(ex => (
                  <button key={ex} onClick={() => setAiQuery(ex)} style={{
                    background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
                    color: '#7dd3fc', borderRadius: 999, padding: '4px 12px', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                  }}>{ex}</button>
                ))}
              </div>
              <button disabled style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: TEXT_SECONDARY, borderRadius: 10, padding: '10px 20px', fontSize: 13,
                fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit', width: '100%',
              }}>
                Consultar — Brain no disponible en este entorno
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
