'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function HogaresEmpleoViviendaTab() {
  return (
    <TabPlaceholder
      tabId="hogares-empleo-vivienda"
      sprintLabel="Sprint M5"
      sectionsPreview={[
        'Paro armonizado · serie 10y + breakdown género/edad/CCAA (INE EPA)',
        'Salarios · medio · mediana · P10/P90 (INE encuesta salarios)',
        'Renta disponible real per cápita (Eurostat ilc_di01)',
        'Vivienda precio · IPV INE + transacciones + hipotecas (índice 100=2015)',
        'Renta destinada a vivienda · % alquiler vs hipoteca',
        'Deuda hogares · % renta disponible (Eurostat)',
      ]}
    />
  )
}
export default HogaresEmpleoViviendaTab
