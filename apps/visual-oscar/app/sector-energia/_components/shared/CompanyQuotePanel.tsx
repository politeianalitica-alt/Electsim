'use client'
/**
 * <CompanyQuotePanel /> · Primitiva compartida · Energía v3 · Sprint E1
 *
 * UNA sola implementación del bloque "empresas + cotización" que antes estaba
 * duplicado en las 6 vistas por tipo de energía (EmpresasGas, EmpresasNuclear,
 * EmpresasPetroleo, EmpresasH2, EmpresasRenovables + EmpresasGrid del Eléctrico).
 *
 * Filtra el catálogo curado `EMPRESAS_ENERGIA` (lib/energia/catalog.ts) por el
 * campo `energias` (p.ej. `['gas']`), obtiene la cotización por el MISMO
 * mecanismo que usaban las vistas — `GET /api/finnhub/quote/{ticker}` por
 * empresa, en paralelo — y renderiza un grid de <EnergyCompanyCard />.
 *
 * Shape de cotización consumido (`/api/finnhub/quote/{ticker}` ·
 * app/api/finnhub/[...path]/route.ts):
 *   OK        → { ok: true,  symbol, price, change_percent, change, high, low,
 *                 open, previous_close, ... }
 *   degradado → { ok: false, symbol, data_quality }   (rate-limit / sin ticker
 *                 soportado / FINNHUB_API_KEY ausente)
 * Se mapea a `EnergyCompanyQuote` (lib/energia/types.ts) → `EnergyCompanyCard`.
 *
 * Degradación honesta (CLAUDE.md): empresas privadas (sin ticker) o sin dato →
 * `quote.available = false`, la card lo marca ("no cotiza" / "sin cotización").
 * Si NINGUNA empresa coincide con el filtro → empty-state honesto (no se
 * renderiza maquinaria vacía). Cero emojis · Unicode geométrico.
 */
import { useEffect, useMemo, useState } from 'react'
import { EMPRESAS_ENERGIA } from '@/lib/energia/catalog'
import type {
  EnergyCompany,
  EnergyCompanyListItem,
  EnergyCompanyQuote,
} from '@/lib/energia/types'
import { EnergyCompanyCard } from '../EnergyCompanyCard'

const ACCENT = '#16A34A'

interface CompanyQuotePanelProps {
  /**
   * Tipos de energía a incluir (valores EXACTOS del campo `energias` del
   * catálogo: 'electrico' | 'renovables' | 'nuclear' | 'petroleo' | 'gas' |
   * 'hidrogeno'). Una empresa se incluye si opera en ALGUNO de ellos. Si se
   * omite, se muestran todas.
   */
  energias?: string[]
  /** Título del panel · default 'Empresas del sector'. */
  title?: string
  /** Subtítulo opcional bajo el título. */
  subtitle?: string
  /** Máximo de empresas a mostrar (las primeras del catálogo). */
  max?: number
  /** Variante compacta (cards algo más densas en el grid). */
  compact?: boolean
}

/** Cotización "no disponible" — patrón degradación (mismo que companies.ts). */
function emptyQuote(): EnergyCompanyQuote {
  return {
    price: null,
    change: null,
    change_percent: null,
    high: null,
    low: null,
    open: null,
    previous_close: null,
    available: false,
  }
}

/** Cotización por ticker vía el proxy Finnhub. NUNCA lanza. */
async function fetchQuote(ticker: string | null): Promise<EnergyCompanyQuote | null> {
  if (!ticker) return null // empresa privada / sin ticker
  try {
    const r = await fetch(`/api/finnhub/quote/${encodeURIComponent(ticker)}`, { cache: 'no-store' })
    const j: { ok?: boolean; price?: number | null; change_percent?: number | null } = await r.json()
    if (j?.ok && j.price != null) {
      return {
        ...emptyQuote(),
        price: j.price,
        change_percent: j.change_percent ?? null,
        available: true,
      }
    }
  } catch {
    /* degradación silenciosa */
  }
  return emptyQuote()
}

export function CompanyQuotePanel({
  energias,
  title = 'Empresas del sector',
  subtitle,
  max,
  compact = false,
}: CompanyQuotePanelProps) {
  // Filtrado del catálogo · memoizado (estable mientras no cambien los filtros).
  const companies = useMemo<EnergyCompany[]>(() => {
    let list = EMPRESAS_ENERGIA.slice()
    if (energias && energias.length > 0) {
      list = list.filter((c) => c.energias.some((e) => energias.includes(e)))
    }
    if (max != null) list = list.slice(0, max)
    return list
    // EMPRESAS_ENERGIA es un módulo constante; energias se compara por contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energias?.join('|'), max])

  const [quotes, setQuotes] = useState<Record<string, EnergyCompanyQuote | null> | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const entries = await Promise.all(
        companies.map(async (c): Promise<[string, EnergyCompanyQuote | null]> => [
          c.slug,
          await fetchQuote(c.ticker || null),
        ]),
      )
      if (alive) setQuotes(Object.fromEntries(entries))
    }
    if (companies.length > 0) load()
    return () => {
      alive = false
    }
  }, [companies])

  // Empresas + cotización para las cards. Mientras carga, quote=null → la card
  // muestra el estado neutro; al resolver, la cotización real o el empty.
  const items = useMemo<EnergyCompanyListItem[]>(
    () => companies.map((c) => ({ ...c, quote: quotes?.[c.slug] ?? null })),
    [companies, quotes],
  )

  const minCard = compact ? 220 : 240

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
            {title}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            {subtitle ?? `${companies.length} compañías del catálogo · cotización en vivo`}
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

      {companies.length === 0 ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No hay empresas del catálogo para este filtro.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCard}px, 1fr))`, gap: 10 }}>
          {quotes == null
            ? companies.map((c) => (
                <div
                  key={c.slug}
                  style={{ height: 168, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12 }}
                />
              ))
            : items.map((c) => <EnergyCompanyCard key={c.slug} company={c} />)}
        </div>
      )}
    </section>
  )
}

export default CompanyQuotePanel
