'use client'
/**
 * <EnergyIntel /> · Primitiva compartida · Energía v3 · Sprint E1
 *
 * Wrapper fino sobre <SectorIntelPanel sector="energia" compact /> para que las
 * vistas de energía importen UNA sola cosa en lugar de repetir el bloque de
 * inteligencia operativa sectorial (que estaba copiado en las 7 vistas con los
 * mismos props). Fija `sector="energia"` y `compact` por defecto; el resto de
 * props (detailHref / detailLabel / title / accent) se pasan a través.
 *
 * Cero emojis · Unicode geométrico (los textos los aporta cada vista).
 */
import { SectorIntelPanel } from '@/components/SectorIntelPanel'

interface EnergyIntelProps {
  /** Compacto (solo KPIs + alertas, sin tabla). Default true. */
  compact?: boolean
  /** Enlace 'ver detalle' opcional. Default a los futuros de energía (Vesper). */
  detailHref?: string
  detailLabel?: string
  /** Título opcional del panel. */
  title?: string
  /** Color de acento opcional. */
  accent?: string
}

export function EnergyIntel({
  compact = true,
  detailHref = '/commodities?category=energy',
  detailLabel = 'Ver futuros · Vesper →',
  title,
  accent,
}: EnergyIntelProps) {
  return (
    <SectorIntelPanel
      sector="energia"
      compact={compact}
      detailHref={detailHref}
      detailLabel={detailLabel}
      title={title}
      accent={accent}
    />
  )
}

export default EnergyIntel
