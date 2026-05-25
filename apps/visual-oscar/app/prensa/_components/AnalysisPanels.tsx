'use client'
/**
 * AnalysisPanels · Sprint M4 FASE B.
 *
 * Paneles reusables que renderizan los outputs del motor común
 * media-analysis · idénticos para NewsAPI search (BusquedaPuntual)
 * y para RSS intel (Pulso/Narrativas/Actores en /prensa).
 *
 * Exports:
 *   - <MetodologiaConfianzaPanel /> · confidence + balance + warnings
 *   - <ActoresImpactoPanel />       · b/h/n/u stacked bar + dominant
 *   - <FramingComparisonPanel />    · por bucket · enfatiza/OMITE/lift
 *   - <CoverageGapsPanel />         · gaps con interpretation
 *   - <FollowupQueriesPanel />      · queries sugeridas clickables
 */

// ─── Tipos compartidos ────────────────────────────────────────────────

export interface ActorImpactRow {
  actor: string
  mentions: number
  dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
  beneficial: number
  harmful: number
  neutral: number
  uncertain: number
  sample_reasons: string[]
}

export interface FramingBucket {
  bucket: string
  count: number
  dominant_topics: { topic: string; count: number }[]
  dominant_frames: { frame: string; count: number }[]
  actors_emphasized: { actor: string; mentions: number }[]
  actors_omitted: string[]
  average_tone: number
  controversy_score: number
  representative_titles: string[]
  distinctive_terms: { term: string; lift: number }[]
  interpretation: string
}

export interface CoverageGapRow {
  topic: string
  total_mentions: number
  interpretation: string
}

export interface FollowupQuery {
  query: string
  reason: string
  expected_focus: string
}

export interface AnalysisWarning {
  level: 'info' | 'warning' | 'critical'
  category: string
  message: string
  evidence?: string
}

export interface MethodologyConfidence {
  overall: number
  reasons: string[]
}

// ─── 1 · Metodología + confianza + warnings ───────────────────────────

