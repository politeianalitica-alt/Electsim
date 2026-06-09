'use client'
/**
 * Stubs honestos para sub-tabs Farma cuyo contenido específico aterriza más
 * adelante (por ahora delega al buscador / desabastecimientos de la
 * Visión Global, que ya están en vivo).
 */
import Link from 'next/link'

interface Props {
  glyph: string
  titulo: string
  subtitulo: string
  proximamente: string[]
}

function FarmaStub({ glyph, titulo, subtitulo, proximamente }: Props) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 18,
        padding: '36px 40px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 28, color: '#0EA5E9' }}>{glyph}</span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {titulo}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 22px', maxWidth: 760, lineHeight: 1.5 }}>{subtitulo}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {proximamente.map((p, i) => (
          <div
            key={i}
            style={{
              padding: '14px 16px',
              background: '#FAFAFA',
              borderRadius: 12,
              border: '1px solid #ECECEF',
              borderLeft: '3px solid #0EA5E9',
              fontSize: 12,
              color: '#3a3a3d',
              lineHeight: 1.5,
            }}
          >
            {p}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '14px 16px',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: 12,
          fontSize: 12,
          color: '#075985',
          lineHeight: 1.5,
        }}
      >
        Mientras tanto, el catálogo CIMA, el buscador AEMPS y los desabastecimientos
        en vivo están en{' '}
        <Link href="/sector-farma?fr=global" style={{ color: '#075985', fontWeight: 700 }}>
          Visión Global
        </Link>
        .
      </div>
    </section>
  )
}

export function FarmaCatalogoView() {
  return (
    <FarmaStub
      glyph="⊞"
      titulo="Catálogo de medicamentos"
      subtitulo="Vista profunda del buscador CIMA. Por ahora el buscador con todos los filtros vive en Visión Global. Esta sub-tab se ampliará con vistas guardadas, comparativa principio activo vs marca y cruce con Eurostat hlth_dlm010 (consumo)."
      proximamente={[
        'Buscador CIMA AEMPS con todos los filtros',
        'Comparativa principio activo (genérico) vs marca registrada',
        'Vistas guardadas por área terapéutica',
        'Mapa de comercializados vs autorizados',
        'Cruce con Eurostat hlth_dlm010 · consumo por ATC',
      ]}
    />
  )
}

export function FarmaDesabastecimientosView() {
  return (
    <FarmaStub
      glyph="◉"
      titulo="Desabastecimientos en profundidad"
      subtitulo="Vista profunda de problemas de suministro. La línea temporal, el desglose por tipo de problema y la lista ya están en Visión Global. Esta sub-tab añadirá cruce con EMA Shortages para detectar desabastecimientos paneuropeos."
      proximamente={[
        'Cruce AEMPS Psuministro × EMA Medicine Shortages',
        'Identificación de desabastecimientos paneuropeos vs locales',
        'Top principios activos con más alertas activas',
        'Heatmap por mes + por tipo de problema',
        'Alertas tempranas de fin de comercialización',
      ]}
    />
  )
}
