'use client'
/**
 * <EsiosMixStacked /> · Sprint ESIOS-DEEP S2
 *
 * Visualiza el mix de generación eléctrica en directo con tres vistas combinadas:
 *
 *   1. KPIs superiores: % renovable · % libre CO2 · gCO2/kWh · total MW ahora
 *   2. Donut "ahora mismo" SVG con 10 tecnologías y leyenda
 *   3. Stacked area 24h con 10 tecnologías apiladas + tooltip por hora
 *
 * Consume /api/esios/mix (cache 60s · frecuencia 10-min ESIOS).
 * Sin libs de charting · todo SVG inline.
 */
import { useEffect, useState } from 'react'

interface TechSnapshot {
  slug: string; ok: boolean; label: string; short: string; unit: string
  color: string
  now_mw: number | null
  now_datetime: string | null
  pct_of_total: number | null
  avg_24h_mw: number | null
  serie_24h: Array<{ t: string; v: number }>
  error?: string
}
interface AgregadoValor {
  slug: string; ok: boolean; label: string; unit: string
  latest_value: number | null
  latest_datetime: string | null
  avg_24h: number | null
  error?: string
}
interface Response {
  ok: boolean
  error?: string
  tech: Record<string, TechSnapshot>
  agregados: Record<string, AgregadoValor>
  total_now_mw: number
  fetched_at: string
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number }
}

const TECH_ORDER = [
  'gen_nuclear',
  'gen_hidraulica',
  'gen_eolica',
  'gen_solar_fv',
  'gen_solar_termica',
  'gen_biomasa',
  'gen_cogeneracion',
  'gen_ciclo_combinado',
  'gen_carbon',
  'gen_residuos',
]

export function EsiosMixStacked() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverHour, setHoverHour] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/mix', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
          letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
        }}>
          Mix de generación · 10 tecnologías en tiempo real
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Snapshot 10-min + serie apilada 24h · % renovable, libre CO2, emisiones gCO2/kWh.
          Fuente ESIOS · cache 60 s.
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando mix ESIOS…</p>}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && data?.ok && (
        <>
          <MixKpis agg={data.agregados} totalMw={data.total_now_mw} />
          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 14,
            marginTop: 14,
          }}>
            <MixDonut tech={data.tech} totalMw={data.total_now_mw} />
            <MixStackedArea tech={data.tech} hoverHour={hoverHour} onHoverHour={setHoverHour} />
          </div>
          {data._meta && (
            <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a> · refresco {data._meta.cache_ttl_seconds}s
            </p>
          )}
        </>
      )}
    </section>
  )
}