export function MetodologiaConfianzaPanel({
  totalResults, nArticles,
  confidence,
  balanceIdeo, balanceTerr,
  latencyMs,
  warnings,
  providerLabel = 'RSS + NewsAPI',
}: {
  totalResults?: number
  nArticles?: number
  confidence?: MethodologyConfidence
  balanceIdeo?: number
  balanceTerr?: number
  latencyMs?: number
  warnings?: AnalysisWarning[]
  providerLabel?: string
}) {
  const confPct = Math.round((confidence?.overall ?? 0) * 100)
  const confColor = confPct >= 70 ? '#16a34a' : confPct >= 50 ? '#f59e0b' : '#dc2626'
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #475569', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#475569', textTransform: 'uppercase' }}>
          ◆ Metodología & confianza · {providerLabel}
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
        <Kpi label="Total" value={totalResults?.toLocaleString('es-ES') ?? '—'} color="#0f172a" />
        <Kpi label="Analizados" value={String(nArticles ?? 0)} color="#0f172a" />
        <Kpi label="Confianza" value={`${confPct}%`} color={confColor} />
        <Kpi label="Balance ideo" value={balanceIdeo != null ? `${(balanceIdeo * 100).toFixed(0)}%` : '—'} color="#1e40af" />
        <Kpi label="Balance terr" value={balanceTerr != null ? `${(balanceTerr * 100).toFixed(0)}%` : '—'} color="#16a34a" />
        <Kpi label="Latencia" value={latencyMs ? `${latencyMs}ms` : '—'} color="#94a3b8" />
      </div>
      {confidence?.reasons && confidence.reasons.length > 0 && (
        <div style={{ fontSize: 10, color: '#92400e', background: '#fef3c7', padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <strong style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 9 }}>! Limitaciones de confianza:</strong>{' '}
          {confidence.reasons.join(' · ')}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {warnings.map((w, i) => {
            const color = w.level === 'critical' ? '#dc2626' : w.level === 'warning' ? '#f59e0b' : '#0891b2'
            const bg = w.level === 'critical' ? '#fee2e2' : w.level === 'warning' ? '#fef3c7' : '#e0f2fe'
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 6, background: bg, borderLeft: `3px solid ${color}`, borderRadius: 3, fontSize: 10 }}>
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2, background: color, color: '#fff', letterSpacing: 0.4 }}>{w.level.toUpperCase()}</span>
                <span style={{ color: '#0f172a' }}>{w.message}{w.evidence ? <span style={{ color: '#64748b' }}> · {w.evidence}</span> : null}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 8, background: '#f8fafc', borderRadius: 4 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

// ─── 2 · Actor impacts (compartido) ───────────────────────────────────

export function ActoresImpactoPanel({ impacts, max = 12 }: { impacts: ActorImpactRow[]; max?: number }) {
  if (impacts.length === 0) return null
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#0891b2', textTransform: 'uppercase' }}>
          ◆ Actores e impacto político
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Sentimiento HACIA actor (no plano) · barra beneficial/harmful/neutral/uncertain · dominant_impact dominante.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {impacts.slice(0, max).map((a) => {
          const total = a.beneficial + a.harmful + a.neutral + a.uncertain || 1
          const impactColor = a.dominant_impact === 'beneficial' ? '#16a34a' : a.dominant_impact === 'harmful' ? '#dc2626' : '#94a3b8'
          return (
            <div key={a.actor} style={{ display: 'grid', gridTemplateColumns: '180px 50px 1fr 100px', gap: 8, alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4, fontSize: 11 }}>
              <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.sample_reasons[0] || ''}>{a.actor}</span>
              <span style={{ color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{a.mentions}</span>
              <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden' }}>
                {a.beneficial > 0 && <div style={{ width: `${(a.beneficial / total) * 100}%`, background: '#16a34a' }} title={`beneficial ${a.beneficial}`} />}
                {a.harmful > 0 && <div style={{ width: `${(a.harmful / total) * 100}%`, background: '#dc2626' }} title={`harmful ${a.harmful}`} />}
                {a.neutral > 0 && <div style={{ width: `${(a.neutral / total) * 100}%`, background: '#94a3b8' }} title={`neutral ${a.neutral}`} />}
                {a.uncertain > 0 && <div style={{ width: `${(a.uncertain / total) * 100}%`, background: '#cbd5e1' }} title={`uncertain ${a.uncertain}`} />}
              </div>
              <span style={{ fontSize: 8, color: impactColor, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'right' }}>● {a.dominant_impact}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── 3 · Framing comparison (compartido) ──────────────────────────────

export function FramingComparisonPanel({ framing }: { framing: FramingBucket[] }) {
  if (!framing || framing.length === 0) return null
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #8b5cf6', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#8b5cf6', textTransform: 'uppercase' }}>
          ◆ Comparación ideológica · framing por bloque
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Qué bloque enfatiza qué actor · qué temas omite · vocabulario distintivo (lift = sobre-indexación vs media).
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {framing.map((b) => (
          <div key={b.bucket} style={{ background: '#faf5ff', borderRadius: 4, padding: 10, borderLeft: '3px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', letterSpacing: 0.3, textTransform: 'uppercase' }}>{b.bucket}</span>
              <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                {b.count} arts · tono {(b.average_tone * 100).toFixed(0)}% · controv {b.controversy_score}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#475569', fontStyle: 'italic', marginBottom: 6 }}>{b.interpretation}</p>
            {b.dominant_frames.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#7c3aed' }}>Frames:</strong>{' '}
                {b.dominant_frames.map((f) => `${f.frame}(${f.count})`).join(' · ')}
              </p>
            )}
            {b.actors_emphasized.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#0891b2' }}>Enfatiza:</strong>{' '}
                {b.actors_emphasized.map((a) => `${a.actor} (${a.mentions})`).join(' · ')}
              </p>
            )}
            {b.actors_omitted.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#dc2626' }}>OMITE:</strong>{' '}
                <span style={{ color: '#475569' }}>{b.actors_omitted.join(', ')}</span>
              </p>
            )}
            {b.distinctive_terms.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#84cc16' }}>Vocab distintivo:</strong>{' '}
                {b.distinctive_terms.slice(0, 5).map((t) => `${t.term} (×${t.lift.toFixed(1)})`).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 4 · Coverage gaps (compartido) ───────────────────────────────────

export function CoverageGapsPanel({ gaps }: { gaps: CoverageGapRow[] }) {
  if (!gaps || gaps.length === 0) return null
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#f59e0b', textTransform: 'uppercase' }}>
          ◆ Coverage gaps · cobertura asimétrica por bloque
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {gaps.map((g) => (
          <div key={g.topic} style={{ padding: 6, background: '#fef3c7', borderLeft: '2px solid #f59e0b', borderRadius: 3, fontSize: 10 }}>
            <strong style={{ color: '#92400e' }}>{g.topic}</strong>{' '}
            <span style={{ color: '#0f172a' }}>· {g.total_mentions} menciones</span>
            <p style={{ margin: '2px 0 0', color: '#475569' }}>{g.interpretation}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 5 · Followup queries (compartido) ────────────────────────────────

export function FollowupQueriesPanel({ followups, onRun }: { followups: FollowupQuery[]; onRun?: (q: string) => void }) {
  if (!followups || followups.length === 0) return null
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0ea5e9', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#0ea5e9', textTransform: 'uppercase' }}>
          ◆ Queries sugeridas · derivadas del análisis
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {followups.slice(0, 8).map((f, i) => {
          const inner = (
            <>
              <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{f.query}</span>
              <span style={{ color: '#475569', fontSize: 9 }}>{f.reason}</span>
            </>
          )
          if (onRun) {
            return (
              <button key={i} onClick={() => onRun(f.query)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                padding: 6, background: '#f0f9ff', borderLeft: '2px solid #0ea5e9', borderRadius: 3,
                fontSize: 10, cursor: 'pointer', border: 'none', textAlign: 'left',
              }}>{inner}</button>
            )
          }
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: 6, background: '#f0f9ff', borderLeft: '2px solid #0ea5e9', borderRadius: 3, fontSize: 10,
            }}>{inner}</div>
          )
        })}
      </div>
    </section>
  )
}
