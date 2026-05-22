'use client'
/**
 * `<IndicatorDetailLayout />` · página /macro/pulso/indicator/[id].
 *
 * 9 subtabs verticales (tabs cliente):
 *   1. Resumen        · hero + lectura IA enriquecida
 *   2. Serie histórica · chart full + tabla
 *   3. Descomposición  · si aplica (placeholder · fuente-dependiente)
 *   4. Comparativa     · peers UE (IMF)
 *   5. Territorio      · CCAA (placeholder · sólo aplica a ciertos indicadores)
 *   6. Relaciones      · vínculos con otros indicadores Pulso
 *   7. Impacto         · lectura política/social (parte del IA)
 *   8. Alertas         · estado vs umbrales
 *   9. Fuentes         · metadata completa
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'
import { DeepLineChart } from '@/components/macro/DeepLineChart'
import { TrendNarrative } from '@/components/macro/TrendNarrative'
import { CountryCompareBars } from '@/components/macro/CountryCompareBars'
import type { DetailAnalysisInput, DetailAnalysisResponse } from '@/lib/macro/ai-tab-schema'

type SubtabId =
  | 'resumen'
  | 'serie'
  | 'descomposicion'
  | 'comparativa'
  | 'territorio'
  | 'relaciones'
  | 'impacto'
  | 'alertas'
  | 'fuentes'

const SUBTABS: { id: SubtabId; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'serie', label: 'Serie histórica' },
  { id: 'descomposicion', label: 'Descomposición' },
  { id: 'comparativa', label: 'Comparativa internacional' },
  { id: 'territorio', label: 'Territorio' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'impacto', label: 'Impacto político-social' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'fuentes', label: 'Fuentes' },
]

interface PeersData {
  country: string
  series: { period: string; value: number }[]
  last: { period: string; value: number } | null
}

interface DetailPayload {
  ok: boolean
  meta: PulsoIndicatorMeta
  data: PulsoFetchResult
  peers: PeersData[] | null
  generated_at: string
}

export function IndicatorDetailLayout({ payload }: { payload: DetailPayload }) {
  const [tab, setTab] = useState<SubtabId>('resumen')
  const [ai, setAi] = useState<DetailAnalysisResponse | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [aiError, setAiError] = useState<string | null>(null)

  const meta = payload.meta
  const data = payload.data
  const series = data?.series ?? []
  const peers = payload.peers ?? []

  // Auto-pide AI detail al cargar
  useEffect(() => {
    if (!series || series.length < 4) return
    if (aiState !== 'idle') return
    const key = `macro:detail-ai:${meta.id}:${series[series.length - 1]?.period}`
    try {
      const cached = window.sessionStorage.getItem(key)
      if (cached) {
        setAi({ ...(JSON.parse(cached) as DetailAnalysisResponse), cache_hit: true })
        setAiState('success')
        return
      }
    } catch {/* */}

    setAiState('loading')
    const input: DetailAnalysisInput = {
      indicatorId: meta.id,
      indicatorLabel: meta.label,
      tabSlug: 'pulso-macro',
      unit: meta.unit,
      source: meta.source,
      sourceCode: meta.sourceCode,
      series: series.filter((p) => p.value != null).map((p) => ({ period: p.period, value: p.value as number, forecast: p.forecast })),
      peers: peers?.map((p) => ({ country: p.country, lastValue: p.last?.value ?? null, lastPeriod: p.last?.period ?? null })),
      threshold: meta.threshold,
      notes: [`Frecuencia: ${meta.frequency}.`, meta.description],
      windowLabel: `${series.length} puntos`,
    }
    fetch('/api/macro/ai/analyze-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) {
          setAiError(j?.error || 'ai_failed')
          setAiState('error')
          return
        }
        setAi(j as DetailAnalysisResponse)
        setAiState('success')
        try { window.sessionStorage.setItem(key, JSON.stringify(j)) } catch {/* */}
      })
      .catch((e) => {
        setAiError(e.message)
        setAiState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.id])

  const chartPoints = useMemo(
    () => series.filter((p) => p.value != null).map((p) => ({ period: p.period, value: p.value as number })),
    [series]
  )
  const histPoints = useMemo(() => chartPoints.filter((_, i) => !series[i]?.forecast), [chartPoints, series])
  const fcPoints = useMemo(() => chartPoints.filter((_, i) => series[i]?.forecast), [chartPoints, series])
  const last = data?.last
  const periods = chartPoints.length
  const trend = useTrend(chartPoints)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header indicador */}
      <header
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderLeft: `4px solid ${meta.accent}`,
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: meta.accent, textTransform: 'uppercase' }}>
              {meta.family.toUpperCase()} · {meta.sourceCode}
            </p>
            <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{meta.label}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', maxWidth: 700 }}>{meta.description}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Último valor</p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 36,
                fontWeight: 700,
                color: meta.accent,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {last?.value != null ? `${formatNumber(last.value, meta.decimals)}${meta.unit}` : '—'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
              {last?.period ?? 's/d'} · {meta.source}
            </p>
          </div>
        </div>
      </header>

      {/* Subtabs nav */}
      <nav
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 6,
        }}
      >
        {SUBTABS.map((s) => {
          const active = tab === s.id
          return (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              type="button"
              style={{
                background: active ? meta.accent : 'transparent',
                color: active ? '#fff' : '#475569',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                letterSpacing: 0.2,
              }}
            >
              {s.label}
            </button>
          )
        })}
      </nav>

      {/* Content per subtab */}
      {tab === 'resumen' && (
        <Resumen ai={ai} aiState={aiState} aiError={aiError} chartPoints={chartPoints} accent={meta.accent} unit={meta.unit} decimals={meta.decimals} />
      )}
      {tab === 'serie' && <SerieHistorica chartPoints={chartPoints} histPoints={histPoints} fcPoints={fcPoints} accent={meta.accent} unit={meta.unit} decimals={meta.decimals} />}
      {tab === 'descomposicion' && <Descomposicion meta={meta} />}
      {tab === 'comparativa' && <Comparativa meta={meta} peers={peers} />}
      {tab === 'territorio' && <Territorio meta={meta} />}
      {tab === 'relaciones' && <Relaciones meta={meta} />}
      {tab === 'impacto' && <Impacto ai={ai} aiState={aiState} />}
      {tab === 'alertas' && <Alertas meta={meta} last={last} />}
      {tab === 'fuentes' && <Fuentes meta={meta} trend={trend} periods={periods} />}
    </div>
  )
}

