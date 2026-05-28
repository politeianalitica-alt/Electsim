'use client'
/**
 * <GeoRiskDrawer /> · Sprint GEO-RP C2
 *
 * Ficha completa de país con cabecera (spider chart 5 ejes) + 6 sub-tabs:
 *   1. Señales EWS (5 bloques · funcional vía /pais/[iso3]/ews)
 *   2. Régimen Político (V-Dem + ERT detection)
 *   3. Economía & Deuda (placeholder C3 · pending WorldBank/JEDH)
 *   4. Seguridad & Conflicto (placeholder C3 · pending mapa subnacional)
 *   5. Exposición España (placeholder C3 · pending dataset IBEX)
 *   6. Briefing Ejecutivo (texto generado heurísticamente con datos del país)
 *
 * Consume:
 *   /api/geopolitica/irpc (datos básicos del país)
 *   /api/geopolitica/pais/[iso3]/ews (Sub-tab 1)
 */
import { useEffect, useState, type ReactNode } from 'react'
import { SubEconomia } from './SubEconomia'
import { SubSeguridad } from './SubSeguridad'
import { SubEspana } from './SubEspana'

type SubTab = 'senales' | 'regimen' | 'economia' | 'seguridad' | 'espana' | 'briefing'

interface Country {
  iso3: string; name_es: string; iso2: string
  irpc: number
  dimensions: { institucional: number; democracia: number; seguridad: number; economica: number; social: number }
  raw: { polyarchy: number | null; polyarchy_trend?: string; milex_pct_gdp: number | null; gdelt_articles_30d?: number; gdelt_tone_value?: number }
  risk_level: string
  alerta_ews: boolean
}

interface EwsResp {
  ok: boolean
  ews: {
    ports: { available: boolean; anomaly_score: number | null; ports_count: number; top_ports: any[]; deviation_avg: number | null; alert: boolean }
    media: { available: boolean; total_articles_30d: number; avg_tone: number | null; divergencia_local_internacional: { local: number; international: number; gap: number } | null; top_themes: Array<{ theme: string; count: number }>; coverage_by_source_country: Array<{ iso2: string; count: number }>; alert: boolean }
    markets: { available: boolean; pending: boolean; note: string }
    trade: { available: boolean; pending: boolean; note: string }
    displacement: { available: boolean; refugees_originated: number | null; refugees_received: number | null; net_flow: number; outflow_series: any[]; inflow_series: any[]; alert: boolean }
  }
  alerts_active: number
}

interface Props {
  iso3: string | null
  onClose: () => void
}

const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: 'senales', label: 'Señales EWS' },
  { id: 'regimen', label: 'Régimen Político' },
  { id: 'economia', label: 'Economía & Deuda' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'espana', label: 'Exposición España' },
  { id: 'briefing', label: 'Briefing' },
]

