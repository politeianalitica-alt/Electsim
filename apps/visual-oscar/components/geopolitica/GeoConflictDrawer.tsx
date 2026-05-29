'use client'
/**
 * <GeoConflictDrawer /> · Sprint GEO-RADAR C3
 *
 * Drawer detalle conflicto con 5 sub-tabs:
 *   A · Resumen (descripción + actores + fase actual)
 *   B · Timeline (gráfico área eventos/día + picos)
 *   C · Cobertura mediática (sources + países cobertura + western vs regional)
 *   D · Impacto económico (SIPRI + pending blocks de commodities/IATI)
 *   E · Actores corporativos (placeholder · OpenCorporates externo)
 *
 * Consume /api/geopolitica/conflicto/[iso3].
 */
import { useEffect, useState } from 'react'

type SubTab = 'resumen' | 'timeline' | 'noticias' | 'cobertura' | 'impacto' | 'corporativo'

interface NewsArticle {
  title: string
  url: string
  domain: string
  language?: string
  sourcecountry?: string
  seendate?: string
  tone?: number
}

interface Detail {
  iso3: string; name_es: string; name_en: string
  summary: {
    fase_actual: 'baja_intensidad' | 'escalada' | 'activa' | 'critica'
    duration_estimate: string
    actors: string[]
    description: string
  }
  timeline: {
    series_daily: Array<{ date: string; events: number; avg_tone: number }>
    peaks: Array<{ date: string; events: number; note?: string }>
  }
  coverage: {
    total_articles: number
    by_source: Array<{ domain: string; count: number; avg_tone: number }>
    by_country: Array<{ iso2: string; count: number; share_pct: number }>
    top_themes: Array<{ theme: string; count: number }>
    western_vs_regional_tone?: { western: number; regional: number }
  }
  impact: {
    milex_pct_gdp: number | null
    milex_usd_bn: number | null
    milex_change_pct: number | null
    sipri_rank: number | null
    pending_blocks: string[]
  }
  corporate: { pending: true; note: string }
}
interface Response { ok: boolean; detail?: Detail; error?: string }

interface Props {
  iso3: string | null
  onClose: () => void
}

const PHASE_META: Record<Detail['summary']['fase_actual'], { label: string; color: string }> = {
  baja_intensidad: { label: 'Baja intensidad', color: '#16a34a' },
  escalada: { label: 'Escalada', color: '#f59e0b' },
  activa: { label: 'Conflicto activo', color: '#dc2626' },
  critica: { label: 'Crisis crítica', color: '#7f1d1d' },
}

