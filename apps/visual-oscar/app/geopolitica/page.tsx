'use client'
import { useState, useRef } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ── projection helpers ────────────────────────────────────────────────────────
function projX(lon: number, W = 900) { return ((lon + 180) / 360) * W }
function projY(lat: number, H = 460) { return ((90 - lat) / 180) * H }

// Spain-viewport projection (lat 35.9–43.8, lon -9.3–4.3)
const ES_LAT_MIN = 35.9, ES_LAT_MAX = 43.8, ES_LON_MIN = -9.3, ES_LON_MAX = 4.3
function esProjX(lon: number, W = 560) { return ((lon - ES_LON_MIN) / (ES_LON_MAX - ES_LON_MIN)) * W }
function esProjY(lat: number, H = 380) { return ((ES_LAT_MAX - lat) / (ES_LAT_MAX - ES_LAT_MIN)) * H }

// ── clamp ────────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

// ── color helpers ─────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  CRITICO: '#dc2626',
  ALTO: '#f59e0b',
  MEDIO: '#3b82f6',
  BAJO: '#22c55e',
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
interface PresenciaItem {
  pais: string; lat: number; lon: number; categoria: string; intensidad: number
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
  const impactos: ImpactoItem[] = impactosRaw?.data ?? []
  const thinkTanks: ThinkTankItem[] = thinkTanksRaw?.data ?? []
  const ccaa: CcaaItem[] = ccaaRaw?.data ?? []

