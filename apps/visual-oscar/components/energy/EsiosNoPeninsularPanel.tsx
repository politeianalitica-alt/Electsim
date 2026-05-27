'use client'
/**
 * <EsiosNoPeninsularPanel /> · Sprint ESIOS-DEEP S5
 *
 * Panel comparativo de los 4 sistemas eléctricos no peninsulares:
 *   - Canarias (8 islas mayores · sistema más grande NP)
 *   - Baleares (4 islas · enlace HVDC a Península)
 *   - Ceuta (sistema aislado pequeño)
 *   - Melilla (sistema aislado pequeño)
 *
 * Tab selector para cada sistema con su KPI demanda + PVPC + chart 24h.
 * Consume /api/esios/no-peninsular. Sin libs · SVG inline.
 */
import { useEffect, useState } from 'react'

interface SistemaNP {
  sistema: 'canarias' | 'baleares' | 'ceuta' | 'melilla'
  name: string
  geo_id: number
  ok: boolean
  demanda: {
    latest_mw: number | null
    latest_datetime: string | null
    avg_24h_mw: number | null
    peak_24h_mw: number | null
    peak_24h_hour: string | null
    total_24h_gwh: number | null
    serie_24h: Array<{ t: string; v: number }>
  } | null
  pvpc: {
    latest: number | null
    latest_datetime: string | null
    avg_24h: number | null
    serie_24h: Array<{ t: string; v: number }>
  } | null
  errors?: string[]
}
interface Response {
  ok: boolean; error?: string
  sistemas: SistemaNP[]
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; note: string }
}

export function EsiosNoPeninsularPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<string>('canarias')

  useEffect(() => {
    let alive = true
    fetch('/api/esios/no-peninsular', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const activeSistema = data?.sistemas.find((s) => s.sistema === active)

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
          Sistemas no peninsulares · Canarias · Baleares · Ceuta · Melilla
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Demanda + PVPC por sistema · perfiles muy distintos a Península · alta dependencia
          generación diesel/fuel. Cache 5 min.
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando sistemas NP…</p>}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && data?.sistemas && data.sistemas.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {data.sistemas.map((s) => (
              <button
                key={s.sistema}
                onClick={() => setActive(s.sistema)}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  border: active === s.sistema ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: active === s.sistema ? '#0f172a' : '#fff',
                  color: active === s.sistema ? '#fff' : '#475569',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s.name} {!s.ok && <span style={{ opacity: 0.5 }}>·</span>}
              </button>
            ))}
          </div>
          {activeSistema && <SistemaDetail s={activeSistema} />}
        </>
      )}

      {!loading && data?._meta && (
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          {data._meta.note} · Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a>
        </p>
      )}
    </section>
  )
}

function SistemaDetail({ s }: { s: SistemaNP }) {
  if (!s.ok || (!s.demanda && !s.pvpc)) {
    return (
      <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
        {s.errors?.join(' · ') || 'Sin datos para este sistema'}
      </p>
    )
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
        {s.demanda?.latest_mw !== null && s.demanda?.latest_mw !== undefined && (
          <Kpi label="Demanda ahora" value={`${(s.demanda.latest_mw! / 1000).toFixed(2)} GW`} sub={s.demanda.latest_datetime?.slice(11, 16) + 'h'} accent="#0891b2" />
        )}
        {s.demanda?.peak_24h_mw && (
          <Kpi label="Pico 24h" value={`${(s.demanda.peak_24h_mw / 1000).toFixed(2)} GW`} sub={`a las ${s.demanda.peak_24h_hour}`} accent="#dc2626" />
        )}
        {s.demanda?.total_24h_gwh !== null && s.demanda?.total_24h_gwh !== undefined && (
          <Kpi label="Energía 24h" value={`${s.demanda.total_24h_gwh.toFixed(1)} GWh`} accent="#7c3aed" />
        )}
        {s.pvpc?.latest !== null && s.pvpc?.latest !== undefined && (
          <Kpi label="PVPC ahora" value={`${s.pvpc.latest!.toFixed(1)} €/MWh`} sub={`media: ${s.pvpc.avg_24h?.toFixed(1)}`} accent="#f59e0b" />
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {s.demanda && (
          <MiniChart title="Demanda 24h (MW)" data={s.demanda.serie_24h} color="#0891b2" yFormat={(v) => `${(v / 1000).toFixed(1)}G`} />
        )}
        {s.pvpc && (
          <MiniChart title="PVPC 24h (€/MWh)" data={s.pvpc.serie_24h} color="#f59e0b" yFormat={(v) => v.toFixed(0)} />
        )}
      </div>
    </>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      padding: '8px 10px', background: '#fff', borderRadius: 6,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function MiniChart({
  title, data, color, yFormat,
}: { title: string; data: Array<{ t: string; v: number }>; color: string; yFormat: (v: number) => string }) {
  if (data.length < 2) return null
  const vals = data.map((p) => p.v)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const w = 320, h = 110, padL = 32, padR = 4, padT = 8, padB = 16
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const xOf = (i: number) => padL + (i / Math.max(1, data.length - 1)) * innerW
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH
  const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
  const area = `${path} L${xOf(data.length - 1).toFixed(1)},${padT + innerH} L${padL},${padT + innerH} Z`
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: '#475569', fontWeight: 600 }}>{title}</p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 1].map((t) => <line key={t} x1={padL} y1={padT + innerH * t} x2={w - padR} y2={padT + innerH * t} stroke="#f1f5f9" strokeWidth={1} />)}
        <path d={area} fill={color} opacity={0.15} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} />
        <text x={padL - 4} y={padT + 6} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{yFormat(maxV)}</text>
        <text x={padL - 4} y={padT + innerH} fontSize={8} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">{yFormat(minV)}</text>
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={xOf(i)} y={h - 4} fontSize={7} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">{data[i].t.slice(11, 16)}</text>
        ))}
      </svg>
    </div>
  )
}

export default EsiosNoPeninsularPanel
