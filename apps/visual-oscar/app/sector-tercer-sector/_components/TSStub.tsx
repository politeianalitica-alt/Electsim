'use client'
/**
 * <TSStub /> · Tercer Sector v3 · Sprint TS1
 *
 * Empty-state "en construcción" compartido por las vistas del shell que la Ola 2
 * (TS4-TS8) aún tiene que llenar. Cabecera (eyebrow + título + descripción) +
 * nota de sprint, con el mismo lenguaje visual que los paneles existentes
 * (SectorPanel). Cero emojis · Unicode geométrico.
 *
 * Cada vista stub envuelve esto con su glyph, título, descripción y sprint, de
 * modo que cuando la Ola 2 reescriba la vista solo sustituye el cuerpo sin tocar
 * el shell ni la navegación.
 */

const ACCENT = '#16A34A'

export interface TSStubProps {
  /** Marca Unicode (no emoji) grande de la cabecera. */
  glyph: string
  /** Cinta superior en mayúsculas (eyebrow). */
  eyebrow: string
  /** Título de la sección. */
  title: string
  /** Descripción de lo que cubrirá la vista cuando esté completa. */
  desc: string
  /** Sprint de la Ola 2 que llenará la vista (para la nota). */
  sprint: string
}

export function TSStub({ glyph, eyebrow, title, desc, sprint }: TSStubProps) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '64px 28px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: ACCENT,
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}
      >
        {eyebrow}
      </p>
      <div aria-hidden="true" style={{ fontSize: 42, color: ACCENT, opacity: 0.85, lineHeight: 1 }}>
        {glyph}
      </div>
      <h2
        style={{
          margin: '18px 0 6px',
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#1d1d1f',
        }}
      >
        {title}
      </h2>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6e6e73' }}>
        En construcción · Sprint {sprint}
      </p>
      <p style={{ margin: '0 auto', maxWidth: 560, fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        {desc}
      </p>
    </section>
  )
}

export default TSStub
