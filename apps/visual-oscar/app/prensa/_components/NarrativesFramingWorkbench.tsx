'use client'
/**
 * `<NarrativesFramingWorkbench />` · Sprint G15 FASE D4
 *
 * Vista UNIFICADA de narrativas + framing. Reemplaza el apilamiento previo
 * de 7 componentes (FramingComparisonPanel, CoverageGapsPanel,
 * NarrativeClustersView, ViralidadStrip, NarrativesV3View, StoryClustersView,
 * NarrativesDeepView).
 *
 * Regla conceptual: una narrativa es topic + frame + mensaje repetido +
 * actores + medios/canales + ventana temporal + evidencia suficiente.
 *
 * Lo que aporta sobre el apilamiento previo:
 *  - 1 sola vista, no 7
 *  - Cada narrativa muestra TODOS sus campos D3 (key_messages, channels,
 *    target_audiences, trend label, impact_summary)
 *  - Separa narrativas establecidas vs señales emergentes (Sprint D1)
 *  - Header explica EL MÉTODO de detección
 *  - KPIs ejecutivos arriba
 *  - Filtros (frame, confianza, aceleración) sin recargar
 */
import { useMemo, useState } from 'react'
import { FLAGS } from '@/lib/medios/feature-flags'

// Sprint 1.4 · feature flag preparado: cuando USE_CANONICAL_NARRATIVAS
// esté activo en Vercel preview, futuras versiones de page.tsx leerán de
// /api/medios/narrativas (stub Sprint 0+1, lleno en Sprint 4). En
// producción la flag default es FALSE → comportamiento legacy intacto.
// El componente actual recibe `narratives` como prop desde el padre.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NARRATIVAS_ENDPOINT = FLAGS.USE_CANONICAL_NARRATIVAS
  ? '/api/medios/narrativas'
  : '/api/medios/intel?include=narrative_clusters'

// ─── Tipos espejo de NarrativeCluster (parcial · solo lo que la UI consume) ───
interface NarrativeChannel { channel: string; weight: number; examples: string[] }
interface NarrativeAudience { label: string; reason: string; confidence: number }
interface NarrativeNewsItem {
  title: string; medium: string; url: string
  ideology: 'left' | 'center-left' | 'center' | 'center-right' | 'right'
  published_at: string | null
}
interface NarrativeTrend {
  velocity_score: number; velocity_confidence: number
  acceleration_score: number; acceleration_confidence: number
  label: 'emergente' | 'estable' | 'acelerando' | 'en retroceso'
}
interface NarrativeImpactSummary { benefited: string[]; harmed: string[]; uncertain: string[] }

export interface WorkbenchNarrative {
  id: string
  title: string
  short_summary: string
  frame_type: string
  main_topic: string
  secondary_topics: string[]
  dominant_sector?: string | null
  sector_label?: string | null
  representative_titles: string[]
  first_seen: string
  last_seen: string
  velocity_score: number
  acceleration_score: number
  reach_estimate: number
  ideological_spread: { left: number; center: number; right: number; balanced: boolean }
  territorial_spread: string[]
  dominant_actors: string[]
  benefited_actors: string[]
  harmed_actors: string[]
  emotional_register: string
  controversy_score: number
  confidence: { overall: number; reasons: string[] }
  why_this_is_a_narrative: string
  evidence: Array<{ title: string; medium: string; url: string; ideology: string }>
  // Campos D3
  key_messages?: string[]
  topic_tags?: string[]
  channels?: NarrativeChannel[]
  target_audiences?: NarrativeAudience[]
  supporting_news?: NarrativeNewsItem[]
  impact_summary?: NarrativeImpactSummary
  trend?: NarrativeTrend
}

interface Props {
  narratives: WorkbenchNarrative[] | undefined
  emergingSignals?: WorkbenchNarrative[] | undefined
  loading?: boolean
  onAudit?: (n: WorkbenchNarrative) => void
  onCreateDossier?: (n: WorkbenchNarrative) => void
}

// ─── Styling helpers ────────────────────────────────────────────────────────
const IDEO_COLOR: Record<string, string> = {
  left: '#DC2626', 'center-left': '#F97316', center: '#94A3B8',
  'center-right': '#0891B2', right: '#1E40AF',
}
const TREND_COLOR: Record<NarrativeTrend['label'], { bg: string; fg: string }> = {
  emergente: { bg: '#fef3c7', fg: '#92400e' },
  acelerando: { bg: '#fee2e2', fg: '#991b1b' },
  estable: { bg: '#f1f5f9', fg: '#475569' },
  'en retroceso': { bg: '#e0e7ff', fg: '#3730a3' },
}
function confColor(c: number): string {
  if (c >= 0.65) return '#16a34a'
  if (c >= 0.5) return '#f59e0b'
  return '#dc2626'
}

