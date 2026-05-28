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
import { GeopoliticalClock } from '@/components/geopolitica/GeopoliticalClock'
import { GeoIaBrief } from '@/components/geopolitica/GeoIaBrief'
import { GeoStakeholderGraph } from '@/components/geopolitica/GeoStakeholderGraph'
import { GeoAnalogFinder } from '@/components/geopolitica/GeoAnalogFinder'
import { GeoScenarioSlider } from '@/components/geopolitica/GeoScenarioSlider'
import { GeoRiskHeatmap } from '@/components/geopolitica/GeoRiskHeatmap'
import { GeoUcdpPanel } from '@/components/geopolitica/GeoUcdpPanel'
import { GeoCountryTimeline } from '@/components/geopolitica/GeoCountryTimeline'
import { GeoReliefWebPanel } from '@/components/geopolitica/GeoReliefWebPanel'
import { GeoTravelAdvisories } from '@/components/geopolitica/GeoTravelAdvisories'
import { GeoNatoFeed } from '@/components/geopolitica/GeoNatoFeed'
import { GeoUnscFeed } from '@/components/geopolitica/GeoUnscFeed'
import { GeoCrisisGroupFeed } from '@/components/geopolitica/GeoCrisisGroupFeed'
import { GeoIswBriefings } from '@/components/geopolitica/GeoIswBriefings'
import { GeoEeasFeed } from '@/components/geopolitica/GeoEeasFeed'
import { GeoSpainOfficial } from '@/components/geopolitica/GeoSpainOfficial'
import { GeoConvergenceAlerts } from '@/components/geopolitica/GeoConvergenceAlerts'
import { GeoDataHealth } from '@/components/geopolitica/GeoDataHealth'
import { GeoSpainWatchlist } from '@/components/geopolitica/GeoSpainWatchlist'
import { GeoThemeClusters } from '@/components/geopolitica/GeoThemeClusters'
// Sprint G14 FASE 4 · cobertura medios estatales (Sputnik/Xinhua/RT/TASS/CGTN/AlJazeera/PressTV/...)
import { GeoStateMediaFeeds } from '@/components/geopolitica/GeoStateMediaFeeds'
// Sprint G14 FASE 4 cierre · "Mismo tema × N voces" comparativa cross-país
import { GeoSameEventFraming } from '@/components/geopolitica/GeoSameEventFraming'
// Sprint G14 extra · heatmap calendario · pulso 90 días
import { GeoEventCalendarHeatmap } from '@/components/geopolitica/GeoEventCalendarHeatmap'
import { GeoGdeltSummary } from '@/components/geopolitica/GeoGdeltSummary'
import { GeoTvBroadcast } from '@/components/geopolitica/GeoTvBroadcast'
// Sprint GEO-RADAR C2 · Radar Global de Crisis (V-Dem + SIPRI + GDELT)
import { GeoRadarMap } from '@/components/geopolitica/GeoRadarMap'
import { GeoIRCKpis } from '@/components/geopolitica/GeoIRCKpis'
import { GeoSignalFeed } from '@/components/geopolitica/GeoSignalFeed'
import { GeoTrendingTemas } from '@/components/geopolitica/GeoTrendingTemas'
import { GeoCountryDrawer } from '@/components/geopolitica/GeoCountryDrawer'
// Sprint GEO-RADAR C3 · Tab Conflictos y Violencia Política
import { GeoConflictsMap } from '@/components/geopolitica/GeoConflictsMap'
import { GeoConflictsTable } from '@/components/geopolitica/GeoConflictsTable'
import { GeoConflictDrawer } from '@/components/geopolitica/GeoConflictDrawer'
// Sprint GEO-RP C2 · Tab Riesgo País (IRPC compuesto + ficha 6 sub-tabs)
import { GeoRiskMap } from '@/components/geopolitica/risk/GeoRiskMap'
import { GeoRiskKpis } from '@/components/geopolitica/risk/GeoRiskKpis'
import { GeoRiskDrawer } from '@/components/geopolitica/risk/GeoRiskDrawer'
// Sprint GEO-MIL C5 · Tab Militar y Alianzas
import { MilitaryMap } from '@/components/geopolitica/militar/MilitaryMap'
import { MilitaryKpis } from '@/components/geopolitica/militar/MilitaryKpis'
import { DefenseCommoditiesPanel } from '@/components/geopolitica/militar/DefenseCommoditiesPanel'
import { MilitarySignalFeed } from '@/components/geopolitica/militar/MilitarySignalFeed'
// Sprint GEO-MIL C6 · Drawer ficha militar país (5 sub-tabs)
import { GeoMilitaryDrawer } from '@/components/geopolitica/militar/GeoMilitaryDrawer'
// Sprint GEO-DIP · Tab 5 Diplomacia & Sanciones
import { DiplomaticMap } from '@/components/geopolitica/diplomacia/DiplomaticMap'
import { DiplomaticKpis } from '@/components/geopolitica/diplomacia/DiplomaticKpis'
import { SanctionsSearch } from '@/components/geopolitica/diplomacia/SanctionsSearch'
import { DiplomaticSignalFeed } from '@/components/geopolitica/diplomacia/DiplomaticSignalFeed'
import { AgnuHeatmap } from '@/components/geopolitica/diplomacia/AgnuHeatmap'
// Sprint GEO-ES · Tab 6 Presencia España
import { SpainPresenceMap } from '@/components/geopolitica/espana/SpainPresenceMap'
import { SpainKpis } from '@/components/geopolitica/espana/SpainKpis'
import { ComercioPanel } from '@/components/geopolitica/espana/ComercioPanel'
import { InversionPanel } from '@/components/geopolitica/espana/InversionPanel'
import { ActivosRiesgoPanel } from '@/components/geopolitica/espana/ActivosRiesgoPanel'
import { PulseEspanaStrip } from '@/components/geopolitica/PulseEspanaStrip'

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
// Sprint G6 · 7 subtabs centradas en RIESGO GEOPOLÍTICO DURO
// Drop fuentes macro/comercio/opinión pública (UN Comtrade, OEC, WTO, IEA,
// Eurobarómetro, CIS opinión). Focus: guerra, escalada, violencia política,
// sanciones, terrorismo, diplomacia crisis, consular, inestabilidad estatal.
const GEO_TABS = ['radar', 'conflictos', 'pais', 'militar', 'diplomacia', 'espana', 'analisis'] as const
type GeoTabSlug = typeof GEO_TABS[number]

