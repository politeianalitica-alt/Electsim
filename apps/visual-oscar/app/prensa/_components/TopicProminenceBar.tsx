'use client'
/**
 * TopicProminenceBar · Sprint 0.5
 *
 * Renderiza chips con los top-10 dominant topics del endpoint /api/medios/pulso.
 * Indicador:
 *   · ↑  → STRUCTURAL  (volumen sostenido en la ventana)
 *   · ★  → EMERGENT    (momentum > 0.7, nuevo)
 *   · (sin indicador)  → STABLE
 */
import type { PulsoMode, WindowSpec } from '@/lib/medios/canonical/types'
import { useMediaPulso } from '../_hooks/useMediaPulso'

interface TopicProminenceBarProps {
  window?: WindowSpec
  mode?: PulsoMode
}

export function TopicProminenceBar({
  window = '72h',
  mode = 'PLURAL',
}: TopicProminenceBarProps) {
  const { data, loading } = useMediaPulso(window, mode)
  if (loading || !data) return null
  const topics = data.dominantTopics ?? []
  if (topics.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 8,
      }}
    >
      {topics.slice(0, 10).map((t) => {
        const indicator =
          t.state === 'STRUCTURAL' ? '↑ ' : t.state === 'EMERGENT' ? '★ ' : ''
        return (
          <span
            key={t.topicId}
            title={`Volumen: ${t.volume} · ${(t.volumePct * 100).toFixed(1)}%`}
            style={{
              padding: '4px 8px',
              background: '#f3f4f6',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            {indicator}
            {t.topicId} ({t.volume})
          </span>
        )
      })}
    </div>
  )
}
