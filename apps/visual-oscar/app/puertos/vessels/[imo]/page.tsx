'use client'
/**
 * /puertos/vessels/[imo] · Sprint 2 Fase F · ficha rica de buque.
 *
 * Tabs:
 *   1. Ficha técnica · identidad + dimensiones + propietario + LEI
 *   2. AIS · track 72h en mapa + última posición
 *   3. Port calls · escalas recientes (consulta usePortCalls del puerto cercano)
 *   4. Sanciones · screening OFAC/EU/UN consolidado
 *   5. Sister vessels · buques de la misma clase/operador/año
 *   6. Anomalías · dark periods, flag hopping, AIS gaps
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  useVessel,
  useVesselTrack,
  useVesselScreen,
  useVesselSisters,
  useVesselAnomalies,
  useVesselFlagHistory,
} from '@/hooks/usePorts'
import { VesselTrackChart } from '@/components/ports/VesselTrackChart'
import { SanctionsBadge } from '@/components/ports/SanctionsBadge'
import { DataQualityBadge } from '@/components/ports/DataQualityBadge'
import { fmtNum, fmtInt } from '@/lib/ports-utils'

const ACCENT = '#0e7490'

type Tab = 'ficha' | 'ais' | 'sanciones' | 'sisters' | 'anomalias'

export default function VesselDetailPage() {
  const params = useParams<{ imo: string }>()
  const router = useRouter()
  const imo = params.imo

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useState<Tab>('ficha')

  const { data: vessel, loading } = useVessel(imo)
  const { data: track } = useVesselTrack(imo, 72, 80)
  const { data: screen } = useVesselScreen(imo)
  const { items: sisters, dataQuality: sistersQ } = useVesselSisters(imo)
  const { items: anomalies, dataQuality: anomQ } = useVesselAnomalies(imo)
  const { history: flagHistory, currentFlag } = useVesselFlagHistory(imo)

  if (loading || !vessel) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <div style={{ padding: 24, color: '#64748b' }}>Cargando buque…</div>
      </div>
    )
  }

  const v = vessel as any
  const flagOfConvenienceRisk =
    flagHistory && flagHistory.length > 3 // >3 cambios en 2 años → riesgo

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link
          href="/puertos"
          style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
        >
          ← Puertos & Comercio Global
        </Link>

        {/* Hero */}
        <header style={{ marginTop: 10 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            BUQUE · IMO {v.imo} {v.mmsi ? `· MMSI ${v.mmsi}` : ''}
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              margin: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {v.name ?? v.imo}
            <SanctionsBadge result={screen} />
          </h1>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Bandera {v.flag_iso ?? '—'} · Tipo {v.type ?? '—'} · Operador{' '}
            {v.operator ?? '—'} ·{' '}
            {v.dwt ? `${fmtInt(v.dwt)} DWT` : ''}{' '}
            {v.built_year ? ` · construido ${v.built_year}` : ''}
          </p>
        </header>

        {/* Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            marginTop: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {(
            [
              ['ficha', 'Ficha técnica'],
              ['ais', 'AIS · Track 72h'],
              ['sanciones', 'Sanciones'],
              ['sisters', `Sister vessels (${sisters.length})`],
              ['anomalias', `Anomalías (${anomalies.length})`],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: tab === key ? '#fff' : '#334155',
                background: tab === key ? ACCENT : '#fff',
                border: '1px solid ' + (tab === key ? ACCENT : '#e2e8f0'),
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ─── Ficha técnica ─── */}
        {tab === 'ficha' && (
          <>
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 10,
                marginTop: 16,
              }}
            >
              <KPI
                label="Última posición"
                value={`${fmtNum(v.lat, 3)} / ${fmtNum(v.lon, 3)}`}
              />
              <KPI label="Velocidad" value={fmtNum(v.sog, 1, ' kn')} />
              <KPI label="Rumbo" value={fmtNum(v.cog, 0, '°')} />
              <KPI label="Calado" value={fmtNum(v.draught, 1, ' m')} />
              <KPI label="Cerca de" value={v.near_port_slug ?? '—'} />
              <KPI
                label="Timestamp"
                value={v.ts ? new Date(v.ts).toLocaleString('es-ES') : '—'}
              />
            </section>

            <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card title="Identidad">
                <DetailRow label="IMO" value={v.imo} mono />
                <DetailRow label="MMSI" value={v.mmsi ?? '—'} mono />
                <DetailRow label="Call sign" value={v.call_sign ?? '—'} mono />
                <DetailRow label="Nombre actual" value={v.name ?? '—'} />
                <DetailRow
                  label="Nombres previos"
                  value={
                    v.names_previous?.length
                      ? v.names_previous.join(' · ')
                      : '—'
                  }
                />
                <DetailRow
                  label="Bandera"
                  value={v.flag_iso ?? currentFlag ?? '—'}
                />
                {flagOfConvenienceRisk && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '4px 8px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ▲ FLAG-OF-CONVENIENCE RISK · {flagHistory.length} cambios
                  </div>
                )}
              </Card>

              <Card title="Dimensiones y técnica">
                <DetailRow label="Tipo" value={v.type ?? '—'} />
                <DetailRow label="Subtipo" value={v.subtype ?? '—'} />
                <DetailRow
                  label="DWT (tons)"
                  value={v.dwt ? fmtInt(v.dwt) : '—'}
                />
                <DetailRow label="GT" value={v.gt ? fmtInt(v.gt) : '—'} />
                <DetailRow
                  label="Capacidad TEU"
                  value={v.teu_capacity ? fmtInt(v.teu_capacity) : '—'}
                />
                <DetailRow
                  label="Eslora (LOA)"
                  value={fmtNum(v.loa_m, 1, ' m')}
                />
                <DetailRow label="Manga" value={fmtNum(v.beam_m, 1, ' m')} />
                <DetailRow
                  label="Calado max"
                  value={fmtNum(v.draft_max_m, 1, ' m')}
                />
                <DetailRow
                  label="Construido"
                  value={v.built_year ?? '—'}
                />
                <DetailRow label="Astillero" value={v.builder ?? '—'} />
              </Card>

              <Card title="Comercial">
                <DetailRow label="Operador" value={v.operator ?? '—'} />
                <DetailRow label="Owner" value={v.owner_name ?? '—'} />
                <DetailRow
                  label="Owner LEI"
                  value={v.owner_lei ?? '—'}
                  mono
                />
                <DetailRow
                  label="Beneficial owner"
                  value={v.beneficial_owner ?? '—'}
                />
                <DetailRow label="Manager" value={v.manager ?? '—'} />
                <DetailRow label="Charterer" value={v.charterer ?? '—'} />
              </Card>

              <Card title="Cumplimiento + emisiones">
                <DetailRow
                  label="Sanctions status"
                  value={(v.sanctions_status ?? 'clear').toUpperCase()}
                />
                <DetailRow
                  label="Class society"
                  value={v.class_society ?? '—'}
                />
                <DetailRow label="P&I club" value={v.pni_club ?? '—'} />
                <DetailRow
                  label="CII rating (IMO)"
                  value={v.emissions_cii ?? '—'}
                />
                <DetailRow
                  label="EEXI"
                  value={fmtNum(v.emissions_eexi, 2)}
                />
              </Card>
            </section>
          </>
        )}

        {/* ─── AIS ─── */}
        {tab === 'ais' && (
          <section style={{ marginTop: 16 }}>
            <Card title="Track AIS · últimas 72h">
              <VesselTrackChart track={track} />
            </Card>
            {flagHistory.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Card title={`Banderas históricas (${flagHistory.length})`}>
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: 'none',
                      fontSize: 12,
                    }}
                  >
                    {flagHistory.map((h: any, i: number) => (
                      <li
                        key={i}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{h.flag}</span>
                        <span style={{ color: '#64748b' }}>
                          {h.since} → {h.until ?? 'actual'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}
          </section>
        )}

        {/* ─── Sanciones ─── */}
        {tab === 'sanciones' && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 16,
            }}
          >
            <Card title="Sanctions screening · checks ejecutados">
              {screen?.checks?.length ? (
                <table
                  style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>Query</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>Hits</th>
                      <th style={th}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screen.checks.map((c: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={td}>{c.query}</td>
                        <td style={td}>{c.type}</td>
                        <td style={td}>{c.n_hits}</td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '2px 6px',
                              background:
                                c.risk_score >= 60
                                  ? '#fee2e2'
                                  : c.risk_score >= 30
                                    ? '#fef3c7'
                                    : '#dcfce7',
                              color:
                                c.risk_score >= 60
                                  ? '#991b1b'
                                  : c.risk_score >= 30
                                    ? '#92400e'
                                    : '#166534',
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
                <Empty>Sin screening disponible.</Empty>
              )}
            </Card>
            <Card title="Fuentes detectadas">
              {screen?.sources?.length ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                  {screen.sources.slice(0, 10).map((s: any, i: number) => {
                    const label =
                      s.name ?? s.caption ?? JSON.stringify(s).slice(0, 80)
                    const list = s.list ?? s.source ?? '—'
                    return (
                      <li
                        key={i}
                        style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <strong>{label}</strong>{' '}
                        <span style={{ color: '#64748b' }}>· {list}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <Empty>Sin coincidencias en listas consolidadas.</Empty>
              )}
            </Card>
          </section>
        )}

        {/* ─── Sister vessels ─── */}
        {tab === 'sisters' && (
          <section style={{ marginTop: 16 }}>
            <Card title={`Sister vessels (${sisters.length})`}>
              {sistersQ && (
                <div style={{ marginBottom: 10 }}>
                  <DataQualityBadge quality={sistersQ} />
                </div>
              )}
              {sisters.length === 0 ? (
                <Empty>
                  Sin buques hermanos detectados para este IMO con la heurística
                  (mismo type + operator + year ±3). Una vez vessels_master esté
                  poblado podremos hacer matching por class + builder.
                </Empty>
              ) : (
                <table
                  style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>IMO</th>
                      <th style={th}>Nombre</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>Bandera</th>
                      <th style={{ ...th, textAlign: 'right' }}>DWT</th>
                      <th style={th}>Built</th>
                      <th style={th}>Operador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sisters.map((s: any) => (
                      <tr key={s.imo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...td, fontFamily: 'monospace' }}>
                          <Link
                            href={`/puertos/vessels/${s.imo}`}
                            style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
                          >
                            {s.imo}
                          </Link>
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                        <td style={td}>{s.type}</td>
                        <td style={td}>{s.flag_iso}</td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          {fmtInt(s.dwt)}
                        </td>
                        <td style={td}>{s.built_year}</td>
                        <td style={{ ...td, color: '#64748b' }}>{s.operator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>
        )}

        {/* ─── Anomalías ─── */}
        {tab === 'anomalias' && (
          <section style={{ marginTop: 16 }}>
            <Card title={`Anomalías AIS (${anomalies.length})`}>
              {anomQ && (
                <div style={{ marginBottom: 10 }}>
                  <DataQualityBadge quality={anomQ} />
                </div>
              )}
              {anomalies.length === 0 ? (
                <Empty>
                  Sin anomalías detectadas. El detector necesita ≥30 días de AIS
                  persistido para identificar dark periods, flag hopping y
                  outliers reales. Activar `AISSTREAM_API_KEY` + worker
                  ais_ingest_worker · ver{' '}
                  <code>etl/workers/README.md</code>.
                </Empty>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    fontSize: 12,
                  }}
                >
                  {anomalies.map((a: any, i: number) => (
                    <li
                      key={i}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <strong>{a.type ?? 'anomaly'}</strong> ·{' '}
                      <span style={{ color: '#64748b' }}>{a.detected_at}</span>
                      <p style={{ margin: '4px 0 0', color: '#475569' }}>
                        {a.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
}
const td: React.CSSProperties = { padding: '8px 10px', color: '#1e293b' }

function KPI({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          color: '#64748b',
          margin: 0,
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#0f172a',
          margin: '4px 0 0',
          wordBreak: 'break-word',
        }}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 14,
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 0.8,
          color: '#64748b',
          fontWeight: 700,
          margin: 0,
        }}
      >
        {title.toUpperCase()}
      </p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid #f1f5f9',
        fontSize: 12,
      }}
    >
      <span style={{ color: '#64748b' }}>{label}</span>
      <span
        style={{
          color: '#0f172a',
          fontWeight: 600,
          fontFamily: mono ? 'monospace' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{children}</p>
}
