'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function RegimenMonetarioTab() {
  return (
    <TabPlaceholder
      tabId="regimen-monetario"
      sprintLabel="Sprint M2"
      sectionsPreview={[
        'Curva de tipos SVG · yields 1m-30y (ECB SDW)',
        'HICP componentes · energía · alimentos · servicios · no-energéticos (Eurostat)',
        'Política BCE · DFR · MRO · depo rate · ECB SPF expectativas 2y/5y',
        'Tipos reales (nominal - inflación) por país UE',
        'Lectura Politeia · narrativa monetaria generada por IA',
      ]}
    />
  )
}
export default RegimenMonetarioTab
