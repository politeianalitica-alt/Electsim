'use client'
/**
 * <TurismoSectionStub /> · Turismo v3 · Sprint T1
 *
 * Andamio sobrio "Sección en construcción" para las vistas del TurismoShell
 * que la Ola 2 llenará (Demanda, Alojamiento, Destinos, Tipos, Conectividad,
 * Impacto económico). Mismo lenguaje visual que SectorPanel / EnergiaComingSoon:
 * cabecera de sección (eyebrow + título + descripción) + nota de construcción.
 *
 * Cada vista stub aporta su `glyph` Unicode (no emoji), `title`, `eyebrow`,
 * `desc` (qué cubrirá) y opcionalmente las `fuentes` que consumirá, para que el
 * andamio comunique la intención sin simular datos. Cero emojis · Unicode
 * geométrico (◧ ◍ ◫ …). Degradación honesta: no se inventa contenido.
 */

interface TurismoSectionStubProps {
  /** Marca Unicode (no emoji) de la sección. */
  glyph: string
  /** Eyebrow superior (mayúsculas, p.ej. "TURISMO · DEMANDA"). */
  eyebrow: string
  /** Título de la sección. */
  title: string
  /** Una línea de qué cubrirá la sección. */
  desc: string
  /** Sprint en el que se construye (para el placeholder). */
  sprint: string
  /** Fuentes que la sección consumirá (chips informativos). Opcional. */
  fuentes?: string[]
}

const ACCENT = '#0EA5E9'

export function TurismoSectionStub({
  glyph,
  eyebrow,
  title,
  desc,
  sprint,
  fuentes,
}: TurismoSectionStubProps) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '56px 28px',
        textAlign: 'center',
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 40, color: ACCENT, opacity: 0.85, lineHeight: 1 }}>
        {glyph}
      </div>
      <p
        style={{
          margin: '16px 0 4px',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: ACCENT,
        }}
      >
        {eyebrow}
      </p>
      <h2
        style={{
          margin: '0 0 6px',
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#1d1d1f',
        }}
      >
        {title}
      </h2>
      <p style={{ margin: '0 auto 4px', maxWidth: 560, fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.5 }}>
        {desc}
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 11.5, color: '#6e6e73' }}>
        Sección en construcción · Sprint {sprint}
      </p>
      {fuentes && fuentes.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          {fuentes.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 10,
                padding: '3px 9px',
                background: '#F5F5F7',
                color: '#6e6e73',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export default TurismoSectionStub
