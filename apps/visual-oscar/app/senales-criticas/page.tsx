'use client'
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
      style={{
        width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`,
        borderRadius: 6, padding: '10px 12px', cursor: 'pointer',
        transition: 'background .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{s.severidad}</span>
        <span style={{ fontSize: 10, color: 'rgba(148,163,184,.6)', flexShrink: 0 }}>{relTime(s.timestamp)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '4px 0 3px', lineHeight: 1.35 }}>{s.titulo}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, background: 'rgba(255,255,255,.08)', borderRadius: 3, padding: '1px 5px', color: '#94a3b8' }}>
          {TIPO_LABEL[s.tipo] ?? s.tipo}
        </span>
        <span style={{ fontSize: 10, color: '#64748b' }}>{s.fuente}</span>
        {s.pais && <span style={{ fontSize: 10, color: '#64748b' }}>{s.pais}</span>}
      </div>
    </button>
  )
}

// ─── cluster card ─────────────────────────────────────────────────────────────
function ClusterCard({ c }: { c: CrisisCluster }) {
  const color = SEV_COLOR[c.severidad]
  const tendColor = c.tendencia === 'subiendo' ? '#f59e0b' : c.tendencia === 'bajando' ? '#22c55e' : '#64748b'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
      borderRadius: 8, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{c.nombre}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}20`, borderRadius: 4, padding: '2px 7px' }}>{c.severidad}</span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.45 }}>{c.resumen}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Señales</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{c.n_señales}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Score max</div>
          <div style={{ fontSize: 15, fontWeight: 700, color }}>{c.score_max}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Velocidad</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: tendColor }}>
            {TENDENCIA_ICON[c.tendencia]} {c.velocidad}/h
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Emocion</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: EMOCION_COLOR[c.emocion] }}>{c.emocion}</div>
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
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}40`,
      borderRadius: 10, padding: '16px 18px', flex: 1, minWidth: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.1em' }}>{icons[v.tipo]}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{v.nombre}</div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}15`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color }}>{v.nivel}</span>
        </div>
      </div>
      {/* Score bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, marginBottom: 10 }}>
        <div style={{ width: `${v.score}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 1s' }} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{v.descripcion}</div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
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
  const attackData  = useApi<{ vectors: AttackVector[]; global_score: number; global_level: AttackLevel }>('/api/crisis/attack-detection', { refreshInterval: 300_000 })

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
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <AppHeader />
      <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
              Senales Criticas — SIGINT-CIVIL
            </h1>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Agregacion en tiempo real: GDELT 2.0 · INCIBE-CERT · EMSC · Wikipedia · Congreso · Google Noticias ES
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Live indicator */}
            <span style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, color: '#22c55e' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              LIVE
            </span>
            {signalsData.data?.timestamp && (
              <span style={{ fontSize: 10, color: '#475569' }}>
                {new Date(signalsData.data.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* ── Estado Global (KPI bar) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total senales', value: stats?.total ?? signals.length, color: '#94a3b8' },
            { label: 'Criticas', value: stats?.criticos ?? signals.filter(s => s.severidad === 'CRITICO').length, color: '#dc2626' },
            { label: 'Altas', value: stats?.altos ?? signals.filter(s => s.severidad === 'ALTO').length, color: '#f59e0b' },
            { label: 'Fuentes activas', value: (stats?.fuentes_activas as number) ?? new Set(signals.map(s => s.fuente)).size, color: '#3b82f6' },
            { label: 'Clusters', value: clusters.length, color: '#8b5cf6' },
            { label: 'Alerta global', value: globalLevel, color: globalLevelColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '14px 16px',
              border: '1px solid rgba(255,255,255,.07)',
            }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Attack Detection bar ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', marginBottom: 10 }}>
            DETECCION DE ATAQUE — SEMAFORO
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {([
            { id: 'clusters', label: 'Clusters Activos' },
            { id: 'feed', label: 'Feed de Senales' },
            { id: 'mapa', label: 'Mapa Operativo' },
            { id: 'ataque', label: 'Deteccion de Ataque' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: tab === t.id ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.05)',
                color: tab === t.id ? '#93c5fd' : '#94a3b8',
                borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: CLUSTERS ══════════ */}
        {tab === 'clusters' && (
          <div>
            {loading ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: 48 }}>Cargando clusters...</div>
            ) : clusters.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: 48 }}>Sin clusters detectados</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                {clusters.map(c => <ClusterCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: FEED ══════════ */}
        {tab === 'feed' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, color: '#e2e8f0', padding: '5px 10px', fontSize: 12 }}
              >
                <option value="todos">Todos los tipos</option>
                {(['ciberataque', 'conflicto', 'diplomatico', 'parlamentario', 'social', 'sismo', 'desinformacion', 'economico', 'energia'] as SignalType[]).map(t => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
              <select
                value={filterSev}
                onChange={e => setFilterSev(e.target.value)}
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, color: '#e2e8f0', padding: '5px 10px', fontSize: 12 }}
              >
                <option value="todos">Todas las severidades</option>
                {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as Severity[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: '#475569', alignSelf: 'center' }}>
                {filteredSignals.length} de {signals.length} señales
              </span>
            </div>

            {/* Two-column layout: list + detail */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedSignal ? '380px 1fr' : '1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <div style={{ color: '#475569', textAlign: 'center', padding: 32 }}>Cargando señales...</div>
                ) : filteredSignals.length === 0 ? (
                  <div style={{ color: '#475569', textAlign: 'center', padding: 32 }}>Sin señales para los filtros aplicados</div>
                ) : filteredSignals.map(s => (
                  <SignalCard key={s.id} s={s} onClick={() => setSelectedSignal(prev => prev?.id === s.id ? null : s)} />
                ))}
              </div>

              {selectedSignal && (
                <div style={{
                  background: 'rgba(255,255,255,.04)', borderRadius: 10,
                  border: `1px solid ${SEV_COLOR[selectedSignal.severidad]}40`, padding: 20,
                  position: 'sticky', top: 80, alignSelf: 'start',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[selectedSignal.severidad] }}>
                      {selectedSignal.severidad} — {TIPO_LABEL[selectedSignal.tipo] ?? selectedSignal.tipo}
                    </span>
                    <button onClick={() => setSelectedSignal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>x</button>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.4 }}>
                    {selectedSignal.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
                    {selectedSignal.descripcion}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Fuente</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{selectedSignal.fuente}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Score</div>
                      <div style={{ fontSize: 12, color: SEV_COLOR[selectedSignal.severidad], fontWeight: 700 }}>{selectedSignal.score}/100</div>
                    </div>
                    {selectedSignal.pais && (
                      <div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Pais/Region</div>
                        <div style={{ fontSize: 12, color: '#e2e8f0' }}>{selectedSignal.pais}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Timestamp</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0' }}>{relTime(selectedSignal.timestamp)}</div>
                    </div>
                  </div>
                  {selectedSignal.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                      {selectedSignal.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10, background: 'rgba(255,255,255,.08)', borderRadius: 3, padding: '2px 6px', color: '#94a3b8' }}>
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
                      style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setMapView('mundo')}
                style={{
                  padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: mapView === 'mundo' ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.06)',
                  color: mapView === 'mundo' ? '#93c5fd' : '#94a3b8',
                }}
              >
                Vista Mundo
              </button>
              <button
                onClick={() => setMapView('españa')}
                style={{
                  padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: mapView === 'españa' ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.06)',
                  color: mapView === 'españa' ? '#93c5fd' : '#94a3b8',
                }}
              >
                Vista España
              </button>
            </div>

            {mapView === 'mundo' ? (
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,.06)' }}>
                <svg viewBox="0 0 880 440" style={{ width: '100%', height: 'auto', maxHeight: 500 }}>
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
                <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
                  {geoSignals.length} señales geolocalizadas · fuentes: GDELT 2.0, EMSC, INCIBE-CERT
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,.06)' }}>
                <svg viewBox="0 0 500 300" style={{ width: '100%', height: 'auto', maxHeight: 400 }}>
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
                <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
                  {esSignals.length} señales en territorio nacional
                </div>
              </div>
            )}

            {/* Signal table below map */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', marginBottom: 10 }}>SEÑALES GEOLOCALIZADAS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {geoSignals.slice(0, 8).map(s => (
                  <div key={s.id} style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 80px',
                    gap: 10, alignItems: 'center', padding: '8px 12px',
                    background: 'rgba(255,255,255,.03)', borderRadius: 5,
                    fontSize: 12, border: '1px solid rgba(255,255,255,.05)',
                  }}>
                    <span style={{ color: SEV_COLOR[s.severidad], fontWeight: 700, fontSize: 11 }}>{s.severidad}</span>
                    <span style={{ color: '#e2e8f0' }}>{s.titulo.slice(0, 60)}{s.titulo.length > 60 ? '...' : ''}</span>
                    <span style={{ color: '#64748b' }}>{s.pais ?? '—'}</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>{s.lat?.toFixed(1)}, {s.lon?.toFixed(1)}</span>
                    <span style={{ color: '#475569', fontSize: 10 }}>{relTime(s.timestamp)}</span>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24,
              background: `${globalLevelColor}12`, border: `1px solid ${globalLevelColor}40`,
              borderRadius: 10, padding: '16px 24px',
            }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: `4px solid ${globalLevelColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${globalLevelColor}20` }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: globalLevelColor }}>{globalLevel}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Nivel de Alerta Global</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: globalLevelColor }}>Score: {globalScore}/100</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Ponderacion: Ciber 40% · Informacional 40% · Fisico 20%</div>
              </div>
            </div>

            {/* Three vectors detail */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {/* Cyber */}
              <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginBottom: 12, letterSpacing: '0.05em' }}>VECTOR CIBERNETICO</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Fuentes: INCIBE-CERT, CCN-CERT</div>
                {attackData.data?.details?.cyber && (attackData.data.details.cyber as CrisisSignal[]).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(attackData.data.details.cyber as Array<{ nombre?: string; cvss?: number; afectados?: string; tipo_ataque?: string; fuente?: string; timestamp?: string }>).map((t, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: 'rgba(220,38,38,.08)', borderRadius: 5, border: '1px solid rgba(220,38,38,.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fca5a5', marginBottom: 3 }}>{t.nombre?.slice(0, 70)}</div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8' }}>
                          {t.cvss && <span>CVSS: {t.cvss}</span>}
                          {t.tipo_ataque && <span>{t.tipo_ataque}</span>}
                          {t.afectados && <span>{t.afectados}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,.06)', borderRadius: 6, border: '1px solid rgba(34,197,94,.2)' }}>
                    <div style={{ fontSize: 12, color: '#86efac' }}>Sin alertas criticas activas de INCIBE-CERT</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Sistema de monitorizacion activo</div>
                  </div>
                )}
              </div>

              {/* Informacional */}
              <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', marginBottom: 12, letterSpacing: '0.05em' }}>VECTOR INFORMACIONAL</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Fuentes: Google Noticias ES, GDELT</div>
                {attackData.data?.details?.informacional && (attackData.data.details.informacional as unknown[]).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(attackData.data.details.informacional as Array<{ narrativa?: string; objetivo?: string; velocidad?: number; plataformas?: string[]; timestamp?: string }>).map((t, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: 'rgba(245,158,11,.07)', borderRadius: 5, border: '1px solid rgba(245,158,11,.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fde68a', marginBottom: 3 }}>{t.narrativa?.slice(0, 70)}</div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8' }}>
                          {t.objetivo && <span>{t.objetivo}</span>}
                          {t.velocidad && <span>{t.velocidad} menciones/h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,.06)', borderRadius: 6, border: '1px solid rgba(34,197,94,.2)' }}>
                    <div style={{ fontSize: 12, color: '#86efac' }}>Sin campanas de desinformacion activas</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Monitor narrativo activo</div>
                  </div>
                )}
              </div>

              {/* Fisico */}
              <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', marginBottom: 12, letterSpacing: '0.05em' }}>VECTOR FISICO</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Fuentes: EMSC, emergencias medios</div>
                {attackData.data?.details?.fisico && (attackData.data.details.fisico as unknown[]).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(attackData.data.details.fisico as Array<{ tipo?: string; ubicacion?: string; fuente?: string; lat?: number; lon?: number; timestamp?: string }>).map((t, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: 'rgba(59,130,246,.07)', borderRadius: 5, border: '1px solid rgba(59,130,246,.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', marginBottom: 3 }}>{t.tipo} — {t.ubicacion}</div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8' }}>
                          <span>{t.fuente}</span>
                          {t.lat && <span>{t.lat?.toFixed(2)}, {t.lon?.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,.06)', borderRadius: 6, border: '1px solid rgba(34,197,94,.2)' }}>
                    <div style={{ fontSize: 12, color: '#86efac' }}>Sin alertas fisicas activas</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>EMSC: monitoring iberico activo</div>
                  </div>
                )}
              </div>
            </div>

            {/* Fusion matrix */}
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', marginBottom: 14 }}>MATRIZ DE CORRELACION</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 1, maxWidth: 480 }}>
                {[['', 'Ciber', 'Informacional', 'Fisico'],
                  ['Ciber', '—', vectors[0] && vectors[1] ? Math.round(Math.abs(vectors[0].score - vectors[1].score) / 100 * 10) / 10 : '—', vectors[0] && vectors[2] ? Math.round(Math.abs(vectors[0].score - vectors[2].score) / 100 * 10) / 10 : '—'],
                  ['Informacional', '—', '—', vectors[1] && vectors[2] ? Math.round(Math.abs(vectors[1].score - vectors[2].score) / 100 * 10) / 10 : '—'],
                  ['Fisico', '—', '—', '—'],
                ].map((row, ri) => row.map((cell, ci) => (
                  <div key={`${ri}_${ci}`} style={{
                    padding: '6px 10px', fontSize: 11,
                    background: ri === 0 || ci === 0 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
                    color: ri === 0 || ci === 0 ? '#94a3b8' : '#e2e8f0',
                    fontWeight: ri === 0 || ci === 0 ? 700 : 400,
                    textAlign: 'center',
                  }}>
                    {cell}
                  </div>
                )))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#475569' }}>
                Correlacion calculada entre vectores de ataque en la ultima hora. Valor entre 0 (sin correlacion) y 1 (ataque coordinado).
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
