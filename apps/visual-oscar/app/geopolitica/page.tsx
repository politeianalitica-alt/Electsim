'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { COUNTRY_DAFO, type CountryDafo } from '@/lib/country-dafo'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// ── helpers ──────────────────────────────────────────────────────────────────
// Mapeo nivel geopolítico → meta visual (igual estilo que /alertas)
type NivelGeo = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
const NIVEL_META: Record<NivelGeo, { label: string; color: string; bg: string; ring: string; pulse?: boolean }> = {
  'CRITICO': { label: 'CRÍTICA', color: '#7F1D1D', bg: 'rgba(127,29,29,0.16)',  ring: 'rgba(127,29,29,0.7)',  pulse: true },
  'ALTO':    { label: 'ALTA',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  ring: 'rgba(220,38,38,0.50)' },
  'MEDIO':   { label: 'MEDIA',   color: '#F97316', bg: 'rgba(249,115,22,0.10)', ring: 'rgba(249,115,22,0.50)' },
  'BAJO':    { label: 'BAJA',    color: '#EAB308', bg: 'rgba(234,179,8,0.10)',  ring: 'rgba(234,179,8,0.45)' },
}
function catColor(c: string) {
  if (c === 'diplomatica') return '#1F4E8C'
  if (c === 'empresarial') return '#2d8a39'
  if (c === 'militar') return '#c42c2c'
  if (c === 'energetica') return '#b25000'
  if (c === 'energia') return '#b25000'
  if (c === 'migracion') return '#7C3AED'
  if (c === 'comercio') return '#0F766E'
  if (c === 'union_europea') return '#1F4E8C'
  return '#6e6e73'
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso?.slice(0, 16) ?? '—'
  }
}

// Banderas emoji por código ISO-3 (44+ países curados)
const ISO_TO_FLAG: Record<string, string> = {
  // Vecindad y Magreb
  MAR: '🇲🇦', DZA: '🇩🇿', PRT: '🇵🇹', MRT: '🇲🇷', SEN: '🇸🇳',
  TUN: '🇹🇳', LBY: '🇱🇾', EGY: '🇪🇬', MLI: '🇲🇱',
  // Europa
  FRA: '🇫🇷', DEU: '🇩🇪', ITA: '🇮🇹', GBR: '🇬🇧', NLD: '🇳🇱',
  BEL: '🇧🇪', POL: '🇵🇱', SWE: '🇸🇪', CHE: '🇨🇭', GRC: '🇬🇷',
  // América
  USA: '🇺🇸', CAN: '🇨🇦', MEX: '🇲🇽', BRA: '🇧🇷', ARG: '🇦🇷',
  CHL: '🇨🇱', COL: '🇨🇴', PER: '🇵🇪', ECU: '🇪🇨', URY: '🇺🇾',
  BOL: '🇧🇴', CUB: '🇨🇺', VEN: '🇻🇪',
  // Asia-Pacífico
  CHN: '🇨🇳', JPN: '🇯🇵', KOR: '🇰🇷', IND: '🇮🇳', AUS: '🇦🇺',
  // Oriente Medio
  ISR: '🇮🇱', IRN: '🇮🇷', TUR: '🇹🇷', SAU: '🇸🇦',
  GAZ: '🇵🇸', PSE: '🇵🇸',
  // Conflicto
  RUS: '🇷🇺', UKR: '🇺🇦',
  // África subsahariana
  ZAF: '🇿🇦', NGA: '🇳🇬',
}
function flagFromIso(iso: string): string {
  return ISO_TO_FLAG[iso] || '🌐'
}

