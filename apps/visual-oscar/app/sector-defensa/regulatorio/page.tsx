import { DefenseComingSoon } from '../_components/DefenseComingSoon'

export const metadata = {
  title: 'Regulatorio · Defensa | Politeia',
}

export default function RegulatorioPage() {
  return (
    <DefenseComingSoon
      tab="Regulatorio & Compliance"
      description="Evaluador automático de restricciones ITAR, EAR y sanciones EU/US/UK. Heatmap país-tecnología, feed de entidades sancionadas e informes de compliance en PDF."
      features={[
        'Export Control Heatmap país × tecnología',
        'Evaluador ITAR Part 121 · EAR CCL',
        'Sanciones EU · US OFAC · UN · UK',
        'Feed OpenSanctions en tiempo real',
        'Timeline de cambios regulatorios',
        'Informe compliance PDF por LLM',
        'ExportControl Compliance Agent',
        'OCCRP Aleph · entidades opacas',
      ]}
      sprint="Sprint 4"
    />
  )
}
