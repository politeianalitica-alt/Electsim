'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function RiesgoSistemicoTab() {
  return (
    <TabPlaceholder
      tabId="riesgo-sistemico"
      sprintLabel="Sprint M3"
      sectionsPreview={[
        'Semáforo riesgo · 5 indicadores · spread soberano · deuda externa · déficit · inflation gap · FX vol',
        'Spread vs Bund 10Y · serie 5y con eventos políticos overlay',
        'Reservas internacionales BdE · gold + foreign currency',
        'Fragility index compuesto · BIS cross-border + IMF deuda + spread + ULC',
        'Alertas activas · lista de triggers superados con notificación',
      ]}
    />
  )
}
export default RiesgoSistemicoTab
