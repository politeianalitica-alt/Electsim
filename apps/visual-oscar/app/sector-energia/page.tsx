'use client'
/**
 * /sector-energia · Sector Energía y Suministros
 *
 * Sprint Energía S1 · esta página delega toda la UI en <EnergiaShell />, que
 * implementa la navegación de 2 niveles por tipo de energía (Visión Global ·
 * Eléctrico · Renovables · Nuclear · Petróleo · Gas · Hidrógeno).
 *
 * El contenido histórico (sistema eléctrico ES en directo: ESIOS 9 sub-tabs,
 * paneles REE, empresas, reguladores, áreas, intel) vive ahora dentro de la
 * vista "Eléctrico" (`_components/ElectricoView.tsx`), sin cambios funcionales.
 * Deep-link: `/sector-energia?energia=electrico`.
 */
import EnergiaShell from './_components/EnergiaShell'

export default function SectorEnergiaPage() {
  return <EnergiaShell />
}
