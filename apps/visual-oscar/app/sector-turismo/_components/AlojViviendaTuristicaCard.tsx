'use client'
/**
 * <AlojViviendaTuristicaCard /> · Turismo v3 · Sprint T5
 *
 * Vivienda turística (VT / VUT). DE-DUPLICACIÓN deliberada: el detalle de la
 * vivienda turística —stock de viviendas, plazas, precios, presión sobre el
 * mercado residencial y regulación autonómica/municipal— vive en /sector-vivienda
 * y NO se duplica aquí. Esta tarjeta es solo un puente sobrio: explica qué es la
 * VT frente al alojamiento colectivo (hoteles/apartamentos/campings/rural de
 * arriba) y enlaza a Vivienda.
 *
 * El endpoint /api/turismo/ocupacion cubre EOH/EOAP/EOAC/EOTR (alojamiento
 * colectivo reglado); no incluye un agregado de VT, así que —honestidad,
 * CLAUDE.md— no se inventa cifra: se remite a /sector-vivienda. Cero emojis.
 */
import Link from 'next/link'
import { ACCENT } from './AlojShared'

export function AlojViviendaTuristicaCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span aria-hidden="true" style={{ fontSize: 15, color: ACCENT, lineHeight: 1 }}>⌂</span>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#1d1d1f' }}>
            Vivienda turística (VT)
          </h3>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 5,
              background: '#F5F5F7',
              color: '#6e6e73',
            }}
          >
            Detalle en Vivienda
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.55, maxWidth: 720 }}>
          Las cuatro categorías de arriba son <strong>alojamiento colectivo reglado</strong> (hoteles, apartamentos
          turísticos, campings y turismo rural · encuestas INE EOH/EOAP/EOAC/EOTR). La vivienda turística —pisos
          completos de uso turístico— es un segmento distinto: su stock de viviendas y plazas, precios, peso sobre
          el parque residencial y la regulación autonómica y municipal se analizan en el módulo de Vivienda, no se
          duplican aquí.
        </p>
      </div>
      <Link
        href="/sector-vivienda"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: '#fff',
          background: ACCENT,
          borderRadius: 10,
          padding: '10px 16px',
          textDecoration: 'none',
        }}
      >
        Ver vivienda turística en Vivienda <span aria-hidden="true">⟶</span>
      </Link>
    </div>
  )
}

export default AlojViviendaTuristicaCard
