'use client'
/**
 * `<DataQualityBadge />` · pill visual con la trazabilidad del dato.
 *
 *  LIVE       · verde   · viene del proveedor en este request
 *  CACHE      · azul    · viene de cache (DB / memoria) con TTL fresco
 *  SEED       · gris    · catálogo manual curado (estable, no cambia minuto a minuto)
 *  SYNTH      · ámbar   · valor calculado deterministicamente (hash) · NO real
 *  MISSING    · rojo    · no disponible · fila vacía intencional
 *
 *  Renderizado compacto (default) o expandido con descripción.
 */
import { qualityColor } from '@/lib/ports-utils'
import type { DataQuality } from '@/types/ports'

interface Props {
  quality?: DataQuality | null
  compact?: boolean
}

export function DataQualityBadge({ quality, compact = true }: Props) {
  if (!quality) return null
  const { bg, fg, label } = qualityColor(quality.source_type)
  const titleParts = [
    quality.source_name,
    quality.note,
    quality.retrieved_at ? `actualizado ${new Date(quality.retrieved_at).toLocaleString('es-ES')}` : null,
    quality.confidence_score != null ? `confianza ${Math.round(quality.confidence_score * 100)}%` : null,
  ].filter(Boolean) as string[]

  if (compact) {
    return (
      <span
        title={titleParts.join(' · ')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          padding: '2px 6px',
          borderRadius: 4,
          background: bg,
          color: fg,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    )
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        padding: '4px 8px',
        borderRadius: 6,
        background: bg,
        color: fg,
        fontSize: 11,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label} · {quality.source_name}
      </span>
      {quality.note && (
        <span style={{ opacity: 0.8 }}>{quality.note}</span>
      )}
    </div>
  )
}

export default DataQualityBadge
