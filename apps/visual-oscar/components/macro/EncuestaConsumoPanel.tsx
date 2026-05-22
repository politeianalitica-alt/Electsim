'use client'
/**
 * `<EncuestaConsumoPanel />` · Panel EPF · Encuesta Presupuestos Familiares.
 *
 * Visualiza el comportamiento de gasto de los hogares españoles según INE EPF:
 *  - KPIs · gasto medio hogar/persona/UC + comparación corrientes vs constantes
 *  - 13 grupos COICOP 2018 con barras horizontales + share %
 *  - Ranking 17 CCAA con desviación vs nacional
 *  - Serie histórica nacional (base 2006)
 *
 * Fuente única: INE WSTempus (tablas 73778, 73991, 75003, 28486).
 */
import { useEffect, useState } from 'react'
import { MacroPanel } from './MacroPanel'
import { MacroKpiCard } from './MacroKpiCard'
import { DeepLineChart } from './DeepLineChart'
import { TrendNarrative } from './TrendNarrative'

const ACCENT = '#16A34A'

interface OverviewResp {
  ok: boolean
  year?: number
  gasto_medio_hogar_corrientes?: { cod: string; value: number; year: number } | null
  gasto_medio_hogar_constantes?: { cod: string; value: number; year: number } | null
  gasto_medio_persona_corrientes?: { cod: string; value: number; year: number } | null
  gasto_medio_unidad_consumo_corrientes?: { cod: string; value: number; year: number } | null
}
interface GruposResp {
  ok: boolean
  year?: number
  n_grupos?: number
  total_sum_eur?: number
  grupos?: { name: string; cod: string; value: number; year: number; share_pct: number }[]
}
interface CcaaResp {
  ok: boolean
  year?: number
  nacional?: { value: number; year: number } | null
  n_ccaa?: number
  ccaa?: { name: string; cod: string; value: number; delta_vs_nacional: number | null; ratio_vs_nacional: number | null }[]
}
interface HistResp {
  ok: boolean
  hogar?: { cod: string; name: string; points: { period: string; year: number; value: number | null }[] } | null
  persona?: { cod: string; name: string; points: { period: string; year: number; value: number | null }[] } | null
}

// Colores por grupo COICOP 2018
const GROUP_COLORS: Record<string, string> = {
  'Vivienda':       '#dc2626',
  'Alimentos':      '#16a34a',
  'Transporte':     '#0891b2',
  'Restaurantes':   '#f97316',
  'Actividades':    '#a855f7',
  'Vestido':        '#ec4899',
  'Sanidad':        '#3b82f6',
  'Información':    '#8b5cf6',
  'Seguros':        '#64748b',
  'Cuidado':        '#84cc16',
  'Muebles':        '#06b6d4',
  'Servicios':      '#f59e0b',
  'Bebidas':        '#475569',
}
function colorForGroup(name: string): string {
  for (const key of Object.keys(GROUP_COLORS)) {
    if (name.includes(key)) return GROUP_COLORS[key]
  }
  return '#94a3b8'
}

const fmtEur = (v: number | null | undefined, dec = 0): string => {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' €'
}

