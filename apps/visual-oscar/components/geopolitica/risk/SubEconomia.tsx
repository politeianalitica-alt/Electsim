'use client'
/**
 * <SubEconomia /> · Sprint GEO-RP C3 · Sub-tab 3 Economía & Deuda
 *
 * Consume /api/geopolitica/pais/[iso3]/economia
 * - 6 KPIs macro (PIB, IPC, paro, CA%PIB, deuda, reservas) + sparklines 10y
 * - Alertas derivadas (inflación, deuda alta, reservas críticas)
 * - SIPRI Milex con badge de armamento creciente
 * - Placeholders honestos JEDH + commodities
 */
import { useEffect, useState } from 'react'

interface Series { year: number; value: number | null }
interface EconResp {
  ok: boolean
  iso3: string
  country_name: string
  kpis: {
    gdp_growth_pct: number | null
    inflation_pct: number | null
    unemployment_pct: number | null
    current_account_pct_gdp: number | null
    debt_pct_gdp: number | null
    reserves_months_imports: number | null
  }
  series: Record<string, Series[]>
  sipri_milex: { pct_gdp: number; usd_bn: number; change_pct_2022: number | null; world_rank: number | null } | null
  alerts: string[]
  /** G22 fix · enriquecido con seed Q1 2026 */
  debt_profile: {
    available: boolean
    pending: boolean
    note: string
    bond_10y_yield_pct?: number | null
    cds_5y_bps?: number | null
    fx_per_usd?: number | null
    fx_currency?: string | null
    reserves_usd_bn?: number | null
    reserves_months_imports?: number | null
    risk_level?: 'investment_grade' | 'speculative' | 'distressed' | 'default_risk' | 'unknown'
  }
  commodities: {
    available: boolean
    pending: boolean
    note: string
    top_exports_hs?: Array<{ hs2: string; name_es: string; share_pct: number }>
    export_hhi?: number | null
    dual_use_share_pct?: number | null
    concentration_risk?: 'alta' | 'media' | 'baja'
  }
}

const RISK_LEVELS = {
  investment_grade: { label: 'Investment grade', color: '#16a34a', bg: '#dcfce7' },
  speculative: { label: 'Especulativo', color: '#f59e0b', bg: '#fef3c7' },
  distressed: { label: 'Distressed', color: '#dc2626', bg: '#fef2f2' },
  default_risk: { label: 'Riesgo de impago', color: '#7f1d1d', bg: '#fee2e2' },
  unknown: { label: 'Sin clasificar', color: '#94a3b8', bg: '#f1f5f9' },
} as const

