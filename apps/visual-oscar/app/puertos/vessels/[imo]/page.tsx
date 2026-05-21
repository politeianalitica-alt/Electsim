'use client'
/**
 * /puertos/vessels/[imo] · Detalle buque.
 *
 * Ficha · última posición · track AIS · screening sanciones.
 */
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useVessel, useVesselTrack, useVesselScreen } from '@/hooks/usePorts'
import { VesselTrackChart } from '@/components/ports/VesselTrackChart'
import { SanctionsBadge } from '@/components/ports/SanctionsBadge'

const ACCENT = '#0e7490'

export default function VesselDetailPage() {
  const params = useParams<{ imo: string }>()
  const router = useRouter()
  const imo = params.imo

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data: vessel, loading } = useVessel(imo)
  const { data: track } = useVesselTrack(imo, 72, 80)
  const { data: screen } = useVesselScreen(imo)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          ← Puertos & Comercio Global
        </Link>

        {loading || !vessel ? (
          <p style={{ marginTop: 16, color: '#64748b' }}>Cargando buque…</p>
        ) : (
          <>
            <header style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
                BUQUE · IMO {vessel.imo}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {(vessel as any).name ?? vessel.imo}
              </h1>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                Bandera {vessel.flag_iso ?? '—'} · Tipo {vessel.type ?? '—'} · Operador {vessel.operator ?? '—'}
              </p>
            </header>

            <div style={{ marginTop: 14 }}>
              <SanctionsBadge result={screen} />
            </div>

            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 10,
                marginTop: 16,
              }}
            >
              <KPI label="Última posición" value={`${vessel.lat?.toFixed(3) ?? '—'} / ${vessel.lon?.toFixed(3) ?? '—'}`} />
              <KPI label="Velocidad" value={vessel.sog != null ? `${vessel.sog.toFixed(1)} kn` : '—'} />
              <KPI label="Rumbo" value={vessel.cog != null ? `${vessel.cog.toFixed(0)}°` : '—'} />
              <KPI label="Calado" value={vessel.draught != null ? `${vessel.draught} m` : '—'} />
              <KPI label="Cerca de" value={vessel.near_port_slug ?? '—'} />
              <KPI label="Timestamp" value={vessel.ts ? new Date(vessel.ts).toLocaleString('es-ES') : '—'} />
            </section>

            <section style={{ marginTop: 18 }}>
              <Card title="Track AIS (72h)">
                <VesselTrackChart track={track} />
              </Card>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <Card title="Sanciones · checks ejecutados">
                {screen?.checks?.length ? (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={th}>Query</th>
                        <th style={th}>Tipo</th>
                        <th style={th}>Hits</th>
                        <th style={th}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screen.checks.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={td}>{c.query}</td>
                          <td style={td}>{c.type}</td>
                          <td style={td}>{c.n_hits}</td>
                          <td style={td}>
                            <span
                              style={{
                                padding: '2px 6px',
                                background:
                                  c.risk_score >= 60 ? '#fee2e2' : c.risk_score >= 30 ? '#fef3c7' : '#dcfce7',
                                color:
                                  c.risk_score >= 60 ? '#991b1b' : c.risk_score >= 30 ? '#92400e' : '#166534',
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              {c.risk_score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sin screening disponible.</p>
                )}
              </Card>
              <Card title="Fuentes detectadas">
                {screen?.sources?.length ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                    {screen.sources.slice(0, 10).map((s, i) => {
                      const sr = s as Record<string, unknown>
                      const label = (sr.name as string) ?? (sr.caption as string) ?? JSON.stringify(sr).slice(0, 80)
                      const list = (sr.list as string) ?? (sr.source as string) ?? '—'
                      return (
                        <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <strong>{label}</strong> <span style={{ color: '#64748b' }}>· {list}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sin coincidencias en listas.</p>
                )}
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }

function KPI({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <p style={{ fontSize: 10, letterSpacing: 0.6, color: '#64748b', margin: 0, fontWeight: 700 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 0', wordBreak: 'break-word' }}>{value ?? '—'}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>{title.toUpperCase()}</p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}
