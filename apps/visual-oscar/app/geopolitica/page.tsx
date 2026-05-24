'use client'
import './geopolitica.css'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { COUNTRY_DAFO, type CountryDafo } from '@/lib/country-dafo'
import { AcledSpainContext } from '@/components/geopolitics/AcledSpainContext'
import { GeoKpiGrid } from '@/components/geopolitica/GeoKpiGrid'
import { GeoTermometro } from '@/components/geopolitica/GeoTermometro'
import { GeoTopRisks } from '@/components/geopolitica/GeoTopRisks'
import { GeoEventStream } from '@/components/geopolitica/GeoEventStream'
import { GeoSanctionsFeed } from '@/components/geopolitica/GeoSanctionsFeed'
import { GeoCalendarPanel } from '@/components/geopolitica/GeoCalendarPanel'

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
    <span className="geo-country-badge" style={{
      width: size, height: size,
      background: `linear-gradient(135deg,${color} 0%,${color}dd 100%)`,
      boxShadow: `0 1px 3px ${color}40`,
    }}>
      <span className="geo-country-badge-flag" style={{ fontSize: size * 0.62 }}>{flagFromIso(iso)}</span>
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

// ── Estilos del Resumen Ejecutivo (TAB 0 Teatro Global) ─────────────────────
// Tras migración a tokens: las clases base están en geopolitica.css.
// Las 4 variantes (alertas/osint/impacto/presencia) se aplican vía
// modificadores .geo-resumen-{box,titulo,badge,link}--{module}.

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
    <div className="geo-tabbar">
      {items.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`geo-tab-btn ${active === i ? 'geo-tab-btn--active' : ''}`}
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
    <div className="geo-kpi-card">
      <span className="geo-kpi-accent" style={{ background: accent }}/>
      <div className="geo-kpi-label">{label}</div>
      <div className="geo-kpi-value">{value}</div>
      {sub && <div className="geo-kpi-sub">{sub}</div>}
    </div>
  )
}

