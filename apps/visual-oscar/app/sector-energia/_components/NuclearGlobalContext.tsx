'use client'
/**
 * <NuclearGlobalContext /> · Energía v3 · Sprint E5 (Nuclear profundo)
 *
 * Contexto internacional curado del sector nuclear, mejor formateado que la
 * lista plana anterior:
 *   - Cards de `NUCLEAR_GLOBAL_CONTEXT` (IAEA PRIS / WNA): parque mundial,
 *     nueva construcción, SMR, posición de España. Con icono geométrico por
 *     tipo de nota y la fuente citada.
 *   - Tarjeta de referencia del uranio (`URANIO_REF`, U3O8 / yellowcake) con su
 *     tendencia, fecha y fuente. Sin dataset en vivo → honesto.
 *   - Enlaces directos a IAEA PRIS (Power Reactor Information System) y a UxC.
 *
 * Lee del catálogo curado (sin fetch). Cero emojis · Unicode geométrico
 * (⬡ ◉ ✦ ⟶).
 */
import { NUCLEAR_GLOBAL_CONTEXT, URANIO_REF } from '@/lib/energia/catalog'

const NUCLEAR = '#7c3aed'

const IAEA_PRIS_URL = 'https://pris.iaea.org/PRIS/home.aspx'

// Icono geométrico por palabra clave de la nota (Unicode, sin emojis).
function glyphFor(titular: string): string {
  const t = titular.toLowerCase()
  if (/smr|modular/.test(t)) return '✦'
  if (/china|construc/.test(t)) return '⬢'
  if (/españa|contracorriente|cierre/.test(t)) return '◐'
  return '◉'
}

export default function NuclearGlobalContext() {
  return (
    <div>
      {/* Grid de notas curadas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {NUCLEAR_GLOBAL_CONTEXT.map((n) => (
          <div
            key={n.titular}
            style={{
              background: '#fff',
              border: '1px solid #ECECEF',
              borderRadius: 12,
              padding: '13px 15px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: 16, color: NUCLEAR, lineHeight: 1, marginTop: 1 }}>
                {glyphFor(n.titular)}
              </span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
                {n.titular}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{n.detalle}</div>
            <div style={{ fontSize: 9, color: '#A0A0A5', marginTop: 'auto', paddingTop: 4 }}>{n.fuente}</div>
          </div>
        ))}
      </div>

      {/* Fila inferior: uranio + enlaces a fuentes globales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, marginTop: 10 }}>
        {/* Uranio */}
        <div style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #FAFAFA 100%)', border: '1px solid #DDD6FE', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6e6e73' }}>
              Combustible · uranio U3O8 (yellowcake)
            </div>
            <a href={URANIO_REF.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, fontWeight: 700, color: NUCLEAR, textDecoration: 'none' }}>
              UxC ⟶
            </a>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-display)', color: URANIO_REF.precio_usd_lb != null ? NUCLEAR : '#C0C0C5', letterSpacing: '-0.02em', marginTop: 4 }}>
            {URANIO_REF.precio_usd_lb != null ? `${URANIO_REF.precio_usd_lb.toLocaleString('es-ES')} ` : '— '}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#86868b' }}>USD/lb</span>
          </div>
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '5px 10px' }}>
            <span aria-hidden="true">⟶</span> {URANIO_REF.tendencia}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 10, color: '#86868b', lineHeight: 1.5 }}>
            {URANIO_REF.fuente} Referencia: {URANIO_REF.fecha_ref}. Sin dataset en vivo en las fuentes configuradas
            (UxC/TradeTech publican semanalmente sin API pública gratuita).
          </p>
        </div>

        {/* Enlaces a fuentes globales */}
        <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6e6e73' }}>
            Fuentes internacionales
          </div>
          <SourceLink
            href={IAEA_PRIS_URL}
            titular="IAEA PRIS"
            detalle="Power Reactor Information System · parque mundial, reactores en operación / construcción / cierre por país"
          />
          <SourceLink
            href="https://world-nuclear.org/"
            titular="World Nuclear Association"
            detalle="Datos y análisis de la industria nuclear global (capacidad, nuevos proyectos, SMR)"
          />
          <SourceLink
            href={URANIO_REF.source_url}
            titular="UxC · uranio"
            detalle="Precio spot de referencia del U3O8 (yellowcake)"
          />
        </div>
      </div>
    </div>
  )
}

function SourceLink({ href, titular, detalle }: { href: string; titular: string; detalle: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'block', textDecoration: 'none', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 9, padding: '8px 11px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: NUCLEAR, fontFamily: 'var(--font-display)' }}>{titular}</span>
        <span aria-hidden="true" style={{ fontSize: 12, color: NUCLEAR }}>⟶</span>
      </div>
      <div style={{ fontSize: 10, color: '#6e6e73', lineHeight: 1.45, marginTop: 2 }}>{detalle}</div>
    </a>
  )
}
