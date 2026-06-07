'use client'
/**
 * <CtxMarcoRegulatorio /> · Tercer Sector v3 · Sprint TS8 · Contexto e impacto
 *
 * Marco regulatorio del tercer sector en España: tarjetas CURADAS Y DATADAS de
 * las normas que estructuran el sector, cada una con su referencia BOE, fecha y
 * enlace a la fuente oficial. NO hay cifras inventadas: solo referencias legales
 * verificables (BOE) y una síntesis breve de qué regula cada norma.
 *
 * Fuentes (verificadas · jun 2026):
 *   - Ley 43/2015, de 9 de octubre, del Tercer Sector de Acción Social
 *     · BOE-A-2015-10922 · BOE núm. 243, 10/10/2015.
 *   - Ley 49/2002, de 23 de diciembre, de régimen fiscal de las entidades sin
 *     fines lucrativos y de los incentivos fiscales al mecenazgo
 *     · BOE-A-2002-25039 · reformada por el Real Decreto-ley 6/2023 (en vigor
 *     1/1/2024): deducción IRPF del 80% hasta 250 € y 40% del resto (45% si es
 *     donación recurrente), y 40% en el Impuesto sobre Sociedades.
 *   - Ley 45/2015, de 14 de octubre, de Voluntariado
 *     · BOE-A-2015-11072 · BOE núm. 247, 15/10/2015.
 *   - Ley 50/2002, de 26 de diciembre, de Fundaciones
 *     · BOE-A-2002-25180.
 *
 * Cero emojis · Unicode geométrico (⬡). Patrón visual de tarjeta sobrio (mismo
 * lenguaje que el resto del sector).
 */

const ACCENT = '#16A34A'

interface NormaCard {
  id: string
  titulo: string
  /** Subtítulo corto (qué regula, una línea). */
  ambito: string
  /** Síntesis (2-3 líneas) de lo que establece. */
  resumen: string
  /** Datos clave verificables (chips: referencia BOE, fecha, dato fiscal). */
  datos: Array<{ label: string; value: string }>
  fuente: string
  fuenteUrl: string
  fecha: string
}

const NORMAS: NormaCard[] = [
  {
    id: 'ley-43-2015',
    titulo: 'Ley 43/2015 · Tercer Sector de Acción Social',
    ambito: 'Norma marco que define y reconoce el sector',
    resumen:
      'Define las entidades del Tercer Sector de Acción Social (TSAS), reconoce su papel como interlocutor y colaborador de las administraciones, y mandata medidas de fomento. Es la norma cabecera que da identidad jurídica propia al sector.',
    datos: [
      { label: 'Referencia', value: 'BOE-A-2015-10922' },
      { label: 'Rango', value: 'Ley estatal' },
      { label: 'Publicación', value: 'BOE núm. 243' },
    ],
    fuente: 'BOE · Jefatura del Estado',
    fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10922',
    fecha: '9 oct 2015',
  },
  {
    id: 'ley-49-2002',
    titulo: 'Ley 49/2002 · Mecenazgo y régimen fiscal',
    ambito: 'Fiscalidad de entidades sin fines lucrativos y donaciones',
    resumen:
      'Regula el régimen fiscal especial de las entidades sin fines lucrativos y los incentivos al mecenazgo. Reformada por el Real Decreto-ley 6/2023 (en vigor 1/1/2024): eleva la deducción en IRPF al 80% de los primeros 250 € donados y al 40% del resto (45% en donaciones recurrentes), y al 40% en el Impuesto sobre Sociedades.',
    datos: [
      { label: 'Referencia', value: 'BOE-A-2002-25039' },
      { label: 'Reforma', value: 'RDL 6/2023 · 1/1/2024' },
      { label: 'IRPF', value: '80% hasta 250 € · 40% resto' },
    ],
    fuente: 'BOE · Jefatura del Estado',
    fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-25039',
    fecha: '23 dic 2002',
  },
  {
    id: 'ley-45-2015',
    titulo: 'Ley 45/2015 · Voluntariado',
    ambito: 'Estatuto de la persona voluntaria y de las entidades',
    resumen:
      'Establece el marco del voluntariado: derechos y deberes de las personas voluntarias, obligaciones de las entidades (seguro, formación, acuerdo de incorporación) y ámbitos de actuación. Deroga la Ley 6/1996 y amplía el concepto más allá de la acción social.',
    datos: [
      { label: 'Referencia', value: 'BOE-A-2015-11072' },
      { label: 'Rango', value: 'Ley estatal' },
      { label: 'Publicación', value: 'BOE núm. 247' },
    ],
    fuente: 'BOE · Jefatura del Estado',
    fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11072',
    fecha: '14 oct 2015',
  },
  {
    id: 'ley-50-2002',
    titulo: 'Ley 50/2002 · Fundaciones',
    ambito: 'Constitución, gobierno y supervisión de fundaciones',
    resumen:
      'Regula las fundaciones de competencia estatal: constitución, patronato, dotación, actividades y régimen de protectorado y registro. Es la columna vertebral del subsector fundacional, una de las formas jurídicas mayoritarias del tercer sector.',
    datos: [
      { label: 'Referencia', value: 'BOE-A-2002-25180' },
      { label: 'Rango', value: 'Ley estatal' },
      { label: 'Supervisión', value: 'Protectorado + Registro' },
    ],
    fuente: 'BOE · Jefatura del Estado',
    fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-25180',
    fecha: '26 dic 2002',
  },
]

export function CtxMarcoRegulatorio() {
  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: '-0.013em',
            color: '#1d1d1f',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span aria-hidden="true" style={{ color: ACCENT, fontSize: 13 }}>⬡</span>
          Marco regulatorio
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Normas que estructuran el sector · referencias BOE verificables, curadas y datadas
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        {NORMAS.map((n) => (
          <article
            key={n.id}
            style={{
              border: '1px solid #ECECEF',
              borderRadius: 12,
              padding: '14px 16px',
              background: '#FBFBFC',
              borderTop: `3px solid ${ACCENT}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 13.5,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#1d1d1f',
                lineHeight: 1.3,
              }}
            >
              {n.titulo}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 10.5, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {n.ambito}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#3a3a3c', lineHeight: 1.55 }}>{n.resumen}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 0' }}>
              {n.datos.map((d) => (
                <span
                  key={d.label}
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    background: '#fff',
                    border: '1px solid #ECECEF',
                    borderRadius: 8,
                    padding: '5px 9px',
                  }}
                >
                  <span style={{ fontSize: 8.5, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {d.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#1d1d1f', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {d.value}
                  </span>
                </span>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <a
                href={n.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
              >
                {n.fuente} →
              </a>
              <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{n.fecha}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default CtxMarcoRegulatorio
