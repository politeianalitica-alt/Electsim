'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function FlujosCapitalTab() {
  return (
    <TabPlaceholder
      tabId="flujos-capital"
      sprintLabel="Sprint M4"
      sectionsPreview={[
        'IED inbound vs outbound · chart 10y stacked (IMF BOP)',
        'Posición inversión internacional NIIP %PIB · serie',
        'Portfolio investment por origen (Eurostat bop_c6_q)',
        'Reservas internacionales · evolución BdE',
        'DataInvex inversión extranjera España · por sector receptor (datos.gob.es)',
        'Cross-border claims BIS · España como counterparty',
      ]}
    />
  )
}
export default FlujosCapitalTab
