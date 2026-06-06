'use client'
/**
 * <ConectAerolineas /> · Turismo v3 · Sprint T8 (Conectividad)
 *
 * Cotización de IAG (Iberia · British Airways · Vueling) y el resto de aéreas
 * relevantes para la conectividad de España, más los operadores aeroportuarios
 * (Aena, Fraport). La cotización es un proxy de la salud y la capacidad de
 * asiento del mercado: las aéreas marcan oferta de plazas y rutas, y Aena la
 * infraestructura por la que entra el turismo receptor.
 *
 * Consume `GET /api/turismo/empresas?segmento=aerolinea,aeropuertos` (mismo
 * contrato que <TurismoEmpresasPanel />), que ya resuelve catálogo + cotización
 * Finnhub en el servidor. Degradación honesta (CLAUDE.md): si la cotización no
 * está disponible (rate-limit / ticker no soportado / privada) se marca, no se
 * inventa. Cero emojis · Unicode (⇡ ⇣).
 *
 * NOTA capacidad: no existe fuente pública gratuita y fiable de ASK/plazas
 * ofertadas en tiempo real; el proxy honesto de capacidad es el tráfico AENA
 * (panel de arriba) + la cotización de las aéreas. No se inventan plazas.
 */
import { useEffect, useMemo, useState } from 'react'

const ACCENT = '#0EA5E9'

interface EmpresaQuote {
  price: number | null
  change_percent: number | null
  available: boolean
}
interface Empresa {
  slug: string
  nombre: string
  ticker: string | null
  segmento: string
  quote: EmpresaQuote
}
interface EmpresasResponse {
  ok: boolean
  data?: { empresas?: Empresa[] } | null
}

type LoadState = 'loading' | 'ready' | 'error'

const SEG_LABEL: Record<string, string> = {
  aerolinea: 'Aerolínea',
  aeropuertos: 'Operador aeroportuario',
}

export function ConectAerolineas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const r = await fetch('/api/turismo/empresas?segmento=aerolinea,aeropuertos', { cache: 'no-store' })
        const j: EmpresasResponse = await r.json()
        if (!alive) return
        setEmpresas(Array.isArray(j?.data?.empresas) ? j.data!.empresas! : [])
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  // IAG primero (es la referencia del mercado ES), luego aéreas, luego aeropuertos.
  const ordered = useMemo(() => {
    const rank = (e: Empresa) =>
      e.slug === 'iag' ? 0 : e.segmento === 'aerolinea' ? 1 : 2
    return [...empresas].sort((a, b) => rank(a) - rank(b))
  }, [empresas])

  const iag = useMemo(() => empresas.find((e) => e.slug === 'iag') ?? null, [empresas])

  return (
    <div>
      {/* Contexto IAG destacado (referencia del mercado español) */}
      {state === 'ready' && iag && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 12,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0C4A6E' }}>
              Referencia del mercado · IAG
            </div>
            <div style={{ fontSize: 12.5, color: '#0C4A6E' }}>Iberia · British Airways · Vueling · Aer Lingus · LEVEL</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <BigQuote q={iag.quote} ticker={iag.ticker} />
          </div>
        </div>
      )}

      {state === 'loading' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 96, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12 }} />
          ))}
        </div>
      ) : state === 'error' ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No se pudo cargar el listado de aéreas en este momento. La fuente de cotización (Finnhub) puede
          estar limitada; reintenta más tarde.
        </p>
      ) : ordered.length === 0 ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          Sin aerolíneas ni operadores aeroportuarios disponibles ahora.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {ordered.map((e) => (
            <AirlineCard key={e.slug} empresa={e} />
          ))}
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Capacidad y conectividad: la cotización es un proxy de la salud del operador; el volumen real de
        plazas y rutas se lee en el tráfico AENA (panel superior). No hay fuente pública gratuita de
        ASK/plazas en tiempo real, así que no se simula. Cotización: Finnhub (free tier · puede limitar
        tickers europeos).
      </p>
    </div>
  )
}

function AirlineCard({ empresa }: { empresa: Empresa }) {
  const q = empresa.quote
  const hasQuote = !!q?.available && q.price != null
  const chg = q?.change_percent ?? null
  const varColor = chg == null ? '#9CA3AF' : chg >= 0 ? '#16A34A' : '#DC2626'
  const isAirport = empresa.segmento === 'aeropuertos'

  return (
    <div
      style={{
        padding: 13,
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        borderLeft: `4px solid ${isAirport ? '#7C3AED' : ACCENT}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 6, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#1d1d1f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={empresa.nombre}
        >
          {empresa.nombre}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{empresa.ticker || '—'}</span>
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 8,
          padding: 8,
          background: hasQuote ? `${varColor}10` : '#FAFAFA',
          borderRadius: 6,
        }}
      >
        {hasQuote ? (
          <>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
              {q.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
            </span>
            {chg != null && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: varColor }}>
                {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
              </span>
            )}
          </>
        ) : (
          <span
            style={{ fontSize: 11, color: '#9CA3AF' }}
            title={empresa.ticker ? 'Sin cotización (rate-limit o ticker no soportado en free tier)' : 'Empresa privada · no cotiza'}
          >
            {empresa.ticker ? '— sin cotización' : '— no cotiza (privada)'}
          </span>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <span
          style={{
            fontSize: 9,
            padding: '2px 7px',
            borderRadius: 999,
            background: isAirport ? '#7C3AED14' : `${ACCENT}14`,
            color: isAirport ? '#7C3AED' : ACCENT,
            fontWeight: 700,
          }}
        >
          {SEG_LABEL[empresa.segmento] ?? empresa.segmento}
        </span>
      </div>
    </div>
  )
}

function BigQuote({ q, ticker }: { q: EmpresaQuote; ticker: string | null }) {
  const hasQuote = !!q?.available && q.price != null
  const chg = q?.change_percent ?? null
  const varColor = chg == null ? '#9CA3AF' : chg >= 0 ? '#16A34A' : '#DC2626'
  if (!hasQuote) {
    return (
      <span style={{ fontSize: 12, color: '#9CA3AF' }} title="Sin cotización (rate-limit Finnhub o ticker no soportado)">
        {ticker || 'IAG.MC'} · sin cotización ahora
      </span>
    )
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#0C4A6E' }}>
        {q.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
      </span>
      {chg != null && (
        <span style={{ fontSize: 13.5, fontWeight: 700, color: varColor }}>
          {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
        </span>
      )}
    </div>
  )
}

export default ConectAerolineas
