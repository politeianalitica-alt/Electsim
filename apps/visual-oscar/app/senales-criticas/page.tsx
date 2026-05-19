'use client'
import './senales-criticas.css'
import { useState, useEffect, useCallback } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ─── types ────────────────────────────────────────────────────────────────────
type SignalType = 'conflicto' | 'sismo' | 'ciberataque' | 'desinformacion' | 'parlamentario' | 'diplomatico' | 'social' | 'economico' | 'energia'
type Severity   = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
type AttackLevel = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO'

interface CrisisSignal {
  id: string
  tipo: SignalType
  titulo: string
  descripcion: string
  fuente: string
  severidad: Severity
  score: number
  lat?: number
  lon?: number
  pais?: string
  timestamp: string
  url?: string
  tags: string[]
}

interface CrisisCluster {
  id: string
  nombre: string
  tipo: string
  n_señales: number
  score_max: number
  score_medio: number
  severidad: Severity
  velocidad: number
  tendencia: 'subiendo' | 'estable' | 'bajando'
  emocion: 'alarma' | 'tension' | 'incertidumbre' | 'calma'
  resumen: string
  fuentes: string[]
  tags: string[]
}

interface AttackVector {
  tipo: 'ciber' | 'informacional' | 'fisico'
  nombre: string
  nivel: AttackLevel
  score: number
  descripcion: string
  señales_activas: number
  ultima_actualizacion: string
}

// ─── color maps ───────────────────────────────────────────────────────────────
const SEV_COLOR: Record<Severity, string> = {
  CRITICO: '#dc2626', ALTO: '#f59e0b', MEDIO: '#3b82f6', BAJO: '#22c55e',
}
const LEVEL_COLOR: Record<AttackLevel, string> = {
  ROJO: '#dc2626', NARANJA: '#f59e0b', AMARILLO: '#eab308', VERDE: '#22c55e',
}
const TIPO_LABEL: Record<SignalType, string> = {
  conflicto: 'Conflicto', sismo: 'Sismo', ciberataque: 'Ciber', desinformacion: 'Desinformacion',
  parlamentario: 'Parlamentario', diplomatico: 'Diplomatico', social: 'Social',
  economico: 'Economico', energia: 'Energia',
}
const TENDENCIA_ICON: Record<string, string> = { subiendo: '▲', estable: '—', bajando: '▼' }
const EMOCION_COLOR: Record<string, string> = {
  alarma: '#dc2626', tension: '#f59e0b', incertidumbre: '#3b82f6', calma: '#22c55e',
}

// ─── world map helpers ────────────────────────────────────────────────────────
function projX(lon: number, W = 880) { return ((lon + 180) / 360) * W }
function projY(lat: number, H = 440) { return ((90 - lat) / 180) * H }

// Spain bounds
const ES_LON_MIN = -9.3, ES_LON_MAX = 4.3, ES_LAT_MIN = 35.9, ES_LAT_MAX = 43.8
function esProjX(lon: number, W = 500) { return ((lon - ES_LON_MIN) / (ES_LON_MAX - ES_LON_MIN)) * W }
function esProjY(lat: number, H = 300) { return ((ES_LAT_MAX - lat) / (ES_LAT_MAX - ES_LAT_MIN)) * H }

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'ahora'
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `hace ${h}h`
    return `hace ${Math.floor(h / 24)}d`
  } catch { return '—' }
}

