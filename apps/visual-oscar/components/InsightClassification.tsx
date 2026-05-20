'use client'

/**
 * InsightClassification · separa visualmente lo OBSERVADO, INFERIDO,
 * PROYECTADO y RECOMENDADO para que el usuario sepa qué es dato real,
 * interpretación, predicción o sugerencia accionable.
 *
 * Uso típico en escenarios IA y briefings:
 *   <InsightClassification variant="observed"   label="Señales observadas">…</InsightClassification>
 *   <InsightClassification variant="inferred"   label="Lectura analítica">…</InsightClassification>
 *   <InsightClassification variant="projected"  label="Escenario probable">…</InsightClassification>
 *   <InsightClassification variant="recommended" label="Recomendación">…</InsightClassification>
 *
 * Por defecto las etiquetas son las recomendadas por el sistema, pero
 * pueden sobreescribirse vía prop `label`.
 *
 * Incluye también el helper <InsightDisclaimer/> con el aviso metodológico
 * estándar para módulos generados por IA.
 */

import type { CSSProperties, ReactNode } from 'react'

export type InsightVariant = 'observed' | 'inferred' | 'projected' | 'recommended'

const VARIANT_META: Record<InsightVariant, { label: string; color: string; bg: string; border: string; icon: string; verb: string }> = {
  observed: {
    label: 'Observado', color: '#0F766E', bg: 'rgba(15,118,110,0.06)',
    border: 'rgba(15,118,110,0.30)', icon: '●',
    verb: 'Datos directamente medidos o recogidos por el sistema',
  },
  inferred: {
    label: 'Inferido', color: '#2563EB', bg: 'rgba(37,99,235,0.06)',
    border: 'rgba(37,99,235,0.30)', icon: '◆',
    verb: 'Interpretación derivada por el modelo · sujeta a validación',
  },
  projected: {
    label: 'Proyectado', color: '#B45309', bg: 'rgba(180,83,9,0.06)',
    border: 'rgba(180,83,9,0.32)', icon: '◐',
    verb: 'Escenario o evolución estimada · no es una predicción determinista',
  },
  recommended: {
    label: 'Recomendado', color: '#5B21B6', bg: 'rgba(91,33,182,0.06)',
    border: 'rgba(91,33,182,0.32)', icon: '➤',
    verb: 'Acción sugerida por el sistema · requiere juicio humano final',
  },
}

export interface InsightClassificationProps {
  variant: InsightVariant
  /** Label opcional · default usa la del variant */
  label?: string
  /** Contenido principal · puede ser string, JSX, lista, etc. */
  children: ReactNode
  /** Mostrar tooltip ? con la definición del variant */
  showVerb?: boolean
  /** Compact · padding reducido */
  compact?: boolean
  /** Override estilo del contenedor */
  style?: CSSProperties
}

export default function InsightClassification({
  variant, label, children, showVerb = true, compact = false, style,
}: InsightClassificationProps) {
  const m = VARIANT_META[variant]
  const displayLabel = label ?? m.label
  return (
    <div style={{
      background: m.bg,
      borderLeft: `3px solid ${m.color}`,
      borderTop: `1px solid ${m.border}`,
      borderRight: `1px solid ${m.border}`,
      borderBottom: `1px solid ${m.border}`,
      borderRadius: 10,
      padding: compact ? '10px 14px' : '14px 18px',
      ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 6 : 8,
        fontSize: 11, fontWeight: 800, color: m.color, letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>{m.icon}</span>
        {displayLabel}
        {showVerb && (
          <span
            title={m.verb}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 13, height: 13, borderRadius: '50%',
              background: m.color + '20', color: m.color,
              fontSize: 9, fontWeight: 800, cursor: 'help',
              marginLeft: 2, lineHeight: 1,
            }}
          >?</span>
        )}
      </div>
      <div style={{ fontSize: compact ? 12.5 : 13.5, color: '#1d1d1f', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  )
}

/**
 * Aviso metodológico estándar · usar al pie de cualquier módulo que
 * mezcle observados con proyecciones IA.
 */
export function InsightDisclaimer({ style }: { style?: CSSProperties }) {
  return (
    <p style={{
      fontSize: 11, color: '#86868b', margin: '12px 0 0', lineHeight: 1.45,
      padding: '8px 12px', background: '#FAFAFA', borderRadius: 8,
      borderLeft: '3px solid #D0D0D5',
      ...style,
    }}>
      <strong style={{ color: '#6e6e73' }}>Aviso metodológico · </strong>
      Los escenarios y proyecciones son estimaciones generadas por IA a partir
      de las señales disponibles. No constituyen predicciones deterministas y
      requieren validación adicional antes de informar decisiones operativas.
    </p>
  )
}

/**
 * Helper · etiqueta pill pequeña para usar inline dentro de listas.
 * Útil cuando no hace falta envolver todo en un Card.
 */
export function InsightPill({ variant, label }: { variant: InsightVariant; label?: string }) {
  const m = VARIANT_META[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9.5, fontWeight: 800, color: m.color, background: m.bg,
      border: `1px solid ${m.border}`, padding: '2px 8px', borderRadius: 999,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      <span style={{ fontSize: 10 }}>{m.icon}</span>
      {label ?? m.label}
    </span>
  )
}
