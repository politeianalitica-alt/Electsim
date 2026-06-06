'use client'
/**
 * <ImpactoEconomicoView /> · Turismo v3 · TurismoShell (stub T1)
 *
 * Impacto económico. La Ola 2 (Sprint T9) la llenará con:
 *   - %PIB turístico (cuenta satélite / bop_its6_det).
 *   - Empleo HORECA (afiliación / EPA).
 *   - Gasto público (ejecución PERTE Turismo).
 *   - Empresas cotizadas del sector (<TurismoEmpresasPanel />).
 *
 * Aquí ya se monta <TurismoEmpresasPanel /> para que el bloque de empresas
 * cotizadas viva en su sección canónica desde T1 (la Ola 2 añade el resto del
 * cuadro macro). Andamio sobrio para lo aún pendiente · CLAUDE.md. Cero emojis.
 */
import { TurismoSectionStub } from './shared/TurismoSectionStub'
import { TurismoEmpresasPanel } from './TurismoEmpresasPanel'

export function ImpactoEconomicoView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TurismoSectionStub
        glyph="◉"
        eyebrow="TURISMO · IMPACTO ECONÓMICO"
        title="Impacto económico"
        desc="Peso del turismo en el PIB (cuenta satélite), empleo en hostelería (HORECA), ejecución del gasto público (PERTE Turismo) y empresas cotizadas del sector."
        sprint="T9"
        fuentes={['INE Cuenta Satélite', 'Eurostat bop_its6_det', 'Seg. Social HORECA', 'PERTE Turismo']}
      />
      {/* Empresas cotizadas del sector · sección canónica desde T1. */}
      <TurismoEmpresasPanel />
    </div>
  )
}

export default ImpactoEconomicoView
