'use client'
/**
 * <OrgFicha /> · Tercer Sector v3 · TS4 (Organizaciones)
 *
 * Ficha de la entidad seleccionada (drawer lateral). Tres bloques:
 *   1) Identidad + datos económicos: tipo, sector, ámbito, CCAA, NIF, ingresos,
 *      empleados, IRPF 0,7%, web, y la cita de fuente+fecha del dato económico.
 *   2) Cooperación internacional (IATI): SOLO si la entidad reporta a IATI
 *      (ONGD / internacional con CIF → `ES-CIF-<CIF>`). Llama a
 *      `/api/tercer-sector/iati/actividades?reporting_org=<ref>` y muestra sus
 *      actividades (título, países receptores, sectores DAC, importe si EUR).
 *      Degrada honestamente: sin IATI_API_KEY o sin actividades → mensaje sobrio.
 *   3) Financiación pública relacionada: subvenciones BDNS cuyo beneficiario
 *      casa con el NIF de la entidad (de `/api/tercer-sector/financiacion`).
 *      Si no hay NIF o no hay coincidencias → se dice claramente.
 *
 * Las llamadas de enriquecimiento se disparan al seleccionar y NUNCA inventan
 * importes (IATI solo rellena EUR; BDNS solo concesiones con importe numérico).
 * Cero emojis · Unicode geométrico.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACCENT,
  ACCENT_DARK,
  ambitoLabel,
  ccaaLabel,
  deriveIatiRef,
  fmtEur,
  fmtEurFull,
  fmtFecha,
  fmtNum,
  FuenteBadge,
  OrgChip,
  OrgEmpty,
  sectorLabel,
  tipoLabel,
  type Envelope,
  type OrgRow,
} from './OrgShared'

// ── Shapes mínimas de los endpoints de enriquecimiento ──────────────────────
interface IatiActivity {
  id: string
  title: string
  reporting_org_ref: string | null
  reporting_org_name: string | null
  recipient_countries: string[]
  sectors: string[]
  amount_eur: number | null
  status: string | null
}
interface IatiActivitiesData {
  activities: IatiActivity[]
  total_found: number
}
interface BdnsConcesion {
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  finalidad?: string | null
  titulo?: string | null
  organo: string | null
  fecha: string | null
}
interface FinanciacionData {
  concesiones: BdnsConcesion[]
}

type LoadState<T> = { status: 'idle' | 'loading' | 'done'; data: T | null; error?: string }

// DAC 3-digit sector roots (subset común en cooperación ES) → nombre legible.
const DAC_ROOT: Record<string, string> = {
  '111': 'Educación', '112': 'Educación básica', '121': 'Salud', '122': 'Salud básica',
  '130': 'Población / salud reproductiva', '140': 'Agua y saneamiento',
  '151': 'Gobierno y soc. civil', '152': 'Prevención de conflictos', '160': 'Otros sociales',
  '210': 'Transporte', '230': 'Energía', '311': 'Agricultura', '410': 'Medio ambiente',
  '430': 'Otros productivos', '510': 'Ayuda presupuestaria', '520': 'Ayuda alimentaria',
  '720': 'Ayuda de emergencia', '730': 'Reconstrucción', '740': 'Prevención de desastres',
  '998': 'Sin asignar',
}
function dacLabel(code: string): string {
  return DAC_ROOT[code.slice(0, 3)] ?? `Sector ${code}`
}

// ── Sub-bloques presentacionales ────────────────────────────────────────────
function SectionTitle({ glyph, children, note }: { glyph: string; children: React.ReactNode; note?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true" style={{ color: ACCENT, fontSize: 14 }}>{glyph}</span>
        <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          {children}
        </h4>
      </div>
      {note && <p style={{ margin: '3px 0 0 22px', fontSize: 10, color: '#94a3b8' }}>{note}</p>}
    </div>
  )
}

function DatoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 11.5, color: '#64748b' }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#1d1d1f',
          textAlign: 'right',
          fontFamily: mono ? 'var(--font-display)' : 'inherit',
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

interface Props {
  org: OrgRow | null
  onClose: () => void
}

export function OrgFicha({ org, onClose }: Props) {
  const [iati, setIati] = useState<LoadState<IatiActivitiesData>>({ status: 'idle', data: null })
  const [fin, setFin] = useState<LoadState<BdnsConcesion[]>>({ status: 'idle', data: null })
  const closeRef = useRef<HTMLButtonElement>(null)

  const iatiRef = useMemo(() => (org ? deriveIatiRef(org) : null), [org])
  const nif = org?.nif?.trim().toUpperCase() || null

  // Cierre con Escape + foco en el botón cerrar al abrir.
  useEffect(() => {
    if (!org) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [org, onClose])

  // Enriquecimiento IATI (solo si la entidad reporta plausiblemente).
  useEffect(() => {
    if (!org || !iatiRef) {
      setIati({ status: 'idle', data: null })
      return
    }
    let alive = true
    setIati({ status: 'loading', data: null })
    fetch(`/api/tercer-sector/iati/actividades?reporting_org=${encodeURIComponent(iatiRef)}&rows=25`)
      .then((r) => r.json() as Promise<Envelope<IatiActivitiesData>>)
      .then((j) => {
        if (!alive) return
        if (j.ok && j.data) setIati({ status: 'done', data: j.data })
        else setIati({ status: 'done', data: null, error: j.error || 'no_data' })
      })
      .catch((e) => alive && setIati({ status: 'done', data: null, error: String(e) }))
    return () => {
      alive = false
    }
  }, [org, iatiRef])

  // Enriquecimiento financiación: subvenciones BDNS cuyo beneficiario casa por NIF.
  useEffect(() => {
    if (!org || !nif) {
      setFin({ status: 'idle', data: null })
      return
    }
    let alive = true
    setFin({ status: 'loading', data: null })
    fetch('/api/tercer-sector/financiacion?pages=2')
      .then((r) => r.json() as Promise<Envelope<FinanciacionData>>)
      .then((j) => {
        if (!alive) return
        const all = j.data?.concesiones ?? []
        const matches = all.filter(
          (c) => (c.beneficiario_nif || '').trim().toUpperCase() === nif,
        )
        setFin({ status: 'done', data: matches })
      })
      .catch((e) => alive && setFin({ status: 'done', data: null, error: String(e) }))
    return () => {
      alive = false
    }
  }, [org, nif])

  if (!org) return null

  const activities = iati.data?.activities ?? []
  const subvenciones = fin.data ?? []
  const totalSubv = subvenciones.reduce((s, c) => s + (c.importe_eur ?? 0), 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.32)', zIndex: 60, backdropFilter: 'blur(1px)' }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${org.nombre}`}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(560px, 94vw)',
          background: '#fff',
          zIndex: 61,
          boxShadow: '-12px 0 40px rgba(15,23,42,0.18)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-text)',
        }}
      >
        {/* Cabecera */}
        <header
          style={{
            background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
            color: '#fff',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
                Ficha de entidad
              </div>
              <h3 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>
                {org.nombre}
              </h3>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Cerrar ficha"
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                borderRadius: 8,
                width: 30,
                height: 30,
                fontSize: 16,
                cursor: 'pointer',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={chipOnHero}>{tipoLabel(org.tipo)}</span>
            <span style={chipOnHero}>{sectorLabel(org.sector)}</span>
            <span style={chipOnHero}>{ambitoLabel(org.ambito)}</span>
            {org.irpf_07 && <span style={{ ...chipOnHero, background: 'rgba(255,255,255,0.28)' }}>IRPF 0,7%</span>}
          </div>
        </header>

        {/* Cuerpo scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* 1 · Datos económicos */}
          <section style={{ marginBottom: 22 }}>
            <SectionTitle glyph="◉" note="Último ejercicio público disponible · orden de magnitud">
              Datos económicos y de empleo
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <KpiBox label="Ingresos anuales" value={fmtEur(org.ingresos_eur)} accent />
              <KpiBox label="Empleo directo" value={fmtNum(org.empleados)} />
            </div>
            <DatoRow label="NIF / CIF" value={org.nif || <span style={{ color: '#cbd5e1' }}>no verificado</span>} mono />
            <DatoRow label="CCAA de la sede" value={org.ccaa ? ccaaLabel(org.ccaa) : '—'} />
            <DatoRow label="Ámbito" value={ambitoLabel(org.ambito)} />
            <DatoRow
              label="IRPF 0,7% Fines Sociales"
              value={
                org.irpf_07 ? (
                  <OrgChip tone="violet">Adherida</OrgChip>
                ) : (
                  <span style={{ color: '#94a3b8' }}>No consta</span>
                )
              }
            />
            <DatoRow label="Ingresos (exacto)" value={fmtEurFull(org.ingresos_eur)} mono />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <FuenteBadge fuente={org.fuente} fecha={org.fecha_ref} />
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: ACCENT_DARK,
                    textDecoration: 'none',
                    border: `1px solid ${ACCENT}`,
                    borderRadius: 8,
                    padding: '5px 11px',
                  }}
                >
                  Web oficial ⟶
                </a>
              )}
            </div>
          </section>

          {/* 2 · Cooperación internacional (IATI) — solo si reporta */}
          {iatiRef && (
            <section style={{ marginBottom: 22 }}>
              <SectionTitle glyph="⬡" note={`Reporting org IATI · ${iatiRef}`}>
                Cooperación internacional · IATI
              </SectionTitle>

              {iati.status === 'loading' && <OrgEmpty>Consultando actividades en el Datastore de IATI…</OrgEmpty>}

              {iati.status === 'done' && activities.length === 0 && (
                <OrgEmpty>
                  {iati.error === 'no_key' || (iati.error || '').startsWith('no_key')
                    ? 'IATI Datastore no disponible (falta IATI_API_KEY). La entidad figura como reportante, pero no podemos listar sus actividades sin la clave.'
                    : 'Sin actividades de cooperación localizadas para esta entidad en IATI en este corte.'}
                </OrgEmpty>
              )}

              {iati.status === 'done' && activities.length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 8 }}>
                    {iati.data?.total_found ?? activities.length} actividades reportadas · muestra de {activities.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activities.slice(0, 12).map((a) => (
                      <div
                        key={a.id}
                        style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px', background: '#FAFAFA' }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>
                          {a.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                          {a.recipient_countries.slice(0, 4).map((c) => (
                            <OrgChip key={c} tone="neutral">{c}</OrgChip>
                          ))}
                          {a.sectors.slice(0, 2).map((s) => (
                            <OrgChip key={s} tone="accent" title={`Sector DAC ${s}`}>{dacLabel(s)}</OrgChip>
                          ))}
                          {a.amount_eur != null && (
                            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 800, color: ACCENT_DARK, fontFamily: 'var(--font-display)' }}>
                              {fmtEur(a.amount_eur)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 8 }}>
                    Importes solo cuando el presupuesto está en EUR (IATI no asume tipo de cambio).
                  </p>
                </>
              )}
            </section>
          )}

          {/* 3 · Financiación pública relacionada (BDNS por NIF) */}
          <section>
            <SectionTitle glyph="◈" note={nif ? `Coincidencias por NIF ${nif} en BDNS` : 'Requiere NIF verificado'}>
              Financiación pública relacionada
            </SectionTitle>

            {!nif && (
              <OrgEmpty>
                Esta entidad no tiene NIF/CIF verificado en el catálogo, por lo que no podemos casar subvenciones BDNS con confianza.
              </OrgEmpty>
            )}

            {nif && fin.status === 'loading' && <OrgEmpty>Buscando subvenciones recientes en BDNS…</OrgEmpty>}

            {nif && fin.status === 'done' && subvenciones.length === 0 && (
              <OrgEmpty>
                Sin concesiones recientes localizadas a nombre de esta entidad en el corte BDNS consultado (la BDNS no garantiza filtrado por beneficiario; pueden existir fuera de la muestra reciente).
              </OrgEmpty>
            )}

            {nif && subvenciones.length > 0 && (
              <>
                {totalSubv > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <KpiBox label="Subvenciones casadas" value={fmtNum(subvenciones.length)} />
                    <KpiBox label="Importe localizado" value={fmtEur(totalSubv)} accent />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {subvenciones.slice(0, 10).map((c, i) => (
                    <div
                      key={i}
                      style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px', background: '#FAFAFA' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 600, lineHeight: 1.3 }}>
                          {c.finalidad || c.titulo || c.organo || 'Concesión BDNS'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT_DARK, whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>
                          {fmtEur(c.importe_eur)}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
                        {c.organo ? `${c.organo} · ` : ''}{fmtFecha(c.fecha)}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 8 }}>
                  Fuente: BDNS (Base de Datos Nacional de Subvenciones). Importes tal cual los publica el organismo.
                </p>
              </>
            )}
          </section>
        </div>

        {/* Pie con enlaces externos */}
        <footer style={{ borderTop: '1px solid #ECECEF', padding: '12px 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {org.website && (
            <a href={org.website} target="_blank" rel="noopener noreferrer" style={footLink}>
              Sitio web ⟶
            </a>
          )}
          {iatiRef && (
            <a
              href={`https://d-portal.org/ctrack.html#view=main&publisher=${encodeURIComponent(iatiRef)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={footLink}
            >
              Ver en d-portal (IATI) ⟶
            </a>
          )}
          {nif && (
            <a
              href={`https://www.infosubvenciones.es/bdnstrans/GE/es/concesiones?beneficiario=${encodeURIComponent(nif)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={footLink}
            >
              Buscar en BDNS ⟶
            </a>
          )}
        </footer>
      </aside>
    </>
  )
}

// ── Estilos compartidos locales ─────────────────────────────────────────────
const chipOnHero: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.18)',
  color: '#fff',
}
const footLink: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: ACCENT_DARK,
  textDecoration: 'none',
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const isNull = value === 'n/d' || value === '—'
  return (
    <div
      style={{
        flex: 1,
        background: accent ? 'rgba(22,163,74,0.06)' : '#F8FAFC',
        border: `1px solid ${accent ? 'rgba(22,163,74,0.22)' : '#ECECEF'}`,
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: isNull ? '#cbd5e1' : accent ? ACCENT_DARK : '#1d1d1f',
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default OrgFicha
