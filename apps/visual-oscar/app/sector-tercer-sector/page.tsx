'use client'
/**
 * /sector-tercer-sector · Tercer Sector v3
 *
 * La página antes era PLANA (596 líneas: 30 ONGs seed hardcodeadas + KPIs +
 * panel IATI + programas/marco estáticos). Desde el Sprint TS1 delega en
 * <TercerSectorShell />, un shell con navegación de 2 niveles (6 secciones,
 * lazy-mount, estado en `?ts=`) equivalente al de energía y turismo.
 *
 * La funcionalidad viva anterior (KPIs agregados + panel IATI en vivo
 * `/api/iati/spain-overview`) se preserva en la sección por defecto «Visión
 * Global» (TSVisionGlobalView). El resto de secciones —Organizaciones,
 * Cooperación, Financiación, Licitaciones y Contexto— las llena la Ola 2.
 */
import TercerSectorShell from './_components/TercerSectorShell'

export default function SectorTercerSectorPage() {
  return <TercerSectorShell />
}