// World SVG paths (simplified key countries)
const WORLD_PATHS: Array<{ d: string; name: string; fill: string }> = [
  { name: 'España', fill: '#1e3a5f', d: 'M415,195 L430,190 L440,193 L445,198 L438,205 L425,208 L415,205 Z' },
  { name: 'Portugal', fill: '#1a3050', d: 'M410,195 L415,195 L415,205 L410,208 L407,200 Z' },
  { name: 'Francia', fill: '#162840', d: 'M420,183 L445,183 L450,190 L445,193 L430,190 L420,190 Z' },
  { name: 'Italia', fill: '#162840', d: 'M455,190 L465,190 L468,200 L460,205 L454,200 Z' },
  { name: 'Alemania', fill: '#162840', d: 'M450,175 L465,173 L468,182 L455,183 L448,180 Z' },
  { name: 'Marruecos', fill: '#1a2a3a', d: 'M415,210 L438,210 L440,225 L420,228 L412,220 Z' },
  { name: 'UK', fill: '#162840', d: 'M415,170 L424,168 L426,178 L415,180 Z' },
  { name: 'Ucrania', fill: '#1a2a3a', d: 'M475,170 L500,168 L503,178 L478,180 Z' },
  { name: 'Rusia', fill: '#162840', d: 'M490,140 L560,130 L565,165 L500,168 L488,155 Z' },
  { name: 'EEUU', fill: '#162840', d: 'M180,175 L280,170 L285,200 L185,205 Z' },
  { name: 'China', fill: '#1a2a3a', d: 'M620,185 L680,178 L685,210 L625,215 Z' },
  { name: 'Oriente Medio', fill: '#1a2a3a', d: 'M510,200 L545,197 L548,218 L512,220 Z' },
  { name: 'África Central', fill: '#162840', d: 'M445,240 L500,235 L505,290 L445,295 Z' },
  { name: 'India', fill: '#162840', d: 'M580,210 L605,208 L608,240 L580,245 Z' },
  { name: 'Brasil', fill: '#162840', d: 'M260,255 L315,250 L318,295 L260,300 Z' },
  { name: 'Japón', fill: '#162840', d: 'M700,180 L715,178 L717,195 L702,196 Z' },
]

