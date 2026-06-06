'use client'
/**
 * <ImpactoEconomicoView /> · Turismo v3 · TurismoShell · Sprint T9 (profundidad)
 *
 * Impacto económico del turismo, con LENTE TURÍSTICA (no replica el cuadro macro
 * general de /macro). Cuatro bloques, todos sobre el envelope `{ ok, data, ... }`:
 *
 *   1. <ImpactoMacroPanel />        · peso macro: %PIB turístico (bop_its6_det),
 *      empleo HORECA (lfsq_egan2) y gasto del turismo receptor (EGATUR).
 *   2. <ImpactoGastoPublicoPanel /> · tabla PERTE/planes (presupuesto·fuente·
 *      fecha) + total; honesto sobre la ausencia de dato de ejecución.
 *   3. <ImpactoEmpresasResumen /> + <TurismoEmpresasPanel /> · cotizadas del
 *      sector: KPIs agregados (nº · sesgo del día · por segmento) sobre el grid
 *      canónico de fichas (que NO se toca).
 *   4. <ImpactoLecturaAnalista />   · 1-2 líneas sobre dependencia y riesgos
 *      (estacionalidad · concentración de mercados).
 *
 * Degradación honesta (CLAUDE.md): cada bloque degrada por su cuenta; no se
 * inventan valores. Cero emojis · Unicode geométrico.
 */
import { TurismoEmpresasPanel } from './TurismoEmpresasPanel'
import { ImpactoMacroPanel } from './ImpactoMacroPanel'
import { ImpactoGastoPublicoPanel } from './ImpactoGastoPublicoPanel'
import { ImpactoEmpresasResumen } from './ImpactoEmpresasResumen'
import { ImpactoLecturaAnalista } from './ImpactoLecturaAnalista'

export function ImpactoEconomicoView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1 · Peso macro del turismo (lente turística). */}
      <ImpactoMacroPanel />

      {/* 2 · Gasto público · PERTE y planes. */}
      <ImpactoGastoPublicoPanel />

      {/* 3 · Cotizadas del sector: resumen agregado + grid canónico de fichas. */}
      <ImpactoEmpresasResumen />
      <TurismoEmpresasPanel />

      {/* 4 · Lectura para el analista. */}
      <ImpactoLecturaAnalista />
    </div>
  )
}

export default ImpactoEconomicoView
