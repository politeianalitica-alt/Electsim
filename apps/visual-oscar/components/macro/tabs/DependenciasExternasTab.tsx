'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function DependenciasExternasTab() {
  return (
    <TabPlaceholder
      tabId="dependencias-externas"
      sprintLabel="Sprint M3"
      sectionsPreview={[
        'Top 10 partners exports/imports · OEC bilateral con HHI',
        'Concentración HHI semáforo · verde <1500 · ámbar 1500-2500 · rojo >2500',
        'Productos críticos HS4 top 15 · drill-down click → drawer (OEC)',
        'Cuenta corriente trimestral · 5 años (IMF + Eurostat)',
        'Dependencia energética · % imports energía/PIB · gauge',
        'Trade complexity ECI · ranking España global (OEC)',
      ]}
    />
  )
}
export default DependenciasExternasTab
