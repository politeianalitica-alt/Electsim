'use client'
/**
 * /puertos/comercio · Comercio bilateral declarado (Comtrade + Comext).
 *
 * Selector reporter↔partner + HS + periodo. Sankey + tabla.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useBilateralTrade } from '@/hooks/usePorts'
import { BilateralTradeSankey } from '@/components/ports/BilateralTradeSankey'

const ACCENT = '#0e7490'

const COMMON_ISO = ['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'CHN', 'USA', 'MEX', 'MAR', 'TUR', 'GBR']

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

  const { data, loading, error } = useBilateralTrade(
    reporter,
    partner,
    hsCode || undefined,
    period || undefined,
    (flow || undefined) as any,
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          ← Puertos & Comercio Global
        </Link>

        <header style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            COMERCIO DECLARADO · COMTRADE + EUROSTAT COMEXT
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            Bilateral por país · partida HS · periodo
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Routing automático: EU↔EU → Comext, resto → UN Comtrade. Cache 24h en `trade_flows`.
          </p>
        </header>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <Field label="Reporter ISO3">
            <select value={reporter} onChange={(e) => setReporter(e.target.value)} style={selectStyle}>
              {COMMON_ISO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Partner ISO3">
            <select value={partner} onChange={(e) => setPartner(e.target.value)} style={selectStyle}>
              {COMMON_ISO.filter((c) => c !== reporter).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Periodo YYYY-MM">
            <input value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="HS code (opcional)">
            <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="87" style={inputStyle} />
          </Field>
          <Field label="Flujo">
            <select value={flow} onChange={(e) => setFlow(e.target.value as any)} style={selectStyle}>
              <option value="">ambos</option>
              <option value="export">export</option>
              <option value="import">import</option>
            </select>
          </Field>
        </div>

        {error ? (
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
        ) : null}

        {data ? (
          <p style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
            <strong>Fuente:</strong> {data.use_source} · <strong>{data.n_items}</strong> registros
          </p>
        ) : null}

        <section style={{ marginTop: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>SANKEY · REPORTER → PARTNER → HS</p>
          <BilateralTradeSankey flows={data?.items ?? []} />
        </section>

        <section style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: '0 0 8px' }}>TABLA DE FLUJOS</p>
          {loading ? (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando…</p>
          ) : data?.items?.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>Reporter</th>
                    <th style={th}>Partner</th>
                    <th style={th}>HS</th>
                    <th style={th}>Periodo</th>
                    <th style={th}>Flujo</th>
                    <th style={{ ...th, textAlign: 'right' }}>Valor USD</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                    <th style={th}>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{f.reporter_iso}</td>
                      <td style={td}>{f.partner_iso}</td>
                      <td style={td}>{f.hs_code}</td>
                      <td style={td}>{f.period_ym}</td>
                      <td style={td}>{f.flow_kind}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {f.value_usd.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {f.qty != null ? f.qty.toLocaleString('es-ES') : '—'}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            padding: '2px 6px',
                            background: f.source === 'comext' ? '#dbeafe' : '#fef3c7',
                            color: f.source === 'comext' ? '#1e40af' : '#92400e',
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 10,
                          }}
                        >
                          {f.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Sin datos para la combinación elegida.</p>
          )}
        </section>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', width: 130 }
const selectStyle: React.CSSProperties = { ...inputStyle }
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: 0.6, color: '#64748b', fontWeight: 700 }}>{label.toUpperCase()}</span>
      {children}
    </label>
  )
}
