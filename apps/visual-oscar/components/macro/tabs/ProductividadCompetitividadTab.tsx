'use client'
/**
 * `<ProductividadCompetitividadTab />` · Tab 8 · Productividad & competitividad.
 *
 * Combina:
 *  - OEC ECI ranking España
 *  - INE ETCL coste laboral
 *  - Eurostat ULC, productividad
 *  - OEPM patentes (empty state)
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { OecdMacroPanel } from '../OecdMacroPanel'
import { getTab } from '@/lib/macro/sources-matrix'

export function ProductividadCompetitividadTab() {
  const tab = getTab('productividad-competitividad')
  const [oec, setOec] = useState<any>(null)
  const [etcl, setEtcl] = useState<any>(null)
  const [oepm, setOepm] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/oec/spain-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/etcl?n=12', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/datos-gob/oepm-patentes', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([o, e, p]) => {
      if (!alive) return
      setOec(o); setEtcl(e); setOepm(p); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const etclLast = etcl?.total?.points?.[0]
  const etclSpark = (etcl?.total?.points || []).map((p: any) => p.value).filter((v: any) => Number.isFinite(v)).reverse()
  const etclSerie = etcl?.total?.points || []
  const etclYoY = etclSerie.length >= 5
    ? ((etclLast?.value - etclSerie[4]?.value) / etclSerie[4]?.value) * 100
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="ECI · Score complejidad"
          value={oec?.eci_value ?? null}
          unit=""
          color={tab.themeAccent}
          decimals={2}
          footer="OEC.world · Economic Complexity Index"
          loading={loading}
        />
        <MacroKpiCard
          label="ECI · Ranking global"
          value={oec?.eci_rank ?? null}
          unit=""
          color="#0891b2"
          decimals={0}
          footer="OEC · entre todos los países del mundo"
          loading={loading}
        />
        <MacroKpiCard
          label="Coste laboral mes"
          value={etclLast?.value ?? null}
          unit=" €"
          color="#7c3aed"
          decimals={0}
          spark={etclSpark}
          footer={etclLast?.period ? `INE ETCL · ${etclLast.period}` : 'INE ETCL'}
          loading={loading}
        />
        <MacroKpiCard
          label="ETCL · YoY"
          value={etclYoY}
          unit="%"
          color="#10b981"
          decimals={1}
          footer="Variación coste laboral interanual"
          loading={loading}
        />
      </div>

      <MacroPanel
        accent={tab.themeAccent}
        title="OECD · indicadores macro complementarios"
        subtitle="Productividad + ULC + I+D + Tax revenue"
        status="live"
      >
        <OecdMacroPanel compact />
      </MacroPanel>

      <MacroPanel
        accent="#94a3b8"
        title="OEPM Patentes · España"
        subtitle="Oficina Española de Patentes y Marcas"
        status="missing"
      >
        <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
            <strong>Estado actual:</strong> OEPM no expone API JSON pública. Sus datos están en exports XML.
          </p>
          {oepm?.activation_steps && (
            <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 20px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              {oepm.activation_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {oepm?.fallback_endpoint && (
            <p style={{ fontSize: 11, color: '#0f766e', marginTop: 10 }}>
              <strong>Fallback:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>{oepm.fallback_endpoint}</code>
            </p>
          )}
        </div>
      </MacroPanel>

      <section style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis combinado ECI + ULC + I+D + exportaciones high-tech con benchmarking OCDE llega en <strong>Sprint M6</strong>.
        </p>
      </section>
    </div>
  )
}

export default ProductividadCompetitividadTab
