'use client'
/**
 * <Lic*> · helpers compartidos · Tercer Sector v3 · Sprint TS7 (Licitaciones)
 *
 * Constantes y micro-componentes que comparten todos los sub-componentes de la
 * vista de Licitaciones (centerpiece del sector): etiquetas y colores de NIVEL y
 * de FUENTE, formateadores de importe/fecha/idioma, presets de CPV útiles a ONGs,
 * y primitivas de UI (chip, badge, etiqueta de campo). Sin red, sin estado.
 *
 * El ángulo de esta vista es tercer sector + multinivel internacional + análisis
 * de pliegos por IA; las licitaciones generales españolas viven en /licitaciones.
 *
 * Cero emojis (CLAUDE.md §0.5): solo Unicode geométrico. Acento del sector verde.
 */
import type { NivelLicitacion, FuenteLicitacion } from '@/lib/tercer-sector/licitaciones/types'

export const ACCENT = '#16A34A'
export const ACCENT_DARK = '#15803D'

// ─────────────────────────────────────────────────────────────────
// NIVEL administrativo · etiqueta legible + color del badge + glyph
// ─────────────────────────────────────────────────────────────────
export interface NivelMeta {
  id: NivelLicitacion
  label: string
  short: string
  color: string
  glyph: string
  desc: string
}

/** Orden de presentación = de lo más cercano (CCAA) a lo más lejano (org. int.). */
export const NIVELES: NivelMeta[] = [
  { id: 'ccaa', label: 'CCAA y entidades locales', short: 'CCAA', color: '#16A34A', glyph: '◧', desc: 'Comunidad autónoma / ayuntamiento (ES)' },
  { id: 'nacional_es', label: 'Estatal España', short: 'Estatal ES', color: '#0EA5E9', glyph: '◨', desc: 'Administración General del Estado (ES)' },
  { id: 'ue', label: 'Unión Europea', short: 'UE', color: '#6366F1', glyph: '⬡', desc: 'Instituciones UE · TED · SEDIA grants' },
  { id: 'pais_extranjero', label: 'Otros países', short: 'País extr.', color: '#F59E0B', glyph: '◑', desc: 'Gobierno central de otro país' },
  { id: 'regional_extranjero', label: 'Regional extranjero', short: 'Regional extr.', color: '#EC4899', glyph: '◔', desc: 'Estado / provincia / región fuera de ES' },
  { id: 'org_internacional', label: 'Organizaciones internacionales', short: 'Org. int.', color: '#8B5CF6', glyph: '◉', desc: 'World Bank · BID · UNGM · bancos de desarrollo' },
]

const NIVEL_BY_ID: Record<string, NivelMeta> = Object.fromEntries(NIVELES.map((n) => [n.id, n]))

export function nivelMeta(id: string | null | undefined): NivelMeta {
  return (id && NIVEL_BY_ID[id]) || { id: 'ccaa', label: id || '—', short: id || '—', color: '#94A3B8', glyph: '◦', desc: '' }
}

// ─────────────────────────────────────────────────────────────────
// FUENTE · etiqueta legible + URL del portal oficial (para créditos honestos)
// ─────────────────────────────────────────────────────────────────
export interface FuenteMeta {
  label: string
  url: string
}

export const FUENTES: Record<FuenteLicitacion, FuenteMeta> = {
  place: { label: 'PLACE / PLACSP', url: 'https://contrataciondelestado.es' },
  bdns: { label: 'BDNS (subvenciones)', url: 'https://www.infosubvenciones.es' },
  ted: { label: 'TED — Tenders Electronic Daily', url: 'https://ted.europa.eu' },
  sedia: { label: 'EU Funding & Tenders (SEDIA)', url: 'https://ec.europa.eu/info/funding-tenders' },
  worldbank: { label: 'World Bank Procurement', url: 'https://projects.worldbank.org/en/projects-operations/procurement' },
  'uk-ocds': { label: 'UK Find a Tender', url: 'https://www.find-tender.service.gov.uk' },
  tendersguru: { label: 'Tenders.guru', url: 'https://tenders.guru' },
  opentender: { label: 'OpenTender.eu', url: 'https://opentender.eu' },
  grantsgov: { label: 'Grants.gov (EE. UU.)', url: 'https://www.grants.gov' },
  prozorro: { label: 'ProZorro (Ucrania)', url: 'https://prozorro.gov.ua' },
  austender: { label: 'AusTender (Australia)', url: 'https://www.tenders.gov.au' },
  secop: { label: 'SECOP II (Colombia)', url: 'https://www.colombiacompra.gov.co' },
  dncp: { label: 'DNCP (Paraguay)', url: 'https://www.contrataciones.gov.py' },
  // TS6 · CCAA España (open-data autonómico/municipal) + ONU
  catalunya: { label: 'Generalitat de Catalunya', url: 'https://contractaciopublica.cat' },
  castillaleon: { label: 'Junta de Castilla y León', url: 'https://analisis.datosabiertos.jcyl.es' },
  euskadi: { label: 'Open Data Euskadi', url: 'https://opendata.euskadi.eus' },
  madrid: { label: 'Ayuntamiento de Madrid', url: 'https://datos.madrid.es' },
  aragon: { label: 'Gobierno de Aragón', url: 'https://opendata.aragon.es' },
  ungm: { label: 'UNGM — ONU (Naciones Unidas)', url: 'https://www.ungm.org' },
}

