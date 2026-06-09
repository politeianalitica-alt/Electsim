/**
 * /sector-agro · Politeia Agro v3
 *
 * Página delgada · delega toda la lógica en <AgroShell />.
 * Shell con 6 sub-tabs (Visión Global, Lonjas y Precios, Cadena de Valor,
 * Producción, PAC y Política, Sequía y Agua). La sub-tab "Lonjas y Precios"
 * es un mini-Vesper de productos agrícolas con análisis Gemini bajo demanda.
 */
import AgroShell from './_components/AgroShell'

export default function SectorAgroPage() {
  return <AgroShell />
}
