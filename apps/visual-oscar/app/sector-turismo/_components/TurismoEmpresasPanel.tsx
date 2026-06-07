'use client'
/**
 * <TurismoEmpresasPanel /> · Turismo v3 · Sprint T1
 *
 * Bloque "empresas cotizadas del turismo" del shell. Consume el endpoint
 * `GET /api/turismo/empresas` (lo crea el sprint T2-cross · Finnhub) que ya
 * resuelve catálogo + cotización en el servidor, y renderiza un grid de
 * tarjetas (nombre · ticker · segmento · precio + cambio % si disponible).
 *
 * Shape consumido (contrato acordado con el agente de datos):
 *   {
 *     ok: boolean,
 *     data: {
 *       empresas: Array<{
 *         slug: string
 *         nombre: string
 *         ticker: string
 *         segmento: string
 *         quote: {
 *           price: number | null
 *           change_percent: number | null
 *           available: boolean
 *         }
 *       }>
 *     }
 *   }
 *
 * Equivalente de patrón a app/sector-energia/_components/shared/CompanyQuotePanel
 * (allí el fetch de cotización es por-ticker en el cliente; aquí el servidor ya
 * lo agrega y este panel solo pinta). Degradación honesta (CLAUDE.md): si la
 * cotización no está disponible se marca; si no hay empresas, empty-state
 * honesto; nunca se inventan valores. Cero emojis · Unicode (⇡ ⇣ →).
 */
import { useEffect, useState } from 'react'

const ACCENT = '#0EA5E9'

export interface TurismoEmpresaQuote {
  price: number | null
  change_percent: number | null
  available: boolean
}

export interface TurismoEmpresa {
  slug: string
  nombre: string
  ticker: string
  segmento: string
  quote: TurismoEmpresaQuote
}

interface TurismoEmpresasResponse {
  ok: boolean
  // El endpoint sirve `empresas` en el top-level; se acepta data.empresas por robustez.
  empresas?: TurismoEmpresa[]
  data?: { empresas?: TurismoEmpresa[] } | null
}

type LoadState = 'loading' | 'ready' | 'error'

export function TurismoEmpresasPanel() {
  const [empresas, setEmpresas] = useState<TurismoEmpresa[]>([])
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const r = await fetch('/api/turismo/empresas', { cache: 'no-store' })
        const j: TurismoEmpresasResponse = await r.json()
        if (!alive) return
        // El endpoint devuelve `empresas` en el top-level (con ok/fetched_at);
        // se acepta data.empresas por robustez. Degradacion honesta si falta.
        const lista = j?.empresas ?? j?.data?.empresas
        setEmpresas(Array.isArray(lista) ? lista : [])
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

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: '-0.013em',
              color: '#1d1d1f',
            }}
          >
            Empresas cotizadas del sector
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            {state === 'ready' && empresas.length > 0
              ? `${empresas.length} compañías · aerolíneas · hoteles · OTAs · infraestructura`
              : 'Aerolíneas · hoteles · OTAs · infraestructura aeroportuaria'}
          </p>
        </div>
        <a
          href="https://finnhub.io"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none' }}
        >
          Finnhub · tiempo real
        </a>
      </header>

      {state === 'loading' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 110, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12 }} />
          ))}
        </div>
      ) : state === 'error' ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No se pudo cargar el listado de empresas en este momento. La fuente de cotización (Finnhub) puede estar
          limitada; reintenta más tarde.
        </p>
      ) : empresas.length === 0 ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          Aún no hay empresas cotizadas disponibles para el sector turismo.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {empresas.map((e) => (
            <TurismoEmpresaCard key={e.slug} empresa={e} />
          ))}
        </div>
      )}
    </section>
  )
}

function TurismoEmpresaCard({ empresa }: { empresa: TurismoEmpresa }) {
  const q = empresa.quote
  const hasQuote = !!q?.available && q.price != null
  const chg = q?.change_percent ?? null
  const varColor = chg == null ? '#9CA3AF' : chg >= 0 ? '#16A34A' : '#DC2626'

  return (
    <div
      style={{
        padding: 14,
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        borderLeft: `4px solid ${ACCENT}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header · nombre + ticker */}
      <div style={{ marginBottom: 6, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#1d1d1f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {empresa.nombre}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{empresa.ticker || '—'}</span>
        </p>
      </div>

      {/* Cotización */}
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
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
              {q.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
            </span>
            {chg != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: varColor }}>
                {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
              </span>
            )}
          </>
        ) : (
          <span
            style={{ fontSize: 11, color: '#9CA3AF' }}
            title={
              empresa.ticker
                ? 'Sin cotización (rate-limit o ticker no soportado en free tier)'
                : 'Empresa privada · no cotiza en bolsa'
            }
          >
            {empresa.ticker ? '— sin cotización' : '— no cotiza (privada)'}
          </span>
        )}
      </div>

      {/* Segmento */}
      {empresa.segmento && (
        <div style={{ marginTop: 'auto' }}>
          <span
            style={{
              fontSize: 9,
              padding: '2px 7px',
              borderRadius: 999,
              background: `${ACCENT}14`,
              color: ACCENT,
              fontWeight: 700,
            }}
          >
            {empresa.segmento}
          </span>
        </div>
      )}
    </div>
  )
}

export default TurismoEmpresasPanel
