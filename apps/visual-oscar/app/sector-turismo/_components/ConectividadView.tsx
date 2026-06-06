'use client'
/**
 * <ConectividadView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Conectividad. La Ola 2 (Sprint T8) la llenará con:
 *   - AENA pasajeros por aeropuerto (datos.gob.es).
 *   - Aerolíneas (IAG) y coste aéreo (jet fuel / Brent).
 *   - Cruceros por puerto — ENLAZADO a /puertos, no duplicado.
 *
 * Hasta entonces: andamio sobrio (no se simulan datos · CLAUDE.md). Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'

export function ConectividadView() {
  return (
    <TurismoSectionStub
      glyph="⟶"
      eyebrow="TURISMO · CONECTIVIDAD"
      title="Conectividad"
      desc="Pasajeros por aeropuerto (AENA), aerolíneas y coste aéreo (jet fuel), y tráfico de cruceros por puerto enlazado al módulo de puertos."
      sprint="T8"
      fuentes={['AENA · datos.gob.es', 'Finnhub (IAG)', 'commodities (jet fuel)', 'Puertos del Estado']}
    />
  )
}

export default ConectividadView