// HeroKPI · pequeño KPI translúcido para encajar sobre gradients del hero
function HeroKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="geo-hero-kpi">
      <div className="geo-hero-kpi-value">{value}</div>
      <div className="geo-hero-kpi-label">{label}</div>
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
    <div onClick={onClose} className="geo-modal-overlay">
      <div onClick={(e) => e.stopPropagation()} className="geo-modal-box geo-modal-box--small">
        <div className="geo-modal-not-available-row">
          <CountryBadge iso={iso} size={36} color="#1F4E8C"/>
          <p className="geo-modal-not-available-eyebrow">{pais}</p>
        </div>
        <p className="geo-modal-not-available-p">
          DAFO no disponible todavía para este país. Estamos trabajando en ampliar la cobertura.
        </p>
        <button onClick={onClose} className="geo-modal-close-btn">Cerrar</button>
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
    <div onClick={onClose} className="geo-modal-overlay">
      <div onClick={(e) => e.stopPropagation()} className="geo-modal-box">
        {/* Header */}
        <div className="geo-modal-header">
          <div className="geo-modal-header-row">
            <span className="geo-modal-header-flag-circle">
              <span className="geo-modal-header-flag-emoji">{flagFromIso(iso)}</span>
            </span>
            <div>
              <p className="geo-modal-eyebrow">DAFO · Relación bilateral con España</p>
              <h3 className="geo-modal-title">{dafo.pais}</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="geo-modal-close">×</button>
          </div>
          <p className="geo-modal-resumen">{dafo.resumen}</p>
          {(extra?.score !== undefined || extra?.intensidad !== undefined) && (
            <div className="geo-modal-extras">
              {extra?.score !== undefined && (
                <span className="geo-modal-extra-meta">
                  Riesgo: <strong className="geo-modal-extra-mono">{extra.score.toFixed(1)}/10</strong>
                </span>
              )}
              {extra?.intensidad !== undefined && (
                <span className="geo-modal-extra-meta">
                  Presencia ES: <strong className="geo-modal-extra-mono">{extra.intensidad}/100</strong>
                </span>
              )}
              {extra?.categoria && (
                <span className="geo-modal-extra-pill">{extra.categoria}</span>
              )}
            </div>
          )}
        </div>
        {/* Body — DAFO grid 2×2 */}
        <div className="geo-modal-body">
          {sections.map((s) => (
            <div key={s.key} className="geo-dafo-block" style={{
              border: `1px solid ${s.color}30`,
              background: s.bg,
            }}>
              <div className="geo-dafo-block-head">
                <span className="geo-dafo-block-short" style={{ background: s.color }}>{s.short}</span>
                <span className="geo-dafo-block-label" style={{ color: s.color }}>{s.label}</span>
              </div>
              <ul className="geo-dafo-block-ul">
                {dafo[s.key].map((item, i) => (
                  <li key={i} className="geo-dafo-block-li">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
// Slugs persistibles en URL para los 6 tabs (0..5)
const GEO_TABS = ['teatro', 'alertas', 'osint', 'impacto', 'presencia', 'ia'] as const
type GeoTabSlug = typeof GEO_TABS[number]

export default function GeopoliticaPage() {
  // P5 · Pilar 5 · estado en URL para bookmarkear tabs
  const [tabSlug, setTabSlug] = useUrlState<GeoTabSlug>('tab', 'teatro')
  const tab = Math.max(0, GEO_TABS.indexOf(tabSlug))
  const setTab = (i: number) => setTabSlug((GEO_TABS[i] ?? 'teatro') as GeoTabSlug)
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
    <div className="geo-root">
      <AppHeader />
      <main className="geo-main">

        {/* ───── Hero ───── */}
        <section className="geo-hero">
          <div>
            <p className="geo-hero-eyebrow">
              <span>CONTEXTO ESTRATÉGICO · GEOPOLÍTICA Y RRII</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
            </p>
            <h1 className="geo-hero-h1">
              España en el <em className="geo-hero-em">tablero global.</em>
            </h1>
            <p className="geo-hero-subtitle">
              Riesgo geopolítico, OSINT, alertas internacionales, impactos sobre la agenda doméstica
              y presencia española en el exterior. Datos derivados de medios internacionales y feeds
              oficiales en tiempo real.
            </p>
          </div>
          <div className="geo-hero-kpis">
            <HeroKPI label="OSINT 24h"   value={String(geoStats.osint_24h)}/>
            <HeroKPI label="Alertas"     value={String(geoStats.alertas_activas)}/>
            <HeroKPI label="Países"      value={String(geoStats.paises_monitorizados)}/>
          </div>
        </section>

        {/* ───── KPI strip ───── */}
        <div className="geo-kpi-strip">
          {kpiCards.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} accent={k.accent} sub={k.sub}/>
          ))}
        </div>

        {/* ───── ACLED · Conflictos en entorno geopolítico ES ───── */}
        <div style={{ margin: '18px 0' }}>
          <AcledSpainContext days={30} />
        </div>

        {/* Sprint G2 · Hero superior · Spain Composite Risk Index 0-100 */}
        <div style={{ marginBottom: 16 }}>
          <GeoTermometro />
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
                className="geo-riesgo-card"
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';     e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <span className="geo-riesgo-card-accent" style={{ background: catC }}/>
                {hasDafo && (
                  <span className="geo-riesgo-dafo-tag" style={{ color: catC, background: `${catC}14` }}>DAFO →</span>
                )}

                <div className="geo-riesgo-head">
                  <CountryBadge iso={r.iso} size={44} color={catC}/>
                  <div className="geo-riesgo-head-body">
                    <div className="geo-riesgo-pais">{r.pais}</div>
                    <span className="geo-riesgo-cat-chip" style={{ background: `${catC}14`, color: catC }}>{r.categoria}</span>
                  </div>
                </div>

                <div className="geo-riesgo-score-row">
                  <div className="geo-riesgo-score-ring" style={{
                    background: `conic-gradient(${sevColor} ${r.score * 36}deg, #f5f5f7 0)`,
                  }}>
                    <div className="geo-riesgo-score-inner">
                      <span className="geo-riesgo-score-value" style={{ color: sevColor }}>{r.score.toFixed(1)}</span>
                      <span className="geo-riesgo-score-unit">/10</span>
                    </div>
                  </div>
                  <div className="geo-riesgo-score-meta">
                    <div className="geo-riesgo-score-label">Riesgo geopolítico</div>
                    <div className="geo-riesgo-score-sev" style={{ color: sevColor }}>{sevLabel}</div>
                  </div>
                </div>

                <div>
                  <div className="geo-riesgo-interes-row">
                    <span className="geo-riesgo-interes-label">Interés España</span>
                    <span className="geo-riesgo-interes-value">{r.interes_espana.toFixed(1)}</span>
                  </div>
                  <div className="geo-riesgo-bar-track">
                    <div className="geo-riesgo-bar-fill geo-riesgo-bar-fill--interes" style={{
                      width: `${(r.interes_espana / 10) * 100}%`,
                    }}/>
                  </div>
                </div>
              </button>
            )
          }

          return (
          <div>
            <div className="geo-map-container">
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
                className="geo-plot"
              />
            </div>

            {/* ───── RESUMEN EJECUTIVO ─────
                4 módulos compactos que asoman información de las
                otras pestañas (Alertas, OSINT, Impacto, Presencia)
                + CTA para Análisis Politeia. Cada item enlaza a la
                noticia o salta al tab correspondiente. */}
            <section className="geo-resumen-section">
              <div className="geo-resumen-header-row">
                <h2 className="geo-resumen-h2">Resumen ejecutivo</h2>
                <span className="geo-resumen-h2-sub">· lo más relevante de cada módulo</span>
              </div>

              <div className="geo-resumen-list">
                {/* MÓDULO 1 — Alertas críticas (TAB 2) */}
                <article className="geo-resumen-box geo-resumen-box--alertas">
                  <header className="geo-resumen-box-header">
                    <div className="geo-resumen-box-header-left">
                      <span className="geo-resumen-titulo geo-resumen-titulo--alertas">Alertas activas</span>
                      <span className="geo-resumen-badge geo-resumen-badge--alertas">{alertas.length}</span>
                    </div>
                    <button onClick={() => setTab(2)} className="geo-resumen-link geo-resumen-link--alertas">Ver todas →</button>
                  </header>
                  <div className="geo-resumen-items">
                    {alertas.length === 0 && <div className="geo-resumen-empty">Sin alertas activas en este momento</div>}
                    {alertas.slice(0, 3).map((a) => {
                      const m = NIVEL_META[(['CRITICO', 'ALTO', 'MEDIO'].includes(a.nivel) ? a.nivel : 'BAJO') as NivelGeo]
                      return (
                        <a key={a.id} href={a.url || '#'}
                          target={a.url ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          onClick={a.url ? undefined : (e) => { e.preventDefault(); setTab(2) }}
                          className="geo-resumen-item">
                          <span className="geo-resumen-chip" style={{ background: m.color }}>{m.label}</span>
                          <span className="geo-resumen-item-title">{a.titulo}</span>
                          {a.url && <span className="geo-resumen-arrow">↗</span>}
                        </a>
                      )
                    })}
                  </div>
                </article>

                {/* MÓDULO 2 — OSINT recientes (TAB 1) */}
                <article className="geo-resumen-box geo-resumen-box--osint">
                  <header className="geo-resumen-box-header">
                    <div className="geo-resumen-box-header-left">
                      <span className="geo-resumen-titulo geo-resumen-titulo--osint">OSINT recientes</span>
                      <span className="geo-resumen-badge geo-resumen-badge--osint">{osint.length}</span>
                    </div>
                    <button onClick={() => setTab(1)} className="geo-resumen-link geo-resumen-link--osint">Ver todas →</button>
                  </header>
                  <div className="geo-resumen-items">
                    {osint.length === 0 && <div className="geo-resumen-empty">Sin señales recientes</div>}
                    {[...osint].sort((a, b) => b.urgencia - a.urgencia).slice(0, 3).map((o) => {
                      const cc = catColor(o.categoria)
                      return (
                        <a key={o.id} href={o.url || '#'}
                          target={o.url ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          onClick={o.url ? undefined : (e) => { e.preventDefault(); setTab(1) }}
                          className="geo-resumen-item">
                          <span className="geo-resumen-chip" style={{ background: cc }}>{o.categoria.replace('_', ' ').toUpperCase()}</span>
                          <span className="geo-resumen-item-title">{o.titulo}</span>
                          {o.url && <span className="geo-resumen-arrow">↗</span>}
                        </a>
                      )
                    })}
                  </div>
                </article>

                {/* MÓDULO 3 — Impacto España (TAB 3) */}
                <article className="geo-resumen-box geo-resumen-box--impacto">
                  <header className="geo-resumen-box-header">
                    <div className="geo-resumen-box-header-left">
                      <span className="geo-resumen-titulo geo-resumen-titulo--impacto">Impacto en España</span>
                      <span className="geo-resumen-badge geo-resumen-badge--impacto">{impactos.length}</span>
                    </div>
                    <button onClick={() => setTab(3)} className="geo-resumen-link geo-resumen-link--impacto">Ver todos →</button>
                  </header>
                  <div className="geo-resumen-items">
                    {impactos.length === 0 && <div className="geo-resumen-empty">Sin impactos detectados</div>}
                    {impactosSorted.slice(0, 3).map((imp) => {
                      const m = dimMeta(imp.dimension)
                      return (
                        <a key={imp.id} href={imp.url || '#'}
                          target={imp.url ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          onClick={imp.url ? undefined : (e) => { e.preventDefault(); setTab(3) }}
                          className="geo-resumen-item">
                          <span className="geo-resumen-chip" style={{ background: m.color }}>{m.label}</span>
                          <span className="geo-resumen-item-title">{imp.titulo}</span>
                          <span className="geo-resumen-sev" style={{ color: m.color }}>{imp.severidad}/5</span>
                        </a>
                      )
                    })}
                  </div>
                </article>

                {/* MÓDULO 4 — Top Presencia España (TAB 4) */}
                <article className="geo-resumen-box geo-resumen-box--presencia">
                  <header className="geo-resumen-box-header">
                    <div className="geo-resumen-box-header-left">
                      <span className="geo-resumen-titulo geo-resumen-titulo--presencia">Top presencia española</span>
                      <span className="geo-resumen-badge geo-resumen-badge--presencia">{presencia.length} países</span>
                    </div>
                    <button onClick={() => setTab(4)} className="geo-resumen-link geo-resumen-link--presencia">Ver todos →</button>
                  </header>
                  <div className="geo-resumen-items">
                    {presencia.length === 0 && <div className="geo-resumen-empty">Sin datos de presencia</div>}
                    {[...presencia].sort((x, y) => y.intensidad - x.intensidad).slice(0, 4).map((p) => {
                      const iso = p.iso || isoFromPais(p.pais)
                      const cc = catColor(p.categoria)
                      return (
                        <button key={p.pais}
                          onClick={() => setDafoOpen({ pais: p.pais, iso, extra: { intensidad: p.intensidad, categoria: p.categoria } })}
                          className="geo-resumen-item geo-resumen-item--btn">
                          <CountryBadge iso={iso} size={22} color={cc}/>
                          <span className="geo-resumen-item-title geo-resumen-item-title--bold">{p.pais}</span>
                          <div className="geo-resumen-presencia-track">
                            <div className="geo-resumen-presencia-fill" style={{ width: `${p.intensidad}%`, background: cc }}/>
                          </div>
                          <span className="geo-resumen-presencia-num" style={{ color: cc }}>{p.intensidad}</span>
                        </button>
                      )
                    })}
                  </div>
                </article>
              </div>

              {/* Banner Análisis Politeia (TAB 5) */}
              <button onClick={() => setTab(5)} className="geo-banner-politeia">
                <div className="geo-banner-politeia-left">
                  <div className="geo-banner-politeia-eyebrow">Análisis Politeia · Geopolítico</div>
                  <div className="geo-banner-politeia-title">
                    Genera un briefing estratégico con los datos en vivo de todos los módulos
                  </div>
                </div>
                <span className="geo-banner-politeia-cta">Generar análisis →</span>
              </button>
            </section>

            {/* Selector de orden */}
            <div className="geo-order-row">
              <span className="geo-order-label">Ordenar por:</span>
              <div className="geo-order-tabs">
                {[
                  { v: 'importancia', l: 'Importancia para España' },
                  { v: 'continente',  l: 'Por continente' },
                  { v: 'riesgo',      l: 'Riesgo geopolítico' },
                ].map((o) => {
                  const active = teatroOrden === o.v
                  return (
                    <button key={o.v} onClick={() => setTeatroOrden(o.v as typeof teatroOrden)}
                      className={`geo-order-btn ${active ? 'geo-order-btn--active' : ''}`}>{o.l}</button>
                  )
                })}
              </div>
              <span className="geo-order-count">· {riesgo.length} países en seguimiento</span>
            </div>

            {/* Vista 1: lista plana (importancia o riesgo) */}
            {teatroOrden !== 'continente' && (
              <div className="geo-card-grid">
                {(teatroOrden === 'riesgo' ? teatroRiesgo : teatroImportancia).map(renderRiesgoCard)}
              </div>
            )}

            {/* Vista 2: agrupado por continente */}
            {teatroOrden === 'continente' && (
              <div className="geo-continent-list">
                {teatroContinents.map((cont) => {
                  const cc = CONTINENT_COLOR[cont] || '#9CA3AF'
                  const items = teatroBuckets.get(cont) || []
                  return (
                    <section key={cont}>
                      <div className="geo-continent-header" style={{
                        background: `${cc}10`, borderLeft: `3px solid ${cc}`,
                      }}>
                        <span className="geo-continent-name" style={{ color: cc }}>{cont}</span>
                        <span className="geo-continent-meta">{items.length} países</span>
                      </div>
                      <div className="geo-card-grid">
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
            {/* Sprint G1 · Indicadores OSINT estructurados con methodology tooltips */}
            <div style={{ marginBottom: 20 }}>
              <GeoKpiGrid />
            </div>
            {/* Sprint G2 · Cascading Event Stream (multi-source vertical timeline) */}
            <div style={{ marginBottom: 20 }}>
              <GeoEventStream limit={40} />
            </div>
            {/* Resumen contadores por urgencia (clicable: minimo) */}
            <div className="geo-osint-urg-grid">
              {[5, 4, 3, 2, 1].map((u) => {
                const m = urgMeta(u)
                const cnt = osint.filter((o) => o.urgencia === u && (osintCat === 'all' || o.categoria === osintCat)).length
                const active = osintUrgMin === u
                return (
                  <button
                    key={u}
                    onClick={() => setOsintUrgMin(active ? 1 : u)}
                    title={`Filtrar por urgencia ≥ ${u}`}
                    className="geo-osint-urg-btn"
                    style={{
                      background: active ? m.color : m.bg,
                      border: `1px solid ${active ? m.color : m.ring}`,
                    }}
                  >
                    <span className="geo-osint-urg-dot" style={{
                      background: active ? '#fff' : m.color,
                      animation: m.pulse ? 'geo-alertPulse 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse && !active ? `0 0 12px ${m.color}` : undefined,
                    }}/>
                    <div className="geo-osint-urg-count" style={{ color: active ? '#fff' : m.color }}>{cnt}</div>
                    <div className="geo-osint-urg-label" style={{
                      color: active ? '#fff' : 'inherit',
                      opacity: active ? 0.95 : 0.7,
                    }}>{m.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Selector de categoría + estado del filtro */}
            <div className="geo-osint-cat-row">
              <span className="geo-order-label">Categoría:</span>
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
                  <button key={c.v} onClick={() => setOsintCat(c.v)} className="geo-osint-cat-btn" style={{
                    background: active ? cc : '#fff',
                    color: active ? '#fff' : '#3a3a3d',
                    border: `1px solid ${active ? cc : '#ECECEF'}`,
                    fontWeight: active ? 700 : 500,
                  }}>{c.l}</button>
                )
              })}
              <span className="geo-osint-cat-sep"/>
              <span className="geo-osint-cat-meta">
                {loadingOsint ? 'Cargando…' : `${osintFiltered.length} señales`}
                {(osintUrgMin > 1 || osintCat !== 'all') && (
                  <button onClick={() => { setOsintUrgMin(1); setOsintCat('all') }} className="geo-osint-quit-btn">Quitar filtros ×</button>
                )}
              </span>
            </div>

            {/* Lista de señales OSINT estilo Alertas Prioritarias */}
            <div className="geo-list">
              {osintFiltered.length === 0 && !loadingOsint && (
                <div className="geo-list-empty">
                  No hay señales con los filtros seleccionados
                </div>
              )}
              {osintFiltered.map((o) => {
                const m = urgMeta(o.urgencia)            // urgencia → barra lateral + badge CRÍTICA/ALTA…
                const cc = catColor(o.categoria)         // sector → fondo + chip + halo del parpadeo
                // Cuando es CRÍTICA, el fondo y el halo del parpadeo se intensifican
                // pero MANTIENEN el tono del sector (no del color de urgencia).
                return (
                  <article key={o.id}
                    className={`geo-alert-card geo-alert-card--osint ${m.pulse ? 'geo-alert-card--pulse-osint' : ''}`}
                    style={{
                      background: m.pulse ? `${cc}26` : `${cc}14`,
                      border: `1px solid ${m.pulse ? `${cc}88` : `${cc}55`}`,
                      // CSS var consumida por el keyframes geo-alertCardSector → halo del color del sector
                      ...(m.pulse ? { ['--pulse-color' as string]: `${cc}cc` } : {}),
                    } as React.CSSProperties}>
                    {/* Barra lateral conserva el color de la URGENCIA (señal primaria).
                        El parpadeo (escala + opacidad) se mantiene en CRÍTICA. */}
                    <div className="geo-alert-bar" style={{
                      background: m.color,
                      animation: m.pulse ? 'geo-alertPulse 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse ? `0 0 14px ${cc}` : undefined,
                    }}/>
                    <div className="geo-alert-meta">
                      {/* Badge urgencia: CRÍTICA / ALTA / MEDIA / BAJA / INFO */}
                      <span className={`geo-alert-urg-badge ${m.pulse ? 'geo-alert-urg-badge--pulse' : ''}`} style={{
                        background: m.color,
                        boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
                      }}>
                        {m.pulse && <span className="geo-alert-urg-dot"/>}
                        {m.label}
                      </span>
                      {/* Chip de sector con el color del sector (refuerzo visual del fondo) */}
                      <span className="geo-alert-cat-chip" style={{ background: cc }}>{o.categoria.replace('_', ' ')}</span>
                      <span className="geo-alert-urg-num">Urgencia {o.urgencia}/5</span>
                    </div>
                    <div className="geo-alert-body">
                      <h3 className="geo-alert-title">{o.titulo}</h3>
                      <p className="geo-alert-desc">{o.resumen}</p>
                      <span className="geo-alert-fuente">
                        {o.fuente} · <span className="geo-alert-fuente-bold">{fmtDate(o.fecha)}</span>
                      </span>
                    </div>
                    {o.url ? (
                      <a href={o.url} target="_blank" rel="noopener noreferrer" className="geo-alert-cta" style={{ color: m.color }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = m.bg; e.currentTarget.style.borderColor = m.ring }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECECEF' }}
                      >Leer noticia ↗</a>
                    ) : (
                      <span className="geo-alert-cta--noop">Sin enlace</span>
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
            {/* Sprint G2 · Top 10 Risks (estilo Eurasia Group) + Sanciones + Calendar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
              <GeoTopRisks />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
                <GeoSanctionsFeed />
                <GeoCalendarPanel />
              </div>
            </div>
            {/* Resumen contadores por nivel */}
            <div className="geo-nivel-grid">
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as NivelGeo[]).map((lv) => {
                const m = NIVEL_META[lv]
                const cnt = alertasByNivel[lv]?.length || 0
                return (
                  <div key={lv} className="geo-nivel-cell" style={{
                    background: m.bg, border: `1px solid ${m.ring}`,
                  }}>
                    <span className="geo-nivel-dot" style={{
                      background: m.color,
                      animation: m.pulse ? 'geo-alertPulse 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                    }}/>
                    <div className="geo-nivel-count" style={{ color: m.color }}>{cnt}</div>
                    <div className="geo-nivel-label">{m.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Lista de alertas estilo Alertas Prioritarias */}
            <div className="geo-list">
              {alertas.length === 0 && (
                <div className="geo-list-empty">
                  Sin alertas activas
                </div>
              )}
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as NivelGeo[]).flatMap((lv) =>
                (alertasByNivel[lv] || []).map((a) => {
                  const m = NIVEL_META[lv]
                  return (
                    <article key={a.id}
                      className={`geo-alert-card geo-alert-card--alerta ${m.pulse ? 'geo-alert-card--pulse-alerta' : ''}`}
                      style={{
                        background: m.bg, border: `1px solid ${m.ring}`,
                      }}>
                      <div className="geo-alert-bar" style={{
                        background: m.color,
                        boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
                      }}/>
                      <div className="geo-alert-meta">
                        <span className={`geo-alert-urg-badge ${m.pulse ? 'geo-alert-urg-badge--pulse' : ''}`} style={{
                          background: m.color,
                          boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
                        }}>
                          {m.pulse && <span className="geo-alert-urg-dot"/>}
                          {m.label}
                        </span>
                        <span className="geo-alert-sector-label">GEOPOLÍTICA</span>
                      </div>
                      <div className="geo-alert-body">
                        <h3 className="geo-alert-title">{a.titulo}</h3>
                        <p className="geo-alert-desc">{a.descripcion}</p>
                        <div className="geo-alert-foot-row">
                          <span className="geo-alert-fuente">{a.fuente} · <span className="geo-alert-fuente-bold">{fmtDate(a.fecha)}</span></span>
                          {a.paises.slice(0, 3).map((p) => (
                            <span key={p} className="geo-alert-pais-chip">{p}</span>
                          ))}
                        </div>
                      </div>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="geo-alert-cta" style={{ color: m.color }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = m.bg; e.currentTarget.style.borderColor = m.ring }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECECEF' }}
                        >Leer noticia ↗</a>
                      ) : (
                        <span className="geo-alert-cta--noop">Sin enlace</span>
                      )}
                    </article>
                  )
                })
              )}
            </div>
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
            <div className="geo-impacto-pills">
              {/* Pill "Todos" */}
              <button
                onClick={() => setImpactoDim('all')}
                className="geo-impacto-pill"
                style={{
                  background: impactoDim === 'all' ? '#1d1d1f' : '#fff',
                  border: `1px solid ${impactoDim === 'all' ? '#1d1d1f' : '#ECECEF'}`,
                  color: impactoDim === 'all' ? '#fff' : '#1d1d1f',
                }}
              >
                <span className="geo-impacto-pill-dot" style={{
                  background: impactoDim === 'all' ? '#fff' : '#1d1d1f',
                }}/>
                <div className="geo-impacto-pill-count">{impactosSorted.length}</div>
                <div className="geo-impacto-pill-label geo-impacto-pill-label--todos">Todos</div>
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
                    className="geo-impacto-pill"
                    style={{
                      background: active ? m.color : m.bg,
                      border: `1px solid ${active ? m.color : m.ring}`,
                      cursor: cnt > 0 ? 'pointer' : 'not-allowed',
                      opacity: cnt === 0 ? 0.4 : 1,
                    }}
                    disabled={cnt === 0}
                  >
                    <span className="geo-impacto-pill-dot" style={{
                      background: active ? '#fff' : m.color,
                    }}/>
                    <div className="geo-impacto-pill-count" style={{ color: active ? '#fff' : m.color }}>{cnt}</div>
                    <div className="geo-impacto-pill-label" style={{
                      color: active ? '#fff' : 'inherit',
                      opacity: active ? 0.95 : 0.7,
                    }}>{m.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Indicador de filtro activo */}
            {impactoDim !== 'all' && (
              <div className="geo-impacto-filter-bar">
                <span>Filtrando por <strong style={{ color: dimMeta(impactoDim).color }}>{dimMeta(impactoDim).label}</strong></span>
                <span className="geo-impacto-filter-bar-meta">· {impactosFiltered.length} de {impactosSorted.length}</span>
                <button onClick={() => setImpactoDim('all')} className="geo-impacto-clear-btn">Quitar filtro ×</button>
              </div>
            )}

            {/* Lista de impactos: estilo Alertas con barra lateral por dimensión */}
            <div className="geo-list">
              {impactosFiltered.length === 0 && (
                <div className="geo-list-empty">
                  {impactoDim === 'all' ? 'Sin impactos registrados' : `Sin impactos registrados en sector ${dimMeta(impactoDim).label}`}
                </div>
              )}
              {impactosFiltered.map((imp) => {
                const m = dimMeta(imp.dimension)
                const hLabel = imp.horizonte === 'corto' ? 'CORTO PLAZO' : imp.horizonte === 'medio' ? 'MEDIO PLAZO' : 'LARGO PLAZO'
                return (
                  <article key={imp.id}
                    className="geo-alert-card geo-alert-card--impacto"
                    style={{
                      background: m.bg, border: `1px solid ${m.ring}`,
                    }}>
                    <div className="geo-alert-bar" style={{ background: m.color }}/>
                    <div className="geo-alert-meta">
                      <span className="geo-alert-urg-badge" style={{ background: m.color }}>
                        {m.label}
                      </span>
                      <span className="geo-alert-horizonte-label">{hLabel}</span>
                      {/* Severidad como barras horizontales (5 niveles) */}
                      <div className="geo-alert-sev-bars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className="geo-alert-sev-cell" style={{
                            background: n <= imp.severidad ? m.color : 'rgba(0,0,0,0.10)',
                          }}/>
                        ))}
                      </div>
                    </div>
                    <div className="geo-alert-body">
                      <h3 className="geo-alert-title">{imp.titulo}</h3>
                      <p className="geo-alert-desc">{imp.descripcion}</p>
                      <div className="geo-alert-foot-row">
                        <span className="geo-alert-sector-label">Severidad {imp.severidad}/5 · Origen:</span>
                        {imp.paises_origen.slice(0, 4).map((p) => (
                          <span key={p} className="geo-alert-pais-chip">{p}</span>
                        ))}
                      </div>
                    </div>
                    {imp.url ? (
                      <a href={imp.url} target="_blank" rel="noopener noreferrer" className="geo-alert-cta" style={{ color: m.color }}>Leer noticia ↗</a>
                    ) : (
                      <span className="geo-alert-cta--noop">—</span>
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
                className="geo-riesgo-card"
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';     e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <span className="geo-riesgo-card-accent" style={{ background: catC }}/>
                {hasDafo && (
                  <span className="geo-riesgo-dafo-tag" style={{ color: catC, background: `${catC}14` }}>DAFO →</span>
                )}

                <div className="geo-riesgo-head geo-riesgo-head--tight">
                  <CountryBadge iso={iso} size={44} color={catC}/>
                  <div className="geo-riesgo-head-body">
                    <div className="geo-riesgo-pais">{p.pais}</div>
                    <span className="geo-riesgo-cat-chip" style={{ background: `${catC}14`, color: catC }}>{p.categoria}</span>
                  </div>
                </div>

                {dafo ? (
                  <div className="geo-presencia-card-dafo">
                    <span className="geo-presencia-card-dafo-em">{dafo.resumen}</span>
                  </div>
                ) : (
                  <div className="geo-presencia-card-dafo geo-presencia-card-dafo--none">
                    DAFO no disponible aún para este país
                  </div>
                )}

                <div>
                  <div className="geo-riesgo-interes-row">
                    <span className="geo-presencia-card-presencia-label">Presencia España</span>
                    <span className="geo-presencia-card-presencia-value" style={{ color: catC }}>{p.intensidad}/100</span>
                  </div>
                  <div className="geo-riesgo-bar-track">
                    <div className="geo-riesgo-bar-fill" style={{
                      width: `${p.intensidad}%`,
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
            <div className="geo-map-container">
              <Plot
                data={presenciaTraces as object[]}
                layout={{ ...geoLayout, height: 360 } as object}
                config={{ displayModeBar: false, responsive: true }}
                className="geo-plot"
              />
            </div>

            {/* Selector de orden */}
            <div className="geo-order-row">
              <span className="geo-order-label">Ordenar por:</span>
              <div className="geo-order-tabs">
                {[
                  { v: 'importancia', l: 'Importancia para España' },
                  { v: 'continente',  l: 'Por continente' },
                  { v: 'presencia',   l: 'Presencia España' },
                ].map((o) => {
                  const active = presenciaOrden === o.v
                  return (
                    <button key={o.v} onClick={() => setPresenciaOrden(o.v as typeof presenciaOrden)}
                      className={`geo-order-btn ${active ? 'geo-order-btn--active' : ''}`}>{o.l}</button>
                  )
                })}
              </div>
              <span className="geo-order-count">· {presencia.length} países en seguimiento</span>
            </div>

            {/* Vista 1: lista plana (importancia o presencia) */}
            {presenciaOrden !== 'continente' && (
              <div className="geo-card-grid">
                {(presenciaOrden === 'presencia' ? presenciaPresencia : presenciaImportancia).map(renderCard)}
              </div>
            )}

            {/* Vista 2: agrupado por continente con headers */}
            {presenciaOrden === 'continente' && (
              <div className="geo-continent-list">
                {continentList.map((cont) => {
                  const cc = CONTINENT_COLOR[cont] || '#9CA3AF'
                  const items = continentBuckets.get(cont) || []
                  return (
                    <section key={cont}>
                      <div className="geo-continent-header" style={{
                        background: `${cc}10`, borderLeft: `3px solid ${cc}`,
                      }}>
                        <span className="geo-continent-name" style={{ color: cc }}>{cont}</span>
                        <span className="geo-continent-meta">{items.length} países</span>
                      </div>
                      <div className="geo-card-grid">
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
    <section className="geo-ai-section">
      <div className="geo-ai-head">
        <div>
          <p className="geo-ai-eyebrow">
            ANÁLISIS POLITEIA · GEOPOLÍTICO
          </p>
          <h2 className="geo-ai-h2">
            Briefing estratégico Politeia
          </h2>
          <p className="geo-ai-subtitle">
            Síntesis ejecutiva sobre el contexto geopolítico actual usando los datos en vivo
            de los tabs anteriores (riesgos, alertas críticas, señales OSINT). Pulsa el botón
            para generar un informe nuevo.
          </p>
        </div>
        <button onClick={runAnalysis} disabled={analyzing} className={`geo-ai-btn ${analyzing ? 'geo-ai-btn--analyzing' : ''}`}>
          {analyzing ? 'Generando…' : 'Generar análisis Politeia'}
        </button>
      </div>

      {!analysis && !analyzing && (
        <div className="geo-ai-empty">
          Pulsa &quot;Generar análisis Politeia&quot; para producir un briefing geopolítico
          basado en los datos cargados en los tabs anteriores.
        </div>
      )}

      {analyzing && (
        <div className="geo-ai-loading">
          Generando el análisis Politeia…  <span className="geo-ai-loading-meta">(suele tardar 15-40 s)</span>
        </div>
      )}

      {analysis && (
        <div className="geo-ai-result">
          <div className="geo-ai-result-head">
            <span className="geo-ai-result-badge">
              POLITEIA · {llmSource === 'ollama' ? 'LOCAL' : llmSource === 'backend' ? 'CLOUD' : 'FALLBACK'}
            </span>
            {llmMs && <span className="geo-ai-result-time">{(llmMs/1000).toFixed(1)} s</span>}
          </div>
          <pre className="geo-ai-result-pre">{analysis}</pre>
        </div>
      )}
    </section>
  )
}
