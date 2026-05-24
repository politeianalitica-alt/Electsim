'use client'
/**
 * `<AIInsightPanel />` · Render del análisis estructurado devuelto por
 * `/api/macro/ai/analyze-chart`.
 *
 * Muestra 8 secciones:
 *   1. Headline + executive summary
 *   2. Trend (dirección + label + explicación)
 *   3. Why (drivers con confianza individual)
 *   4. Consecuencias (área + severidad)
 *   5. Riesgos (trigger + horizonte + severidad)
 *   6. Watchlist (indicadores siguientes)
 *   7. Contradictions (señales contrarias)
 *   8. Analyst questions
 *
 * Pie: confidence score · fuente · provider/model · disclaimer.
 */
import type {
  ChartAnalysisResponse,
  ConsequenceArea,
  RiskHorizon,
  Severity,
  TrendDirection,
} from '@/lib/macro/ai-schema'

const TREND_LABEL: Record<TrendDirection, { icon: string; color: string; label: string }> = {
  up: { icon: '↑', color: '#16a34a', label: 'Tendencia al alza' },
  down: { icon: '↓', color: '#dc2626', label: 'Tendencia a la baja' },
  flat: { icon: '→', color: '#64748b', label: 'Tendencia plana' },
  volatile: { icon: '↕', color: '#f59e0b', label: 'Volátil' },
  turning_point: { icon: '⤴', color: '#7c3aed', label: 'Punto de inflexión' },
}

const AREA_LABEL: Record<ConsequenceArea, string> = {
  growth: 'Crecimiento',
  inflation: 'Inflación',
  monetary_policy: 'Política monetaria',
  fiscal_policy: 'Política fiscal',
  labor_market: 'Mercado laboral',
  external_sector: 'Sector exterior',
  financial_stability: 'Estabilidad financiera',
  households: 'Hogares',
  businesses: 'Empresas',
  political: 'Político',
  other: 'Otros',
}

const HORIZON_LABEL: Record<RiskHorizon, string> = {
  days: 'días',
  weeks: 'semanas',
  months: 'meses',
  quarters: 'trimestres',
  years: 'años',
}

const SEVERITY_COLOR: Record<Severity, { bg: string; color: string; label: string }> = {
  low: { bg: '#f1f5f9', color: '#475569', label: 'Bajo' },
  medium: { bg: '#fef3c7', color: '#92400e', label: 'Medio' },
  high: { bg: '#fed7aa', color: '#9a3412', label: 'Alto' },
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Crítico' },
}

export function AIInsightPanel({
  data,
  accent,
  onClose,
}: {
  data: ChartAnalysisResponse
  accent: string
  onClose?: () => void
}) {
  const i = data.insight
  const trend = TREND_LABEL[i.trend.direction] || TREND_LABEL.flat

  return (
    <div
      style={{
        marginTop: 12,
        background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 70%)',
        border: '1px solid #e9d5ff',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: 14,
        fontSize: 13,
        color: '#0f172a',
        lineHeight: 1.55,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
            ◆ Análisis IA · {data.provider === 'groq' ? 'Groq GPT-OSS' : 'Anthropic Claude'} {data.cache_hit && '· (cache)'}
          </p>
          <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{i.headline}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar análisis"
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              color: '#475569',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Executive summary */}
      <p style={{ margin: '0 0 12px', color: '#334155' }}>{i.executiveSummary}</p>

      {/* Trend */}
      <Section title="Tendencia" accent={accent}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 22, color: trend.color, fontWeight: 700 }}>{trend.icon}</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: trend.color }}>{i.trend.label || trend.label}</p>
            <p style={{ margin: '2px 0 0', color: '#475569', fontSize: 12 }}>{i.trend.explanation}</p>
          </div>
        </div>
      </Section>

      {/* Why */}
      {i.why?.length > 0 && (
        <Section title="Drivers identificados" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#334155' }}>
            {i.why.map((d, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                <strong style={{ color: '#0f172a' }}>{d.driver}</strong> · {d.evidence}{' '}
                <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>
                  (confianza {Math.round(d.confidence * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Consequences */}
      {i.consequences?.length > 0 && (
        <Section title="Consecuencias" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {i.consequences.map((c, idx) => {
              const sev = SEVERITY_COLOR[c.severity] || SEVERITY_COLOR.low
              return (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      background: sev.bg,
                      color: sev.color,
                      borderRadius: 4,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {AREA_LABEL[c.area] || c.area} · {sev.label}
                  </span>
                  <span style={{ color: '#334155' }}>{c.explanation}</span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Risks */}
      {i.risks?.length > 0 && (
        <Section title="Riesgos potenciales" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {i.risks.map((r, idx) => {
              const sev = SEVERITY_COLOR[r.severity] || SEVERITY_COLOR.low
              return (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      background: sev.bg,
                      color: sev.color,
                      borderRadius: 4,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {sev.label}
                  </span>
                  <span style={{ color: '#334155' }}>
                    <strong style={{ color: '#0f172a' }}>{r.risk}</strong>{' '}
                    <span style={{ color: '#64748b' }}>· trigger: {r.trigger}</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>· horizonte {HORIZON_LABEL[r.horizon] || r.horizon}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Watchlist */}
      {i.watchlist?.length > 0 && (
        <Section title="Indicadores a vigilar" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#334155' }}>
            {i.watchlist.map((w, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                <strong style={{ color: '#0f172a' }}>{w.label}</strong>{' '}
                <span style={{ color: '#64748b', fontSize: 11 }}>({w.indicatorId})</span> · {w.reason}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Contradictions */}
      {i.contradictions?.length > 0 && (
        <Section title="Señales contradictorias" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#475569' }}>
            {i.contradictions.map((c, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                <strong style={{ color: '#0f172a' }}>{c.signal}</strong> · {c.explanation}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Analyst questions */}
      {i.analystQuestions?.length > 0 && (
        <Section title="Preguntas que un analista haría a continuación" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#475569' }}>
            {i.analystQuestions.map((q, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>{q}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Source notes */}
      {i.sourceNotes?.length > 0 && (
        <Section title="Notas de fuente" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#64748b', fontSize: 11 }}>
            {i.sourceNotes.map((n, idx) => (
              <li key={idx} style={{ marginBottom: 2 }}>{n}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid #e9d5ff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 10,
          color: '#7c3aed',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: 0.4 }}>
          Confianza global · {Math.round((i.confidenceScore ?? 0) * 100)}%
        </span>
        <span style={{ color: '#94a3b8' }}>
          {data.model} · {new Date(data.generated_at).toLocaleString('es-ES')}
        </span>
        <span style={{ flexBasis: '100%', color: '#94a3b8', fontStyle: 'italic', fontSize: 10 }}>
          {data.disclaimer}
        </span>
      </div>
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p
        style={{
          margin: '0 0 4px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: accent,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </p>
      <div style={{ fontSize: 12.5 }}>{children}</div>
    </div>
  )
}

export default AIInsightPanel
