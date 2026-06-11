import type { Metadata } from 'next'
import PreinformesModule from '@/app/_components/preinformes/PreinformesModule'

export const metadata: Metadata = {
  title: 'Preinformes · Estudio | Politeia Analítica',
  description: 'Generador de informes preliminares con plantillas, a partir de paneles, vigilantes, notas y macroargumentos.',
}

export default function EstudioPreinformesPage() {
  return (
    <div style={{ padding: '8px 4px' }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73' }}>
          Estrategia · Informes preliminares
        </div>
        <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
          Preinformes
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6e6e73', maxWidth: 760, lineHeight: 1.5 }}>
          Asistente en 4 pasos para montar borradores de informe: elige plantilla y público,
          selecciona fuentes (paneles, vigilantes, consultas, notas del Cuaderno y
          macroargumentos de la Cama), redacta las secciones y exporta en Markdown o PDF.
        </p>
      </header>
      <PreinformesModule espacio="estudio" />
    </div>
  )
}
