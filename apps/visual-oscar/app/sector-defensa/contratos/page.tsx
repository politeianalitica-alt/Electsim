import { DefenseComingSoon } from '../_components/DefenseComingSoon'

export const metadata = {
  title: 'Contratos · Defensa | Politeia',
}

export default function ContratosPage() {
  return (
    <DefenseComingSoon
      tab="Monitor de Contratos"
      description="Inteligencia competitiva en tiempo real sobre licitaciones y adjudicaciones de defensa globales. Mapa interactivo, tabla avanzada y alertas configurables."
      features={[
        'Mapa global Mapbox con burbujas por valor',
        'Contratos DoD · USASpending.gov',
        'Licitaciones activas · SAM.gov',
        'Contratos UE · TED + PLACSP',
        'Filtros por capability, país, empresa',
        'AI summary por contrato',
        'Alertas configurables por umbral',
        'ContractRadar Agent 24/7',
      ]}
      sprint="Sprint 2"
    />
  )
}
