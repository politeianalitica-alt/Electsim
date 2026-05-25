'use client'
/**
 * `<GeoReliefWebPanel />` · Sprint G6.
 *
 * ReliefWeb · OCHA (UN Office for Coordination of Humanitarian Affairs).
 * Las crisis humanitarias son la manifestación visible de crisis geopolíticas:
 * guerras civiles, desplazamientos forzados, hambrunas inducidas por conflicto,
 * colapso estatal, crisis de refugiados.
 *
 * Fuente: https://api.reliefweb.int/v1/
 * Cuota: 1.000 entradas/llamada · 1.000 llamadas/día.
 */
import { useEffect, useState } from 'react'

interface Report {
  id: number
  title: string
  source: string
  date: string
  countries: string[]
  primary_country: string
  url: string
}

interface ReliefResp {
  ok: boolean
  country: string
  n_reports: number
  total_available: number
  reports: Report[]
  source: string
  note: string
  error?: string
}

// Selector de países (ISO3) con foco en zonas de crisis humanitaria activa
const HOTSPOTS: Array<{ iso3: string; label: string }> = [
  { iso3: 'UKR', label: 'Ucrania' },
  { iso3: 'PSE', label: 'Palestina' },
  { iso3: 'SDN', label: 'Sudán' },
  { iso3: 'YEM', label: 'Yemen' },
  { iso3: 'SYR', label: 'Siria' },
  { iso3: 'AFG', label: 'Afganistán' },
  { iso3: 'COD', label: 'Rep. Dem. Congo' },
  { iso3: 'MMR', label: 'Myanmar' },
  { iso3: 'HTI', label: 'Haití' },
  { iso3: 'LBY', label: 'Libia' },
  { iso3: 'SOM', label: 'Somalia' },
  { iso3: 'ETH', label: 'Etiopía' },
  { iso3: 'MLI', label: 'Mali' },
  { iso3: 'VEN', label: 'Venezuela' },
  { iso3: 'COL', label: 'Colombia' },
  { iso3: 'ESP', label: 'España (vecindad)' },
]

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 10) }
}

export function GeoReliefWebPanel({ defaultCountry = 'UKR' }: { defaultCountry?: string }) {
  const [data, setData] = useState<ReliefResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState(defaultCountry)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/reliefweb?country=${country}&limit=20`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [country])

  const countryLabel = HOTSPOTS.find((h) => h.iso3 === country)?.label ?? country

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #0ea5e9',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0ea5e9', textTransform: 'uppercase' }}>
            ◆ ReliefWeb · Crisis humanitaria activa
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            OCHA (ONU) · informes de operaciones, situational reports, alertas humanitarias.
          </p>
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{
            background: '#f0f9ff',
            color: '#0f172a',
            border: '1px solid #bae6fd',
            borderRadius: 4,
            fontSize: 11,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          {HOTSPOTS.map((h) => (
            <option key={h.iso3} value={h.iso3}>{h.label}</option>
          ))}
        </select>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando ReliefWeb…</p>}

      {data && data.ok && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 12,
          }}>
            <div style={{ padding: 10, background: '#f0f9ff', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Reports cargados</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0ea5e9' }}>{data.n_reports}</p>
            </div>
            <div style={{ padding: 10, background: '#f0f9ff', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Total disponible</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0ea5e9' }}>{data.total_available?.toLocaleString('es-ES') ?? '—'}</p>
            </div>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#475569' }}>
            Crisis activa · <strong>{countryLabel}</strong>
          </p>

          {data.reports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
              {data.reports.slice(0, 15).map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: 8,
                  background: '#f8fafc',
                  borderLeft: '3px solid #0ea5e9',
                  borderRadius: 4,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f9ff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</span>
                    <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                      {fmtDate(r.date)}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>
                    {r.source} · {r.primary_country || r.countries.slice(0, 2).join(', ')}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin reports recientes para {countryLabel}.</p>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.source}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>
          ReliefWeb no disponible · {data.error}
        </p>
      )}
    </section>
  )
}

export default GeoReliefWebPanel