// CountryBadge — bandera + código ISO en círculo coloreado por categoría
// Combina la identificación visual rápida (bandera) con un look pulido
function CountryBadge({ iso, size = 44, color = '#1F4E8C' }: { iso: string; size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${color} 0%,${color}dd 100%)`,
      flexShrink: 0, lineHeight: 1, position: 'relative',
      boxShadow: `0 1px 3px ${color}40`,
      border: '2px solid #fff',
    }}>
      <span style={{ fontSize: size * 0.62, lineHeight: 1 }}>{flagFromIso(iso)}</span>
    </span>
  )
}

// Tabla inversa: nombre país → ISO. Usada cuando la API de presencia no envía iso.
const PAIS_TO_ISO: Record<string, string> = {
  Marruecos: 'MAR', Argelia: 'DZA', Portugal: 'PRT', Mauritania: 'MRT', Senegal: 'SEN',
  Túnez: 'TUN', Libia: 'LBY', Egipto: 'EGY', Mali: 'MLI',
  Francia: 'FRA', Alemania: 'DEU', Italia: 'ITA', 'Reino Unido': 'GBR', 'Países Bajos': 'NLD',
  Bélgica: 'BEL', Polonia: 'POL', Suecia: 'SWE', Suiza: 'CHE', Grecia: 'GRC',
  'Estados Unidos': 'USA', Canadá: 'CAN', México: 'MEX', Brasil: 'BRA', Argentina: 'ARG',
  Chile: 'CHL', Colombia: 'COL', Perú: 'PER', Ecuador: 'ECU', Uruguay: 'URY',
  Bolivia: 'BOL', Cuba: 'CUB', Venezuela: 'VEN',
  China: 'CHN', Japón: 'JPN', 'Corea del Sur': 'KOR', India: 'IND', Australia: 'AUS',
  Israel: 'ISR', Irán: 'IRN', Turquía: 'TUR', 'Arabia Saudí': 'SAU',
  Gaza: 'GAZ', Palestina: 'PSE',
  Rusia: 'RUS', Ucrania: 'UKR',
  Sudáfrica: 'ZAF', Nigeria: 'NGA',
}
function isoFromPais(pais: string): string {
  return PAIS_TO_ISO[pais] || ''
}

// Mapeo ISO → continente (para agrupar Presencia Española)
const ISO_TO_CONTINENT: Record<string, string> = {
  // Europa (incluye Reino Unido y Suiza, no UE pero geográficamente europeos)
  PRT: 'Europa', FRA: 'Europa', DEU: 'Europa', ITA: 'Europa', GBR: 'Europa',
  NLD: 'Europa', BEL: 'Europa', POL: 'Europa', SWE: 'Europa', CHE: 'Europa', GRC: 'Europa',
  // África (incluye Magreb)
  MAR: 'África', DZA: 'África', MRT: 'África', SEN: 'África', TUN: 'África',
  LBY: 'África', EGY: 'África', MLI: 'África', ZAF: 'África', NGA: 'África',
  // América
  USA: 'América', CAN: 'América', MEX: 'América', BRA: 'América', ARG: 'América',
  CHL: 'América', COL: 'América', PER: 'América', ECU: 'América', URY: 'América',
  BOL: 'América', CUB: 'América', VEN: 'América',
  // Asia-Pacífico
  CHN: 'Asia-Pacífico', JPN: 'Asia-Pacífico', KOR: 'Asia-Pacífico',
  IND: 'Asia-Pacífico', AUS: 'Asia-Pacífico',
  // Oriente Medio
  ISR: 'Oriente Medio', IRN: 'Oriente Medio', TUR: 'Oriente Medio',
  SAU: 'Oriente Medio', GAZ: 'Oriente Medio', PSE: 'Oriente Medio',
  // Eurasia
  RUS: 'Eurasia', UKR: 'Eurasia',
}
function continentFromIso(iso: string): string {
  return ISO_TO_CONTINENT[iso] || 'Otros'
}
// Orden de los continentes en el selector (más relevante para España primero)
const CONTINENT_ORDER = ['Europa', 'África', 'América', 'Oriente Medio', 'Eurasia', 'Asia-Pacífico', 'Otros']
const CONTINENT_COLOR: Record<string, string> = {
  'Europa':         '#1F4E8C',
  'África':         '#7C3AED',
  'América':        '#0F766E',
  'Oriente Medio':  '#DC2626',
  'Eurasia':        '#6e6e73',
  'Asia-Pacífico':  '#F97316',
  'Otros':          '#9CA3AF',
}

// Mapeo de dimension/sector → meta visual (para Impacto España, estilo Alertas)
const DIM_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  seguridad:    { label: 'SEGURIDAD',   color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  ring: 'rgba(220,38,38,0.50)'  },
  economica:    { label: 'ECONÓMICA',   color: '#F97316', bg: 'rgba(249,115,22,0.10)', ring: 'rgba(249,115,22,0.50)' },
  energetica:   { label: 'ENERGÉTICA',  color: '#EAB308', bg: 'rgba(234,179,8,0.12)',  ring: 'rgba(234,179,8,0.55)'  },
  diplomatica:  { label: 'DIPLOMÁTICA', color: '#1F4E8C', bg: 'rgba(31,78,140,0.08)',  ring: 'rgba(31,78,140,0.45)'  },
  social:       { label: 'SOCIAL',      color: '#0F766E', bg: 'rgba(15,118,110,0.08)', ring: 'rgba(15,118,110,0.45)' },
}
function dimMeta(dim: string) {
  return DIM_META[dim] || { label: dim.toUpperCase(), color: '#6e6e73', bg: 'rgba(0,0,0,0.04)', ring: 'rgba(0,0,0,0.18)' }
}

// Mapeo urgencia OSINT (1-5) → meta visual igual estilo Alertas Prioritarias
const URG_META: Record<number, { label: string; color: string; bg: string; ring: string; pulse?: boolean }> = {
  5: { label: 'CRÍTICA', color: '#7F1D1D', bg: 'rgba(127,29,29,0.16)',  ring: 'rgba(127,29,29,0.7)',  pulse: true },
  4: { label: 'ALTA',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  ring: 'rgba(220,38,38,0.50)' },
  3: { label: 'MEDIA',   color: '#F97316', bg: 'rgba(249,115,22,0.10)', ring: 'rgba(249,115,22,0.50)' },
  2: { label: 'BAJA',    color: '#EAB308', bg: 'rgba(234,179,8,0.10)',  ring: 'rgba(234,179,8,0.45)' },
  1: { label: 'INFO',    color: '#1F4E8C', bg: 'rgba(31,78,140,0.06)',  ring: 'rgba(31,78,140,0.35)' },
}
function urgMeta(u: number) {
  return URG_META[u] || URG_META[1]
}

// ── sub-components ────────────────────────────────────────────────────────────
// TabBar estilo pill (consistente con Panel Ejecutivo)
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{
      display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
      padding: 4, marginBottom: 18, overflowX: 'auto', maxWidth: '100%',
    }}>
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            border: 'none',
            background: active === i ? '#fff' : 'transparent',
            color: active === i ? '#1d1d1f' : '#6e6e73',
            padding: '7px 16px', borderRadius: 999,
            fontSize: 12.5, fontWeight: active === i ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: active === i ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 160ms',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// KPI card Apple-Newsroom · acent color en valor + sub
function KPICard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      padding: '16px 18px 14px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: accent }}/>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em',
                     color: '#6e6e73', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
                     letterSpacing: '-0.024em', lineHeight: 1, color: '#1d1d1f',
                     fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// HeroKPI · pequeño KPI translúcido para encajar sobre gradients del hero
function HeroKPI({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '10px 8px', borderRadius: 12,
      background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                     lineHeight: 1, color: '#fff', letterSpacing: '-0.018em',
                     fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                     opacity: 0.75, marginTop: 5, textTransform: 'uppercase', color: '#fff' }}>{label}</div>
    </div>
  )
}

// ─── DAFO Modal ───────────────────────────────────────────────────────────────
// Aparece al clicar una tarjeta de país. Muestra Debilidades / Amenazas /
// Fortalezas / Oportunidades sobre la relación con España.
function DafoModal({ pais, iso, onClose, extra }: {
  pais: string; iso: string; onClose: () => void;
  extra?: { score?: number; categoria?: string; intensidad?: number }
}) {
  const dafo: CountryDafo | null = COUNTRY_DAFO[pais] || null
  if (!dafo) return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 480, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <CountryBadge iso={iso} size={36} color="#1F4E8C"/>
          <p style={{ fontSize: 12, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{pais}</p>
        </div>
        <p style={{ fontSize: 14, color: '#1d1d1f', margin: 0 }}>
          DAFO no disponible todavía para este país. Estamos trabajando en ampliar la cobertura.
        </p>
        <button onClick={onClose} style={modalCloseBtn}>Cerrar</button>
      </div>
    </div>
  )
  const sections: Array<{ key: keyof Pick<CountryDafo, 'debilidades' | 'amenazas' | 'fortalezas' | 'oportunidades'>; label: string; short: string; color: string; bg: string }> = [
    { key: 'debilidades',   label: 'Debilidades',   short: 'D', color: '#DC2626', bg: 'rgba(220,38,38,0.06)'  },
    { key: 'amenazas',      label: 'Amenazas',      short: 'A', color: '#EA580C', bg: 'rgba(234,88,12,0.06)'  },
    { key: 'fortalezas',    label: 'Fortalezas',    short: 'F', color: '#0F766E', bg: 'rgba(15,118,110,0.06)' },
    { key: 'oportunidades', label: 'Oportunidades', short: 'O', color: '#1F4E8C', bg: 'rgba(31,78,140,0.06)'  },
  ]
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalBox}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 18px', borderBottom: '1px solid #ECECEF',
          background: 'linear-gradient(135deg,#0E7490 0%,#134E4A 100%)', color: '#fff',
          borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.30)',
              flexShrink: 0, lineHeight: 1,
            }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>{flagFromIso(iso)}</span>
            </span>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75, textTransform: 'uppercase', margin: '0 0 4px' }}>DAFO · Relación bilateral con España</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, lineHeight: 1.1 }}>{dafo.pais}</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar" style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>×</button>
          </div>
          <p style={{ fontSize: 13, opacity: 0.85, margin: '6px 0 0', lineHeight: 1.5, maxWidth: 720 }}>{dafo.resumen}</p>
          {(extra?.score !== undefined || extra?.intensidad !== undefined) && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {extra?.score !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', opacity: 0.85 }}>
                  Riesgo: <strong style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{extra.score.toFixed(1)}/10</strong>
                </span>
              )}
              {extra?.intensidad !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', opacity: 0.85 }}>
                  Presencia ES: <strong style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{extra.intensidad}/100</strong>
                </span>
              )}
              {extra?.categoria && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                                background: 'rgba(255,255,255,0.18)', color: '#fff', textTransform: 'capitalize' }}>{extra.categoria}</span>
              )}
            </div>
          )}
        </div>
        {/* Body — DAFO grid 2×2 */}
        <div style={{
          padding: 24, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14,
          maxHeight: '60vh', overflowY: 'auto',
        }}>
          {sections.map((s) => (
            <div key={s.key} style={{
              border: `1px solid ${s.color}30`, borderRadius: 14,
              padding: '14px 16px', background: s.bg,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 6,
                  background: s.color, color: '#fff',
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 12, lineHeight: 1, flexShrink: 0,
                }}>{s.short}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: s.color, letterSpacing: '-0.012em' }}>{s.label}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: '#1d1d1f' }}>
                {dafo[s.key].map((item, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, zIndex: 1000, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  animation: 'dafoOverlayIn 180ms ease-out',
}
const modalBox: React.CSSProperties = {
  background: '#fff', borderRadius: 20, maxWidth: 880, width: '100%',
  maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
  animation: 'dafoBoxIn 220ms cubic-bezier(0.18,0.89,0.32,1.28)',
  display: 'flex', flexDirection: 'column',
}
const modalCloseBtn: React.CSSProperties = {
  marginTop: 16, background: '#1d1d1f', color: '#fff', border: 'none',
  borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}

// ── types ─────────────────────────────────────────────────────────────────────
interface GeoStats {
  osint_24h: number
  alertas_activas: number
  paises_monitorizados: number
  presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
}
interface RiesgoItem {
  pais: string; iso: string; score: number; interes_espana: number; lat: number; lon: number; categoria: string
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string; urgencia: number; categoria: string; resumen: string; url?: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string; paises: string[]; descripcion: string; fuente: string; url?: string
}
interface ImpactoItem {
  id: string; titulo: string; dimension: string; severidad: number; horizonte: string; descripcion: string; paises_origen: string[]; url?: string
}
interface PresenciaItem {
  pais: string; iso?: string; lat: number; lon: number; categoria: string; intensidad: number
}

// ── main component ────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)
  const [osintUrgMin, setOsintUrgMin] = useState(1)
  const [osintCat, setOsintCat] = useState('all')
  // Filtro de dimensión/sector para TAB 3 Impacto España
  const [impactoDim, setImpactoDim] = useState<string>('all')
  // Orden de TAB 0 Teatro Global
  const [teatroOrden, setTeatroOrden] = useState<'importancia' | 'continente' | 'riesgo'>('importancia')
  // Orden de TAB 4 Presencia Española
  const [presenciaOrden, setPresenciaOrden] = useState<'importancia' | 'continente' | 'presencia'>('importancia')
  // Modal DAFO compartido entre Teatro Global y Presencia Española
  const [dafoOpen, setDafoOpen] = useState<{ pais: string; iso: string; extra?: { score?: number; categoria?: string; intensidad?: number } } | null>(null)

  const { data: geoStatsRaw, source, updatedAt, refresh } = useApi<GeoStats & { data?: GeoStats }>('/api/geopolitica/stats', { refreshInterval: 60_000 })
  const { data: riesgoRaw } = useApi<{ data: RiesgoItem[] }>('/api/geopolitica/riesgo', { refreshInterval: 120_000 })
  const { data: osintRaw, loading: loadingOsint } = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint', { refreshInterval: 60_000 })
  const { data: alertasRaw } = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 30_000 })
  const { data: impactosRaw } = useApi<{ data: ImpactoItem[] }>('/api/geopolitica/impactos', { refreshInterval: 120_000 })
  const { data: presenciaRaw } = useApi<{ data: PresenciaItem[] }>('/api/geopolitica/presencia', { refreshInterval: 120_000 })

  const geoStats: GeoStats = (geoStatsRaw as GeoStats) ?? { osint_24h: 0, alertas_activas: 0, paises_monitorizados: 0, presencia_activa: 0, alertas_count: { CRITICO: 0, ALTO: 0, MEDIO: 0 } }
  const riesgo: RiesgoItem[] = riesgoRaw?.data ?? []
  const osint: OsintItem[] = osintRaw?.data ?? []
  const alertas: AlertaItem[] = alertasRaw?.data ?? []
  const impactos: ImpactoItem[] = impactosRaw?.data ?? []
  const presencia: PresenciaItem[] = presenciaRaw?.data ?? []

  const kpiCards = [
    { label: 'Señales OSINT 24h',     value: geoStats.osint_24h,            accent: '#1F4E8C', sub: 'noticias internacionales con relevancia ES' },
    { label: 'Alertas activas',       value: geoStats.alertas_activas,      accent: '#DC2626', sub: `${geoStats.alertas_count?.CRITICO || 0} críticas · ${geoStats.alertas_count?.ALTO || 0} altas` },
    { label: 'Países monitorizados',  value: geoStats.paises_monitorizados, accent: '#0F766E', sub: 'cobertura geopolítica' },
    { label: 'Presencia España',      value: geoStats.presencia_activa,     accent: '#7C3AED', sub: 'iniciativas activas exterior' },
  ]

  // Ordenamos por interes_espana DESC (importancia para España).
  // Empate: el más relevante por riesgo geopolítico va primero.
  const riesgoSorted = [...riesgo].sort((a, b) => {
    if (b.interes_espana !== a.interes_espana) return b.interes_espana - a.interes_espana
    return b.score - a.score
  })
  const impactosSorted = [...impactos].sort((a, b) => b.severidad - a.severidad)

  // Mapeo país → interes_espana (derivado del dataset de riesgo). Lo usamos
  // para ordenar Presencia Española por importancia para España; si un país
  // no aparece en el dataset, caemos a la intensidad estructural curada.
  const interesByPais = new Map<string, number>()
  for (const r of riesgo) interesByPais.set(r.pais, r.interes_espana)
  const presenciaSorted = [...presencia].sort((a, b) => {
    const ai = interesByPais.get(a.pais) ?? a.intensidad / 10
    const bi = interesByPais.get(b.pais) ?? b.intensidad / 10
    if (bi !== ai) return bi - ai
    return b.intensidad - a.intensidad
  })

  const osintFiltered = osint.filter(
    (o) => o.urgencia >= osintUrgMin && (osintCat === 'all' || o.categoria === osintCat)
  )

  // alertas grouped by nivel
  const NIVEL_ORDER = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
  const alertasByNivel: Record<string, AlertaItem[]> = {}
  for (const a of alertas) {
    const k = ['CRITICO', 'ALTO', 'MEDIO'].includes(a.nivel) ? a.nivel : 'BAJO'
    if (!alertasByNivel[k]) alertasByNivel[k] = []
    alertasByNivel[k].push(a)
  }

  // presencia traces by categoria
  const PRESENCIA_CATS = ['diplomatica', 'empresarial', 'militar', 'energetica']
  const presenciaTraces = PRESENCIA_CATS.map((cat) => {
    const items = presencia.filter((p) => p.categoria === cat)
    return {
      type: 'scattergeo' as const,
      name: cat,
      lat: items.map((p) => p.lat),
      lon: items.map((p) => p.lon),
      text: items.map((p) => `${p.pais} (${p.intensidad})`),
      marker: {
        size: items.map((p) => p.intensidad / 10 + 8),
        color: catColor(cat),
        opacity: 0.85,
        line: { width: 1, color: '#fff' },
      },
      hovertemplate: '%{text}<extra></extra>',
    }
  })

  const geoLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    geo: {
      bgcolor: '#f0f4f8',
      landcolor: '#e2e8f0',
      oceancolor: '#cbd5e1',
      showocean: true,
      showland: true,
      projection: { type: 'natural earth' },
      showframe: false,
      coastlinecolor: '#94a3b8',
    },
    margin: { t: 0, b: 0, l: 0, r: 0 },
    height: 380,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background: 'linear-gradient(135deg,#0E7490 0%,#134E4A 100%)',
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
                        textTransform: 'uppercase', margin: '0 0 8px',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>CONTEXTO ESTRATÉGICO · GEOPOLÍTICA Y RRII</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
                          letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              España en el <em style={{ fontWeight: 300, fontStyle: 'italic',
                                          color: 'rgba(255,255,255,0.75)' }}>tablero global.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
              Riesgo geopolítico, OSINT, alertas internacionales, impactos sobre la agenda doméstica
              y presencia española en el exterior. Datos derivados de medios internacionales y feeds
              oficiales en tiempo real.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <HeroKPI label="OSINT 24h"   value={String(geoStats.osint_24h)}/>
            <HeroKPI label="Alertas"     value={String(geoStats.alertas_activas)}/>
            <HeroKPI label="Países"      value={String(geoStats.paises_monitorizados)}/>
          </div>
        </section>

        {/* ───── KPI strip ───── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {kpiCards.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} accent={k.accent} sub={k.sub}/>
          ))}
        </div>

        <TabBar
          items={['Teatro Global', 'OSINT', 'Alertas', 'Impacto España', 'Presencia Española', 'Análisis Politeia']}
          active={tab}
          onChange={setTab}
        />

        {/* TAB 0 — Teatro Global */}
        {tab === 0 && (() => {
          // 3 modos de orden:
          //  - importancia: por interes_espana DESC (default, ya en riesgoSorted)
          //  - riesgo:      por score DESC (urgencia geopolítica pura)
          //  - continente:  agrupado por continente, dentro por interes_espana DESC
          const teatroImportancia = riesgoSorted
          const teatroRiesgo = [...riesgo].sort((a, b) => b.score - a.score)
          const teatroBuckets = new Map<string, RiesgoItem[]>()
          for (const r of riesgo) {
            const cont = continentFromIso(r.iso)
            const cur = teatroBuckets.get(cont) || []
            cur.push(r)
            teatroBuckets.set(cont, cur)
          }
          for (const [k, arr] of Array.from(teatroBuckets.entries())) {
            arr.sort((a, b) => b.interes_espana - a.interes_espana || b.score - a.score)
            teatroBuckets.set(k, arr)
          }
          const teatroContinents = CONTINENT_ORDER.filter((c) => teatroBuckets.has(c))

          // Render reutilizable de tarjeta de país (riesgo)
          const renderRiesgoCard = (r: RiesgoItem) => {
            const sevColor = r.score >= 8 ? '#c42c2c' : r.score >= 6 ? '#b25000' : r.score >= 4 ? '#EAB308' : '#2d8a39'
            const sevLabel = r.score >= 8 ? 'ALTO' : r.score >= 6 ? 'MEDIO-ALTO' : r.score >= 4 ? 'MEDIO' : 'BAJO'
            const catC = catColor(r.categoria)
            const hasDafo = !!COUNTRY_DAFO[r.pais]
            return (
              <button
                key={r.iso}
                onClick={() => setDafoOpen({ pais: r.pais, iso: r.iso, extra: { score: r.score, categoria: r.categoria } })}
                title={hasDafo ? `Ver DAFO de ${r.pais} sobre la relación con España` : 'Más detalles'}
                style={{
                  background: '#fff', border: '1px solid #e8e8ed', borderRadius: 16,
                  padding: '18px 20px 16px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'left',
                  fontFamily: 'inherit', cursor: 'pointer', width: '100%',
                  transition: 'all 160ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';     e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: catC }}/>
                {hasDafo && (
                  <span style={{
                    position: 'absolute', top: 10, right: 10, fontSize: 9.5, fontWeight: 700,
                    letterSpacing: '0.08em', color: catC, background: `${catC}14`,
                    padding: '2px 6px', borderRadius: 4,
                  }}>DAFO →</span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <CountryBadge iso={r.iso} size={44} color={catC}/>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
                      letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.15,
                    }}>{r.pais}</div>
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      padding: '2px 8px', borderRadius: 999, background: `${catC}14`,
                      color: catC, fontSize: 10.5, fontWeight: 600,
                      letterSpacing: '0.04em', textTransform: 'capitalize',
                    }}>{r.categoria}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: `conic-gradient(${sevColor} ${r.score * 36}deg, #f5f5f7 0)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: '#fff',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', position: 'relative',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                        color: sevColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                      }}>{r.score.toFixed(1)}</span>
                      <span style={{ fontSize: 8, color: '#9CA3AF', letterSpacing: '0.06em' }}>/10</span>
                    </div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                      color: '#6e6e73', textTransform: 'uppercase', marginBottom: 2,
                    }}>Riesgo geopolítico</div>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: sevColor, marginBottom: 4,
                    }}>{sevLabel}</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Interés España</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1F4E8C', fontVariantNumeric: 'tabular-nums' }}>{r.interes_espana.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 5, background: '#f5f5f7', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(r.interes_espana / 10) * 100}%`, height: 5,
                      background: 'linear-gradient(90deg,#1F4E8C,#0F766E)',
                    }}/>
                  </div>
                </div>
              </button>
            )
          }

          return (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '20px 24px', marginBottom: 20 }}>
              <Plot
                data={[{
                  type: 'scattergeo',
                  lat: riesgoSorted.map((r) => r.lat),
                  lon: riesgoSorted.map((r) => r.lon),
                  text: riesgoSorted.map((r) => `${r.pais}<br>Score: ${r.score}<br>Interés ES: ${r.interes_espana}`),
                  marker: {
                    size: riesgoSorted.map((r) => r.score * 3),
                    color: riesgoSorted.map((r) => r.score),
                    colorscale: [
                      [0, '#2d8a39'],
                      [0.5, '#b25000'],
                      [1, '#c42c2c'],
                    ],
                    showscale: false,
                    opacity: 0.8,
                    line: { width: 1, color: '#fff' },
                  },
                  hovertemplate: '%{text}<extra></extra>',
                }]}
                layout={geoLayout as object}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>

            {/* Selector de orden */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ordenar por:</span>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {[
                  { v: 'importancia', l: 'Importancia para España' },
                  { v: 'continente',  l: 'Por continente' },
                  { v: 'riesgo',      l: 'Riesgo geopolítico' },
                ].map((o) => {
                  const active = teatroOrden === o.v
                  return (
                    <button key={o.v} onClick={() => setTeatroOrden(o.v as typeof teatroOrden)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border: 'none', borderRadius: 999, padding: '6px 14px',
                      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 140ms',
                    }}>{o.l}</button>
                  )
                })}
              </div>
              <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>· {riesgo.length} países en seguimiento</span>
            </div>

            {/* Vista 1: lista plana (importancia o riesgo) */}
            {teatroOrden !== 'continente' && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14,
              }}>
                {(teatroOrden === 'riesgo' ? teatroRiesgo : teatroImportancia).map(renderRiesgoCard)}
              </div>
            )}

            {/* Vista 2: agrupado por continente */}
            {teatroOrden === 'continente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {teatroContinents.map((cont) => {
                  const cc = CONTINENT_COLOR[cont] || '#9CA3AF'
                  const items = teatroBuckets.get(cont) || []
                  return (
                    <section key={cont}>
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12,
                        padding: '8px 14px', borderRadius: 10,
                        background: `${cc}10`, borderLeft: `3px solid ${cc}`,
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                          color: cc, letterSpacing: '-0.012em',
                        }}>{cont}</span>
                        <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>{items.length} países</span>
                      </div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14,
                      }}>
                        {items.map(renderRiesgoCard)}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
          )
        })()}

        {/* TAB 1 — OSINT (visual estilo Alertas Prioritarias + enlace a noticia) */}
        {tab === 1 && (
          <div>
            {/* Resumen contadores por urgencia (clicable: minimo) */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14,
            }}>
              {[5, 4, 3, 2, 1].map((u) => {
                const m = urgMeta(u)
                const cnt = osint.filter((o) => o.urgencia === u && (osintCat === 'all' || o.categoria === osintCat)).length
                const active = osintUrgMin === u
                return (
                  <button
                    key={u}
                    onClick={() => setOsintUrgMin(active ? 1 : u)}
                    title={`Filtrar por urgencia ≥ ${u}`}
                    style={{
                      textAlign: 'center', padding: '14px 8px', borderRadius: 12,
                      background: active ? m.color : m.bg,
                      border: `1px solid ${active ? m.color : m.ring}`,
                      fontFamily: 'inherit', cursor: 'pointer', transition: 'all 140ms',
                    }}
                  >
                    <span style={{
                      display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                      background: active ? '#fff' : m.color, marginBottom: 6,
                      animation: m.pulse ? 'alertPulse 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse && !active ? `0 0 12px ${m.color}` : undefined,
                    }}/>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
                      lineHeight: 1, color: active ? '#fff' : m.color, fontVariantNumeric: 'tabular-nums',
                    }}>{cnt}</div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
                      color: active ? '#fff' : 'inherit',
                      opacity: active ? 0.95 : 0.7, marginTop: 4, textTransform: 'uppercase',
                    }}>{m.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Selector de categoría + estado del filtro */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Categoría:</span>
              {[
                { v: 'all', l: 'Todas' },
                { v: 'migracion', l: 'Migración' },
                { v: 'militar', l: 'Militar' },
                { v: 'energia', l: 'Energía' },
                { v: 'diplomatica', l: 'Diplomática' },
                { v: 'comercio', l: 'Comercio' },
                { v: 'union_europea', l: 'UE' },
              ].map((c) => {
                const active = osintCat === c.v
                const cc = c.v === 'all' ? '#1d1d1f' : catColor(c.v)
                return (
                  <button key={c.v} onClick={() => setOsintCat(c.v)} style={{
                    background: active ? cc : '#fff',
                    color: active ? '#fff' : '#3a3a3d',
                    border: `1px solid ${active ? cc : '#ECECEF'}`,
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 140ms',
                  }}>{c.l}</button>
                )
              })}
              <span style={{ width: 1, height: 22, background: '#ECECEF', margin: '0 4px' }}/>
              <span style={{ fontSize: 12, color: '#6e6e73' }}>
                {loadingOsint ? 'Cargando…' : `${osintFiltered.length} señales`}
                {(osintUrgMin > 1 || osintCat !== 'all') && (
                  <button onClick={() => { setOsintUrgMin(1); setOsintCat('all') }} style={{
                    background: 'transparent', border: 'none', color: '#1F4E8C', marginLeft: 8,
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  }}>Quitar filtros ×</button>
                )}
              </span>
            </div>

            {/* Lista de señales OSINT estilo Alertas Prioritarias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {osintFiltered.length === 0 && !loadingOsint && (
                <div style={{
                  padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13,
                  background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
                }}>
                  No hay señales con los filtros seleccionados
                </div>
              )}
              {osintFiltered.map((o) => {
                const m = urgMeta(o.urgencia)            // urgencia → barra lateral + badge CRÍTICA/ALTA…
                const cc = catColor(o.categoria)         // sector → fondo + chip de categoría
                return (
                  <article key={o.id} style={{
                    display: 'grid', gridTemplateColumns: '6px 110px 1fr auto',
                    gap: 14, alignItems: 'center',
                    padding: '14px 18px 14px 0', borderRadius: 14,
                    // Fondo y borde del color del SECTOR (más subtle), no de la urgencia
                    background: `${cc}14`, border: `1px solid ${cc}55`,
                    position: 'relative', overflow: 'hidden',
                    animation: m.pulse ? 'alertCard 1.6s ease-in-out infinite' : undefined,
                  }}>
                    {/* Barra lateral conserva el color de la URGENCIA (señal primaria) */}
                    <div style={{
                      background: m.color, height: '100%',
                      boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                    }}/>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
                      {/* Badge urgencia: CRÍTICA / ALTA / MEDIA / BAJA / INFO */}
                      <span style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
                        color: '#fff', background: m.color,
                        padding: '3px 8px', borderRadius: 999,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        animation: m.pulse ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
                        boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
                      }}>
                        {m.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'alertDot 1s ease-in-out infinite' }}/>}
                        {m.label}
                      </span>
                      {/* Chip de sector con el color del sector (refuerzo visual del fondo) */}
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                        color: '#fff', background: cc,
                        padding: '2px 8px', borderRadius: 999,
                        textTransform: 'uppercase',
                      }}>{o.categoria.replace('_', ' ')}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>Urgencia {o.urgencia}/5</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                      }}>{o.titulo}</h3>
                      <p style={{ margin: '3px 0 6px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>{o.resumen}</p>
                      <span style={{ fontSize: 11, color: '#6e6e73' }}>
                        {o.fuente} · <span style={{ fontWeight: 600 }}>{fmtDate(o.fecha)}</span>
                      </span>
                    </div>
                    {o.url ? (
                      <a href={o.url} target="_blank" rel="noopener noreferrer" style={{
                        background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                        padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: m.color,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginRight: 18,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = m.bg; e.currentTarget.style.borderColor = m.ring }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECECEF' }}
                      >Leer noticia ↗</a>
                    ) : (
                      <span style={{
                        padding: '6px 12px', fontSize: 11.5, fontWeight: 500, color: '#9CA3AF',
                        fontFamily: 'inherit', flexShrink: 0, marginRight: 18,
                      }}>Sin enlace</span>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2 — Alertas (visual igual a Alertas Prioritarias) */}
        {tab === 2 && (
          <div>
            {/* Resumen contadores por nivel */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18,
            }}>
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as NivelGeo[]).map((lv) => {
                const m = NIVEL_META[lv]
                const cnt = alertasByNivel[lv]?.length || 0
                return (
                  <div key={lv} style={{
                    textAlign: 'center', padding: '14px 8px', borderRadius: 12,
                    background: m.bg, border: `1px solid ${m.ring}`,
                  }}>
                    <span style={{
                      display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                      background: m.color, marginBottom: 6,
                      animation: m.pulse ? 'alertPulse 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                    }}/>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
                      lineHeight: 1, color: m.color, fontVariantNumeric: 'tabular-nums',
                    }}>{cnt}</div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
                      opacity: 0.7, marginTop: 4, textTransform: 'uppercase',
                    }}>{m.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Lista de alertas estilo Alertas Prioritarias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertas.length === 0 && (
                <div style={{
                  padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13,
                  background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
                }}>
                  Sin alertas activas
                </div>
              )}
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as NivelGeo[]).flatMap((lv) =>
                (alertasByNivel[lv] || []).map((a) => {
                  const m = NIVEL_META[lv]
                  return (
                    <article key={a.id} style={{
                      display: 'grid', gridTemplateColumns: '6px 110px 1fr auto',
                      gap: 14, alignItems: 'center',
                      padding: '14px 18px 14px 0', borderRadius: 14,
                      background: m.bg, border: `1px solid ${m.ring}`,
                      position: 'relative', overflow: 'hidden',
                      animation: m.pulse ? 'alertCard 1.6s ease-in-out infinite' : undefined,
                    }}>
                      <div style={{
                        background: m.color, height: '100%',
                        boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                      }}/>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
                          color: '#fff', background: m.color,
                          padding: '3px 8px', borderRadius: 999,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          animation: m.pulse ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
                          boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
                        }}>
                          {m.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'alertDot 1s ease-in-out infinite' }}/>}
                          {m.label}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em' }}>GEOPOLÍTICA</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{
                          margin: 0, fontFamily: 'var(--font-display)', fontSize: 15,
                          fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                        }}>{a.titulo}</h3>
                        <p style={{ margin: '3px 0 6px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>{a.descripcion}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#6e6e73' }}>{a.fuente} · <span style={{ fontWeight: 600 }}>{fmtDate(a.fecha)}</span></span>
                          {a.paises.slice(0, 3).map((p) => (
                            <span key={p} style={{
                              padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)',
                              fontSize: 10.5, fontWeight: 600, color: '#3a3a3d',
                            }}>{p}</span>
                          ))}
                        </div>
                      </div>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
                          background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                          padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: m.color,
                          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                          marginRight: 18,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = m.bg; e.currentTarget.style.borderColor = m.ring }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECECEF' }}
                        >Leer noticia ↗</a>
                      ) : (
                        <span style={{
                          padding: '6px 12px', fontSize: 11.5, fontWeight: 500, color: '#9CA3AF',
                          fontFamily: 'inherit', flexShrink: 0, marginRight: 18,
                        }}>Sin enlace</span>
                      )}
                    </article>
                  )
                })
              )}
            </div>

            <style>{`
              @keyframes alertPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.92); } }
              @keyframes alertDot   { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
              @keyframes alertCard  { 0%, 100% { box-shadow: 0 0 0 0 rgba(185,28,28,0); } 50% { box-shadow: 0 0 22px -2px rgba(185,28,28,0.45); } }
            `}</style>
          </div>
        )}

        {/* TAB 3 — Impacto España (visual Alertas con colores por sector) */}
        {tab === 3 && (() => {
          const dimsList = ['seguridad', 'economica', 'energetica', 'diplomatica', 'social'] as const
          const impactosFiltered = impactoDim === 'all'
            ? impactosSorted
            : impactosSorted.filter((i) => i.dimension === impactoDim)
          return (
          <div>
            {/* Contadores clicables por dimensión = selector de tipos de noticia */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 14,
            }}>
              {/* Pill "Todos" */}
              <button
                onClick={() => setImpactoDim('all')}
                style={{
                  textAlign: 'center', padding: '16px 8px 14px', borderRadius: 12,
                  background: impactoDim === 'all' ? '#1d1d1f' : '#fff',
                  border: `1px solid ${impactoDim === 'all' ? '#1d1d1f' : '#ECECEF'}`,
                  fontFamily: 'inherit', cursor: 'pointer',
                  color: impactoDim === 'all' ? '#fff' : '#1d1d1f',
                  transition: 'all 140ms',
                }}
              >
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: impactoDim === 'all' ? '#fff' : '#1d1d1f', marginBottom: 8,
                }}/>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>{impactosSorted.length}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.85, marginTop: 4, textTransform: 'uppercase' }}>Todos</div>
              </button>
              {/* Pills por dimensión */}
              {dimsList.map((dim) => {
                const m = dimMeta(dim)
                const cnt = impactosSorted.filter((i) => i.dimension === dim).length
                const active = impactoDim === dim
                return (
                  <button
                    key={dim}
                    onClick={() => setImpactoDim(active ? 'all' : dim)}
                    style={{
                      textAlign: 'center', padding: '16px 8px 14px', borderRadius: 12,
                      background: active ? m.color : m.bg,
                      border: `1px solid ${active ? m.color : m.ring}`,
                      fontFamily: 'inherit', cursor: cnt > 0 ? 'pointer' : 'not-allowed',
                      opacity: cnt === 0 ? 0.4 : 1,
                      transition: 'all 140ms',
                    }}
                    disabled={cnt === 0}
                  >
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: active ? '#fff' : m.color, marginBottom: 8,
                    }}/>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                      lineHeight: 1, color: active ? '#fff' : m.color, fontVariantNumeric: 'tabular-nums',
                    }}>{cnt}</div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                      color: active ? '#fff' : 'inherit',
                      opacity: active ? 0.95 : 0.7, marginTop: 4, textTransform: 'uppercase',
                    }}>{m.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Indicador de filtro activo */}
            {impactoDim !== 'all' && (
              <div style={{
                fontSize: 11.5, color: '#6e6e73', marginBottom: 12, display: 'flex',
                alignItems: 'center', gap: 8,
              }}>
                <span>Filtrando por <strong style={{ color: dimMeta(impactoDim).color }}>{dimMeta(impactoDim).label}</strong></span>
                <span style={{ color: '#9CA3AF' }}>· {impactosFiltered.length} de {impactosSorted.length}</span>
                <button onClick={() => setImpactoDim('all')} style={{
                  background: 'transparent', border: 'none', color: '#1F4E8C',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                }}>Quitar filtro ×</button>
              </div>
            )}

            {/* Lista de impactos: estilo Alertas con barra lateral por dimensión */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {impactosFiltered.length === 0 && (
                <div style={{
                  padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13,
                  background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
                }}>
                  {impactoDim === 'all' ? 'Sin impactos registrados' : `Sin impactos registrados en sector ${dimMeta(impactoDim).label}`}
                </div>
              )}
              {impactosFiltered.map((imp) => {
                const m = dimMeta(imp.dimension)
                const hLabel = imp.horizonte === 'corto' ? 'CORTO PLAZO' : imp.horizonte === 'medio' ? 'MEDIO PLAZO' : 'LARGO PLAZO'
                return (
                  <article key={imp.id} style={{
                    display: 'grid', gridTemplateColumns: '6px 130px 1fr auto',
                    gap: 14, alignItems: 'center',
                    padding: '14px 18px 14px 0', borderRadius: 14,
                    background: m.bg, border: `1px solid ${m.ring}`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ background: m.color, height: '100%' }}/>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
                        color: '#fff', background: m.color,
                        padding: '3px 8px', borderRadius: 999,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                        {m.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em' }}>{hLabel}</span>
                      {/* Severidad como barras horizontales (5 niveles) */}
                      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} style={{
                            width: 10, height: 4, borderRadius: 1,
                            background: n <= imp.severidad ? m.color : 'rgba(0,0,0,0.10)',
                          }}/>
                        ))}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                      }}>{imp.titulo}</h3>
                      <p style={{ margin: '3px 0 6px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>{imp.descripcion}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em' }}>Severidad {imp.severidad}/5 · Origen:</span>
                        {imp.paises_origen.slice(0, 4).map((p) => (
                          <span key={p} style={{
                            padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)',
                            fontSize: 10.5, fontWeight: 600, color: '#3a3a3d',
                          }}>{p}</span>
                        ))}
                      </div>
                    </div>
                    {imp.url ? (
                      <a href={imp.url} target="_blank" rel="noopener noreferrer" style={{
                        background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                        padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: m.color,
                        fontFamily: 'inherit', flexShrink: 0, textDecoration: 'none',
                        marginRight: 18,
                      }}>Leer noticia ↗</a>
                    ) : (
                      <span style={{
                        padding: '6px 12px', fontSize: 11.5, fontWeight: 500, color: '#9CA3AF',
                        fontFamily: 'inherit', flexShrink: 0, marginRight: 18,
                      }}>—</span>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )})()}

        {/* TAB 4 — Presencia Española (cards estilo Teatro Global + DAFO breve) */}
        {tab === 4 && (() => {
          // Tres modos de orden:
          //  - importancia: por interes_espana (dataset riesgo) — el por defecto
          //  - presencia:   por intensidad (huella diplomática/empresarial)
          //  - continente:  agrupado por continente, dentro alfabético
          const presenciaPresencia = [...presencia].sort((a, b) => b.intensidad - a.intensidad)
          const presenciaImportancia = presenciaSorted
          // Construir grupos por continente
          const continentBuckets = new Map<string, PresenciaItem[]>()
          for (const p of presencia) {
            const iso = p.iso || isoFromPais(p.pais)
            const cont = continentFromIso(iso)
            const cur = continentBuckets.get(cont) || []
            cur.push(p)
            continentBuckets.set(cont, cur)
          }
          // Ordenar países dentro de cada continente por intensidad desc
          for (const [k, arr] of Array.from(continentBuckets.entries())) {
            arr.sort((a, b) => b.intensidad - a.intensidad)
            continentBuckets.set(k, arr)
          }
          const continentList = CONTINENT_ORDER.filter((c) => continentBuckets.has(c))

          // Componente reutilizable de tarjeta de país (inline para acceder a setDafoOpen)
          const renderCard = (p: PresenciaItem) => {
            const iso = p.iso || isoFromPais(p.pais)
            const catC = catColor(p.categoria)
            const dafo = COUNTRY_DAFO[p.pais]
            const hasDafo = !!dafo
            return (
              <button
                key={p.pais}
                onClick={() => setDafoOpen({ pais: p.pais, iso, extra: { intensidad: p.intensidad, categoria: p.categoria } })}
                title={hasDafo ? `Ver DAFO completo de ${p.pais}` : 'Más detalles'}
                style={{
                  background: '#fff', border: '1px solid #e8e8ed', borderRadius: 16,
                  padding: '18px 20px 16px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'left',
                  fontFamily: 'inherit', cursor: 'pointer', width: '100%',
                  transition: 'all 160ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';     e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: catC }}/>
                {hasDafo && (
                  <span style={{
                    position: 'absolute', top: 10, right: 10, fontSize: 9.5, fontWeight: 700,
                    letterSpacing: '0.08em', color: catC, background: `${catC}14`,
                    padding: '2px 6px', borderRadius: 4,
                  }}>DAFO →</span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <CountryBadge iso={iso} size={44} color={catC}/>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
                      letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.15,
                    }}>{p.pais}</div>
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      padding: '2px 8px', borderRadius: 999, background: `${catC}14`,
                      color: catC, fontSize: 10.5, fontWeight: 600,
                      letterSpacing: '0.04em', textTransform: 'capitalize',
                    }}>{p.categoria}</span>
                  </div>
                </div>

                {dafo ? (
                  <div style={{
                    marginBottom: 10, padding: '8px 10px', borderRadius: 10,
                    background: '#fafafa', border: '1px solid #f0f0f3',
                    fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.45,
                  }}>
                    <span style={{ fontStyle: 'italic' }}>{dafo.resumen}</span>
                  </div>
                ) : (
                  <div style={{
                    marginBottom: 10, padding: '8px 10px', borderRadius: 10,
                    background: '#fafafa', border: '1px dashed #e8e8ed',
                    fontSize: 11.5, color: '#9CA3AF',
                  }}>
                    DAFO no disponible aún para este país
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Presencia España</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: catC, fontVariantNumeric: 'tabular-nums' }}>{p.intensidad}/100</span>
                  </div>
                  <div style={{ height: 5, background: '#f5f5f7', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${p.intensidad}%`, height: 5,
                      background: catC,
                    }}/>
                  </div>
                </div>
              </button>
            )
          }

          return (
          <div>
            {/* Mapa arriba (mantiene contexto visual) */}
            <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '20px 24px', marginBottom: 20 }}>
              <Plot
                data={presenciaTraces as object[]}
                layout={{ ...geoLayout, height: 360 } as object}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>

            {/* Selector de orden */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ordenar por:</span>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {[
                  { v: 'importancia', l: 'Importancia para España' },
                  { v: 'continente',  l: 'Por continente' },
                  { v: 'presencia',   l: 'Presencia España' },
                ].map((o) => {
                  const active = presenciaOrden === o.v
                  return (
                    <button key={o.v} onClick={() => setPresenciaOrden(o.v as typeof presenciaOrden)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border: 'none', borderRadius: 999, padding: '6px 14px',
                      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 140ms',
                    }}>{o.l}</button>
                  )
                })}
              </div>
              <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>· {presencia.length} países en seguimiento</span>
            </div>

            {/* Vista 1: lista plana (importancia o presencia) */}
            {presenciaOrden !== 'continente' && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14,
              }}>
                {(presenciaOrden === 'presencia' ? presenciaPresencia : presenciaImportancia).map(renderCard)}
              </div>
            )}

            {/* Vista 2: agrupado por continente con headers */}
            {presenciaOrden === 'continente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {continentList.map((cont) => {
                  const cc = CONTINENT_COLOR[cont] || '#9CA3AF'
                  const items = continentBuckets.get(cont) || []
                  return (
                    <section key={cont}>
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12,
                        padding: '8px 14px', borderRadius: 10,
                        background: `${cc}10`, borderLeft: `3px solid ${cc}`,
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                          color: cc, letterSpacing: '-0.012em',
                        }}>{cont}</span>
                        <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>{items.length} países</span>
                      </div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14,
                      }}>
                        {items.map(renderCard)}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
          )
        })()}

        {/* TAB 5 — Análisis IA */}
        {tab === 5 && <AnalisisIATab alertas={alertas} riesgo={riesgoSorted} osint={osint}/>}

      </main>

      {/* Modal DAFO global (compartido por Teatro Global y Presencia Española) */}
      {dafoOpen && (
        <DafoModal
          pais={dafoOpen.pais}
          iso={dafoOpen.iso}
          extra={dafoOpen.extra}
          onClose={() => setDafoOpen(null)}
        />
      )}

      <style>{`
        @keyframes dafoOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dafoBoxIn     { from { opacity: 0; transform: scale(0.94) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// TAB 5 · Análisis geopolítico con Ollama
// ──────────────────────────────────────────────────────────────────────────
function AnalisisIATab({ alertas, riesgo, osint }: { alertas: AlertaItem[]; riesgo: RiesgoItem[]; osint: OsintItem[] }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [llmSource, setLlmSource] = useState<string | null>(null)
  const [llmMs, setLlmMs] = useState<number | null>(null)

  async function runAnalysis() {
    setAnalyzing(true)
    setAnalysis(null)
    const top3Riesgo = riesgo.slice(0, 3).map(r => `${r.pais} (score ${r.score}, interés España ${r.interes_espana}, ${r.categoria})`).join(' · ')
    const top3Alertas = alertas.slice(0, 3).map(a => `[${a.nivel}] ${a.titulo}: ${a.descripcion}`).join(' || ')
    const top3Osint = osint.slice(0, 3).map(o => `${o.titulo} (${o.categoria}, urg ${o.urgencia})`).join(' · ')
    const prompt = `Eres analista de inteligencia geopolítica de Politeia Analítica. Analiza la situación internacional actual respecto a España y produce un informe estratégico breve.

CONTEXTO ACTUAL:

Top riesgos geopolíticos: ${top3Riesgo}

Alertas activas críticas: ${top3Alertas}

Señales OSINT recientes: ${top3Osint}

INSTRUCCIONES:
- Estructura el análisis en 3 secciones cortas:
  1. SITUACIÓN ESTRATÉGICA (3 frases) — diagnóstico ejecutivo
  2. RIESGOS PRINCIPALES (3 bullets) — qué hay que vigilar
  3. RECOMENDACIONES (3 bullets) — qué debe hacer España
- Lenguaje conciso, profesional, castellano de España
- Sin preámbulos. Empieza directamente con "## Situación estratégica"
- Sin inventar cifras concretas que no estén en el contexto`
    const t0 = Date.now()
    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json() as { reply: string; source: string }
      setAnalysis(data.reply || 'Sin respuesta')
      setLlmSource(data.source)
      setLlmMs(Date.now() - t0)
    } catch (e) {
      setAnalysis(`Error al generar análisis: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
      padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 4px' }}>
            ANÁLISIS POLITEIA · GEOPOLÍTICO
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.018em', margin: '0 0 6px', color: '#1d1d1f' }}>
            Briefing estratégico Politeia
          </h2>
          <p style={{ fontSize: 12.5, color: '#515154', margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
            Síntesis ejecutiva sobre el contexto geopolítico actual usando los datos en vivo
            de los tabs anteriores (riesgos, alertas críticas, señales OSINT). Pulsa el botón
            para generar un informe nuevo.
          </p>
        </div>
        <button onClick={runAnalysis} disabled={analyzing} style={{
          background: analyzing ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
          color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px',
          fontSize: 12.5, fontWeight: 700, cursor: analyzing ? 'wait' : 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(124,58,237,0.30)',
        }}>
          {analyzing ? 'Generando…' : 'Generar análisis Politeia'}
        </button>
      </div>

      {!analysis && !analyzing && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13,
                       background: '#fafafa', borderRadius: 14, border: '1px dashed #ECECEF' }}>
          Pulsa &quot;Generar análisis Politeia&quot; para producir un briefing geopolítico
          basado en los datos cargados en los tabs anteriores.
        </div>
      )}

      {analyzing && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7C3AED', fontSize: 13,
                       background: 'rgba(124,58,237,0.04)', borderRadius: 14,
                       border: '1px solid rgba(124,58,237,0.15)' }}>
          Generando el análisis Politeia…  <span style={{ color:'#9CA3AF' }}>(suele tardar 15-40 s)</span>
        </div>
      )}

      {analysis && (
        <div style={{ padding: '20px 24px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.20)',
                       borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff',
                            background: '#7C3AED',
                            padding: '3px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
              POLITEIA · {llmSource === 'ollama' ? 'LOCAL' : llmSource === 'backend' ? 'CLOUD' : 'FALLBACK'}
            </span>
            {llmMs && <span style={{ fontSize: 11, color: '#6e6e73' }}>{(llmMs/1000).toFixed(1)} s</span>}
          </div>
          <pre style={{
            margin: 0, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f',
            whiteSpace: 'pre-wrap', wordWrap: 'break-word',
          }}>{analysis}</pre>
        </div>
      )}
    </section>
  )
}
