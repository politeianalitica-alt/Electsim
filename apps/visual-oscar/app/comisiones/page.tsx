'use client'

/**
 * /comisiones — Comisiones parlamentarias.
 *
 * Pestaña 4 del módulo Legislativo (NUEVA).
 *
 * 4 subpestañas:
 *   1. Inicio        — comisiones finalizadas (no de investigación)
 *   2. Nacionales    — comisiones activas Congreso + Senado
 *   3. CCAA          — comisiones autonómicas filtradas por CCAA
 *   4. Investigación — comisiones de investigación con comparecientes y conclusiones
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

interface Commission {
  id: string
  codigo: string
  nombre: string
  nombreCorto?: string
  camara: 'congreso' | 'senado' | 'mixta' | 'autonomico'
  ccaa?: string | null
  kind: 'permanente' | 'no-permanente' | 'investigacion' | 'mixta' | 'subcomision' | 'ponencia'
  active: boolean
  isInvestigation: boolean
  url: string | null
  composicion?: Array<{ grupo: string; n: number; color?: string }>
  proxConvocatoria?: { fecha: string; tema: string; url?: string } | null
  nSesiones?: number
  topMaterias?: string[]
  conclusiones?: string | null
}

interface CommissionsResponse {
  items: Commission[]
  stats: {
    total: number
    porCamara: Record<string, number>
    porKind: Record<string, number>
    investigacion: number
    fetchedAt: string
  }
}

type SubTab = 'inicio' | 'nacionales' | 'ccaa' | 'investigacion'

const SUB_TABS: Array<{ id: SubTab; label: string; glyph: string; color: string }> = [
  { id: 'inicio',        label: 'Inicio · finalizadas',           glyph: '✓', color: '#16A34A' },
  { id: 'nacionales',    label: 'Nacionales · Congreso + Senado', glyph: '', color: '#1F4E8C' },
  { id: 'ccaa',          label: 'CCAA',                            glyph: '', color: '#0F766E' },
  { id: 'investigacion', label: 'Comisiones de Investigación',     glyph: '!', color: '#DC2626' },
]

const CAMARA_LABEL: Record<string, { label: string; color: string }> = {
  'congreso':    { label: 'Congreso',  color: '#1F4E8C' },
  'senado':      { label: 'Senado',    color: '#5B21B6' },
  'mixta':       { label: 'Mixta',     color: '#7C3AED' },
  'autonomico':  { label: 'CCAA',      color: '#0F766E' },
}

const KIND_LABEL: Record<string, { label: string; color: string }> = {
  'permanente':     { label: 'Permanente',     color: '#1F4E8C' },
  'no-permanente':  { label: 'No permanente',  color: '#5B21B6' },
  'investigacion':  { label: 'Investigación',  color: '#DC2626' },
  'mixta':          { label: 'Mixta',          color: '#7C3AED' },
  'subcomision':    { label: 'Subcomisión',    color: '#0891B2' },
  'ponencia':       { label: 'Ponencia',       color: '#0F766E' },
}

export default function ComisionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [subtab, setSubtab] = useState<SubTab>('nacionales')
  const [camara, setCamara] = useState<'todos' | 'congreso' | 'senado'>('todos')
  const [ccaa, setCcaa] = useState<string>('todas')
  const [q, setQ] = useState('')
  const [legislatura, setLegislatura] = useState<'XV' | 'XIV' | 'XIII' | 'XII' | 'XI' | 'X' | 'IX'>('XV')

  // Para XV: endpoint principal con todos los ámbitos
  // Para histórica: endpoint específico con solo Congreso de esa legislatura
  const apiUrl = legislatura === 'XV'
    ? '/api/legislativo/commissions?active=true'
    : `/api/legislativo/commissions-historical?legislatura=${legislatura}`

  const { data, source, updatedAt, refresh, loading } = useApi<CommissionsResponse>(
    apiUrl,
    { refreshInterval: 1_200_000 }
  )

  const all = data?.items || []
  const stats = data?.stats

  const filtered = useMemo(() => {
    let items = all
    if (subtab === 'inicio') {
      items = items.filter(c => !c.isInvestigation)
        .filter(c => c.kind === 'permanente' || c.kind === 'no-permanente' || c.kind === 'mixta')
    } else if (subtab === 'nacionales') {
      items = items.filter(c => c.camara === 'congreso' || c.camara === 'senado' || c.camara === 'mixta')
        .filter(c => !c.isInvestigation)
      if (camara !== 'todos') items = items.filter(c => c.camara === camara || (camara === 'congreso' && c.camara === 'mixta'))
    } else if (subtab === 'ccaa') {
      items = items.filter(c => c.camara === 'autonomico')
      if (ccaa !== 'todas') items = items.filter(c => c.ccaa === ccaa)
    } else if (subtab === 'investigacion') {
      items = items.filter(c => c.isInvestigation)
    }
    if (q) items = items.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.codigo.includes(q))
    return items
  }, [all, subtab, camara, ccaa, q])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 32px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>COMISIONES PARLAMENTARIAS</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={1200} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {stats?.total ?? '…'} comisiones <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#1F4E8C' }}>activas.</em>
            </h1>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.45 }}>
              Permanentes, no permanentes, mixtas y de investigación · Congreso + Senado + 16 CCAA
            </p>
            {/* Selector de legislatura */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase' }}>Legislatura:</span>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {(['XV', 'XIV', 'XIII', 'XII', 'XI', 'X', 'IX'] as const).map(L => {
                  const active = legislatura === L
                  return (
                    <button key={L} onClick={() => setLegislatura(L)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? (L === 'XV' ? '#16A34A' : '#5B21B6') : '#6e6e73',
                      border: 'none', borderRadius: 999, padding: '4px 10px',
                      fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                      fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}>{L}{L === 'XV' && ' · Actual'}</button>
                  )
                })}
              </div>
              {legislatura !== 'XV' && (
                <span style={{ fontSize: 10.5, color: '#7C3AED', fontWeight: 600 }}>
                  ⚠ Solo Congreso (histórico)
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <KPI label="CONGRESO"  value={String(stats?.porCamara['congreso'] ?? 0)} color="#1F4E8C"/>
            <KPI label="SENADO"    value={String(stats?.porCamara['senado']   ?? 0)} color="#5B21B6"/>
            <KPI label="INVESTIG." value={String(stats?.investigacion        ?? 0)} color="#DC2626"/>
          </div>
        </section>

        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECEF', marginBottom: 16, overflowX: 'auto' }}>
          {SUB_TABS.map(t => {
            const active = subtab === t.id
            return (
              <button key={t.id} onClick={() => setSubtab(t.id)} style={{
                background: 'transparent',
                color: active ? t.color : '#6e6e73',
                border: 0,
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: -1,
              }}>
                <span style={{ fontSize: 14, color: active ? t.color : '#9ca3af' }}>{t.glyph}</span>
                {t.label}
              </button>
            )
          })}
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          {subtab === 'nacionales' && (
            <Chips label="Cámara" value={camara} onChange={v => setCamara(v as typeof camara)} options={[
              { v: 'todos', l: 'Ambas' },
              { v: 'congreso', l: 'Congreso' },
              { v: 'senado', l: 'Senado' },
            ]}/>
          )}
          {subtab === 'ccaa' && (
            <select value={ccaa} onChange={e => setCcaa(e.target.value)} style={{
              padding: '6px 28px 6px 10px', fontSize: 12, borderRadius: 8,
              border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
            }}>
              <option value="todas">Todas las CCAA</option>
              {['andalucia','aragon','asturias','baleares','canarias','cantabria','castilla-leon','castilla-mancha','cataluna','extremadura','galicia','madrid','murcia','navarra','pais-vasco','rioja','valenciana'].map(c => (
                <option key={c} value={c}>{c.replace('-', ' ')}</option>
              ))}
            </select>
          )}
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar comisión…"
            style={{
              flex: 1, minWidth: 240,
              padding: '7px 12px', fontSize: 12.5, borderRadius: 8,
              border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 11.5, color: '#6e6e73', marginLeft: 'auto' }}>{filtered.length} resultados</span>
        </div>

        {loading && all.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
            Cargando comisiones del Congreso y Senado…
          </div>
        ) : subtab === 'inicio' ? (
          <InicioView commissions={filtered}/>
        ) : subtab === 'investigacion' ? (
          <InvestigacionView commissions={filtered}/>
        ) : subtab === 'ccaa' ? (
          <CCAAView commissions={filtered}/>
        ) : (
          <NacionalesView commissions={filtered}/>
        )}
      </main>
    </div>
  )
}

