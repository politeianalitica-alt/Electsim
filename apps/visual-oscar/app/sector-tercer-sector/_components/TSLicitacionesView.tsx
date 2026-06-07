'use client'
/**
 * <TSLicitacionesView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS7
 *
 * STUB · PIEZA CENTRAL del sector. Buscador de licitaciones MULTINIVEL
 * (CCAA → nacional ES → UE → otros países → regional extranjero → organismos
 * internacionales) con filtros por nivel, país, CPV/categoría, texto, plazo y
 * valor, más análisis de pliegos por IA (extracción estructurada de requisitos:
 * objeto, presupuesto, plazos, criterios, solvencia, CPV, lotes…). El enfoque es
 * tercer sector / cooperación: las licitaciones generales viven en /licitaciones.
 * La Ola 2 (TS7) sustituye este cuerpo. Cero emojis · Unicode geométrico.
 */
import { TSStub } from './TSStub'

export function TSLicitacionesView() {
  return (
    <TSStub
      glyph="⊞"
      eyebrow="TERCER SECTOR · LICITACIONES · MULTINIVEL"
      title="Licitaciones y convocatorias"
      desc="Buscador multinivel (CCAA, nacional, UE, otros países, regional extranjero y organismos internacionales) con filtros por nivel, país, CPV, plazo y valor, más análisis de pliegos por IA. Enfoque tercer sector y cooperación; las licitaciones generales viven en /licitaciones."
      sprint="TS7"
    />
  )
}

export default TSLicitacionesView
