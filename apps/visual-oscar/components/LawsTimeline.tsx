'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import LiveStatusBadge from './LiveStatusBadge'
import type { LawItem, LawsTimelineResponse } from '../app/api/laws/timeline/route'

const ESTADO_META: Record<string, { label: string; color: string; bg: string }> = {
  aprobada:     { label: 'Aprobada',         color: '#15803D', bg: '#F0FDF4' },
  en_tramite:   { label: 'En tramitación',   color: '#CA8A04', bg: '#FEFCE8' },
  proxima_voto: { label: 'Próxima votación', color: '#1F4E8C', bg: '#EFF6FF' },
  vetada:       { label: 'Vetada',           color: '#991B1B', bg: '#FEF2F2' },
}

const CATEGORY_LABEL: Record<string, string> = {
  economia: 'Economía',
  politica_interior: 'Política interior',
  politica_exterior: 'Política exterior',
  seguridad: 'Seguridad',
  justicia: 'Justicia',
  territorial: 'Territorial',
  identidad: 'Identidad',
  sociedad: 'Sociedad',
  tecnologia: 'Tecnología',
  medioambiente: 'Medio ambiente',
  otros: 'Otros',
}

function fmtDate(s: string): string {
  try {
    const d = new Date(s)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  } catch { return s }
}

