'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function MargenFiscalTab() {
  return (
    <TabPlaceholder
      tabId="margen-fiscal"
      sprintLabel="Sprint M2"
      sectionsPreview={[
        'Trayectoria deuda %PIB · serie 20 años + forecast fan chart (IMF + AIReF)',
        'Saldo fiscal descompuesto · primary balance vs intereses (IMF)',
        'Ingresos vs gastos AAPP · stacked monthly (IGAE + INE CNT)',
        'Intereses % ingresos · alerta si rebasa 8% (IMF/Eurostat)',
        'Comparativa UE · top 5 países + España en barra horizontal',
        'Ejecución presupuestaria mensual del año actual (IGAE)',
      ]}
    />
  )
}
export default MargenFiscalTab
