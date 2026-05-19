'use client'
/**
 * <WorkflowResultView /> · render rico del WorkflowResult.
 *
 * Pieza compleja que muestra:
 *   - Header: slug + estado + X/N steps + latencia total
 *   - Timeline visual: cada step con ✓/✗ + tool + latency + summary
 *   - Final output: prominente, formateado (text o JSON)
 *   - Outputs intermedios: colapsables por step
 *
 * Diseñado para encajar dentro del feed del BrainCopilotPanel.
 */
import { useState } from 'react'
import type { WorkflowResult, WorkflowToolTrace } from '@/types/workflows'

export function WorkflowResultView({ result }: { result: WorkflowResult }) {
  const [showAllOutputs, setShowAllOutputs] = useState(false)

  const totalSteps = result.trace.length
  const successSteps = result.trace.filter(t => t.ok).length
  const progressPct = totalSteps > 0 ? (successSteps / totalSteps) * 100 : 0

  return (
    <div style={{
      background: 'var(--color-surface-raised, #f5f5f7)',
      borderRadius: 12,
      border: '1px solid var(--color-hairline-soft, #ECECEF)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        background: result.ok
          ? 'var(--color-success-subtle, rgba(45,138,57,0.08))'
          : 'var(--color-danger-subtle, rgba(196,44,44,0.08))',
        borderBottom: '1px solid var(--color-hairline-soft, #ECECEF)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
              padding: '2px 6px', borderRadius: 4,
              background: result.ok ? 'var(--color-success, #2d8a39)' : 'var(--color-danger, #c42c2c)',
              color: '#fff',
              textTransform: 'uppercase',
            }}>
              {result.ok ? '✓ Workflow' : '× Error'}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--color-ink, #1d1d1f)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {result.workflow_slug}
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--color-ink-4, #6e6e73)', whiteSpace: 'nowrap' }}>
            {successSteps}/{totalSteps} · {(result.total_latency_ms / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 6,
          height: 3,
          borderRadius: 2,
          background: 'var(--color-surface-sunken, #e8e8ed)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: result.ok
              ? 'var(--color-success, #2d8a39)'
              : 'var(--color-warn, #d97706)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {result.error && (
          <p style={{
            margin: '6px 0 0', fontSize: 11, color: 'var(--color-danger, #c42c2c)',
            lineHeight: 1.4,
          }}>
            {result.error}
          </p>
        )}
      </div>

      {/* Final output (si existe + es texto/dict simple) */}
      {result.final_output != null && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--color-surface, #fff)',
          borderBottom: '1px solid var(--color-hairline-soft, #ECECEF)',
        }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--color-ink-4, #6e6e73)',
            marginBottom: 4,
          }}>
            Output final
          </div>
          <FinalOutput value={result.final_output} />
        </div>
      )}

      {/* Timeline */}
      <ul style={{
        listStyle: 'none', padding: '8px 12px', margin: 0,
        display: 'flex', flexDirection: 'column', gap: 6,
        background: 'var(--color-surface, #fff)',
      }}>
        {result.trace.map((t, idx) => (
          <StepRow key={`${t.step_id}-${idx}`} trace={t} isLast={idx === result.trace.length - 1} />
        ))}
      </ul>

      {/* Outputs colapsables */}
      {Object.keys(result.outputs).length > 0 && (
        <details style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--color-hairline-soft, #ECECEF)',
        }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--color-ink-4, #6e6e73)',
          }}>
            Outputs intermedios · {Object.keys(result.outputs).length}
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(result.outputs).map(([key, value]) => (
              <div key={key} style={{
                fontSize: 11, padding: 8, borderRadius: 6,
                background: 'var(--color-surface-raised, #f5f5f7)',
              }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--color-ink-3, #515154)', marginBottom: 4 }}>
                  {key}
                </div>
                <FinalOutput value={value} compact />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

function StepRow({ trace, isLast }: { trace: WorkflowToolTrace; isLast: boolean }) {
  const color = trace.ok ? 'var(--color-success, #2d8a39)' : 'var(--color-danger, #c42c2c)'
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', position: 'relative' }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: trace.ok ? color : 'transparent',
        border: trace.ok ? 'none' : `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontSize: 10, fontWeight: 800,
        color: trace.ok ? '#fff' : color,
        marginTop: 2,
      }}>
        {trace.ok ? '✓' : '×'}
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <code style={{
            fontFamily: 'var(--font-mono, monospace)', fontWeight: 700,
            color: 'var(--color-ink-2, #3a3a3d)', fontSize: 11,
          }}>
            {trace.tool}
          </code>
          <span style={{
            fontSize: 9.5, color: 'var(--color-ink-4, #6e6e73)',
            background: 'var(--color-surface-sunken, #e8e8ed)',
            padding: '1px 5px', borderRadius: 3,
          }}>
            → {trace.output_key}
          </span>
          <span style={{ fontSize: 9.5, color: 'var(--color-ink-5, #aeaeb2)' }}>
            {trace.latency_ms}ms
            {trace.attempts > 1 && ` · ${trace.attempts} intentos`}
          </span>
        </div>
        {trace.output_summary && (
          <div style={{
            fontSize: 10.5, color: 'var(--color-ink-4, #6e6e73)',
            marginTop: 2, fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {trace.output_summary}
          </div>
        )}
        {trace.error && (
          <div style={{
            fontSize: 10.5, color: 'var(--color-danger, #c42c2c)',
            marginTop: 2,
          }}>
            {trace.error}
          </div>
        )}
      </div>
    </li>
  )
}

function FinalOutput({ value, compact = false }: { value: unknown; compact?: boolean }) {
  if (value == null) return null
  if (typeof value === 'string') {
    return (
      <div style={{
        fontSize: compact ? 11 : 12.5,
        color: 'var(--color-ink, #1d1d1f)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
        maxHeight: compact ? 200 : 'none',
        overflowY: 'auto',
      }}>
        {value}
      </div>
    )
  }
  // dict / list → JSON pretty
  try {
    const json = JSON.stringify(value, null, 2)
    return (
      <pre style={{
        fontSize: compact ? 10 : 11,
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--color-ink-2, #3a3a3d)',
        background: compact ? 'transparent' : 'var(--color-surface-sunken, #e8e8ed)',
        padding: compact ? 0 : 8,
        borderRadius: 4,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: compact ? 150 : 280,
        overflowY: 'auto',
      }}>
        {json.length > 2000 ? json.slice(0, 2000) + '\n…(truncado)' : json}
      </pre>
    )
  } catch {
    return <div style={{ fontSize: 11 }}>{String(value)}</div>
  }
}
