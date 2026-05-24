'use client'
/**
 * `<EmpresasEnrichmentBlock />` · Sprint N15.
 *
 * Renderizado condicional solo en `empresas-beneficios`. Aporta:
 *  - CNMV hechos relevantes recientes (top 8 últimos del mes)
 *  - Earnings calendar Finnhub próximos 14 días
 *  - Vínculo a página dedicada por empresa
 *
 * Cumple petición del usuario: "más información de empresas españolas
 * directamente o indirectamente en el detalle". El IBEX sector breakdown
 * ya se sustituyó por grid de empresas individuales (Sprint N14).
 */
import { useEffect, useState } from 'react'

interface CnmvItem {
  fecha?: string
  date?: string
  emisor?: string
  company?: string
  asunto?: string
  title?: string
  url?: string
  link?: string
}
interface CnmvResp { ok: boolean; items?: CnmvItem[]; n_items?: number }

interface EarningsItem {
  symbol: string
  date: string
  hour?: string
  epsEstimate?: number | null
  epsActual?: number | null
  revenueEstimate?: number | null
  revenueActual?: number | null
}
interface EarningsResp { ok: boolean; items?: EarningsItem[]; earningsCalendar?: EarningsItem[] }

export function EmpresasEnrichmentBlock({ accent }: { accent: string }) {
  const [cnmv, setCnmv] = useState<CnmvResp | null>(null)
  const [earnings, setEarnings] = useState<EarningsResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/cnmv/hechos-relevantes?limit=8', { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j: CnmvResp) => { if (alive && j.ok) setCnmv(j) })
        .catch(() => {}),
      fetch('/api/finnhub/earnings', { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j: EarningsResp) => { if (alive && j.ok) setEarnings(j) })
        .catch(() => {}),
    ]).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando CNMV + earnings…</p>
      </section>
    )
  }

  const cnmvItems = cnmv?.items?.slice(0, 8) || []
  const earningsItems = (earnings?.items || earnings?.earningsCalendar || []).slice(0, 8)
  if (cnmvItems.length === 0 && earningsItems.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
          Eventos corporativos · CNMV + earnings calendar
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Hechos relevantes oficiales registrados en CNMV + calendario próximos earnings IBEX y peers vía Finnhub.
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
        {cnmvItems.length > 0 && (
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              CNMV · {cnmvItems.length} hechos relevantes recientes
            </p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cnmvItems.map((it, i) => {
                const company = it.emisor || it.company || ''
                const title = it.asunto || it.title || '(sin asunto)'
                const date = (it.fecha || it.date || '').slice(0, 10)
                const url = it.url || it.link || '#'
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', padding: '6px 8px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 4, textDecoration: 'none', color: '#0f172a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10 }}>
                      <span style={{ fontWeight: 700, color: '#7c3aed' }}>{company}</span>
                      <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{date}</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#334155', lineHeight: 1.35 }}>{title}</p>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        {earningsItems.length > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#1e40af', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Próximos earnings · {earningsItems.length} compañías (14d)
            </p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {earningsItems.map((it, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: '#1e40af', fontWeight: 700 }}>{it.symbol}</span>
                  <span style={{ color: '#475569' }}>{it.date}{it.hour ? ` · ${it.hour}` : ''}</span>
                  {typeof it.epsEstimate === 'number' && (
                    <span style={{ fontSize: 10, color: '#64748b' }}>EPS est. {it.epsEstimate.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default EmpresasEnrichmentBlock
