import { DefenseComingSoon } from '../_components/DefenseComingSoon'

export const metadata = {
  title: 'Presupuestos · Defensa | Politeia',
}

export default function PresupuestosPage() {
  return (
    <DefenseComingSoon
      tab="Presupuestos de Defensa"
      description="Series temporales del gasto militar por país, comparativa OTAN con objetivo 2% y 5% PIB, mapa choropleth mundial y proyecciones tendenciales 2026-2030."
      features={[
        'Series temporales Recharts 2000-2025',
        'SIPRI Military Expenditure Database',
        'Waterfall variación YoY por país',
        'Mapa choropleth mundial',
        'NATO compliance semáforo 2% / 5%',
        'Desglose por categoría (personal, equipo, I+D)',
        'Proyecciones tendenciales 2026-2030',
        'Benchmark España vs. media OTAN',
      ]}
      sprint="Sprint 1"
    />
  )
}
