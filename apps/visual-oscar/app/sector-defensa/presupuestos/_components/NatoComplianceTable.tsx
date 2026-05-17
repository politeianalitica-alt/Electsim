'use client'

interface NatoItem {
  iso3: string
  pais: string
  pct_pib: number | null
  year: number | null
  cumple_otan: boolean | null
  destacado?: boolean
}

interface Props {
  items: NatoItem[]
  year: number
  media_otan: number
  cumplen_pct: number
}

function Semaforo({ value, target }: { value: number | null; target: number }) {
  if (value == null) return <span style={{ color: '#86868b' }}>—</span>
  const ok = value >= target
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: ok ? '#16A34A' : value >= target * 0.85 ? '#F59E0B' : '#DC2626',
        boxShadow: ok ? '0 0 6px #16A34A80' : undefined,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
        color: ok ? '#16A34A' : '#DC2626',
      }}>
        {value.toFixed(2)}%
      </span>
    </span>
  )
}

export function NatoComplianceTable({ items, year, media_otan, cumplen_pct }: Props) {
  const sorted = [...items].sort((a, b) => (b.pct_pib ?? 0) - (a.pct_pib ?? 0))

  return (
    <div style={{ width: '100%' }}>
      {/* Resumen header */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16,
      }}>
        {[
          { label: 'Media OTAN', value: `${media_otan?.toFixed(2)}%`, color: '#1F4E8C' },
          { label: 'Cumplen 2%', value: `${cumplen_pct}/${items.length}`, color: '#16A34A' },
          { label: 'Año referencia', value: String(year), color: '#525258' },
        ].map(k => (
          <div key={k.label} style={{
            padding: '10px 12px', background: '#FAFAFA',
            border: '1px solid #ECECEF', borderRadius: 10, textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ECECEF' }}>
            {['País', 'Gasto % PIB', 'Objetivo 2%', 'Objetivo 5%', 'Posición'].map(h => (
              <th key={h} style={{
                padding: '7px 10px', textAlign: h === 'País' ? 'left' : 'center',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#86868b',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((it, i) => (
            <tr key={it.iso3} style={{
              borderBottom: '1px solid #F5F5F7',
              background: it.destacado ? '#FFF9E6' : 'transparent',
            }}>
              <td style={{ padding: '9px 10px', fontWeight: it.destacado ? 700 : 500, color: '#1d1d1f' }}>
                {it.destacado && <span style={{ marginRight: 4 }}>►</span>}
                {it.pais}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                <Semaforo value={it.pct_pib} target={2} />
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 11 }}>
                  {it.pct_pib != null ? (it.pct_pib >= 2 ? '✓ Cumple' : `−0.${Math.abs(2 - (it.pct_pib ?? 0)).toFixed(2).replace('0.','').padStart(2,'0')} pp`) : '—'}
                </span>
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                <Semaforo value={it.pct_pib} target={5} />
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#86868b', fontSize: 11 }}>
                #{i + 1}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 8, textAlign: 'right' }}>
        Fuente: World Bank · MS.MIL.XPND.GD.ZS · Año {year}
      </div>
    </div>
  )
}
