'use client'
/**
 * /puertos/chokepoints · 6 corredores marítimos con risk score.
 *
 * Suez · Ormuz · Bósforo · Malacca · Panamá · Bab-el-Mandeb.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useChokepoints, useChokepoint } from '@/hooks/usePorts'
import { ChokepointRiskCard } from '@/components/ports/ChokepointRiskCard'
import { fmtNum } from '@/lib/ports-utils'

const ACCENT = '#0e7490'

export default function ChokepointsPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { items } = useChokepoints(30)
  const [selected, setSelected] = useState<string | null>(null)
  const { data: detail } = useChokepoint(selected, 30)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/puertos" style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          ← Puertos & Comercio Global
        </Link>
        <header style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            CORREDORES MARÍTIMOS · RISK SCORE
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            Vigilancia de chokepoints
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Score base + boost por eventos ACLED en bounding box del corredor (últimos 30 días).
          </p>
        </header>

        <section style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {items.map((ck) => (
            <div key={ck.slug} onClick={() => setSelected(ck.slug)} style={{ cursor: 'pointer' }} id={ck.slug}>
              <ChokepointRiskCard ck={ck} />
            </div>
          ))}
        </section>

        {detail ? (
          <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 11, letterSpacing: 0.8, color: '#64748b', fontWeight: 700, margin: 0 }}>
              DETALLE · {detail.name.toUpperCase()}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 10 }}>
              <KPI label="Risk score" value={detail.risk_score ?? '—'} accent={ACCENT} />
              <KPI label="Risk level" value={(detail.risk_level ?? 'desconocido').toUpperCase()} accent={ACCENT} />
              <KPI label="Score base" value={detail.score_base ?? '—'} accent={ACCENT} />
              <KPI label="Eventos 30d" value={detail.n_events_30d ?? 0} accent={ACCENT} />
              <KPI label="Lat / Lon" value={`${fmtNum(detail.lat, 2)} / ${fmtNum(detail.lon, 2)}`} accent={ACCENT} />
              <KPI label="Fuente" value={detail.data_source ?? '—'} accent={ACCENT} />
            </div>

            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.6 }}>EVENTOS RECIENTES</p>
              {detail.recent_events?.length ? (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>Fecha</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>Víctimas</th>
                      <th style={th}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recent_events.slice(0, 15).map((ev, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={td}>{new Date(ev.ts).toLocaleDateString('es-ES')}</td>
                        <td style={td}>{ev.event_type}</td>
                        <td style={td}>{ev.fatalities ?? 0}</td>
                        <td style={{ ...td, color: '#475569' }}>{ev.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Sin eventos en el periodo.</p>
              )}
            </div>
          </section>
        ) : (
          <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
            Click en cualquier corredor para ver detalle.
          </p>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#475569' }
const td: React.CSSProperties = { padding: '6px 8px', color: '#1e293b' }

function KPI({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
      <p style={{ fontSize: 10, letterSpacing: 0.6, color: '#64748b', margin: 0, fontWeight: 700 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: accent, margin: '4px 0 0' }}>{value}</p>
    </div>
  )
}
