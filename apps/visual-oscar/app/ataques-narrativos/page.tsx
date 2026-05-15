'use client'
/**
 * Desinformación / Narrativa hostil · centrado en BULOS Y SU ORIGEN.
 *
 * Esta página identifica bulos en circulación, traza su propagación
 * desde el "paciente cero" y muestra:
 *   - Lista priorizada de bulos (estado, viralidad, daño)
 *   - Detalle: paciente cero, timeline cronológico, red de
 *     amplificadores, canales activos, fact-checkers que actuaron
 *   - Heatmap canales × días de detecciones
 *   - Top fuentes que más bulos originan/amplifican
 *   - Catálogo de fact-checkers activos
 *
 * Auto-refresh cada 5 min.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type EstadoBulo = 'CONFIRMADO_FALSO' | 'DESMENTIDO' | 'EN_INVESTIGACION' | 'PARCIAL'
type CanalBulo = 'X' | 'Facebook' | 'Telegram' | 'WhatsApp' | 'TikTok' | 'YouTube' | 'Instagram' | 'Foros' | 'Prensa' | 'TV' | 'Radio' | 'Mail'
type CategoriaBulo = 'Política' | 'Migración' | 'Sanidad' | 'Económica' | 'Electoral' | 'Climática' | 'Internacional' | 'Justicia'
type TipoEvento = 'origen' | 'viral' | 'pico' | 'factcheck' | 'desmentido' | 'replica'

const ESTADO_META: Record<EstadoBulo, { color: string; bg: string; label: string }> = {
  CONFIRMADO_FALSO: { color: '#7C2D12', bg: '#FED7AA', label: 'Confirmado falso' },
  DESMENTIDO:       { color: '#DC2626', bg: '#FEE2E2', label: 'Desmentido' },
  EN_INVESTIGACION: { color: '#F59E0B', bg: '#FEF3C7', label: 'En investigación' },
  PARCIAL:          { color: '#0EA5E9', bg: '#E0F2FE', label: 'Parcialmente cierto' },
}
const COLOR_CANAL: Record<CanalBulo, string> = {
  X: '#000000', Facebook: '#1877F2', Telegram: '#0088CC', WhatsApp: '#25D366',
  TikTok: '#FF0050', YouTube: '#FF0000', Instagram: '#E4405F', Foros: '#525258',
  Prensa: '#1F4E8C', TV: '#7C3AED', Radio: '#0F766E', Mail: '#86868b',
}
const COLOR_CATEGORIA: Record<CategoriaBulo, string> = {
  Política: '#1F4E8C', Migración: '#DC2626', Sanidad: '#0EA5E9',
  Económica: '#16A34A', Electoral: '#7C3AED', Climática: '#0F766E',
  Internacional: '#F59E0B', Justicia: '#525258',
}
const TIPO_EVENTO_META: Record<TipoEvento, { color: string; label: string; icon: string }> = {
  origen:     { color: '#DC2626', label: 'PACIENTE CERO', icon: '◉' },
  viral:      { color: '#F97316', label: 'VIRALIZACIÓN',  icon: '↗' },
  pico:       { color: '#7C2D12', label: 'PICO',          icon: '▲' },
  factcheck:  { color: '#7C3AED', label: 'FACT-CHECK',    icon: '✓' },
  desmentido: { color: '#16A34A', label: 'DESMENTIDO',    icon: '⌐' },
  replica:    { color: '#86868b', label: 'RÉPLICA',       icon: '·' },
}

interface EventoTimeline {
  t: string; tipo: TipoEvento; canal: CanalBulo | string
  desc: string; reach?: number
}
interface Amplificador {
  nombre: string; canal: CanalBulo; seguidores: number; reach_aportado: number
  perfil: string; posicion: 'Origen' | 'Amplificador' | 'Replicador'
}
interface FactChecker {
  nombre: string; fecha: string
  veredicto: 'FALSO' | 'ENGAÑOSO' | 'PARCIAL' | 'EN ANÁLISIS'
  url?: string
}
interface Bulo {
  id: string; titulo: string
  categoria: CategoriaBulo; estado: EstadoBulo
  primera_deteccion: string; ultima_actividad: string
  texto_principal: string; variantes: string[]
  alcance_estimado: number
  paciente_cero: {
    cuenta: string; canal: CanalBulo; perfil: string
    seguidores: number; fecha_primer_post: string; pais_origen: string
  }
  origen_tipo: string
  similar_a?: string
  pais_aparicion_previa?: string
  timeline: EventoTimeline[]
  amplificadores: Amplificador[]
  canales_activos: Array<{ canal: CanalBulo; menciones: number; pico_h: string }>
  factcheckers: FactChecker[]
  beneficiarios: string[]
  daño_estimado: number
  viralidad: number
}
interface TopFuente {
  fuente: string; tipo: string
  n_bulos_origen: number; n_bulos_amplif: number; score_riesgo: number
}
interface DataResp {
  kpis: {
    bulos_activos: number; desmentidos: number; en_investigacion: number
    alcance_total: number; viralidad_max: number; delta_24h: number
  }
  bulos: Bulo[]
  top_fuentes: TopFuente[]
  canales_heatmap: { days: string[]; canales: CanalBulo[]; matrix: number[][] }
  fact_checkers: string[]
  fetch_ms: number
}

const ACCENT = '#9D174D'
const ACCENT_DARK = '#500724'
const REFRESH_MS = 5 * 60 * 1000

export default function DesinformacionPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData] = useState<DataResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState<CategoriaBulo | 'all'>('all')
  const [estFilter, setEstFilter] = useState<EstadoBulo | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/desinformacion/bulos').then(r => r.ok ? r.json() : null)
      if (r) {
        setData(r); setUpdatedAt(new Date())
        if (!selectedId && r.bulos?.length) setSelectedId(r.bulos[0].id)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const bulosFiltrados = useMemo(() => {
    if (!data) return []
    return data.bulos.filter(b =>
      (catFilter === 'all' || b.categoria === catFilter) &&
      (estFilter === 'all' || b.estado === estFilter),
    )
  }, [data, catFilter, estFilter])

  const buloSel = useMemo(
    () => data?.bulos.find(b => b.id === selectedId) || null,
    [data, selectedId],
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
              SEGURIDAD · DESINFORMACIÓN · RASTREO DE BULOS
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
              Bulos y narrativa hostil <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.78 }}>con trazabilidad</em>
            </h1>
            <p style={{ fontSize: 13.5, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
              Catálogo de bulos detectados con identificación del <strong>paciente cero</strong>,
              timeline cronológico desde el primer post hasta el desmentido, red de amplificadores,
              canales activos y fact-checkers que han actuado. Traza el origen exacto de cada bulo
              para diseñar contranarrativa efectiva.
            </p>
            {updatedAt && (
              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }}/>
                Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
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
            <HeroKPI label="Bulos activos"      value={data?.kpis.bulos_activos}    accent="#FCA5A5"/>
            <HeroKPI label="Desmentidos"        value={data?.kpis.desmentidos}      accent="#86EFAC"/>
            <HeroKPI label="En investigación"   value={data?.kpis.en_investigacion} accent="#FCD34D"/>
            <HeroKPI label="Alcance total"
              value={data?.kpis.alcance_total ? +(data.kpis.alcance_total / 1_000_000).toFixed(1) : undefined}
              unit=" M"
              accent="#7DD3FC" sub="impresiones combinadas"/>
          </div>
        </section>

        {/* ROW 1: Lista de bulos + Detalle */}
        <Panel
          title={`Bulos detectados · ${bulosFiltrados.length} de ${data?.bulos.length || 0}`}
          subtitle="Click para ver paciente cero, timeline y red de amplificadores"
          marginBottom
        >
          <Filtros
            catFilter={catFilter} setCatFilter={setCatFilter}
            estFilter={estFilter} setEstFilter={setEstFilter}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginTop: 12 }}>
            <ListaBulos bulos={bulosFiltrados} selectedId={selectedId} onSelect={setSelectedId}/>
            {buloSel ? (
              <DetalleBulo bulo={buloSel}/>
            ) : (
              <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, padding: '40px 20px', textAlign: 'center', color: '#86868b', fontSize: 12 }}>
                Selecciona un bulo de la lista para ver su trazabilidad completa
              </div>
            )}
          </div>
        </Panel>

        {/* ROW 2: Timeline ampliado del bulo seleccionado */}
        {buloSel && (
          <Panel
            title={`Timeline · "${truncate(buloSel.titulo, 70)}"`}
            subtitle={`${buloSel.timeline.length} eventos · paciente cero a las ${relTime(buloSel.timeline[0]?.t)}`}
            marginBottom
          >
            <TimelineBulo bulo={buloSel}/>
          </Panel>
        )}

        {/* ROW 3: Heatmap canales × días + Top fuentes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
          <Panel title="Mapa de calor · canal × día" subtitle="Detecciones de menciones a bulos por canal · 7 días">
            {data ? <CanalesHeatmap data={data.canales_heatmap}/> : <Loading/>}
          </Panel>
          <Panel title="Top fuentes de bulos" subtitle="Cuentas/canales que más bulos originan o amplifican">
            {data ? <TopFuentesList items={data.top_fuentes}/> : <Loading/>}
          </Panel>
        </div>

        {/* ROW 4: Fact-checkers */}
        <Panel title="Fact-checkers activos" subtitle="Verificadores que han desmentido bulos en circulación" marginBottom>
          {data && <FactCheckersStrip items={data.fact_checkers}/>}
        </Panel>

        {loading && !data && <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>Cargando catálogo de bulos…</div>}
      </main>
    </div>
  )
}