// ─── Subtabs ────────────────────────────────────────────────────────────

function Resumen({
  ai,
  aiState,
  aiError,
  chartPoints,
  accent,
  unit,
  decimals,
}: {
  ai: DetailAnalysisResponse | null
  aiState: 'idle' | 'loading' | 'success' | 'error'
  aiError: string | null
  chartPoints: { period: string; value: number }[]
  accent: string
  unit: string
  decimals: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: accent, textTransform: 'uppercase' }}>
          Serie {chartPoints.length} puntos
        </p>
        <div style={{ marginTop: 8 }}>
          <DeepLineChart
            series={[{ id: 'main', label: 'Serie', color: accent, points: chartPoints, fillBelow: true }]}
            height={220}
            formatValue={(v) => `${v.toFixed(decimals)}${unit}`}
            zeroLine
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <TrendNarrative label="Serie" unit={unit} decimals={decimals} series={chartPoints as any} accent={accent} />
        </div>
      </section>

      <section
        style={{
          background: 'linear-gradient(180deg, #faf5ff 0%, #fff 70%)',
          border: '1px solid #e9d5ff',
          borderLeft: '4px solid #7c3aed',
          borderRadius: 12,
          padding: 18,
        }}
      >
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
          ✦ Análisis profundo IA · detail
        </p>
        {aiState === 'loading' && <p style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Generando análisis profundo…</p>}
        {aiState === 'error' && <p style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>Error IA: {aiError}</p>}
        {aiState === 'success' && ai && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{ai.insight.headline}</p>
            <p style={{ margin: '6px 0 0' }}>
              <span style={{ fontSize: 10, padding: '2px 6px', background: '#ede9fe', color: '#5b21b6', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4, marginRight: 6 }}>
                FASE · {ai.insight.cyclePhase.toUpperCase()}
              </span>
            </p>
            <p style={{ margin: '10px 0 0' }}>{ai.insight.longExplanation}</p>

            {ai.insight.inflectionPoints.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Puntos de inflexión
                </p>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {ai.insight.inflectionPoints.map((p, i) => (
                    <li key={i}>
                      <strong>{p.period}:</strong> {p.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
                Drivers identificados
              </p>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {ai.insight.drivers.map((d, i) => (
                  <li key={i}>
                    <strong>{d.driver}:</strong> {d.evidence}{' '}
                    <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>({Math.round(d.confidence * 100)}%)</span>
                  </li>
                ))}
              </ul>
            </div>

            {ai.insight.internationalContext && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Contexto internacional
                </p>
                <p style={{ margin: '4px 0 0' }}>{ai.insight.internationalContext}</p>
              </div>
            )}

            {ai.insight.forecastReading && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Lectura del forecast
                </p>
                <p style={{ margin: '4px 0 0' }}>{ai.insight.forecastReading}</p>
              </div>
            )}

            <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>{ai.disclaimer}</p>
          </div>
        )}
      </section>
    </div>
  )
}

