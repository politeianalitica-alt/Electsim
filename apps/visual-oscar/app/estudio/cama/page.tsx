import type { Metadata } from 'next'
import CamaModule from '@/app/_components/cama/CamaModule'

export const metadata: Metadata = {
  title: 'Cama · Estudio | Politeia Analítica',
  description: 'Campañas y macroargumentos: narrativas centrales versionadas con evidencias e indicadores de impacto.',
}

export default function EstudioCamaPage() {
  return (
    <div style={{ padding: '8px 4px' }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73' }}>
          Estrategia · Campañas y Macroargumentos
        </div>
        <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
          Cama
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6e6e73', maxWidth: 760, lineHeight: 1.5 }}>
          Crea y compara narrativas centrales: argumentarios versionados con puntos clave,
          evidencias e indicadores de impacto. El repositorio se comparte con War Room,
          Toolbox, Cuaderno y Command Center.
        </p>
      </header>
      <CamaModule espacio="estudio" />
    </div>
  )
}
