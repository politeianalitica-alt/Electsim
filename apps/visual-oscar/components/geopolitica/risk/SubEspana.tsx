'use client'
/**
 * <SubEspana /> · Sprint GEO-RP C3 · Sub-tab 5 Exposición España
 *
 * Consume /api/geopolitica/pais/[iso3]/espana
 * - Lista IBEX-35 con presencia en el país + flag CRITICAL si país >10% revenue
 * - Cotización Finnhub en tiempo real (top 10 batch)
 * - Resumen totales (N empresas, N críticas)
 * - Placeholders honestos para Comtrade + IATI + DataInvex
 */
import { useEffect, useState } from 'react'

interface Company {
  symbol: string
  name: string
  sector: string
  countries_count: number
  is_critical: boolean
  quote: { current_price: number; percent_change: number; change: number; prev_close: number } | null
}
interface EspResp {
  ok: boolean
  iso3: string
  country_name: string
  companies: { total: number; critical: number; data: Company[]; catalog_size: number }
  trade: { available: boolean; pending: boolean; note: string }
  aod_iati: { available: boolean; pending: boolean; note: string }
  fdi_datainvex: { available: boolean; pending: boolean; note: string }
}

const SECTOR_COLOR: Record<string, string> = {
  banca: '#16a34a',
  energia: '#f59e0b',
  telecom: '#0891b2',
  retail: '#7c3aed',
  construccion: '#475569',
  industria: '#737373',
  seguros: '#dc2626',
  defensa: '#7f1d1d',
  farma: '#16a34a',
  turismo: '#0891b2',
  tecnologia: '#7c3aed',
  aerolineas: '#0891b2',
  aerospace: '#7f1d1d',
}

export function SubEspana({ iso3 }: { iso3: string }) {
  const [data, setData] = useState<EspResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/pais/${iso3}/espana`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando exposición España…</p>
  if (!data?.ok) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin datos de exposición.</p>

  if (data.companies.total === 0) {
    return (
      <div>
        <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '14px 16px', borderRadius: 8, fontSize: 12, color: '#475569' }}>
          <strong style={{ color: '#0f172a' }}>Sin empresas IBEX-35 con presencia documentada en {data.country_name}.</strong>
          <p style={{ margin: '4px 0 0', fontSize: 11 }}>
            Dataset cubre {data.companies.catalog_size} empresas españolas cotizadas (IBEX-35 + grandes corporaciones).
            Si crees que falta alguna empresa con operaciones aquí, contactar para actualizar el dataset.
          </p>
        </div>
        <PendingBlocks data={data} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <Kpi label="Empresas IBEX" value={String(data.companies.total)} accent="#0891b2" />
        <Kpi label="Presencia crítica" value={String(data.companies.critical)} sub="país >10% revenue" accent="#dc2626" />
        <Kpi label="Catálogo total" value={String(data.companies.catalog_size)} sub="cobertura dataset" accent="#94a3b8" />
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Empresas con presencia
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.companies.data.map((c) => {
          const sectorColor = SECTOR_COLOR[c.sector] || '#475569'
          const changeColor = c.quote ? (c.quote.percent_change > 0 ? '#16a34a' : c.quote.percent_change < 0 ? '#dc2626' : '#94a3b8') : '#94a3b8'
          return (
            <div key={c.symbol} style={{
              padding: '10px 12px', background: '#fff', borderRadius: 6,
              borderLeft: `3px solid ${c.is_critical ? '#dc2626' : sectorColor}`,
              border: '1px solid #f1f5f9',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{c.symbol}</span>
                  {c.is_critical && (
                    <span style={{ padding: '1px 6px', background: '#7f1d1d', color: '#fff', borderRadius: 3, fontSize: 8, fontWeight: 700 }}>CRÍTICO</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 9, color: '#475569' }}>
                  <span style={{ background: `${sectorColor}15`, color: sectorColor, padding: '1px 6px', borderRadius: 3, fontWeight: 600, textTransform: 'uppercase' }}>{c.sector}</span>
                  <span>{c.countries_count} países globales</span>
                </div>
              </div>
              {c.quote ? (
                <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{c.quote.current_price.toFixed(2)}€</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: changeColor, fontWeight: 600 }}>
                    {c.quote.percent_change > 0 ? '+' : ''}{c.quote.percent_change.toFixed(2)}%
                  </p>
                </div>
              ) : (
                <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>cotización pendiente</span>
              )}
            </div>
          )
        })}
      </div>

      <PendingBlocks data={data} />
    </div>
  )
}

function PendingBlocks({ data }: { data: EspResp }) {
  return (
    <div style={{ marginTop: 14, background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
      <strong>Próximamente</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
        <li>{data.trade.note}</li>
        <li>{data.aod_iati.note}</li>
        <li>{data.fdi_datainvex.note}</li>
      </ul>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

export default SubEspana
