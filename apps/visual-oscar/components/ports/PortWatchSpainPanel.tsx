'use client'
/**
 * `<PortWatchSpainPanel />` · datos IMF PortWatch para puertos España.
 *
 * Reutilizable en:
 *   - /puertos · resumen oficial IMF con vessel counts por tipo
 *   - /dashboard (modo compact) · top-3 puertos ES
 *
 * Datos via /api/portwatch/spain-ports · cache 6h.
 */
import { useEffect, useState } from 'react'

interface PortWatchPort {
  portid: string
  portname: string
  country: string
  ISO3: string
  fullname?: string
  lat?: number
  lon?: number
  vessel_count_total?: number
  vessel_count_container?: number
  vessel_count_dry_bulk?: number
  vessel_count_general_cargo?: number
  vessel_count_RoRo?: number
  vessel_count_tanker?: number
  industry_top1?: string
  industry_top2?: string
  industry_top3?: string
  share_country_maritime_import?: number
  share_country_maritime_export?: number
  LOCODE?: string
}

interface PortWatchData {
  ok: boolean
  data_quality?: { source_type: string; source_name: string; note?: string }
  n_ports?: number
  total_vessel_count?: number
  ports?: PortWatchPort[]
}

const ACCENT = '#0e7490' // cyan IMF

export function PortWatchSpainPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<PortWatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/portwatch/spain-ports', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: PortWatchData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const ports = (data?.ports || []).slice(0, compact ? 5 : 15)
  const total = data?.total_vessel_count || 0

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            IMF PORTWATCH · ACTIVIDAD PORTUARIA ESPAÑA
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Datos oficiales IMF · {data?.n_ports ?? '—'} puertos ES · cache 6h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#cffafe', color: '#155e75', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · IMF
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            PortWatch no disponible
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando IMF PortWatch…</p>}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>IMF PortWatch no responde</strong> · {data?.data_quality?.note ?? 'error'}.
          <br />
          <a href="https://portwatch.imf.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            portwatch.imf.org →
          </a>
        </div>
      )}

      {!loading && isLive && ports.length === 0 && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>La fuente respondió sin puertos</strong> · IMF PortWatch contestó en vivo pero sin puertos para España.
        </div>
      )}

      {!loading && isLive && ports.length > 0 && (
        <>
          <div style={{ background: '#f0fdfa', borderRadius: 6, padding: 10, marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
              BUQUES TOTAL · TODOS LOS PUERTOS ES
            </p>
            <p style={{ fontSize: 22, color: ACCENT, fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              {total.toLocaleString('es-ES')}
            </p>
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '4px 4px', fontWeight: 600 }}>Puerto</th>
                <th style={{ padding: '4px 4px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                <th style={{ padding: '4px 4px', fontWeight: 600, textAlign: 'right' }}>Container</th>
                <th style={{ padding: '4px 4px', fontWeight: 600, textAlign: 'right' }}>Tanker</th>
                <th style={{ padding: '4px 4px', fontWeight: 600, textAlign: 'right' }}>Bulk</th>
                {!compact && <th style={{ padding: '4px 4px', fontWeight: 600, textAlign: 'right' }}>%Imp/Exp</th>}
                {!compact && <th style={{ padding: '4px 4px', fontWeight: 600 }}>Top industria</th>}
              </tr>
            </thead>
            <tbody>
              {ports.map((p) => (
                <tr key={p.portid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '5px 4px', color: '#0f172a', fontWeight: 600 }}>
                    {p.portname}
                    {p.LOCODE && <span style={{ marginLeft: 5, color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>{p.LOCODE}</span>}
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ACCENT, fontWeight: 700 }}>
                    {(p.vessel_count_total || 0).toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                    {(p.vessel_count_container || 0).toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                    {(p.vessel_count_tanker || 0).toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                    {(p.vessel_count_dry_bulk || 0).toLocaleString('es-ES')}
                  </td>
                  {!compact && (
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569', fontSize: 10 }}>
                      {p.share_country_maritime_import?.toFixed(1) ?? '—'}% / {p.share_country_maritime_export?.toFixed(1) ?? '—'}%
                    </td>
                  )}
                  {!compact && (
                    <td style={{ padding: '5px 4px', color: '#64748b', fontSize: 10 }}>
                      {p.industry_top1?.slice(0, 30)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · IMF PortWatch ·{' '}
        <a href="https://portwatch.imf.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          portwatch.imf.org →
        </a>
      </p>
    </section>
  )
}

export default PortWatchSpainPanel