function InicioView({ commissions }: { commissions: Commission[] }) {
  if (commissions.length === 0) return <EmptyState text="No hay comisiones permanentes registradas."/>
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 28px' }}>
      <p style={{ fontSize: 12, color: '#6e6e73', marginBottom: 14, lineHeight: 1.5 }}>
        Comisiones permanentes con actividad consolidada en la legislatura XV.
        Información de composición, temas tratados, comparecientes y conclusiones cuando estén disponibles.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
        {commissions.map(c => <CommissionCard key={c.id} c={c} variant="historial"/>)}
      </div>
    </div>
  )
}

function NacionalesView({ commissions }: { commissions: Commission[] }) {
  const congreso = commissions.filter(c => c.camara === 'congreso' || c.camara === 'mixta')
  const senado = commissions.filter(c => c.camara === 'senado')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {congreso.length > 0 && (
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#1F4E8C', textTransform: 'uppercase', margin: '0 0 12px' }}>
            CONGRESO DE LOS DIPUTADOS · {congreso.length} comisiones
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
            {congreso.map(c => <CommissionCard key={c.id} c={c} variant="activa"/>)}
          </div>
        </section>
      )}
      {senado.length > 0 && (
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 12px' }}>
            SENADO · {senado.length} comisiones
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
            {senado.map(c => <CommissionCard key={c.id} c={c} variant="activa"/>)}
          </div>
        </section>
      )}
      {commissions.length === 0 && <EmptyState text="Sin comisiones para los filtros actuales."/>}
    </div>
  )
}

