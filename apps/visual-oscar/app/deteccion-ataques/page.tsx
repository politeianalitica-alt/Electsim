'use client'
/**
 * Detección de Ataques · sistema de threat detection multivector.
 *
 * Cubre 6 vectores: Mediático, Digital, Institucional, Regulatorio,
 * Económico y Físico. Combina:
 *   - Lista de ataques activos priorizada por severidad
 *   - Timeline horario 7 días (heat por hora + dots críticos)
 *   - Heatmap vector × día
 *   - Patrones coordinados detectados por IA
 *   - Atribución de origen probable
 *   - Playbooks de respuesta por severidad
 *
 * Auto-refresh cada 5 min.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Vector = 'Mediático' | 'Digital' | 'Institucional' | 'Regulatorio' | 'Económico' | 'Físico'
type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
type Fase = 'Detectado' | 'Confirmado' | 'Escalando' | 'Pico' | 'Decayendo' | 'Cerrado'

const VECTOR_META: Record<Vector, { color: string; desc: string }> = {
  'Mediático':     { color: '#7C3AED', desc: 'Cobertura coordinada · editoriales · TV' },
  'Digital':       { color: '#0EA5E9', desc: 'Bots · trolls · DDoS · brigading' },
  'Institucional': { color: '#1F4E8C', desc: 'Querellas · expedientes · inspecciones' },
  'Regulatorio':   { color: '#0F766E', desc: 'Enmiendas hostiles · directivas UE' },
  'Económico':     { color: '#D97706', desc: 'Boicots · divestments · activistas' },
  'Físico':        { color: '#DC2626', desc: 'Protestas · acoso · pintadas' },
}
const SEV_COLOR: Record<Severidad, string> = {
  'CRÍTICA': '#7C2D12', 'ALTA': '#DC2626', 'MEDIA': '#F59E0B', 'BAJA': '#0EA5E9',
}
const SEV_BG: Record<Severidad, string> = {
  'CRÍTICA': '#FEE2E2', 'ALTA': '#FEF3C7', 'MEDIA': '#FEF9C3', 'BAJA': '#E0F2FE',
}
const FASE_META: Record<Fase, { color: string; pct: number }> = {
  'Detectado':  { color: '#0EA5E9', pct: 12 },
  'Confirmado': { color: '#3B82F6', pct: 28 },
  'Escalando':  { color: '#F97316', pct: 50 },
  'Pico':       { color: '#DC2626', pct: 70 },
  'Decayendo':  { color: '#16A34A', pct: 88 },
  'Cerrado':    { color: '#525258', pct: 100 },
}

interface Ataque {
  id: string; titulo: string
  vector: Vector; severidad: Severidad; fase: Fase
  target: string; origen: string
  primer_evento: string; ultimo_evento: string
  score: number; alcance_estimado: number; sentimiento: number
  cobertura: string[]; drivers: string[]; beneficiarios: string[]
  recomendacion: string
}
interface Patron {
  id: string; titulo: string
  confianza: number; n_eventos: number; vectores: Vector[]
  descripcion: string; origen_probable: string; primera_deteccion: string
}
interface Atribucion { origen: string; count: number; pct: number; color: string }
interface Playbook { severidad: Severidad; sla: string; pasos: string[] }
interface DataResp {
  kpis: {
    ataques_activos: number; score_amenaza: number
    criticos: number; altos: number; delta_24h: number
    proxima_ventana: string
  }
  ataques_activos: Ataque[]
  timeline: Array<{ t: string; total: number; critica: number; alta: number; media: number; baja: number }>
  heatmap: { days: string[]; vectors: Vector[]; matrix: number[][] }
  patrones: Patron[]
  atribucion: Atribucion[]
  playbooks: Playbook[]
  fetched_at: string
  fetch_ms: number
}

const ACCENT = '#DC2626'
const ACCENT_DARK = '#7C2D12'
const REFRESH_MS = 5 * 60 * 1000

export default function DeteccionAtaquesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData] = useState<DataResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [vectorFilter, setVectorFilter] = useState<Vector | 'all'>('all')
  const [sevFilter, setSevFilter] = useState<Severidad | 'all'>('all')
  const [selectedAtaque, setSelectedAtaque] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/deteccion-ataques/data').then(r => r.ok ? r.json() : null)
      if (r) { setData(r); setUpdatedAt(new Date()) }
    } finally { setLoading(false) }
  }
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const ataquesFiltrados = useMemo(() => {
    if (!data) return []
    return data.ataques_activos.filter(a =>
      (vectorFilter === 'all' || a.vector === vectorFilter) &&
      (sevFilter === 'all' || a.severidad === sevFilter),
    )
  }, [data, vectorFilter, sevFilter])

  const ataqueSel = useMemo(
    () => data?.ataques_activos.find(a => a.id === selectedAtaque) || null,
    [data, selectedAtaque],
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* HERO */}
        <section style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.85, textTransform: 'uppercase', margin: '0 0 8px' }}>
              SEGURIDAD · DETECCIÓN DE ATAQUES · MULTIVECTOR
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
              Threat Detection <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.78 }}>en tiempo real</em>
            </h1>
            <p style={{ fontSize: 13.5, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
              Sistema de detección de ataques sobre 6 vectores · cobertura mediática hostil ·
              campañas digitales coordinadas · operaciones institucionales · enmiendas regulatorias ·
              boicots económicos · acciones físicas. Atribución, patrones coordinados y playbooks de respuesta.
            </p>
            {updatedAt && (
              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }}/>
                Última detección · {updatedAt.toLocaleTimeString('es-ES')}
                {data?.fetch_ms ? ` · ${data.fetch_ms} ms` : ''}
                <button onClick={refresh} style={{
                  marginLeft: 8, fontSize: 10.5, padding: '4px 12px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>↻ Refrescar</button>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <HeroKPI label="Ataques activos" value={data?.kpis.ataques_activos} accent="#FCA5A5"
              sub={data ? `${data.kpis.criticos} críticos · ${data.kpis.altos} altos` : ''}/>
            <HeroKPI label="Score amenaza" value={data?.kpis.score_amenaza} unit="/100" accent="#FCD34D"
              sub={scoreLabel(data?.kpis.score_amenaza)}/>
            <HeroKPI label="Cambio 24h" value={data?.kpis.delta_24h} unit=" nuevos" accent="#86EFAC"/>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
                Próxima ventana crítica
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                {data?.kpis.proxima_ventana || 'Cargando…'}
              </div>
            </div>
          </div>
        </section>

        {/* ROW 1: Timeline 7d */}
        <Panel title="Detector en vivo · 7 días" subtitle="Eventos por hora · severidad apilada · línea Hoy en la derecha" marginBottom>
          {data ? <Timeline points={data.timeline}/> : <Loading/>}
        </Panel>

        {/* ROW 2: Heatmap vectores × días */}
        <Panel title="Mapa de calor · vector × día" subtitle="6 vectores ataque · 7 días · intensidad de eventos" marginBottom>
          {data ? <Heatmap data={data.heatmap}/> : <Loading/>}
        </Panel>

        {/* ROW 3: Filtros + Lista de ataques activos + Detalle */}
        <Panel
          title={`Ataques activos · ${ataquesFiltrados.length} de ${data?.ataques_activos.length || 0}`}
          subtitle="Click en una fila para ver detalle, drivers y recomendación"
          marginBottom
        >
          <Filtros
            vectorFilter={vectorFilter} setVectorFilter={setVectorFilter}
            sevFilter={sevFilter} setSevFilter={setSevFilter}
          />
          <div style={{ display: 'grid', gridTemplateColumns: ataqueSel ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
            <ListaAtaques ataques={ataquesFiltrados} selected={selectedAtaque} onSelect={setSelectedAtaque}/>
            {ataqueSel && <DetalleAtaque ataque={ataqueSel} onClose={() => setSelectedAtaque(null)}/>}
          </div>
        </Panel>

        {/* ROW 4: Patrones coordinados + Atribución */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
          <Panel title="Patrones coordinados · IA" subtitle="Campañas multi-vector detectadas por similarity + temporal clustering">
            {data ? <PatronesList patrones={data.patrones}/> : <Loading/>}
          </Panel>
          <Panel title="Atribución de origen" subtitle="Distribución probable de los actores detrás">
            {data ? <Atribucion items={data.atribucion}/> : <Loading/>}
          </Panel>
        </div>

        {/* ROW 5: Playbooks de respuesta */}
        <Panel title="Playbooks de respuesta" subtitle="Protocolos por severidad · SLA · pasos accionables" marginBottom>
          {data ? <Playbooks playbooks={data.playbooks}/> : <Loading/>}
        </Panel>

        {loading && !data && <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>Cargando sistema de detección…</div>}
      </main>
    </div>
  )
}

// ─── Componentes ────────────────────────────────────────────────────────

function scoreLabel(s?: number): string {
  if (s == null) return ''
  if (s < 25) return 'Bajo · vigilancia'
  if (s < 50) return 'Medio · monitor reforzado'
  if (s < 75) return 'Alto · respuesta activa'
  return 'Crítico · activar comité'
}

function HeroKPI({ label, value, unit, accent, sub }: { label: string; value: number | undefined; unit?: string; accent: string; sub?: string }) {
  const display = value == null ? '—' : value.toLocaleString('es-ES')
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
        {display}{unit && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4, opacity: 0.85 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Panel({ title, subtitle, children, marginBottom }: { title: string; subtitle?: string; children: React.ReactNode; marginBottom?: boolean }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px',
      marginBottom: marginBottom ? 14 : 0,
    }}>
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>{title}</h2>
          {subtitle && <p style={{ margin: 0, fontSize: 11, color: '#6e6e73' }}>· {subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function Loading() {
  return <div style={{ padding: 30, textAlign: 'center', color: '#86868b', fontSize: 12 }}>Cargando…</div>
}

// ─── Timeline horario 7d ────────────────────────────────────────────────
function Timeline({ points }: { points: DataResp['timeline'] }) {
  const W = 1200, H = 200, P = 36
  const colW = (W - 2 * P) / points.length
  const max = Math.max(...points.map(p => p.total)) * 1.1
  const dayMarkers = points.filter((_, i) => i % 24 === 0)
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        {points.map((p, i) => {
          const x = P + i * colW
          const totalH = (p.total / max) * (H - 2 * P)
          let y = H - P
          const draw = (val: number, color: string, label: string) => {
            const h = (val / max) * (H - 2 * P)
            y -= h
            return val > 0 ? <rect key={`${i}-${label}`} x={x} y={y} width={Math.max(1, colW - 0.5)} height={h} fill={color}><title>{p.t.slice(5, 16)} · {label}: {val}</title></rect> : null
          }
          return (
            <g key={p.t}>
              {draw(p.baja,    SEV_COLOR.BAJA,    'BAJA')}
              {draw(p.media,   SEV_COLOR.MEDIA,   'MEDIA')}
              {draw(p.alta,    SEV_COLOR.ALTA,    'ALTA')}
              {draw(p.critica, SEV_COLOR.CRÍTICA, 'CRÍTICA')}
            </g>
          )
        })}
        {/* Marcadores de día */}
        {dayMarkers.map((p, i) => {
          const idx = points.indexOf(p)
          const x = P + idx * colW
          const date = new Date(p.t)
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={P} y2={H - P} stroke="#ECECEF" strokeDasharray="2 3"/>
              <text x={x} y={H - 8} textAnchor="middle" fontSize={9} fill="#86868b">
                {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </text>
            </g>
          )
        })}
        {/* Hoy */}
        <line x1={W - P} x2={W - P} y1={P} y2={H - P} stroke="#1d1d1f" strokeWidth={1} strokeDasharray="3 3"/>
        <text x={W - P} y={P - 6} textAnchor="middle" fontSize={10} fill="#1d1d1f" fontWeight={600}>Ahora</text>
      </svg>
      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 6, flexWrap: 'wrap', color: '#3a3a3d' }}>
        {(['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'] as Severidad[]).map(s => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: SEV_COLOR[s], borderRadius: 2 }}/>{s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Heatmap vector × día ───────────────────────────────────────────────
function Heatmap({ data }: { data: DataResp['heatmap'] }) {
  const max = Math.max(...data.matrix.flat(), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 130 }}/>
            {data.days.map(d => (
              <th key={d} style={{
                fontSize: 9.5, fontWeight: 600, color: '#86868b',
                padding: '4px 0', textAlign: 'center', letterSpacing: '0.04em',
              }}>
                {new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </th>
            ))}
            <th style={{ width: 60, fontSize: 9.5, fontWeight: 600, color: '#86868b', padding: '4px 0', textAlign: 'right' }}>Σ 7d</th>
          </tr>
        </thead>
        <tbody>
          {data.vectors.map((v, vi) => {
            const row = data.matrix[vi]
            const total = row.reduce((s, n) => s + n, 0)
            const meta = VECTOR_META[v]
            return (
              <tr key={v}>
                <td style={{ padding: '5px 8px', fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 14, background: meta.color, borderRadius: 2 }}/>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{v}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 2, marginLeft: 10 }}>{meta.desc}</div>
                </td>
                {row.map((val, ci) => {
                  const intensity = val / max
                  const bg = `color-mix(in srgb, ${meta.color} ${Math.round(intensity * 78 + 8)}%, white)`
                  return (
                    <td key={ci} style={{
                      padding: 2, textAlign: 'center', verticalAlign: 'middle',
                    }}>
                      <div title={`${v} · ${data.days[ci]} · ${val} eventos`} style={{
                        background: bg,
                        height: 32, borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        color: intensity > 0.55 ? '#fff' : '#3a3a3d',
                      }}>
                        {val}
                      </div>
                    </td>
                  )
                })}
                <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: meta.color }}>
                  {total}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Filtros ────────────────────────────────────────────────────────────
function Filtros({ vectorFilter, setVectorFilter, sevFilter, setSevFilter }: {
  vectorFilter: Vector | 'all'; setVectorFilter: (v: Vector | 'all') => void
  sevFilter: Severidad | 'all'; setSevFilter: (s: Severidad | 'all') => void
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <FilterPills label="Vector" active={vectorFilter}
        options={[
          { value: 'all', label: 'Todos', color: '#6e6e73' },
          ...(Object.keys(VECTOR_META) as Vector[]).map(v => ({ value: v, label: v, color: VECTOR_META[v].color })),
        ]}
        onChange={v => setVectorFilter(v as Vector | 'all')}
      />
      <FilterPills label="Severidad" active={sevFilter}
        options={[
          { value: 'all', label: 'Todas', color: '#6e6e73' },
          ...(Object.keys(SEV_COLOR) as Severidad[]).map(s => ({ value: s, label: s, color: SEV_COLOR[s] })),
        ]}
        onChange={v => setSevFilter(v as Severidad | 'all')}
      />
    </div>
  )
}
function FilterPills({ label, active, options, onChange }: {
  label: string; active: string
  options: Array<{ value: string; label: string; color: string }>
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 2 }}>
        {options.map(o => {
          const isActive = active === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? o.color : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '4px 10px',
              fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{o.label}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Lista de ataques ───────────────────────────────────────────────────
function ListaAtaques({ ataques, selected, onSelect }: {
  ataques: Ataque[]; selected: string | null; onSelect: (id: string | null) => void
}) {
  if (ataques.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#86868b', fontSize: 12 }}>Sin ataques que coincidan con los filtros</div>
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 540, overflowY: 'auto' }}>
      {ataques.map(a => {
        const isSel = selected === a.id
        const vMeta = VECTOR_META[a.vector]
        const fMeta = FASE_META[a.fase]
        return (
          <li key={a.id}
            onClick={() => onSelect(isSel ? null : a.id)}
            style={{
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              background: isSel ? `color-mix(in srgb, ${SEV_COLOR[a.severidad]} 8%, white)` : '#FAFAFA',
              border: `1px solid ${isSel ? SEV_COLOR[a.severidad] : '#ECECEF'}`,
              borderLeft: `4px solid ${SEV_COLOR[a.severidad]}`,
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, flex: 1 }}>
                {a.titulo}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: SEV_BG[a.severidad], color: SEV_COLOR[a.severidad],
                letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>{a.severidad}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: `${vMeta.color}14`, color: vMeta.color, fontWeight: 700, letterSpacing: '0.04em',
              }}>{a.vector.toUpperCase()}</span>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: `${fMeta.color}14`, color: fMeta.color, fontWeight: 700,
              }}>{a.fase.toUpperCase()}</span>
              <span style={{ fontSize: 10, color: '#6e6e73' }}>· {a.target}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: '#86868b', alignItems: 'center' }}>
              <span>Score <strong style={{ color: SEV_COLOR[a.severidad], fontFamily: 'var(--font-display)' }}>{a.score}</strong></span>
              <span>Alcance {(a.alcance_estimado / 1_000_000).toFixed(1)}M</span>
              <span>Sent <strong style={{ color: '#DC2626' }}>{a.sentimiento.toFixed(2)}</strong></span>
            </div>
            {/* Barra fase */}
            <div style={{ marginTop: 6, height: 3, background: '#ECECEF', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${fMeta.pct}%`, height: '100%', background: fMeta.color }}/>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Detalle ataque ─────────────────────────────────────────────────────
function DetalleAtaque({ ataque, onClose }: { ataque: Ataque; onClose: () => void }) {
  const vMeta = VECTOR_META[ataque.vector]
  return (
    <div style={{
      background: '#fff', border: `1px solid ${SEV_COLOR[ataque.severidad]}33`,
      borderRadius: 12, padding: '14px 16px',
      borderLeft: `4px solid ${SEV_COLOR[ataque.severidad]}`,
      maxHeight: 540, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
          {ataque.titulo}
        </h3>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 11, color: '#6e6e73', fontFamily: 'inherit',
        }}>cerrar ✕</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Tag color={SEV_COLOR[ataque.severidad]}>{ataque.severidad}</Tag>
        <Tag color={vMeta.color}>{ataque.vector}</Tag>
        <Tag color={FASE_META[ataque.fase].color}>{ataque.fase}</Tag>
        <Tag color="#6e6e73">Score {ataque.score}</Tag>
      </div>

      <Field label="Target">{ataque.target}</Field>
      <Field label="Origen">{ataque.origen}</Field>
      <Field label="Primer evento">{relTime(ataque.primer_evento)}</Field>
      <Field label="Último evento">{relTime(ataque.ultimo_evento)}</Field>
      <Field label="Alcance estimado">{ataque.alcance_estimado.toLocaleString('es-ES')} impresiones</Field>
      <Field label="Sentimiento medio">
        <strong style={{ color: ataque.sentimiento < -0.5 ? '#DC2626' : '#D97706' }}>{ataque.sentimiento.toFixed(2)}</strong>
        <span style={{ color: '#86868b', marginLeft: 4 }}>(escala -1 a 1)</span>
      </Field>

      <Section label="Cobertura · canales activos">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {ataque.cobertura.map(c => (
            <span key={c} style={{
              fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
              background: '#F5F5F7', color: '#3a3a3d', fontWeight: 600,
            }}>{c}</span>
          ))}
        </div>
      </Section>

      <Section label="Drivers detectados">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>
          {ataque.drivers.map(d => <li key={d}>{d}</li>)}
        </ul>
      </Section>

      <Section label="Beneficiarios potenciales">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {ataque.beneficiarios.map(b => (
            <span key={b} style={{
              fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
              background: '#FEF3C7', color: '#92400E', fontWeight: 600,
              border: '1px solid #FCD34D',
            }}>{b}</span>
          ))}
        </div>
      </Section>

      <Section label="Recomendación de respuesta">
        <div style={{
          padding: '8px 12px', background: SEV_BG[ataque.severidad],
          borderRadius: 8, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5,
          borderLeft: `3px solid ${SEV_COLOR[ataque.severidad]}`,
        }}>
          {ataque.recomendacion}
        </div>
      </Section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11.5, marginBottom: 4 }}>
      <span style={{ color: '#86868b', minWidth: 130, fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#1d1d1f', flex: 1 }}>{children}</span>
    </div>
  )
}
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}
function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
      background: `${color}14`, color, border: `1px solid ${color}33`, letterSpacing: '0.04em',
    }}>{children}</span>
  )
}

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = diffMs / 3600 / 1000
  if (h < 1) return `hace ${Math.round(h * 60)} min`
  if (h < 24) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} d`
}

// ─── Patrones coordinados ───────────────────────────────────────────────
function PatronesList({ patrones }: { patrones: Patron[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {patrones.map(p => (
        <li key={p.id} style={{
          padding: '12px 14px', borderRadius: 10,
          background: '#FAFAFA', border: '1px solid #ECECEF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', flex: 1 }}>{p.titulo}</span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
              background: p.confianza >= 85 ? '#FEE2E2' : '#FEF3C7',
              color:      p.confianza >= 85 ? '#DC2626' : '#92400E',
              border:     p.confianza >= 85 ? '1px solid #FCA5A5' : '1px solid #FCD34D',
              whiteSpace: 'nowrap',
            }}>{p.confianza}% confianza</span>
          </div>
          <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 6 }}>{p.descripcion}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
            {p.vectores.map(v => (
              <span key={v} style={{
                fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
                background: `${VECTOR_META[v].color}14`, color: VECTOR_META[v].color, fontWeight: 700, letterSpacing: '0.04em',
              }}>{v.toUpperCase()}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#86868b' }}>
            <span><strong style={{ color: '#3a3a3d' }}>{p.n_eventos}</strong> eventos · origen probable: {p.origen_probable}</span>
            <span>{relTime(p.primera_deteccion)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Atribución ─────────────────────────────────────────────────────────
function Atribucion({ items }: { items: Atribucion[] }) {
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <div>
      {/* Barra apilada total */}
      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', border: '1px solid #ECECEF', marginBottom: 12 }}>
        {items.map(i => (
          <div key={i.origen} title={`${i.origen} · ${i.count} (${i.pct}%)`} style={{
            flex: i.count, background: i.color,
          }}/>
        ))}
      </div>
      {/* Lista */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(i => (
          <li key={i.origen} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, padding: '4px 6px' }}>
            <span style={{ width: 10, height: 10, background: i.color, borderRadius: 2, flexShrink: 0 }}/>
            <span style={{ flex: 1, color: '#1d1d1f', fontWeight: 600 }}>{i.origen}</span>
            <span style={{ color: '#86868b', fontSize: 10.5 }}>{i.count}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: i.color, minWidth: 36, textAlign: 'right' }}>{i.pct}%</span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #ECECEF', fontSize: 10.5, color: '#86868b', textAlign: 'right' }}>
        Total atribución · {total} ataques
      </div>
    </div>
  )
}

// ─── Playbooks ──────────────────────────────────────────────────────────
function Playbooks({ playbooks }: { playbooks: Playbook[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {playbooks.map(p => (
        <div key={p.severidad} style={{
          background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10,
          padding: '12px 14px', borderLeft: `4px solid ${SEV_COLOR[p.severidad]}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
              background: SEV_BG[p.severidad], color: SEV_COLOR[p.severidad], letterSpacing: '0.04em',
            }}>SEVERIDAD {p.severidad}</span>
            <span style={{ fontSize: 10.5, color: '#3a3a3d', fontWeight: 600 }}>SLA {p.sla}</span>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>
            {p.pasos.map((paso, i) => <li key={i} style={{ marginBottom: 3 }}>{paso}</li>)}
          </ol>
        </div>
      ))}
    </div>
  )
}
