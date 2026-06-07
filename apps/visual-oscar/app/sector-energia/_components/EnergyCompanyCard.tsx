'use client'
/**
 * <EnergyCompanyCard /> · Sprint Energía S9
 *
 * Card de empresa energética para el grid `/sector-energia/empresas`. Muestra
 * nombre, ticker + bolsa, cotización + variación (Finnhub), país, segmentos y
 * los tipos de energía en que opera (tags). Enlaza a la ficha drill-down.
 *
 * Cotización: si la empresa es privada (sin ticker) o Finnhub degrada, se marca
 * honestamente ("no cotiza" / "sin cotización") · CLAUDE.md. Cero emojis ·
 * Unicode (⇡ ⇣ →).
 */
import Link from 'next/link'
import type { EnergyCompanyListItem, EnergiaTipo } from '@/lib/energia/types'

const ACCENT = '#16A34A'

/** Etiquetas legibles de los tipos de energía para los tags. */
const ENERGIA_LABEL: Record<EnergiaTipo, string> = {
  global: 'Global',
  electrico: 'Eléctrico',
  renovables: 'Renovables',
  nuclear: 'Nuclear',
  petroleo: 'Petróleo',
  gas: 'Gas',
  hidrogeno: 'Hidrógeno',
}

export function EnergyCompanyCard({ company }: { company: EnergyCompanyListItem }) {
  const q = company.quote
  const hasQuote = !!q?.available && q.price != null
  const chg = q?.change_percent ?? null
  const varColor = chg == null ? '#9CA3AF' : chg >= 0 ? ACCENT : '#DC2626'

  return (
    <Link
      href={`/sector-energia/empresas/${encodeURIComponent(company.slug)}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          padding: 14,
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 12,
          borderLeft: `4px solid ${company.es_espanola ? ACCENT : '#94A3B8'}`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header · nombre + país */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.nombre}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.ticker || '—'}</span>
              {company.exchange && <span style={{ color: '#9CA3AF' }}> · {company.exchange}</span>}
            </p>
          </div>
          <span
            style={{
              fontSize: 9.5,
              padding: '2px 7px',
              borderRadius: 4,
              background: company.es_espanola ? ACCENT : '#525258',
              color: '#fff',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {company.es_espanola ? 'ES' : company.pais}
          </span>
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
                {q!.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
              </span>
              {chg != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: varColor }}>
                  {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}%
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#9CA3AF' }} title={company.ticker ? 'Sin cotización (rate-limit o ticker no soportado en free tier)' : 'Empresa privada · no cotiza en bolsa'}>
              {company.ticker ? '— sin cotización' : '— no cotiza (privada)'}
            </span>
          )}
        </div>

        {/* Segmentos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
          {company.segmentos.slice(0, 4).map((s) => (
            <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#F5F5F7', color: '#3a3a3d' }}>
              {s}
            </span>
          ))}
        </div>

        {/* Energías (tags) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 'auto' }}>
          {company.energias.map((e) => (
            <span
              key={e}
              style={{
                fontSize: 9,
                padding: '2px 7px',
                borderRadius: 999,
                background: `${ACCENT}14`,
                color: ACCENT,
                fontWeight: 700,
              }}
            >
              {ENERGIA_LABEL[e] ?? e}
            </span>
          ))}
        </div>

        <p style={{ margin: '8px 0 0', fontSize: 10.5, color: ACCENT, fontWeight: 600 }}>Ver ficha completa →</p>
      </div>
    </Link>
  )
}

export default EnergyCompanyCard
