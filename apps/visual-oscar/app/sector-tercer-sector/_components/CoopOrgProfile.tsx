'use client'
/**
 * <CoopOrgProfile /> · Tercer Sector v3 · Sprint IATI-MAX.
 *
 * Drawer modal con el PERFIL completo de una ONGD española reportante en IATI.
 * Aprovecha el endpoint `/api/tercer-sector/iati/org-profile/[ref]` (Full
 * Access) para mostrar de un vistazo: total actividades, total desembolsado
 * EUR, top países receptores, top sectores DAC y serie anual EUR (5 años).
 *
 * Estados:
 *   - loading: skeleton.
 *   - no_key: mensaje honesto (requiere IATI_API_KEY).
 *   - error: mensaje genérico + close.
 *   - ok: render del perfil.
 *
 * Drawer fijo derecha, oscurece el resto. Sin librerías de modal externas
 * (CLAUDE.md §0.5 cero emojis, sin deps innecesarias).
 */
import { useEffect, useState } from 'react'
import {
  ACCENT,
  ACCENT_DARK,
  CodeBadge,
  CoopEmpty,
  CoopSkeleton,
  fmtEur,
  fmtEurFull,
  fmtInt,
  getEnvelope,
} from './CoopShared'

interface OrgProfileYearPoint {
  year: number
  value_eur: number
  count: number
}
interface FacetItem {
  code: string
  name: string
  count: number
}
interface OrgProfileData {
  org_ref: string
  org_name: string
  total_activities: number
  total_disbursed_eur: number | null
  top_countries: FacetItem[]
  top_sectors: FacetItem[]
  yearly_disbursements: OrgProfileYearPoint[]
}

interface CoopOrgProfileProps {
  orgRef: string
  orgName: string
  onClose: () => void
}

export function CoopOrgProfile({ orgRef, orgName, onClose }: CoopOrgProfileProps) {
  const [data, setData] = useState<OrgProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setNoKey(false)
    setErr(null)
    setData(null)
    const ref = encodeURIComponent(orgRef)
    getEnvelope<OrgProfileData>(`/api/tercer-sector/iati/org-profile/${ref}`, ctrl.signal).then((env) => {
      if (ctrl.signal.aborted) return
      if (env.ok && env.data) {
        setData(env.data)
      } else if ((env.error ?? '').startsWith('no_key')) {
        setNoKey(true)
      } else if (env.error && env.error !== 'aborted') {
        setErr(env.error)
      }
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [orgRef])

  // Cierre con Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Calcular max para barra del serie anual.
  const maxYearly = data?.yearly_disbursements.reduce((m, p) => Math.max(m, p.value_eur), 0) ?? 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil IATI de ${orgName}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.45)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100vw)',
          height: '100vh',
          background: '#fff',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.18)',
          overflow: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: ACCENT_DARK,
                margin: '0 0 4px',
              }}
            >
              Perfil IATI · ONGD reportante
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{orgName}</h2>
            <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              <CodeBadge code={orgRef} />
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar perfil"
            style={{
              background: 'none',
              border: '1px solid #E2E8F0',
              color: '#475569',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Cerrar
          </button>
        </div>

        {loading && <CoopSkeleton height={220} />}

        {noKey && (
          <CoopEmpty>
            El perfil completo requiere el IATI Datastore.{' '}
            <strong style={{ color: '#B45309' }}>Configura IATI_API_KEY</strong> para ver actividades, países, sectores y serie anual.
          </CoopEmpty>
        )}

        {err && <CoopEmpty>No se pudo cargar el perfil ({err}).</CoopEmpty>}

        {data && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Kpi label="Actividades" value={fmtInt(data.total_activities)} accent={ACCENT_DARK} />
              <Kpi
                label="Desembolsado"
                value={fmtEur(data.total_disbursed_eur)}
                accent={ACCENT_DARK}
                hint={data.total_disbursed_eur != null ? fmtEurFull(data.total_disbursed_eur) : 'n/d'}
              />
              <Kpi label="Países activos" value={fmtInt(data.top_countries.length)} accent={ACCENT_DARK} />
            </div>

            {/* Serie anual */}
            {data.yearly_disbursements.length > 0 && (
              <Section title="Desembolsos por año (EUR)">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '4px 0' }}>
                  {data.yearly_disbursements.map((p) => {
                    const h = maxYearly > 0 ? Math.max(6, Math.round((p.value_eur / maxYearly) * 90)) : 6
                    return (
                      <div key={p.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div
                          title={`${p.year} · ${fmtEur(p.value_eur)} · ${fmtInt(p.count)} txs`}
                          style={{ width: '100%', height: h, background: ACCENT, borderRadius: 4 }}
                        />
                        <span style={{ fontSize: 10, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{p.year}</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Top países */}
            {data.top_countries.length > 0 && (
              <Section title={`Top países receptores (${data.top_countries.length})`}>
                <FacetList items={data.top_countries.slice(0, 8)} />
              </Section>
            )}

            {/* Top sectores */}
            {data.top_sectors.length > 0 && (
              <Section title={`Top sectores CAD/DAC (${data.top_sectors.length})`}>
                <FacetList items={data.top_sectors.slice(0, 8)} />
              </Section>
            )}

            <p style={{ fontSize: 10.5, color: '#94A3B8', margin: '6px 0 0', lineHeight: 1.55 }}>
              Fuente: IATI Datastore · perfilado de una ONGD reportante. Los importes EUR son un mínimo comparable
              (solo valores ya en EUR; no se convierte divisa).
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '10px 12px',
      }}
      title={hint}
    >
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 17, fontWeight: 700, color: accent, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', margin: '0 0 6px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function FacetList({ items }: { items: Array<{ code: string; name: string; count: number }> }) {
  const max = items.reduce((m, x) => Math.max(m, x.count), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((x) => {
        const pct = max > 0 ? Math.round((x.count / max) * 100) : 0
        return (
          <div key={x.code} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11.5, color: '#0F172A' }}>{x.name}</div>
              <div
                style={{
                  height: 4,
                  width: '100%',
                  background: '#F1F5F9',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginTop: 2,
                }}
              >
                <div style={{ height: '100%', width: `${pct}%`, background: ACCENT }} />
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT_DARK, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {fmtInt(x.count)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CoopOrgProfile
