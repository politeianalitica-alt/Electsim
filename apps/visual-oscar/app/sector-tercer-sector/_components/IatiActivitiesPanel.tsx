'use client'
/**
 * <IatiActivitiesPanel /> · Tercer Sector v3 · Sprint TS5
 *
 * Tabla de ACTIVIDADES IATI filtradas. Es el "drill" del resto de la vista:
 * reacciona a los filtros activos (país receptor / org reportante / sector DAC)
 * llamando a `/api/tercer-sector/iati/actividades`. Muestra título, org
 * reportante, países receptores, sectores DAC (etiquetados vía codelists) e
 * importe EUR (solo si el presupuesto vino en EUR; nunca se inventa FX).
 *
 * REQUIERE IATI_API_KEY (Datastore). Sin key → nota honesta. Cero emojis · es-ES.
 */
import { useEffect, useMemo, useState } from 'react'
import type { CodelistsData, IatiActivitiesData } from '@/lib/tercer-sector/iati-types'
import {
  ACCENT_DARK,
  CodeBadge,
  CoopEmpty,
  CoopSkeleton,
  countryName,
  fmtEur,
  fmtInt,
  getEnvelope,
  sectorName,
} from './CoopShared'

interface IatiActivitiesPanelProps {
  codelists: CodelistsData | null
  recipientCountry?: string | null
  reportingOrg?: string | null
  sector?: string | null
  /** Cuántas actividades pedir (default 50). */
  rows?: number
}

const STATUS_LABEL: Record<string, string> = {
  '1': 'Pipeline', '2': 'En ejecución', '3': 'Finalizada',
  '4': 'Post-finalización', '5': 'Cancelada', '6': 'Suspendida',
}

export function IatiActivitiesPanel({
  codelists,
  recipientCountry,
  reportingOrg,
  sector,
  rows = 50,
}: IatiActivitiesPanelProps) {
  const [data, setData] = useState<IatiActivitiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setErr(null)
    setNoKey(false)
    const params = new URLSearchParams({ rows: String(rows) })
    if (recipientCountry) params.set('recipient_country', recipientCountry)
    if (reportingOrg) params.set('reporting_org', reportingOrg)
    if (sector) params.set('sector', sector)
    getEnvelope<IatiActivitiesData>(`/api/tercer-sector/iati/actividades?${params.toString()}`, ctrl.signal).then((env) => {
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
  }, [recipientCountry, reportingOrg, sector, rows])

  const activities = useMemo(() => data?.activities ?? [], [data])

  if (loading) return <CoopSkeleton height={260} />

  if (noKey) {
    return (
      <CoopEmpty>
        El detalle de actividades requiere el IATI Datastore.{' '}
        <strong style={{ color: '#B45309' }}>Configura IATI_API_KEY</strong> para listar las actividades por país, org o sector.
      </CoopEmpty>
    )
  }
  if (err) return <CoopEmpty>No se pudieron cargar las actividades ({err}).</CoopEmpty>
  if (activities.length === 0) {
    return <CoopEmpty>Sin actividades para el filtro actual.</CoopEmpty>
  }

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 8px' }}>
        Mostrando {fmtInt(activities.length)} de {fmtInt(data?.total_found)} actividades coincidentes.
      </p>
      <div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid #ECECEF', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
              <Th style={{ textAlign: 'left' }}>Actividad</Th>
              <Th style={{ textAlign: 'left' }}>Países</Th>
              <Th style={{ textAlign: 'left' }}>Sectores DAC</Th>
              <Th style={{ textAlign: 'right' }}>Importe</Th>
              <Th style={{ textAlign: 'left' }}>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                <Td>
                  <div style={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>{a.title || a.id}</div>
                  {a.reporting_org_name && (
                    <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>{a.reporting_org_name}</div>
                  )}
                </Td>
                <Td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {a.recipient_countries.slice(0, 4).map((c) => (
                      <CodeBadge key={c} code={c} title={countryName(codelists, c)} />
                    ))}
                    {a.recipient_countries.length > 4 && (
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>+{a.recipient_countries.length - 4}</span>
                    )}
                    {a.recipient_countries.length === 0 && <span style={{ fontSize: 10.5, color: '#CBD5E1' }}>—</span>}
                  </div>
                </Td>
                <Td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {a.sectors.slice(0, 3).map((s) => (
                      <span key={s} style={{ fontSize: 10.5, color: '#475569' }} title={`DAC ${s}`}>
                        {sectorName(codelists, s)}
                      </span>
                    ))}
                    {a.sectors.length > 3 && <span style={{ fontSize: 10, color: '#94A3B8' }}>+{a.sectors.length - 3}</span>}
                    {a.sectors.length === 0 && <span style={{ fontSize: 10.5, color: '#CBD5E1' }}>—</span>}
                  </div>
                </Td>
                <Td style={{ textAlign: 'right' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: a.amount_eur != null ? ACCENT_DARK : '#CBD5E1' }}>
                    {a.amount_eur != null ? fmtEur(a.amount_eur) : 'n/d'}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    {a.status ? STATUS_LABEL[a.status] ?? a.status : '—'}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10, color: '#94A3B8', margin: '8px 2px 0' }}>
        Importe = presupuesto/valor de la actividad en EUR cuando el dato venía en EUR (no se convierte divisa). “n/d” = sin importe EUR comparable.
      </p>
    </div>
  )
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        padding: '9px 12px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#64748B',
        borderBottom: '1px solid #E2E8F0',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '9px 12px', ...style }}>{children}</td>
}

export default IatiActivitiesPanel
