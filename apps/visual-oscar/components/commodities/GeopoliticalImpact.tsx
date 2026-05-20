'use client'

import Link from 'next/link'

/**
 * Cuando el módulo geopolítica esté listo, este componente pasará a
 * consumir `/api/geopolitica/events` cruzando con `/api/commodities/snapshot-all`.
 *
 * Stub estático con 4 eventos icónicos para validar la UX integrada.
 */
const EVENTS = [
  {
    event: 'Sequía Iberia · ola calor mayo',
    affected: ['olive_oil_es', 'wheat_milling_euronext', 'sunflower_oil_es'],
    impact_pct: 4.8,
    date: '2026-05-15',
  },
  {
    event: 'Embargo Mar Negro · prolongado',
    affected: ['wheat_cbot', 'corn_cbot', 'sunflower_oil_es'],
    impact_pct: 6.2,
    date: '2026-04-22',
  },
  {
    event: 'Tensión Estrecho de Ormuz',
    affected: ['brent_crude', 'wti_crude', 'natgas_ttf'],
    impact_pct: 3.5,
    date: '2026-05-02',
  },
  {
    event: 'Tarifa export níquel Indonesia',
    affected: ['nickel_lme', 'copper_lme'],
    impact_pct: 5.1,
    date: '2026-03-30',
  },
]

export function GeopoliticalImpact() {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
        Eventos geopolíticos · impacto observado
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
        {EVENTS.map((e, i) => (
          <li
            key={i}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>{e.event}</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>+{e.impact_pct}%</span>
            </div>
            <span style={{ color: '#6b7280' }}>{e.date}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {e.affected.map((slug) => (
                <Link
                  key={slug}
                  href={`/commodities/${slug}`}
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    borderRadius: 4,
                    textDecoration: 'none',
                  }}
                >
                  {slug}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
        Eventos curados manualmente · v2 vendrá del módulo /geopolitica + GDELT.
      </p>
    </div>
  )
}