// ─── Componentes ────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
function relTime(iso: string | undefined): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = diffMs / 3600 / 1000
  if (h < 1) return `hace ${Math.round(h * 60)} min`
  if (h < 24) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} días`
}

function HeroKPI({ label, value, unit, accent, sub }: { label: string; value?: number; unit?: string; accent: string; sub?: string }) {
  const display = value == null ? '—' : value.toLocaleString('es-ES')
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>{label}</div>
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
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

// ─── Filtros ────────────────────────────────────────────────────────────
function Filtros({ catFilter, setCatFilter, estFilter, setEstFilter }: {
  catFilter: CategoriaBulo | 'all'; setCatFilter: (c: CategoriaBulo | 'all') => void
  estFilter: EstadoBulo | 'all'; setEstFilter: (e: EstadoBulo | 'all') => void
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <FilterPills label="Categoría" active={catFilter}
        options={[
          { value: 'all', label: 'Todas', color: '#6e6e73' },
          ...(Object.keys(COLOR_CATEGORIA) as CategoriaBulo[]).map(c => ({ value: c, label: c, color: COLOR_CATEGORIA[c] })),
        ]}
        onChange={v => setCatFilter(v as CategoriaBulo | 'all')}
      />
      <FilterPills label="Estado" active={estFilter}
        options={[
          { value: 'all', label: 'Todos', color: '#6e6e73' },
          ...(Object.keys(ESTADO_META) as EstadoBulo[]).map(e => ({ value: e, label: ESTADO_META[e].label, color: ESTADO_META[e].color })),
        ]}
        onChange={v => setEstFilter(v as EstadoBulo | 'all')}
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
      <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 2, flexWrap: 'wrap' }}>
        {options.map(o => {
          const isActive = active === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? o.color : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '4px 10px',
              fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{o.label}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Lista de bulos ─────────────────────────────────────────────────────
function ListaBulos({ bulos, selectedId, onSelect }: {
  bulos: Bulo[]; selectedId: string | null; onSelect: (id: string) => void
}) {
  if (bulos.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#86868b', fontSize: 12, background: '#FAFAFA', borderRadius: 12, border: '1px solid #ECECEF' }}>
      Sin bulos que coincidan con los filtros
    </div>
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 640, overflowY: 'auto' }}>
      {bulos.map(b => {
        const isSel = selectedId === b.id
        const eMeta = ESTADO_META[b.estado]
        return (
          <li key={b.id}
            onClick={() => onSelect(b.id)}
            style={{
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              background: isSel ? eMeta.bg : '#FAFAFA',
              border: `1px solid ${isSel ? eMeta.color : '#ECECEF'}`,
              borderLeft: `4px solid ${eMeta.color}`,
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, flex: 1 }}>
                {b.titulo}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: eMeta.bg, color: eMeta.color, letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>{eMeta.label.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: `${COLOR_CATEGORIA[b.categoria]}14`, color: COLOR_CATEGORIA[b.categoria],
                fontWeight: 700, letterSpacing: '0.04em',
              }}>{b.categoria.toUpperCase()}</span>
              <span style={{ fontSize: 10, color: '#6e6e73' }}>· Origen: {b.paciente_cero.canal}</span>
              <span style={{ fontSize: 10, color: '#6e6e73' }}>· {relTime(b.primera_deteccion)}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: '#86868b', alignItems: 'center', marginBottom: 6 }}>
              <span>Alcance <strong style={{ color: '#1d1d1f' }}>{(b.alcance_estimado / 1_000_000).toFixed(1)}M</strong></span>
              <span>Viralidad <strong style={{ color: '#DC2626' }}>{b.viralidad}</strong></span>
              <span>Daño <strong style={{ color: eMeta.color }}>{b.daño_estimado}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <BarMini value={b.viralidad} color="#DC2626"/>
              <BarMini value={b.daño_estimado} color={eMeta.color}/>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
function BarMini({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 4, background: '#ECECEF', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color }}/>
    </div>
  )
}

// ─── Detalle del bulo ───────────────────────────────────────────────────
function DetalleBulo({ bulo }: { bulo: Bulo }) {
  const eMeta = ESTADO_META[bulo.estado]
  return (
    <div style={{
      background: '#fff', border: `1px solid ${eMeta.color}33`,
      borderRadius: 12, padding: '14px 16px',
      borderLeft: `4px solid ${eMeta.color}`,
      maxHeight: 640, overflowY: 'auto',
    }}>
      <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
        {bulo.titulo}
      </h3>

      {/* Meta tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Tag color={eMeta.color}>{eMeta.label}</Tag>
        <Tag color={COLOR_CATEGORIA[bulo.categoria]}>{bulo.categoria}</Tag>
        <Tag color="#6e6e73">Viralidad {bulo.viralidad}</Tag>
        <Tag color={eMeta.color}>Daño {bulo.daño_estimado}</Tag>
      </div>

      {/* Texto principal */}
      <Section label="Contenido del bulo">
        <div style={{
          padding: '10px 12px', background: '#FEF2F2', borderLeft: `3px solid ${eMeta.color}`,
          borderRadius: 6, fontSize: 12, lineHeight: 1.5, color: '#1d1d1f', fontStyle: 'italic',
        }}>
          “{bulo.texto_principal}”
        </div>
      </Section>

      {/* Variantes */}
      <Section label={`Variantes detectadas · ${bulo.variantes.length}`}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#3a3a3d', lineHeight: 1.55 }}>
          {bulo.variantes.map((v, i) => <li key={i} style={{ marginBottom: 2 }}>{v}</li>)}
        </ul>
      </Section>

      {/* PACIENTE CERO · destacado */}
      <Section label="Paciente cero (origen)">
        <div style={{
          padding: '12px 14px',
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FED7AA 100%)',
          border: '1px solid #FCA5A5', borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>
              {bulo.paciente_cero.cuenta}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
              background: COLOR_CANAL[bulo.paciente_cero.canal], color: '#fff',
            }}>{bulo.paciente_cero.canal.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.4, marginBottom: 4 }}>
            {bulo.paciente_cero.perfil}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#86868b', marginTop: 6 }}>
            <span>Primer post · {relTime(bulo.paciente_cero.fecha_primer_post)}</span>
            <span>{bulo.paciente_cero.seguidores.toLocaleString('es-ES')} seguidores</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: '#86868b' }}>
            Origen geográfico · <strong style={{ color: '#1d1d1f' }}>{bulo.paciente_cero.pais_origen}</strong>
          </div>
        </div>
      </Section>

      {/* Tipo de origen + similar */}
      <Field label="Tipo de origen">{bulo.origen_tipo}</Field>
      {bulo.similar_a && <Field label="Similar a">{bulo.similar_a}</Field>}
      {bulo.pais_aparicion_previa && <Field label="Apareció previamente en">{bulo.pais_aparicion_previa}</Field>}

      {/* Top amplificadores */}
      <Section label={`Red de amplificadores · ${bulo.amplificadores.length}`}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {bulo.amplificadores.slice(0, 6).map((a, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', background: '#FAFAFA', borderRadius: 6,
              border: '1px solid #ECECEF',
            }}>
              <span style={{
                width: 4, height: 22, borderRadius: 1,
                background: a.posicion === 'Origen' ? '#DC2626' : a.posicion === 'Amplificador' ? '#F97316' : '#86868b',
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f' }}>{a.nombre}</div>
                <div style={{ fontSize: 9.5, color: '#86868b' }}>
                  {a.canal} · {a.perfil} · {(a.reach_aportado / 1000).toFixed(0)}k reach
                </div>
              </div>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 999, fontWeight: 700,
                background: `${COLOR_CANAL[a.canal]}14`, color: COLOR_CANAL[a.canal],
              }}>{a.posicion.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Canales activos */}
      <Section label="Canales con menciones activas">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {bulo.canales_activos.map(c => (
            <span key={c.canal} style={{
              fontSize: 10.5, padding: '4px 9px', borderRadius: 999,
              background: `${COLOR_CANAL[c.canal]}14`, color: COLOR_CANAL[c.canal],
              fontWeight: 600, border: `1px solid ${COLOR_CANAL[c.canal]}33`,
            }}>
              {c.canal} · {c.menciones.toLocaleString('es-ES')}
            </span>
          ))}
        </div>
      </Section>

      {/* Fact-checkers */}
      <Section label="Fact-checkers que han actuado">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {bulo.factcheckers.map((f, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '4px 0' }}>
              <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{f.nombre}</span>
              <span style={{
                fontSize: 9.5, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                background: f.veredicto === 'FALSO' ? '#FEE2E2' : f.veredicto === 'EN ANÁLISIS' ? '#FEF3C7' : '#E0F2FE',
                color: f.veredicto === 'FALSO' ? '#DC2626' : f.veredicto === 'EN ANÁLISIS' ? '#92400E' : '#0EA5E9',
                letterSpacing: '0.04em',
              }}>{f.veredicto}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Beneficiarios */}
      <Section label="Beneficiarios potenciales">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {bulo.beneficiarios.map(b => (
            <span key={b} style={{
              fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
              background: '#FEF3C7', color: '#92400E', fontWeight: 600,
              border: '1px solid #FCD34D',
            }}>{b}</span>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 3 }}>
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

// ─── Timeline cronológico horizontal ────────────────────────────────────
function TimelineBulo({ bulo }: { bulo: Bulo }) {
  const events = bulo.timeline
  if (events.length === 0) return null
  const t0 = new Date(events[0].t).getTime()
  const tN = new Date(events[events.length - 1].t).getTime()
  const span = tN - t0
  const W = 1200, H = 240, P = 60

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Línea base */}
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="#ECECEF" strokeWidth={2}/>

        {/* Eventos */}
        {events.map((ev, i) => {
          const tEvent = new Date(ev.t).getTime()
          const x = P + ((tEvent - t0) / (span || 1)) * (W - 2 * P)
          const meta = TIPO_EVENTO_META[ev.tipo]
          const above = i % 2 === 0
          const yLabel = above ? H / 2 - 18 : H / 2 + 18
          const yText  = above ? H / 2 - 50 : H / 2 + 50
          const yReach = above ? H / 2 - 32 : H / 2 + 38
          const r = ev.reach ? Math.min(20, 5 + Math.log10(ev.reach + 1) * 1.5) : 6
          return (
            <g key={i}>
              <line x1={x} y1={H / 2} x2={x} y2={yLabel} stroke="#ECECEF" strokeWidth={1}/>
              <circle cx={x} cy={H / 2} r={r} fill={meta.color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5}/>
              <text x={x} y={H / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
                {meta.icon}
              </text>
              <text x={x} y={yReach} textAnchor="middle" fontSize={9} fontWeight={700} fill={meta.color} letterSpacing="0.06em">
                {meta.label}
              </text>
              <text x={x} y={yText} textAnchor="middle" fontSize={9.5} fill="#3a3a3d">
                <tspan x={x} dy={0}>{relTime(ev.t)}</tspan>
                {ev.reach != null && <tspan x={x} dy={11} style={{ fill: '#86868b', fontSize: 9 }}>{(ev.reach / 1000).toFixed(0)}k reach</tspan>}
              </text>
            </g>
          )
        })}
      </svg>
      {/* Lista textual de eventos */}
      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {events.map((ev, i) => {
          const meta = TIPO_EVENTO_META[ev.tipo]
          return (
            <li key={i} style={{
              display: 'flex', gap: 10, padding: '8px 10px',
              background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF',
              borderLeft: `3px solid ${meta.color}`,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1, color: meta.color }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f' }}>
                  {ev.desc}
                </div>
                <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>
                  {ev.canal} · {relTime(ev.t)}{ev.reach != null && ` · ${(ev.reach / 1000).toFixed(0)}k reach`}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Heatmap canales × días ─────────────────────────────────────────────
function CanalesHeatmap({ data }: { data: DataResp['canales_heatmap'] }) {
  const max = Math.max(...data.matrix.flat(), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}/>
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
          {data.canales.map((c, ci) => {
            const row = data.matrix[ci]
            const total = row.reduce((s, n) => s + n, 0)
            const color = COLOR_CANAL[c]
            return (
              <tr key={c}>
                <td style={{ padding: '5px 8px', fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 14, background: color, borderRadius: 2 }}/>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{c}</span>
                  </div>
                </td>
                {row.map((val, idx) => {
                  const intensity = val / max
                  const bg = `color-mix(in srgb, ${color} ${Math.round(intensity * 78 + 8)}%, white)`
                  return (
                    <td key={idx} style={{ padding: 2, textAlign: 'center', verticalAlign: 'middle' }}>
                      <div title={`${c} · ${data.days[idx]} · ${val} menciones`} style={{
                        background: bg,
                        height: 28, borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10.5, fontWeight: 700,
                        color: intensity > 0.55 ? '#fff' : '#3a3a3d',
                      }}>{val}</div>
                    </td>
                  )
                })}
                <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color }}>
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

// ─── Top fuentes ────────────────────────────────────────────────────────
function TopFuentesList({ items }: { items: TopFuente[] }) {
  const max = Math.max(...items.map(i => i.score_riesgo))
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((f, i) => {
        const color = f.score_riesgo >= 85 ? '#7C2D12' : f.score_riesgo >= 75 ? '#DC2626' : '#F59E0B'
        return (
          <li key={i} style={{
            padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF',
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f' }}>{f.fuente}</span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                background: `${color}14`, color, border: `1px solid ${color}33`,
              }}>{f.score_riesgo}</span>
            </div>
            <div style={{ fontSize: 10, color: '#86868b', marginBottom: 4 }}>
              {f.tipo} · {f.n_bulos_origen} originados · {f.n_bulos_amplif} amplificados
            </div>
            <div style={{ height: 4, background: '#ECECEF', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${(f.score_riesgo / max) * 100}%`, height: '100%', background: color }}/>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Fact-checkers strip ────────────────────────────────────────────────
function FactCheckersStrip({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(name => (
        <span key={name} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 999,
          background: '#fff', border: '1px solid #7C3AED33', color: '#7C3AED',
          fontSize: 11.5, fontWeight: 600,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }}/>
          {name}
        </span>
      ))}
    </div>
  )
}
