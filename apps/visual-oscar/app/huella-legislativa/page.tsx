'use client'

/**
 * /huella-legislativa — Huella Legislativa.
 *
 * Pestaña 3 del módulo Legislativo.
 *
 * Para cada iniciativa en tramitación, muestra:
 *   - Actores con presencia identificada (lobbies, instituciones, expertos)
 *   - Comparecientes y audiencias en comisión
 *   - Enmiendas previsibles por grupo parlamentario
 *   - Posicionamiento (favor / contra / matizada / neutral)
 *
 * Sin datos hardcodeados.
 */

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

interface LegislativeInitiative {
  id: string
  ambito: string
  expediente: string
  titulo: string
  kind: string
  materia: string
  promotor: string
  stage: string
  fechaRegistro: string | null
  urlOficial: string | null
}

interface InitiativesResponse {
  items: LegislativeInitiative[]
  stats: { total: number; enTramitacion: number; aprobadas: number; porAmbito: Record<string, number> }
}

interface FootprintActor {
  name: string
  type: 'compareciente' | 'lobby' | 'enmendante' | 'ponente' | 'oposicion' | 'gobierno' | 'experto' | 'institucion'
  organization?: string | null
  rol?: string | null
  posicion?: 'favor' | 'contra' | 'neutral' | 'matizada' | null
  fecha?: string | null
  url?: string | null
  resumen?: string | null
}

interface Footprint {
  initiative: LegislativeInitiative
  actors: FootprintActor[]
  amendments: Array<{ grupo: string; n: number; aceptadas?: number; rechazadas?: number }>
  hearings: Array<{ fecha: string; comision: string; comparecientes: string[]; url?: string }>
  summary: string
}

const ACTOR_TYPE_META: Record<string, { label: string; color: string; glyph: string }> = {
  'lobby':         { label: 'Grupo de interés', color: '#7C3AED', glyph: '◐' },
  'institucion':   { label: 'Institución',      color: '#1F4E8C', glyph: '⬡' },
  'experto':       { label: 'Experto',          color: '#0F766E', glyph: '✦' },
  'gobierno':      { label: 'Gobierno',         color: '#C01818', glyph: '★' },
  'ponente':       { label: 'Ponente',          color: '#5B21B6', glyph: '⊞' },
  'compareciente': { label: 'Compareciente',    color: '#0891B2', glyph: '◉' },
  'enmendante':    { label: 'Enmendante',       color: '#EAB308', glyph: '⌥' },
  'oposicion':     { label: 'Oposición',        color: '#DC2626', glyph: '✗' },
}

const POSICION_META: Record<string, { label: string; color: string }> = {
  'favor':    { label: 'A favor',     color: '#16A34A' },
  'contra':   { label: 'En contra',   color: '#DC2626' },
  'matizada': { label: 'Matizada',    color: '#EAB308' },
  'neutral':  { label: 'Neutral',     color: '#94A3B8' },
}

const GRUPO_COLOR: Record<string, string> = {
  'PP': '#1F4E8C', 'PSOE': '#E1322D', 'VOX': '#5BA02E', 'Sumar': '#D43F8D',
  'ERC': '#E8A030', 'Junts': '#1FA89B', 'EH Bildu': '#3F7A3A', 'PNV': '#7DB94B',
  'CC': '#F2C43A', 'BNG': '#5BB3D9', 'UPN': '#0E7D8C', 'Mixto': '#94A3B8',
}