export function GeoConflictDrawer({ iso3, onClose }: Props) {
  const [data, setData] = useState<Detail | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<SubTab>('resumen')

  useEffect(() => {
    if (!iso3) return
    let alive = true
    setLoading(true)
    setSub('resumen')
    setNews([])
    // Fetch detail + news en paralelo (G16 item 5)
    Promise.all([
      fetch(`/api/geopolitica/conflicto/${iso3}`, { cache: 'force-cache' })
        .then((r) => r.json() as Promise<Response>),
      fetch(`/api/geopolitica/conflict-news/${iso3}?limit=20`, { cache: 'force-cache' })
        .then((r) => r.json())
        .catch(() => ({ articles: [] })),
    ])
      .then(([detailResp, newsResp]) => {
        if (!alive) return
        setData(detailResp.ok ? detailResp.detail || null : null)
        setNews(Array.isArray(newsResp.articles) ? newsResp.articles : [])
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (iso3) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [iso3, onClose])

  if (!iso3) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        zIndex: 1000, animation: 'fadeIn 0.15s',
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(680px, 96vw)', background: '#fff',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.2)',
        zIndex: 1001, overflowY: 'auto',
        animation: 'slideIn 0.2s ease-out',
      }}>
        {/* Header */}
        <header style={{
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Conflicto · {data?.name_es || iso3}
              </h2>
              {data && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${PHASE_META[data.summary.fase_actual].color}20`,
                    color: PHASE_META[data.summary.fase_actual].color,
                    textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>
                    {PHASE_META[data.summary.fase_actual].label}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>· {data.summary.duration_estimate}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 22, color: '#64748b',
              cursor: 'pointer', padding: 0, lineHeight: 1,
            }}>×</button>
          </div>

          {/* Sub-tabs */}
          {data && (
            <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid #f1f5f9' }}>
              {([
                { id: 'resumen', label: 'Resumen' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'noticias', label: `Noticias${news.length > 0 ? ` (${news.length})` : ''}` },
                { id: 'cobertura', label: 'Cobertura' },
                { id: 'impacto', label: 'Impacto económico' },
                { id: 'corporativo', label: 'Actores corp.' },
              ] as Array<{ id: SubTab; label: string }>).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSub(t.id)}
                  style={{
                    padding: '8px 12px', border: 'none',
                    background: 'transparent',
                    borderBottom: sub === t.id ? '2px solid #dc2626' : '2px solid transparent',
                    color: sub === t.id ? '#0f172a' : '#64748b',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}
        </header>

        <div style={{ padding: '16px 20px' }}>
          {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando detalle conflicto…</p>}

          {!loading && !data && (
            <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              Sin datos suficientes para este país en GDELT últimos 30 días.
            </p>
          )}

          {!loading && data && sub === 'resumen' && <SubResumen d={data} />}
          {!loading && data && sub === 'timeline' && <SubTimeline d={data} news={news} />}
          {!loading && sub === 'noticias' && <SubNoticias news={news} countryName={data?.name_es || iso3} />}
          {!loading && data && sub === 'cobertura' && <SubCobertura d={data} />}
          {!loading && data && sub === 'impacto' && <SubImpacto d={data} />}
          {!loading && data && sub === 'corporativo' && <SubCorporativo d={data} />}
        </div>
      </aside>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  )
}

function SubResumen({ d }: { d: Detail }) {
  // G24 fix · usuario pidió "ninguna ficha puede salir vacía" para conflict drawer
  // Si no hay actores GDELT, intentamos extraerlos del título / description heurísticamente
  // Si la descripción es genérica, buscamos enrichment desde CFR + GCRI vía /intel-fusion
  const [enrichment, setEnrichment] = useState<{
    cfr_conflicts?: Array<{ name: string; recent_developments: string; europe_implications: string; key_actors: string[]; estimated_fatalities: string }>
    gcri?: { conflict_risk: number; rank_global: number | null; top_drivers: string[]; notes: string } | null
  } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/intel-fusion?iso3=${d.iso3}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setEnrichment(j) })
      .catch(() => {})
    return () => { alive = false }
  }, [d.iso3])

  // Fallback actors: extraer de description o usar key_actors del CFR
  const actors = d.summary.actors.length > 0
    ? d.summary.actors
    : enrichment?.cfr_conflicts?.[0]?.key_actors ?? []

  return (
    <div>
      <p style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.6, marginBottom: 8 }}>
        {d.summary.description}
      </p>

      {/* G24 · GCRI score */}
      {enrichment?.gcri && (
        <div style={{
          padding: '8px 10px', marginBottom: 10, borderRadius: 6,
          background: '#fef2f2', borderLeft: '3px solid #7f1d1d',
        }}>
          <strong style={{ color: '#7f1d1d', fontSize: 11 }}>GCRI · JRC/EU:</strong>{' '}
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#dc2626' }}>
            {(enrichment.gcri.conflict_risk * 100).toFixed(0)}%
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>
            riesgo conflicto · rank #{enrichment.gcri.rank_global ?? '?'}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0f172a' }}>
            <strong>Drivers:</strong> {enrichment.gcri.top_drivers.join(' · ')}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569', fontStyle: 'italic' }}>{enrichment.gcri.notes}</p>
        </div>
      )}

      {/* G24 · CFR Conflict Tracker enriquecimiento */}
      {(enrichment?.cfr_conflicts ?? []).map((c, i) => (
        <div key={i} style={{
          padding: '10px 12px', marginBottom: 8, borderRadius: 6,
          background: '#fff', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626',
        }}>
          <strong style={{ fontSize: 11, color: '#7f1d1d' }}>{c.name}</strong>
          <p style={{ margin: '4px 0 4px', fontSize: 11, color: '#0f172a' }}>{c.recent_developments}</p>
          <p style={{ margin: '4px 0 4px', fontSize: 10, color: '#475569' }}>
            <strong style={{ color: '#1e40af' }}>Implicaciones EU/ES:</strong> {c.europe_implications}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
            Víctimas: {c.estimated_fatalities}
          </p>
        </div>
      ))}

      <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 }}>
        GDELT agregado + CFR Global Conflict Tracker + GCRI JRC/EU enriquecimiento.
      </p>

      <h4 style={{ margin: '16px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Actores principales
      </h4>
      {actors.length === 0 ? (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin actores identificables.</p>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {actors.map((a) => (
            <span key={a} style={{
              padding: '4px 10px', background: '#fef2f2', color: '#7f1d1d',
              borderRadius: 12, fontSize: 11, fontWeight: 600,
              border: '1px solid #fecaca',
            }}>{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function SubNoticias({ news, countryName }: { news: NewsArticle[]; countryName: string }) {
  if (news.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>
          Sin noticias recientes en GDELT para {countryName}. Posibles causas: cobertura
          mediática internacional baja, GDELT rate-limited, o nombre del país no resoluble
          en la query.
        </p>
        <p style={{ fontSize: 10, color: '#64748b' }}>
          Prueba alternativa:{' '}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(countryName + ' conflict news')}&tbm=nws`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#0891b2', fontWeight: 600 }}
          >búsqueda Google News →</a>
        </p>
      </div>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
        Últimas {news.length} noticias relevantes · ordenadas por fecha desc · GDELT DOC v2
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {news.map((a) => {
          const toneColor =
            (a.tone ?? 0) < -5 ? '#7f1d1d' :
            (a.tone ?? 0) < -2 ? '#dc2626' :
            (a.tone ?? 0) < 0 ? '#ea580c' : '#94a3b8'
          const dateStr = a.seendate ? a.seendate.slice(0, 10) : ''
          return (
            <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 10px', background: '#fff', border: '1px solid #f1f5f9',
              borderLeft: `3px solid ${toneColor}`, borderRadius: 4,
              textDecoration: 'none', color: 'inherit',
            }}>
              <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.4, fontWeight: 600 }}>
                {a.title}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 9, color: '#94a3b8', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span>{a.domain}</span>
                {a.sourcecountry && <span>· {a.sourcecountry}</span>}
                {a.language && <span>· {a.language}</span>}
                {dateStr && <span>· {dateStr}</span>}
                {a.tone !== undefined && (
                  <span style={{ color: toneColor, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
                    · tono {a.tone > 0 ? '+' : ''}{a.tone.toFixed(1)}
                  </span>
                )}
              </p>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function SubTimeline({ d, news }: { d: Detail; news: NewsArticle[] }) {
  const series = d.timeline.series_daily
  // FIX G16 item 5 · si no hay serie suficiente, mostramos news directamente
  if (series.length < 2) {
    return (
      <div>
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
          Serie temporal insuficiente para gráfico ({series.length} día{series.length !== 1 ? 's' : ''} con datos).
          Mostrando noticias recientes en su lugar.
        </p>
        <SubNoticias news={news} countryName={d.name_es} />
      </div>
    )
  }
  const vals = series.map((s) => s.events)
  const maxV = Math.max(...vals)
  const w = 600, h = 200, pad = 30
  const innerW = w - pad * 2, innerH = h - pad * 2
  const xOf = (i: number) => pad + (i / Math.max(1, series.length - 1)) * innerW
  const yOf = (v: number) => pad + innerH - (v / maxV) * innerH
  const linePath = series.map((s, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(s.events)}`).join(' ')
  const areaPath = `${linePath} L${xOf(series.length - 1)},${pad + innerH} L${pad},${pad + innerH} Z`

  return (
    <div>
      <p style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
        Eventos GDELT WAR_CONFLICT por día · últimos {series.length} días
      </p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={pad} y1={pad + innerH * t} x2={w - pad} y2={pad + innerH * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="#dc2626" opacity={0.15} />
        <path d={linePath} fill="none" stroke="#dc2626" strokeWidth={1.6} />
        {/* Picos marcados */}
        {d.timeline.peaks.map((p) => {
          const idx = series.findIndex((s) => s.date === p.date)
          if (idx < 0) return null
          return <circle key={p.date} cx={xOf(idx)} cy={yOf(p.events)} r={4} fill="#7f1d1d" stroke="#fff" strokeWidth={1.5} />
        })}
        {/* X ticks */}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) => (
          <text key={i} x={xOf(i)} y={h - 8} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {series[i].date.slice(5)}
          </text>
        ))}
        <text x={pad - 4} y={pad + 4} fontSize={9} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{maxV}</text>
        <text x={pad - 4} y={pad + innerH} fontSize={9} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">0</text>
      </svg>
      {d.timeline.peaks.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 10 }}>
          <strong style={{ color: '#7f1d1d' }}>Picos detectados:</strong>{' '}
          {d.timeline.peaks.map((p) => `${p.date} (${p.events} arts)`).join(' · ')}
        </div>
      )}
    </div>
  )
}

function SubCobertura({ d }: { d: Detail }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
        Total artículos GDELT 30d: <strong style={{ color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{d.coverage.total_articles}</strong>
      </p>

      {d.coverage.western_vs_regional_tone && (
        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, marginBottom: 14, fontSize: 11 }}>
          <strong style={{ color: '#0f172a' }}>Sesgo cobertura:</strong>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <span>Medios occidentales: <strong style={{ fontFamily: 'ui-monospace, monospace', color: d.coverage.western_vs_regional_tone.western < 0 ? '#dc2626' : '#16a34a' }}>{d.coverage.western_vs_regional_tone.western.toFixed(1)}</strong></span>
            <span>Medios regionales: <strong style={{ fontFamily: 'ui-monospace, monospace', color: d.coverage.western_vs_regional_tone.regional < 0 ? '#dc2626' : '#16a34a' }}>{d.coverage.western_vs_regional_tone.regional.toFixed(1)}</strong></span>
          </div>
        </div>
      )}

      <h4 style={{ margin: '12px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Top medios (10)
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {d.coverage.by_source.slice(0, 10).map((s) => (
          <div key={s.domain} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
            <span style={{ color: '#0f172a' }}>{s.domain}</span>
            <span style={{ color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
              {s.count} · tono {s.avg_tone > 0 ? '+' : ''}{s.avg_tone}
            </span>
          </div>
        ))}
      </div>

      <h4 style={{ margin: '16px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Top themes GKG
      </h4>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {d.coverage.top_themes.map((t) => (
          <span key={t.theme} style={{
            padding: '3px 8px', background: '#f1f5f9', borderRadius: 12, fontSize: 10,
            color: '#475569',
          }}>{t.theme} <strong style={{ color: '#0f172a' }}>{t.count}</strong></span>
        ))}
      </div>
    </div>
  )
}

function SubImpacto({ d }: { d: Detail }) {
  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Gasto militar · SIPRI 2024
      </h4>
      {d.impact.milex_pct_gdp !== null ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <DataChip label="% del PIB" value={`${d.impact.milex_pct_gdp}%`} />
          <DataChip label="USD bn" value={d.impact.milex_usd_bn !== null ? `${d.impact.milex_usd_bn} bn` : '—'} />
          <DataChip label="Cambio vs 2022" value={d.impact.milex_change_pct !== null ? `${d.impact.milex_change_pct > 0 ? '+' : ''}${d.impact.milex_change_pct}%` : '—'} />
          <DataChip label="Rango mundial" value={d.impact.sipri_rank ? `#${d.impact.sipri_rank}` : '—'} />
        </div>
      ) : (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>País no incluido en cobertura SIPRI 60 países top.</p>
      )}

      <h4 style={{ margin: '16px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Bloques pendientes
      </h4>
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#92400e' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Próximamente:</p>
        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
          {d.impact.pending_blocks.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </div>
  )
}

function SubCorporativo({ d }: { d: Detail }) {
  return (
    <div>
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#92400e', marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>Sección en construcción</p>
        <p style={{ margin: '4px 0 0' }}>{d.corporate.note}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://opencorporates.com/companies?q=${encodeURIComponent(d.name_en)}&utf8=%E2%9C%93`} target="_blank" rel="noopener noreferrer" style={ExtLinkStyle}>
          OpenCorporates · empresas en {d.name_es} →
        </a>
        <a href={`https://comtradeplus.un.org/`} target="_blank" rel="noopener noreferrer" style={ExtLinkStyle}>
          UN Comtrade · flujos comerciales →
        </a>
      </div>
    </div>
  )
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

const ExtLinkStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#fff', borderRadius: 6,
  border: '1px solid #e2e8f0', fontSize: 10, color: '#0891b2',
  textDecoration: 'none', fontWeight: 600,
}

export default GeoConflictDrawer