export function NarrativesFramingWorkbench({
  narratives, emergingSignals, loading, onAudit, onCreateDossier,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterFrame, setFilterFrame] = useState<string>('all')
  const [filterTrend, setFilterTrend] = useState<string>('all')
  const [filterSector, setFilterSector] = useState<string>('all')
  const [minConfidence, setMinConfidence] = useState<number>(0)

  const list = useMemo(() => {
    if (!narratives) return []
    return narratives.filter((n) => {
      if (filterFrame !== 'all' && n.frame_type !== filterFrame) return false
      if (filterTrend !== 'all' && n.trend?.label !== filterTrend) return false
      if (filterSector !== 'all' && n.dominant_sector !== filterSector) return false
      if (n.confidence.overall < minConfidence) return false
      return true
    })
  }, [narratives, filterFrame, filterTrend, filterSector, minConfidence])

  // KPIs ejecutivos
  const kpis = useMemo(() => {
    const nNarr = narratives?.length || 0
    const nEmerging = emergingSignals?.length || 0
    const nHighConf = (narratives || []).filter((n) => n.confidence.overall >= 0.65).length
    const frameCounts = new Map<string, number>()
    const harmedCounts = new Map<string, number>()
    for (const n of narratives || []) {
      frameCounts.set(n.frame_type, (frameCounts.get(n.frame_type) || 0) + 1)
      for (const h of n.harmed_actors) harmedCounts.set(h, (harmedCounts.get(h) || 0) + 1)
    }
    const topFrame = Array.from(frameCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const topHarmed = Array.from(harmedCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { nNarr, nEmerging, nHighConf, topFrame, topHarmed }
  }, [narratives, emergingSignals])

  // Frames distintos en datos para selector
  const frames = useMemo(() => {
    const set = new Set<string>()
    for (const n of narratives || []) set.add(n.frame_type)
    return Array.from(set).sort()
  }, [narratives])

  // Sectores presentes (sector dominante de cada narrativa) para el selector
  const sectors = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of narratives || []) {
      if (n.dominant_sector) m.set(n.dominant_sector, n.sector_label || n.dominant_sector)
    }
    return Array.from(m.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [narratives])

  if (loading) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: '4px solid #7C3AED' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Construyendo narrativas…</p>
      </section>
    )
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: '4px solid #7C3AED' }}>
      {/* Header metodológico */}
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#7C3AED', textTransform: 'uppercase' }}>
          ◆ Narrativas & framing · workbench unificado
        </p>
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 11, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            ¿Cómo identificamos una narrativa?
          </summary>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
            Una narrativa es la combinación estable de <strong>topic + frame + mensaje repetido + actores + medios/canales + ventana temporal + evidencia</strong>.
            <strong> No es un tema. No es un frame suelto.</strong><br />
            Regla dura: mínimo <strong>3 artículos</strong> en <strong>≥2 medios distintos</strong> y al menos UNA señal fuerte (actor dominante recurrente, partido, institución, empresa, territorio, o topic no genérico).
            Los clusters más débiles aparecen abajo como <strong>señales emergentes</strong> (early warning, sin garantizar narrativa establecida).
          </p>
        </details>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
        <KPI label="Narrativas" value={kpis.nNarr} accent="#7C3AED" />
        <KPI label="Señales emergentes" value={kpis.nEmerging} accent="#F59E0B" />
        <KPI label="Confianza alta" value={`${kpis.nHighConf}/${kpis.nNarr}`} accent="#16A34A" />
        <KPI label="Frame dominante" value={kpis.topFrame} accent="#0891B2" />
        <KPI label="Actor más afectado" value={kpis.topHarmed} accent="#DC2626" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, padding: 8, background: '#f9fafb', borderRadius: 6 }}>
        <Filter label="Frame">
          <select value={filterFrame} onChange={(e) => setFilterFrame(e.target.value)} style={selectStyle}>
            <option value="all">Todos</option>
            {frames.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Filter>
        <Filter label="Tendencia">
          <select value={filterTrend} onChange={(e) => setFilterTrend(e.target.value)} style={selectStyle}>
            <option value="all">Todas</option>
            <option value="emergente">Emergente</option>
            <option value="acelerando">Acelerando</option>
            <option value="estable">Estable</option>
            <option value="en retroceso">En retroceso</option>
          </select>
        </Filter>
        {sectors.length > 0 && (
          <Filter label="Sector">
            <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} style={selectStyle}>
              <option value="all">Todos</option>
              {sectors.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Filter>
        )}
        <Filter label={`Confianza mín. ${Math.round(minConfidence * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </Filter>
        {(filterFrame !== 'all' || filterTrend !== 'all' || filterSector !== 'all' || minConfidence > 0) && (
          <button onClick={() => { setFilterFrame('all'); setFilterTrend('all'); setFilterSector('all'); setMinConfidence(0) }} style={{
            background: 'transparent', border: 'none', color: '#7C3AED', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>Limpiar filtros</button>
        )}
      </div>

      {/* Cards de narrativa */}
      {list.length === 0 ? (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Sin narrativas que cumplan los filtros activos. Ajusta arriba o limpia filtros.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((n) => (
            <NarrativeCard
              key={n.id} n={n}
              expanded={expanded === n.id}
              onToggle={() => setExpanded(expanded === n.id ? null : n.id)}
              onAudit={onAudit}
              onCreateDossier={onCreateDossier}
            />
          ))}
        </div>
      )}

      {/* Señales emergentes · sección separada */}
      {emergingSignals && emergingSignals.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
          {/* Sprint Q-C.1 · "masa crítica" → criterio explícito (3 artículos / 2 medios). */}
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#F59E0B', textTransform: 'uppercase' }}>
            ⚐ Señales emergentes · {emergingSignals.length} no llegan aún al mínimo (3 artículos en 2+ medios)
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>
            Pre-narrativa: 2 o menos artículos o sin señal fuerte. NO son narrativas establecidas; pueden consolidarse o disolverse en las próximas horas.
            Cada una indica por qué quedó fuera.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {emergingSignals.slice(0, 8).map((s) => (
              <article key={s.id} style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px',
              }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#92400e' }}>{s.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#a16207', fontStyle: 'italic' }}>
                  {s.why_this_is_a_narrative}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function KPI({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{ padding: '6px 8px', background: '#f9fafb', borderRadius: 6, borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#475569' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

const selectStyle: React.CSSProperties = {
  fontSize: 10, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 3,
  background: '#fff', fontFamily: 'inherit', color: '#0f172a',
}

function NarrativeCard({ n, expanded, onToggle, onAudit, onCreateDossier }: {
  n: WorkbenchNarrative; expanded: boolean; onToggle: () => void
  onAudit?: (n: WorkbenchNarrative) => void
  onCreateDossier?: (n: WorkbenchNarrative) => void
}) {
  const trendCol = TREND_COLOR[n.trend?.label || 'estable']
  const nArts = n.evidence.length
  const nMedios = new Set(n.evidence.map((e) => e.medium)).size

  return (
    <article style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12,
    }}>
      {/* Header card */}
      <button onClick={onToggle} style={{
        width: '100%', background: 'transparent', border: 'none', padding: 0,
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{n.title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{n.short_summary}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {n.trend?.label && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: trendCol.bg, color: trendCol.fg, letterSpacing: 0.4, textTransform: 'uppercase',
              }}>{n.trend.label}</span>
            )}
            <span style={{ fontSize: 9, color: confColor(n.confidence.overall), fontWeight: 700 }}>
              conf {Math.round(n.confidence.overall * 100)}%
            </span>
          </div>
        </div>

        {/* Línea datos clave · siempre visible */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 10, color: '#64748b' }}>
          <span><strong>{nArts}</strong> arts · <strong>{nMedios}</strong> medios</span>
          <span><strong>{n.frame_type}</strong></span>
          {n.main_topic && n.main_topic !== 'general' && <span>topic <strong>{n.main_topic}</strong></span>}
        </div>

        {/* Mensaje central · key_message principal */}
        {n.key_messages && n.key_messages[0] && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7C3AED', fontStyle: 'italic', fontWeight: 500 }}>
            ▸ {n.key_messages[0]}
          </p>
        )}

        {/* Barra ideológica */}
        <div style={{ marginTop: 8, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
          <div style={{ background: IDEO_COLOR.left, width: `${n.ideological_spread.left * 100}%` }} />
          <div style={{ background: IDEO_COLOR.center, width: `${n.ideological_spread.center * 100}%` }} />
          <div style={{ background: IDEO_COLOR.right, width: `${n.ideological_spread.right * 100}%` }} />
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Por qué es narrativa */}
          <Block label="POR QUÉ ES NARRATIVA">
            <p style={{ margin: 0, fontSize: 11, color: '#334155', lineHeight: 1.5 }}>{n.why_this_is_a_narrative}</p>
          </Block>

          {/* Mensajes clave (todos) */}
          {n.key_messages && n.key_messages.length > 1 && (
            <Block label="MENSAJES CLAVE">
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {n.key_messages.map((m, i) => <li key={i} style={{ fontSize: 11, color: '#334155' }}>{m}</li>)}
              </ul>
            </Block>
          )}

          {/* Actores impactados */}
          {(n.impact_summary && (n.impact_summary.benefited.length > 0 || n.impact_summary.harmed.length > 0)) && (
            <Block label="ACTORES IMPACTADOS">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
                {n.impact_summary.benefited.length > 0 && (
                  <span><span style={{ color: '#16a34a', fontWeight: 600 }}>Beneficiados:</span> {n.impact_summary.benefited.join(', ')}</span>
                )}
                {n.impact_summary.harmed.length > 0 && (
                  <span><span style={{ color: '#dc2626', fontWeight: 600 }}>Perjudicados:</span> {n.impact_summary.harmed.join(', ')}</span>
                )}
                {n.impact_summary.uncertain.length > 0 && (
                  <span><span style={{ color: '#64748b', fontWeight: 600 }}>Inciertos:</span> {n.impact_summary.uncertain.join(', ')}</span>
                )}
              </div>
            </Block>
          )}

          {/* Canales */}
          {n.channels && n.channels.length > 0 && (
            <Block label="CANALES">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10 }}>
                {n.channels.map((c) => (
                  <span key={c.channel} style={{
                    background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 3, fontWeight: 500,
                  }}>
                    {c.channel} ({Math.round(c.weight * 100)}%) · {c.examples.join(', ')}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {/* Audiencias objetivo */}
          {n.target_audiences && n.target_audiences.length > 0 && (
            <Block label="AUDIENCIAS OBJETIVO">
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {n.target_audiences.map((a, i) => (
                  <li key={i} style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>
                    <strong>{a.label}</strong> <span style={{ color: '#94a3b8', fontSize: 10 }}>· {a.reason} (conf {Math.round(a.confidence * 100)}%)</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Topic tags RSS */}
          {n.topic_tags && n.topic_tags.length > 0 && (
            <Block label="TAGS RSS DETECTADOS">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {n.topic_tags.slice(0, 8).map((t) => (
                  <span key={t} style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 2, fontSize: 9 }}>#{t}</span>
                ))}
              </div>
            </Block>
          )}

          {/* Tendencia detallada
              Sprint Q-C.1 · "conf velocity" y "accel" eran abreviaturas sin glosario.
              Ahora label completo: "confianza" no se abrevia y "velocidad/aceleración"
              se distinguen sin abreviar. */}
          {n.trend && (
            <Block label="TENDENCIA">
              <p style={{ margin: 0, fontSize: 11, color: '#334155' }}>
                Velocidad <strong>{n.trend.velocity_score.toFixed(2)}</strong> arts/h · aceleración <strong>{n.trend.acceleration_score.toFixed(2)}</strong>
                <span style={{ marginLeft: 8, fontSize: 10, color: '#94a3b8' }}>
                  (confianza velocidad {Math.round(n.trend.velocity_confidence * 100)}% · confianza aceleración {Math.round(n.trend.acceleration_confidence * 100)}%)
                </span>
              </p>
            </Block>
          )}

          {/* Evidencia */}
          {n.supporting_news && n.supporting_news.length > 0 && (
            <Block label={`EVIDENCIA · ${n.supporting_news.length} titulares`}>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {n.supporting_news.slice(0, 6).map((it, i) => (
                  <li key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', textDecoration: 'none' }}>{it.title}</a>
                    <span style={{ marginLeft: 6, fontSize: 9, color: IDEO_COLOR[it.ideology] || '#64748b', fontWeight: 600 }}>
                      [{it.medium}]
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Caveats confianza */}
          {n.confidence.reasons.length > 0 && (
            <Block label="LIMITACIONES METODOLÓGICAS">
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#64748b' }}>
                {n.confidence.reasons.map((r, i) => <li key={i} style={{ fontSize: 10 }}>{r}</li>)}
              </ul>
            </Block>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #e5e7eb' }}>
            {onAudit && (
              <button onClick={(e) => { e.stopPropagation(); onAudit(n) }} style={{
                background: 'transparent', color: '#7C3AED', border: '1px solid #c4b5fd',
                borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}>◇ Auditar narrativa</button>
            )}
            {onCreateDossier && (
              <button onClick={(e) => { e.stopPropagation(); onCreateDossier(n) }} style={{
                background: '#7C3AED', color: '#fff', border: 'none',
                borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}>＋ Crear dossier</button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</p>
      {children}
    </div>
  )
}

export default NarrativesFramingWorkbench
