'use client'
import { TabPlaceholder } from './TabPlaceholder'

export function MercadosActivosTab() {
  return (
    <TabPlaceholder
      tabId="mercados-activos"
      sprintLabel="Sprint M4"
      sectionsPreview={[
        'IBEX 35 live · componentes sectoriales + ADRs SAN/BBVA/TEF/FER (Finnhub)',
        'Curva bonos · ES vs DE vs FR vs IT 1m-30y',
        'FX panel · EUR/USD · DXY · JPY · GBP · CHF',
        'Commodities grid · oil WTI/Brent · gold · copper · BDI (reutiliza /api/commodities)',
        'Crypto top 5 · BTC · ETH · BNB · SOL · XRP',
        'Volatility & risk-off · ^VIX · ECB risk indicator',
      ]}
    />
  )
}
export default MercadosActivosTab