export function fuenteLabel(f: string): string {
  return (FUENTES as Record<string, FuenteMeta>)[f]?.label ?? f
}

// ─────────────────────────────────────────────────────────────────
// Presets CPV útiles a ONGs (social / salud / cooperación / formación).
// El usuario también puede teclear cualquier prefijo CPV en el campo libre.
// ─────────────────────────────────────────────────────────────────
export interface CpvPreset {
  cpv: string
  label: string
}

export const CPV_PRESETS: CpvPreset[] = [
  { cpv: '85', label: 'Salud y servicios sociales' },
  { cpv: '853', label: 'Asistencia social' },
  { cpv: '85320', label: 'Servicios sociales' },
  { cpv: '80', label: 'Enseñanza y formación' },
  { cpv: '80500', label: 'Formación' },
  { cpv: '7525', label: 'Asuntos sociales' },
  { cpv: '752112', label: 'Cooperación al desarrollo' },
  { cpv: '75231', label: 'Asilo y refugio' },
  { cpv: '92', label: 'Cultura y comunidad' },
  { cpv: '98133', label: 'Asociaciones sociales' },
  { cpv: '15800', label: 'Alimentos (ayuda)' },
  { cpv: '33', label: 'Equipos médicos' },
]

// ─────────────────────────────────────────────────────────────────
// Formateadores (es-ES) · defensivos contra null
// ─────────────────────────────────────────────────────────────────

/** Importe en EUR compacto (1,2 M€ · 350 k€ · 4.500 €). null → '—'. */
export function formatEur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} B€`
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`
  if (abs >= 1_000) return `${Math.round(v / 1_000).toLocaleString('es-ES')} k€`
  return `${Math.round(v).toLocaleString('es-ES')} €`
}

/** Importe exacto con separadores y moneda (para la ficha). */
export function formatMoneda(v: number | null | undefined, moneda: string): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sym = moneda && moneda !== 'EUR' ? ` ${moneda}` : ' €'
  return `${Math.round(v).toLocaleString('es-ES')}${sym}`
}

/** Fecha ISO → dd/mm/aaaa (es-ES). Tolera fecha-hora y null. */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Días hasta el plazo (negativo = vencido). null si no hay plazo válido. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

const IDIOMAS: Record<string, string> = {
  es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', it: 'Italiano',
  pt: 'Portugués', ca: 'Catalán', eu: 'Euskera', gl: 'Gallego', nl: 'Neerlandés',
}
export function idiomaLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return IDIOMAS[code.toLowerCase()] ?? code.toUpperCase()
}

// ─────────────────────────────────────────────────────────────────
// Primitivas de UI compartidas
// ─────────────────────────────────────────────────────────────────

/** Pastilla de NIVEL coloreada (translúcida). */
export function NivelBadge({ nivel, size = 'md' }: { nivel: string; size?: 'sm' | 'md' }) {
  const m = nivelMeta(nivel)
  const fs = size === 'sm' ? 9.5 : 10.5
  return (
    <span
      title={m.desc}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: m.color,
        background: `${m.color}14`,
        border: `1px solid ${m.color}33`,
        borderRadius: 999,
        padding: size === 'sm' ? '1px 7px' : '2px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{m.glyph}</span>
      {m.short}
    </span>
  )
}

/** Pastilla neutra para metadatos (país, fuente, nº docs…). */
export function MetaPill({ children, title, mono = false }: { children: React.ReactNode; title?: string; mono?: boolean }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10.5,
        color: '#475569',
        background: '#F1F5F9',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      }}
    >
      {children}
    </span>
  )
}

/** Pastilla de urgencia de plazo (vencido / hoy / pronto / abierto). */
export function PlazoPill({ plazo }: { plazo: string | null | undefined }) {
  const d = diasHasta(plazo)
  if (d == null) return <MetaPill title="Sin plazo declarado">Plazo —</MetaPill>
  let color = '#16A34A'
  let txt = `${d} d`
  if (d < 0) {
    color = '#DC2626'
    txt = 'Vencido'
  } else if (d === 0) {
    color = '#DC2626'
    txt = 'Hoy'
  } else if (d <= 7) {
    color = '#EA580C'
  } else if (d <= 21) {
    color = '#CA8A04'
  }
  return (
    <span
      title={`Plazo · ${formatFecha(plazo)}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10.5,
        fontWeight: 700,
        color,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span aria-hidden="true">◴</span>
      {txt}
    </span>
  )
}

/** Etiqueta de campo de formulario (uppercase, sutil). */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 12.5,
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  boxSizing: 'border-box',
}
