'use client'
/**
 * <CommodityStrip /> · Sprint Energía S7
 *
 * Strip reutilizable de commodities energía: una tarjeta por símbolo con
 * nivel (spot) + variación 24h + mini-sparkline de la serie. Consume el
 * endpoint `/api/energia/commodities` (cascada Alpha Vantage → Nasdaq DL →
 * Yahoo, ver `lib/energia/commodities.ts`). Lo usa PetroleoView y puede
 * retrofitear Visión Global.
 *
 * Degradación honesta (CLAUDE.md): si un símbolo no trae serie (ej. TTF sin
 * fuente, o rate-limit), su tarjeta muestra "—" con la razón en el title.
 * Cero emojis · glyphs Unicode (⇡ ⇣). Client component.
 */
import { useEffect, useState } from 'react'
import type {
  EnergyCommodityResponse,
  EnergyCommoditySeries,
  EnergyCommoditySymbol,
} from '@/lib/energia/types'

interface CommodityStripProps {
  /** Símbolos a mostrar (orden respetado). Default: oil core. */
  symbols?: EnergyCommoditySymbol[]
  /** Categoría a pedir al endpoint (oil|gas|all). Default 'oil'. */
  category?: 'oil' | 'gas' | 'all'
  /** Color de acento para el spot/sparkline positivo. */
  accent?: string
  /** Ventana de la serie (días). Default 90. */
  days?: number
}

const DEFAULT_ACCENT = '#0F766E'

export default function CommodityStrip({
  symbols,
  category = 'oil',
  accent = DEFAULT_ACCENT,
  days = 90,
}: CommodityStripProps) {
  const [data, setData] = useState<Record<string, EnergyCommodityResponse> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const r = await fetch(`/api/energia/commodities?category=${category}&days=${days}`, {
          cache: 'no-store',
        })
        const j = (await r.json()) as { data?: Record<string, EnergyCommodityResponse> }
        if (alive) setData(j?.data ?? {})
      } catch {
        if (alive) setData({})
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [category, days])

  // Orden de visualización: el explícito, o las claves devueltas.
  const order: string[] = symbols ?? (data ? Object.keys(data) : [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 10,
      }}
    >
      {loading &&
        Array.from({ length: order.length || 4 }).map((_, i) => (
          <div
            key={i}
            style={{ height: 92, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12 }}
          />
        ))}
      {!loading &&
        order.map((sym) => {
          const resp = data?.[sym]
          return <CommodityCard key={sym} resp={resp} accent={accent} />
        })}
    </div>
  )
}

function CommodityCard({
  resp,
  accent,
}: {
  resp: EnergyCommodityResponse | undefined
  accent: string
}) {
  const s: EnergyCommoditySeries | undefined = resp?.ok ? resp.data : undefined
  const name = s?.name ?? humanizeSymbol(resp)
  const unavailableNote = !s
    ? resp?.error ?? 'sin dato'
    : undefined

  const spark = (s?.series ?? []).map((p) => p.value)
  const chg = s?.change_24h ?? null
  const up = (chg ?? 0) >= 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#1d1d1f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        {s?.unit && <span style={{ fontSize: 9, color: '#86868b', whiteSpace: 'nowrap' }}>{s.unit}</span>}
      </div>

      {s && s.latest != null ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
            <span
              style={{
                fontSize: 21,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {s.latest.toLocaleString('es-ES', { maximumFractionDigits: s.latest >= 100 ? 1 : 2 })}
            </span>
            {chg != null && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: up ? '#16A34A' : '#DC2626', whiteSpace: 'nowrap' }}>
                {up ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
              </span>
            )}
          </div>
          {spark.length > 1 ? (
            <MiniSparkline values={spark} positive={up} accent={accent} />
          ) : (
            <div style={{ height: 22 }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#A0A0A5' }}>
            <span title={s.source_label}>{sourceShort(s.source)}</span>
            <span>
              7d {fmtPct(s.change_7d)} · 30d {fmtPct(s.change_30d)}
            </span>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
          <span style={{ fontSize: 21, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#C0C0C5' }}>—</span>
          <span style={{ fontSize: 9.5, color: '#A0A0A5', lineHeight: 1.4 }} title={unavailableNote}>
            {unavailableNote}
          </span>
        </div>
      )}
    </div>
  )
}

function MiniSparkline({ values, positive, accent }: { values: number[]; positive: boolean; accent: string }) {
  const W = 160
  const H = 22
  const P = 1.5
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stroke = positive ? accent : '#DC2626'
  const path = values
    .map((v, i) => {
      const x = P + (i / (values.length - 1)) * (W - 2 * P)
      const y = P + (1 - (v - min) / range) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

function sourceShort(src: EnergyCommoditySeries['source']): string {
  switch (src) {
    case 'alpha_vantage':
      return 'Alpha Vantage'
    case 'nasdaq_data_link':
      return 'Nasdaq DL'
    case 'yahoo_finance':
      return 'Yahoo'
    default:
      return src
  }
}

// Nombre legible cuando el símbolo no trae datos (resp.error sin data).
function humanizeSymbol(_resp: EnergyCommodityResponse | undefined): string {
  return 'Commodity'
}
