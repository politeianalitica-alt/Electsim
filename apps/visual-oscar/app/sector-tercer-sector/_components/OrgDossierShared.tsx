'use client'
/**
 * OrgDossierShared · Tercer Sector cockpit · vista Organizaciones (ficha → dossier).
 *
 * Contratos TS y átomos presentacionales compartidos por los sub-componentes
 * `Org*` del DOSSIER de inteligencia (la ficha-drawer). Calcan el `data` del
 * endpoint `GET /api/tercer-sector/organizaciones/[slug]/inteligencia` (route
 * handler en `app/api/.../inteligencia/route.ts`), que agrega multi-fuente con
 * degradación honesta por bloque.
 *
 * Reglas CLAUDE.md: cero emojis (Unicode geométrico) · honestidad con nulos
 * (importes no publicados → «n/d», nunca inventados) · no se duplica lógica de
 * scoring (la trae el endpoint en cada OportunidadTS).
 */
import { ACCENT, ACCENT_DARK, ACCENT_SOFT } from './OrgShared'
import type { OportunidadTS } from '@/lib/tercer-sector/oportunidades/types'

// ─────────────────────────────────────────────────────────────────────────
// Contratos del dossier (subset, calcado del route handler de /inteligencia)
// ─────────────────────────────────────────────────────────────────────────

/** Organización en su forma de catálogo enriquecido (la sirve el endpoint). */
export interface DossierOrg {
  slug: string
  nombre: string
  nif?: string | null
  tipo: string
  sector: string
  ambito: string
  ccaa?: string | null
  ingresos_eur?: number | null
  empleados?: number | null
  irpf_07?: boolean
  website?: string | null
  fuente: string
  fecha_ref: string
  registro_ids?: {
    aecid_ongd?: string
    registro_nacional_asociaciones?: string
    registro_fundaciones?: string
    eu_transparency_register?: string
  }
  acreditaciones?: {
    fundacion_lealtad?: boolean
    coordinadora_ongd?: boolean
    plataforma_tercer_sector?: boolean
    cepes?: boolean
  }
  actividad_territorial?: {
    ccaa_presencia?: string[]
    paises_intervencion?: string[]
  }
  transparencia?: {
    memoria_url?: string
    cuentas_url?: string
    auditoria_url?: string
    portal_transparencia_url?: string
    ultimo_ejercicio?: string
  }
  iati_refs?: string[]
  tags_analista?: string[]
}

/** Subvención BDNS atribuida a la org (por NIF o por nombre normalizado). */
export interface DossierSubvencion {
  id: string
  importe_eur: number | null
  convocatoria: string | null
  organo: string | null
  nivel: string | null
  territorio: string | null
  fecha: string | null
  match: 'nif' | 'nombre'
}

/** Documento de transparencia (URLs reales del catálogo, no inventadas). */
export interface DossierDocumento {
  nombre: string
  url: string
  tipo: 'memoria' | 'cuentas' | 'auditoria' | 'transparencia' | 'web'
  fuente: string
}

/** Facetas país/sector del perfil IATI (code+name+count resueltos). */
export interface DossierFacet {
  code: string
  name: string
  count: number
}

/** Perfil IATI de la org (lo que devuelve fetchIatiOrgProfile). */
export interface DossierIati {
  org_ref: string
  org_name: string
  total_activities: number
  total_disbursed_eur: number | null
  top_countries: DossierFacet[]
  top_sectors: DossierFacet[]
  yearly_disbursements: { year: number; value_eur: number; count: number }[]
  fetched_at?: string
}

/** Territorios de actividad de la org (sede + presencia + países). */
export interface DossierTerritorios {
  sede_ccaa: { key: string; name: string } | null
  ccaa_presencia: { key: string; name: string }[]
  paises_intervencion: string[]
  ambito: string
}

/** `data` del envelope de /inteligencia. */
export interface DossierData {
  org: DossierOrg
  subvenciones_bdns: DossierSubvencion[]
  subvenciones_total_eur: number | null
  oportunidades_relacionadas: OportunidadTS[]
  actividades_iati: DossierIati | null
  territorios: DossierTerritorios
  documentos: DossierDocumento[]
  alertas: string[]
  resumen?: {
    sector?: string
    sector_label?: string
    tiene_iati?: boolean
    num_subvenciones?: number
    num_documentos?: number
  }
}

/** Metadata por bloque (de `_meta.bloques` del endpoint) para degradar honesto. */
export interface BlockMeta {
  ok: boolean
  count?: number
  error?: string
  note?: string
}