function CCAAView({ commissions }: { commissions: Commission[] }) {
  if (commissions.length === 0) {
    return <EmptyState text="Comisiones autonómicas: las APIs de los parlamentos autonómicos no exponen el listado de comisiones de forma estructurada. Trabajamos en scraping HTML por CCAA. Mientras tanto, consulta las web de cada parlamento autonómico."/>
  }
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
        {commissions.map(c => <CommissionCard key={c.id} c={c} variant="activa"/>)}
      </div>
    </div>
  )
}

function InvestigacionView({ commissions }: { commissions: Commission[] }) {
  if (commissions.length === 0) return <EmptyState text="Sin comisiones de investigación activas."/>
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 28px' }}>
      <p style={{ fontSize: 12, color: '#6e6e73', marginBottom: 16, lineHeight: 1.5, padding: '10px 14px', background: 'rgba(220,38,38,0.05)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.20)' }}>
        Las comisiones de investigación son uno de los instrumentos más potentes del análisis político.
        Aquí se agrupan comparecientes, declaraciones clave y conclusiones según se vayan publicando.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {commissions.map(c => <CommissionCard key={c.id} c={c} variant="investigacion" expand/>)}
      </div>
    </div>
  )
}

interface CommissionDetail {
  commission: Commission
  composition: {
    codigo: string
    fechaConstitucion: string | null
    fechaDisolucion: string | null
    members: Array<{ id: number; nombre: string; cargo: string; grupo: string; fechaAlta: string; fechaBaja: string; urlFicha: string }>
    byGroup: Record<string, number>
    total: number
    active: boolean
  } | null
  groupSummary: Array<{ siglas: string; label: string; color: string; n: number }>
  scheduledSessions: Array<{
    numSesion: number
    fechaSesion: string
    fechaFormateada: string
    descOrgano: string
  }>
  comparecientes: Array<{
    nombre: string
    cargo: string
    intervenciones: number
    ultimaSesion: string | null
    sesiones: string[]
  }>
  recentSessions: Array<{
    fecha: string
    totalIntervenciones: number
    comparecientes: Array<{ nombre: string; cargo: string; intervenciones: number; videoUrl?: string; actaPdfUrl?: string }>
    iniciativas: string[]
  }>
  sessionsCount: number
}

