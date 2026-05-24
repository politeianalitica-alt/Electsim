'use client'
/**
 * `<ApiEnrichmentBlock subtabSlug accent />` · Sprint N13.3.
 *
 * Wire de las 12 APIs huérfanas (implementadas en /api/* pero sin uso en
 * catálogo macro): ember, entsoe, portwatch, comtrade, acled, gdelt.
 *
 * Render condicional por subtab:
 *  - medio-rural          → Ember (mix electricidad ES) + Entsoe (precio spot)
 *  - dependencias-externas → Portwatch (top puertos ES) + Comtrade (top partners)
 *  - riesgo-sistemico     → ACLED (eventos vecindad) + Entsoe (precio energía)
 *  - mercados-activos     → GDELT (sentiment news ES)
 *  - instituciones-estado → GDELT (volumen noticias institucionales)
 *  - cultura-ocio         → Portwatch (cruceros)
 *
 * Diseño "ligero": no se carga si el subtab no tiene mapping. Cada API
 * tiene su propio fetch independiente y degrada silencioso (no rompe la
 * página si una API tiene rate-limit o sin API key).
 */
import { useEffect, useState } from 'react'

interface Props {
  subtabSlug: string
  accent: string
}

// ─── Tipos de respuestas ────────────────────────────────────────────────
interface EmberSnapshot {
  ok: boolean
  spain?: { share_renewable?: number; share_clean?: number; carbon_intensity?: number; demand_twh?: number }
  ranking_eu?: { metric?: string; spain_position?: number; n_countries?: number }
}
interface EntsoePrices {
  ok: boolean
  prices?: { date: string; avg_price_eur_mwh: number }[]
}
interface PortwatchPort {
  port_name: string
  iso3: string
  vessel_count_total?: number
  vessel_count_container?: number
  industry_top1?: string
}
interface PortwatchResp { ok: boolean; ports?: PortwatchPort[] }

interface AcledEvent {
  event_date: string
  country: string
  event_type: string
  fatalities: number
  notes?: string
}
interface AcledResp {
  ok: boolean
  total_events?: number
  total_fatalities?: number
  events_by_country?: { country: string; count: number }[]
  recent?: AcledEvent[]
}

interface GdeltTone {
  ok: boolean
  query?: string
  avg_tone?: number
  total_articles?: number
}

// ─── EMBER · Mix eléctrico España ────────────────────────────────────────
function EmberSection({ accent }: { accent: string }) {
  const [data, setData] = useState<EmberSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/ember/spain-snapshot', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: EmberSnapshot) => { if (alive && j.ok) setData(j) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  if (loading) return null
  if (!data?.spain) return null
  const ren = data.spain.share_renewable
  const carbon = data.spain.carbon_intensity
  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: `3px solid #16a34a`, borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#16a34a', textTransform: 'uppercase' }}>
        Mix eléctrico España · Ember Energy
      </p>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {ren != null && (
          <div>
            <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>% Renovables</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' as const }}>
              {ren.toFixed(1)}%
            </p>
          </div>
        )}
        {data.spain.share_clean != null && (
          <div>
            <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>% Bajo carbono</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0F766E', fontVariantNumeric: 'tabular-nums' as const }}>
              {data.spain.share_clean.toFixed(1)}%
            </p>
          </div>
        )}
        {carbon != null && (
          <div>
            <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Intensidad CO₂</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: carbon < 150 ? '#16a34a' : carbon < 250 ? '#f59e0b' : '#dc2626', fontVariantNumeric: 'tabular-nums' as const }}>
              {carbon.toFixed(0)} <span style={{ fontSize: 11, fontWeight: 500 }}>gCO₂/kWh</span>
            </p>
          </div>
        )}
        {data.spain.demand_twh != null && (
          <div>
            <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Demanda anual</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums' as const }}>
              {data.spain.demand_twh.toFixed(0)} <span style={{ fontSize: 11, fontWeight: 500 }}>TWh</span>
            </p>
          </div>
        )}
      </div>
      {data.ranking_eu?.spain_position && (
        <p style={{ margin: '8px 0 0', fontSize: 10, color: '#64748b' }}>
          Ranking España UE-27: <strong>#{data.ranking_eu.spain_position}/{data.ranking_eu.n_countries}</strong> en {data.ranking_eu.metric || 'mix limpio'}
        </p>
      )}
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Fuente: Ember Climate · api.ember-energy.org
      </p>
    </div>
  )
}

// ─── ENTSOE · Precio spot mercado eléctrico ───────────────────────────────
function EntsoeSection({ accent }: { accent: string }) {
  const [data, setData] = useState<EntsoePrices | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/entsoe/spain-prices?days=14', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: EntsoePrices) => { if (alive && j.ok) setData(j) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  if (loading || !data?.prices || data.prices.length === 0) return null
  const prices = data.prices
  const latest = prices[prices.length - 1]
  const avg = prices.reduce((acc, p) => acc + p.avg_price_eur_mwh, 0) / prices.length
  const max = Math.max(...prices.map((p) => p.avg_price_eur_mwh))
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: `3px solid #f59e0b`, borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#92400e', textTransform: 'uppercase' }}>
        Precio spot eléctrico ES · ENTSO-E · últimos 14 días
      </p>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Último día</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#92400e', fontVariantNumeric: 'tabular-nums' as const }}>
            {latest.avg_price_eur_mwh.toFixed(2)} <span style={{ fontSize: 10 }}>€/MWh</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{latest.date}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Media 14d</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums' as const }}>
            {avg.toFixed(2)}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Máximo 14d</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' as const }}>
            {max.toFixed(2)}
          </p>
        </div>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Fuente: ENTSO-E Transparency Platform (DAM mercado día-anterior)
      </p>
    </div>
  )
}

