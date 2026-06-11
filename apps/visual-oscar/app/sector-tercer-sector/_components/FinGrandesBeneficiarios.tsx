'use client'
/**
 * <FinGrandesBeneficiarios /> · Tercer Sector · TS6
 *
 * Dos bloques que exprimen más BDNS para la pestaña de Financiación:
 *   1) Grandes beneficiarios del ejercicio (BDNS /grandesbeneficiarios) —
 *      quién recibe MÁS dinero público agregado al año (ayudaETotal).
 *   2) Ayudas de Estado recientes (BDNS /ayudasestado) — resoluciones de ayuda
 *      pública (régimen de ayudas de Estado), con beneficiario e importe.
 *
 * Ambas marcan el tercer sector (NIF G/R/F/V + keywords) con un filtro toggle.
 * Datos reales BDNS keyless. Sin importes inventados (— si null).
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/SectorialWidgets'
import { fmtEur } from './FinShared'

interface GranBenef {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  ejercicio: number | null
  es_tercer_sector: boolean
  match: string
}
interface AyudaEstado {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  instrumento: string | null
  convocatoria: string | null
  nivel: string | null
  territorio: string | null
  organo: string | null
  fecha: string | null
  es_tercer_sector: boolean
}

const ACCENT = '#0E9F6E'

export function FinGrandesBeneficiarios({
  grandes,
  ayudas,
  ejercicio,
}: {
  grandes: GranBenef[]
  ayudas: AyudaEstado[]
  ejercicio: number | null
}) {
  const [soloTsG, setSoloTsG] = useState(false)
  const [soloTsA, setSoloTsA] = useState(false)

  const grandesView = useMemo(() => {
    const arr = soloTsG ? grandes.filter((g) => g.es_tercer_sector) : grandes
    return [...arr].sort((a, b) => (b.importe_eur ?? 0) - (a.importe_eur ?? 0)).slice(0, 25)
  }, [grandes, soloTsG])
  const maxG = Math.max(1, ...grandesView.map((g) => g.importe_eur ?? 0))

  const ayudasView = useMemo(() => {
    const arr = soloTsA ? ayudas.filter((a) => a.es_tercer_sector) : ayudas
    return arr.slice(0, 30)
  }, [ayudas, soloTsA])

  if (grandes.length === 0 && ayudas.length === 0) return null

  return (
    <>
      {grandes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Panel
            title={`Grandes beneficiarios${ejercicio ? ` · ejercicio ${ejercicio}` : ''}`}
            subtitle="Quién recibe MÁS dinero público agregado al año (importe total)"
            sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/granbeneficiario"
            sourceLabel="BDNS"
            sourceTooltip="BDNS · grandes beneficiarios de subvenciones por ejercicio"
          >
            <Toggle on={soloTsG} onClick={() => setSoloTsG((v) => !v)} label="Solo tercer sector" count={grandes.filter((g) => g.es_tercer_sector).length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {grandesView.map((g, i) => {
                const pct = Math.round(((g.importe_eur ?? 0) / maxG) * 100)
                return (
                  <div key={g.id + i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0f172a', minWidth: 200, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.beneficiario_nombre}>
                      {g.beneficiario_nombre || g.beneficiario_nif || '—'}
                      {g.es_tercer_sector && <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 800, color: ACCENT, background: '#E7F8F1', padding: '1px 6px', borderRadius: 999 }}>TS</span>}
                    </span>
                    <span style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: g.es_tercer_sector ? ACCENT : '#94A3B8', borderRadius: 999, minWidth: pct > 0 ? 4 : 0 }} />
                    </span>
                    <span style={{ fontSize: 10.5, color: '#475569', fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'right' }}>
                      {g.importe_eur != null ? fmtEur(g.importe_eur) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}

      {ayudas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Panel
            title="Ayudas de Estado recientes"
            subtitle="Resoluciones del régimen de ayudas de Estado · quién recibe e importe"
            sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/ayudaestado"
            sourceLabel="BDNS"
            sourceTooltip="BDNS · ayudas de Estado"
          >
            <Toggle on={soloTsA} onClick={() => setSoloTsA((v) => !v)} label="Solo tercer sector" count={ayudas.filter((a) => a.es_tercer_sector).length} />
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #ECECEF' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Beneficiario</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Importe</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Convocatoria</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Organismo</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ayudasView.map((a, i) => (
                    <tr key={a.id + i} style={{ borderBottom: '1px solid #F4F4F6' }}>
                      <td style={{ padding: '6px 8px', maxWidth: 240 }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.beneficiario_nombre || a.beneficiario_nif || '—'}</span>
                        {a.es_tercer_sector && <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 800, color: ACCENT, background: '#E7F8F1', padding: '1px 6px', borderRadius: 999 }}>TS</span>}
                        {a.beneficiario_nif && <div style={{ fontSize: 9.5, color: '#94A3B8', fontFamily: 'monospace' }}>{a.beneficiario_nif}</div>}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0f172a', fontWeight: 600 }}>{a.importe_eur != null ? fmtEur(a.importe_eur) : '—'}</td>
                      <td style={{ padding: '6px 8px', maxWidth: 220, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.convocatoria || ''}>{a.convocatoria || '—'}</td>
                      <td style={{ padding: '6px 8px', maxWidth: 160, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.organo || ''}>{a.organo || a.territorio || a.nivel || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{a.fecha || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}

function Toggle({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: `1px solid ${on ? ACCENT : '#E2E8F0'}`,
        background: on ? '#E7F8F1' : '#fff',
        color: on ? '#065F46' : '#475569',
        borderRadius: 999,
        padding: '4px 12px',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'inherit',
      }}
    >
      {on ? '◉' : '○'} {label} ({count})
    </button>
  )
}

export default FinGrandesBeneficiarios
