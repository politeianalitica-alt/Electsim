'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function PulsoMacroTab() {
  return (
    <TabPlaceholder
      tabId="pulso-macro"
      sprintLabel="Sprint M2"
      sectionsPreview={[
        'Hero KPIs flash · PIB YoY · paro · producción industrial · confianza · output gap',
        'Desglose PIB CNT trimestral · consumo H + AAPP + inversión + exterior (INE)',
        'Forecast IMF WEO 5 años (reutiliza ImfWeoForecast existente)',
        'Leading indicators 6m forward · PMI · confianza · energía · transporte · empleo',
        'Mini-comparativa ES vs UE-27 · top 4 países + EU avg',
      ]}
    />
  )
}
export default PulsoMacroTab
