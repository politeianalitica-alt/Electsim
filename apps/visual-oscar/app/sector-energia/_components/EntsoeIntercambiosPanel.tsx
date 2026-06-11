'use client'
/**
 * <EntsoeIntercambiosPanel /> · Sprint Energía · datos ENTSO-E extendidos
 *
 * Intercambios comerciales programados day-ahead (documentType A09 ·
 * contract_MarketAgreement.type A05) entre España y sus interconexiones (FR, PT),
 * vía ENTSO-E Transparency Platform. Para cada frontera se piden los dos sentidos
 * (ES→vecino y vecino→ES), se calcula el saldo neto MWh y se determina la
 * dirección dominante; mini-barras divergentes muestran el balance por frontera.
 *
 * Datos vía proxy:
 *   - GET /api/entsoe/intercambios-programados?from=ES&to=FR&days=2
 *   - GET /api/entsoe/intercambios-programados?from=FR&to=ES&days=2
 *   - (ídem ES↔PT)
 * Envelope estándar Politeia { ok, data, error, fetched_at, source_url }.
 * Cada respuesta es EntsoeScheduledExchanges { from, to, points, total_mwh }.
 *
 * Degradación honesta: si ENTSOE_SECURITY_TOKEN no está, los endpoints devuelven
 * ok:false y el panel muestra un aviso discreto. Las fronteras sin datos se
 * omiten; nunca se inventan flujos. Cero deps · SVG/CSS inline. Cero emojis.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const ACCENT = '#16A34A' // verde energía
const PUBLIC_URL = 'https://transparency.entsoe.eu'

const EXPORT_COLOR = '#16A34A' // ES exporta neto
const IMPORT_COLOR = '#DC2626' // ES importa neto

/** Fronteras de interés para España (interconexiones físicas). */
const BORDERS: Array<{ neighbor: string; label: string }> = [
  { neighbor: 'FR', label: 'España ↔ Francia' },
  { neighbor: 'PT', label: 'España ↔ Portugal' },
]

interface ScheduledExchanges {
  from: string
  to: string
  points: Array<{ position: number; value: number; timestamp: string }>
  total_mwh: number
}
interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at?: string
  source_url?: string
}

/** Balance calculado de una frontera ES↔vecino. */
interface BorderBalance {
  neighbor: string
  label: string
  /** MWh programados ES → vecino (export). */
  esToNeighbor: number
  /** MWh programados vecino → ES (import). */
  neighborToEs: number
  /** Saldo neto MWh (export - import). Positivo = ES exporta neto. */
  net: number
  /** Dirección dominante legible. */
  direction: string
}

function fmtMwh(v: number): string {
  return Math.abs(v).toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

export function EntsoeIntercambiosPanel() {
  const [balances, setBalances] = useState<BorderBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    const get = (from: string, to: string) =>
      fetch(`/api/entsoe/intercambios-programados?from=${from}&to=${to}&days=2`, { cache: 'force-cache' })
        .then((r) => r.json() as Promise<Envelope<ScheduledExchanges>>)
        .catch(() => ({ ok: false, data: null, error: 'network' }) as Envelope<ScheduledExchanges>)

    // Dos sentidos por frontera: ES→vecino (export) y vecino→ES (import).
    const reqs = BORDERS.flatMap((b) => [
      get('ES', b.neighbor).then((env) => ({ neighbor: b.neighbor, dir: 'out' as const, env })),
      get(b.neighbor, 'ES').then((env) => ({ neighbor: b.neighbor, dir: 'in' as const, env })),
    ])

    Promise.all(reqs)
      .then((results) => {
        if (!alive) return
        const out: BorderBalance[] = []
        let anyError: string | null = null
        for (const b of BORDERS) {
          const exportRes = results.find((r) => r.neighbor === b.neighbor && r.dir === 'out')
          const importRes = results.find((r) => r.neighbor === b.neighbor && r.dir === 'in')
          const exportOk = exportRes?.env.ok && exportRes.env.data
          const importOk = importRes?.env.ok && importRes.env.data
          if (!exportOk && !importOk) {
            anyError =
              anyError || exportRes?.env.error || importRes?.env.error || 'sin_datos'
            continue
          }
          const esToNeighbor = exportOk ? exportRes!.env.data!.total_mwh : 0
          const neighborToEs = importOk ? importRes!.env.data!.total_mwh : 0
          const net = esToNeighbor - neighborToEs
          const direction =
            net > 0 ? `España → ${b.neighbor}` : net < 0 ? `${b.neighbor} → España` : 'Equilibrado'
          out.push({ neighbor: b.neighbor, label: b.label, esToNeighbor, neighborToEs, net, direction })
        }
        setBalances(out)
        if (out.length === 0) setError(anyError || 'sin_datos')
      })
      .catch(() => alive && setError('network'))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [])

  /** Escala común para las mini-barras (máximo absoluto de cualquier sentido). */
  const maxSide = useMemo(() => {
    let m = 1
    for (const b of balances) m = Math.max(m, b.esToNeighbor, b.neighborToEs)
    return m
  }, [balances])

  const hasData = balances.length > 0

  return (
    <Panel
      title="Intercambios comerciales programados (ENTSO-E)"
      subtitle="Programa day-ahead (A09 · A05) por frontera · 48h · cache 1h"
      sourceUrl={PUBLIC_URL}
      sourceLabel="ENTSO-E"
      sourceTooltip="Abrir ENTSO-E Transparency Platform"
    >
      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando intercambios programados…</p>
      )}

      {!loading && !hasData && (
        <div
          style={{
            padding: 12,
            background: '#fef9e7',
            border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 11,
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          <strong>Intercambios programados ENTSO-E no disponibles.</strong>{' '}
          {error && error.startsWith('token_missing')
            ? 'Requiere el Web API Security Token de ENTSO-E.'
            : 'La fuente no devolvió programa de intercambios para estas fronteras ahora mismo.'}{' '}
          Consulta el visor oficial:{' '}
          <a
            href={PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}
          >
            transparency.entsoe.eu ↗
          </a>
        </div>
      )}

      {!loading && hasData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {balances.map((b) => {
            const exporting = b.net >= 0
            const netColor = exporting ? EXPORT_COLOR : IMPORT_COLOR
            const exportPct = (b.esToNeighbor / maxSide) * 100
            const importPct = (b.neighborToEs / maxSide) * 100
            return (
              <div
                key={b.neighbor}
                style={{ background: '#F6FBF7', borderRadius: 8, padding: '10px 12px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{b.label}</span>
                  <span style={{ fontSize: 11, color: netColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    Saldo neto {fmtMwh(b.net)} MWh · {b.direction}
                  </span>
                </div>

                {/* Mini-barras divergentes: export (ES→vecino) y import (vecino→ES). */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <BarRow
                    caption={`ES → ${b.neighbor}`}
                    value={b.esToNeighbor}
                    pct={exportPct}
                    color={EXPORT_COLOR}
                  />
                  <BarRow
                    caption={`${b.neighbor} → ES`}
                    value={b.neighborToEs}
                    pct={importPct}
                    color={IMPORT_COLOR}
                  />
                </div>
              </div>
            )
          })}
          <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>
            Programa comercial day-ahead (no flujo físico) · barras proporcionales al máximo entre sentidos.
          </p>
        </div>
      )}
    </Panel>
  )
}

function BarRow({
  caption,
  value,
  pct,
  color,
}: {
  caption: string
  value: number
  pct: number
  color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
        <span style={{ color: '#475569' }}>{caption}</span>
        <span style={{ color: '#1d1d1f', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {fmtMwh(value)} MWh
        </span>
      </div>
      <div style={{ height: 7, background: '#E6F3EA', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  )
}

export default EntsoeIntercambiosPanel
