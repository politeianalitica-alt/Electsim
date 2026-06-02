'use client'
/**
 * <EsiosIntercambiosMap /> · Sprint ESIOS-DEEP S3
 *
 * Mapa esquemático de la Península Ibérica con las 4 fronteras de
 * intercambio internacional (FR/PT/MA/AD) mostradas como flechas
 * dimensionadas por flujo y coloreadas por sentido (import/export).
 *
 * También incluye:
 *   - KPI saldo neto España (importadora/exportadora del día)
 *   - Tabla detallada de las 4 fronteras con MW + GWh + sentido
 *
 * Consume /api/esios/intercambios. Sin libs · todo SVG inline.
 */
import { useEffect, useState } from 'react'

interface SerieValor { t: string; v: number }
interface FronteraData {
  slug: string; ok: boolean; label: string; short: string; partner: string
  latest_mw: number | null
  latest_datetime: string | null
  sum_24h_gwh: number | null
  net_24h_gwh: number | null
  serie_24h: SerieValor[]
  direction: 'import' | 'export' | 'balanced' | null
  error?: string
}
interface AgregadoEspana {
  neto_24h_gwh: number
  neto_latest_mw: number
  clasificacion: 'importadora_neta' | 'exportadora_neta' | 'equilibrada'
}
interface Response {
  ok: boolean; error?: string
  fronteras: Record<string, FronteraData>
  agregado_espana: AgregadoEspana
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; convention: string; note: string }
}

// Posiciones relativas en el SVG (0-100) para España y los 4 partners
const POSITIONS = {
  espana: { x: 50, y: 55, label: 'ES' },
  intercambio_francia: { x: 65, y: 18, label: 'FR' },
  intercambio_portugal: { x: 18, y: 60, label: 'PT' },
  intercambio_marruecos: { x: 38, y: 92, label: 'MA' },
  intercambio_andorra: { x: 60, y: 35, label: 'AD' },
}

export function EsiosIntercambiosMap() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/intercambios', { cache: 'force-cache' })
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
          Intercambios internacionales · 4 fronteras eléctricas
        </h2>
        {/* Sprint Q-C.5 · S5 · convención exp/imp consistente con
            EntsoeSpainPanel ("Positivo = ES exporta · negativo = ES importa")
            y con el resto del módulo · color verde mantenido para "ES exporta"
            (España envía energía · saldo neto positivo). */}
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Saldos programados Francia · Portugal · Marruecos · Andorra (MW + GWh en 24 h).
          Verde / positivo = España exporta · rojo / negativo = España importa. Caché de 10 minutos.
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando intercambios ESIOS…</p>}

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
          <SaldoEspana agg={data.agregado_espana} />
          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
            gap: 14, marginTop: 14,
          }}>
            <MapaSVG fronteras={data.fronteras} />
            <TablaFronteras fronteras={data.fronteras} />
          </div>
          {data._meta && (
            <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              {data._meta.convention} · Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a>
            </p>
          )}
        </>
      )}
    </section>
  )
}

