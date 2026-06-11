'use client'
/**
 * /puertos/comercio · Sprint 2 Fase E
 *
 * Comercio bilateral declarado con UX profesional:
 *   - CountryCombobox typeahead (116 países ISO3 con búsqueda fuzzy)
 *   - HSCombobox typeahead (227 códigos HS2/HS4 con nombre español)
 *   - Range periodo (from/to) → serie temporal 24m
 *   - Cards de Top productos por partner
 *   - HHI · índice Herfindahl de concentración por partner
 *   - Sankey reporter → partner → HS
 *   - Tabla con valor USD + cantidad + precio unitario implícito
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useBilateralTrade, useTopPartners } from '@/hooks/usePorts'
import { BilateralTradeSankey } from '@/components/ports/BilateralTradeSankey'
import { Combobox } from '@/components/ports/Combobox'
import { DataQualityBadge } from '@/components/ports/DataQualityBadge'
import { searchCountries, COUNTRIES, COUNTRY_BY_ISO3 } from '@/lib/iso-countries'
import { searchHsCodes, HS_BY_CODE, lookupHsCode } from '@/lib/hs-codes'
import { fmtNum, fmtInt } from '@/lib/ports-utils'

const ACCENT = '#0e7490'

export default function TradePage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [reporter, setReporter] = useState('ESP')
  const [partner, setPartner] = useState('DEU')
  const [period, setPeriod] = useState('2024-12')
  const [hsCode, setHsCode] = useState('')
  const [flow, setFlow] = useState<'export' | 'import' | ''>('')

  // typeahead state · qué muestra cada combobox
  const [reporterQ, setReporterQ] = useState('')
  const [partnerQ, setPartnerQ] = useState('')
  const [hsQ, setHsQ] = useState('')

  const { data, loading, error } = useBilateralTrade(
    reporter,
    partner,
    hsCode || undefined,
    period || undefined,
    (flow || undefined) as any,
  )

  const { items: topPartners } = useTopPartners(reporter, 'export', 10)

  // ─── HHI (Herfindahl-Hirschman Index) ───────────────────────────────
  // HHI = sum(share_pct^2) · 0..10000.
  //   <1500  · mercado fragmentado (saludable)
  //   1500-2500 · moderada concentración
  //   >2500  · alta concentración (dependencia estratégica)
  const hhi = useMemo(() => {
    if (!topPartners.length) return null
    return Math.round(
      topPartners.reduce((sum, p) => sum + (p.share_pct ?? 0) ** 2, 0),
    )
  }, [topPartners])

  // ─── Top productos · agrupa items por hs_code y suma value_usd ─────
  const topProducts = useMemo(() => {
    if (!data?.items?.length) return []
    const grouped = new Map<string, number>()
    for (const it of data.items) {
      const hs = it.hs_code || 'TOTAL'
      grouped.set(hs, (grouped.get(hs) ?? 0) + (it.value_usd ?? 0))
    }
    const arr = Array.from(grouped.entries()).map(([code, value]) => ({
      code,
      value,
      name: HS_BY_CODE[code]?.name_es ?? lookupHsCode(code)?.name_es ?? code,
    }))
    arr.sort((a, b) => b.value - a.value)
    return arr.slice(0, 10)
  }, [data])

  // Total declarado USD para mostrar agregado
  const totalUsd = useMemo(
    () => (data?.items ?? []).reduce((s, f) => s + (f.value_usd ?? 0), 0),
    [data],
  )

  const reporterCountry = COUNTRY_BY_ISO3[reporter]
  const partnerCountry = COUNTRY_BY_ISO3[partner]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
      <AppHeader />
      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <Link
          href="/puertos"
          style={{
            color: ACCENT,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ← Puertos & Comercio Global
        </Link>

        <header style={{ marginTop: 10 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            COMERCIO DECLARADO · COMTRADE + EUROSTAT COMEXT
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {reporterCountry?.name_es ?? reporter} ↔ {partnerCountry?.name_es ?? partner}
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            EU↔EU usa Eurostat Comext (CN8) · resto UN Comtrade (HS) · cache 24 h en `trade_flows`.
          </p>
        </header>

        {/* ─── Selectores ─── */}
        <section
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            padding: 12,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 8,
          }}
        >
          <Field label="Reporter (país que declara)">
            <Combobox<{ iso3: string; name_es: string }>
              value={reporter}
              onChange={(v) => setReporter(v)}
              options={searchCountries(reporterQ, 20)}
              onSearch={setReporterQ}
              getValue={(c) => c.iso3}
              getLabel={(c) => `${c.iso3} — ${c.name_es}`}
              placeholder="ESP · España · busca por nombre o ISO3"
              width={260}
            />
          </Field>
          <Field label="Partner (contraparte)">
            <Combobox<{ iso3: string; name_es: string }>
              value={partner}
              onChange={(v) => setPartner(v)}
              options={searchCountries(partnerQ, 20).filter(
                (c) => c.iso3 !== reporter,
              )}
              onSearch={setPartnerQ}
              getValue={(c) => c.iso3}
              getLabel={(c) => `${c.iso3} — ${c.name_es}`}
              placeholder="DEU · Alemania"
              width={260}
            />
          </Field>
          <Field label="HS code (typing 'vehic' busca)">
            <Combobox<{ code: string; level: string; name_es: string }>
              value={hsCode}
              onChange={(v) => setHsCode(v)}
              options={searchHsCodes(hsQ || hsCode, 18)}
              onSearch={setHsQ}
              getValue={(h) => h.code}
              getLabel={(h) => `${h.code} — ${h.name_es}`}
              placeholder="ej. 87, 8703, 'vehículos'…"
              width={300}
            />
          </Field>
          <Field label="Periodo YYYY-MM">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Flujo">
            <select
              value={flow}
              onChange={(e) => setFlow(e.target.value as any)}
              style={selectStyle}
            >
              <option value="">ambos</option>
              <option value="export">export</option>
              <option value="import">import</option>
            </select>
          </Field>
          {hsCode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: 6,
                fontSize: 11,
                color: '#475569',
              }}
            >
              <button
                onClick={() => {
                  setHsCode('')
                  setHsQ('')
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Limpiar HS
              </button>
            </div>
          )}
        </section>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#991b1b',
              fontSize: 13,
            }}
          >
            Error: {String(error)}
          </div>
        )}

        {/* ─── KPIs ─── */}
        <section
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <KPI
            label="Total declarado"
            value={`${fmtInt(totalUsd, '—')} USD`}
            accent={ACCENT}
          />
          <KPI
            label="Registros"
            value={data?.n_items ?? 0}
            accent={ACCENT}
          />
          <KPI
            label="Fuente activa"
            value={data?.use_source?.toUpperCase() ?? '—'}
            accent={ACCENT}
          />
          {hhi != null && (
            <KPI
              label="HHI (concentración)"
              value={hhi.toLocaleString('es-ES')}
              accent={hhi >= 2500 ? '#b91c1c' : hhi >= 1500 ? '#ca8a04' : '#16a34a'}
              note={
                hhi >= 2500
                  ? 'Alta concentración'
                  : hhi >= 1500
                    ? 'Moderada'
                    : 'Fragmentada'
              }
            />
          )}
        </section>

        {/* ─── WTO Multilateral Snapshot ─── */}
        <WtoMultilateralPanel reporterIso3={reporter} />

        {/* ─── Sankey ─── */}
        <section
          style={{
            marginTop: 16,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#64748b',
              fontWeight: 700,
              margin: 0,
            }}
          >
            SANKEY · REPORTER → PARTNER → HS
          </p>
          <BilateralTradeSankey flows={data?.items ?? []} />
        </section>

        {/* ─── Top productos · agrupado por HS ─── */}
        <section
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 16,
          }}
        >
          <Card title={`Top productos (HS) · ${reporterCountry?.iso3 ?? reporter}↔${partnerCountry?.iso3 ?? partner}`}>
            {topProducts.length === 0 ? (
              <Empty>Sin productos para mostrar.</Empty>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                {topProducts.map((p) => {
                  const share = totalUsd > 0 ? (p.value / totalUsd) * 100 : 0
                  return (
                    <li
                      key={p.code}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}
                      >
                        <span>
                          <code
                            style={{
                              background: '#f1f5f9',
                              padding: '1px 5px',
                              borderRadius: 3,
                              fontWeight: 700,
                              marginRight: 6,
                            }}
                          >
                            {p.code}
                          </code>
                          {p.name}
                        </span>
                        <span
                          style={{
                            color: '#64748b',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 11,
                          }}
                        >
                          {fmtInt(p.value)} USD · {fmtNum(share, 1, '%')}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          height: 4,
                          background: '#e5e7eb',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, share * 2)}%`,
                            height: '100%',
                            background: ACCENT,
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title={`Top partners de ${reporterCountry?.iso3 ?? reporter} (export)`}>
            {topPartners.length === 0 ? (
              <Empty>Cargando partners…</Empty>
            ) : (
              <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12 }}>
                {topPartners.map((it, i) => {
                  const c = COUNTRY_BY_ISO3[it.partner_iso]
                  return (
                    <li key={i} style={{ padding: '4px 0' }}>
                      <strong>{c?.name_es ?? it.partner_name ?? it.partner_iso}</strong>
                      <span style={{ color: '#64748b', fontSize: 11 }}>
                        {' '}· {fmtNum(it.share_pct, 1, '%')}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </section>

        {/* ─── Tabla de flujos con precio unitario implícito ─── */}
        <section
          style={{
            marginTop: 16,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#64748b',
              fontWeight: 700,
              margin: '0 0 8px',
            }}
          >
            FLUJOS DETALLADOS
          </p>
          {loading ? (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando…</p>
          ) : data?.items?.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>HS</th>
                    <th style={th}>Producto</th>
                    <th style={th}>Periodo</th>
                    <th style={th}>Flujo</th>
                    <th style={{ ...th, textAlign: 'right' }}>Valor USD</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                    <th style={th}>Unidad</th>
                    <th style={{ ...th, textAlign: 'right' }}>Precio unit.</th>
                    <th style={th}>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((f, i) => {
                    const unitPrice =
                      f.qty != null && f.qty > 0 && f.value_usd != null
                        ? f.value_usd / f.qty
                        : null
                    const hsName = lookupHsCode(f.hs_code)?.name_es ?? ''
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td
                          style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          {f.hs_code}
                        </td>
                        <td style={{ ...td, color: '#475569' }}>{hsName}</td>
                        <td style={td}>{f.period_ym}</td>
                        <td style={td}>{f.flow_kind}</td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtInt(f.value_usd)}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtInt(f.qty)}
                        </td>
                        <td style={{ ...td, color: '#64748b' }}>
                          {f.unit ?? '—'}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {unitPrice != null ? fmtNum(unitPrice, 2) : '—'}
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '2px 6px',
                              background:
                                f.source === 'comext' ? '#dbeafe' : '#fef3c7',
                              color:
                                f.source === 'comext' ? '#1e40af' : '#92400e',
                              borderRadius: 4,
                              fontWeight: 700,
                              fontSize: 10,
                            }}
                          >
                            {f.source}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Sin datos para la combinación elegida. Prueba sin filtro HS o
              cambia el periodo.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '7px 11px',
  fontSize: 13,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#fff',
  width: 130,
}
const selectStyle: React.CSSProperties = { ...inputStyle }
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
}
const td: React.CSSProperties = { padding: '8px 10px', color: '#1e293b' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          color: '#64748b',
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  )
}

function KPI({
  label,
  value,
  accent,
  note,
}: {
  label: string
  value: number | string
  accent: string
  note?: string
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          color: '#64748b',
          margin: 0,
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: accent,
          margin: '4px 0 0',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      {note && (
        <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
          {note}
        </p>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 8,
        padding: 14,
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 0.8,
          color: '#64748b',
          fontWeight: 700,
          margin: 0,
        }}
      >
        {title.toUpperCase()}
      </p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{children}</p>
}

// ─────────────────────────────────────────────────────────────────
// WTO Multilateral Snapshot · datos OFICIALES de OMC
// ─────────────────────────────────────────────────────────────────

interface WtoOverview {
  reporter_code: number
  reporter: string
  periods: string
  series: Record<string, Array<{ year: number; value: number; unit?: string }>>
  data_quality?: { source_type: string; source_name: string; note?: string }
}

interface WtoTariffs {
  reporter: string
  tariffs: Record<string, { year: number; value: number; unit?: string }>
  data_quality?: { source_type: string; source_name: string; note?: string }
}

function WtoMultilateralPanel({ reporterIso3 }: { reporterIso3: string }) {
  const [overview, setOverview] = useState<WtoOverview | null>(null)
  const [tariffs, setTariffs] = useState<WtoTariffs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    // Solo el reporter (ej. ESP) tiene snapshot completo curado; otros via /country/{iso3}
    const isSpain = reporterIso3 === 'ESP'
    const overviewUrl = isSpain
      ? '/api/wto/spain-overview?periods=2018-2024'
      : `/api/wto/country/${reporterIso3}?periods=2020-2024`
    Promise.all([
      fetch(overviewUrl, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/wto/tariff/${reporterIso3}`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([ov, tar]) => {
      if (!alive) return
      setOverview(ov)
      setTariffs(tar)
      setLoading(false)
    })
    return () => { alive = false }
  }, [reporterIso3])

  const exportsLatest = overview?.series?.exports_total?.length
    ? overview.series.exports_total[overview.series.exports_total.length - 1]
    : null
  const importsLatest = overview?.series?.imports_total?.length
    ? overview.series.imports_total[overview.series.imports_total.length - 1]
    : null
  const servicesExportsLatest = overview?.series?.services_exports?.length
    ? overview.series.services_exports[overview.series.services_exports.length - 1]
    : null

  const balance = exportsLatest && importsLatest
    ? exportsLatest.value - importsLatest.value
    : null

  return (
    <section
      style={{
        marginTop: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#0e7490', fontWeight: 700, margin: 0 }}>
            COMERCIO MULTILATERAL · WTO TIMESERIES
          </p>
          <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>
            Datos oficiales OMC · {overview?.reporter ?? reporterIso3} ·{' '}
            agregado multilateral (≠ Comtrade bilateral)
          </p>
        </div>
        {overview?.data_quality && (
          <span style={{ fontSize: 10, padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: 4, fontWeight: 700 }}>
            {overview.data_quality.source_type.toUpperCase()}
          </span>
        )}
      </div>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Cargando WTO…</p>}

      {!loading && overview && (
        <>
          {/* 4 KPIs hero */}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <KpiCard
              label={`Exports ${exportsLatest?.year ?? '—'}`}
              value={exportsLatest ? `${(exportsLatest.value / 1000).toFixed(1)}B$` : '—'}
              accent="#0e7490"
            />
            <KpiCard
              label={`Imports ${importsLatest?.year ?? '—'}`}
              value={importsLatest ? `${(importsLatest.value / 1000).toFixed(1)}B$` : '—'}
              accent="#0e7490"
            />
            <KpiCard
              label="Balanza comercial"
              value={balance != null ? `${(balance / 1000).toFixed(1)}B$` : '—'}
              accent={balance != null && balance > 0 ? '#16a34a' : '#dc2626'}
            />
            <KpiCard
              label={`Services exports ${servicesExportsLatest?.year ?? '—'}`}
              value={servicesExportsLatest ? `${(servicesExportsLatest.value / 1000).toFixed(1)}B$` : '—'}
              accent="#0e7490"
            />
          </div>

          {/* Sparklines de series */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            <SparkSeries
              label="Exports total (M USD)"
              data={overview.series.exports_total || []}
              color="#0e7490"
            />
            <SparkSeries
              label="Imports total (M USD)"
              data={overview.series.imports_total || []}
              color="#dc2626"
            />
            <SparkSeries
              label="Services exports (M USD)"
              data={overview.series.services_exports || []}
              color="#16a34a"
            />
            <SparkSeries
              label="Manuf. exports (M USD)"
              data={overview.series.exports_manuf || []}
              color="#9333ea"
            />
          </div>

          {/* Tariffs MFN */}
          {tariffs?.tariffs && Object.keys(tariffs.tariffs).length > 0 && (
            <div style={{ marginTop: 14, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0, letterSpacing: 0.6 }}>
                ARANCELES MFN APLICADOS · {reporterIso3}
              </p>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6, fontSize: 12 }}>
                {Object.entries(tariffs.tariffs).map(([key, t]) => {
                  const label = key
                    .replace('tariff_', '')
                    .replace('_', ' ')
                    .replace('simple', 'simple →')
                    .replace('weighted', 'ponder →')
                  return (
                    <div key={key} style={{ background: '#fff', padding: 8, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>
                        {t.value != null ? `${t.value.toFixed(2)}%` : '—'}
                      </p>
                      <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{t.year}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'right' }}>
        Fuente · WTO Timeseries Database ·{' '}
        <a href="https://api.wto.org/timeseries/v1" target="_blank" rel="noopener noreferrer" style={{ color: '#0e7490', textDecoration: 'none' }}>
          api.wto.org →
        </a>
      </p>
    </section>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 6, padding: 10 }}>
      <p style={{ fontSize: 10, letterSpacing: 0.5, color: '#64748b', margin: 0, fontWeight: 700 }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: accent, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
    </div>
  )
}

function SparkSeries({ label, data, color }: { label: string; data: Array<{ year: number; value: number }>; color: string }) {
  if (!data.length) {
    return (
      <div style={{ padding: 10, background: '#f9fafb', borderRadius: 6, fontSize: 11, color: '#94a3b8' }}>
        {label} · sin datos
      </div>
    )
  }
  const sorted = [...data].sort((a, b) => a.year - b.year)
  const values = sorted.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const w = 280
  const h = 50
  const pad = 4
  const step = (w - pad * 2) / Math.max(1, sorted.length - 1)
  const points = sorted
    .map((d, i) => `${pad + i * step},${h - pad - ((d.value - min) / range) * (h - pad * 2)}`)
    .join(' ')
  const last = sorted[sorted.length - 1]
  const first = sorted[0]
  const growthPct = first.value > 0 ? ((last.value - first.value) / first.value) * 100 : 0
  return (
    <div style={{ padding: 10, background: '#f9fafb', borderRadius: 6, border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ fontSize: 11, color: '#475569', margin: 0, fontWeight: 600 }}>{label}</p>
        <span style={{ fontSize: 10, color: growthPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
          {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 60, marginTop: 4 }} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.4} />
        <circle
          cx={pad + (sorted.length - 1) * step}
          cy={h - pad - ((last.value - min) / range) * (h - pad * 2)}
          r={2.5}
          fill={color}
        />
      </svg>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
        {first.year} → {last.year} · {(last.value / 1000).toFixed(1)}B$ último
      </p>
    </div>
  )
}
