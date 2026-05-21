'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function EmpresasBeneficiosTab() {
  return (
    <TabPlaceholder
      tabId="empresas-beneficios"
      sprintLabel="Sprint M5"
      sectionsPreview={[
        'Cotizadas ES top 20 · por capitalización con P/E + beneficios YoY (Finnhub)',
        'IBEX EPS agregado vs UE Stoxx 600',
        'Demografía empresarial · altas + bajas + quiebras serie 5y (INE DIRCE)',
        'Inversión corporativa · capex agregado',
        'Márgenes por sector · Eurostat sbs_na',
        'Earnings calendar próximas 2 semanas (Finnhub)',
      ]}
    />
  )
}
export default EmpresasBeneficiosTab