function SaldoEspana({ agg }: { agg: AgregadoEspana }) {
  const isExport = agg.clasificacion === 'exportadora_neta'
  const isImport = agg.clasificacion === 'importadora_neta'
  const accent = isExport ? '#16a34a' : isImport ? '#dc2626' : '#94a3b8'
  const label = isExport ? 'España exportadora neta' : isImport ? 'España importadora neta' : 'Balance equilibrado'
  return (
    <div style={{
      padding: '12px 14px', background: '#fff', borderRadius: 8,
      borderLeft: `4px solid ${accent}`, border: '1px solid #f1f5f9',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
          Saldo neto España últimas 24h
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: accent }}>{label}</p>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>Neto 24h</p>
          <p style={{ margin: 0, fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>
            {agg.neto_24h_gwh > 0 ? '+' : ''}{agg.neto_24h_gwh.toFixed(1)} GWh
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>Ahora</p>
          <p style={{ margin: 0, fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>
            {agg.neto_latest_mw > 0 ? '+' : ''}{agg.neto_latest_mw.toLocaleString('es-ES')} MW
          </p>
        </div>
      </div>
    </div>
  )
}

function MapaSVG({ fronteras }: { fronteras: Record<string, FronteraData> }) {
  // Calculamos max abs MW para normalizar grosor flecha
  const maxMW = Math.max(...Object.values(fronteras).map((f) => Math.abs(f.latest_mw || 0)), 100)

  const w = 320, h = 280
  const sx = (x: number) => (x / 100) * w
  const sy = (y: number) => (y / 100) * h

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Mapa de flujos · ahora
      </p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: '#f8fafc', borderRadius: 8, display: 'block' }}>
        {/* Contorno aproximado Iberia · poligono muy simplificado */}
        <path
          d="M 75,90 L 190,80 L 230,100 L 240,160 L 220,200 L 150,220 L 85,210 L 70,160 Z"
          fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1}
        />
        {/* Nodo España (centro) */}
        <circle cx={sx(POSITIONS.espana.x)} cy={sy(POSITIONS.espana.y)} r={14} fill="#0f172a" />
        <text x={sx(POSITIONS.espana.x)} y={sy(POSITIONS.espana.y) + 4} fill="#fff" fontSize={11} fontWeight={700} textAnchor="middle">ES</text>

        {/* Flechas a partners */}
        {(['intercambio_francia', 'intercambio_portugal', 'intercambio_marruecos', 'intercambio_andorra'] as const).map((slug) => {
          const f = fronteras[slug]
          if (!f) return null
          const pos = POSITIONS[slug]
          const x1 = sx(POSITIONS.espana.x), y1 = sy(POSITIONS.espana.y)
          const x2 = sx(pos.x), y2 = sy(pos.y)
          const mw = f.latest_mw || 0
          const stroke = mw > 50 ? '#dc2626' : mw < -50 ? '#16a34a' : '#94a3b8'
          const width = 1 + (Math.abs(mw) / maxMW) * 5
          // Flecha apunta hacia España si import, hacia partner si export
          const arrow = mw > 50 ? `M${x2},${y2} L${x1},${y1}` : `M${x1},${y1} L${x2},${y2}`

          return (
            <g key={slug}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} opacity={0.7} />
              {/* punta de flecha simple */}
              <circle cx={x2} cy={y2} r={10} fill="#fff" stroke={stroke} strokeWidth={1.5} />
              <text x={x2} y={y2 + 3} fontSize={9} fontWeight={700} fill="#0f172a" textAnchor="middle">{pos.label}</text>
              {/* etiqueta MW */}
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} fontSize={9} fontFamily="ui-monospace, monospace" fill="#1e293b" textAnchor="middle" fontWeight={700}>
                {Math.abs(mw)} MW
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#475569', marginTop: 4, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#dc2626', marginRight: 3 }} />Import</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#16a34a', marginRight: 3 }} />Export</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#94a3b8', marginRight: 3 }} />Balanceado</span>
      </div>
    </div>
  )
}

function TablaFronteras({ fronteras }: { fronteras: Record<string, FronteraData> }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Detalle · 4 fronteras
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Object.values(fronteras).map((f) => {
          const dir = f.direction
          const accent = dir === 'import' ? '#dc2626' : dir === 'export' ? '#16a34a' : '#94a3b8'
          const arrow = dir === 'import' ? '⬇' : dir === 'export' ? '⬆' : '⇆'
          return (
            <div key={f.slug} style={{
              padding: '8px 10px', background: '#fff', borderRadius: 6,
              borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{f.partner}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>
                  {arrow} {Math.abs(f.latest_mw || 0)} MW
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                <span>Neto 24h: {f.net_24h_gwh !== null ? `${f.net_24h_gwh > 0 ? '+' : ''}${f.net_24h_gwh.toFixed(1)}` : '—'} GWh</span>
                <span>Energía: {f.sum_24h_gwh !== null ? f.sum_24h_gwh.toFixed(1) : '—'} GWh</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EsiosIntercambiosMap
