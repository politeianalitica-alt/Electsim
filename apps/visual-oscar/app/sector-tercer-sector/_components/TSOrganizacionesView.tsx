'use client'
/**
 * <TSOrganizacionesView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS4
 *
 * STUB · Directorio DINÁMICO de ONGs y fundaciones (de-hardcodeado): catálogo
 * rico + EU Transparency Register + beneficiarios BDNS, con filtros
 * (tipo/sector/CCAA/ámbito) y ficha por organización (presupuesto, empleo, IRPF,
 * actividades IATI si es reporting org, subvenciones/licitaciones relacionadas).
 * La Ola 2 (TS4) sustituye este cuerpo. Cero emojis · Unicode geométrico.
 */
import { TSStub } from './TSStub'

export function TSOrganizacionesView() {
  return (
    <TSStub
      glyph="◍"
      eyebrow="TERCER SECTOR · ORGANIZACIONES · ONGs"
      title="Organizaciones del tercer sector"
      desc="Directorio dinámico de ONGs, fundaciones y entidades de economía social, con filtros por tipo, sector, CCAA y ámbito, y ficha por organización (presupuesto, empleo, IRPF 0,7%, actividades IATI y financiación relacionada). En desarrollo a partir de fuentes vivas."
      sprint="TS4"
    />
  )
}

export default TSOrganizacionesView
