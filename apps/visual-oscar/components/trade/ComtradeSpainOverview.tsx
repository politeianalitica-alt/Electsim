'use client'
/**
 * `<ComtradeSpainOverview />` · snapshot oficial de comercio exterior
 * España vía UN Comtrade (estadísticas declaradas por España a la ONU).
 *
 * Reutilizable en:
 *   - /dashboard · widget compact con exports/imports/balance + top partners
 *   - /macro · vista completa con top productos + comparativas
 *
 * Datos via /api/comtrade/spain-overview · cache 24h.
 * Empty state si COMTRADE_API_KEY no funciona.
 */
import { useEffect, useState } from 'react'

interface PartnerRow {
  partner: string
  partner_iso?: number | string
  partner_alpha?: string
  value_usd: number
  value_fmt: string
}
interface ChapterRow {
  hs2: string
  hs2_desc?: string
  value_usd: number
  value_fmt: string
}
interface ComtradeData {
  ok: boolean
  year?: number
  data_quality?: { source_type: string; source_name: string; note?: string }
  totals?: {
    exports_usd: number
    exports_usd_fmt: string
    imports_usd: number
    imports_usd_fmt: string
    balance_usd: number
    balance_usd_fmt: string
  }
  top_export_partners?: PartnerRow[]
  top_import_partners?: PartnerRow[]
  top_export_chapters?: ChapterRow[]
  top_import_chapters?: ChapterRow[]
}

const ACCENT = '#1d4ed8' // azul comercio oficial

export function ComtradeSpainOverview({
  year,
  compact = false,
}: {
  year?: number
  compact?: boolean
}) {
  const [data, setData] = useState<ComtradeData | null>(null)
  const [loading, setLoading] = useState(true)
  const targetYear = year ?? new Date().getFullYear() - 1

  useEffect(() => {
    let alive = true
    fetch(`/api/comtrade/spain-overview?year=${targetYear}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: ComtradeData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [targetYear])

  const isLive = data?.data_quality?.source_type === 'live'
  const t = data?.totals
  const topPartners = (data?.top_export_partners || []).slice(0, compact ? 5 : 10)
  const topImports = (data?.top_import_partners || []).slice(0, compact ? 5 : 10)
  const topExpChapters = (data?.top_export_chapters || []).slice(0, compact ? 5 : 10)
  const topImpChapters = (data?.top_import_chapters || []).slice(0, compact ? 5 : 10)

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
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            UN COMTRADE · COMERCIO EXTERIOR ESPAÑA · {data?.year ?? targetYear}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Datos oficiales declarados por España a la ONU · HS2/HS6 · cache 24h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · oficial ONU
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            Comtrade no disponible
          </span>
        )}
      </header>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando Comtrade…</p>
      )}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>UN Comtrade no responde</strong> · {data?.data_quality?.note ?? 'sin datos'}.
          <br />
          Verifica <code>COMTRADE_API_KEY</code> ·{' '}
          <a href="https://comtradedeveloper.un.org/" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            comtradedeveloper.un.org →
          </a>
        </div>
      )}

      {!loading && isLive && t && (
        <>
          {/* KPIs principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ background: '#eff6ff', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>EXPORTS</p>
              <p style={{ fontSize: 20, color: ACCENT, fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                ${t.exports_usd_fmt}
              </p>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>IMPORTS</p>
              <p style={{ fontSize: 20, color: '#991b1b', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                ${t.imports_usd_fmt}
              </p>
            </div>
            <div style={{
              background: t.balance_usd >= 0 ? '#f0fdf4' : '#fef2f2',
              borderRadius: 6, padding: 10,
            }}>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>BALANCE</p>
              <p style={{
                fontSize: 20,
                color: t.balance_usd >= 0 ? '#166534' : '#991b1b',
                fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums',
              }}>
                {t.balance_usd >= 0 ? '+' : ''}${t.balance_usd_fmt}
              </p>
            </div>
          </div>

          {/* Top partners */}
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                TOP DESTINOS EXPORT
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                {topPartners.map((p, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {i + 1}. {p.partner}
                    </span>
                    <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      ${p.value_fmt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                TOP ORÍGENES IMPORT
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                {topImports.map((p, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {i + 1}. {p.partner}
                    </span>
                    <span style={{ color: '#991b1b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      ${p.value_fmt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Top chapters */}
          {!compact && (topExpChapters.length > 0 || topImpChapters.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                  TOP CAPÍTULOS EXPORT (HS2)
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
                  {topExpChapters.map((c, i) => (
                    <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {c.hs2} · {c.hs2_desc?.slice(0, 50)}
                        </span>
                        <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          ${c.value_fmt}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                  TOP CAPÍTULOS IMPORT (HS2)
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
                  {topImpChapters.map((c, i) => (
                    <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {c.hs2} · {c.hs2_desc?.slice(0, 50)}
                        </span>
                        <span style={{ color: '#991b1b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          ${c.value_fmt}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · UN Comtrade ·{' '}
        <a href="https://comtradeplus.un.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          comtradeplus.un.org →
        </a>
      </p>
    </section>
  )
}

export default ComtradeSpainOverview
