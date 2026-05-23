'use client'
/**
 * `<HogaresExtrasBlock />` · Sprint N4.
 *
 * Bloque exclusivo de hogares-empleo-vivienda con dos secciones:
 *  1. Segmentos sociales · 5 cards que linkan a /macro/hogares-empleo-vivienda/segment/[id]
 *  2. Percepción CIS · 3 cards que linkan a /macro/hogares-empleo-vivienda/cis/[id]
 *
 * Renderizado condicional desde SubtabContent cuando subtabSlug === 'hogares-empleo-vivienda'.
 */
import Link from 'next/link'
import { listHogaresSegments } from '@/lib/macro/hogares-segments'
import { listHogaresCisCrossings } from '@/lib/macro/hogares-cis'

export function HogaresExtrasBlock() {
  const segments = listHogaresSegments()
  const cisCrossings = listHogaresCisCrossings()

  return (
    <>
      {/* Segmentos sociales */}
      <section
        style={{
          background: 'linear-gradient(180deg, #faf5ff 0%, #fff 60%)',
          border: '1px solid #e9d5ff',
          borderLeft: '4px solid #8b5cf6',
          borderRadius: 10,
          padding: 16,
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#8b5cf6', textTransform: 'uppercase' }}>
            Segmentos sociales · {segments.length} cohortes con presión específica
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569', maxWidth: 760 }}>
            Quién soporta realmente la presión macro. Click sobre cualquier segmento para análisis filtrado de empleo, vivienda y CIS.
          </p>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {segments.map((s) => (
            <Link
              key={s.id}
              href={`/macro/hogares-empleo-vivienda/segment/${s.id}`}
              style={{
                display: 'block',
                background: '#fff',
                border: `1px solid #e5e7eb`,
                borderLeft: `3px solid ${s.accent}`,
                borderRadius: 8,
                padding: 12,
                textDecoration: 'none',
                color: '#0f172a',
                transition: 'transform 120ms ease, box-shadow 120ms ease',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: s.accent }}>{s.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
                {s.description.length > 130 ? s.description.slice(0, 130) + '…' : s.description}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 10, fontStyle: 'italic', color: '#94a3b8' }}>
                → {s.analyticalQuestion.length > 100 ? s.analyticalQuestion.slice(0, 100) + '…' : s.analyticalQuestion}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Percepción CIS */}
      <section
        style={{
          background: 'linear-gradient(180deg, #fef2f2 0%, #fff 60%)',
          border: '1px solid #fecaca',
          borderLeft: '4px solid #dc2626',
          borderRadius: 10,
          padding: 16,
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#dc2626', textTransform: 'uppercase' }}>
            Percepción CIS · {cisCrossings.length} cruces opinión vs realidad
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569', maxWidth: 760 }}>
            Cruza la serie del problema percibido (CIS) con el indicador económico real para detectar desalineamientos políticos.
          </p>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {cisCrossings.map((c) => (
            <Link
              key={c.id}
              href={`/macro/hogares-empleo-vivienda/cis/${c.id}`}
              style={{
                display: 'block',
                background: '#fff',
                border: `1px solid #e5e7eb`,
                borderLeft: `3px solid ${c.accent}`,
                borderRadius: 8,
                padding: 12,
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.accent }}>{c.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
                {c.description.length > 140 ? c.description.slice(0, 140) + '…' : c.description}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 10, fontStyle: 'italic', color: '#94a3b8' }}>
                → {c.analyticalQuestion.length > 110 ? c.analyticalQuestion.slice(0, 110) + '…' : c.analyticalQuestion}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

export default HogaresExtrasBlock
