import { DefenseComingSoon } from '../_components/DefenseComingSoon'

export const metadata = {
  title: 'Programas · Defensa | Politeia',
}

export default function ProgramasPage() {
  return (
    <DefenseComingSoon
      tab="Programas de Adquisición"
      description="Tracker de los principales programas de adquisición globales. Gantt interactivo con fases, hitos y alertas. Grafo de cadena de suministro industrial."
      features={[
        'Gantt interactivo de programas',
        'FCAS · S-80 · F-110 · Eurofighter · NH-90',
        'Fichas con fases y prime contractor',
        'Supply chain graph D3 force-directed',
        'Tracker de hitos y alertas de fase',
        'Matriz capacidad × país',
        'ProgramTracker Agent',
        'OCCAR + SAM.gov RFIs',
      ]}
      sprint="Sprint 3"
    />
  )
}
