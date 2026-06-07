'use client'
/**
 * <OrgFicha /> · Tercer Sector cockpit · vista Organizaciones · DOSSIER de
 * inteligencia (drawer lateral).
 *
 * Al seleccionar una entidad del directorio, carga su dossier desde
 *   GET /api/tercer-sector/organizaciones/[slug]/inteligencia
 * (fetch on-open con GUARD DE CARRERA: cada apertura incrementa un token y solo
 * el último resuelve; al cerrar/cambiar de org se ignora la respuesta vieja).
 *
 * El dossier se estructura en 7 secciones (cada una en su sub-componente Org*;
 * cada una degrada honesta usando `_meta.bloques[...]` del endpoint):
 *   1) Perfil institucional        → <OrgPerfil>
 *   2) Financiación pública (BDNS)  → <OrgSubvenciones>
 *   3) Oportunidades relacionadas   → <OrgOportunidades> (scoring ONG del endpoint)
 *   4) Cooperación internacional IATI → <OrgCooperacion>
 *   5) Territorios de actividad     → <OrgTerritorios>
 *   6) Transparencia y documentos   → <OrgDocumentos>
 *   7) Riesgos/observaciones        → <OrgRiesgos>
 *
 * Reglas CLAUDE.md: cero emojis (Unicode geométrico) · honestidad con nulos
 * (importes no publicados → «n/d», nunca inventados) · el scoring NO se
 * recalcula aquí (lo trae el endpoint).
 */
import { useEffect, useRef, useState } from 'react'
import {
  ACCENT,
  ACCENT_DARK,
  ambitoLabel,
  deriveIatiRef,
  sectorLabel,
  tipoLabel,
  type OrgRow,
} from './OrgShared'
import type { DossierData, DossierEnvelope } from './OrgDossierShared'
import { OrgPerfil } from './OrgPerfil'
import { OrgSubvenciones } from './OrgSubvenciones'
import { OrgOportunidades } from './OrgOportunidades'
import { OrgCooperacion } from './OrgCooperacion'
import { OrgTerritorios } from './OrgTerritorios'
import { OrgDocumentos } from './OrgDocumentos'
import { OrgRiesgos } from './OrgRiesgos'

type LoadStatus = 'idle' | 'loading' | 'done' | 'error'

interface Props {
  org: OrgRow | null
  onClose: () => void
}

export function OrgFicha({ org, onClose }: Props) {
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [data, setData] = useState<DossierData | null>(null)
  const [meta, setMeta] = useState<DossierEnvelope['_meta']>(undefined)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Token monotónico para el guard de carrera (cada apertura sube; solo el
  // último resuelve).
  const reqToken = useRef(0)

  // Cierre con Escape + foco en botón cerrar al abrir.
  useEffect(() => {
    if (!org) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [org, onClose])

  // Carga del dossier al seleccionar (fetch on-open con guard de carrera).
  useEffect(() => {
    if (!org) {
      setStatus('idle')
      setData(null)
      setMeta(undefined)
      setError(null)
      return
    }
    const token = ++reqToken.current
    setStatus('loading')
    setData(null)
    setMeta(undefined)
    setError(null)
    // Reset del scroll al abrir/cambiar de entidad.
    if (bodyRef.current) bodyRef.current.scrollTop = 0

    fetch(`/api/tercer-sector/organizaciones/${encodeURIComponent(org.slug)}/inteligencia`)
      .then((r) => r.json() as Promise<DossierEnvelope>)
      .then((j) => {
        if (token !== reqToken.current) return // respuesta obsoleta: ignorar
        if (j.ok && j.data) {
          setData(j.data)
          setMeta(j._meta)
          setStatus('done')
        } else {
          setError(j.error || 'dossier_sin_datos')
          setMeta(j._meta)
          setStatus('error')
        }
      })
      .catch((e) => {
        if (token !== reqToken.current) return
        setError(String((e as Error)?.message ?? e))
        setStatus('error')
      })
  }, [org])

  if (!org) return null

  const bloques = meta?.bloques ?? {}
  // Mientras carga el dossier, derivamos un iati_ref de tapadera para el footer
  // (cuando llega `data`, usamos el ref curado del catálogo).
  const iatiRefFallback = deriveIatiRef(org)
  const iatiRef = data?.org?.iati_refs?.[0] ?? iatiRefFallback
  const nif = (data?.org?.nif ?? org.nif ?? '').trim().toUpperCase() || null

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
        aria-label={`Dossier de ${org.nombre}`}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(600px, 96vw)',
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
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
                Dossier de inteligencia
              </div>
              <h3 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>
                {org.nombre}
              </h3>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Cerrar dossier"
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

        {/* Cuerpo scrolleable: dossier */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {status === 'loading' && <DossierSkeleton />}

          {status === 'error' && (
            <div
              style={{
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                borderRadius: 12,
                padding: '14px 16px',
                color: '#991B1B',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>No se pudo cargar el dossier</strong>
              {error === 'org_no_encontrada'
                ? 'La entidad no está en el catálogo de inteligencia. Puede ser una entrada nueva del directorio aún sin dossier.'
                : `Detalle: ${error ?? 'desconocido'}. Cierre y vuelva a abrir para reintentar.`}
            </div>
          )}

          {status === 'done' && data && (
            <>
              <OrgPerfil org={data.org} />
              <OrgSubvenciones
                subvenciones={data.subvenciones_bdns ?? []}
                totalEur={data.subvenciones_total_eur ?? null}
                block={bloques.subvenciones_bdns}
              />
              <OrgOportunidades
                oportunidades={data.oportunidades_relacionadas ?? []}
                block={bloques.oportunidades_relacionadas}
              />
              <OrgCooperacion iati={data.actividades_iati} block={bloques.actividades_iati} iatiRef={iatiRef} />
              <OrgTerritorios territorios={data.territorios} block={bloques.territorios} />
              <OrgDocumentos documentos={data.documentos ?? []} block={bloques.documentos} />
              <OrgRiesgos alertas={data.alertas ?? []} />

              {meta?.note && (
                <p style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4, lineHeight: 1.5, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                  {meta.note}
                </p>
              )}
            </>
          )}
        </div>

        {/* Pie con enlaces externos (citas de fuente) */}
        <footer style={{ borderTop: '1px solid #ECECEF', padding: '12px 20px', display: 'flex', gap: 14, flexWrap: 'wrap', flexShrink: 0 }}>
          {(data?.org?.website || org.website) && (
            <a href={(data?.org?.website || org.website) as string} target="_blank" rel="noopener noreferrer" style={footLink}>
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

// ── Skeleton de carga del dossier (honesto: muestra estructura de secciones) ──
function DossierSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} aria-busy="true" aria-label="Cargando dossier">
      <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true" style={{ color: ACCENT }}>◐</span>
        Agregando inteligencia multi-fuente (catálogo · BDNS · oportunidades · IATI)…
      </p>
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <div style={{ height: 12, width: '52%', background: '#EEF2F7', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 52, background: '#F4F7FB', borderRadius: 10 }} />
            <div style={{ flex: 1, height: 52, background: '#F4F7FB', borderRadius: 10 }} />
          </div>
          <div style={{ height: 44, background: '#F8FAFC', borderRadius: 10, marginBottom: 8 }} />
          <div style={{ height: 44, background: '#F8FAFC', borderRadius: 10 }} />
        </div>
      ))}
    </div>
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

export default OrgFicha
