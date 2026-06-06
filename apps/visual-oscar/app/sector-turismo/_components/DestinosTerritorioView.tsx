'use client'
/**
 * <DestinosTerritorioView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Destinos y territorio. La Ola 2 (Sprint T6) la llenará con:
 *   - Mapa CCAA (choropleth de presión turística / pernoctaciones).
 *   - Tabla de destinos enriquecida (de-hardcode del seed actual).
 *   - Tasa turística por destino y saturación de vivienda turística.
 *
 * Hasta entonces: andamio sobrio (no se simulan datos · CLAUDE.md). Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'

export function DestinosTerritorioView() {
  return (
    <TurismoSectionStub
      glyph="◔"
      eyebrow="TURISMO · DESTINOS Y TERRITORIO"
      title="Destinos y territorio"
      desc="Mapa por comunidad autónoma (presión turística y pernoctaciones), tabla de destinos enriquecida, tasa turística y saturación de vivienda turística."
      sprint="T6"
      fuentes={['INE EOH', 'Eurostat NUTS2', 'tourism_destinations', 'AEMET']}
    />
  )
}

export default DestinosTerritorioView