function MixKpis({ agg, totalMw }: { agg: Record<string, AgregadoValor>; totalMw: number }) {
  const renovPct = agg.porcentaje_renovable?.latest_value
  const libreCo2Pct = agg.porcentaje_libre_co2?.latest_value
  const emisiones = agg.emisiones_co2?.latest_value
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 10,
    }}>
      {renovPct !== null && renovPct !== undefined && (
        <Kpi label="% renovable" value={`${renovPct.toFixed(1)}%`} accent="#16a34a" sub="objetivo PNIEC 2030: 81%" />
      )}
      {libreCo2Pct !== null && libreCo2Pct !== undefined && (
        <Kpi label="% libre CO2" value={`${libreCo2Pct.toFixed(1)}%`} accent="#0891b2" sub="renov + nuclear" />
      )}
      {emisiones !== null && emisiones !== undefined && (
        <Kpi label="Emisiones" value={`${Math.round(emisiones)} g/kWh`} accent="#dc2626" sub="factor CO2 sistema" />
      )}
      <Kpi label="Total ahora" value={`${(totalMw / 1000).toFixed(1)} GW`} accent="#7c3aed" sub={`${totalMw.toLocaleString('es-ES')} MW`} />
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function MixDonut({ tech, totalMw }: { tech: Record<string, TechSnapshot>; totalMw: number }) {
  if (totalMw <= 0) return null
  const r = 70, cx = 90, cy = 90, strokeW = 22
  const circumference = 2 * Math.PI * r
  let offset = 0
  const arcs = TECH_ORDER.map((slug) => {
    const t = tech[slug]
    if (!t || t.now_mw === null || t.now_mw <= 0) return null
    const frac = t.now_mw / totalMw
    const len = frac * circumference
    const dash = `${len} ${circumference - len}`
    const arc = (
      <circle
        key={slug}
        cx={cx} cy={cy} r={r}
        fill="none" stroke={t.color} strokeWidth={strokeW}
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      >
        <title>{t.label} · {t.now_mw} MW · {t.pct_of_total?.toFixed(1)}%</title>
      </circle>
    )
    offset += len
    return arc
  })
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>Mix ahora mismo</p>
      <svg width={180} height={180} viewBox="0 0 180 180" style={{ display: 'block' }}>
        {arcs}
        <text x={cx} y={cy - 4} fontSize={11} fill="#94a3b8" textAnchor="middle">total</text>
        <text x={cx} y={cy + 14} fontSize={16} fontWeight={700} fill="#0f172a" textAnchor="middle" fontFamily="ui-monospace, monospace">
          {(totalMw / 1000).toFixed(1)} GW
        </text>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 6, fontSize: 9 }}>
        {TECH_ORDER.map((slug) => {
          const t = tech[slug]
          if (!t || t.now_mw === null || t.now_mw <= 0) return null
          return (
            <span key={slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#475569' }}>
              <span style={{ width: 8, height: 8, background: t.color, borderRadius: 1 }} />
              <span style={{ fontWeight: 600 }}>{t.short}</span>
              <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{t.pct_of_total?.toFixed(0)}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MixStackedArea({
  tech, hoverHour, onHoverHour,
}: { tech: Record<string, TechSnapshot>; hoverHour: number | null; onHoverHour: (h: number | null) => void }) {
  // Buscamos la longitud máxima de serie (deberían ser 24 todas)
  const len = Math.max(...TECH_ORDER.map((s) => tech[s]?.serie_24h.length || 0))
  if (len === 0) return null

  // Construimos timestamps tomando la serie nuclear (más estable)
  const tsRef = tech.gen_nuclear?.serie_24h || tech.gen_eolica?.serie_24h || []

  // Calculamos serie de totales por hora (para escala Y)
  const totals = Array.from({ length: len }, (_, i) =>
    TECH_ORDER.reduce((s, slug) => s + (tech[slug]?.serie_24h[i]?.v || 0), 0)
  )
  const maxTotal = Math.max(...totals, 1)

  const w = 560, h = 240, padL = 36, padR = 8, padT = 16, padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const xOf = (i: number) => padL + (i / Math.max(1, len - 1)) * innerW
  const yOf = (v: number) => padT + innerH - (v / maxTotal) * innerH

  // Construir paths stackeados
  let cum = Array(len).fill(0) as number[]
  const layers: Array<{ slug: string; path: string; color: string }> = []
  for (const slug of TECH_ORDER) {
    const t = tech[slug]
    if (!t) continue
    const top = Array.from({ length: len }, (_, i) => cum[i] + (t.serie_24h[i]?.v || 0))
    // path: arriba izq → arriba der → abajo der → abajo izq (cerrado)
    const upper = top.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
    const lower = cum.slice().reverse().map((v, ri) => {
      const i = len - 1 - ri
      return `L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`
    }).join(' ')
    layers.push({ slug, path: `${upper} ${lower} Z`, color: t.color })
    cum = top
  }

  // Hour ticks
  const ticks = [0, 6, 12, 18, len - 1].filter((i) => i < len)

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Serie 24h apilada · MW por tecnología
      </p>
      <svg
        width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        style={{ display: 'block' }}
        onMouseLeave={() => onHoverHour(null)}
      >
        {/* eje Y · 3 ticks */}
        {[0, 0.5, 1].map((t) => {
          const v = maxTotal * (1 - t)
          const y = padT + innerH * t
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">
                {Math.round(v / 1000)} GW
              </text>
            </g>
          )
        })}
        {/* layers */}
        {layers.map((l) => (
          <path key={l.slug} d={l.path} fill={l.color} opacity={0.85} stroke={l.color} strokeWidth={0.5} />
        ))}
        {/* hover line */}
        {hoverHour !== null && tsRef[hoverHour] && (
          <line x1={xOf(hoverHour)} y1={padT} x2={xOf(hoverHour)} y2={padT + innerH} stroke="#0f172a" strokeWidth={1} strokeDasharray="2 2" />
        )}
        {/* hover hotspots */}
        {Array.from({ length: len }).map((_, i) => (
          <rect
            key={i}
            x={xOf(i) - (innerW / len) / 2} y={padT}
            width={innerW / len} height={innerH}
            fill="transparent"
            onMouseEnter={() => onHoverHour(i)}
            style={{ cursor: 'crosshair' }}
          />
        ))}
        {/* X ticks */}
        {ticks.map((i) => (
          <text key={i} x={xOf(i)} y={h - 6} fontSize={8} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {tsRef[i]?.t.slice(11, 16) || ''}
          </text>
        ))}
      </svg>
      {/* tooltip detalle */}
      {hoverHour !== null && tsRef[hoverHour] && (
        <div style={{
          marginTop: 6, padding: '6px 10px', background: '#0f172a', color: '#fff',
          borderRadius: 6, fontSize: 10, fontFamily: 'ui-monospace, monospace',
          display: 'flex', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontWeight: 700 }}>{tsRef[hoverHour].t.slice(11, 16)}h · {Math.round(totals[hoverHour] / 1000 * 10) / 10} GW total</span>
          {TECH_ORDER.map((slug) => {
            const v = tech[slug]?.serie_24h[hoverHour]?.v
            if (!v || v < 100) return null
            const pct = (v / totals[hoverHour]) * 100
            return (
              <span key={slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, background: tech[slug].color, borderRadius: 1 }} />
                <span>{tech[slug].short} {Math.round(v)} MW ({pct.toFixed(0)}%)</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EsiosMixStacked
