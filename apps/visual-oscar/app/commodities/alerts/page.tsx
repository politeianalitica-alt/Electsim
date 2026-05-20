'use client'
/**
 * /commodities/alerts · Alertas de precios
 *
 * Sprint 7: persistencia localStorage (preparado para BD vía endpoint
 * /api/v1/commodities/alerts cuando se monte la migración).
 */
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommodityCatalog, useCommoditySnapshot } from '@/hooks/useCommodities'
import { useCommodityAlerts, type AlertKind } from '@/hooks/useCommodityAlerts'
import { fmtPct, fmtPrice } from '@/lib/commodities-utils'

export default function AlertsPage() {
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const initialSlug = search?.get('slug') ?? null
  const { items: catalog } = useCommodityCatalog()
  const { items: snapshots } = useCommoditySnapshot(undefined, 40)
  const { alerts, add, remove, toggleActive } = useCommodityAlerts()

  const [slug, setSlug] = useState<string>(initialSlug ?? '')
  const [kind, setKind] = useState<AlertKind>('price_above')
  const [threshold, setThreshold] = useState<string>('')
  const [periodDays, setPeriodDays] = useState<string>('7')
  const [channels, setChannels] = useState<('inapp' | 'email' | 'push')[]>(['inapp'])

  useEffect(() => {
    if (!slug && catalog.length > 0) setSlug(catalog[0].slug)
  }, [slug, catalog])

  const snapshotMap = new Map(snapshots.map((s) => [s.slug, s]))

  const submit = () => {
    const n = Number(threshold)
    if (!slug || Number.isNaN(n)) return
    add({
      slug,
      kind,
      threshold: n,
      period_days: kind === 'change_pct' ? Number(periodDays) || 7 : undefined,
      channels,
      active: true,
    })
    setThreshold('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Alertas de precios
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Configura umbrales por commodity. Las alertas se evalúan contra el snapshot
          live cada vez que esta página se recarga (Sprint 7 stub · backend cron pendiente).
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
            gap: 16,
          }}
        >
          {/* Builder */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
              alignSelf: 'start',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
              Crear alerta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Commodity">
                <select
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  style={inputStyle}
                >
                  {catalog.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Condición">
                <select value={kind} onChange={(e) => setKind(e.target.value as AlertKind)} style={inputStyle}>
                  <option value="price_above">Precio supera…</option>
                  <option value="price_below">Precio cae bajo…</option>
                  <option value="change_pct">Variación % en N días</option>
                </select>
              </Field>

              <Field label={kind === 'change_pct' ? 'Umbral % (puede ser negativo)' : 'Umbral precio'}>
                <input
                  type="number"
                  value={threshold}
                  step="0.01"
                  onChange={(e) => setThreshold(e.target.value)}
                  style={inputStyle}
                  placeholder={kind === 'change_pct' ? 'ej. 5 ó -5' : 'ej. 220'}
                />
              </Field>

              {kind === 'change_pct' ? (
                <Field label="Ventana (días)">
                  <input
                    type="number"
                    value={periodDays}
                    onChange={(e) => setPeriodDays(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
              ) : null}

              <Field label="Canales">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(['inapp', 'email', 'push'] as const).map((c) => (
                    <label key={c} style={{ display: 'flex', gap: 4, fontSize: 12, color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={channels.includes(c)}
                        onChange={(e) =>
                          setChannels((prev) =>
                            e.target.checked ? [...prev, c] : prev.filter((x) => x !== c),
                          )
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </Field>

              <button
                onClick={submit}
                disabled={!slug || !threshold}
                style={{
                  marginTop: 6,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  background: !slug || !threshold ? '#9ca3af' : '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !slug || !threshold ? 'not-allowed' : 'pointer',
                }}
              >
                + Crear alerta
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
              Preview: <br />
              {slug && threshold ? renderPreview(slug, kind, Number(threshold), periodDays) : '—'}
            </p>
          </div>

          {/* Listado */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
              Alertas activas ({alerts.filter((a) => a.active).length} de {alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                Aún no has creado alertas.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={th}>Commodity</th>
                    <th style={th}>Condición</th>
                    <th style={th}>Umbral</th>
                    <th style={th}>Precio actual</th>
                    <th style={th}>Estado</th>
                    <th style={th}>Canales</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => {
                    const snap = snapshotMap.get(a.slug)
                    const triggered = evaluateAlert(a, snap?.last_price ?? null, snap?.change_pct ?? null)
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>
                          <Link href={`/commodities/${a.slug}`} style={{ color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
                            {a.slug}
                          </Link>
                        </td>
                        <td style={td}>{labelKind(a.kind, a.period_days)}</td>
                        <td style={td}>
                          {a.kind === 'change_pct' ? fmtPct(a.threshold) : fmtPrice(a.threshold)}
                        </td>
                        <td style={td}>
                          {a.kind === 'change_pct'
                            ? fmtPct(snap?.change_pct)
                            : fmtPrice(snap?.last_price)}
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: triggered ? '#dc2626' : a.active ? '#16a34a' : '#9ca3af' }}>
                          {triggered ? '⚠ DISPARADA' : a.active ? 'Activa' : 'Pausada'}
                        </td>
                        <td style={td}>{a.channels.join(', ')}</td>
                        <td style={td}>
                          <button
                            onClick={() => toggleActive(a.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 10,
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 4,
                              cursor: 'pointer',
                              marginRight: 4,
                            }}
                          >
                            {a.active ? '❚❚' : '▶'}
                          </button>
                          <button
                            onClick={() => remove(a.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 10,
                              background: '#fff',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              cursor: 'pointer',
                              color: '#dc2626',
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

function labelKind(k: AlertKind, period?: number): string {
  if (k === 'price_above') return 'Precio >'
  if (k === 'price_below') return 'Precio <'
  return `Δ% en ${period ?? 7}d`
}

function renderPreview(slug: string, kind: AlertKind, threshold: number, period: string): string {
  if (kind === 'price_above') return `Alerta cuando ${slug} supere ${threshold}`
  if (kind === 'price_below') return `Alerta cuando ${slug} caiga bajo ${threshold}`
  return `Alerta cuando ${slug} varíe ${threshold}% o más en ${period}d`
}

function evaluateAlert(
  a: { kind: AlertKind; threshold: number },
  last_price: number | null,
  change_pct: number | null,
): boolean {
  if (a.kind === 'price_above' && last_price != null) return last_price > a.threshold
  if (a.kind === 'price_below' && last_price != null) return last_price < a.threshold
  if (a.kind === 'change_pct' && change_pct != null) {
    return a.threshold >= 0 ? change_pct >= a.threshold : change_pct <= a.threshold
  }
  return false
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#fff',
  width: '100%',
}
const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#374151', fontWeight: 700, fontSize: 11 }
const td: React.CSSProperties = { padding: '8px 10px', color: '#374151' }