function SerieHistorica({
  chartPoints,
  histPoints,
  fcPoints,
  accent,
  unit,
  decimals,
}: {
  chartPoints: { period: string; value: number }[]
  histPoints: { period: string; value: number }[]
  fcPoints: { period: string; value: number }[]
  accent: string
  unit: string
  decimals: number
}) {
  void histPoints
  void fcPoints
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: accent, textTransform: 'uppercase' }}>
        Serie completa · {chartPoints.length} puntos
      </p>
      <div style={{ marginTop: 8 }}>
        <DeepLineChart
          series={[{ id: 'm', label: 'Serie', color: accent, points: chartPoints, fillBelow: true, forecastFromIndex: histPoints.length }]}
          height={320}
          formatValue={(v) => `${v.toFixed(decimals)}${unit}`}
          zeroLine
        />
      </div>
      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          Ver tabla de datos ({chartPoints.length} puntos)
        </summary>
        <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>Período</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 10 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {chartPoints.slice().reverse().map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 8px', color: '#0f172a' }}>{p.period}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {p.value.toFixed(decimals)}{unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function Descomposicion({ meta }: { meta: PulsoIndicatorMeta }) {
  return (
    <Placeholder title="Descomposición · próximamente">
      Para indicadores agregados (PIB, IPC, EPA) construiremos un desglose en componentes desde la
      contabilidad nacional o subgrupos del IPC. <strong>{meta.label}</strong> usa código{' '}
      <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{meta.sourceCode}</code>
      .
    </Placeholder>
  )
}

function Comparativa({ meta, peers }: { meta: PulsoIndicatorMeta; peers: PeersData[] }) {
  if (!meta.imfIndicator) {
    return <Placeholder title="Comparativa internacional">Este indicador no tiene contraparte directa en IMF DataMapper.</Placeholder>
  }
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
        Comparativa · España vs peers UE · {meta.imfIndicator}
      </p>
      <div style={{ marginTop: 10 }}>
        <CountryCompareBars
          indicator={meta.imfIndicator}
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']}
          spainColor={meta.accent}
          unit={meta.unit}
          decimals={meta.decimals}
        />
      </div>
      {peers.length > 0 && (
        <table style={{ width: '100%', fontSize: 11, marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>País</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 10 }}>Último</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 10 }}>Período</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 600 }}>{p.country}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.last?.value != null ? `${p.last.value.toFixed(meta.decimals)}${meta.unit}` : '—'}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>{p.last?.period ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Territorio({ meta }: { meta: PulsoIndicatorMeta }) {
  return (
    <Placeholder title="Territorio (CCAA)">
      Para indicadores con desagregación regional (EPA por CCAA, IPV provincial, IPC regional)
      añadiremos un mapa NUTS2/3. <strong>{meta.label}</strong>{' '}
      {meta.family === 'pib' || meta.family === 'precios' || meta.family === 'empleo'
        ? 'tiene desagregación territorial disponible vía INE.'
        : 'no tiene desagregación territorial directa.'}
    </Placeholder>
  )
}

function Relaciones({ meta }: { meta: PulsoIndicatorMeta }) {
  return (
    <Placeholder title="Relaciones con otros indicadores">
      Próximamente: matriz de correlación y leads/lags con otros indicadores Pulso. Para{' '}
      <strong>{meta.label}</strong> ({meta.family}), relaciones esperadas:
      <ul style={{ marginTop: 8 }}>
        <li>
          Indicadores procíclicos: <em>consumo, inversión, empleo</em>
        </li>
        <li>
          Indicadores contracíclicos: <em>paro, déficit, spread soberano</em>
        </li>
        <li>
          Adelantados: <em>PMI, confianza consumidor</em>
        </li>
      </ul>
    </Placeholder>
  )
}

function Impacto({ ai, aiState }: { ai: DetailAnalysisResponse | null; aiState: string }) {
  if (aiState !== 'success' || !ai) {
    return <Placeholder title="Impacto político-social">El análisis IA aún no se ha cargado. Vuelve cuando termine de razonar.</Placeholder>
  }
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
        Impacto político-social · lectura IA
      </p>
      {ai.insight.politicalEconomySignals.length === 0 && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
          El modelo no identificó señales político-económicas relevantes en este indicador.
        </p>
      )}
      {ai.insight.politicalEconomySignals.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          {ai.insight.politicalEconomySignals.map((s, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{s}</li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>{ai.disclaimer}</p>
    </section>
  )
}

function Alertas({ meta, last }: { meta: PulsoIndicatorMeta; last: { period: string; value: number | null } | null | undefined }) {
  const v = last?.value
  if (!meta.threshold) {
    return <Placeholder title="Alertas">Este indicador no tiene umbral definido en el catálogo Pulso.</Placeholder>
  }
  if (v == null) {
    return <Placeholder title="Alertas">Sin dato disponible para evaluar umbrales.</Placeholder>
  }
  const { amber, red, goodAbove } = meta.threshold
  let level: 'verde' | 'ambar' | 'rojo' = 'verde'
  let reason = ''
  if (goodAbove === true) {
    if (red != null && v <= red) { level = 'rojo'; reason = `${v}${meta.unit} ≤ rojo ${red}` }
    else if (amber != null && v < amber) { level = 'ambar'; reason = `${v}${meta.unit} < ámbar ${amber}` }
    else { reason = `${v}${meta.unit} ≥ ámbar ${amber ?? '-'}` }
  } else {
    if (red != null && v >= red) { level = 'rojo'; reason = `${v}${meta.unit} ≥ rojo ${red}` }
    else if (amber != null && v > amber) { level = 'ambar'; reason = `${v}${meta.unit} > ámbar ${amber}` }
    else { reason = `${v}${meta.unit} ≤ ámbar ${amber ?? '-'}` }
  }
  const color = level === 'rojo' ? '#dc2626' : level === 'ambar' ? '#f59e0b' : '#16a34a'
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color, textTransform: 'uppercase' }}>
        Estado actual · {level.toUpperCase()}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#0f172a' }}>{reason}</p>
      <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
        Umbrales: ámbar {amber ?? '-'} · rojo {red ?? '-'} · mejor si {goodAbove ? 'mayor' : 'menor'}
      </p>
    </section>
  )
}

