'use client'
/**
 * <TSContextoView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS8
 *
 * CONTEXTO E IMPACTO del tercer sector: lo sitúa en su entorno macro y regulatorio
 * SIN repetir la pestaña /macro general. Cuatro bloques, cada uno degradando por
 * su cuenta (CLAUDE.md · degradación honesta; no se inventan cifras):
 *
 *   1. <CtxPesoMacroPanel />    · peso macro con LENTE SOCIAL, en vivo desde
 *      Eurostat (gasto en protección social %PIB y M€ · COFOG GF10 · gov_10a_exp;
 *      empleo en salud y trabajo social CNAE Q · nama_10_a64_e; comparativa UE).
 *   2. <CtxMarcoRegulatorio /> · tarjetas curadas+datadas de las normas (Ley
 *      43/2015 TSAS, Ley 49/2002 mecenazgo, Ley 45/2015 voluntariado, Ley 50/2002
 *      fundaciones) con referencia BOE, fecha y enlace.
 *   3. <CtxTransparencia />     · acreditaciones (Fundación Lealtad · 9 Principios)
 *      y obligaciones legales de rendición de cuentas · curado+datado.
 *   4. <CtxLecturaAnalista />   · dependencia de la financiación pública y riesgos
 *      (estacionalidad de subvenciones, concentración) · anclado al %PIB en vivo.
 *
 * Cero emojis · Unicode geométrico. La Ola 2 (TS8) sustituye el stub anterior.
 *
 * Cockpit W2 añade, tras el peso macro: la foto TERRITORIAL por CCAA (mapa
 * choropleth + rankings + alertas de hueco · <TerritorioPanel />, reutilizable y
 * también montado en Visión Global) y la BIBLIOTECA de informes/evidencia
 * curada para citar (<CtxInformesBiblioteca />).
 */
import { CtxPesoMacroPanel } from './CtxPesoMacroPanel'
import { TerritorioPanel } from './TerritorioPanel'
import { CtxInformesBiblioteca } from './CtxInformesBiblioteca'
import { CtxMarcoRegulatorio } from './CtxMarcoRegulatorio'
import { CtxTransparencia } from './CtxTransparencia'
import { CtxLecturaAnalista } from './CtxLecturaAnalista'
import { SectorMapPreview } from '@/components/SectorMapPreview'

export function TSContextoView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1 · Peso macro del tercer sector (lente social · en vivo Eurostat). */}
      <CtxPesoMacroPanel />

      {/* 2 · Territorio · foto por CCAA (mapa + rankings + alertas de hueco). */}
      <TerritorioPanel />

      {/* 3 · Biblioteca de informes y evidencia · catálogo curado para citar. */}
      <CtxInformesBiblioteca />

      {/* 4 · Marco regulatorio · normas con referencia BOE. */}
      <CtxMarcoRegulatorio />

      {/* 5 · Transparencia y rendición de cuentas. */}
      <CtxTransparencia />

      {/* 6 · Lectura para el analista · dependencia y riesgos. */}
      <CtxLecturaAnalista />

      {/* Mapa OSINT del sector (último · abajo del todo). */}
      <SectorMapPreview sector="tercer-sector" marginTop={28} />
    </div>
  )
}

export default TSContextoView
