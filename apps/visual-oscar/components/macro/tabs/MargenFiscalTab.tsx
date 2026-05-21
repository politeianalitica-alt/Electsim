'use client'
/**
 * `<MargenFiscalTab />` · Tab 3 · Margen fiscal España.
 *
 * Combina:
 *  - IMF DataMapper: deuda %PIB (GGXWDG_NGDP), saldo fiscal (GGXCNL_NGDP)
 *  - AIReF previsiones (vía /api/datos-gob/airef-forecast · empty state didáctico)
 *  - Eurostat: deuda gov_10dd_ggdebt, déficit gov_10dd_edpt1 (anuales oficiales UE)
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { MacroSpark } from '../MacroSpark'
import { getTab } from '@/lib/macro/sources-matrix'

interface ImfPoint { year: number; value: number | null }
interface ImfData {
  ok?: boolean
  indicator?: string
  series?: { year: number; value: number | null }[]
  data_quality?: { source_type: string }
}

interface AirefData {
  ok?: boolean
  data_quality?: { source_type: string }
  activation_steps?: string[]
  fallback_endpoint?: string
  registration_url?: string
}

export function MargenFiscalTab() {
  const tab = getTab('margen-fiscal')
  const [deuda, setDeuda] = useState<ImfData | null>(null)
  const [saldo, setSaldo] = useState<ImfData | null>(null)
  const [primary, setPrimary] = useState<ImfData | null>(null)
  const [airef, setAiref] = useState<AirefData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXONLB_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/datos-gob/airef-forecast', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([d, s, p, a]) => {
      if (!alive) return
      setDeuda(d)
      setSaldo(s)
      setPrimary(p)
      setAiref(a)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const deudaSeries = (deuda?.series || []).filter((x) => x.value != null)
  const saldoSeries = (saldo?.series || []).filter((x) => x.value != null)
  const primarySeries = (primary?.series || []).filter((x) => x.value != null)

  const deudaLast = deudaSeries[deudaSeries.length - 1]
  const saldoLast = saldoSeries[saldoSeries.length - 1]
  const primaryLast = primarySeries[primarySeries.length - 1]

  // Forecast = IMF series ahora incluye proyecciones 5y · tomamos último observado vs último proyectado
  const deudaForecast5y = deudaSeries[deudaSeries.length - 1]
  const deudaActual = deudaSeries.find((x) => x.year === new Date().getFullYear() - 1) || deudaSeries[Math.max(deudaSeries.length - 6, 0)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="Deuda % PIB"
          value={deudaLast?.value ?? null}
          color={tab.themeAccent}
          spark={deudaSeries.slice(-20).map((p) => p.value!).filter((v) => v != null)}
          footer={deudaLast ? `Año ${deudaLast.year} · IMF GGXWDG_NGDP` : 'IMF GGXWDG_NGDP'}
          loading={loading}
        />
        <MacroKpiCard
          label="Saldo fiscal % PIB"
          value={saldoLast?.value ?? null}
          color="#f59e0b"
          spark={saldoSeries.slice(-20).map((p) => p.value!).filter((v) => v != null)}
          footer={saldoLast ? `Año ${saldoLast.year} · IMF GGXCNL_NGDP` : 'IMF GGXCNL_NGDP'}
          loading={loading}
        />
        <MacroKpiCard
          label="Saldo primario % PIB"
          value={primaryLast?.value ?? null}
          color="#10b981"
          spark={primarySeries.slice(-20).map((p) => p.value!).filter((v) => v != null)}
          footer="IMF GGXONLB_NGDP"
          loading={loading}
        />
        <MacroKpiCard
          label="Δ Deuda 5y"
          value={
            deudaForecast5y && deudaActual
              ? (deudaForecast5y.value! - deudaActual.value!)
              : null
          }
          unit="pp"
          color="#ef4444"
          footer="Variación deuda %PIB IMF forecast"
          decimals={1}
          loading={loading}
        />
      </div>

      {/* Trayectoria deuda histórica + forecast */}
      <MacroPanel
        accent={tab.themeAccent}
        title="Trayectoria Deuda Pública España · 20 años"
        subtitle="Serie histórica + forecast IMF WEO próximos 5 años"
        status={deuda?.ok ? 'live' : loading ? 'loading' : 'missing'}
      >
        {deudaSeries.length > 5 ? (
          <div style={{ background: '#fff8f8', borderRadius: 8, padding: 16 }}>
            <MacroSpark
              points={deudaSeries.slice(-25).map((p) => p.value!)}
              color={tab.themeAccent}
              width={760}
              height={140}
              stroke={2.5}
              showLast
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
              <span>{deudaSeries[Math.max(deudaSeries.length - 25, 0)]?.year}</span>
              <span style={{ fontWeight: 700 }}>
                Mín: {Math.min(...deudaSeries.slice(-25).map((p) => p.value!)).toFixed(1)}% ·
                Máx: {Math.max(...deudaSeries.slice(-25).map((p) => p.value!)).toFixed(1)}%
              </span>
              <span>{deudaSeries[deudaSeries.length - 1]?.year}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            {loading ? 'Cargando IMF…' : 'Serie deuda IMF no disponible'}
          </p>
        )}
      </MacroPanel>

      {/* Saldo descompuesto */}
      <MacroPanel
        accent="#f59e0b"
        title="Saldo fiscal · Total vs Primario"
        subtitle="Saldo total = primario − intereses · IMF anual"
        status={saldo?.ok ? 'live' : 'missing'}
      >
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontSize: 11 }}>Año</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontSize: 11 }}>Total %PIB</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontSize: 11 }}>Primario %PIB</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontSize: 11 }}>Intereses %PIB</th>
            </tr>
          </thead>
          <tbody>
            {saldoSeries.slice(-8).reverse().map((s, i) => {
              const p = primarySeries.find((x) => x.year === s.year)
              const intereses = p && s.value != null && p.value != null ? (p.value - s.value) : null
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600 }}>{s.year}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.value! < 0 ? '#dc2626' : '#16a34a' }}>
                    {s.value?.toFixed(1)}%
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (p?.value ?? 0) < 0 ? '#dc2626' : '#16a34a' }}>
                    {p?.value?.toFixed(1) ?? '—'}%
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                    {intereses != null ? `${intereses.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </MacroPanel>

      {/* AIReF empty state didáctico */}
      <MacroPanel
        accent="#94a3b8"
        title="AIReF · Previsiones fiscales independientes"
        subtitle={airef?.data_quality?.source_type === 'live' ? 'Datos integrados' : 'Pendiente activación · ver pasos'}
        status={airef?.data_quality?.source_type === 'live' ? 'live' : 'missing'}
      >
        <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
            <strong>Estado actual:</strong> AIReF publica previsiones en informes PDF trimestrales. datos.gob.es indexa metadata pero no series numéricas extraídas.
          </p>
          {airef?.activation_steps && (
            <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 20px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              {airef.activation_steps.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {airef?.fallback_endpoint && (
            <p style={{ fontSize: 11, color: '#0f766e', marginTop: 10 }}>
              <strong>Fallback activo:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>{airef.fallback_endpoint}</code>
            </p>
          )}
          {airef?.registration_url && (
            <a
              href={airef.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: tab.themeAccent, textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}
            >
              AIReF · publicaciones oficiales →
            </a>
          )}
        </div>
      </MacroPanel>

      <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Lectura fiscal con vector deuda+saldo+intereses+comparativa UE y prognosis AIReF se activa en <strong>Sprint M6</strong>. Por ahora datos IMF arriba ofrecen el plano principal.
        </p>
      </section>
    </div>
  )
}

export default MargenFiscalTab
