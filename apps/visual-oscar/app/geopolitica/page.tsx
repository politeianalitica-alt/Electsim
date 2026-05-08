'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// ── helpers ──────────────────────────────────────────────────────────────────
function nivelColor(n: string) {
  if (n === 'CRITICO') return '#c42c2c'
  if (n === 'ALTO') return '#b25000'
  if (n === 'MEDIO') return '#1F4E8C'
  return '#6e6e73'
}
function osintSourceBorderColor(fuente: string): string {
  if (/RUSI|IISS|War on the Rocks|SIPRI/i.test(fuente)) return '#c42c2c'
  if (/Elcano|CIDOB|ECFR|EUISS|Atlantic Council/i.test(fuente)) return '#1F4E8C'
  if (/OIES|IEA|energy/i.test(fuente)) return '#b25000'
  if (/ICG|Mixed Migration|InSight/i.test(fuente)) return '#D97706'
  return '#6e6e73'
}
function catColor(c: string) {
  if (c === 'diplomatica') return '#1F4E8C'
  if (c === 'empresarial') return '#2d8a39'
  if (c === 'militar') return '#c42c2c'
  if (c === 'energetica') return '#b25000'
  return '#6e6e73'
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso?.slice(0, 16) ?? '—'
  }
}

// ── sub-components ────────────────────────────────────────────────────────────
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e8e8ed', marginBottom: 28, overflowX: 'auto' }}>
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            border: 'none',
            borderBottom: active === i ? '2px solid #1d1d1f' : '2px solid transparent',
            background: 'transparent',
            padding: '12px 20px',
            marginBottom: -1,
            fontSize: 13,
            fontWeight: active === i ? 600 : 400,
            color: active === i ? '#1d1d1f' : '#6e6e73',
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── types ─────────────────────────────────────────────────────────────────────
interface GeoStats {
  osint_24h: number
  alertas_activas: number
  paises_monitorizados: number
  presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
}
interface RiesgoItem {
  pais: string; iso: string; score: number; interes_espana: number; lat: number; lon: number; categoria: string
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string; urgencia: number; categoria: string; resumen: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string; paises: string[]; descripcion: string; fuente: string
}
interface ImpactoItem {
  id: string; titulo: string; dimension: string; severidad: number; horizonte: string; descripcion: string; paises_origen: string[]
}
interface PresenciaItem {
  pais: string; lat: number; lon: number; categoria: string; intensidad: number
}