/** Envelope completo del endpoint de inteligencia. */
export interface DossierEnvelope {
  ok: boolean
  data: DossierData | null
  error?: string
  fetched_at?: string
  source_url?: string
  _meta?: {
    bloques?: Record<string, BlockMeta>
    note?: string
    [k: string]: unknown
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Etiquetas locales del dossier (no duplican taxonomías de lib)
// ─────────────────────────────────────────────────────────────────────────

/** Nivel administrativo de una subvención BDNS → etiqueta legible. */
export function nivelLabel(nivel: string | null | undefined): string {
  if (!nivel) return 'n/d'
  const map: Record<string, string> = {
    estatal: 'Estatal',
    nacional: 'Estatal',
    nacional_es: 'Estatal',
    autonomico: 'Autonómico',
    ccaa: 'Autonómico',
    local: 'Local',
    municipal: 'Local',
    ue: 'Unión Europea',
    europeo: 'Unión Europea',
  }
  return map[nivel.toLowerCase()] ?? nivel.replace(/_/g, ' ')
}

/** Tipo de oportunidad → etiqueta corta legible. */
export function tipoOportunidadLabel(t: string): string {
  const map: Record<string, string> = {
    subvencion: 'Subvención',
    licitacion: 'Licitación',
    grant_ue: 'Grant UE',
    cooperacion_internacional: 'Cooperación',
    convenio: 'Convenio',
    premio: 'Premio',
    otro: 'Otro',
  }
  return map[t] ?? t.replace(/_/g, ' ')
}

// Sectores DAC (raíz de 3 dígitos) → nombre legible (subset cooperación ES).
const DAC_ROOT: Record<string, string> = {
  '111': 'Educación', '112': 'Educación básica', '121': 'Salud', '122': 'Salud básica',
  '130': 'Población / salud reproductiva', '140': 'Agua y saneamiento',
  '151': 'Gobierno y soc. civil', '152': 'Prevención de conflictos', '160': 'Otros sociales',
  '210': 'Transporte', '230': 'Energía', '311': 'Agricultura', '410': 'Medio ambiente',
  '430': 'Otros productivos', '510': 'Ayuda presupuestaria', '520': 'Ayuda alimentaria',
  '720': 'Ayuda de emergencia', '730': 'Reconstrucción', '740': 'Prevención de desastres',
  '998': 'Sin asignar',
}

/** Nombre legible de un sector DAC a partir de su código (usa el name si viene). */
export function dacFacetLabel(f: DossierFacet): string {
  if (f.name && f.name !== f.code) return f.name
  return DAC_ROOT[f.code.slice(0, 3)] ?? `Sector ${f.code}`
}

// ─────────────────────────────────────────────────────────────────────────
// Colores de aptitud (score ONG) — accesibles, consistentes con el cockpit
// ─────────────────────────────────────────────────────────────────────────

export function scoreTone(label: string): { color: string; bg: string; txt: string } {
  switch (label) {
    case 'alta':
      return { color: ACCENT_DARK, bg: ACCENT_SOFT, txt: 'Apta · alta' }
    case 'media':
      return { color: '#CA8A04', bg: 'rgba(202,138,4,0.12)', txt: 'Apta · media' }
    case 'baja':
      return { color: '#64748b', bg: '#F1F5F9', txt: 'Apta · baja' }
    default:
      return { color: '#94a3b8', bg: '#F8FAFC', txt: 'Incierta' }
  }
}

export function riesgoTone(riesgo: string): { color: string; txt: string } {
  switch (riesgo) {
    case 'bajo':
      return { color: ACCENT_DARK, txt: 'Riesgo bajo' }
    case 'medio':
      return { color: '#CA8A04', txt: 'Riesgo medio' }
    case 'alto':
      return { color: '#DC2626', txt: 'Riesgo alto' }
    default:
      return { color: '#94a3b8', txt: 'Riesgo incierto' }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Átomos de sección compartidos por todos los Org* del dossier
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cabecera de sección del dossier: glyph + título + nota + opcional «count
 * pill». La nota degrada honesto (ej. «muestra reciente, no histórico»).
 */
export function DossierSection({
  glyph,
  title,
  note,
  count,
  children,
}: {
  glyph: string
  title: string
  note?: string
  count?: number | null
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span aria-hidden="true" style={{ color: ACCENT, fontSize: 14, transform: 'translateY(1px)' }}>
          {glyph}
        </span>
        <h4
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 800,
            color: '#1d1d1f',
            letterSpacing: '-0.01em',
            flex: 1,
          }}
        >
          {title}
        </h4>
        {count != null && count > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: ACCENT_DARK,
              background: ACCENT_SOFT,
              borderRadius: 999,
              padding: '1px 8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count}
          </span>
        )}
      </div>
      {note && <p style={{ margin: '-4px 0 10px 22px', fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{note}</p>}
      <div style={{ paddingLeft: 22 }}>{children}</div>
    </section>
  )
}

/** Empty / loading / error state sobrio para un bloque del dossier. */
export function DossierNote({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'error' | 'loading'
}) {
  const color = tone === 'error' ? '#B45309' : '#94a3b8'
  return (
    <p
      style={{
        fontSize: 11.5,
        color,
        margin: '4px 0',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
      }}
    >
      {tone === 'loading' && (
        <span aria-hidden="true" style={{ color: ACCENT, opacity: 0.7 }}>
          ◐
        </span>
      )}
      {tone === 'error' && (
        <span aria-hidden="true" style={{ color }}>
          !
        </span>
      )}
      <span>{children}</span>
    </p>
  )
}

/** KPI compacto reusado dentro del dossier (importes en € o «n/d»). */
export function DossierKpi({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  const isNull = value === 'n/d' || value === '—'
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: accent ? ACCENT_SOFT : '#F8FAFC',
        border: `1px solid ${accent ? 'rgba(22,163,74,0.22)' : '#ECECEF'}`,
        borderRadius: 10,
        padding: '9px 11px',
      }}
    >
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: isNull ? '#cbd5e1' : accent ? ACCENT_DARK : '#1d1d1f',
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 2,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  )
}

/** Tarjeta-fila estándar del dossier (fondo suave + borde). */
export function DossierCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px', background: '#FAFAFA' }}>
      {children}
    </div>
  )
}

/** Pequeña pastilla de etiqueta (reutiliza paleta del sector). */
export function DossierPill({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode
  tone?: 'accent' | 'neutral' | 'amber' | 'red'
  title?: string
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    accent: { bg: ACCENT_SOFT, fg: ACCENT_DARK },
    neutral: { bg: '#F1F5F9', fg: '#475569' },
    amber: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309' },
    red: { bg: 'rgba(220,38,38,0.10)', fg: '#B91C1C' },
  }
  const t = tones[tone] ?? tones.neutral
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        padding: '2px 8px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
