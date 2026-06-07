'use client'
/**
 * CoopShared · Tercer Sector v3 · TercerSectorShell · Sprint TS5
 *
 * Primitivas y utilidades compartidas SOLO por la vista «Cooperación
 * internacional (IATI)» y sus sub-componentes (Coop / Iati). Mantiene la paleta
 * (verde tercer sector), los formateadores es-ES, los helpers de codelists
 * (código→nombre con fallback) y un par de átomos de UI (empty-state, nota de
 * degradación, badge de código) para no repetirlos en cada panel.
 *
 * Por qué un módulo propio y no tocar primitivas existentes: el sprint TS5 solo
 * puede editar TSCooperacionView + sub-componentes nuevos. HeroKpis sí se reusa
 * (es genérico); lo demás se encapsula aquí.
 *
 * Cero emojis · Unicode geométrico (CLAUDE.md §0.5).
 */
import type { CodelistsData } from '@/lib/tercer-sector/iati-types'

// ─────────────────────────────────────────────────────────────────────────
// Paleta (verde tercer sector, idéntica al resto de vistas del shell)
// ─────────────────────────────────────────────────────────────────────────
export const ACCENT = '#16A34A'
export const ACCENT_DARK = '#15803D'
/** Escala verde secuencial (claro→oscuro) para el coroplético y las barras. */
export const GREEN_RAMP = ['#DCFCE7', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#15803D']
/** Color neutro para países/valores sin dato. */
export const NEUTRAL = '#E5E7EB'

// ─────────────────────────────────────────────────────────────────────────
// Formateadores (es-ES) — defensivos ante null/undefined/NaN
// ─────────────────────────────────────────────────────────────────────────

/** Entero con separador de miles. `null`/NaN → '—'. */
export function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('es-ES')
}

/** Importe EUR compacto (k / M / mil M). `null` → '—'. Nunca inventa FX. */
export function fmtEur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil M€`
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k€`
  return `${Math.round(v).toLocaleString('es-ES')} €`
}