// ── main component ────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)
  const [osintUrgMin, setOsintUrgMin] = useState(1)
  const [osintCat, setOsintCat] = useState('all')

  const { data: geoStatsRaw } = useApi<GeoStats & { data?: GeoStats }>('/api/geopolitica/stats', { refreshInterval: 60_000 })
  const { data: riesgoRaw } = useApi<{ data: RiesgoItem[] }>('/api/geopolitica/riesgo', { refreshInterval: 120_000 })
  const { data: osintRaw, loading: loadingOsint } = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint', { refreshInterval: 60_000 })
  const { data: alertasRaw } = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 30_000 })
  const { data: impactosRaw } = useApi<{ data: ImpactoItem[] }>('/api/geopolitica/impactos', { refreshInterval: 120_000 })
  const { data: presenciaRaw } = useApi<{ data: PresenciaItem[] }>('/api/geopolitica/presencia', { refreshInterval: 120_000 })

  const geoStats: GeoStats = (geoStatsRaw as GeoStats) ?? { osint_24h: 0, alertas_activas: 0, paises_monitorizados: 0, presencia_activa: 0, alertas_count: { CRITICO: 0, ALTO: 0, MEDIO: 0 } }
  const riesgo: RiesgoItem[] = riesgoRaw?.data ?? []
  const osint: OsintItem[] = osintRaw?.data ?? []
  const alertas: AlertaItem[] = alertasRaw?.data ?? []
  const impactos: ImpactoItem[] = impactosRaw?.data ?? []
  const presencia: PresenciaItem[] = presenciaRaw?.data ?? []

  const kpiCards = [
    { label: 'Señales OSINT 24h', value: geoStats.osint_24h, accent: '#0E7490' },
    { label: 'Alertas activas', value: geoStats.alertas_activas, accent: '#c42c2c' },
    { label: 'Países monitorizados', value: geoStats.paises_monitorizados, accent: '#2d8a39' },
    { label: 'Presencia activa', value: geoStats.presencia_activa, accent: '#1F4E8C' },
  ]

  const riesgoSorted = [...riesgo].sort((a, b) => b.score - a.score)
  const impactosSorted = [...impactos].sort((a, b) => b.severidad - a.severidad)

  const osintFiltered = osint.filter(
    (o) => o.urgencia >= osintUrgMin && (osintCat === 'all' || o.categoria === osintCat)
  )

  // alertas grouped by nivel
  const NIVEL_ORDER = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
  const alertasByNivel: Record<string, AlertaItem[]> = {}
  for (const a of alertas) {
    const k = ['CRITICO', 'ALTO', 'MEDIO'].includes(a.nivel) ? a.nivel : 'BAJO'
    if (!alertasByNivel[k]) alertasByNivel[k] = []
    alertasByNivel[k].push(a)
  }

  // presencia traces by categoria
  const PRESENCIA_CATS = ['diplomatica', 'empresarial', 'militar', 'energetica']
  const presenciaTraces = PRESENCIA_CATS.map((cat) => {
    const items = presencia.filter((p) => p.categoria === cat)
    return {
      type: 'scattergeo' as const,
      name: cat,
      lat: items.map((p) => p.lat),
      lon: items.map((p) => p.lon),
      text: items.map((p) => `${p.pais} (${p.intensidad})`),
      marker: {
        size: items.map((p) => p.intensidad / 10 + 8),
        color: catColor(cat),
        opacity: 0.85,
        line: { width: 1, color: '#fff' },
      },
      hovertemplate: '%{text}<extra></extra>',
    }
  })

  const geoLayout = {
    paper_bgcolor: '#0b1422',
    plot_bgcolor: '#0b1422',
    geo: {
      bgcolor: '#0b1422',
      landcolor: '#1e2d4a',
      oceancolor: '#0d1a2e',
      showocean: true,
      showland: true,
      showcoastlines: true,
      coastlinecolor: '#2d4470',
      showcountries: true,
      countrycolor: '#1a2d50',
      projection: { type: 'natural earth' },
      showframe: false,
    },
    margin: { t: 0, b: 0, l: 0, r: 0 },
    height: 400,
    font: { color: '#a0b0c0' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
      <AppHeader />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 40px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {kpiCards.map((k) => (
            <div key={k.label} style={{ background: '#fff', border: '1px solid #e8e8ed', borderLeft: `3px solid ${k.accent}`, borderRadius: 18, padding: '20px 24px' }}>
              <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 500, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{k.value}</div>
            </div>
          ))}
        </div>

        <TabBar
          items={['Teatro Global', 'OSINT', 'Alertas', 'Impacto España', 'Presencia Española', 'Análisis IA']}
          active={tab}
          onChange={setTab}
        />

        {/* TAB 0 — Teatro Global */}
        {tab === 0 && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '20px 24px', marginBottom: 20 }}>
              <Plot
                data={[{
                  type: 'scattergeo',
                  lat: riesgoSorted.map((r) => r.lat),
                  lon: riesgoSorted.map((r) => r.lon),
                  text: riesgoSorted.map((r) => `${r.pais}<br>Score: ${r.score}<br>Interés ES: ${r.interes_espana}`),
                  marker: {
                    size: riesgoSorted.map((r) => r.score * 3),
                    color: riesgoSorted.map((r) => r.score),
                    colorscale: [
                      [0, '#2d8a39'],
                      [0.5, '#b25000'],
                      [1, '#c42c2c'],
                    ],
                    showscale: false,
                    opacity: 0.8,
                    line: { width: 1, color: '#fff' },
                  },
                  hovertemplate: '%{text}<extra></extra>',
                }]}
                layout={geoLayout as object}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e8ed', background: '#f5f5f7' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>País</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score riesgo</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interés España</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {riesgoSorted.map((r, i) => (
                    <tr key={r.iso} style={{ borderTop: i > 0 ? '1px solid #f5f5f7' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{r.pais}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: r.score >= 8 ? '#c42c2c' : r.score >= 6 ? '#b25000' : '#2d8a39' }}>{r.score.toFixed(1)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: '#424245' }}>{r.interes_espana.toFixed(1)}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, background: `${catColor(r.categoria)}14`, color: catColor(r.categoria), fontSize: 11, fontWeight: 600 }}>{r.categoria}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1 — OSINT */}
        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>Urgencia mín.</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={osintUrgMin}
                  onChange={(e) => setOsintUrgMin(Number(e.target.value))}
                  style={{ width: 52, padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>Categoría</label>
                <select
                  value={osintCat}
                  onChange={(e) => setOsintCat(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                >
                  <option value="all">Todas</option>
                  <option value="migracion">Migración</option>
                  <option value="militar">Militar</option>
                  <option value="energia">Energía</option>
                  <option value="diplomatica">Diplomática</option>
                  <option value="seguridad">Seguridad</option>
                </select>
              </div>
              <span style={{ fontSize: 12, color: '#6e6e73' }}>
                {loadingOsint ? 'Cargando…' : `${osintFiltered.length} señales`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: '#f5f5f7', borderRadius: 10 }}>
              <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Fuentes:</span>
              {['Real Instituto Elcano', 'CIDOB', 'ECFR', 'RUSI', 'ICG CrisisWatch', 'Atlantic Council', 'EUISS', 'OIES', 'SIPRI', 'War on the Rocks'].map(s => (
                <span key={s} style={{ fontSize: 10, background: '#fff', border: '1px solid #e8e8ed', borderRadius: 6, padding: '2px 8px', color: '#424245', fontWeight: 500 }}>{s}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {osintFiltered.map((o) => (
                <div key={o.id} style={{ background: '#fff', border: '1px solid #e8e8ed', borderLeft: `3px solid ${osintSourceBorderColor(o.fuente)}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{o.titulo}</div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, background: '#f5f5f7', fontSize: 11, fontWeight: 500, color: '#424245' }}>{o.fuente}</span>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                        background: o.urgencia >= 4 ? '#c42c2c' : o.urgencia === 3 ? '#b25000' : '#6e6e73',
                      }}>{o.urgencia}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 8 }}>{fmtDate(o.fecha)} · <span style={{ color: catColor(o.categoria) }}>{o.categoria}</span></div>
                  <p style={{ fontSize: 13, color: '#424245', margin: 0, lineHeight: 1.6 }}>{o.resumen}</p>
                </div>
              ))}
              {osintFiltered.length === 0 && !loadingOsint && (
                <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
                  No hay señales con los filtros seleccionados
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2 — Alertas */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {NIVEL_ORDER.filter((n) => alertasByNivel[n]?.length > 0).map((nivel) => (
              <div key={nivel}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                  padding: '8px 16px', borderRadius: 10,
                  background: `${nivelColor(nivel)}12`,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: nivelColor(nivel), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: nivelColor(nivel), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{nivel}</span>
                  <span style={{ fontSize: 12, color: '#6e6e73' }}>({alertasByNivel[nivel].length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                  {alertasByNivel[nivel].map((a) => (
                    <div key={a.id} style={{ background: '#fff', border: `1px solid ${nivelColor(a.nivel)}30`, borderLeft: `3px solid ${nivelColor(a.nivel)}`, borderRadius: 14, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{a.titulo}</span>
                        <span style={{ fontSize: 11, color: '#8e8e93', flexShrink: 0, marginLeft: 12 }}>{fmtDate(a.fecha)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#424245', margin: '0 0 10px', lineHeight: 1.6 }}>{a.descripcion}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {a.paises.map((p) => (
                            <span key={p} style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.045)', fontSize: 11, fontWeight: 500, color: '#424245' }}>{p}</span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: '#6e6e73' }}>{a.fuente}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {alertas.length === 0 && (
              <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
                Sin alertas activas
              </div>
            )}
          </div>
        )}

        {/* TAB 3 — Impacto España */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {impactosSorted.map((imp) => {
              const hColor = imp.horizonte === 'corto' ? '#c42c2c' : imp.horizonte === 'medio' ? '#b25000' : '#2d8a39'
              return (
                <div key={imp.id} style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{imp.titulo}</span>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 999, background: `${catColor(imp.dimension)}14`, color: catColor(imp.dimension), fontSize: 11, fontWeight: 600 }}>{imp.dimension}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 999, background: `${hColor}14`, color: hColor, fontSize: 11, fontWeight: 600 }}>{imp.horizonte}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6e6e73' }}>Severidad</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: imp.severidad >= 4 ? '#c42c2c' : imp.severidad >= 3 ? '#b25000' : '#6e6e73' }}>{imp.severidad}/5</span>
                    </div>
                    <div style={{ height: 5, background: '#f5f5f7', borderRadius: 3 }}>
                      <div style={{ width: `${(imp.severidad / 5) * 100}%`, height: 5, borderRadius: 3, background: imp.severidad >= 4 ? '#c42c2c' : imp.severidad >= 3 ? '#b25000' : '#6e6e73' }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#424245', margin: '0 0 10px', lineHeight: 1.6 }}>{imp.descripcion}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {imp.paises_origen.map((p) => (
                      <span key={p} style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.045)', fontSize: 11, fontWeight: 500, color: '#424245' }}>{p}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 4 — Presencia Española */}
        {tab === 4 && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '20px 24px', marginBottom: 20 }}>
              <Plot
                data={presenciaTraces as object[]}
                layout={{ ...geoLayout, height: 360 } as object}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e8ed', background: '#f5f5f7' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>País</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', width: 200 }}>Intensidad</th>
                  </tr>
                </thead>
                <tbody>
                  {[...presencia].sort((a, b) => b.intensidad - a.intensidad).map((p, i) => (
                    <tr key={p.pais} style={{ borderTop: i > 0 ? '1px solid #f5f5f7' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{p.pais}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, background: `${catColor(p.categoria)}14`, color: catColor(p.categoria), fontSize: 11, fontWeight: 600 }}>{p.categoria}</span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ height: 5, flex: 1, background: '#f5f5f7', borderRadius: 3 }}>
                            <div style={{ width: `${p.intensidad}%`, height: 5, borderRadius: 3, background: catColor(p.categoria) }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: 'right', flexShrink: 0 }}>{p.intensidad}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5 — Análisis IA */}
        {tab === 5 && (
          <div style={{ background: '#f5f5f7', border: '1px solid #e8e8ed', borderRadius: 22, padding: '40px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Análisis geopolítico con IA</div>
            <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, maxWidth: 520 }}>
              Integración con Politeia Brain disponible próximamente. El módulo permitirá consultas en lenguaje natural sobre cualquier país o conflicto, análisis de escenarios con horizonte 90 días, y briefings geopolíticos personalizados.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
