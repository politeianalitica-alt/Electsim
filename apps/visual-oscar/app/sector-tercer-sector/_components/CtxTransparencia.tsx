'use client'
/**
 * <CtxTransparencia /> · Tercer Sector v3 · Sprint TS8 · Contexto e impacto
 *
 * Transparencia y rendición de cuentas del tercer sector: contexto CURADO Y
 * DATADO (no cifras inventadas) de los mecanismos de control y acreditación.
 * Dos columnas:
 *   (a) Acreditaciones y sellos voluntarios · qué son y quién los emite.
 *   (b) Obligaciones legales · qué está obligada a hacer una entidad por ley.
 *
 * Fuentes (verificadas · jun 2026):
 *   - Fundación Lealtad · evaluador independiente; "9 Principios de Transparencia
 *     y Buenas Prácticas"; otorga el "Sello ONG Acreditada"; cerca de 300 ONG
 *     acreditadas tras más de 20 años. fundacionlealtad.org.
 *   - Coordinadora de ONGD-España · herramienta de transparencia y buen gobierno
 *     para ONG de desarrollo. coordinadoraongd.org.
 *   - Obligaciones legales: depósito de cuentas anuales en el Registro y
 *     Protectorado (fundaciones, Ley 50/2002) / Registro de asociaciones; auditoría
 *     externa cuando se superan los umbrales de la Ley 49/2002; rendición de la
 *     subvención justificada ante el órgano concedente (Ley 38/2003 General de
 *     Subvenciones) y publicidad en la BDNS.
 *
 * Cero emojis · Unicode geométrico (◉ ✓). Patrón de tarjeta sobrio.
 */

const ACCENT = '#16A34A'

interface AcredItem {
  nombre: string
  emisor: string
  detalle: string
  fuente: string
  fuenteUrl: string
}

const ACREDITACIONES: AcredItem[] = [
  {
    nombre: 'Sello ONG Acreditada',
    emisor: 'Fundación Lealtad',
    detalle:
      'Evaluador independiente que analiza las ONG frente a sus 9 Principios de Transparencia y Buenas Prácticas (gobierno, fin social, uso de fondos, situación económica, voluntariado, comunicación). Cerca de 300 entidades acreditadas tras más de 20 años. Es voluntario, no una certificación oficial.',
    fuente: 'fundacionlealtad.org',
    fuenteUrl: 'https://fundacionlealtad.org/si-eres-ong-transparencia-y-buenas-practicas/conoce-los-9-principios/',
  },
  {
    nombre: 'Herramienta de Transparencia y Buen Gobierno',
    emisor: 'Coordinadora de ONGD-España',
    detalle:
      'Sistema de autodiagnóstico y verificación específico de las ONG de desarrollo, con indicadores de transparencia, gobierno y rendición de cuentas. Obligatorio para las entidades socias de la Coordinadora.',
    fuente: 'coordinadoraongd.org',
    fuenteUrl: 'https://coordinadoraongd.org/',
  },
]

interface ObligItem {
  titulo: string
  detalle: string
  base: string
}

const OBLIGACIONES: ObligItem[] = [
  {
    titulo: 'Depósito de cuentas anuales',
    detalle:
      'Las fundaciones presentan cuentas ante el Protectorado y el Registro de Fundaciones; las asociaciones, ante el Registro correspondiente. Es la rendición de cuentas básica que da publicidad a la actividad económica.',
    base: 'Ley 50/2002 (Fundaciones) · normativa de asociaciones',
  },
  {
    titulo: 'Auditoría externa',
    detalle:
      'Las entidades acogidas al régimen fiscal especial deben someterse a auditoría de cuentas cuando superan los umbrales legales de tamaño (activo, ingresos o plantilla), garantizando el control de un tercero independiente.',
    base: 'Ley 49/2002 · régimen fiscal especial',
  },
  {
    titulo: 'Justificación de subvenciones',
    detalle:
      'Toda subvención pública recibida debe justificarse ante el órgano concedente (memoria + cuenta justificativa) y se publica en la Base de Datos Nacional de Subvenciones (BDNS), de acceso público.',
    base: 'Ley 38/2003 General de Subvenciones · BDNS',
  },
]

export function CtxTransparencia() {
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
          <span aria-hidden="true" style={{ color: ACCENT, fontSize: 13 }}>◉</span>
          Transparencia y rendición de cuentas
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Acreditaciones voluntarias y obligaciones legales · contexto curado y datado
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* (a) Acreditaciones y sellos */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
            Acreditaciones y sellos (voluntarios)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ACREDITACIONES.map((a) => (
              <article key={a.nombre} style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px', background: '#FBFBFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
                    {a.nombre}
                  </h3>
                  <span style={{ fontSize: 9.5, color: ACCENT, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.emisor}</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#3a3a3c', lineHeight: 1.55 }}>{a.detalle}</p>
                <a
                  href={a.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, fontSize: 10, color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
                >
                  {a.fuente} →
                </a>
              </article>
            ))}
          </div>
        </div>

        {/* (b) Obligaciones legales */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
            Obligaciones legales (rendición de cuentas)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OBLIGACIONES.map((o) => (
              <article key={o.titulo} style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px', background: '#FBFBFC' }}>
                <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden="true" style={{ color: ACCENT, fontSize: 11 }}>✓</span>
                  {o.titulo}
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#3a3a3c', lineHeight: 1.55 }}>{o.detalle}</p>
                <p style={{ margin: '8px 0 0', fontSize: 9.5, color: '#9CA3AF', fontWeight: 600 }}>Base · {o.base}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtxTransparencia
