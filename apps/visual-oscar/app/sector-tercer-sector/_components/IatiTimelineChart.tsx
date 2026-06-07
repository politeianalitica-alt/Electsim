'use client'
/**
 * <IatiTimelineChart /> · Tercer Sector v3 · Sprint TS5
 *
 * Serie temporal de DESEMBOLSOS (transaction_type 3) declarados a IATI por las
 * ONGD españolas, en EUR comparables. Llama a
 * `/api/tercer-sector/iati/transacciones` y reacciona a los filtros activos de
 * la vista (org reportante / país receptor). El backend agrega por año.
 *
 * REQUIERE IATI_API_KEY (Datastore). Sin key el endpoint devuelve
 * `{ ok:false, error:'no_key' }`: aquí se muestra una nota honesta en vez de un
 * gráfico vacío. Cero emojis · es-ES.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { IatiTransactionsData } from '@/lib/tercer-sector/iati-types'
import {
  ACCENT,
  ACCENT_DARK,
  CoopEmpty,
  CoopSkeleton,
  fmtEur,
  fmtEurFull,
  fmtInt,
  getEnvelope,
} from './CoopShared'

interface IatiTimelineChartProps {
  /** Org reportante (iati-identifier) para acotar; null = ONGD ES curadas. */
  reportingOrg?: string | null
  /** País receptor (ISO-2) para acotar. */
  recipientCountry?: string | null
}

export function IatiTimelineChart({ reportingOrg, recipientCountry }: IatiTimelineChartProps) {
  const [data, setData] = useState<IatiTransactionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setErr(null)
    setNoKey(false)
    const params = new URLSearchParams({ granularity: 'year', type_code: '3', rows: '1000' })
    if (reportingOrg) params.set('reporting_org', reportingOrg)
    if (recipientCountry) params.set('recipient_country', recipientCountry)
    getEnvelope<IatiTransactionsData>(`/api/tercer-sector/iati/transacciones?${params.toString()}`, ctrl.signal).then((env) => {
      if (ctrl.signal.aborted) return
      if (env.ok && env.data) {
        setData(env.data)
      } else {
        setData(null)
        if ((env.error ?? '').startsWith('no_key')) setNoKey(true)
        else if (env.error && env.error !== 'aborted') setErr(env.error)
      }
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [reportingOrg, recipientCountry])

  const rows = useMemo(
    () =>
      (data?.timeline ?? [])
        .filter((b) => b.period)
        .map((b) => ({ period: b.period, value: b.value_eur, count: b.count })),
    [data],
  )

  if (loading) return <CoopSkeleton height={240} />

  if (noKey) {
    return (
      <CoopEmpty>
        La serie de desembolsos requiere el IATI Datastore.{' '}
        <strong style={{ color: '#B45309' }}>Configura IATI_API_KEY</strong> para ver el importe desembolsado por año.
        <br />
        <a href="https://developer.iatistandard.org/" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT_DARK, fontWeight: 700 }}>
          Registro gratuito (tier Exploratory) →
        </a>
      </CoopEmpty>
    )
  }
  if (err) return <CoopEmpty>No se pudieron cargar los desembolsos ({err}).</CoopEmpty>
  if (rows.length === 0) {
    return <CoopEmpty>Sin desembolsos en EUR para el filtro actual. El timeline agrega solo valores en EUR (no se inventa FX).</CoopEmpty>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 8, flexWrap: 'wrap' }}>
        <Metric label="Total desembolsado (filtro)" value={fmtEur(data?.total_value_eur)} />
        <Metric label="Transacciones encontradas" value={fmtInt(data?.total_found)} />
        <Metric label="Periodos" value={fmtInt(rows.length)} />
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="coopDisb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis
              tick={{ fontSize: 10.5, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => fmtEur(v)}
            />
            <Tooltip
              formatter={(v: number, _name, item) => {
                const count = (item?.payload as { count?: number } | undefined)?.count
                return [`${fmtEurFull(v)}${count != null ? ` · ${fmtInt(count)} transacciones` : ''}`, 'Desembolsado']
              }}
              labelStyle={{ fontWeight: 700, color: '#0F172A' }}
              contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="value" stroke={ACCENT_DARK} strokeWidth={2} fill="url(#coopDisb)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: ACCENT_DARK, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  )
}

export default IatiTimelineChart
