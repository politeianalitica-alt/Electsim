/**
 * /sector-farma · Politeia Farma v3
 *
 * Página delgada · delega TODA la lógica en <FarmaShell />.
 *   - Shell con 7 sub-tabs (Visión Global, Catálogo, Desabastecimientos,
 *     Pipeline I+D, Mercado, Gasto y Acceso, Regulación).
 *   - Visión Global preserva 100% del dashboard original (CIMA AEMPS).
 *   - 4 endpoints nuevos: /api/farma/eurostat-gasto, /eurostat-acceso,
 *     /ensayos (ClinicalTrials.gov v2), /ema-alertas (EMA RSS).
 *   - Catálogos JSON con fuente verificable + primitivas charts compartidas
 *     con Vivienda v3 en lib/sectores/charts.tsx.
 */
import FarmaShell from './_components/FarmaShell'

export default function SectorFarmaPage() {
  return <FarmaShell />
}
