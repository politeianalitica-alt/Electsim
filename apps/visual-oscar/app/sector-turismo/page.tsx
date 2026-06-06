'use client'
/**
 * /sector-turismo · Turismo v3
 *
 * La página antes era PLANA (4 KPIs + 2 gráficos + paneles hardcodeados). Desde
 * el Sprint T1 delega en <TurismoShell />, un shell con navegación de 2 niveles
 * (7 secciones, lazy-mount, estado en `?turismo=`) equivalente al de energía.
 *
 * La funcionalidad anterior (KPIs hero + gráficos FRONTUR/EOH + intel + Cuaderno)
 * se preserva en la sección por defecto "Visión Global"
 * (VisionGlobalTurismoView). El resto de secciones las llena la Ola 2.
 */
import TurismoShell from './_components/TurismoShell'

export default function SectorTurismoPage() {
  return <TurismoShell />
}
