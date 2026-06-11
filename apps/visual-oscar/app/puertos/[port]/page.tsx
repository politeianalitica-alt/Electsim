'use client'
/**
 * /puertos/[port] · Detalle puerto.
 *
 * KPIs 24h · congestión 30d · top operadores · cargo mix · vessels en zona ·
 * calls recientes.
 */
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  usePort,
  usePortVessels,
  usePortCalls,
  usePortCongestion,
  usePortTerminals,
  usePortTraffic,
  usePortConnectivity,
} from '@/hooks/usePorts'
import { fmtNum, fmtInt } from '@/lib/ports-utils'
import { DataQualityBadge } from '@/components/ports/DataQualityBadge'

const ACCENT = '#0e7490'

export default function PortDetailPage() {
  const params = useParams<{ port: string }>()
  const router = useRouter()
  const slug = params.port

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data: port, loading: loadingPort, error } = usePort(slug)
  const { vessels, dataSource } = usePortVessels(slug, 50)
  const { calls } = usePortCalls(slug, 7, 30)
  const { data: cong } = usePortCongestion(slug, 30)
  const { items: terminals, dataQuality: termQuality } = usePortTerminals(slug)
  const { items: traffic, dataQuality: trafficQuality } = usePortTraffic(slug, 24)
  const { items: connectivity } = usePortConnectivity(slug)

  if (loadingPort) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
        <AppHeader />
        <div style={{ padding: 24, color: '#64748b' }}>Cargando puerto…</div>
      </div>
    )
  }
  if (error || !port) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
        <AppHeader />
        <div style={{ padding: 24 }}>
          <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none' }}>← Volver</Link>
          <p style={{ marginTop: 16, color: '#7f1d1d' }}>
            No se pudo cargar el puerto <code>{slug}</code>.
          </p>
        </div>
      </div>
    )
  }

  const k = port.kpis_24h ?? {
    vessels_anchored: 0,
    arrivals_24h: 0,
    congestion_pct: 0,
    avg_wait_h: null,
    teu_estimated: null,
  }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
      <AppHeader />
      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          ← Puertos & Comercio Global
        </Link>

        <header style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            PUERTO · {port.unlocode} · {port.country_iso}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {port.name} {port.data_quality && <DataQualityBadge quality={port.data_quality} />}
          </h1>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            {port.type ?? '—'} · {port.region ?? '—'} · lat {fmtNum(port.lat, 3)} / lon {fmtNum(port.lon, 3)} · datos {port.data_source ?? '—'}
          </p>
        </header>

        {/* KPIs */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          <KPI label="Buques fondeados" value={k?.vessels_anchored ?? '—'} accent={ACCENT} />
          <KPI label="Llegadas 24h" value={k?.arrivals_24h ?? '—'} accent={ACCENT} />
          <KPI label="Congestión" value={fmtNum(k?.congestion_pct, 0, '%')} accent={ACCENT} />
          <KPI label="Espera media" value={fmtNum(k?.avg_wait_h, 1, ' h')} accent={ACCENT} />
          <KPI label="TEU estimado" value={fmtInt(k?.teu_estimated)} accent={ACCENT} />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 18 }}>
          {/* Serie de congestión */}
          <Card title="Congestión (30 días)">
            {cong?.series?.length ? (
              <Sparkline series={cong.series.map((p) => p.vessels_anchored)} />
            ) : (
              <Empty>Sin serie de congestión.</Empty>
            )}
          </Card>

          {/* Top operadores */}
          <Card title="Top operadores">
            {port.top_operators?.length ? (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
                {port.top_operators.slice(0, 8).map((op) => (
                  <li
                    key={op.name}
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <span style={{ color: '#1e293b' }}>{op.name}</span>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{op.n_vessels}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Sin operadores identificados.</Empty>
            )}
          </Card>

          <Card title="Mix de carga">
            {port.cargo_mix?.length ? (
              <CargoBars items={port.cargo_mix} />
            ) : (
              <Empty>Sin mix de carga.</Empty>
            )}
          </Card>

          <Card title="Vessels en zona">
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>
              {vessels.length} buques · fuente {dataSource ?? '—'}
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
              {vessels.slice(0, 10).map((v) => (
                <li
                  key={`${v.imo}-${v.ts}`}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}
                >
                  <Link
                    href={`/puertos/vessels/${v.imo}`}
                    style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
                  >
                    {v.name ?? v.imo}
                  </Link>
                  <span style={{ color: '#64748b' }}>
                    {v.flag_iso ?? '??'} · {fmtNum(v.sog, 1, ' kn')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Sprint 2 Fase C · Terminales operativos del puerto */}
        <section style={{ marginTop: 18 }}>
          <Card title={`Terminales (${terminals.length})`}>
            {termQuality && (
              <div style={{ marginBottom: 8 }}>
                <DataQualityBadge quality={termQuality} />
              </div>
            )}
            {terminals.length === 0 ? (
              <Empty>Sin terminales catalogados para este puerto todavía.</Empty>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>Terminal</th>
                    <th style={th}>Operador</th>
                    <th style={th}>Tipo</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cap. TEU</th>
                    <th style={{ ...th, textAlign: 'right' }}>Calado</th>
                    <th style={th}>Concesión</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((t) => (
                    <tr key={t.terminal_name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{t.terminal_name}</td>
                      <td style={td}>{t.operator_name ?? '—'}</td>
                      <td style={{ ...td, color: '#64748b' }}>{t.type}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtInt(t.capacity_teu)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtNum(t.max_draft_m, 1, ' m')}</td>
                      <td style={{ ...td, color: '#64748b' }}>
                        {t.concession_end_year ? `hasta ${t.concession_end_year}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>

        {/* Sprint 2 Fase C · Tráfico mensual estimado/real */}
        <section style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card title={`Tráfico TEU (${traffic.length} meses)`}>
            {trafficQuality && (
              <div style={{ marginBottom: 8 }}>
                <DataQualityBadge quality={trafficQuality} />
              </div>
            )}
            {traffic.length > 0 ? (
              <TrafficChart series={traffic.map((r) => ({ period: r.period_ym, teu: r.teu_total ?? 0 }))} />
            ) : (
              <Empty>Sin serie de tráfico para este puerto.</Empty>
            )}
          </Card>

          <Card title={`Conectividad (${connectivity.length} partners)`}>
            {connectivity.length === 0 ? (
              <Empty>Sin conectividad catalogada todavía.</Empty>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                {connectivity.slice(0, 8).map((c) => (
                  <li
                    key={c.connected_port_slug}
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Link
                      href={`/puertos/${c.connected_port_slug}`}
                      style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {(c as any).connected_name ?? c.connected_port_slug}
                    </Link>
                    <span style={{ color: '#64748b' }}>{c.weekly_calls ?? '—'} sem.</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section style={{ marginTop: 18 }}>
          <Card title="Escalas recientes (7 días)">
            {calls.length === 0 ? (
              <Empty>Sin escalas registradas.</Empty>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>Buque</th>
                    <th style={th}>Llegada</th>
                    <th style={th}>Duración</th>
                    <th style={th}>Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.slice(0, 25).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>
                        <Link
                          href={`/puertos/vessels/${c.imo}`}
                          style={{ color: ACCENT, textDecoration: 'none' }}
                        >
                          {c.vessel_name ?? c.imo}
                        </Link>
                      </td>
                      <td style={td}>{new Date(c.arrival_ts).toLocaleString('es-ES')}</td>
                      <td style={td}>{c.duration_min ? `${Math.round(c.duration_min / 60)} h` : '—'}</td>
                      <td style={td}>{c.cargo_inferred ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }

function KPI({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', borderRadius: 8, padding: 12 }}>
      <p style={{ fontSize: 10, letterSpacing: 0.6, color: '#64748b', margin: 0, fontWeight: 700 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: accent, margin: '6px 0 0' }}>{value}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>{title.toUpperCase()}</p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{children}</p>
}

/** Gráfico simple para serie mensual TEU · barras + línea de tendencia. */
function TrafficChart({ series }: { series: Array<{ period: string; teu: number }> }) {
  if (!series.length) return null
  const w = 600
  const h = 140
  const pad = 28
  const max = Math.max(...series.map((p) => p.teu)) || 1
  const barW = Math.max(2, (w - pad * 2) / series.length - 1)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 180 }} preserveAspectRatio="none">
      {series.map((p, i) => {
        const x = pad + i * ((w - pad * 2) / series.length)
        const barH = (p.teu / max) * (h - pad * 2)
        return (
          <g key={p.period}>
            <rect
              x={x}
              y={h - pad - barH}
              width={barW}
              height={barH}
              fill={ACCENT}
              opacity={0.65}
            />
            <title>
              {p.period} · {p.teu.toLocaleString('es-ES')} TEU
            </title>
          </g>
        )
      })}
      <text x={pad} y={14} fontSize={10} fill="#64748b">
        max {max.toLocaleString('es-ES')} TEU
      </text>
      <text x={pad} y={h - 6} fontSize={9} fill="#94a3b8">
        {series[0].period} → {series[series.length - 1].period}
      </text>
    </svg>
  )
}

function Sparkline({ series }: { series: number[] }) {
  if (!series.length) return null
  const w = 600, h = 100, pad = 6
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = Math.max(1, max - min)
  const step = (w - pad * 2) / Math.max(1, series.length - 1)
  const points = series
    .map((v, i) => `${pad + i * step},${h - pad - ((v - min) / range) * (h - pad * 2)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 120 }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={ACCENT} strokeWidth={1.6} />
      <text x={pad} y={12} fontSize={10} fill="#94a3b8">min {min}</text>
      <text x={w - pad - 60} y={12} fontSize={10} fill="#94a3b8">max {max}</text>
    </svg>
  )
}

function CargoBars({ items }: { items: Array<{ cargo: string; pct: number }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((c) => (
        <div key={c.cargo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
            <span>{c.cargo}</span>
            <span style={{ fontWeight: 600 }}>{c.pct}%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, c.pct)}%`, height: '100%', background: ACCENT }} />
          </div>
        </div>
      ))}
    </div>
  )
}