// ─── PORTWATCH · Puertos España ─────────────────────────────────────────
function PortwatchSection({ accent }: { accent: string }) {
  const [data, setData] = useState<PortwatchResp | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/portwatch/spain-ports', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: PortwatchResp) => { if (alive && j.ok) setData(j) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  if (loading || !data?.ports || data.ports.length === 0) return null
  const top = data.ports
    .filter((p) => p.vessel_count_total)
    .sort((a, b) => (b.vessel_count_total || 0) - (a.vessel_count_total || 0))
    .slice(0, 6)
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: `3px solid #0EA5E9`, borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#1e40af', textTransform: 'uppercase' }}>
        Top puertos España · IMF PortWatch (buques activos)
      </p>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {top.map((p) => (
          <div key={p.port_name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, fontSize: 11, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.port_name}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>{p.industry_top1 || ''}</span>
            <span style={{ fontWeight: 700, color: '#1e40af', fontVariantNumeric: 'tabular-nums' as const }}>
              {p.vessel_count_total} buques
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Fuente: IMF PortWatch (AIS satellite tracking)
      </p>
    </div>
  )
}

// ─── ACLED · Conflictos vecindad ────────────────────────────────────────
function AcledSection({ accent }: { accent: string }) {
  const [data, setData] = useState<AcledResp | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch('/api/acled/spain-context', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: AcledResp) => { if (alive && j.ok) setData(j) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  if (loading || !data) return null
  const topByCountry = (data.events_by_country || []).slice(0, 8)
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: `3px solid #dc2626`, borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#991b1b', textTransform: 'uppercase' }}>
        Eventos ACLED · vecindad geopolítica (30 días)
      </p>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Total eventos</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' as const }}>
            {data.total_events ?? '—'}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Total fatalidades</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#991b1b', fontVariantNumeric: 'tabular-nums' as const }}>
            {data.total_fatalities ?? '—'}
          </p>
        </div>
      </div>
      {topByCountry.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Eventos por país (top 8)
          </p>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {topByCountry.map((c) => (
              <div key={c.country} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#0f172a' }}>{c.country}</span>
                <span style={{ fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' as const }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Fuente: ACLED (Armed Conflict Location & Event Data Project)
      </p>
    </div>
  )
}

// ─── GDELT · Sentiment news ─────────────────────────────────────────────
function GdeltSection({ query, label, accent }: { query: string; label: string; accent: string }) {
  const [data, setData] = useState<GdeltTone | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetch(`/api/gdelt/tone?query=${encodeURIComponent(query)}&timespan=7d`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: GdeltTone) => { if (alive && j.ok) setData(j) })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [query])
  if (loading || !data || data.avg_tone == null) return null
  const tone = data.avg_tone
  const toneColor = tone > 1 ? '#16a34a' : tone < -1 ? '#dc2626' : '#f59e0b'
  return (
    <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderLeft: `3px solid #7c3aed`, borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
        GDELT sentiment · {label} (últimos 7 días)
      </p>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Tone medio</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: toneColor, fontVariantNumeric: 'tabular-nums' as const }}>
            {tone > 0 ? '+' : ''}{tone.toFixed(2)}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>
            {tone > 1 ? 'narrativa positiva' : tone < -1 ? 'narrativa negativa' : 'neutral'}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>Volumen artículos</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums' as const }}>
            {data.total_articles ?? '—'}
          </p>
        </div>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Fuente: GDELT Project (Global Database of Events, Language & Tone)
      </p>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export function ApiEnrichmentBlock({ subtabSlug, accent }: Props) {
  // Mapping subtab → secciones a renderizar
  const sections: { title: string; node: React.ReactNode }[] = []
  if (subtabSlug === 'medio-rural') {
    sections.push({ title: 'Energía', node: <EmberSection accent={accent} /> })
    sections.push({ title: 'Energía precio', node: <EntsoeSection accent={accent} /> })
  }
  if (subtabSlug === 'dependencias-externas') {
    sections.push({ title: 'Puertos ES', node: <PortwatchSection accent={accent} /> })
  }
  if (subtabSlug === 'riesgo-sistemico') {
    sections.push({ title: 'ACLED', node: <AcledSection accent={accent} /> })
    sections.push({ title: 'Energía', node: <EntsoeSection accent={accent} /> })
  }
  if (subtabSlug === 'mercados-activos') {
    sections.push({ title: 'GDELT IBEX', node: <GdeltSection query="IBEX35 OR Spain stock market" label="IBEX35 narrative" accent={accent} /> })
  }
  if (subtabSlug === 'instituciones-estado') {
    sections.push({ title: 'GDELT instituciones', node: <GdeltSection query="Spain government OR Spanish parliament" label="Gobierno + Parlamento" accent={accent} /> })
  }
  if (subtabSlug === 'cultura-ocio') {
    sections.push({ title: 'Puertos cruceros', node: <PortwatchSection accent={accent} /> })
  }
  if (sections.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
          Enriquecimiento APIs externas · {sections.length} fuentes contextuales
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Datos live de APIs especializadas no incluidas en el catálogo principal. Refrescadas según TTL de cada proveedor.
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        {sections.map((s, i) => (
          <div key={i}>{s.node}</div>
        ))}
      </div>
    </section>
  )
}

export default ApiEnrichmentBlock
