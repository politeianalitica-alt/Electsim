'use client'
/**
 * <AlojamientoView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Alojamiento. La Ola 2 (Sprint T5) la llenará con la ocupación por TIPO de
 * alojamiento (hotel · apartamento · camping · rural · vivienda turística):
 * pernoctaciones, grado de ocupación %, ADR, RevPAR y estancia media. La
 * vivienda turística (VT) se ENLAZA a /sector-vivienda, no se duplica.
 *
 * Hasta entonces: andamio sobrio (no se simulan datos · CLAUDE.md). Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'

export function AlojamientoView() {
  return (
    <TurismoSectionStub
      glyph="▤"
      eyebrow="TURISMO · ALOJAMIENTO"
      title="Alojamiento por tipo"
      desc="Ocupación por tipo de alojamiento (hotel, apartamento, camping, rural, vivienda turística): pernoctaciones, grado de ocupación, ADR, RevPAR y estancia media."
      sprint="T5"
      fuentes={['INE EOH', 'INE EOAP', 'INE EOAC', 'INE EOTR', 'Eurostat']}
    />
  )
}

export default AlojamientoView