/** Importe EUR completo (para tooltips). */
export function fmtEurFull(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${Math.round(v).toLocaleString('es-ES')} €`
}

/** Devuelve el valor en M€ (number) para los KPIs hero; null si no hay dato. */
export function toMillones(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return v / 1_000_000
}

// ─────────────────────────────────────────────────────────────────────────
// Resolución de códigos → nombre (codelists vivos + fallback estático)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fallback ISO-2 → nombre país (subset cooperación ES). Solo se usa si los
 * codelists vivos (keyless) no están disponibles o no traen el código. Espejo
 * del mapa que ya vivía en la página plana, para no degradar a "ET" pelado.
 */
export const COUNTRY_FALLBACK: Record<string, string> = {
  UA: 'Ucrania', MA: 'Marruecos', SN: 'Senegal', HT: 'Haití',
  CO: 'Colombia', PE: 'Perú', NI: 'Nicaragua', GT: 'Guatemala',
  ET: 'Etiopía', MZ: 'Mozambique', BO: 'Bolivia', PS: 'Palestina',
  SY: 'Siria', YE: 'Yemen', AF: 'Afganistán', MM: 'Myanmar',
  CD: 'RD Congo', SS: 'Sudán del Sur', CU: 'Cuba', DO: 'R. Dominicana',
  EC: 'Ecuador', SV: 'El Salvador', HN: 'Honduras', PY: 'Paraguay',
  LB: 'Líbano', JO: 'Jordania', TN: 'Túnez', DZ: 'Argelia',
  MR: 'Mauritania', BF: 'Burkina Faso', ML: 'Malí', NE: 'Níger',
  MX: 'México', BR: 'Brasil', AR: 'Argentina', CL: 'Chile',
  IN: 'India', KE: 'Kenia', UG: 'Uganda', TZ: 'Tanzania',
  CM: 'Camerún', GH: 'Ghana', RW: 'Ruanda', BD: 'Bangladés',
  PH: 'Filipinas', VN: 'Vietnam', NP: 'Nepal', IQ: 'Irak',
  TD: 'Chad', SO: 'Somalia', SD: 'Sudán', VE: 'Venezuela',
}

/**
 * Fallback DAC (3 primeros dígitos) → nombre de grupo sectorial. Solo se usa si
 * los codelists no traen el código de 5 dígitos. Espejo de la página plana.
 */
export const SECTOR_GROUP_FALLBACK: Record<string, string> = {
  '111': 'Educación', '112': 'Educación básica', '113': 'Educación secundaria',
  '114': 'Educación superior', '121': 'Salud general', '122': 'Salud básica',
  '130': 'Población y salud reproductiva', '140': 'Agua y saneamiento',
  '151': 'Gobierno y sociedad civil', '152': 'Prevención de conflictos',
  '160': 'Otros servicios sociales', '210': 'Transporte', '220': 'Comunicaciones',
  '230': 'Energía', '240': 'Servicios financieros', '250': 'Empresa',
  '311': 'Agricultura', '312': 'Silvicultura', '313': 'Pesca',
  '321': 'Industria', '331': 'Comercio', '410': 'Medio ambiente',
  '430': 'Otros multisectorial', '510': 'Ayuda presupuestaria',
  '520': 'Ayuda alimentaria', '600': 'Deuda', '720': 'Ayuda de emergencia',
  '730': 'Reconstrucción', '740': 'Prevención de desastres',
  '910': 'Costes administrativos', '920': 'Apoyo a ONG', '998': 'Sin asignar',
}

/** Resuelve un país ISO-2 a nombre (codelists vivos → fallback → código). */
export function countryName(codelists: CodelistsData | null, iso2: string): string {
  if (!iso2) return ''
  const up = iso2.toUpperCase()
  return codelists?.countries[up]?.name ?? COUNTRY_FALLBACK[up] ?? up
}

/** Resuelve un sector DAC a nombre (codelists vivos → grupo 3-díg → código). */
export function sectorName(codelists: CodelistsData | null, code: string): string {
  if (!code) return ''
  const exact = codelists?.sectors[code]?.name
  if (exact) return exact
  const group = SECTOR_GROUP_FALLBACK[code.slice(0, 3)]
  if (group) return group
  return code
}

/** Bandera emoji-free: las 2 letras del ISO en una pastilla monoespaciada. */
export function CodeBadge({ code, title }: { code: string; title?: string }) {
  return (
    <code
      title={title}
      style={{
        fontSize: 10,
        fontWeight: 700,
        background: '#E2E8F0',
        color: '#475569',
        padding: '1px 5px',
        borderRadius: 4,
        marginRight: 6,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.04em',
      }}
    >
      {code}
    </code>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Átomos de estado (empty / nota de degradación)
// ─────────────────────────────────────────────────────────────────────────

/** Empty-state pequeño dentro de un panel (sin datos / sin key). */
export function CoopEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '28px 18px',
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12.5,
        lineHeight: 1.55,
        background: '#F8FAFC',
        border: '1px dashed #E2E8F0',
        borderRadius: 10,
      }}
    >
      {children}
    </div>
  )
}

/** Skeleton genérico (altura configurable) para mientras carga. */
export function CoopSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        borderRadius: 10,
        background:
          'linear-gradient(90deg, #F1F5F9 25%, #E8EEF4 37%, #F1F5F9 63%)',
        backgroundSize: '400% 100%',
        animation: 'coopShimmer 1.4s ease infinite',
      }}
    >
      <style>{`@keyframes coopShimmer{0%{background-position:100% 0}100%{background-position:0 0}}`}</style>
    </div>
  )
}

/**
 * Banda de aviso de modo degradado (sin IATI_API_KEY): ámbar, honesta, con la
 * explicación exacta del backend (`degraded_reason`) y el dato keyless que SÍ se
 * muestra. CLAUDE.md: degradación honesta, nunca inventar.
 */
export function DegradedBanner({ reason }: { reason?: string | null }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 14,
      }}
    >
      <span aria-hidden="true" style={{ color: '#B45309', fontSize: 16, lineHeight: 1.2 }}>
        !
      </span>
      <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
        <strong style={{ fontWeight: 700 }}>Modo degradado · requiere IATI_API_KEY.</strong>{' '}
        {reason ||
          'Sin IATI_API_KEY el Datastore no responde: se muestra el directorio de ONGD reportantes (IATI Registry, keyless). Las facetas de país receptor, sector DAC, importes y desembolsos requieren configurar IATI_API_KEY en las variables de entorno.'}{' '}
        <a
          href="https://developer.iatistandard.org/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#B45309', fontWeight: 700, textDecoration: 'underline' }}
        >
          Registro gratuito (tier Exploratory) →
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch helper del envelope IATI ({ ok, data, degraded?, ... })
// ─────────────────────────────────────────────────────────────────────────

/** Forma mínima del envelope que consumimos (superset tolerado). */
export interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  degraded?: boolean
  degraded_reason?: string
  fetched_at?: string
  source_url?: string
}

/**
 * GET tipado de un endpoint IATI. Nunca lanza: ante fallo de red devuelve un
 * envelope `{ ok:false }`. Pensado para usarse con AbortSignal desde efectos.
 */
export async function getEnvelope<T>(url: string, signal?: AbortSignal): Promise<Envelope<T>> {
  try {
    const r = await fetch(url, { signal, cache: 'no-store' })
    const j = (await r.json()) as Envelope<T>
    return j
  } catch (e: unknown) {
    return {
      ok: false,
      data: null,
      error: (e as Error)?.name === 'AbortError' ? 'aborted' : String((e as Error)?.message ?? e),
    }
  }
}
