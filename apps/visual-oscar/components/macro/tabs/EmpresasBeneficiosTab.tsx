'use client'
/**
 * `<EmpresasBeneficiosTab />` · Tab 9 · Empresas & beneficios.
 *
 * Combina:
 *  - Finnhub: cotizadas IBEX + ADRs + sectoriales
 *  - INE DIRCE: demografía empresarial
 *  - Registro Mercantil (empty state datos.gob.es)
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'

export function EmpresasBeneficiosTab() {
  const tab = getTab('empresas-beneficios')
  const [finnhub, setFinnhub] = useState<any>(null)
  const [dirce, setDirce] = useState<any>(null)
  const [registro, setRegistro] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/finnhub/dashboard', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/dirce-creacion?n=10', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/datos-gob/registro-mercantil', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([f, d, r]) => {
      if (!alive) return
      setFinnhub(f); setDirce(d); setRegistro(r); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const adrs = finnhub?.adrs || finnhub?.spanish_stocks || []
  const ibexQuote = finnhub?.indices?.find?.((q: any) => q.symbol?.includes('IBEX')) || finnhub?.ibex
  const nGainers = adrs.filter((a: any) => (a.change_pct ?? 0) > 0).length
  const nLosers = adrs.filter((a: any) => (a.change_pct ?? 0) < 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="IBEX 35"
          value={ibexQuote?.price ?? null}
          unit=" pts"
          delta={ibexQuote?.change_pct ?? null}
          color={tab.themeAccent}
          decimals={0}
          footer="Finnhub · live"
          loading={loading}
        />
        <MacroKpiCard
          label="Cotizadas en verde"
          value={nGainers}
          unit=""
          color="#16a34a"
          decimals={0}
          footer={`${adrs.length} ADRs monitorizadas`}
          loading={loading}
        />
        <MacroKpiCard
          label="Cotizadas en rojo"
          value={nLosers}
          unit=""
          color="#dc2626"
          decimals={0}
          footer={`${adrs.length} ADRs monitorizadas`}
          loading={loading}
        />
        <MacroKpiCard
          label="INE DIRCE · series"
          value={dirce?.n_series ?? null}
          unit=""
          color="#8b5cf6"
          decimals={0}
          footer="Indicador disponibilidad fuente"
          loading={loading}
        />
      </div>

      <MacroPanel
        accent={tab.themeAccent}
        title="Cotizadas España · Top performers"
        subtitle="Finnhub · ADRs SAN, BBVA, TEF, FER, IBE, REP, ITX..."
        status={adrs.length > 0 ? 'live' : loading ? 'loading' : 'missing'}
      >
        {adrs.length > 0 ? (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Ticker</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Empresa</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Precio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Δ %</th>
              </tr>
            </thead>
            <tbody>
              {adrs.slice(0, 15).map((q: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${q.price?.toFixed(2) ?? '—'}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: (q.change_pct ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{loading ? 'Cargando Finnhub…' : 'Datos cotizadas no disponibles'}</p>
        )}
      </MacroPanel>

      <MacroPanel
        accent="#8b5cf6"
        title="INE DIRCE · Demografía empresarial"
        subtitle="Directorio Central Empresas · publicación anual"
        status={dirce?.ok ? 'live' : 'missing'}
      >
        {dirce?.series_top && dirce.series_top.length > 0 ? (
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Código</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Serie</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Último</th>
              </tr>
            </thead>
            <tbody>
              {dirce.series_top.slice(0, 5).map((s: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{s.cod}</td>
                  <td style={{ padding: '6px 8px', color: '#0f172a' }}>{s.name?.slice(0, 80)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {s.points?.[0]?.value?.toLocaleString('es-ES') ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            DIRCE publica datos anuales (sept cada año). Fallback Eurostat bd_size_r3 anual UE-27.
          </p>
        )}
      </MacroPanel>

      <MacroPanel accent="#94a3b8" title="Registro Mercantil · estadística mensual" subtitle="Registradores de España · sociedades altas/bajas" status="missing">
        <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
            <strong>Estado actual:</strong> Registradores publica PDFs mensuales con creación/extinción sociedades. Datos.gob.es indexa pero no extrae series.
          </p>
          {registro?.activation_steps && (
            <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 20px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              {registro.activation_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {registro?.registration_url && (
            <a href={registro.registration_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: tab.themeAccent, textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}>
              Registradores estadísticas →
            </a>
          )}
        </div>
      </MacroPanel>

      <section style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis IBEX EPS agregado + márgenes sectoriales + cohortes demografía empresarial llega en <strong>Sprint M6</strong>.
        </p>
      </section>
    </div>
  )
}

export default EmpresasBeneficiosTab
