'use client'

const CAPACIDADES = [
  'Caza 5ª/6ª gen.', 'Transporte estratégico', 'Helicóptero ataque',
  'Helicóptero táctico', 'Submarino AIP', 'Fragata 5ª gen.',
  'Misiles hipersónicos', 'Drones tácticos', 'C2 digital',
  'Ciberdefensa', 'Propulsión avanzada', 'Radar AESA',
]

const PAISES_MATRIX = [
  { iso3: 'ESP', label: 'España 🇪🇸' },
  { iso3: 'FRA', label: 'Francia 🇫🇷' },
  { iso3: 'DEU', label: 'Alemania 🇩🇪' },
  { iso3: 'GBR', label: 'R. Unido 🇬🇧' },
  { iso3: 'ITA', label: 'Italia 🇮🇹' },
  { iso3: 'USA', label: 'EE.UU. 🇺🇸' },
]

// Niveles: 0 = no, 1 = parcial/dependiente, 2 = autónomo, 3 = lider
const MATRIX_DATA: Record<string, number[]> = {
  ESP: [1, 2, 2, 2, 2, 2, 0, 1, 1, 1, 1, 2],
  FRA: [2, 2, 2, 2, 0, 2, 1, 2, 2, 2, 2, 3],
  DEU: [1, 2, 1, 2, 1, 2, 0, 2, 2, 2, 2, 2],
  GBR: [2, 2, 1, 1, 2, 2, 1, 2, 3, 3, 2, 3],
  ITA: [1, 1, 1, 2, 1, 2, 0, 1, 1, 1, 1, 2],
  USA: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
}

const NIVEL_CONFIG = [
  { label: 'Sin capacidad',  bg: '#F5F5F7', color: '#D1D5DB', text: '' },
  { label: 'Dependiente',   bg: '#FFF9E6', color: '#F59E0B', text: '◑' },
  { label: 'Autónomo',      bg: '#EFF6FF', color: '#1F4E8C', text: '●' },
  { label: 'Líder OTAN',    bg: '#F0FDF4', color: '#16A34A', text: '★' },
]

export function CapabilityMatrix() {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', minWidth: 90 }}>País</th>
            {CAPACIDADES.map(c => (
              <th key={c} style={{ padding: '6px 6px', textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: '#86868b', minWidth: 72, lineHeight: 1.3 }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAISES_MATRIX.map(p => (
            <tr key={p.iso3} style={{ borderTop: '1px solid #F5F5F7' }}>
              <td style={{ padding: '8px 10px', fontWeight: p.iso3 === 'ESP' ? 700 : 500, color: '#1d1d1f', background: p.iso3 === 'ESP' ? '#FFFBEB' : 'transparent' }}>
                {p.label}
              </td>
              {MATRIX_DATA[p.iso3].map((nivel, i) => {
                const cfg = NIVEL_CONFIG[nivel]
                return (
                  <td
                    key={i}
                    title={`${p.label} · ${CAPACIDADES[i]} · ${cfg.label}`}
                    style={{
                      padding: '6px', textAlign: 'center',
                      background: p.iso3 === 'ESP' ? (nivel === 0 ? '#FFF1F2' : '#FFFBEB') : cfg.bg,
                      color: cfg.color, fontWeight: 700, fontSize: 14,
                    }}
                  >
                    {cfg.text || (nivel === 0 ? '✗' : '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {NIVEL_CONFIG.map(c => (
          <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#6e6e73' }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: c.bg, border: `1px solid ${c.color}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: c.color, fontWeight: 700 }}>
              {c.text || '✗'}
            </span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
