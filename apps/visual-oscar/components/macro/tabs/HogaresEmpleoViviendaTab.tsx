'use client'
/**
 * `<HogaresEmpleoViviendaTab />` · Tab 10 · Hogares, empleo, vivienda.
 *
 * Combina:
 *  - INE EPA: paro armonizado + breakdown edad
 *  - INE IPV: precio vivienda nacional + nueva + segunda mano
 *  - INE ETCL: coste laboral
 *  - CIS: problemas vivienda + paro
 *  - Eurostat: renta disponible
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { MacroSpark } from '../MacroSpark'
import { getTab } from '@/lib/macro/sources-matrix'

export function HogaresEmpleoViviendaTab() {
  const tab = getTab('hogares-empleo-vivienda')
  const [epa, setEpa] = useState<any>(null)
  const [ipv, setIpv] = useState<any>(null)
  const [etcl, setEtcl] = useState<any>(null)
  const [cis, setCis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/epa?n=20', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/ipv?n=20', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/etcl?n=12', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/cis/problemas', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([e, i, et, c]) => {
      if (!alive) return
      setEpa(e); setIpv(i); setEtcl(et); setCis(c); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const paroLast = epa?.general?.points?.[0]
  const paroJovenes = epa?.menores_25?.points?.[0]
  const paroSpark = (epa?.general?.points || []).map((p: any) => p.value).filter((v: any) => Number.isFinite(v)).reverse()

  const ipvLast = ipv?.general?.points?.[0]
  const ipvNuevaLast = ipv?.nueva?.points?.[0]
  const ipvSegundaLast = ipv?.segunda?.points?.[0]
  const ipvSpark = (ipv?.general?.points || []).map((p: any) => p.value).filter((v: any) => Number.isFinite(v)).reverse()

  const etclLast = etcl?.total?.points?.[0]
  const problemaVivienda = cis?.problemas?.find?.((p: any) => p.problema?.toLowerCase()?.includes('vivienda'))?.pct
  const problemaParo = cis?.problemas?.find?.((p: any) => p.problema?.toLowerCase()?.includes('paro'))?.pct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="Tasa paro general"
          value={paroLast?.value ?? null}
          color={tab.themeAccent}
          spark={paroSpark.slice(-12)}
          footer={paroLast?.period ? `INE EPA · ${paroLast.period}` : 'INE EPA'}
          loading={loading}
        />
        <MacroKpiCard
          label="Paro juvenil <25"
          value={paroJovenes?.value ?? null}
          color="#dc2626"
          footer={paroJovenes?.period ? `INE EPA · ${paroJovenes.period}` : 'INE EPA'}
          loading={loading}
        />
        <MacroKpiCard
          label="IPV vivienda"
          value={ipvLast?.value ?? null}
          unit=""
          color="#16a34a"
          spark={ipvSpark.slice(-12)}
          decimals={1}
          footer={ipvLast?.period ? `INE IPV índice · ${ipvLast.period}` : 'INE IPV base 2015'}
          loading={loading}
        />
        <MacroKpiCard
          label="Coste laboral medio"
          value={etclLast?.value ?? null}
          unit=" €"
          color="#7c3aed"
          decimals={0}
          footer={etclLast?.period ? `INE ETCL · ${etclLast.period}` : 'INE ETCL'}
          loading={loading}
        />
      </div>

      {/* EPA paro serie */}
      <MacroPanel
        accent={tab.themeAccent}
        title="EPA · Tasa paro armonizado España"
        subtitle="Serie 20 trimestres · ambos sexos total nacional"
        status={epa?.ok ? 'live' : loading ? 'loading' : 'missing'}
      >
        {paroSpark.length > 2 ? (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16 }}>
            <MacroSpark points={paroSpark} color={tab.themeAccent} width={760} height={120} stroke={2.5} showLast />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
              <span>{epa?.general?.points?.[epa.general.points.length - 1]?.period}</span>
              <span style={{ fontWeight: 700 }}>
                Mín: {Math.min(...paroSpark).toFixed(1)}% · Máx: {Math.max(...paroSpark).toFixed(1)}%
              </span>
              <span>{epa?.general?.points?.[0]?.period}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{loading ? 'Cargando INE EPA…' : 'Datos no disponibles'}</p>
        )}
      </MacroPanel>

      {/* IPV breakdown */}
      <MacroPanel
        accent="#16a34a"
        title="IPV · Precio Vivienda España"
        subtitle="INE base 2015 · trimestral · breakdown total/nueva/segunda mano"
        status={ipv?.ok ? 'live' : 'missing'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { label: 'IPV total', val: ipvLast, color: '#16a34a' },
            { label: 'Vivienda nueva', val: ipvNuevaLast, color: '#10b981' },
            { label: 'Segunda mano', val: ipvSegundaLast, color: '#0d9488' },
          ].map((row, i) => (
            <MacroKpiCard
              key={i}
              label={row.label}
              value={row.val?.value ?? null}
              unit=""
              color={row.color}
              decimals={1}
              footer={row.val?.period ?? '—'}
            />
          ))}
        </div>
      </MacroPanel>

      {/* CIS problemas vivienda */}
      <MacroPanel
        accent="#0f766e"
        title="CIS · Problemas percibidos · vivienda y paro"
        subtitle={`Barómetro CIS ${cis?.oleada || '—'} · % respuesta espontánea`}
        status={cis?.ok ? 'live' : 'missing'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Vivienda · CIS
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              {problemaVivienda?.toFixed(1) ?? '—'}%
            </p>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>de respuestas espontáneas</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Paro · CIS
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#dc2626', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              {problemaParo?.toFixed(1) ?? '—'}%
            </p>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>de respuestas espontáneas</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Top problemas oleada
            </p>
            <ol style={{ fontSize: 11, color: '#0f172a', margin: '6px 0 0 0', paddingLeft: 16, lineHeight: 1.6 }}>
              {(cis?.problemas || []).slice(0, 4).map((p: any, i: number) => (
                <li key={i}>
                  <strong>{p.problema?.slice(0, 30)}</strong> · {p.pct?.toFixed(1)}%
                </li>
              ))}
            </ol>
          </div>
        </div>
      </MacroPanel>

      <section style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis EPA por género/CCAA + IPV por CCAA + percentiles salariales + ratio renta/vivienda llega en <strong>Sprint M6</strong>. Datos INE + CIS arriba ofrecen el plano principal.
        </p>
      </section>
    </div>
  )
}

export default HogaresEmpleoViviendaTab
