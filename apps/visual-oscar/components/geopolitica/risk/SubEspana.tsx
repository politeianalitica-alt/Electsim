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
  /** G22 fix · bilateral trade ES↔país desde DataComex */
  trade: {
    available: boolean
    pending: boolean
    note: string
    exports_2024_eur_bn?: number | null
    imports_2024_eur_bn?: number | null
    balance_eur_bn?: number
    source?: string
  }
  /** G22 fix · presencia institucional + score cooperación */
  aod_iati: {
    available: boolean
    pending: boolean
    note: string
    embassy?: boolean
    consulate_count?: number
    icex_office?: boolean
    cervantes_centers?: number
    military_mission?: boolean
    cooperation_score?: number
    source?: string
  }
  /** G22 fix · stock IED DataInvex */
  fdi_datainvex: {
    available: boolean
    pending: boolean
    note: string
    fdi_stock_eur_bn?: number | null
    relevance?: 'top_destination' | 'significativa' | 'limitada'
    source?: string
  }
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
  // G22 batch 4 · render real cuando hay seed disponible, fallback "Próximamente" si no
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Comercio bilateral */}
      {data.trade.available ? (
        <div style={{
          padding: '10px 12px', background: '#fff', borderRadius: 6,
          borderLeft: '3px solid #0891b2', border: '1px solid #f1f5f9',
        }}>
          <h5 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Comercio bilateral 2024 · DataComex
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {data.trade.exports_2024_eur_bn !== null && data.trade.exports_2024_eur_bn !== undefined && (
              <Kpi label="Exports ES→X" value={`€${data.trade.exports_2024_eur_bn.toFixed(1)} bn`} accent="#16a34a" />
            )}
            {data.trade.imports_2024_eur_bn !== null && data.trade.imports_2024_eur_bn !== undefined && (
              <Kpi label="Imports ES←X" value={`€${data.trade.imports_2024_eur_bn.toFixed(1)} bn`} accent="#dc2626" />
            )}
            {data.trade.balance_eur_bn !== undefined && (
              <Kpi
                label="Balance ES"
                value={`${data.trade.balance_eur_bn > 0 ? '+' : ''}€${data.trade.balance_eur_bn.toFixed(1)} bn`}
                accent={data.trade.balance_eur_bn > 0 ? '#16a34a' : '#dc2626'}
                sub={data.trade.balance_eur_bn > 0 ? 'superávit' : 'déficit'}
              />
            )}
          </div>
          {data.trade.source && <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '6px 0 0' }}>{data.trade.source}</p>}
        </div>
      ) : (
        <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 4, fontSize: 10, color: '#92400e' }}>
          <strong>Comercio:</strong> {data.trade.note}
        </div>
      )}

      {/* Presencia institucional ES */}
      {data.aod_iati.available ? (
        <div style={{
          padding: '10px 12px', background: '#fff', borderRadius: 6,
          borderLeft: '3px solid #7c3aed', border: '1px solid #f1f5f9',
        }}>
          <h5 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Presencia institucional España
          </h5>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.aod_iati.embassy && (
              <span style={{ padding: '3px 8px', background: '#ede9fe', color: '#5b21b6', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>✓ Embajada</span>
            )}
            {data.aod_iati.consulate_count !== undefined && data.aod_iati.consulate_count > 0 && (
              <span style={{ padding: '3px 8px', background: '#ede9fe', color: '#5b21b6', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                {data.aod_iati.consulate_count} consulado{data.aod_iati.consulate_count > 1 ? 's' : ''}
              </span>
            )}
            {data.aod_iati.icex_office && (
              <span style={{ padding: '3px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>ICEX</span>
            )}
            {data.aod_iati.cervantes_centers !== undefined && data.aod_iati.cervantes_centers > 0 && (
              <span style={{ padding: '3px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                {data.aod_iati.cervantes_centers} Cervantes
              </span>
            )}
            {data.aod_iati.military_mission && (
              <span style={{ padding: '3px 8px', background: '#fef2f2', color: '#7f1d1d', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Misión militar</span>
            )}
          </div>
          {data.aod_iati.cooperation_score !== undefined && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>Score cooperación:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 12, color: data.aod_iati.cooperation_score > 60 ? '#16a34a' : data.aod_iati.cooperation_score > 30 ? '#f59e0b' : '#94a3b8' }}>
                {data.aod_iati.cooperation_score}/100
              </span>
            </div>
          )}
          {data.aod_iati.source && <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '6px 0 0' }}>{data.aod_iati.source}</p>}
        </div>
      ) : (
        <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 4, fontSize: 10, color: '#92400e' }}>
          <strong>Cooperación:</strong> {data.aod_iati.note}
        </div>
      )}

      {/* IED España */}
      {data.fdi_datainvex.available ? (
        <div style={{
          padding: '10px 12px', background: '#fff', borderRadius: 6,
          borderLeft: '3px solid #f59e0b', border: '1px solid #f1f5f9',
        }}>
          <h5 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Inversión Exterior Directa (IED) España
          </h5>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>
              €{data.fdi_datainvex.fdi_stock_eur_bn?.toFixed(1)} bn
            </span>
            <span style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: data.fdi_datainvex.relevance === 'top_destination' ? '#dcfce7' : data.fdi_datainvex.relevance === 'significativa' ? '#fef3c7' : '#f1f5f9',
              color: data.fdi_datainvex.relevance === 'top_destination' ? '#15803d' : data.fdi_datainvex.relevance === 'significativa' ? '#92400e' : '#475569',
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              {data.fdi_datainvex.relevance === 'top_destination' ? 'Top destino' : data.fdi_datainvex.relevance === 'significativa' ? 'Significativa' : 'Limitada'}
            </span>
          </div>
          {data.fdi_datainvex.source && <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '6px 0 0' }}>{data.fdi_datainvex.source}</p>}
        </div>
      ) : (
        <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 4, fontSize: 10, color: '#92400e' }}>
          <strong>IED:</strong> {data.fdi_datainvex.note}
        </div>
      )}
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