export function EncuestaConsumoPanel() {
  const [overview, setOverview] = useState<OverviewResp | null>(null)
  const [grupos, setGrupos] = useState<GruposResp | null>(null)
  const [ccaa, setCcaa] = useState<CcaaResp | null>(null)
  const [hist, setHist] = useState<HistResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/epf-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/epf-grupos',  { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/epf-ccaa',    { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/epf-historico?n=15', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([o, g, c, h]) => {
      if (!alive) return
      setOverview(o); setGrupos(g); setCcaa(c); setHist(h); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const hogarCorr = overview?.gasto_medio_hogar_corrientes
  const hogarConst = overview?.gasto_medio_hogar_constantes
  const persona = overview?.gasto_medio_persona_corrientes
  const uc = overview?.gasto_medio_unidad_consumo_corrientes

  // Diferencia corrientes vs constantes = inflación acumulada implícita
  const inflacionImplicita = hogarCorr?.value && hogarConst?.value
    ? ((hogarCorr.value - hogarConst.value) / hogarConst.value) * 100
    : null

  // Serie histórica para el chart
  const histSeries = (hist?.hogar?.points || [])
    .filter((p) => p.value != null)
    .map((p) => ({ period: String(p.year), value: p.value as number }))
    .reverse()  // INE devuelve más reciente primero

  if (loading) {
    return (
      <MacroPanel accent={ACCENT} title="EPF · Encuesta Presupuestos Familiares" subtitle="Cargando datos INE EPF…" status="loading">
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>4 endpoints INE WSTempus en paralelo…</p>
      </MacroPanel>
    )
  }

  if (!overview?.ok && !grupos?.ok && !ccaa?.ok) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPIs gasto medio */}
      {overview?.ok && (
        <MacroPanel
          accent={ACCENT}
          title="EPF · Encuesta Presupuestos Familiares"
          subtitle={`Gasto medio anual hogares españoles · año ${overview.year} · INE`}
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {hogarCorr && (
              <MacroKpiCard
                label="Gasto/hogar (corrientes)"
                value={hogarCorr.value}
                unit=" €"
                color={ACCENT}
                decimals={0}
                footer={`INE EPF · ${hogarCorr.cod}`}
              />
            )}
            {hogarConst && (
              <MacroKpiCard
                label="Gasto/hogar (constantes)"
                value={hogarConst.value}
                unit=" €"
                color="#10b981"
                decimals={0}
                footer="Deflactado · poder real"
              />
            )}
            {persona && (
              <MacroKpiCard
                label="Gasto/persona"
                value={persona.value}
                unit=" €"
                color="#0891b2"
                decimals={0}
                footer="EPF gasto medio personal"
              />
            )}
            {uc && (
              <MacroKpiCard
                label="Gasto/unidad consumo"
                value={uc.value}
                unit=" €"
                color="#7c3aed"
                decimals={0}
                footer="Escala de equivalencia OCDE"
              />
            )}
            {inflacionImplicita != null && (
              <MacroKpiCard
                label="Δ vs constantes"
                value={inflacionImplicita}
                unit="%"
                color="#f59e0b"
                decimals={1}
                footer="Inflación implícita acumulada"
              />
            )}
          </div>
          <p style={{ fontSize: 11, color: '#64748b', margin: '10px 0 0', lineHeight: 1.6 }}>
            <strong>Lectura:</strong> en <strong>{overview.year}</strong> el hogar español medio gastó{' '}
            <strong>{fmtEur(hogarCorr?.value)}</strong> en valor nominal. Ajustado a precios constantes, el poder real
            equivale a <strong>{fmtEur(hogarConst?.value)}</strong> (gap implícito{' '}
            <strong>{inflacionImplicita?.toFixed(1)}%</strong> por inflación acumulada desde la base de comparación).
            El gasto por persona se sitúa en <strong>{fmtEur(persona?.value)}</strong>, y la unidad de consumo OCDE en{' '}
            <strong>{fmtEur(uc?.value)}</strong>.
          </p>
        </MacroPanel>
      )}

      {/* Distribución por grupo COICOP */}
      {grupos?.ok && grupos.grupos && grupos.grupos.length > 0 && (
        <MacroPanel
          accent="#0891b2"
          title={`Distribución del gasto · ${grupos.n_grupos} grupos COICOP 2018`}
          subtitle={`Gasto medio por hogar · año ${grupos.year} · barras ordenadas por importe`}
          status="live"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grupos.grupos.map((g, i) => {
              const maxVal = grupos.grupos![0].value
              const barW = (g.value / maxVal) * 100
              const color = colorForGroup(g.name)
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40% 1fr 70px 60px', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 500 }}>{g.name}</span>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 18, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barW}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 4,
                      transition: 'width 200ms',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: color, fontVariantNumeric: 'tabular-nums', fontWeight: 700, textAlign: 'right' }}>
                    {fmtEur(g.value)}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                    {g.share_pct.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
          {grupos.grupos.length >= 3 && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 0', lineHeight: 1.6 }}>
              <strong>Top 3 partidas:</strong> {grupos.grupos[0].name} ({grupos.grupos[0].share_pct.toFixed(1)}%),
              {' '}{grupos.grupos[1].name} ({grupos.grupos[1].share_pct.toFixed(1)}%) y
              {' '}{grupos.grupos[2].name} ({grupos.grupos[2].share_pct.toFixed(1)}%) suman
              {' '}<strong>{(grupos.grupos[0].share_pct + grupos.grupos[1].share_pct + grupos.grupos[2].share_pct).toFixed(0)}%</strong> del gasto total.
              Vivienda + Transporte + Alimentación marcan el patrón típico de la cesta de consumo española.
            </p>
          )}
        </MacroPanel>
      )}

      {/* Ranking CCAA */}
      {ccaa?.ok && ccaa.ccaa && ccaa.ccaa.length > 0 && (
        <MacroPanel
          accent="#7c3aed"
          title={`Gasto medio por hogar · 17 CCAA (año ${ccaa.year})`}
          subtitle={`Total Nacional: ${fmtEur(ccaa.nacional?.value)} · barra azul = por encima de la media, roja = por debajo`}
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>#</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>CCAA</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Gasto medio</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Δ vs nacional</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>% nacional</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {ccaa.ccaa.map((c, i) => {
                const above = (c.delta_vs_nacional ?? 0) >= 0
                const ratioBar = c.ratio_vs_nacional ?? 100
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '5px 10px', color: '#0f172a', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {fmtEur(c.value)}
                    </td>
                    <td style={{
                      padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                      color: above ? '#16a34a' : '#dc2626',
                    }}>
                      {above ? '+' : ''}{Math.round(c.delta_vs_nacional ?? 0).toLocaleString('es-ES')} €
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                      {c.ratio_vs_nacional?.toFixed(0)}%
                    </td>
                    <td style={{ padding: '5px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, width: 120, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#94a3b8',
                        }} />
                        {above ? (
                          <div style={{
                            position: 'absolute', left: '50%', top: 0,
                            width: `${Math.min((ratioBar - 100) * 1.5, 50)}%`, height: '100%',
                            background: '#0891b2', borderRadius: 3,
                          }} />
                        ) : (
                          <div style={{
                            position: 'absolute', right: '50%', top: 0,
                            width: `${Math.min((100 - ratioBar) * 1.5, 50)}%`, height: '100%',
                            background: '#dc2626', borderRadius: 3,
                          }} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {ccaa.ccaa.length >= 3 && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 0', lineHeight: 1.6 }}>
              <strong>Concentración del gasto:</strong> {ccaa.ccaa[0].name} lidera con{' '}
              <strong>{fmtEur(ccaa.ccaa[0].value)}</strong> ({ccaa.ccaa[0].ratio_vs_nacional?.toFixed(0)}% del nacional),
              seguida por {ccaa.ccaa[1].name} y {ccaa.ccaa[2].name}. En la cola,{' '}
              <strong>{ccaa.ccaa[ccaa.ccaa.length - 1].name}</strong> con{' '}
              <strong>{fmtEur(ccaa.ccaa[ccaa.ccaa.length - 1].value)}</strong> (
              {ccaa.ccaa[ccaa.ccaa.length - 1].ratio_vs_nacional?.toFixed(0)}% del nacional). El gap entre el techo
              y el suelo es de{' '}
              <strong>{fmtEur(ccaa.ccaa[0].value - ccaa.ccaa[ccaa.ccaa.length - 1].value)}</strong> anuales por hogar.
            </p>
          )}
        </MacroPanel>
      )}

      {/* Serie histórica */}
      {hist?.ok && histSeries.length > 3 && (
        <MacroPanel
          accent="#f59e0b"
          title="EPF · Serie histórica nacional"
          subtitle={`Gasto medio por hogar Total Nacional · base 2006 · ${histSeries.length} años`}
          status="live"
        >
          <DeepLineChart
            series={[{
              id: 'epf-hogar', label: 'Gasto medio hogar', color: '#f59e0b',
              points: histSeries, fillBelow: true,
            }]}
            height={200}
            yLabel="€/año por hogar"
            formatValue={(v) => `${Math.round(v).toLocaleString('es-ES')} €`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Gasto medio por hogar"
              unit=" €"
              decimals={0}
              series={histSeries as any}
              accent="#f59e0b"
            />
          </div>
        </MacroPanel>
      )}
    </div>
  )
}

export default EncuestaConsumoPanel
