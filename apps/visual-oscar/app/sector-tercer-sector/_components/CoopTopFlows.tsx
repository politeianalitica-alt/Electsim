'use client'
/**
 * <CoopTopFlows /> · Tercer Sector v3 · Sprint IATI-MAX.
 *
 * Top-N flujos donante→receptor por importe EUR desembolsado. Consume el
 * endpoint `/api/tercer-sector/iati/top-flows` (Full Access) y los renderiza
 * como una mini-sankey horizontal en SVG (bandas proporcionales al importe),
 * sin librerías externas (CLAUDE.md §0.5).
 *
 * Layout:
 *   [ONGD ES] —— ancho ~ EUR —— [País receptor]
 *
 * Para mantenerlo legible limita a 20 flujos por defecto (configurable).
 * Tooltip al hover muestra importe completo y nº transacciones.
 *
 * REQUIERE IATI_API_KEY. Sin key → CoopEmpty honesto.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ACCENT,
  ACCENT_DARK,
  CoopEmpty,
  CoopSkeleton,
  GREEN_RAMP,
  fmtEur,
  fmtEurFull,
  fmtInt,
  getEnvelope,
} from './CoopShared'

interface FlowItem {
  donor_ref: string
  donor_name: string
  recipient_country_code: string
  recipient_country_name: string
  value_eur: number
  count: number
}
interface FlowsData {
  flows: FlowItem[]
  total_value_eur: number
  total_count: number
  filters: { year_from: number; year_to: number; top_n: number }
}

interface CoopTopFlowsProps {
  /** Año desde (default actual - 3). */
  yearFrom?: number
  /** Año hasta (default actual). */
  yearTo?: number
  /** Cuántos flujos pedir (default 20). */
  topN?: number
}

export function CoopTopFlows({ yearFrom, yearTo, topN = 20 }: CoopTopFlowsProps) {
  const [data, setData] = useState<FlowsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setNoKey(false)
    setErr(null)
    const params = new URLSearchParams({ top_n: String(topN) })
    if (yearFrom != null) params.set('year_from', String(yearFrom))
    if (yearTo != null) params.set('year_to', String(yearTo))
    getEnvelope<FlowsData>(`/api/tercer-sector/iati/top-flows?${params.toString()}`, ctrl.signal).then((env) => {
      if (ctrl.signal.aborted) return
      if (env.ok && env.data) setData(env.data)
      else if ((env.error ?? '').startsWith('no_key')) setNoKey(true)
      else if (env.error && env.error !== 'aborted') setErr(env.error)
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [yearFrom, yearTo, topN])

  const { flows, max } = useMemo(() => {
    const f = data?.flows ?? []
    const m = f.reduce((acc, x) => Math.max(acc, x.value_eur), 0)
    return { flows: f, max: m }
  }, [data])

  if (loading) return <CoopSkeleton height={400} />
  if (noKey) {
    return (
      <CoopEmpty>
        El ranking de flujos requiere el IATI Datastore.{' '}
        <strong style={{ color: '#B45309' }}>Configura IATI_API_KEY</strong> para ver los top donantes→receptores.
      </CoopEmpty>
    )
  }
  if (err) return <CoopEmpty>No se pudieron cargar los flujos ({err}).</CoopEmpty>
  if (flows.length === 0) return <CoopEmpty>Sin flujos EUR comparables.</CoopEmpty>

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 8px' }}>
        Top {flows.length} flujos {data?.filters.year_from}–{data?.filters.year_to} · suma{' '}
        <strong style={{ color: ACCENT_DARK }}>{fmtEur(data?.total_value_eur ?? null)}</strong> · {fmtInt(data?.total_count ?? null)} transacciones EUR
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {flows.map((f, idx) => {
          const t = max > 0 ? Math.log1p(f.value_eur) / Math.log1p(max) : 0
          const wPct = Math.max(8, Math.round(t * 100))
          const colorIdx = Math.min(GREEN_RAMP.length - 1, Math.floor(t * GREEN_RAMP.length))
          const fill = GREEN_RAMP[colorIdx]
          return (
            <div
              key={`${f.donor_ref}|${f.recipient_country_code}|${idx}`}
              title={`${f.donor_name} → ${f.recipient_country_name} · ${fmtEurFull(f.value_eur)} · ${fmtInt(f.count)} txs`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 1fr) minmax(160px, 2fr) minmax(160px, 1fr) 90px',
                gap: 8,
                alignItems: 'center',
                padding: '4px 0',
                borderTop: idx === 0 ? 'none' : '1px solid #F1F5F9',
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.donor_name}
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 16,
                  background: '#F8FAFC',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${wPct}%`,
                    background: fill,
                    borderRadius: 4,
                    transition: 'width 200ms ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: t > 0.55 ? '#fff' : ACCENT_DARK,
                    fontVariantNumeric: 'tabular-nums',
                    mixBlendMode: 'normal',
                  }}
                >
                  →
                </div>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.recipient_country_name}{' '}
                <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 10 }}>{f.recipient_country_code}</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmtEur(f.value_eur)}
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 10, color: '#94A3B8', margin: '8px 2px 0' }}>
        Anchura proporcional al log del importe (compresión visual de la cola larga). Solo se agregan transacciones EUR
        (no se convierte divisa). Cifras del Datastore IATI.
      </p>
    </div>
  )
}

export default CoopTopFlows
