/**
 * Badge "DEMO" reutilizable · marca de forma honesta los bloques cuyos datos
 * son de muestra (no conectados a una fuente en vivo). Sin emojis, estilo
 * Politeia. Pasa `title` para explicar al pasar el ratón.
 */
import type { CSSProperties } from 'react'

interface Props {
  /** Texto del badge. Por defecto "DEMO". */
  label?: string
  /** Tooltip al pasar el ratón. */
  title?: string
  /** Tono: 'muted' (gris, por defecto) o 'accent' (ámbar, más visible). */
  tone?: 'muted' | 'accent'
  style?: CSSProperties
}

export default function DemoBadge({
  label = 'DEMO',
  title = 'Datos de muestra · no conectados a una fuente en vivo',
  tone = 'muted',
  style,
}: Props) {
  const palette =
    tone === 'accent'
      ? { bg: '#FEF3C7', fg: '#92600A', bd: '#FCE9B6' }
      : { bg: '#F3F4F6', fg: '#6B7280', bd: '#E5E7EB' }
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        borderRadius: 5,
        padding: '1px 5px',
        lineHeight: 1.5,
        cursor: 'help',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {label}
    </span>
  )
}
