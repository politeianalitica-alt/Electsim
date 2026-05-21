'use client'
/**
 * `<AcledSpainContext />` · panel ACLED de eventos en zonas geopolíticamente
 * relevantes para España (Marruecos, Argelia, Mali, Senegal, Ucrania,
 * Venezuela, Israel/Palestina, Cuba, México, etc.).
 *
 * Reutilizable en:
 *   - /dashboard · widget compacto top-10 países
 *   - /geopolitica · vista completa con eventos detallados
 *   - /crisis · matriz de riesgos por país
 *   - /sector-defensa · contexto operacional
 *
 * Datos via /api/acled/spain-context · 30 días por defecto.
 * Si ACLED no responde (auth fail, sin key), placeholder honesto.
 */
import { useEffect, useState } from 'react'

interface CountryRow { country: string; count: number; fatalities: number }
interface RecentEvent {
  date: string
  country: string
  event_type: string
  sub_event_type?: string
  location?: string
  fatalities: number
  notes: string
}
interface AcledData {
  ok: boolean
  n_events?: number
  from?: string
  to?: string
  by_country?: CountryRow[]
  recent_events?: RecentEvent[]
  data_quality?: { source_type: string; source_name: string; note?: string }
  auth_method?: string
}

const ACCENT = '#b91c1c' // rojo geopolítico/crisis

export function AcledSpainContext({
  days = 30,
  compact = false,
}: {
  days?: number
  compact?: boolean
}) {
  const [data, setData] = useState<AcledData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/acled/spain-context?days=${days}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: AcledData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [days])

  const isLive = data?.data_quality?.source_type === 'live'
  const topCountries = (data?.by_country || []).slice(0, compact ? 6 : 12)
  const recentEvents = (data?.recent_events || []).slice(0, compact ? 5 : 10)

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            ACLED · CONFLICTOS EN ENTORNO GEOPOLÍTICO ES · {days}d
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            22 países alta-relevancia España · Magreb, Sahel, Ucrania, LATAM,
            Oriente Medio · cache 1h
          </p>
        </div>
        {isLive ? (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            LIVE · {data?.n_events ?? '?'} eventos
          </span>
        ) : (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            ACLED no disponible
          </span>
        )}
      </header>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando ACLED…</p>
      )}

      {!loading && !isLive && (
        <div
          style={{
            padding: 10,
            background: '#fef9e7',
            border: '1px solid #fde68a',
            borderRadius: 6,
            fontSize: 11,
            color: '#92400e',
          }}
        >
          <strong>ACLED inactivo</strong> ·{' '}
          {data?.data_quality?.note ?? 'auth pendiente'}.
          <br/>
          La pareja email+password requiere que la cuenta tenga "API Access"
          habilitado. Si tienes API key, configurar <code>ACLED_API_KEY</code>{' '}
          (preferido sobre OAuth). Ver{' '}
          <a
            href="https://acleddata.com/access-acled-data/api-access/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, textDecoration: 'none' }}
          >
            acleddata.com/api-access →
          </a>
        </div>
      )}

      {!loading && isLive && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : '1fr 1.4fr',
            gap: 14,
          }}
        >
          {/* Top países por número de eventos */}
          <div style={{ background: '#fef2f2', borderRadius: 6, padding: 10 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                margin: '0 0 8px',
                letterSpacing: 0.6,
              }}
            >
              TOP PAÍSES POR EVENTOS
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
              {topCountries.map((c) => (
                <li
                  key={c.country}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    borderBottom: '1px solid #fee2e2',
                  }}
                >
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{c.country}</span>
                  <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    <strong style={{ color: ACCENT }}>{c.count}</strong> ev
                    {c.fatalities > 0 && (
                      <span style={{ color: '#991b1b', marginLeft: 8 }}>
                        † {c.fatalities.toLocaleString('es-ES')}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Eventos recientes */}
          {!compact && recentEvents.length > 0 && (
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  margin: '0 0 8px',
                  letterSpacing: 0.6,
                }}
              >
                EVENTOS RECIENTES
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
                {recentEvents.map((e, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '6px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {e.country} · {e.event_type}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 10, whiteSpace: 'nowrap' }}>
                        {e.date}
                      </span>
                    </div>
                    {e.notes && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          color: '#475569',
                          lineHeight: 1.4,
                        }}
                      >
                        {e.notes.slice(0, 140)}
                        {e.notes.length > 140 && '…'}
                      </p>
                    )}
                    {e.fatalities > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#991b1b',
                          fontWeight: 700,
                        }}
                      >
                        † {e.fatalities} víctimas
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · ACLED ·{' '}
        <a
          href="https://acleddata.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: ACCENT, textDecoration: 'none' }}
        >
          acleddata.com →
        </a>
      </p>
    </section>
  )
}

export default AcledSpainContext
