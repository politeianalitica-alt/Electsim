'use client'

const PAISES_HEATMAP = [
  { iso2: 'US', label: 'EE.UU.',     region: 'nato' },
  { iso2: 'CN', label: 'China',      region: 'restricted' },
  { iso2: 'RU', label: 'Rusia',      region: 'sanctioned' },
  { iso2: 'IN', label: 'India',      region: 'partner' },
  { iso2: 'SA', label: 'Arabia S.',  region: 'monitored' },
  { iso2: 'TR', label: 'Turquía',    region: 'nato' },
  { iso2: 'IL', label: 'Israel',     region: 'partner' },
  { iso2: 'AE', label: 'EAU',        region: 'monitored' },
  { iso2: 'IR', label: 'Irán',       region: 'sanctioned' },
  { iso2: 'KP', label: 'Corea N.',   region: 'sanctioned' },
  { iso2: 'DE', label: 'Alemania',   region: 'nato' },
  { iso2: 'FR', label: 'Francia',    region: 'nato' },
]

const TECNOLOGIAS = [
  { id: 'prop',  label: 'Propulsión', desc: 'Motores turbofan, turbohélice, cohetes' },
  { id: 'avio',  label: 'Aviónica',   desc: 'AESA radar, EW, IFF, datalink' },
  { id: 'mis',   label: 'Misiles',    desc: 'BVRAAM, SAM, PGM' },
  { id: 'c2',    label: 'C2/C4ISR',  desc: 'Software, comunicaciones seguras, cifrado' },
  { id: 'cyber', label: 'Cyber',      desc: 'Herramientas ofensivas, SIGINT' },
  { id: 'uav',   label: 'Drones',     desc: 'UAS, UCAV, swarms' },
  { id: 'nbc',   label: 'NBC',        desc: 'Deteccion CBRN, protección' },
  { id: 'semi',  label: 'Chips',      desc: 'Semiconductores avanzados, FPGA' },
]

// Niveles: 0=libre, 1=licencia requerida, 2=licencia especial/restricción, 3=prohibido/embargo
const HEATMAP_DATA: Record<string, number[]> = {
  //                 prop avio mis  c2  cyber uav nbc semi
  US: [              0,   1,   1,   1,   2,   1,   2,  0  ],
  CN: [              3,   3,   3,   3,   3,   3,   3,  3  ],
  RU: [              3,   3,   3,   3,   3,   3,   3,  3  ],
  IN: [              1,   1,   2,   1,   2,   1,   2,  1  ],
  SA: [              1,   1,   2,   1,   2,   1,   2,  1  ],
  TR: [              1,   1,   2,   2,   2,   1,   2,  1  ],
  IL: [              1,   1,   1,   1,   2,   1,   2,  1  ],
  AE: [              1,   1,   2,   1,   2,   2,   2,  1  ],
  IR: [              3,   3,   3,   3,   3,   3,   3,  3  ],
  KP: [              3,   3,   3,   3,   3,   3,   3,  3  ],
  DE: [              0,   0,   0,   0,   1,   0,   1,  0  ],
  FR: [              0,   0,   0,   0,   1,   0,   1,  0  ],
}

const NIVEL_CONFIG = [
  { label: 'Libre (no licencia)',    bg: '#F0FDF4', color: '#16A34A', text: '✓' },
  { label: 'Licencia requerida',     bg: '#FFF9E6', color: '#D97706', text: 'L' },
  { label: 'Licencia especial/ITAR', bg: '#FFF1F2', color: '#DC2626', text: '!' },
  { label: 'Embargo / Prohibido',    bg: '#1F2937', color: '#F87171', text: '✕' },
]

const REGION_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  nato:       { bg: '#EFF6FF', color: '#1F4E8C', label: 'OTAN' },
  restricted: { bg: '#FFF1F2', color: '#DC2626', label: 'Restringido' },
  sanctioned: { bg: '#1F2937', color: '#F87171', label: 'Embargo' },
  partner:    { bg: '#F0FDF4', color: '#16A34A', label: 'Partner' },
  monitored:  { bg: '#FFF9E6', color: '#D97706', label: 'Monitorizado' },
}

export function ExportControlHeatmap() {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px' }}>
        Nivel de restricción ITAR/EAR/EU para exportación de tecnologías de defensa por país destino
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', minWidth: 95 }}>País</th>
            {TECNOLOGIAS.map(t => (
              <th key={t.id} title={t.desc}
                style={{ padding: '6px 4px', textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: '#86868b', minWidth: 70, lineHeight: 1.3 }}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAISES_HEATMAP.map(p => {
            const niveles = HEATMAP_DATA[p.iso2] ?? Array(TECNOLOGIAS.length).fill(1)
            const rb = REGION_BADGE[p.region]
            return (
              <tr key={p.iso2} style={{ borderTop: '1px solid #F5F5F7' }}>
                <td style={{ padding: '7px 10px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#1d1d1f' }}>{p.label}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: rb.bg, color: rb.color, width: 'fit-content' }}>{rb.label}</span>
                  </div>
                </td>
                {niveles.map((nivel, i) => {
                  const cfg = NIVEL_CONFIG[nivel]
                  return (
                    <td key={i}
                      title={`${p.label} · ${TECNOLOGIAS[i].label} · ${cfg.label}`}
                      style={{ padding: '7px 4px', textAlign: 'center', background: cfg.bg, fontWeight: 800, fontSize: 12 }}>
                      <span style={{ color: cfg.color }}>{cfg.text}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {NIVEL_CONFIG.map(c => (
          <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#6e6e73' }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: c.bg, border: `1px solid ${c.color}20`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: c.color, fontWeight: 800 }}>{c.text}</span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
