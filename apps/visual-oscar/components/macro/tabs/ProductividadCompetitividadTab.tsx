'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function ProductividadCompetitividadTab() {
  return (
    <TabPlaceholder
      tabId="productividad-competitividad"
      sprintLabel="Sprint M5"
      sectionsPreview={[
        'ECI ranking · España global vs top 10 (OEC Economic Complexity)',
        'Productividad laboral · serie 20y vs ULC (gráfico doble eje · Eurostat)',
        'I+D %PIB · España vs UE + comparativa OCDE',
        'Exportaciones high-tech · Eurostat htec',
        'Patentes España OEPM · serie 10y (datos.gob.es)',
        'Productividad por sector · 10 sectores ranking · servicios · industria · construcción',
      ]}
    />
  )
}
export default ProductividadCompetitividadTab