export function SubEconomia({ iso3 }: { iso3: string }) {
  const [data, setData] = useState<EconResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/pais/${iso3}/economia`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando macro World Bank…</p>
  if (!data?.ok) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin datos macro disponibles.</p>

  return (
    <div>
      {data.alerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', padding: '10px 12px', borderRadius: 6, marginBottom: 12 }}>
          <strong style={{ color: '#7f1d1d', fontSize: 11 }}>⚠ Alertas macro activas</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 11, color: '#991b1b' }}>
            {data.alerts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Dashboard macro · WorldBank
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
        <KpiSpark label="PIB %YoY" value={data.kpis.gdp_growth_pct} unit="%" series={data.series.gdp_growth_pct} accent="#16a34a" lowerBetter={false} />
        <KpiSpark label="Inflación" value={data.kpis.inflation_pct} unit="%" series={data.series.inflation_pct} accent="#dc2626" lowerBetter />
        <KpiSpark label="Desempleo" value={data.kpis.unemployment_pct} unit="%" series={data.series.unemployment_pct} accent="#f59e0b" lowerBetter />
        <KpiSpark label="CA %PIB" value={data.kpis.current_account_pct_gdp} unit="%" series={data.series.current_account_pct_gdp} accent="#0891b2" lowerBetter={false} />
        <KpiSpark label="Deuda %PIB" value={data.kpis.debt_pct_gdp} unit="%" series={data.series.debt_pct_gdp} accent="#7c3aed" lowerBetter />
        <KpiSpark label="Reservas (meses)" value={data.kpis.reserves_months_imports} unit="m" series={data.series.reserves_months_imports} accent="#0891b2" lowerBetter={false} />
      </div>

      {data.sipri_milex && (
        <>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Gasto militar · SIPRI 2024
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            <DataChip label="% PIB" value={`${data.sipri_milex.pct_gdp}%`} accent={data.sipri_milex.pct_gdp > 4 ? '#dc2626' : '#0891b2'} />
            <DataChip label="USD bn" value={`${data.sipri_milex.usd_bn} bn`} accent="#7c3aed" />
            {data.sipri_milex.change_pct_2022 !== null && (
              <DataChip
                label="Cambio vs 2022"
                value={`${data.sipri_milex.change_pct_2022 > 0 ? '+' : ''}${data.sipri_milex.change_pct_2022}%`}
                accent={data.sipri_milex.change_pct_2022 > 20 ? '#dc2626' : '#16a34a'}
              />
            )}
            {data.sipri_milex.world_rank && <DataChip label="Rango mundial" value={`#${data.sipri_milex.world_rank}`} accent="#475569" />}
          </div>
        </>
      )}

      {/* G22 batch 4 · perfil riesgo soberano (CDS + bono + reservas) */}
      {data.debt_profile.available ? (
        <>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Perfil riesgo soberano · OECD + ECB + IMF Q1 2026
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            {data.debt_profile.bond_10y_yield_pct !== null && data.debt_profile.bond_10y_yield_pct !== undefined && (
              <DataChip
                label="Bono 10Y %"
                value={`${data.debt_profile.bond_10y_yield_pct.toFixed(2)}%`}
                accent={data.debt_profile.bond_10y_yield_pct > 10 ? '#7f1d1d' : data.debt_profile.bond_10y_yield_pct > 5 ? '#f59e0b' : '#16a34a'}
              />
            )}
            {data.debt_profile.cds_5y_bps !== null && data.debt_profile.cds_5y_bps !== undefined && (
              <DataChip
                label="CDS 5Y (bps)"
                value={String(data.debt_profile.cds_5y_bps)}
                accent={data.debt_profile.cds_5y_bps > 300 ? '#7f1d1d' : data.debt_profile.cds_5y_bps > 100 ? '#f59e0b' : '#16a34a'}
              />
            )}
            {data.debt_profile.fx_per_usd !== null && data.debt_profile.fx_per_usd !== undefined && (
              <DataChip
                label={`FX/USD (${data.debt_profile.fx_currency})`}
                value={data.debt_profile.fx_per_usd >= 100 ? data.debt_profile.fx_per_usd.toFixed(0) : data.debt_profile.fx_per_usd.toFixed(2)}
                accent="#0891b2"
              />
            )}
            {data.debt_profile.reserves_usd_bn !== null && data.debt_profile.reserves_usd_bn !== undefined && (
              <DataChip
                label="Reservas (USD bn)"
                value={data.debt_profile.reserves_usd_bn.toFixed(0)}
                accent="#7c3aed"
              />
            )}
          </div>
          {data.debt_profile.risk_level && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', borderRadius: 6,
              background: RISK_LEVELS[data.debt_profile.risk_level].bg,
              borderLeft: `3px solid ${RISK_LEVELS[data.debt_profile.risk_level].color}`,
              fontSize: 11, color: RISK_LEVELS[data.debt_profile.risk_level].color, fontWeight: 600,
            }}>
              Clasificación riesgo: <strong>{RISK_LEVELS[data.debt_profile.risk_level].label}</strong>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e', marginBottom: 14 }}>
          <strong>Perfil deuda · Próximamente</strong>
          <p style={{ margin: '4px 0 0' }}>{data.debt_profile.note}</p>
        </div>
      )}

      {/* G22 batch 4 · commodities · top productos export con HHI */}
      {data.commodities.available ? (
        <>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Commodities · concentración export UN Comtrade 2023
          </h4>
          {(data.commodities.top_exports_hs ?? []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {(data.commodities.top_exports_hs ?? []).map((h) => (
                <div key={h.hs2} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', background: '#f8fafc', borderRadius: 4, fontSize: 11,
                }}>
                  <span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', marginRight: 6 }}>HS{h.hs2}</span>
                    {h.name_es}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>
                    {h.share_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {data.commodities.export_hhi !== null && data.commodities.export_hhi !== undefined && (
              <DataChip
                label="HHI concentración"
                value={`${data.commodities.export_hhi.toFixed(0)} (${data.commodities.concentration_risk ?? ''})`}
                accent={data.commodities.concentration_risk === 'alta' ? '#7f1d1d' : data.commodities.concentration_risk === 'media' ? '#f59e0b' : '#16a34a'}
              />
            )}
            {data.commodities.dual_use_share_pct !== null && data.commodities.dual_use_share_pct !== undefined && (
              <DataChip
                label="Doble uso (HS93)"
                value={`${data.commodities.dual_use_share_pct.toFixed(1)}%`}
                accent={data.commodities.dual_use_share_pct > 5 ? '#7f1d1d' : '#0891b2'}
              />
            )}
          </div>
          <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '8px 0 0' }}>{data.commodities.note}</p>
        </>
      ) : (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>Commodities · Próximamente</strong>
          <p style={{ margin: '4px 0 0' }}>{data.commodities.note}</p>
        </div>
      )}
    </div>
  )
}

function KpiSpark({ label, value, unit, series, accent, lowerBetter }: { label: string; value: number | null; unit: string; series?: Series[]; accent: string; lowerBetter: boolean }) {
  const vals = series?.map((s) => s.value).filter((v): v is number => v !== null) || []
  const hasSpark = vals.length >= 2
  const w = 100, h = 20
  let path: string | null = null
  if (hasSpark) {
    const minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV - minV || 1
    path = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w
      const y = h - ((v - minV) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }
  return (
    <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
        {value !== null ? `${value.toFixed(1)} ${unit}` : '—'}
      </p>
      {path && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 2, display: 'block' }}>
          <path d={path} fill="none" stroke={accent} strokeWidth={1.2} />
        </svg>
      )}
    </div>
  )
}

function DataChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${accent}` }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

export default SubEconomia