function Fuentes({ meta, trend, periods }: { meta: PulsoIndicatorMeta; trend: string; periods: number }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: meta.accent, textTransform: 'uppercase' }}>
        Fuentes y metadata
      </p>
      <dl style={{ marginTop: 10, fontSize: 12, color: '#334155', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '4px 12px' }}>
        <dt style={{ color: '#94a3b8' }}>Fuente</dt><dd style={{ margin: 0 }}>{meta.source}</dd>
        <dt style={{ color: '#94a3b8' }}>Código fuente</dt><dd style={{ margin: 0, fontFamily: 'monospace' }}>{meta.sourceCode}</dd>
        <dt style={{ color: '#94a3b8' }}>Frecuencia</dt><dd style={{ margin: 0 }}>{meta.frequency}</dd>
        <dt style={{ color: '#94a3b8' }}>Familia</dt><dd style={{ margin: 0 }}>{meta.family}</dd>
        <dt style={{ color: '#94a3b8' }}>Endpoint local</dt><dd style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{meta.endpoint}</dd>
        <dt style={{ color: '#94a3b8' }}>Periodos cargados</dt><dd style={{ margin: 0 }}>{periods}</dd>
        <dt style={{ color: '#94a3b8' }}>Tendencia (recent)</dt><dd style={{ margin: 0 }}>{trend}</dd>
      </dl>
      <p style={{ marginTop: 12, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
        {meta.description}
      </p>
    </section>
  )
}

function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 18, color: '#475569' }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#64748b', textTransform: 'uppercase' }}>{title}</p>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>{children}</div>
    </section>
  )
}

// ─── Utilidades ─────────────────────────────────────────────────────────

function formatNumber(v: number, decimals: number): string {
  if (Math.abs(v) >= 10000) return v.toLocaleString('es-ES', { maximumFractionDigits: decimals })
  return v.toFixed(decimals)
}

function useTrend(points: { period: string; value: number }[]): string {
  if (points.length < 4) return 'serie corta'
  const tail = points.slice(-6)
  const first = tail[0]?.value
  const last = tail[tail.length - 1]?.value
  if (first == null || last == null) return 's/d'
  const delta = last - first
  if (Math.abs(delta) < 0.1) return 'plano'
  return delta > 0 ? `subida (${delta.toFixed(2)})` : `bajada (${delta.toFixed(2)})`
}

export { Link as _Link }