// ─── mini sparkline component ──────────────────────────────────────────────────
function Sparkline({ data, color, height = 24 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 60
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${height - (v / max) * height}`)
  return (
    <svg width={W} height={height} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

// ─── signal card ──────────────────────────────────────────────────────────────
function SignalCard({ s, onClick }: { s: CrisisSignal; onClick?: () => void }) {
  const color = SEV_COLOR[s.severidad]
  return (
    <button
      onClick={onClick}
      className="sc-signal-card"
      style={{ border: `1px solid ${color}40`, borderLeft: `3px solid ${color}` }}
    >
      <div className="sc-signal-head">
        <span className="sc-signal-sev" style={{ color }}>{s.severidad}</span>
        <span className="sc-signal-time">{relTime(s.timestamp)}</span>
      </div>
      <div className="sc-signal-title">{s.titulo}</div>
      <div className="sc-signal-meta">
        <span className="sc-signal-tag">{TIPO_LABEL[s.tipo] ?? s.tipo}</span>
        <span className="sc-signal-source">{s.fuente}</span>
        {s.pais && <span className="sc-signal-source">{s.pais}</span>}
      </div>
    </button>
  )
}

// ─── cluster card ─────────────────────────────────────────────────────────────
function ClusterCard({ c }: { c: CrisisCluster }) {
  const color = SEV_COLOR[c.severidad]
  const tendColor = c.tendencia === 'subiendo' ? '#f59e0b' : c.tendencia === 'bajando' ? '#22c55e' : '#64748b'
  return (
    <div className="sc-cluster-card" style={{ border: `1px solid ${color}30` }}>
      <div className="sc-cluster-head">
        <span className="sc-cluster-name">{c.nombre}</span>
        <span className="sc-cluster-sev" style={{ color, background: `${color}20` }}>{c.severidad}</span>
      </div>
      <div className="sc-cluster-resumen">{c.resumen}</div>
      <div className="sc-cluster-row">
        <div>
          <div className="sc-cluster-stat-label">Señales</div>
          <div className="sc-cluster-stat-value">{c.n_señales}</div>
        </div>
        <div>
          <div className="sc-cluster-stat-label">Score max</div>
          <div className="sc-cluster-stat-value" style={{ color }}>{c.score_max}</div>
        </div>
        <div>
          <div className="sc-cluster-stat-label">Velocidad</div>
          <div className="sc-cluster-stat-value" style={{ color: tendColor }}>
            {TENDENCIA_ICON[c.tendencia]} {c.velocidad}/h
          </div>
        </div>
        <div>
          <div className="sc-cluster-stat-label">Emocion</div>
          <div className="sc-cluster-stat-value--emocion" style={{ color: EMOCION_COLOR[c.emocion] }}>{c.emocion}</div>
        </div>
      </div>
    </div>
  )
}

// ─── attack vector gauge ──────────────────────────────────────────────────────
function AttackGauge({ v }: { v: AttackVector }) {
  const color = LEVEL_COLOR[v.nivel]
  const icons: Record<string, string> = { ciber: 'CPU', informacional: 'INF', fisico: 'FIS' }
  return (
    <div className="sc-gauge" style={{ border: `1px solid ${color}40` }}>
      <div className="sc-gauge-row">
        <div>
          <div className="sc-gauge-tipo">{icons[v.tipo]}</div>
          <div className="sc-gauge-name">{v.nombre}</div>
        </div>
        <div className="sc-gauge-circle" style={{ border: `3px solid ${color}`, background: `${color}15` }}>
          <span className="sc-gauge-nivel" style={{ color }}>{v.nivel}</span>
        </div>
      </div>
      <div className="sc-gauge-track">
        <div className="sc-gauge-fill" style={{ width: `${v.score}%`, background: color }} />
      </div>
      <div className="sc-gauge-desc">{v.descripcion}</div>
      <div className="sc-gauge-foot">
        {v.señales_activas} señales activas
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function SenalesCriticasPage() {
  const [tab, setTab] = useState<'clusters' | 'feed' | 'mapa' | 'ataque'>('clusters')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterSev, setFilterSev] = useState<string>('todos')
  const [selectedSignal, setSelectedSignal] = useState<CrisisSignal | null>(null)
  const [mapView, setMapView] = useState<'mundo' | 'españa'>('mundo')

  // Crisis signals: refresh every 5 minutes — external APIs (GDELT, INCIBE) don't update more often
  const signalsData = useApi<{ signals: CrisisSignal[]; stats: Record<string, unknown>; timestamp: string }>('/api/crisis/signals', { refreshInterval: 300_000 })
  const clustersData = useApi<{ clusters: CrisisCluster[]; criticos: number }>('/api/crisis/clusters', { refreshInterval: 300_000 })
  const attackData  = useApi<{ vectors: AttackVector[]; global_score: number; global_level: AttackLevel; details?: { cyber?: unknown[]; informacional?: unknown[]; fisico?: unknown[] } }>('/api/crisis/attack-detection', { refreshInterval: 300_000 })

  const signals  = signalsData.data?.signals ?? []
  const stats    = signalsData.data?.stats as Record<string, number> | undefined
  const clusters = clustersData.data?.clusters ?? []
  const vectors  = attackData.data?.vectors ?? []
  const globalScore = attackData.data?.global_score ?? 0
  const globalLevel = attackData.data?.global_level ?? 'VERDE'

  const filteredSignals = signals.filter(s => {
    if (filterTipo !== 'todos' && s.tipo !== filterTipo) return false
    if (filterSev !== 'todos' && s.severidad !== filterSev) return false
    return true
  })

  const geoSignals = signals.filter(s => s.lat != null && s.lon != null)
  const esSignals  = geoSignals.filter(s => s.lat! >= 35.9 && s.lat! <= 43.8 && s.lon! >= -9.3 && s.lon! <= 4.3)

  const loading = signalsData.loading || clustersData.loading
  const globalLevelColor = LEVEL_COLOR[globalLevel]

  return (
    <div className="sc-root">
      <AppHeader />
      <div className="sc-main">

        {/* ── Header ── */}
        <div className="sc-header">
          <div>
            <h1 className="sc-header-title">
              Senales Criticas — SIGINT-CIVIL
            </h1>
            <div className="sc-header-subtitle">
              Agregacion en tiempo real: GDELT 2.0 · INCIBE-CERT · EMSC · Wikipedia · Congreso · Google Noticias ES
            </div>
          </div>
          <div className="sc-header-right">
            <span className="sc-live">
              <span className="sc-live-dot" />
              LIVE
            </span>
            {signalsData.data?.timestamp && (
              <span className="sc-live-ts">
                {new Date(signalsData.data.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* ── Estado Global (KPI bar) ── */}
        <div className="sc-kpi-grid">
          {[
            { label: 'Total senales', value: stats?.total ?? signals.length, color: '#94a3b8' },
            { label: 'Criticas', value: stats?.criticos ?? signals.filter(s => s.severidad === 'CRITICO').length, color: '#dc2626' },
            { label: 'Altas', value: stats?.altos ?? signals.filter(s => s.severidad === 'ALTO').length, color: '#f59e0b' },
            { label: 'Fuentes activas', value: (stats?.fuentes_activas as number) ?? new Set(signals.map(s => s.fuente)).size, color: '#3b82f6' },
            { label: 'Clusters', value: clusters.length, color: '#8b5cf6' },
            { label: 'Alerta global', value: globalLevel, color: globalLevelColor },
          ].map(({ label, value, color }) => (
            <div key={label} className="sc-kpi-card">
              <div className="sc-kpi-label">{label.toUpperCase()}</div>
              <div className="sc-kpi-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Attack Detection bar ── */}
        <div className="sc-attack-section">
          <div className="sc-section-label">
            DETECCION DE ATAQUE — SEMAFORO
          </div>
          <div className="sc-attack-row">
            {vectors.length > 0 ? vectors.map(v => <AttackGauge key={v.tipo} v={v} />) : (
              [
                { tipo: 'ciber' as const, nombre: 'Vector Cibernetico', nivel: 'VERDE' as AttackLevel, score: 20, descripcion: 'Cargando datos INCIBE...', señales_activas: 0, ultima_actualizacion: new Date().toISOString() },
                { tipo: 'informacional' as const, nombre: 'Vector Informacional', nivel: 'AMARILLO' as AttackLevel, score: 40, descripcion: 'Cargando narrativas adversas...', señales_activas: 0, ultima_actualizacion: new Date().toISOString() },
                { tipo: 'fisico' as const, nombre: 'Vector Fisico', nivel: 'VERDE' as AttackLevel, score: 15, descripcion: 'Cargando EMSC...', señales_activas: 0, ultima_actualizacion: new Date().toISOString() },
              ].map(v => <AttackGauge key={v.tipo} v={v} />)
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="sc-tabs">
          {([
            { id: 'clusters', label: 'Clusters Activos' },
            { id: 'feed', label: 'Feed de Senales' },
            { id: 'mapa', label: 'Mapa Operativo' },
            { id: 'ataque', label: 'Deteccion de Ataque' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`sc-tab${tab === t.id ? ' sc-tab--active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: CLUSTERS ══════════ */}
        {tab === 'clusters' && (
          <div>
            {loading ? (
              <div className="sc-state">Cargando clusters...</div>
            ) : clusters.length === 0 ? (
              <div className="sc-state">Sin clusters detectados</div>
            ) : (
              <div className="sc-cluster-grid">
                {clusters.map(c => <ClusterCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: FEED ══════════ */}
        {tab === 'feed' && (
          <div>
            {/* Filters */}
            <div className="sc-filters-row">
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="sc-select"
              >
                <option value="todos">Todos los tipos</option>
                {(['ciberataque', 'conflicto', 'diplomatico', 'parlamentario', 'social', 'sismo', 'desinformacion', 'economico', 'energia'] as SignalType[]).map(t => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
              <select
                value={filterSev}
                onChange={e => setFilterSev(e.target.value)}
                className="sc-select"
              >
                <option value="todos">Todas las severidades</option>
                {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as Severity[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="sc-filters-count">
                {filteredSignals.length} de {signals.length} señales
              </span>
            </div>

            {/* Two-column layout: list + detail */}
            <div className={`sc-feed-grid${selectedSignal ? ' sc-feed-grid--with-detail' : ''}`}>
              <div className="sc-feed-list">
                {loading ? (
                  <div className="sc-state sc-state--small">Cargando señales...</div>
                ) : filteredSignals.length === 0 ? (
                  <div className="sc-state sc-state--small">Sin señales para los filtros aplicados</div>
                ) : filteredSignals.map(s => (
                  <SignalCard key={s.id} s={s} onClick={() => setSelectedSignal(prev => prev?.id === s.id ? null : s)} />
                ))}
              </div>

              {selectedSignal && (
                <div className="sc-detail" style={{ border: `1px solid ${SEV_COLOR[selectedSignal.severidad]}40` }}>
                  <div className="sc-detail-head">
                    <span className="sc-detail-sev" style={{ color: SEV_COLOR[selectedSignal.severidad] }}>
                      {selectedSignal.severidad} — {TIPO_LABEL[selectedSignal.tipo] ?? selectedSignal.tipo}
                    </span>
                    <button onClick={() => setSelectedSignal(null)} className="sc-detail-close">x</button>
                  </div>
                  <div className="sc-detail-title">
                    {selectedSignal.titulo}
                  </div>
                  <div className="sc-detail-desc">
                    {selectedSignal.descripcion}
                  </div>
                  <div className="sc-detail-grid">
                    <div>
                      <div className="sc-detail-field-label">Fuente</div>
                      <div className="sc-detail-field-value">{selectedSignal.fuente}</div>
                    </div>
                    <div>
                      <div className="sc-detail-field-label">Score</div>
                      <div className="sc-detail-field-value sc-detail-field-value--score" style={{ color: SEV_COLOR[selectedSignal.severidad] }}>{selectedSignal.score}/100</div>
                    </div>
                    {selectedSignal.pais && (
                      <div>
                        <div className="sc-detail-field-label">Pais/Region</div>
                        <div className="sc-detail-field-value">{selectedSignal.pais}</div>
                      </div>
                    )}
                    <div>
                      <div className="sc-detail-field-label">Timestamp</div>
                      <div className="sc-detail-field-value">{relTime(selectedSignal.timestamp)}</div>
                    </div>
                  </div>
                  {selectedSignal.tags.length > 0 && (
                    <div className="sc-detail-tags-row">
                      {selectedSignal.tags.map(tag => (
                        <span key={tag} className="sc-detail-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedSignal.url && (
                    <a
                      href={selectedSignal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sc-detail-link"
                    >
                      Ver fuente original →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ TAB: MAPA ══════════ */}
        {tab === 'mapa' && (
          <div>
            <div className="sc-map-tabs">
              <button
                onClick={() => setMapView('mundo')}
                className={`sc-map-tab${mapView === 'mundo' ? ' sc-map-tab--active' : ''}`}
              >
                Vista Mundo
              </button>
              <button
                onClick={() => setMapView('españa')}
                className={`sc-map-tab${mapView === 'españa' ? ' sc-map-tab--active' : ''}`}
              >
                Vista España
              </button>
            </div>

            {mapView === 'mundo' ? (
              <div className="sc-map-frame">
                <svg viewBox="0 0 880 440" className="sc-map-svg">
                  {/* Ocean background */}
                  <rect width={880} height={440} fill="#0a1628" rx={4} />
                  {/* Grid lines */}
                  {[60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840].map(x => (
                    <line key={`vl${x}`} x1={x} y1={0} x2={x} y2={440} stroke="rgba(255,255,255,.03)" strokeWidth={1} />
                  ))}
                  {[80, 160, 240, 320, 400].map(y => (
                    <line key={`hl${y}`} x1={0} y1={y} x2={880} y2={y} stroke="rgba(255,255,255,.03)" strokeWidth={1} />
                  ))}
                  {/* Continents */}
                  {WORLD_PATHS.map(p => (
                    <path key={p.name} d={p.d} fill={p.fill} stroke="rgba(255,255,255,.08)" strokeWidth={0.5} />
                  ))}
                  {/* Signal dots */}
                  {geoSignals.map(s => {
                    const x = projX(s.lon!)
                    const y = projY(s.lat!)
                    const color = SEV_COLOR[s.severidad]
                    const r = s.score >= 70 ? 7 : s.score >= 50 ? 5 : 3.5
                    return (
                      <g key={s.id}>
                        <circle cx={x} cy={y} r={r * 2} fill={color} fillOpacity={0.1} />
                        <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.85} stroke="#050d1a" strokeWidth={1} />
                        {s.score >= 70 && (
                          <text x={x} y={y - r - 3} textAnchor="middle" fill="#e2e8f0" fontSize={8} fontWeight={700}>
                            {s.titulo.slice(0, 15)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                  {/* Legend */}
                  <g transform="translate(12,400)">
                    {([['CRITICO','#dc2626'],['ALTO','#f59e0b'],['MEDIO','#3b82f6'],['BAJO','#22c55e']] as [Severity, string][]).map(([sev, col], i) => (
                      <g key={sev} transform={`translate(${i * 80}, 0)`}>
                        <circle cx={6} cy={6} r={5} fill={col} fillOpacity={0.85} />
                        <text x={14} y={10} fill="#94a3b8" fontSize={9}>{sev}</text>
                      </g>
                    ))}
                  </g>
                </svg>
                <div className="sc-map-foot">
                  {geoSignals.length} señales geolocalizadas · fuentes: GDELT 2.0, EMSC, INCIBE-CERT
                </div>
              </div>
            ) : (
              <div className="sc-map-frame">
                <svg viewBox="0 0 500 300" className="sc-map-svg sc-map-svg--small">
                  <rect width={500} height={300} fill="#0a1628" rx={4} />
                  {/* Spain bounding box */}
                  <rect x={10} y={10} width={480} height={280} fill="#0f1e35" stroke="rgba(255,255,255,.06)" strokeWidth={1} rx={3} />
                  <text x={250} y={28} textAnchor="middle" fill="#475569" fontSize={10}>España — Señales activas</text>
                  {/* ES signal dots */}
                  {esSignals.map(s => {
                    const x = esProjX(s.lon!)
                    const y = esProjY(s.lat!)
                    const color = SEV_COLOR[s.severidad]
                    const r = s.score >= 70 ? 9 : s.score >= 50 ? 6 : 4
                    return (
                      <g key={s.id}>
                        <circle cx={x + 10} cy={y + 35} r={r * 2.5} fill={color} fillOpacity={0.08} />
                        <circle cx={x + 10} cy={y + 35} r={r} fill={color} fillOpacity={0.9} stroke="#0a1628" strokeWidth={1.5} />
                        <text x={x + 10} y={y + 28} textAnchor="middle" fill="#e2e8f0" fontSize={8}>
                          {s.titulo.slice(0, 18)}
                        </text>
                      </g>
                    )
                  })}
                  {esSignals.length === 0 && (
                    <text x={250} y={160} textAnchor="middle" fill="#475569" fontSize={12}>
                      Sin señales geolocalizadas en España en este momento
                    </text>
                  )}
                  {/* Reference cities */}
                  {[
                    { nombre: 'Madrid', lat: 40.42, lon: -3.70 },
                    { nombre: 'Barcelona', lat: 41.39, lon: 2.15 },
                    { nombre: 'Sevilla', lat: 37.39, lon: -5.99 },
                    { nombre: 'Valencia', lat: 39.47, lon: -0.37 },
                  ].map(c => (
                    <g key={c.nombre}>
                      <circle cx={esProjX(c.lon) + 10} cy={esProjY(c.lat) + 35} r={2} fill="rgba(148,163,184,0.4)" />
                      <text x={esProjX(c.lon) + 14} y={esProjY(c.lat) + 38} fill="rgba(148,163,184,0.4)" fontSize={7}>{c.nombre}</text>
                    </g>
                  ))}
                </svg>
                <div className="sc-map-foot">
                  {esSignals.length} señales en territorio nacional
                </div>
              </div>
            )}

            {/* Signal table below map */}
            <div className="sc-geo-section">
              <div className="sc-geo-label">SEÑALES GEOLOCALIZADAS</div>
              <div className="sc-geo-list">
                {geoSignals.slice(0, 8).map(s => (
                  <div key={s.id} className="sc-geo-row">
                    <span className="sc-geo-sev" style={{ color: SEV_COLOR[s.severidad] }}>{s.severidad}</span>
                    <span className="sc-geo-title">{s.titulo.slice(0, 60)}{s.titulo.length > 60 ? '...' : ''}</span>
                    <span className="sc-geo-pais">{s.pais ?? '—'}</span>
                    <span className="sc-geo-coords">{s.lat?.toFixed(1)}, {s.lon?.toFixed(1)}</span>
                    <span className="sc-geo-time">{relTime(s.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TAB: DETECCION DE ATAQUE ══════════ */}
        {tab === 'ataque' && (
          <div>
            {/* Global semaforo */}
            <div className="sc-global" style={{ background: `${globalLevelColor}12`, border: `1px solid ${globalLevelColor}40` }}>
              <div className="sc-global-circle" style={{ border: `4px solid ${globalLevelColor}`, background: `${globalLevelColor}20` }}>
                <span className="sc-global-level" style={{ color: globalLevelColor }}>{globalLevel}</span>
              </div>
              <div>
                <div className="sc-global-info-label">Nivel de Alerta Global</div>
                <div className="sc-global-score" style={{ color: globalLevelColor }}>Score: {globalScore}/100</div>
                <div className="sc-global-weights">Ponderacion: Ciber 40% · Informacional 40% · Fisico 20%</div>
              </div>
            </div>

            {/* Three vectors detail */}
            <div className="sc-vectors-grid">
              {/* Cyber */}
              <div className="sc-vector-card">
                <div className="sc-vector-title sc-vector-title--cyber">VECTOR CIBERNETICO</div>
                <div className="sc-vector-source">Fuentes: INCIBE-CERT, CCN-CERT</div>
                {attackData.data?.details?.cyber && (attackData.data.details.cyber as CrisisSignal[]).length > 0 ? (
                  <div className="sc-vector-list">
                    {(attackData.data.details.cyber as Array<{ nombre?: string; cvss?: number; afectados?: string; tipo_ataque?: string; fuente?: string; timestamp?: string }>).map((t, i) => (
                      <div key={i} className="sc-vector-item sc-vector-item--cyber">
                        <div className="sc-vector-item-name sc-vector-item-name--cyber">{t.nombre?.slice(0, 70)}</div>
                        <div className="sc-vector-item-meta">
                          {t.cvss && <span>CVSS: {t.cvss}</span>}
                          {t.tipo_ataque && <span>{t.tipo_ataque}</span>}
                          {t.afectados && <span>{t.afectados}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sc-vector-empty">
                    <div className="sc-vector-empty-msg">Sin alertas criticas activas de INCIBE-CERT</div>
                    <div className="sc-vector-empty-sub">Sistema de monitorizacion activo</div>
                  </div>
                )}
              </div>

              {/* Informacional */}
              <div className="sc-vector-card">
                <div className="sc-vector-title sc-vector-title--info">VECTOR INFORMACIONAL</div>
                <div className="sc-vector-source">Fuentes: Google Noticias ES, GDELT</div>
                {attackData.data?.details?.informacional && (attackData.data.details.informacional as unknown[]).length > 0 ? (
                  <div className="sc-vector-list">
                    {(attackData.data.details.informacional as Array<{ narrativa?: string; objetivo?: string; velocidad?: number; plataformas?: string[]; timestamp?: string }>).map((t, i) => (
                      <div key={i} className="sc-vector-item sc-vector-item--info">
                        <div className="sc-vector-item-name sc-vector-item-name--info">{t.narrativa?.slice(0, 70)}</div>
                        <div className="sc-vector-item-meta">
                          {t.objetivo && <span>{t.objetivo}</span>}
                          {t.velocidad && <span>{t.velocidad} menciones/h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sc-vector-empty">
                    <div className="sc-vector-empty-msg">Sin campanas de desinformacion activas</div>
                    <div className="sc-vector-empty-sub">Monitor narrativo activo</div>
                  </div>
                )}
              </div>

              {/* Fisico */}
              <div className="sc-vector-card">
                <div className="sc-vector-title sc-vector-title--fisico">VECTOR FISICO</div>
                <div className="sc-vector-source">Fuentes: EMSC, emergencias medios</div>
                {attackData.data?.details?.fisico && (attackData.data.details.fisico as unknown[]).length > 0 ? (
                  <div className="sc-vector-list">
                    {(attackData.data.details.fisico as Array<{ tipo?: string; ubicacion?: string; fuente?: string; lat?: number; lon?: number; timestamp?: string }>).map((t, i) => (
                      <div key={i} className="sc-vector-item sc-vector-item--fisico">
                        <div className="sc-vector-item-name sc-vector-item-name--fisico">{t.tipo} — {t.ubicacion}</div>
                        <div className="sc-vector-item-meta">
                          <span>{t.fuente}</span>
                          {t.lat && <span>{t.lat?.toFixed(2)}, {t.lon?.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sc-vector-empty">
                    <div className="sc-vector-empty-msg">Sin alertas fisicas activas</div>
                    <div className="sc-vector-empty-sub">EMSC: monitoring iberico activo</div>
                  </div>
                )}
              </div>
            </div>

            {/* Fusion matrix */}
            <div className="sc-matrix-section">
              <div className="sc-matrix-label">MATRIZ DE CORRELACION</div>
              <div className="sc-matrix-grid">
                {[['', 'Ciber', 'Informacional', 'Fisico'],
                  ['Ciber', '—', vectors[0] && vectors[1] ? Math.round(Math.abs(vectors[0].score - vectors[1].score) / 100 * 10) / 10 : '—', vectors[0] && vectors[2] ? Math.round(Math.abs(vectors[0].score - vectors[2].score) / 100 * 10) / 10 : '—'],
                  ['Informacional', '—', '—', vectors[1] && vectors[2] ? Math.round(Math.abs(vectors[1].score - vectors[2].score) / 100 * 10) / 10 : '—'],
                  ['Fisico', '—', '—', '—'],
                ].map((row, ri) => row.map((cell, ci) => (
                  <div key={`${ri}_${ci}`} className={`sc-matrix-cell ${ri === 0 || ci === 0 ? 'sc-matrix-cell--header' : 'sc-matrix-cell--body'}`}>
                    {cell}
                  </div>
                )))}
              </div>
              <div className="sc-matrix-foot">
                Correlacion calculada entre vectores de ataque en la ultima hora. Valor entre 0 (sin correlacion) y 1 (ataque coordinado).
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
