'use client'
/**
 * `<FlujosCapitalTab />` · Tab 7 · Flujos de capital España.
 *
 * Combina:
 *  - IMF BOP cuenta corriente (BCA_NGDPD) y cuenta financiera
 *  - Eurostat BOP cuenta corriente (tec00043 / tec00046)
 *  - DataInvex IED (vía empty state datos.gob.es)
 *  - BIS cross-border claims
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { MacroSpark } from '../MacroSpark'
import { getTab } from '@/lib/macro/sources-matrix'

export function FlujosCapitalTab() {
  const tab = getTab('flujos-capital')
  const [cuentaCorriente, setCuentaCorriente] = useState<any>(null)
  const [exportsImports, setExportsImports] = useState<any>(null)
  const [datainvex, setDatainvex] = useState<any>(null)
  const [bis, setBis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/imf/country?iso=ESP&indicator=BCA_NGDPD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=20', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/datos-gob/sci-inversiones', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/bis/fx-effective', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([cc, ei, di, b]) => {
      if (!alive) return
      setCuentaCorriente(cc); setExportsImports(ei); setDatainvex(di); setBis(b); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const ccSeries = (cuentaCorriente?.series || []).filter((x: any) => x.value != null)
  const ccLast = ccSeries[ccSeries.length - 1]
  const expSeries = (exportsImports?.exports?.points || []).filter((x: any) => x.value != null)
  const expLast = expSeries[0]
  const impLast = (exportsImports?.imports?.points || [])[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="Cuenta corriente %PIB"
          value={ccLast?.value ?? null}
          color={tab.themeAccent}
          spark={ccSeries.slice(-12).map((p: any) => p.value).filter((v: any) => Number.isFinite(v))}
          footer={ccLast ? `Año ${ccLast.year} · IMF BCA_NGDPD` : 'IMF BCA_NGDPD'}
          loading={loading}
        />
        <MacroKpiCard
          label="Exportaciones YoY"
          value={expLast?.value ?? null}
          color="#10b981"
          footer={expLast?.period ? `INE CNT · ${expLast.period}` : 'INE CNT'}
          loading={loading}
        />
        <MacroKpiCard
          label="Importaciones YoY"
          value={impLast?.value ?? null}
          color="#f97316"
          footer={impLast?.period ? `INE CNT · ${impLast.period}` : 'INE CNT'}
          loading={loading}
        />
        <MacroKpiCard
          label="REER efectivo"
          value={bis?.broad?.points?.slice?.(-1)?.[0]?.value ?? null}
          unit=""
          color="#0891b2"
          decimals={1}
          footer="BIS · tipo cambio real efectivo amplio"
          loading={loading}
        />
      </div>

      <MacroPanel
        accent={tab.themeAccent}
        title="Cuenta Corriente España · serie histórica IMF"
        subtitle="% PIB · superávit positivo, déficit negativo"
        status={cuentaCorriente?.ok ? 'live' : loading ? 'loading' : 'missing'}
      >
        {ccSeries.length > 5 ? (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16 }}>
            <MacroSpark
              points={ccSeries.slice(-20).map((p: any) => p.value)}
              color={tab.themeAccent}
              width={760}
              height={120}
              stroke={2.5}
              showLast
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
              <span>{ccSeries[Math.max(ccSeries.length - 20, 0)]?.year}</span>
              <span style={{ fontWeight: 700 }}>
                Mín: {Math.min(...ccSeries.slice(-20).map((p: any) => p.value)).toFixed(1)}% · Máx: {Math.max(...ccSeries.slice(-20).map((p: any) => p.value)).toFixed(1)}%
              </span>
              <span>{ccSeries[ccSeries.length - 1]?.year}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{loading ? 'Cargando IMF BOP…' : 'Datos no disponibles'}</p>
        )}
      </MacroPanel>

      <MacroPanel
        accent="#94a3b8"
        title="DataInvex · IED España"
        subtitle="Subdirección General Inversiones · Mincotur"
        status={datainvex?.data_quality?.source_type === 'live' ? 'live' : 'missing'}
      >
        <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
            <strong>Estado actual:</strong> DataInvex es fuente oficial española de IED pero publica CSV trimestrales por descarga manual (sin API).
          </p>
          {datainvex?.activation_steps && (
            <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 20px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              {datainvex.activation_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {datainvex?.fallback_endpoint && (
            <p style={{ fontSize: 11, color: '#0f766e', marginTop: 10 }}>
              <strong>Fallback:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>{datainvex.fallback_endpoint}</code>
            </p>
          )}
          {datainvex?.registration_url && (
            <a href={datainvex.registration_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: tab.themeAccent, textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}>
              DataInvex Mincotur →
            </a>
          )}
        </div>
      </MacroPanel>

      <section style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis NIIP + dependencia capital exterior + IED sectorial en <strong>Sprint M6</strong>. Datos IMF arriba ofrecen el plano principal.
        </p>
      </section>
    </div>
  )
}

export default FlujosCapitalTab