function CommissionCard({ c, variant, expand }: { c: Commission; variant: 'activa' | 'historial' | 'investigacion'; expand?: boolean }) {
  const camara = CAMARA_LABEL[c.camara] || { label: c.camara, color: '#6E6E73' }
  const kind = KIND_LABEL[c.kind] || { label: c.kind, color: '#6E6E73' }
  const borderColor = variant === 'investigacion' ? '#DC2626' : camara.color

  const [open, setOpen] = useState(!!expand)
  const [detail, setDetail] = useState<CommissionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState<'composicion' | 'comparecientes' | 'sesiones' | 'agenda'>('composicion')

  // Detectar si es comisión histórica (id formato cgr-XIV-301)
  const isHistorical = /^cgr-(IX|X|XI|XII|XIII|XIV)-\d+$/.test(c.id)

  async function loadDetail() {
    if (detail || loading) return
    setLoading(true)
    try {
      const endpoint = isHistorical
        ? `/api/legislativo/commission-historical/${encodeURIComponent(c.id)}`
        : `/api/legislativo/commission/${encodeURIComponent(c.id)}`
      const res = await fetch(endpoint)
      const json = await res.json()
      // Adaptar shape histórico → shape estándar (sin comparecientes/sesiones)
      if (isHistorical) {
        setDetail({
          commission: c,
          composition: json.composition,
          groupSummary: json.groupSummary || [],
          scheduledSessions: [],
          comparecientes: [],
          recentSessions: [],
          sessionsCount: 0,
        })
      } else {
        setDetail(json)
      }
    } catch {/* noop */}
    finally { setLoading(false) }
  }

  function toggleOpen() {
    const will = !open
    setOpen(will)
    if (will) loadDetail()
  }

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: '#fafafa', border: '1px solid #ECECEF',
      borderLeft: `3px solid ${borderColor}`,
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: camara.color, color: '#fff', letterSpacing: '0.05em' }}>{camara.label.toUpperCase()}</span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${kind.color}15`, color: kind.color, border: `1px solid ${kind.color}40`, letterSpacing: '0.04em' }}>{kind.label}</span>
        <span style={{ fontSize: 10, color: '#6e6e73', marginLeft: 'auto' }}>cód. {c.codigo}</span>
      </div>
      <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, letterSpacing: '-0.008em' }}>
        {c.nombre}
      </h3>
      {c.nombreCorto && <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73', fontStyle: 'italic' }}>{c.nombreCorto}</p>}

      {/* Mini-distribución por grupos */}
      {detail?.groupSummary && detail.groupSummary.length > 0 && detail.composition && detail.composition.total > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
            {detail.groupSummary.map(g => {
              const pct = (g.n / detail.composition!.total) * 100
              return <div key={g.siglas} title={`${g.label}: ${g.n}`} style={{ width: `${pct}%`, background: g.color, transition: 'width 200ms' }}/>
            })}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6e6e73' }}>
            {detail.composition.total} miembros · {detail.groupSummary.length} grupos
            {detail.sessionsCount > 0 && ` · ${detail.sessionsCount} sesiones registradas`}
          </p>
        </div>
      )}

      {/* Detalle expandido con tabs internos */}
      {open && detail && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #ECECEF' }}>
          {/* Tabs internos */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #ECECEF', overflowX: 'auto' }}>
            {([
              ['composicion', 'Composición', detail.composition?.total || 0],
              ['comparecientes', 'Comparecientes', detail.comparecientes.length],
              ['sesiones', 'Sesiones', detail.recentSessions.length],
              ['agenda', 'Agenda', detail.scheduledSessions.length],
            ] as const).map(([id, label, count]) => {
              const isActive = section === id
              return (
                <button key={id} onClick={() => setSection(id)} style={{
                  padding: '5px 10px', fontSize: 10.5, fontWeight: isActive ? 700 : 500,
                  background: 'transparent', border: 'none',
                  color: isActive ? camara.color : '#6e6e73',
                  borderBottom: isActive ? `2px solid ${camara.color}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>{label} {count > 0 && <span style={{ opacity: 0.6 }}>· {count}</span>}</button>
              )
            })}
          </div>

          {/* Sección: Composición */}
          {section === 'composicion' && (
            detail.composition && detail.composition.members.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' }}>
                  {detail.composition.members.map(m => {
                    const g = detail.groupSummary.find(gs => gs.siglas === m.grupo) || { label: m.grupo || '—', color: '#6E6E73' }
                    const isOfficer = m.cargo && m.cargo !== 'Vocal'
                    return (
                      <div key={m.id || m.nombre} style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        padding: '4px 8px', borderRadius: 6,
                        background: isOfficer ? `${g.color}08` : 'transparent',
                        borderLeft: `2px solid ${g.color}`,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: isOfficer ? 700 : 500, color: '#1d1d1f', flex: 1, lineHeight: 1.3 }}>
                          {m.nombre}
                        </span>
                        {isOfficer && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: g.color, padding: '1px 6px', borderRadius: 3, background: `${g.color}15`, letterSpacing: '0.04em' }}>
                            {m.cargo.toUpperCase()}
                          </span>
                        )}
                        <span style={{ fontSize: 9, color: g.color, fontWeight: 600 }}>{g.label}</span>
                      </div>
                    )
                  })}
                </div>
                {detail.composition.fechaConstitucion && (
                  <p style={{ margin: '8px 0 0', fontSize: 10, color: '#6e6e73' }}>
                    Constituida el {detail.composition.fechaConstitucion}
                  </p>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', padding: 10, textAlign: 'center' }}>
                Sin composición disponible en el endpoint oficial.
              </p>
            )
          )}

          {/* Sección: Comparecientes */}
          {section === 'comparecientes' && (
            detail.comparecientes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {detail.comparecientes.slice(0, 30).map(co => (
                  <div key={co.nombre} style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.20)',
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', flex: 1 }}>{co.nombre}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#7C3AED', padding: '1px 6px', borderRadius: 3, background: 'rgba(124,58,237,0.10)' }}>
                        {co.intervenciones} intervenc.
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73', lineHeight: 1.4 }}>
                      {co.cargo}
                      {co.ultimaSesion && <> · última: {co.ultimaSesion}</>}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', padding: 10, textAlign: 'center', lineHeight: 1.5 }}>
                Sin comparecientes externos registrados aún en el dataset de intervenciones del Congreso.
                {c.camara === 'senado' && ' (El Senado no expone dataset equivalente.)'}
              </p>
            )
          )}

          {/* Sección: Sesiones pasadas */}
          {section === 'sesiones' && (
            detail.recentSessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {detail.recentSessions.slice(0, 15).map(s => (
                  <div key={s.fecha} style={{
                    padding: '8px 10px', borderRadius: 6,
                    background: '#FAFAFB', border: '1px solid #ECECEF',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: camara.color, fontFamily: 'var(--font-display)' }}>
                        {s.fecha}
                      </span>
                      <span style={{ fontSize: 10, color: '#6e6e73' }}>· {s.totalIntervenciones} intervenciones</span>
                    </div>
                    {s.comparecientes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                        {s.comparecientes.slice(0, 6).map(co => (
                          <span key={co.nombre} title={co.cargo} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 3, background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                            {co.nombre}
                          </span>
                        ))}
                        {s.comparecientes.length > 6 && (
                          <span style={{ fontSize: 9.5, color: '#6e6e73' }}>+{s.comparecientes.length - 6} más</span>
                        )}
                      </div>
                    )}
                    {s.iniciativas.length > 0 && (
                      <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', lineHeight: 1.4 }}>
                        {s.iniciativas[0].slice(0, 120)}{s.iniciativas[0].length > 120 ? '…' : ''}
                      </p>
                    )}
                    {s.comparecientes.some(co => co.videoUrl) && (
                      <a href={s.comparecientes.find(co => co.videoUrl)?.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: camara.color, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                        Vídeo sesión ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', padding: 10, textAlign: 'center' }}>
                Sin sesiones registradas en el dataset.
              </p>
            )
          )}

          {/* Sección: Agenda futura */}
          {section === 'agenda' && (
            detail.scheduledSessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detail.scheduledSessions.map((s, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', borderRadius: 6,
                    background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.20)',
                  }}>
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#16A34A' }}>
                      Sesión #{s.numSesion}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#3a3a3d' }}>
                      {s.fechaFormateada}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', padding: 10, textAlign: 'center' }}>
                Sin sesiones convocadas actualmente.
              </p>
            )
          )}
        </div>
      )}

      {open && !detail && loading && (
        <div style={{ marginTop: 10, padding: '10px 12px', fontSize: 11, color: '#9ca3af', textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #ECECEF' }}>
          Descargando composición + comparecientes + sesiones (puede tardar 5-15s la primera vez)…
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={toggleOpen} style={{
          fontSize: 11, color: '#fff', background: camara.color,
          border: 'none', fontWeight: 700, fontFamily: 'inherit',
          padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
        }}>{open ? 'Ocultar detalle' : 'Ver detalle completo'}</button>
        {c.url && (
          <a href={c.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: camara.color, textDecoration: 'none', fontWeight: 600,
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${camara.color}40`, background: `${camara.color}08`,
          }}>Ficha oficial ↗</a>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 12px', borderRadius: 10, background: '#FAFAFB', border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Chips({ label, options, value, onChange }: { label: string; options: Array<{ v: string; l: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#6e6e73', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
        {options.map(o => {
          const active = value === o.v
          return (
            <button key={o.v} onClick={() => onChange(o.v)} style={{
              background: active ? '#fff' : 'transparent',
              color: active ? '#1F4E8C' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '4px 11px',
              fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{o.l}</button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6e6e73', fontSize: 13, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', lineHeight: 1.5 }}>
      {text}
    </div>
  )
}