function HuellaInner() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const sp = useSearchParams()
  const preselected = sp.get('id')

  const [selectedId, setSelectedId] = useState<string | null>(preselected)
  const [q, setQ] = useState('')
  const [fAmbito, setFAmbito] = useState<string>('todos')

  const { data: initData, source, updatedAt, refresh, loading } =
    useApi<InitiativesResponse>('/api/legislativo/initiatives?limit=300', { refreshInterval: 600_000 })

  const initiatives = useMemo(() => (initData?.items || []).filter(it => {
    if (fAmbito !== 'todos' && it.ambito !== fAmbito) return false
    if (q && !(it.titulo.toLowerCase().includes(q.toLowerCase()) || it.expediente.includes(q))) return false
    return true
  }), [initData, q, fAmbito])

  useEffect(() => {
    if (!selectedId && initiatives.length > 0) setSelectedId(initiatives[0].id)
  }, [selectedId, initiatives])

  const { data: footprint, loading: fpLoading } = useApi<Footprint>(
    selectedId ? `/api/legislativo/footprint/${encodeURIComponent(selectedId)}` : '/api/legislativo/footprint/none',
    { refreshInterval: 0 }
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 32px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>HUELLA LEGISLATIVA</span>
                <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={600} onRefresh={refresh}/>
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.022em', margin: '0 0 4px' }}>
                Actores con voz <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#7C3AED' }}>en cada norma.</em>
              </h1>
              <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.45, maxWidth: 780 }}>
                Lobbies, instituciones, expertos y grupos parlamentarios con influencia identificada
                sobre cada iniciativa. España no tiene registro obligatorio de huella normativa, así que
                la información se construye desde el promotor, la materia y los grupos involucrados.
              </p>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
          <aside style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
            padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            maxHeight: 'calc(100vh - 240px)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
              {initiatives.length} INICIATIVAS · selecciona una
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { v: 'todos', l: 'Todas' },
                { v: 'nacional-congreso', l: 'Congreso' },
                { v: 'nacional-senado', l: 'Senado' },
                { v: 'autonomico', l: 'CCAA' },
              ].map(o => (
                <button key={o.v} onClick={() => setFAmbito(o.v)} style={{
                  background: fAmbito === o.v ? '#7C3AED' : '#fff',
                  color: fAmbito === o.v ? '#fff' : '#3a3a3d',
                  border: '1px solid ' + (fAmbito === o.v ? '#7C3AED' : '#ECECEF'),
                  borderRadius: 8, padding: '4px 9px',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{o.l}</button>
              ))}
            </div>
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar título o expediente…"
              style={{
                padding: '7px 10px', fontSize: 11.5, borderRadius: 8,
                border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 10,
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading && initiatives.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Cargando…</div>
              )}
              {initiatives.map(it => {
                const selected = selectedId === it.id
                return (
                  <button key={it.id} onClick={() => setSelectedId(it.id)} style={{
                    textAlign: 'left',
                    background: selected ? 'rgba(124,58,237,0.06)' : 'transparent',
                    border: selected ? '1px solid rgba(124,58,237,0.30)' : '1px solid transparent',
                    borderLeft: `3px solid #7C3AED`,
                    borderRadius: 8, padding: '8px 10px',
                    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                  }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: '#7C3AED', color: '#fff', letterSpacing: '0.04em' }}>{it.kind}</span>
                      <span style={{ fontSize: 9, color: '#6e6e73' }}>{it.expediente}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.3 }}>
                      {it.titulo.slice(0, 100)}{it.titulo.length > 100 ? '…' : ''}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73' }}>{it.materia}</p>
                  </button>
                )
              })}
            </div>
          </aside>

          <section style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
            padding: '20px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {!selectedId ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6e6e73' }}>
                Selecciona una iniciativa para ver su huella legislativa.
              </div>
            ) : fpLoading || !footprint ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Generando huella…</div>
            ) : (
              <FootprintDetail fp={footprint}/>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function FootprintDetail({ fp }: { fp: Footprint }) {
  const init = fp.initiative
  // Agrupa actores por tipo
  const grouped = useMemo(() => {
    const g: Record<string, FootprintActor[]> = {}
    for (const a of fp.actors) {
      if (!g[a.type]) g[a.type] = []
      g[a.type].push(a)
    }
    return g
  }, [fp.actors])

  const totalEnmiendas = fp.amendments.reduce((s, a) => s + a.n, 0)
  const aceptadas = fp.amendments.reduce((s, a) => s + (a.aceptadas || 0), 0)

  return (
    <>
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #ECECEF' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#7C3AED', color: '#fff', letterSpacing: '0.05em' }}>{init.kind}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>{init.expediente}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>· {init.materia}</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '-0.014em', margin: '0 0 6px', lineHeight: 1.3 }}>
          {init.titulo}
        </h2>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
          Promotor: <strong style={{ color: '#1d1d1f' }}>{init.promotor}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          <SummaryBox label="ACTORES TOTAL" value={String(fp.actors.length)} color="#7C3AED"/>
          <SummaryBox label="GRUPOS DE INTERÉS" value={String((grouped.lobby || []).length)} color="#5B21B6"/>
          <SummaryBox label="ENMIENDAS" value={String(totalEnmiendas)} color="#EAB308"/>
          <SummaryBox label="AUDIENCIAS" value={String(fp.hearings.length)} color="#0891B2"/>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(124,58,237,0.05)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.20)' }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#1d1d1f' }}>{fp.summary}</p>
        </div>
      </div>

      {/* Actores por tipo */}
      {Object.entries(grouped).map(([type, actors]) => {
        const meta = ACTOR_TYPE_META[type] || { label: type, color: '#6E6E73', glyph: '·' }
        return (
          <section key={type} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: meta.color, textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{meta.glyph}</span>
              <span>{meta.label.toUpperCase()} · {actors.length}</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 8 }}>
              {actors.map((a, i) => {
                const pos = a.posicion && POSICION_META[a.posicion]
                return (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: '#fafafa', border: `1px solid ${meta.color}33`,
                    borderLeft: `3px solid ${meta.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{a.name}</p>
                      {pos && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${pos.color}15`, color: pos.color, border: `1px solid ${pos.color}40`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          {pos.label}
                        </span>
                      )}
                    </div>
                    {a.organization && <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#6e6e73' }}>{a.organization}</p>}
                    {a.resumen && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#3a3a3d', lineHeight: 1.4 }}>{a.resumen}</p>}
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: meta.color, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                        Fuente ↗
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Enmiendas por grupo */}
      {fp.amendments.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#EAB308', textTransform: 'uppercase', margin: '0 0 8px' }}>
            ENMIENDAS POR GRUPO · ESTIMACIÓN · {aceptadas}/{totalEnmiendas} aceptadas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 8 }}>
            {fp.amendments.map((e, i) => {
              const color = GRUPO_COLOR[e.grupo] || '#6E6E73'
              const acceptPct = e.n > 0 ? Math.round(((e.aceptadas || 0) / e.n) * 100) : 0
              return (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: '#fafafa', border: '1px solid #ECECEF',
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{e.grupo}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>{e.n}</span>
                  </div>
                  <div style={{ height: 4, background: '#F5F5F7', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${acceptPct}%`, height: '100%', background: color }}/>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6e6e73' }}>
                    {e.aceptadas} aceptadas · {e.rechazadas} rechazadas
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Audiencias */}
      {fp.hearings.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#0891B2', textTransform: 'uppercase', margin: '0 0 8px' }}>
            AUDIENCIAS Y COMPARECENCIAS · {fp.hearings.length}
          </p>
          {fp.hearings.map((h, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: '#fafafa', border: '1px solid #ECECEF', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0891B2', fontFamily: 'var(--font-display)' }}>{h.fecha}</span>
                <span style={{ fontSize: 11, color: '#6e6e73' }}>· {h.comision}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {h.comparecientes.map(c => (
                  <span key={c} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(8,145,178,0.10)', color: '#0891B2', border: '1px solid rgba(8,145,178,0.30)' }}>
                    {c}
                  </span>
                ))}
              </div>
              {h.url && <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: '#0891B2', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>Acta / video ↗</a>}
            </div>
          ))}
        </section>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <Link href={`/trazabilidad?id=${encodeURIComponent(init.id)}`} style={{
          background: '#5B21B6', color: '#fff', borderRadius: 8, padding: '8px 14px',
          fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit',
        }}>Ver trazabilidad →</Link>
        {init.urlOficial && (
          <a href={init.urlOficial} target="_blank" rel="noopener noreferrer" style={{
            background: '#fff', color: '#3a3a3d', border: '1px solid #ECECEF',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit',
          }}>Fuente oficial ↗</a>
        )}
      </div>
    </>
  )
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, background: '#FAFAFB', border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function HuellaLegislativaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Cargando…</div>}>
      <HuellaInner/>
    </Suspense>
  )
}