export default function GeopoliticaPage() {
  // P5 · Pilar 5 · estado en URL para bookmarkear tabs
  const [tabSlug, setTabSlug] = useUrlState<GeoTabSlug>('tab', 'radar')
  const tab = Math.max(0, GEO_TABS.indexOf(tabSlug))
  const setTab = (i: number) => setTabSlug((GEO_TABS[i] ?? 'radar') as GeoTabSlug)
  const [osintUrgMin, setOsintUrgMin] = useState(1)
  const [osintCat, setOsintCat] = useState('all')
  // Sprint GEO-RADAR C2 · drawer país (Tab Radar)
  const [radarDrawerIso, setRadarDrawerIso] = useState<string | null>(null)
  // Sprint GEO-RADAR C3 · drawer conflicto (Tab Conflictos)
  const [conflictDrawerIso, setConflictDrawerIso] = useState<string | null>(null)
  // Sprint GEO-RP C2 · drawer ficha riesgo país (Tab País)
  const [riskDrawerIso, setRiskDrawerIso] = useState<string | null>(null)
  // Sprint GEO-MIL C5 · drawer ficha militar (Tab Militar) · C6 lo llenará
  const [militaryDrawerIso, setMilitaryDrawerIso] = useState<string | null>(null)
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

        {/* Sprint G21 · Pulse España KPI strip · cross-cuts las 6 tabs
            con visualización ejecutiva siempre-visible de exposición
            agregada España (países críticos × valor × ciudadanos × UCDP). */}
        <PulseEspanaStrip />

        {/* Sprint G16 · Item 1 · ACLED card removed (siempre devolvía
            "invalid_grant" / "no disponible"). El usuario pidió arrancar
            la página directamente con la barra de tabs. */}

        <TabBar
          items={[
            'Radar global de crisis',
            'Conflictos & violencia política',
            'Riesgo país & estabilidad',
            'Militar & alianzas',
            'Diplomacia & sanciones',
            'Presencia España',
            'OSINT, alertas & escenarios',
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* TAB 0 — Radar global de crisis · señal rápida multi-fuente */}
        {tab === 0 && (
          <div>
            {/* ───── Sprint GEO-RADAR C2 · Radar Global de Crisis (nuevo) ─────
                Hero ejecutivo con IRC compuesto + KPIs + mapa SVG + feed señales.
                Fuentes: V-Dem v15 + SIPRI 2024 + GDELT GKG + ReliefWeb.
                ACLED no usado (acceso denegado mayo 2026). */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 16, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Radar Global de Crisis · vista ejecutiva
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                Índice de Riesgo Compuesto (IRC) por país combinando 4 dimensiones:
                <strong style={{ color: '#cbd5e1' }}> V-Dem democracia · SIPRI militarización · GDELT tono · GDELT volumen conflictos.</strong>{' '}
                80 países cubiertos · click en cualquier punto del mapa para detalle.
              </p>
            </div>
            {/* KPIs ejecutivos */}
            <div style={{ marginBottom: 14 }}>
              <GeoIRCKpis onFilterClick={(_f) => { /* TODO: filtrar mapa por flag */ }} />
            </div>
            {/* Mapa mundial coroplético + drawer país */}
            <div style={{ marginBottom: 14 }}>
              <GeoRadarMap onCountryClick={(iso3) => setRadarDrawerIso(iso3)} />
            </div>
            <GeoCountryDrawer iso3={radarDrawerIso} onClose={() => setRadarDrawerIso(null)} />
            {/* Trending temas + Feed señales (lado a lado en wide) */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 14, marginBottom: 18,
            }}>
              <GeoSignalFeed limit={20} onCountryClick={(iso3) => setRadarDrawerIso(iso3)} />
              <GeoTrendingTemas />
            </div>

            {/* ───── Vista legacy · convergencia + KPIs antiguos + stream + GDELT summary ─────
                Mantenido por compatibilidad con el flujo del socio.
                Sprint GEO-RADAR no lo elimina · permite comparar viejo vs nuevo. */}
            <details style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
              padding: '12px 16px', marginBottom: 16,
            }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Vista legacy · convergencia + KPIs + GDELT summary (clic para abrir)
              </summary>
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Vista anterior conservada por compatibilidad. Combina GDELT (saliencia 7d) +
                  UCDP (conflicto estructural anual) + ReliefWeb (humanitario) + OSINT con detección
                  automática de convergencia multi-capa.
                </p>
                <div style={{ marginBottom: 18 }}>
                  <GeoConvergenceAlerts />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoKpiGrid />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoEventStream limit={60} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoGdeltSummary defaultQuery="Ukraine" defaultTimespan="7d" />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* TAB 1 — Conflictos, violencia política & protestas · UCDP + GDELT + ReliefWeb */}
        {tab === 1 && (
          <div>
            {/* ───── Sprint GEO-RADAR C3 · zoom operacional ─────
                Mapa heatmap + tabla 20 conflictos + drawer 5 sub-tabs.
                Sustituye ACLED con UCDP estructural + GDELT táctico + SIPRI militar.
                Drawer detalle: Resumen · Timeline · Cobertura · Impacto · Actores. */}
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 16, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Conflictos y Violencia Política · zoom operacional
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#fecaca', lineHeight: 1.5 }}>
                Mapa de conflictos activos por intensidad UCDP/PRIO + GDELT táctico + tabla con tendencia +
                drawer detalle 6 sub-tabs (resumen · timeline · noticias · cobertura · impacto SIPRI · actores).
                Fuentes: UCDP/PRIO seed top 30 · GDELT WAR_CONFLICT events · SIPRI Milex 2024 · V-Dem democracia.
              </p>
            </div>

            {/* Mapa heatmap conflictos */}
            <div style={{ marginBottom: 14 }}>
              <GeoConflictsMap onConflictClick={(iso3) => setConflictDrawerIso(iso3)} />
            </div>

            {/* Tabla de conflictos */}
            <div style={{ marginBottom: 14 }}>
              <GeoConflictsTable
                onConflictClick={(iso3) => setConflictDrawerIso(iso3)}
                highlightIso3={conflictDrawerIso}
              />
            </div>

            {/* Drawer compartido */}
            <GeoConflictDrawer iso3={conflictDrawerIso} onClose={() => setConflictDrawerIso(null)} />

            {/* ───── Vista legacy · UCDP + ACLED España + Timeline Ucrania ─────
                Mantenido por compatibilidad. */}
            <details style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
              padding: '12px 16px', marginBottom: 16,
            }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Vista legacy · contexto España + UCDP estructural + timeline Ucrania (clic para abrir)
              </summary>
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Vista anterior conservada. UCDP (Uppsala · conflicto armado anual serie larga 1946-actual) +
                  GDELT táctico + ReliefWeb humanitario + Country Timeline cronológico multi-source.
                </p>
                <div style={{ marginBottom: 18 }}>
                  <AcledSpainContext days={30} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoUcdpPanel country="Ukraine" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoCountryTimeline iso="UKR" />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* TAB 2 — Riesgo país & estabilidad estatal (heatmap + scatter + país cards + Travel Advisories + ReliefWeb) */}
        {/* TAB 2 — Riesgo País · IRPC compuesto + ficha 6 sub-tabs ────────
            Sprint GEO-RP C2 · sustituye/precede la vista legacy con un
            mapa global IRPC + KPIs + drawer ficha completa.
            Sub-tab 1 Señales EWS (5 bloques) + Régimen + Briefing funcionales.
            Sub-tabs 3/4/5 (Economía, Seguridad, Exposición España) → C3. */}
        {/* TAB 2 — Riesgo País · CONSOLIDADO Sprint G17 (items 6+7+8+9):
            - 1 solo mapa (World Risk Heatmap choropleth, más visual)
            - KPIs ejecutivos arriba
            - Click en país → drawer rico de 6 sub-tabs (Señales · Régimen ·
              Economía · Seguridad · Exposición España · Briefing Gemini)
            - Eliminados: GeoRiskMap (duplicado IRPC) · scattergeo Plot
              (tercer mapa) · cards DAFO inline (movidos a sub-tab del drawer)
              · Resumen ejecutivo (información duplicada del Briefing). */}
        {tab === 2 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 14, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Riesgo País · World Risk Heatmap + ficha analítica
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#bae6fd', lineHeight: 1.5 }}>
                <strong>¿Es seguro/rentable operar, invertir o relacionarse con este país?</strong>{' '}
                Choropleth global con risk score baseline curado + uplift por eventos GDELT últimos 30d.
                Click en cualquier país abre ficha analítica con 6 sub-tabs (Señales EWS · Régimen ·
                Economía · Seguridad · Exposición España · Briefing IA).
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <GeoRiskKpis />
            </div>
            {/* G17 · ÚNICO mapa: World Risk Heatmap (choropleth) ·
                click en país → drawer en lugar de drill page completo */}
            <div style={{ marginBottom: 14 }}>
              <GeoRiskHeatmap onCountryClick={(iso3) => setRiskDrawerIso(iso3)} />
            </div>
            <GeoRiskDrawer iso3={riskDrawerIso} onClose={() => setRiskDrawerIso(null)} />
          </div>
        )}

        {/* TAB 3 — Riesgo militar, defensa & alianzas (NATO + España Defensa · Capa 3) */}
        {/* TAB 3 — Militar y Alianzas · vista estratégica + commodities + feed señales
            Sprint GEO-MIL C5 · sustituye/precede vista legacy con mapa mundial 3 capas
            (gasto SIPRI + alianzas curadas + USD bn) + KPIs + commodities defensa
            con cotización live + feed señales reconfiguración GDELT.
            Drawer ficha militar país en C6 (stub por ahora). */}
        {tab === 3 && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 14, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Militar y Alianzas · vista estratégica global
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>
                <strong>Señales de reconfiguración estratégica antes de ser noticia.</strong>{' '}
                Mapa con 3 capas (gasto %PIB / USD bn / alianzas con arcos) ·
                SIPRI 2024 (60 países) + IISS capabilities (50 países) +
                7 alianzas curadas + 6 commodities críticos · cotización live + feed señales GDELT.
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <MilitaryKpis />
            </div>
            <div style={{ marginBottom: 14 }}>
              <MilitaryMap onCountryClick={(iso3) => setMilitaryDrawerIso(iso3)} />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 14, marginBottom: 14,
            }}>
              <DefenseCommoditiesPanel />
              <MilitarySignalFeed onCountryClick={(iso3) => setMilitaryDrawerIso(iso3)} />
            </div>

            <GeoMilitaryDrawer iso3={militaryDrawerIso} onClose={() => setMilitaryDrawerIso(null)} />

            {/* Vista legacy · NATO + Spain Defensa + ISW conservada */}
            <details style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
              padding: '12px 16px', marginTop: 14,
            }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Vista legacy · NATO HQ + Defensa España + ISW briefings (clic para abrir)
              </summary>
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Vista anterior · NATO HQ (cumbres/ejercicios/flanco este) + Defensa España oficial + ISW briefings teatro operativo.
                </p>
                <div style={{ marginBottom: 18 }}>
                  <GeoNatoFeed limit={25} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoSpainOfficial limit={20} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <GeoIswBriefings limit={15} />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* TAB 6a — OSINT signals + análisis cualitativo (Capa 6) */}
        {tab === 6 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>Capa 6 · OSINT cualitativo.</strong>{' '}
                International Crisis Group (early warning analyst-grade) + ISW/Critical
                Threats (briefings operativos teatro) + indicadores OSINT estructurados +
                cascading events GDELT. Análisis cualitativo, no dato duro · validar siempre
                con UCDP (estructural) y ReliefWeb (humanitario).
              </p>
            </div>
            {/* Sprint G10 · Theme clustering emergente sobre 6 RSS feeds (Gemini) */}
            <div style={{ marginBottom: 20 }}>
              <GeoThemeClusters />
            </div>
            {/* Sprint G14 FASE 4 · medios estatales · framing oficial régimen autoritario */}
            <div style={{ marginBottom: 20 }}>
              <GeoStateMediaFeeds />
            </div>
            {/* Sprint G14 FASE 4 cierre · "Mismo tema × N voces" comparativa cross-país */}
            <div style={{ marginBottom: 20 }}>
              <GeoSameEventFraming />
            </div>
            {/* Sprint G14 extra · heatmap calendario · 90 días de pulso */}
            <div style={{ marginBottom: 20 }}>
              <GeoEventCalendarHeatmap days={90} />
            </div>
            {/* Sprint G12 · TV broadcast narrative tracking (GDELT TV API) */}
            <div style={{ marginBottom: 20 }}>
              <GeoTvBroadcast />
            </div>
            {/* Sprint G7 · ICG CrisisWatch + ISW briefings (OSINT cualitativo) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 20 }}>
              <GeoCrisisGroupFeed limit={20} />
              <GeoIswBriefings limit={20} />
            </div>
            {/* Sprint G8 · Data health · transparencia de fuentes */}
            <div style={{ marginBottom: 20 }}>
              <GeoDataHealth />
            </div>
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

        {/* TAB 4 — Diplomacia & sanciones (UN SC + sanciones EU/OFAC/UN + Top Risks + alertas) */}
        {tab === 4 && (
          <div>
            {/* Sprint GEO-DIP · Tab 5 Diplomacia & Sanciones
                Nuevo bloque · mapa global 2 capas (sanciones + AGNU) +
                KPIs + screening OpenSanctions + feed señales + heatmap AGNU.
                Vista legacy (Eurasia top10 + sanciones feed + calendar + UNSC + EEAS) abajo. */}
            <div style={{
              background: 'linear-gradient(135deg, #7c2d12 0%, #92400e 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 14, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Diplomacia & Sanciones · ¿con quién puede tratar España sin riesgo legal?
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#fed7aa', lineHeight: 1.5 }}>
                Mapa global 2 capas (sanciones por país + polarización AGNU) ·
                screening fuzzy 333+ fuentes OpenSanctions (OFAC SDN + EU FSF + UNSC + UK OFSI) ·
                radar movimientos diplomáticos 7d · heatmap votaciones AGNU 50 países × 10 resoluciones clave.
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <DiplomaticKpis />
            </div>
            <div style={{ marginBottom: 14 }}>
              <DiplomaticMap onCountryClick={(iso3) => setRiskDrawerIso(iso3)} />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 14, marginBottom: 14,
            }}>
              <SanctionsSearch />
              <DiplomaticSignalFeed onCountryClick={(iso3) => setRiskDrawerIso(iso3)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <AgnuHeatmap />
            </div>

            <details style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Vista legacy · Eurasia Top10 + Sanciones RSS + Calendar + UNSC + EEAS (clic para abrir)
              </summary>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                <GeoTopRisks />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
                  <GeoSanctionsFeed />
                  <GeoCalendarPanel />
                </div>
                <div style={{ marginTop: 16 }}>
                  <GeoUnscFeed limit={20} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <GeoEeasFeed limit={20} />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Sprint G9 · Spain Watchlist (convergence × presencia ES) sobre Tab 5 */}
        {/* TAB 5 — Presencia España · cuadro de mando proyección exterior
            Sprint GEO-ES · mapa 4 dimensiones + KPIs + comercio + inversión.
            Reemplaza/precede la vista legacy (watchlist + spain official). */}
        {tab === 5 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              background: 'linear-gradient(135deg, #aa0000 0%, #d50000 100%)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 14, color: '#fff',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Presencia España · proyección exterior con pulso en tiempo real
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#fecaca', lineHeight: 1.5 }}>
                <strong>¿Dónde está España realmente y qué está pasando en esos lugares?</strong>{' '}
                Mapa 4 dimensiones (FDI / IBEX / Diplomática / Exports) ·
                Comercio exterior con 8 dependencias críticas · Inversión con análisis HHI + exposición V-Dem.
                Datasets curados DataInvex 2023 + DataComex 2024 + MAEC + Cervantes.
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <SpainKpis />
            </div>
            <div style={{ marginBottom: 14 }}>
              <SpainPresenceMap onCountryClick={(iso3) => setRiskDrawerIso(iso3)} />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 14, marginBottom: 14,
            }}>
              <ComercioPanel />
              <InversionPanel />
            </div>

            {/* G20 item 20 · NUEVA feature mayor: Activos españoles en riesgo
                exterior · cruza catálogo IBEX/PERE/MAEC/Cervantes/AECID/CESCE
                con IRC compuesto + UCDP/PRIO en tiempo real. */}
            <div style={{ marginBottom: 14 }}>
              <ActivosRiesgoPanel onCountryClick={(iso3) => setRiskDrawerIso(iso3)} />
            </div>

            <details style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '12px 16px' }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Vista legacy · Spain Watchlist + Spain Official (clic para abrir)
              </summary>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Voz oficial del Estado (MAEC + Moncloa + Defensa.gob) + watchlist priorizada de países
                  donde España tiene exposición Y convergencia multi-source apunta a deterioro.
                </p>
                <GeoSpainWatchlist />
                <GeoSpainOfficial limit={30} />
              </div>
            </details>
          </div>
        )}


        {/* TAB 6b — Análisis IA (escenarios + clock + graph + analog + briefing IA) */}
        {tab === 6 && (
          <div>
            {/* Sprint G4 · WAR-GAMING interactivo + Historical Analog Finder */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
              <GeoScenarioSlider />
              <GeoAnalogFinder />
            </div>
            {/* Sprint G3 · features visuales novedosas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
              <GeopoliticalClock />
              <GeoStakeholderGraph />
            </div>
            <AnalisisIATab alertas={alertas} riesgo={riesgoSorted} osint={osint}/>
          </div>
        )}

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