  const riesgoSorted = [...riesgo].sort((a, b) => b.score - a.score)
  const impactosSorted = [...impactos].sort((a, b) => b.severidad - a.severidad)
  const alertasSorted = [...alertas].sort((a, b) => {
    const order = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
    return (order.indexOf(a.nivel) - order.indexOf(b.nivel)) || (new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  })

  // KPI derived
  const kpiCards = [
    { label: 'Señales OSINT 24h', value: geoStats.osint_24h, accent: '#0ea5e9' },
    { label: 'Alertas activas', value: geoStats.alertas_activas, accent: '#dc2626' },
    { label: 'Países monitorizados', value: geoStats.paises_monitorizados, accent: '#22c55e' },
    { label: 'Presencia activa', value: geoStats.presencia_activa, accent: '#6366f1' },
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

  // Temas count
  const temasCount: Record<string, number> = {}
  for (const t of thinkTanks) {
    for (const tema of (t.temas_detectados ?? [])) {
      temasCount[tema] = (temasCount[tema] ?? 0) + 1
    }
  }
  const topTemas = Object.entries(temasCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxTemas = Math.max(1, topTemas[0]?.[1] ?? 1)

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

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: TEXT_PRIMARY, fontFamily: '-apple-system, "SF Pro Display", Inter, system-ui, sans-serif' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          {kpiCards.map((k) => (
            <div key={k.label} style={{
              ...CARD, boxShadow: SHADOW,
              borderLeft: `3px solid ${k.accent}`,
              padding: '18px 22px',
            }}>
              <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
              <div style={{
                fontSize: 28, fontWeight: 800,
                background: `linear-gradient(135deg, ${k.accent}, #ffffff80)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}>{k.value}</div>
            </div>
          ))}
        </div>

        <TabBar
          items={['Mapa Global', 'España CCAA', 'OSINT Intelligence', 'Alertas & Señales', 'Impacto', 'Análisis IA']}
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
                {/* Graticule */}
                {[-60, -30, 0, 30, 60].map(lat => (
                  <line key={`h${lat}`}
                    x1={0} y1={projY(lat)} x2={900} y2={projY(lat)}
                    stroke="rgba(64,96,160,0.12)" strokeWidth={0.8} />
                ))}
                {[-120, -60, 0, 60, 120].map(lon => (
                  <line key={`v${lon}`}
                    x1={projX(lon)} y1={0} x2={projX(lon)} y2={460}
                    stroke="rgba(64,96,160,0.12)" strokeWidth={0.8} />
                ))}

                {/* Connection lines: Spain to top 5 */}
                {top5Risk.map(r => (
                  <line key={`line-${r.iso}`}
                    x1={projX(-3.7)} y1={projY(40.4)}
                    x2={projX(r.lon)} y2={projY(r.lat)}
                    stroke="rgba(6,182,212,0.25)" strokeWidth={1.2}
                    strokeDasharray="4 3"
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
                        const svgW = rect.width
                        const svgH = rect.height
                        setTooltip({
                          x: (cx / 900) * svgW + rect.left,
                          y: (cy / 460) * svgH + rect.top - 48,
                          text: `${r.pais}  Score: ${r.score.toFixed(1)}  |  Interés ES: ${r.interes_espana.toFixed(1)}`,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'default' }}
                    >
                      <circle cx={cx} cy={cy} r={radius}
                        fill={fill} fillOpacity={0.8}
                        stroke="rgba(255,255,255,0.15)" strokeWidth={1}
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
                    return `${cx + 8 * Math.cos(a)},${cy + 8 * Math.sin(a)} ${cx + 3.5 * Math.cos(a2)},${cy + 3.5 * Math.sin(a2)}`
                  }).join(' ')
                  return (
                    <polygon points={pts} fill="#0ea5e9"
                      stroke="rgba(255,255,255,0.5)" strokeWidth={1}
                      style={{ filter: 'drop-shadow(0 0 4px #0ea5e9)' }}
                    />
                  )
                })()}
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div style={{
                  position: 'fixed', left: tooltip.x, top: tooltip.y,
                  background: '#0d1f3a', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '8px 14px', fontSize: 12, color: TEXT_PRIMARY,
                  pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  transform: 'translateX(-50%)',
                }}>
                  {tooltip.text}
                </div>
              )}

              {/* Legend */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Critico >=8', color: '#dc2626' },
                  { label: 'Alto >=6', color: '#f59e0b' },
                  { label: 'Medio >=4', color: '#3b82f6' },
                  { label: 'Bajo', color: '#22c55e' },
                  { label: 'Espana', color: '#0ea5e9' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ ...CARD, boxShadow: SHADOW, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Pais', 'Score riesgo', 'Interes Espana', 'Categoria'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: h === 'Pais' || h === 'Categoria' ? 'left' : 'right',
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
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_PRIMARY }}>{r.pais}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}><ScorePill score={r.score} /></td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: TEXT_SECONDARY }}>{r.interes_espana.toFixed(1)}</td>
                      <td style={{ padding: '10px 16px' }}><DimBadge dim={r.categoria} /></td>
                    </tr>
                  ))}
                  {riesgoSorted.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12 }}>Sin datos de riesgo disponibles</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 1 — ESPANA CCAA ── */}
        {tab === 1 && (
          <div>
            {/* Dim selector pills */}
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
                    {/* Graticule */}
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
                      return (
                        <g key={c.ccaa} onClick={() => setSelectedCcaa(isSelected ? null : c.ccaa)} style={{ cursor: 'pointer' }}>
                          <circle cx={cx} cy={cy} r={r + (isSelected ? 3 : 0)}
                            fill={fill} fillOpacity={isSelected ? 0.9 : 0.6}
                            stroke={isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          <text x={cx} y={cy + 3.5} textAnchor="middle" fill="white"
                            fontSize={8} fontWeight={700} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            {c.ccaa_iso?.slice(0, 3) ?? c.ccaa.slice(0, 3)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                )}
              </div>

              {/* Detail panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Legend */}
                <div style={{ ...CARD, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Factor dominante</div>
                  {[
                    { factor: 'energia', color: '#f59e0b' },
                    { factor: 'migracion', color: '#ef4444' },
                    { factor: 'seguridad', color: '#dc2626' },
                    { factor: 'comercio', color: '#3b82f6' },
                  ].map(f => (
                    <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, textTransform: 'capitalize' }}>{f.factor}</span>
                    </div>
                  ))}
                </div>

                {/* Selected CCAA detail */}
                {selectedCcaaData ? (
                  <div style={{ ...CARD, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 12 }}>{selectedCcaaData.ccaa}</div>
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
                          {fuente.length > 20 ? fuente.slice(0, 20) + '…' : fuente}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                            background: `${urgencyColor(info.maxUrgencia)}30`, color: urgencyColor(info.maxUrgencia),
                          }}>{info.maxUrgencia}</span>
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

              {topTemas.length > 0 && (
                <div style={{ ...CARD, padding: '16px' }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Temas detectados</div>
                  {topTemas.map(([tema, count]) => (
                    <div key={tema} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>{tema}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9' }}>{count}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <div style={{ width: `${(count / maxTemas) * 100}%`, height: 3, borderRadius: 2, background: '#0ea5e9' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div>
              {/* Filters */}
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

              {/* Feed */}
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
                    Sin señales OSINT — ejecutar pipeline
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
                          <span style={{ fontSize: 9, color: TEXT_SECONDARY }}>ES relevancia</span>
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
        )}

        {/* ── TAB 3 — ALERTAS & SENALES ── */}
        {tab === 3 && (
          <div>
            {/* System status */}
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

            {/* Alert cards */}
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

                    {/* Causal chain */}
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

                    {/* Footer */}
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
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 150ms',
                          }}
                        >
                          {expanded ? 'Ocultar fuentes' : `Ver ${a.fuentes_detalle.length} fuentes`}
                        </button>
                      )}
                    </div>

                    {/* Expanded sources */}
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
                { label: 'Sectores afectados', value: new Set(impactos.map(i => i.dimension)).size, color: '#6366f1' },
                { label: 'Severidad media', value: impactos.length ? (impactos.reduce((s, i) => s + i.severidad, 0) / impactos.length).toFixed(1) : '—', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ ...CARD, padding: '14px 18px', borderLeft: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div style={{ ...CARD, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Matriz de severidad</div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 1fr)', gap: 6 }}>
                <div />
                {DIMENSIONES.map(d => (
                  <div key={d} style={{ fontSize: 9, fontWeight: 700, color: dimColor(d), textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{d}</div>
                ))}
                {HORIZONTES.map(h => (
                  <>
                    <div key={h} style={{ fontSize: 9, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', textTransform: 'capitalize' }}>{h}</div>
                    {DIMENSIONES.map(d => {
                      const cell = heatmap[h]?.[d] ?? { count: 0, avgSeveridad: 0 }
                      const bg = cell.count === 0 ? 'rgba(255,255,255,0.04)' :
                        cell.avgSeveridad >= 5 ? 'rgba(220,38,38,0.7)' :
                          cell.avgSeveridad >= 4 ? 'rgba(245,158,11,0.6)' :
                            cell.avgSeveridad >= 3 ? 'rgba(59,130,246,0.5)' :
                              'rgba(255,255,255,0.08)'
                      return (
                        <div key={d} style={{
                          height: 42, borderRadius: 6, background: bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: cell.count > 0 ? 'rgba(255,255,255,0.9)' : TEXT_SECONDARY,
                        }}>
                          {cell.count > 0 ? cell.count : ''}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
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
              {impactos.length === 0 && (
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
            {/* Status panel */}
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

              {/* Capability cards */}
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

            {/* Query box */}
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
              {/* Example chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
                {['Riesgo Repsol en Libia', 'Migracion Canarias 90d', 'Tension Marruecos-Espana'].map(ex => (
                  <button key={ex} onClick={() => setAiQuery(ex)} style={{
                    background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
                    color: '#7dd3fc', borderRadius: 999, padding: '4px 12px', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 150ms',
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
