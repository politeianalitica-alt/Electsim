'use client'
/**
 * <AgroPreciosView /> · Agro v3 · Sprint A4
 *
 * Mini-Vesper de precios agrícolas: grid de tarjetas por producto con precio
 * actual + variación diaria + sparkline + meta del contrato + rol España.
 * Click en una tarjeta → drawer inferior con análisis Gemini bajo demanda
 * (qué pasa, factores, riesgo, oportunidad, efecto en España).
 *
 * Cero datos inventados. Si Yahoo no responde para un ticker, la tarjeta
 * se muestra "sin cotización en vivo" y se desactiva el botón de análisis.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIAS_PRODUCTOS } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Skeleton, Vacio, Th, Td } from '@/lib/sectores/charts'

const ACCENT = '#16A34A'

interface YahooSnap {
  symbol: string
  price: number | null
  previous_close: number | null
  change: number | null
  change_pct: number | null
  currency: string | null
  ts: number | null
  spark: number[]
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
  data: { productos: ProductoPrecio[]; n_total: number; n_con_precio: number } | null
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

export function AgroPreciosView() {
  const [env, setEnv] = useState<PreciosEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/agro/precios', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: PreciosEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const productos = env?.data?.productos ?? []
  const porCategoria = useMemo(() => {
    const acc: Record<string, ProductoPrecio[]> = {}
    for (const p of productos) {
      if (!acc[p.categoria]) acc[p.categoria] = []
      acc[p.categoria].push(p)
    }
    return acc
  }, [productos])

  // Resumen por categoría: %verdes vs %rojos
  const resumen = useMemo(() => {
    const out: Array<{ id: string; nombre: string; color: string; total: number; verdes: number; rojos: number }> = []
    for (const c of CATEGORIAS_PRODUCTOS) {
      const arr = porCategoria[c.id] || []
      const verdes = arr.filter((p) => (p.snapshot?.change_pct ?? 0) > 0).length
      const rojos = arr.filter((p) => (p.snapshot?.change_pct ?? 0) < 0).length
      out.push({ id: c.id, nombre: c.nombre, color: c.color, total: arr.length, verdes, rojos })
    }
    return out
  }, [porCategoria])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · LONJAS Y PRECIOS · YAHOO + GEMINI"
        titulo="Mini-Vesper agrícola con análisis de impacto"
        descripcion="Precios en vivo de los principales productos agrícolas relevantes para España (cereales, oleaginosas, ganado, softs, lácteos, inputs energéticos). Click en cualquier tarjeta para abrir el análisis Gemini: qué le está pasando al precio, qué factores lo explican y cómo afecta a la agricultura española según su rol (productor / exportador / importador)."
        colorFrom={ACCENT}
        colorTo="#166534"
      />

      <Panel
        titulo="Resumen por categoría · tono del día"
        fuente={env?.fuente || 'Yahoo Finance'}
        url={env?.fuente_url || 'https://finance.yahoo.com/commodities'}
      >
        {loading ? (
          <Skeleton h={80} />
        ) : productos.length === 0 ? (
          <Vacio msg={`Yahoo Finance no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
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
                    {r.total}
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

      {CATEGORIAS_PRODUCTOS.map((c) => {
        const arr = porCategoria[c.id] || []
        if (arr.length === 0) return null
        return (
          <Panel
            key={c.id}
            titulo={c.nombre}
            fuente="Yahoo Finance · cotizaciones diarias"
            url="https://finance.yahoo.com/commodities"
          >
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
                    onClick={() => setSeleccionado(p.id)}
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
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 13, color: '#1d1d1f' }}>
                        {p.nombre}
                      </span>
                      <PrecioBadge snap={p.snapshot} />
                    </div>
                    <div style={{ fontSize: 10, color: '#86868b', fontFamily: 'monospace', marginBottom: 4 }}>
                      {p.ticker || 'sin ticker'} · {p.unidad}
                    </div>
                    <Sparkline data={p.snapshot?.spark || []} color={p.color} />
                    <div style={{ fontSize: 10.5, color: '#3a3a3d', marginTop: 4, lineHeight: 1.4 }}>{p.rol_espana}</div>
                    <div style={{ fontSize: 10, color: c.color, fontWeight: 700, marginTop: 6, letterSpacing: '0.04em' }}>
                      VER ANÁLISIS GEMINI ›
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )
      })}

      {seleccionado && (
        <ImpactoDrawer
          slug={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}

      <CtaVesper />
    </div>
  )
}

function PrecioBadge({ snap }: { snap: YahooSnap | null }) {
  if (!snap || snap.price == null) {
    return <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>sin precio</span>
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

function ImpactoDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [env, setEnv] = useState<ImpactoEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agro/impacto-producto/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ImpactoEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  return (
    <section
      style={{
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 14,
        padding: '20px 22px',
        position: 'sticky',
        bottom: 16,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
          {env?.data?.producto?.nombre || 'Análisis Gemini'}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={env?.fuente_url || 'https://finance.yahoo.com/commodities'}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 10.5, color: '#166534', textDecoration: 'none', fontWeight: 700 }}
          >
            {env?.fuente || 'Yahoo + Gemini'} ›
          </a>
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
        </div>
      </header>

      {loading ? (
        <Skeleton h={140} />
      ) : !env?.ok || !env.data?.analisis ? (
        <Vacio
          msg={`Análisis no disponible · ${env?.fuentes_error?.join(' · ') || 'Gemini sin respuesta o producto sin precio'}`}
        />
      ) : (
        <AnalisisCard data={env.data} modelo={env.modelo} />
      )}
    </section>
  )
}

function AnalisisCard({ data, modelo }: { data: NonNullable<ImpactoEnvelope['data']>; modelo?: string }) {
  const a = data.analisis!
  const s = data.snapshot
  const confColor = a.confianza === 'alta' ? '#16A34A' : a.confianza === 'media' ? '#F59E0B' : '#DC2626'
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
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

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <FactBox label="Precio actual" value={`${s.price?.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${s.currency ?? ''}`} />
        <FactBox label="Cierre anterior" value={`${s.previous_close?.toLocaleString('es-ES', { maximumFractionDigits: 2 }) ?? '—'}`} />
        <FactBox
          label="Variación diaria"
          value={s.change_pct != null ? `${s.change_pct > 0 ? '+' : ''}${s.change_pct.toFixed(2)}%` : '—'}
          color={(s.change_pct ?? 0) > 0 ? '#16A34A' : (s.change_pct ?? 0) < 0 ? '#DC2626' : '#86868b'}
        />
        <FactBox label="Ticker Yahoo" value={data.producto.ticker} mono />
      </div>

      <p style={{ fontSize: 10, color: '#86868b', margin: '10px 0 0', lineHeight: 1.5 }}>
        Análisis generado por LLM ({modelo || 'gemini-2.0-flash-lite'}) a partir del snapshot Yahoo Finance + contexto del catálogo.
        Sigue el principio Politeia: las cifras vienen de la API; el análisis es interpretativo. Verifica las afirmaciones críticas
        en su fuente primaria antes de operar.
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

function FactBox({ label, value, color = '#1d1d1f', mono = false }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, padding: '6px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: mono ? 'monospace' : 'inherit', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function CtaVesper() {
  return (
    <section style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px 20px' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>¿Necesitas análisis profundo por commodity?</p>
      <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5, maxWidth: 760 }}>
        El cockpit completo de commodities (OHLC, forecast IA, supply/demand, recipe cost, alertas, técnico
        + geopolítica, watchlist) vive en{' '}
        <Link href="/commodities" style={{ color: '#854D0E', fontWeight: 700 }}>
          /commodities
        </Link>
        . Aquí mostramos sólo el subset relevante para España y el análisis Gemini de impacto sectorial.
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
        Abrir cockpit de commodities ›
      </Link>
    </section>
  )
}
