'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// ── helpers ──────────────────────────────────────────────────────────────────
function nivelColor(n: string) {
  if (n === 'CRITICO') return '#c42c2c'
  if (n === 'ALTO') return '#b25000'
  if (n === 'MEDIO') return '#1F4E8C'
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
// TabBar estilo pill (consistente con Panel Ejecutivo)
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{
      display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
      padding: 4, marginBottom: 18, overflowX: 'auto', maxWidth: '100%',
    }}>
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            border: 'none',
            background: active === i ? '#fff' : 'transparent',
            color: active === i ? '#1d1d1f' : '#6e6e73',
            padding: '7px 16px', borderRadius: 999,
            fontSize: 12.5, fontWeight: active === i ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: active === i ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 160ms',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// KPI card Apple-Newsroom · acent color en valor + sub
function KPICard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      padding: '16px 18px 14px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: accent }}/>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em',
                     color: '#6e6e73', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
                     letterSpacing: '-0.024em', lineHeight: 1, color: '#1d1d1f',
                     fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// HeroKPI · pequeño KPI translúcido para encajar sobre gradients del hero
function HeroKPI({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '10px 8px', borderRadius: 12,
      background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                     lineHeight: 1, color: '#fff', letterSpacing: '-0.018em',
                     fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                     opacity: 0.75, marginTop: 5, textTransform: 'uppercase', color: '#fff' }}>{label}</div>
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

  const { data: geoStatsRaw, source, updatedAt, refresh } = useApi<GeoStats & { data?: GeoStats }>('/api/geopolitica/stats', { refreshInterval: 60_000 })
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
    { label: 'Señales OSINT 24h',     value: geoStats.osint_24h,            accent: '#1F4E8C', sub: 'noticias internacionales con relevancia ES' },
    { label: 'Alertas activas',       value: geoStats.alertas_activas,      accent: '#DC2626', sub: `${geoStats.alertas_count?.CRITICO || 0} críticas · ${geoStats.alertas_count?.ALTO || 0} altas` },
    { label: 'Países monitorizados',  value: geoStats.paises_monitorizados, accent: '#0F766E', sub: 'cobertura geopolítica' },
    { label: 'Presencia España',      value: geoStats.presencia_activa,     accent: '#7C3AED', sub: 'iniciativas activas exterior' },
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
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    geo: {
      bgcolor: '#f0f4f8',
      landcolor: '#e2e8f0',
      oceancolor: '#cbd5e1',
      showocean: true,
      showland: true,
      projection: { type: 'natural earth' },
      showframe: false,
      coastlinecolor: '#94a3b8',
    },
    margin: { t: 0, b: 0, l: 0, r: 0 },
    height: 380,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background: 'linear-gradient(135deg,#0E7490 0%,#134E4A 100%)',
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
                        textTransform: 'uppercase', margin: '0 0 8px',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>CONTEXTO ESTRATÉGICO · GEOPOLÍTICA Y RRII</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
                          letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              España en el <em style={{ fontWeight: 300, fontStyle: 'italic',
                                          color: 'rgba(255,255,255,0.75)' }}>tablero global.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
              Riesgo geopolítico, OSINT, alertas internacionales, impactos sobre la agenda doméstica
              y presencia española en el exterior. Datos derivados de medios internacionales y feeds
              oficiales en tiempo real.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <HeroKPI label="OSINT 24h"   value={String(geoStats.osint_24h)}/>
            <HeroKPI label="Alertas"     value={String(geoStats.alertas_activas)}/>
            <HeroKPI label="Países"      value={String(geoStats.paises_monitorizados)}/>
          </div>
        </section>

        {/* ───── KPI strip ───── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {kpiCards.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} accent={k.accent} sub={k.sub}/>
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
                </select>
              </div>
              <span style={{ fontSize: 12, color: '#6e6e73' }}>
                {loadingOsint ? 'Cargando…' : `${osintFiltered.length} señales`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {osintFiltered.map((o) => (
                <div key={o.id} style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '16px 20px' }}>
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
        {tab === 5 && <AnalisisIATab alertas={alertas} riesgo={riesgoSorted} osint={osint}/>}

      </main>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// TAB 5 · Análisis geopolítico con Ollama
// ──────────────────────────────────────────────────────────────────────────
function AnalisisIATab({ alertas, riesgo, osint }: { alertas: AlertaItem[]; riesgo: RiesgoItem[]; osint: OsintItem[] }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [llmSource, setLlmSource] = useState<string | null>(null)
  const [llmMs, setLlmMs] = useState<number | null>(null)

  async function runAnalysis() {
    setAnalyzing(true)
    setAnalysis(null)
    const top3Riesgo = riesgo.slice(0, 3).map(r => `${r.pais} (score ${r.score}, interés España ${r.interes_espana}, ${r.categoria})`).join(' · ')
    const top3Alertas = alertas.slice(0, 3).map(a => `[${a.nivel}] ${a.titulo}: ${a.descripcion}`).join(' || ')
    const top3Osint = osint.slice(0, 3).map(o => `${o.titulo} (${o.categoria}, urg ${o.urgencia})`).join(' · ')
    const prompt = `Eres analista de inteligencia geopolítica de Politeia Analítica. Analiza la situación internacional actual respecto a España y produce un informe estratégico breve.

CONTEXTO ACTUAL:

Top riesgos geopolíticos: ${top3Riesgo}

Alertas activas críticas: ${top3Alertas}

Señales OSINT recientes: ${top3Osint}

INSTRUCCIONES:
- Estructura el análisis en 3 secciones cortas:
  1. SITUACIÓN ESTRATÉGICA (3 frases) — diagnóstico ejecutivo
  2. RIESGOS PRINCIPALES (3 bullets) — qué hay que vigilar
  3. RECOMENDACIONES (3 bullets) — qué debe hacer España
- Lenguaje conciso, profesional, castellano de España
- Sin preámbulos. Empieza directamente con "## Situación estratégica"
- Sin inventar cifras concretas que no estén en el contexto`
    const t0 = Date.now()
    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json() as { reply: string; source: string }
      setAnalysis(data.reply || 'Sin respuesta')
      setLlmSource(data.source)
      setLlmMs(Date.now() - t0)
    } catch (e) {
      setAnalysis(`Error al generar análisis: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
      padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 4px' }}>
            ANÁLISIS GEOPOLÍTICO · IA
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.018em', margin: '0 0 6px', color: '#1d1d1f' }}>
            Briefing estratégico generado por IA
          </h2>
          <p style={{ fontSize: 12.5, color: '#515154', margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
            Síntesis ejecutiva sobre el contexto geopolítico actual usando los datos en vivo
            de los tabs anteriores (riesgos, alertas críticas, señales OSINT). Pulsa el botón
            para generar un informe nuevo con Ollama.
          </p>
        </div>
        <button onClick={runAnalysis} disabled={analyzing} style={{
          background: analyzing ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
          color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px',
          fontSize: 12.5, fontWeight: 700, cursor: analyzing ? 'wait' : 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(124,58,237,0.30)',
        }}>
          {analyzing ? '🤖 Generando…' : '🤖 Generar análisis'}
        </button>
      </div>

      {!analysis && !analyzing && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13,
                       background: '#fafafa', borderRadius: 14, border: '1px dashed #ECECEF' }}>
          Pulsa &quot;Generar análisis&quot; para producir un briefing geopolítico con IA basado en
          los datos cargados en los tabs anteriores.
        </div>
      )}

      {analyzing && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7C3AED', fontSize: 13,
                       background: 'rgba(124,58,237,0.04)', borderRadius: 14,
                       border: '1px solid rgba(124,58,237,0.15)' }}>
          🤖 Ollama está generando el análisis…  <span style={{ color:'#9CA3AF' }}>(suele tardar 15-40 s)</span>
        </div>
      )}

      {analysis && (
        <div style={{ padding: '20px 24px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.20)',
                       borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff',
                            background: llmSource === 'ollama' ? '#7C3AED' : llmSource === 'backend' ? '#10b981' : '#9CA3AF',
                            padding: '3px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
              {llmSource === 'ollama' ? '🤖 OLLAMA' : llmSource === 'backend' ? '🤖 BACKEND' : '⚠ FALLBACK'}
            </span>
            {llmMs && <span style={{ fontSize: 11, color: '#6e6e73' }}>{(llmMs/1000).toFixed(1)} s</span>}
          </div>
          <pre style={{
            margin: 0, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f',
            whiteSpace: 'pre-wrap', wordWrap: 'break-word',
          }}>{analysis}</pre>
        </div>
      )}
    </section>
  )
}
