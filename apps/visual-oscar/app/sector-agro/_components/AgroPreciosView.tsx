'use client'
/**
 * <AgroPreciosView /> · Agro v4 · Lonjas y Precios (cockpit fusionado)
 *
 * Fusiona el cockpit de commodities estilo Vesper DENTRO de Lonjas y Precios,
 * funcionando 100% standalone (sin backend Python). Tres niveles:
 *
 *   1) Selector de FUENTE de precio: Futuros (Yahoo) · Histórico IMF (FRED) ·
 *      Físico € (EU Agri-food). Cambia /api/agro/precios?fuente=…
 *   2) Grid por categoría con precio + variación + sparkline (tarjetas).
 *   3) Drill por producto: candlestick OHLC (Yahoo) + medias móviles +
 *      Bollinger + RSI + máximos/mínimos + análisis Gemini de impacto.
 *
 * Cero datos inventados: cada faceta degrada por separado si su fuente cae.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIAS_PRODUCTOS } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Skeleton, Vacio, LineChart } from '@/lib/sectores/charts'
import { OHLCChart } from '@/components/commodities/OHLCChart'
import { sma, bollinger, rsi } from '@/lib/sma'
import type { OHLCPoint } from '@/types/commodities'

const ACCENT = '#16A34A'

type FuenteId = 'yahoo' | 'fred' | 'eu'

const FUENTES: Array<{ id: FuenteId; label: string; sub: string }> = [
  { id: 'yahoo', label: 'Futuros', sub: 'CME · Euronext · ICE (Yahoo)' },
  { id: 'fred', label: 'Histórico IMF', sub: 'IMF Global Price (FRED)' },
  { id: 'eu', label: 'Físico €', sub: 'EU Agri-food Data Portal' },
]

interface YahooSnap {
  symbol: string
  price: number | null
  previous_close: number | null
  change: number | null
  change_pct: number | null
  currency: string | null
  ts: number | null
  spark: number[]
  periodo?: string | null
}

interface ProductoPrecio {
  id: string
  nombre: string
  categoria: string
  unidad: string
  contrato: string
  rol_espana: string
  color: string
  ticker: string | null
  snapshot: YahooSnap | null
}

interface PreciosEnvelope {
  ok: boolean
  data: { productos: ProductoPrecio[]; n_total: number; n_con_precio: number; fuente_id: FuenteId } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

interface ImpactoAnalisis {
  titular: string
  resumen: string
  factores: string[]
  riesgo: string
  oportunidad: string
  efecto_en_espana: string
  confianza: 'alta' | 'media' | 'baja'
}

interface ImpactoEnvelope {
  ok: boolean
  data: {
    producto: { id: string; nombre: string; categoria: string; unidad: string; ticker: string; rol_espana: string }
    snapshot: YahooSnap
    analisis: ImpactoAnalisis | null
  } | null
  fuente: string
  fuente_url: string
  fuentes_error?: string[]
  generated_by_llm?: boolean
  modelo?: string
}

interface OhlcEnvelope {
  ok: boolean
  data: {
    producto: { id: string; nombre: string; ticker: string; unidad: string; categoria: string; color: string }
    range: string
    interval: string
    currency: string | null
    bars: OHLCPoint[]
    n_bars: number
  } | null
  fuente: string
  fuente_url: string
  fuentes_error?: string[]
}

export function AgroPreciosView() {
  const [fuente, setFuente] = useState<FuenteId>('yahoo')
  const [env, setEnv] = useState<PreciosEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agro/precios?fuente=${fuente}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: PreciosEnvelope | null) => {
        if (!alive) return
        setEnv(j)
        // Si los futuros (Yahoo) no devuelven ningún precio (p.ej. bloqueo de IP
        // del datacenter), conmutamos automáticamente al histórico FRED para que
        // la pestaña nunca aparezca vacía.
        if (fuente === 'yahoo' && j?.data && j.data.n_con_precio === 0) {
          setFuente('fred')
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [fuente])

  const productos = env?.data?.productos ?? []
  const porCategoria = useMemo(() => {
    const acc: Record<string, ProductoPrecio[]> = {}
    for (const p of productos) {
      if (!acc[p.categoria]) acc[p.categoria] = []
      acc[p.categoria].push(p)
    }
    return acc
  }, [productos])

  const resumen = useMemo(() => {
    const out: Array<{ id: string; nombre: string; color: string; total: number; verdes: number; rojos: number; conPrecio: number }> = []
    for (const c of CATEGORIAS_PRODUCTOS) {
      const arr = porCategoria[c.id] || []
      const verdes = arr.filter((p) => (p.snapshot?.change_pct ?? 0) > 0).length
      const rojos = arr.filter((p) => (p.snapshot?.change_pct ?? 0) < 0).length
      const conPrecio = arr.filter((p) => p.snapshot?.price != null).length
      out.push({ id: c.id, nombre: c.nombre, color: c.color, total: arr.length, verdes, rojos, conPrecio })
    }
    return out
  }, [porCategoria])

  const seleccionadoProd = productos.find((p) => p.id === seleccionado) || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · LONJAS Y PRECIOS · COCKPIT"
        titulo="Cockpit de precios agrícolas con análisis de impacto"
        descripcion="Precios de los principales productos agrícolas relevantes para España desde tres fuentes complementarias: futuros internacionales (Yahoo), histórico largo IMF (FRED) y precio físico europeo (EU Agri-food Data Portal). Click en cualquier tarjeta para abrir el detalle: velas OHLC, medias móviles, Bollinger, RSI, máximos/mínimos y el análisis Gemini de cómo afecta a la agricultura española."
        colorFrom={ACCENT}
        colorTo="#166534"
      />

      {/* Selector de fuente */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 12,
          padding: '10px 12px',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginRight: 4 }}>
          Fuente de precio
        </span>
        {FUENTES.map((f) => {
          const active = fuente === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFuente(f.id)}
              style={{
                cursor: 'pointer',
                border: `1px solid ${active ? ACCENT : '#ECECEF'}`,
                background: active ? '#F0FDF4' : '#FAFAFA',
                borderRadius: 999,
                padding: '6px 14px',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#166534' : '#1d1d1f' }}>{f.label}</div>
              <div style={{ fontSize: 9.5, color: '#86868b' }}>{f.sub}</div>
            </button>
          )
        })}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: '#86868b' }}>
          {env?.data ? `${env.data.n_con_precio}/${env.data.n_total} con dato` : '—'}
        </span>
      </div>

      <Panel
        titulo="Resumen por categoría · tono del día"
        fuente={env?.fuente || 'Yahoo Finance'}
        url={env?.fuente_url || 'https://finance.yahoo.com/commodities'}
      >
        {loading ? (
          <Skeleton h={80} />
        ) : productos.length === 0 ? (
          <Vacio msg={`Fuente sin respuesta · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {resumen.map((r) => (
              <div
                key={r.id}
                style={{
                  background: '#FAFAFA',
                  border: '1px solid #ECECEF',
                  borderTop: `3px solid ${r.color}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
                  {r.nombre}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: r.color }}>
                    {r.conPrecio}/{r.total}
                  </span>
                  <span style={{ fontSize: 11 }}>
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>↑{r.verdes}</span>
                    <span style={{ color: '#86868b', margin: '0 4px' }}>·</span>
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>↓{r.rojos}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {loading ? (
        <Skeleton h={200} />
      ) : (
        CATEGORIAS_PRODUCTOS.map((c) => {
          const arr = porCategoria[c.id] || []
          if (arr.length === 0) return null
          return (
            <Panel key={c.id} titulo={c.nombre} fuente={env?.fuente || 'Yahoo Finance'} url={env?.fuente_url || 'https://finance.yahoo.com/commodities'}>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 10,
                }}
              >
                {arr.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSeleccionado(p.id === seleccionado ? null : p.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: seleccionado === p.id ? '#F0FDF4' : '#FAFAFA',
                        border: '1px solid #ECECEF',
                        borderLeft: `3px solid ${c.color}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 13, color: '#1d1d1f' }}>{p.nombre}</span>
                        <PrecioBadge snap={p.snapshot} />
                      </div>
                      <div style={{ fontSize: 10, color: '#86868b', fontFamily: 'monospace', marginBottom: 4 }}>
                        {p.snapshot?.periodo ? `${p.snapshot.periodo} · ` : ''}
                        {p.ticker || 'sin ticker'} · {p.unidad}
                      </div>
                      <Sparkline data={p.snapshot?.spark || []} color={p.color} />
                      <div style={{ fontSize: 10.5, color: '#3a3a3d', marginTop: 4, lineHeight: 1.4 }}>{p.rol_espana}</div>
                      <div style={{ fontSize: 10, color: c.color, fontWeight: 700, marginTop: 6, letterSpacing: '0.04em' }}>
                        {seleccionado === p.id ? 'OCULTAR DETALLE ▾' : 'VER DETALLE · OHLC + GEMINI ›'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )
        })
      )}

      {seleccionadoProd && <ProductDrill producto={seleccionadoProd} onClose={() => setSeleccionado(null)} />}

      <CtaVesper />
    </div>
  )
}

function PrecioBadge({ snap }: { snap: YahooSnap | null }) {
  if (!snap || snap.price == null) {
    return <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>sin dato</span>
  }
  const up = (snap.change_pct ?? 0) > 0
  const flat = (snap.change_pct ?? 0) === 0
  const color = flat ? '#86868b' : up ? '#16A34A' : '#DC2626'
  const arrow = flat ? '·' : up ? '↑' : '↓'
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1d1d1f' }}>
        {snap.price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
        <span style={{ fontSize: 10, color: '#86868b', marginLeft: 3 }}>{snap.currency ?? ''}</span>
      </span>
      <span style={{ fontSize: 10.5, color, fontWeight: 700 }}>
        {arrow} {snap.change_pct != null ? `${snap.change_pct > 0 ? '+' : ''}${snap.change_pct.toFixed(2)}%` : '—'}
      </span>
    </span>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 20 }} />
  const W = 100
  const H = 20
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((v - min) / span) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

const RANGES: Array<{ id: string; label: string }> = [
  { id: '3mo', label: '3M' },
  { id: '6mo', label: '6M' },
  { id: '1y', label: '1A' },
  { id: '2y', label: '2A' },
  { id: '5y', label: '5A' },
]

function ProductDrill({ producto, onClose }: { producto: ProductoPrecio; onClose: () => void }) {
  const [range, setRange] = useState('1y')
  const [ohlc, setOhlc] = useState<OhlcEnvelope | null>(null)
  const [loadingOhlc, setLoadingOhlc] = useState(true)
  const [asLine, setAsLine] = useState(false)

  const [imp, setImp] = useState<ImpactoEnvelope | null>(null)
  const [loadingImp, setLoadingImp] = useState(true)

  // Fallback histórico FRED (si Yahoo OHLC no responde desde el datacenter).
  const [histo, setHisto] = useState<{ ok: boolean; data: { label: string; unidad: string; points: Array<{ t: string; value: number | null }> } | null; fuente: string; fuente_url: string } | null>(null)

  useEffect(() => {
    let alive = true
    setLoadingOhlc(true)
    fetch(`/api/agro/ohlc/${encodeURIComponent(producto.id)}?range=${range}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: OhlcEnvelope | null) => alive && setOhlc(j))
      .catch(() => {})
      .finally(() => alive && setLoadingOhlc(false))
    return () => {
      alive = false
    }
  }, [producto.id, range])

  // Histórico FRED una vez por producto (fallback de gráfico).
  useEffect(() => {
    let alive = true
    setHisto(null)
    fetch(`/api/agro/historico/${encodeURIComponent(producto.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setHisto(j))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [producto.id])

  useEffect(() => {
    let alive = true
    setLoadingImp(true)
    fetch(`/api/agro/impacto-producto/${encodeURIComponent(producto.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ImpactoEnvelope | null) => alive && setImp(j))
      .catch(() => {})
      .finally(() => alive && setLoadingImp(false))
    return () => {
      alive = false
    }
  }, [producto.id])

  const bars = ohlc?.data?.bars ?? []
  const tech = useMemo(() => {
    const closes = bars.map((b) => b.close)
    const sma20 = sma(closes, 20)
    const sma50 = sma(closes, 50)
    const boll = bollinger(closes, 20, 2)
    const rsiSerie = rsi(closes, 14)
    const lastRsi = [...rsiSerie].reverse().find((v) => v != null) ?? null
    const valid = closes.filter((c): c is number => c != null)
    const lastClose = valid[valid.length - 1] ?? null
    const hi = valid.length ? Math.max(...valid) : null
    const lo = valid.length ? Math.min(...valid) : null
    const pctFromHigh = lastClose != null && hi ? ((lastClose - hi) / hi) * 100 : null
    const lastSma20 = [...sma20].reverse().find((v) => v != null) ?? null
    const lastSma50 = [...sma50].reverse().find((v) => v != null) ?? null
    return { sma20, sma50, boll, lastRsi, lastClose, hi, lo, pctFromHigh, lastSma20, lastSma50 }
  }, [bars])

  const overlays = useMemo(
    () => [
      { name: 'SMA 20', values: tech.sma20, color: '#1F4E8C' },
      { name: 'SMA 50', values: tech.sma50, color: '#B45309' },
      { name: 'Bollinger sup.', values: tech.boll.upper, color: '#9CA3AF' },
      { name: 'Bollinger inf.', values: tech.boll.lower, color: '#9CA3AF' },
    ],
    [tech]
  )

  const cur = ohlc?.data?.currency ?? producto.snapshot?.currency ?? ''
  const rsiZona = tech.lastRsi == null ? '—' : tech.lastRsi >= 70 ? 'sobrecompra' : tech.lastRsi <= 30 ? 'sobreventa' : 'neutral'
  const rsiColor = tech.lastRsi == null ? '#86868b' : tech.lastRsi >= 70 ? '#DC2626' : tech.lastRsi <= 30 ? '#16A34A' : '#86868b'

  return (
    <section
      style={{
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
            {producto.nombre}
          </h3>
          <div style={{ fontSize: 10.5, color: '#86868b', fontFamily: 'monospace', marginTop: 2 }}>
            {producto.ticker} · {producto.unidad} · {producto.contrato}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #BBF7D0',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: '#166534',
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </header>

      {/* Gráfico OHLC + controles */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${range === r.id ? ACCENT : '#ECECEF'}`,
                  background: range === r.id ? '#F0FDF4' : '#fff',
                  color: range === r.id ? '#166534' : '#3a3a3d',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAsLine((v) => !v)}
            style={{
              cursor: 'pointer',
              border: '1px solid #ECECEF',
              background: '#fff',
              color: '#3a3a3d',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            {asLine ? 'Ver velas ◫' : 'Ver línea ⟋'}
          </button>
        </div>

        {loadingOhlc ? (
          <Skeleton h={320} />
        ) : ohlc?.ok && bars.length > 0 ? (
          <OHLCChart data={bars} overlays={overlays} asLine={asLine} height={340} />
        ) : histo?.ok && histo.data && histo.data.points.length > 0 ? (
          <div>
            <div style={{ fontSize: 10.5, color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
              Futuros en vivo (Yahoo) no disponibles ahora · mostrando histórico mensual de referencia (FRED · {histo.data.label}).
            </div>
            <LineChart points={histo.data.points} color={producto.color} height={300} />
          </div>
        ) : (
          <Vacio msg={`Sin serie de precios · ${ohlc?.fuentes_error?.join(' · ') || histo?.fuente || 'Yahoo y FRED sin respuesta'}`} />
        )}
      </div>

      {/* Lectura técnica */}
      {bars.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <IndicatorBox label="Último cierre" value={fmt(tech.lastClose, cur)} />
          <IndicatorBox label="SMA 20" value={fmt(tech.lastSma20, cur)} color="#1F4E8C" />
          <IndicatorBox label="SMA 50" value={fmt(tech.lastSma50, cur)} color="#B45309" />
          <IndicatorBox label={`RSI(14) · ${rsiZona}`} value={tech.lastRsi != null ? tech.lastRsi.toFixed(0) : '—'} color={rsiColor} />
          <IndicatorBox label={`Máx ${rangeLabel(range)}`} value={fmt(tech.hi, cur)} />
          <IndicatorBox label={`Mín ${rangeLabel(range)}`} value={fmt(tech.lo, cur)} />
          <IndicatorBox
            label="Desde máximo"
            value={tech.pctFromHigh != null ? `${tech.pctFromHigh.toFixed(1)}%` : '—'}
            color={(tech.pctFromHigh ?? 0) < -10 ? '#DC2626' : '#16A34A'}
          />
        </div>
      )}

      {/* Análisis Gemini */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 8 }}>
          Análisis de impacto · Gemini
        </div>
        {loadingImp ? (
          <Skeleton h={140} />
        ) : !imp?.ok || !imp.data?.analisis ? (
          <Vacio msg={`Análisis no disponible · ${imp?.fuentes_error?.join(' · ') || 'Gemini sin respuesta o producto sin precio'}`} />
        ) : (
          <AnalisisCard data={imp.data} modelo={imp.modelo} />
        )}
      </div>
    </section>
  )
}

function fmt(v: number | null, cur: string): string {
  if (v == null) return '—'
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ''}`
}
function rangeLabel(id: string): string {
  return RANGES.find((r) => r.id === id)?.label ?? id
}

function IndicatorBox({ label, value, color = '#1d1d1f' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 3, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  )
}

function AnalisisCard({ data, modelo }: { data: NonNullable<ImpactoEnvelope['data']>; modelo?: string }) {
  const a = data.analisis!
  const s = data.snapshot
  const confColor = a.confianza === 'alta' ? '#16A34A' : a.confianza === 'media' ? '#F59E0B' : '#DC2626'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', maxWidth: 720 }}>{a.titular}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: confColor,
            background: `${confColor}20`,
            padding: '2px 9px',
            borderRadius: 999,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Confianza {a.confianza}
        </span>
      </div>

      <p style={{ fontSize: 12.5, color: '#1d1d1f', margin: '0 0 12px', lineHeight: 1.55 }}>{a.resumen}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 12 }}>
        <CardBlock titulo="Factores" color="#1F4E8C">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {a.factores.map((f, i) => (
              <li key={i} style={{ fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>
                {f}
              </li>
            ))}
          </ul>
        </CardBlock>
        <CardBlock titulo="Riesgo si continúa" color="#DC2626">
          <p style={{ margin: 0, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{a.riesgo}</p>
        </CardBlock>
        <CardBlock titulo="Oportunidad si revierte" color="#16A34A">
          <p style={{ margin: 0, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{a.oportunidad}</p>
        </CardBlock>
      </div>

      <CardBlock titulo="Efecto sobre la agricultura española" color="#7C3AED">
        <p style={{ margin: 0, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{a.efecto_en_espana}</p>
      </CardBlock>

      <p style={{ fontSize: 10, color: '#86868b', margin: '10px 0 0', lineHeight: 1.5 }}>
        Análisis generado por LLM ({modelo || 'gemini-2.0-flash-lite'}) a partir del snapshot Yahoo Finance + contexto del catálogo.
        Precio de referencia: {s.price?.toLocaleString('es-ES', { maximumFractionDigits: 2 })} {s.currency ?? ''}. Las cifras vienen de la
        API; el análisis es interpretativo. Verifica las afirmaciones críticas en su fuente primaria antes de operar.
      </p>
    </div>
  )
}

function CardBlock({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 5 }}>
        {titulo}
      </div>
      {children}
    </div>
  )
}

function CtaVesper() {
  return (
    <section style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px 20px' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>¿Necesitas el cockpit global multi-sector?</p>
      <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5, maxWidth: 760 }}>
        El cockpit completo de commodities (forecast IA, supply/demand, recipe cost, alertas, watchlist multi-mercado) vive en{' '}
        <Link href="/commodities" style={{ color: '#854D0E', fontWeight: 700 }}>
          /commodities
        </Link>
        . Aquí tienes ya el subset agrícola relevante para España con velas, técnico y análisis Gemini integrados.
      </p>
      <Link
        href="/commodities"
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          background: '#FDE047',
          color: '#854D0E',
          borderRadius: 999,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        Abrir cockpit global ›
      </Link>
    </section>
  )
}
