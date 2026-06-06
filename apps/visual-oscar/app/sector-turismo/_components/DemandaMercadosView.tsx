'use client'
/**
 * <DemandaMercadosView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Demanda y mercados emisores. La Ola 2 (Sprint T4) la llenará con:
 *   - FRONTUR por país emisor (UK · DE · FR · Nórdicos · USA · …) + cuota y var.
 *   - EGATUR gasto (medio/turista, medio/día) por mercado.
 *   - Turismo de residentes (ETR/FAMILITUR).
 *   - Estacionalidad de la demanda (curva mensual).
 *
 * Hasta entonces: andamio sobrio (no se simulan datos · CLAUDE.md). Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'

export function DemandaMercadosView() {
  return (
    <TurismoSectionStub
      glyph="◍"
      eyebrow="TURISMO · DEMANDA Y MERCADOS"
      title="Demanda y mercados emisores"
      desc="Llegadas por país de residencia (FRONTUR), gasto por mercado (EGATUR), turismo de residentes (ETR) y estacionalidad de la demanda."
      sprint="T4"
      fuentes={['INE FRONTUR', 'INE EGATUR', 'INE ETR/FAMILITUR', 'Eurostat']}
    />
  )
}

export default DemandaMercadosView