export function GeoRiskDrawer({ iso3, onClose }: Props) {
  const [country, setCountry] = useState<Country | null>(null)
  const [ews, setEws] = useState<EwsResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<SubTab>('senales')

  useEffect(() => {
    if (!iso3) return
    let alive = true
    setLoading(true)
    setSub('senales')
    Promise.all([
      fetch('/api/geopolitica/irpc').then((r) => r.json()),
      fetch(`/api/geopolitica/pais/${iso3}/ews`).then((r) => r.json()),
    ])
      .then(([irpc, ewsResp]) => {
        if (!alive) return
        const c = irpc.countries?.find((x: Country) => x.iso3 === iso3) || null
        setCountry(c)
        setEws(ewsResp.ok ? ewsResp : null)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (iso3) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [iso3, onClose])

  if (!iso3) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        zIndex: 1000, animation: 'fadeIn 0.15s',
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(720px, 96vw)', background: '#fff',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.2)',
        zIndex: 1001, overflowY: 'auto',
        animation: 'slideIn 0.2s ease-out',
      }}>
        <header style={{
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {country?.name_es || iso3} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>· {iso3}</span>
              </h2>
              {country && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', fontSize: 11 }}>
                  <span>IRPC: <strong style={{ color: irpcColor(country.irpc), fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>{country.irpc}</strong></span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4,
                    background: `${irpcColor(country.irpc)}20`,
                    color: irpcColor(country.irpc),
                    fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>{country.risk_level}</span>
                  {country.alerta_ews && (
                    <span style={{ padding: '2px 8px', background: '#7f1d1d', color: '#fff', borderRadius: 4, fontWeight: 700, fontSize: 9 }}>
                      EWS · {ews?.alerts_active || 0} alertas activas
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 22, color: '#64748b',
              cursor: 'pointer', padding: 0, lineHeight: 1,
            }}>×</button>
          </div>

          {/* Spider chart 5 ejes */}
          {country && <SpiderChart d={country.dimensions} />}

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
            {SUB_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSub(t.id)}
                style={{
                  padding: '8px 12px', border: 'none',
                  background: 'transparent',
                  borderBottom: sub === t.id ? '2px solid #0891b2' : '2px solid transparent',
                  color: sub === t.id ? '#0f172a' : '#64748b',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >{t.label}</button>
            ))}
          </div>
        </header>

        <div style={{ padding: '16px 20px' }}>
          {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando ficha país…</p>}

          {!loading && country && sub === 'senales' && <SubSenales ews={ews?.ews ?? null} />}
          {!loading && country && sub === 'regimen' && <SubRegimen c={country} />}
          {!loading && country && sub === 'economia' && <SubEconomia iso3={country.iso3} />}
          {!loading && country && sub === 'seguridad' && <SubSeguridad iso3={country.iso3} />}
          {!loading && country && sub === 'espana' && <SubEspana iso3={country.iso3} />}
          {!loading && country && sub === 'briefing' && <SubBriefing c={country} ews={ews?.ews ?? null} />}
        </div>
      </aside>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  )
}

function SpiderChart({ d }: { d: Country['dimensions'] }) {
  const axes = [
    { label: 'Inst', value: d.institucional, key: 'institucional' },
    { label: 'Dem', value: d.democracia, key: 'democracia' },
    { label: 'Seg', value: d.seguridad, key: 'seguridad' },
    { label: 'Eco', value: d.economica, key: 'economica' },
    { label: 'Soc', value: d.social, key: 'social' },
  ]
  const size = 180, cx = size / 2, cy = size / 2, r = 60
  const points = axes.map((a, i) => {
    const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2
    const rr = (a.value / 100) * r
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr, label: a.label, axis_angle: angle, value: a.value }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circular */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle key={t} cx={cx} cy={cy} r={r * t} fill="none" stroke="#f1f5f9" strokeWidth={0.5} />
        ))}
        {/* Axes */}
        {axes.map((a, i) => {
          const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2
          return (
            <g key={a.key}>
              <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="#e2e8f0" strokeWidth={0.5} />
              <text
                x={cx + Math.cos(angle) * (r + 12)}
                y={cy + Math.sin(angle) * (r + 12) + 3}
                fontSize={9}
                textAnchor="middle"
                fill="#475569"
                fontWeight={600}
              >{a.label}</text>
            </g>
          )
        })}
        {/* Polygon actual */}
        <path d={path} fill="#dc2626" fillOpacity={0.25} stroke="#dc2626" strokeWidth={1.5} />
        {/* Dots con valores */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#dc2626" stroke="#fff" strokeWidth={1} />
            <text x={p.x} y={p.y - 6} fontSize={8} textAnchor="middle" fill="#0f172a" fontWeight={700} fontFamily="ui-monospace, monospace">{p.value}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function SubSenales({ ews }: { ews: EwsResp['ews'] | null }) {
  if (!ews) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin datos EWS para este país.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SignalBlock
        title="🚢 Actividad Portuaria · PortWatch IMF"
        alert={ews.ports.alert}
        available={ews.ports.available}
      >
        {ews.ports.available ? (
          <>
            <p style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
              <strong style={{ fontFamily: 'ui-monospace, monospace', color: ews.ports.deviation_avg && ews.ports.deviation_avg < 0 ? '#dc2626' : '#16a34a' }}>
                {ews.ports.deviation_avg && ews.ports.deviation_avg > 0 ? '+' : ''}{ews.ports.deviation_avg?.toFixed(1)}%
              </strong>
              {' '}desviación media en {ews.ports.ports_count} puertos vs media 12m
            </p>
            {ews.ports.top_ports.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ews.ports.top_ports.slice(0, 5).map((p: any) => (
                  <div key={p.port_id || p.port_name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span>{p.port_name} <span style={{ color: '#94a3b8' }}>· {p.port_type}</span></span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: p.deviation_pct < 0 ? '#dc2626' : '#16a34a' }}>
                      {p.deviation_pct > 0 ? '+' : ''}{p.deviation_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin datos PortWatch para este país.</p>
        )}
      </SignalBlock>

      <SignalBlock
        title="📰 Pulso Mediático · GDELT 30d"
        alert={ews.media.alert}
        available={ews.media.available}
      >
        {ews.media.available ? (
          <>
            <p style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
              {ews.media.total_articles_30d} artículos · tono medio <strong style={{ fontFamily: 'ui-monospace, monospace', color: (ews.media.avg_tone ?? 0) < -3 ? '#dc2626' : (ews.media.avg_tone ?? 0) > 3 ? '#16a34a' : '#94a3b8' }}>{ews.media.avg_tone?.toFixed(2)}</strong>
            </p>
            {ews.media.divergencia_local_internacional && (
              <p style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>
                Local: <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{ews.media.divergencia_local_internacional.local.toFixed(1)}</strong>
                {' '}· Internacional: <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{ews.media.divergencia_local_internacional.international.toFixed(1)}</strong>
                {' '}· Gap: <strong style={{ fontFamily: 'ui-monospace, monospace', color: Math.abs(ews.media.divergencia_local_internacional.gap) > 3 ? '#7c3aed' : '#94a3b8' }}>{ews.media.divergencia_local_internacional.gap > 0 ? '+' : ''}{ews.media.divergencia_local_internacional.gap.toFixed(1)}</strong>
              </p>
            )}
            {ews.media.top_themes.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {ews.media.top_themes.slice(0, 6).map((t) => (
                  <span key={t.theme} style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 10, fontSize: 9, color: '#475569' }}>
                    {t.theme} <strong style={{ color: '#0f172a' }}>{t.count}</strong>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin cobertura GDELT en últimos 30 días.</p>
        )}
      </SignalBlock>

      <SignalBlock title="💱 Mercados Financieros · Finnhub" alert={false} available={false}>
        <p style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '8px 10px', borderRadius: 6, margin: 0 }}>
          <strong>Próximamente</strong> · CDS soberano + curva tipos requiere Finnhub premium.
          Por ahora cotizaciones empresas vía Sub-tab Exposición España.
        </p>
      </SignalBlock>

      <SignalBlock title="📦 Flujos Comerciales · UN Comtrade" alert={false} available={false}>
        <p style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '8px 10px', borderRadius: 6, margin: 0 }}>
          <strong>Próximamente</strong> · Top exports + concentración HHI + bienes doble uso (HS 93) en C3.
        </p>
      </SignalBlock>

      <SignalBlock
        title="🌍 Desplazamiento & Humanitario · UNHCR"
        alert={ews.displacement.alert}
        available={ews.displacement.available}
      >
        {ews.displacement.available ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
              <DataChip label="Origina" value={fmtNum(ews.displacement.refugees_originated)} />
              <DataChip label="Recibe" value={fmtNum(ews.displacement.refugees_received)} />
              <DataChip label="Neto" value={(ews.displacement.net_flow > 0 ? '+' : '') + fmtNum(ews.displacement.net_flow)} />
            </div>
            {ews.displacement.alert && (
              <p style={{ fontSize: 10, color: '#7f1d1d', fontWeight: 600, margin: 0 }}>
                ⚠ &gt;500K desplazados originados · crisis humanitaria significativa
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin datos UNHCR para este país.</p>
        )}
      </SignalBlock>
    </div>
  )
}

function SubRegimen({ c }: { c: Country }) {
  const polyarchy = c.raw.polyarchy
  const trend = c.raw.polyarchy_trend
  const isEpisode = trend === 'regresion' || trend === 'regresion_severa'
  return (
    <div>
      {isEpisode && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', padding: '10px 12px', borderRadius: 6, marginBottom: 12 }}>
          <strong style={{ color: '#7f1d1d', fontSize: 12 }}>⚠ Episodio de autocratización activo</strong>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#991b1b' }}>
            V-Dem registra {trend === 'regresion_severa' ? 'regresión democrática SEVERA' : 'regresión democrática'} en los últimos 5 años · revisar derechos civiles + libertad de prensa.
          </p>
        </div>
      )}
      <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        V-Dem Liberal Democracy Index
      </h4>
      {polyarchy !== null ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{polyarchy.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>/ 1.00 · 2023 oficial</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${polyarchy * 100}%`, height: '100%', background: polyarchy > 0.7 ? '#16a34a' : polyarchy > 0.4 ? '#f59e0b' : '#dc2626' }} />
          </div>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>
            Categoría: {polyarchy > 0.8 ? 'Democracia liberal consolidada' : polyarchy > 0.6 ? 'Democracia liberal débil' : polyarchy > 0.4 ? 'Democracia electoral' : polyarchy > 0.2 ? 'Autocracia electoral' : 'Autocracia cerrada'}
          </p>
        </>
      ) : (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>País no en cobertura V-Dem (80 países top).</p>
      )}

      <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 6, padding: '10px 12px', fontSize: 10, color: '#475569', marginTop: 12 }}>
        <strong style={{ color: '#0f172a' }}>Próximamente C3</strong> · 6 componentes V-Dem detallados (libertad expresión, judicial, sociedad civil, checks&balances, elecciones, asociación), perfil élite/gobierno, próximas elecciones.
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://v-dem.net/data_analysis/CountryGraph/`} target="_blank" rel="noopener noreferrer" style={ExtLinkStyle}>
          V-Dem Country Graph →
        </a>
        <a href={`https://www.v-dem.net/data/data-version-14/`} target="_blank" rel="noopener noreferrer" style={ExtLinkStyle}>
          V-Dem Dataset v15 →
        </a>
      </div>
    </div>
  )
}

function SubBriefing({ c, ews: _ews }: { c: Country; ews: EwsResp['ews'] | null }) {
  // Sprint G17 item 7 · Briefing IA-generado con cascade Gemini → Groq
  // Reemplaza el stub heurístico anterior. El usuario pidió "el briefing
  // funcione con gemini y de información de por qué esa cifra de riesgo".
  const [briefing, setBriefing] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ provider?: string; model?: string; warning?: string }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setBriefing(null)
    setError(null)
    fetch(`/api/geopolitica/risk-briefing/${c.iso3}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (j.ok && typeof j.briefing === 'string') {
          setBriefing(j.briefing)
          setMeta({ provider: j.provider, model: j.model, warning: j.warning })
        } else {
          setError('Briefing no disponible · fallback no devolvió texto.')
        }
      })
      .catch(() => alive && setError('Network error al solicitar briefing IA.'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [c.iso3])

  if (loading) {
    return (
      <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
          Generando briefing IA para {c.name_es}… <span style={{ fontStyle: 'italic' }}>cadena Gemini → Groq → heurístico</span>
        </p>
      </div>
    )
  }

  if (error || !briefing) {
    return (
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#9a3412' }}>
          {error ?? 'Briefing no disponible.'}
        </p>
      </div>
    )
  }

  // Render markdown ligero: **negrita** + saltos de línea
  const blocks = briefing.split(/\n{2,}/).map((b, i) => {
    const segments = b.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={j} style={{ color: '#0f172a' }}>{seg.slice(2, -2)}</strong>
      }
      return <span key={j}>{seg}</span>
    })
    return (
      <p key={i} style={{ margin: '0 0 10px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 }}>
        {segments}
      </p>
    )
  })

  return (
    <div>
      <div style={{
        background: '#fff', border: '1px solid #e0f2fe',
        borderLeft: '3px solid #0891b2', borderRadius: 8,
        padding: '14px 16px',
      }}>
        {blocks}
      </div>
      <p style={{ marginTop: 8, fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Generado por IA · {meta.provider === 'heuristic-fallback'
          ? `fallback heurístico${meta.warning ? ` (${meta.warning.slice(0, 80)})` : ''}`
          : `${meta.provider ?? 'cascade'} · modelo ${meta.model ?? '?'}`} ·
        Datos de país-profile (11 capas: Wikidata + V-Dem + SIPRI + GDELT + UCDP + World Bank + OpenSanctions + ReliefWeb + Travel + concerns sintéticos).
      </p>
    </div>
  )
}

function SubPlaceholder({ title, sprint, sources }: { title: string; sprint: string; sources: string[] }) {
  return (
    <div>
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', padding: '12px 14px', borderRadius: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>{title}</h4>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78350f' }}>
          Sub-tab pendiente de implementar en <strong>commit {sprint}</strong>. Fuentes a integrar:
        </p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 11, color: '#78350f' }}>
          {sources.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  )
}

function SignalBlock({
  title, alert, available, children,
}: { title: string; alert: boolean; available: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true)
  const accent = alert ? '#dc2626' : available ? '#0891b2' : '#cbd5e1'
  return (
    <div style={{ border: '1px solid #f1f5f9', borderLeft: `3px solid ${accent}`, borderRadius: 6, background: '#fff' }}>
      <button onClick={() => setExpanded((x) => !x)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
          {title}
          {alert && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#7f1d1d', color: '#fff', borderRadius: 3, fontSize: 9 }}>ALERTA</span>}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>{children}</div>
      )}
    </div>
  )
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

const ExtLinkStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#fff', borderRadius: 6,
  border: '1px solid #e2e8f0', fontSize: 10, color: '#0891b2',
  textDecoration: 'none', fontWeight: 600,
}

function irpcColor(irpc: number): string {
  if (irpc >= 75) return '#7f1d1d'
  if (irpc >= 55) return '#dc2626'
  if (irpc >= 30) return '#f59e0b'
  return '#16a34a'
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export default GeoRiskDrawer