export default function LawsTimeline() {
  const [filter, setFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, source, updatedAt, refresh } = useApi<LawsTimelineResponse>(
 '/api/laws/timeline?days=21&limit=80',
    { refreshInterval: 600_000 }
  )

  const items = data?.items ?? []
  const stats = data?.stats
  const next_plenos = data?.next_plenos ?? []

  const filtered = useMemo(() => {
    return items.filter(it =>
      (filter === 'all' || it.categoria === filter) &&
      (estadoFilter === 'all' || it.estado === estadoFilter)
    )
  }, [items, filter, estadoFilter])

  const grouped = useMemo(() => {
    const out: Record<string, LawItem[]> = {}
    filtered.forEach(it => {
      const date = it.fecha
      out[date] = out[date] || []
      out[date].push(it)
    })
    return Object.entries(out).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const cats = stats ? Object.keys(stats.by_categoria || {}).sort() : []

  return (
 <section style={{ marginTop: 22 }}>
      {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
 <div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Producción legislativa
 </h2>
 <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {stats ? (
 <><CountUp value={stats.total}/> normas en 21 días · <CountUp value={stats.high_impact}/> de alto impacto · BOE + Congreso</>
            ) : 'Cargando timeline legislativo...'}
 </p>
 </div>
 <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={600} onRefresh={refresh}/>
 </div>

      {/* Top stats strip */}
      {stats && (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          {Object.entries(stats.by_estado).map(([est, n]) => {
            const meta = ESTADO_META[est] || ESTADO_META.aprobada
            return (
 <button
                key={est}
                onClick={() => setEstadoFilter(estadoFilter === est ? 'all' : est)}
                style={{
                  background: estadoFilter === est ? meta.color : meta.bg,
                  color: estadoFilter === est ? '#fff' : meta.color,
                  border: `1px solid ${estadoFilter === est ? meta.color : meta.bg}`,
                  borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', transition: 'all 200ms',
                }}
              >
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.85 }}>{meta.label}</div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>
 <CountUp value={n}/>
 </div>
 </button>
            )
          })}
          {next_plenos.length > 0 && (
 <div style={{ background: '#1d1d1f', color: '#fff', borderRadius: 12, padding: '10px 14px' }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>Próximos plenos</div>
 <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>
                {next_plenos.slice(0, 3).map((p, i) => (
 <div key={i}>
 <span style={{ color: '#5DBC52', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{p.dia_semana} {fmtDate(p.fecha)}</span>
 </div>
                ))}
 </div>
 </div>
          )}
 </div>
      )}

      {/* Category filter pills */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
 <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all', '#1d1d1f', '#fff')}>
          Todas <span style={{ opacity: 0.6, marginLeft: 4 }}>{stats?.total ?? 0}</span>
 </button>
        {cats.map(cat => {
          const active = filter === cat
          const n = stats?.by_categoria[cat] ?? 0
          return (
 <button key={cat} onClick={() => setFilter(cat)} style={pillStyle(active, '#1F4E8C', '#EFF6FF')}>
              {CATEGORY_LABEL[cat] || cat} <span style={{ opacity: 0.6, marginLeft: 4 }}>{n}</span>
 </button>
          )
        })}
 </div>

      {/* Timeline */}
 <div style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {grouped.length > 0 ? grouped.map(([date, list], gi) => (
 <div key={date} style={{ position: 'relative', paddingLeft: 24, paddingBottom: 16,
                                   borderLeft: gi === grouped.length - 1 ? '2px solid transparent' : '2px solid #ECECEF',
                                   marginLeft: 8 }}>
            {/* Date marker */}
 <div style={{ position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: '50%', background: '#1F4E8C', border: '3px solid #fff', boxShadow: '0 0 0 1px #ECECEF' }}/>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#1F4E8C', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
 <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 500 }}>{list.length} normas</span>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map((it, li) => {
                const meta = ESTADO_META[it.estado] || ESTADO_META.aprobada
                const isExp = expanded === it.id
                return (
 <div key={it.id} style={{
                    background: '#FAFAFB', border: `1px solid ${isExp ? meta.color : '#ECECEF'}`, borderRadius: 8,
                    overflow: 'hidden', transition: 'border-color 200ms',
                    animation: 'pol-fade-in 320ms ease-out', animationDelay: `${li * 30}ms`, animationFillMode: 'backwards',
                  }}>
 <button onClick={() => setExpanded(isExp ? null : it.id)} style={{
                      width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                      cursor: 'pointer', padding: '10px 14px', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {/* Impact bar */}
 <div style={{ width: 4, height: 32, borderRadius: 2,
                                    background: it.impact >= 70 ? '#DC2626' : it.impact >= 50 ? '#D97706' : it.impact >= 30 ? '#0EA5E9' : '#9CA3AF',
                                    flexShrink: 0 }}/>

                      {/* Type chip */}
 <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em',
                        background: '#fff', color: 'var(--ink-2)', border: '1px solid #ECECEF', flexShrink: 0,
                      }}>{it.tipo}</span>

                      {/* Estado pill */}
 <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
                        background: meta.bg, color: meta.color, flexShrink: 0,
                      }}>{meta.label.toUpperCase()}</span>

                      {/* Title */}
 <span style={{ flex: 1, fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExp ? 'normal' : 'nowrap', minWidth: 0 }}>
                        {it.titulo}
 </span>

                      {/* Impact score */}
 <span style={{ fontSize: 10.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                        I{it.impact}
 </span>
 <span style={{ color: '#6E6E73', fontSize: 12, transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>▾</span>
 </button>

                    {isExp && (
 <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--hairline)' }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
 <Field label="Categoría" value={CATEGORY_LABEL[it.categoria] || it.categoria}/>
 <Field label="Departamento" value={it.departamento}/>
                          {it.seccion && <Field label="Sección BOE" value={it.seccion}/>}
 <Field label="ID" value={it.id}/>
 </div>
 <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                          {it.url_html && (
 <a href={it.url_html} target="_blank" rel="noopener noreferrer" style={btnLink}>
                              Ver texto BOE →
 </a>
                          )}
                          {it.url && (
 <a href={it.url} target="_blank" rel="noopener noreferrer" style={btnLink}>
                              PDF
 </a>
                          )}
 </div>
 </div>
                    )}
 </div>
                )
              })}
 </div>
 </div>
        )) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} width="100%" height={48} radius={8}/>)}
 </div>
        )}
 </div>
 </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
 <div>
 <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
 <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{value}</div>
 </div>
  )
}

const btnLink: React.CSSProperties = {
  fontSize: 11, padding: '5px 11px', borderRadius: 999,
  background: '#1d1d1f', color: '#fff', textDecoration: 'none',
  fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.02em',
  transition: 'opacity 160ms',
}

function pillStyle(active: boolean, color: string, bg: string): React.CSSProperties {
  return {
    background: active ? color : '#fff',
    color: active ? '#fff' : color,
    border: `1px solid ${active ? color : '#ECECEF'}`,
    borderRadius: 999, padding: '5px 12px', fontSize: 11.5,
    fontFamily: 'inherit', fontWeight: 600,
    cursor: 'pointer', transition: 'all 160ms', letterSpacing: '0.01em',
  }
}
