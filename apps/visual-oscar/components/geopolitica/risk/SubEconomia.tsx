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
  debt_profile: { available: boolean; pending: boolean; note: string }
  commodities: { available: boolean; pending: boolean; note: string }
}

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

      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
        <strong>Próximamente</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
          <li>{data.debt_profile.note}</li>
          <li>{data.commodities.note}</li>
        </ul>
      </div>
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
