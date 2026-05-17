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
  { id: 'nacionales',    label: 'Nacionales · Congreso + Senado', glyph: '⊞', color: '#1F4E8C' },
  { id: 'ccaa',          label: 'CCAA',                            glyph: '◉', color: '#0F766E' },
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

  const { data, source, updatedAt, refresh, loading } = useApi<CommissionsResponse>(
    '/api/legislativo/commissions?active=true',
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
              Permanentes, no permanentes, mixtas y de investigación · Congreso + Senado + CCAA
            </p>
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
            ⊞ CONGRESO DE LOS DIPUTADOS · {congreso.length} comisiones
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 12 }}>
            {congreso.map(c => <CommissionCard key={c.id} c={c} variant="activa"/>)}
          </div>
        </section>
      )}
      {senado.length > 0 && (
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '18px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 12px' }}>
            ⊞ SENADO · {senado.length} comisiones
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
  schedule: { hasSession: boolean; message: string; url: string } | null
  groupSummary: Array<{ siglas: string; label: string; color: string; n: number }>
}

function CommissionCard({ c, variant, expand }: { c: Commission; variant: 'activa' | 'historial' | 'investigacion'; expand?: boolean }) {
  const camara = CAMARA_LABEL[c.camara] || { label: c.camara, color: '#6E6E73' }
  const kind = KIND_LABEL[c.kind] || { label: c.kind, color: '#6E6E73' }
  const borderColor = variant === 'investigacion' ? '#DC2626' : camara.color

  const [open, setOpen] = useState(!!expand)
  const [detail, setDetail] = useState<CommissionDetail | null>(null)
  const [loading, setLoading] = useState(false)

  // Solo cargar detalle si es Congreso/mixta (Senado no tiene endpoint AJAX)
  const canFetchDetail = c.camara === 'congreso' || c.camara === 'mixta'

  async function loadDetail() {
    if (detail || loading || !canFetchDetail) return
    setLoading(true)
    try {
      const res = await fetch(`/api/legislativo/commission/${encodeURIComponent(c.id)}`)
      const json = await res.json()
      setDetail(json)
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

      {/* Mini-distribución por grupos (cuando ya cargó) */}
      {detail?.groupSummary && detail.groupSummary.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
            {detail.groupSummary.map(g => {
              const pct = (g.n / detail.composition!.total) * 100
              return <div key={g.siglas} title={`${g.label}: ${g.n}`} style={{ width: `${pct}%`, background: g.color, transition: 'width 200ms' }}/>
            })}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6e6e73' }}>
            {detail.composition!.total} miembros · {detail.groupSummary.length} grupos
          </p>
        </div>
      )}

      {/* Detalle expandido */}
      {open && detail?.composition && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #ECECEF' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: camara.color, textTransform: 'uppercase' }}>
            COMPOSICIÓN · {detail.composition.total} miembros
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
            {detail.composition.members.map(m => {
              const g = detail.groupSummary.find(gs => gs.siglas === m.grupo) || { label: m.grupo, color: '#6E6E73' }
              const isOfficer = m.cargo !== 'Vocal'
              return (
                <div key={m.id || m.nombre} style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '4px 8px', borderRadius: 6,
                  background: isOfficer ? `${g.color}08` : 'transparent',
                  borderLeft: `2px solid ${g.color}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: isOfficer ? 700 : 500, color: '#1d1d1f', flex: 1 }}>
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
          {detail.schedule && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: detail.schedule.hasSession ? 'rgba(22,163,74,0.08)' : 'rgba(148,163,184,0.08)' }}>
              <p style={{ margin: 0, fontSize: 11, color: detail.schedule.hasSession ? '#16A34A' : '#6e6e73' }}>
                <strong>Próxima sesión:</strong> {detail.schedule.message}
              </p>
            </div>
          )}
        </div>
      )}

      {open && !detail && loading && (
        <div style={{ marginTop: 10, padding: '10px 12px', fontSize: 11, color: '#9ca3af', textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #ECECEF' }}>
          Descargando composición real…
        </div>
      )}

      {open && !detail && !loading && !canFetchDetail && (
        <div style={{ marginTop: 10, padding: '8px 10px', fontSize: 10.5, color: '#6e6e73', background: '#fff', borderRadius: 6, border: '1px solid #ECECEF' }}>
          Composición del Senado requiere acceso al detalle XML específico de la comisión.
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {canFetchDetail && (
          <button onClick={toggleOpen} style={{
            fontSize: 11, color: '#fff', background: camara.color,
            border: 'none', fontWeight: 700, fontFamily: 'inherit',
            padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
          }}>{open ? 'Ocultar' : 'Ver composición real'}</button>
        )}
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
