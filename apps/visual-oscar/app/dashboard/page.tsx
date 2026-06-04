'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated, getAccessToken } from '@/lib/auth'
import dynamic from 'next/dynamic'
import { useApiQuery } from '@/lib/api/use-api-query'
import { apiClient } from '@/lib/api/client'
import BrainBriefing from '@/components/BrainBriefing'
import BriefingExports from '@/components/BriefingExports'
import CountUp from '@/components/CountUp'
import Skeleton, { LiveDot } from '@/components/Skeleton'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import AlertCard, { AlertKeyframes, LEVELS_ORDER, type AlertaItem } from '@/components/AlertCard'
import NewsCard, { type NewsItem } from '@/components/NewsCard'
import EmptyState from '@/components/EmptyState'
import MetricTrace from '@/components/MetricTrace'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import OsintAlertsCard from '@/components/OsintAlertsCard'
import type { DashboardHome } from '../api/dashboard/home/route'

// Bloques pesados (mercados, macro, geopolítica, energía, comercio) cargados de
// forma diferida (code-split + ssr:false) para aligerar el JS inicial del dashboard.
const _ph = () => <div aria-hidden style={{ minHeight: 120 }} />
const MarketSnapshot = dynamic(() => import('@/components/markets/MarketSnapshot').then(m => m.MarketSnapshot), { ssr: false, loading: _ph })
const NasdaqMacroSnapshot = dynamic(() => import('@/components/macro/NasdaqMacroSnapshot').then(m => m.NasdaqMacroSnapshot), { ssr: false, loading: _ph })
const AcledSpainContext = dynamic(() => import('@/components/geopolitics/AcledSpainContext').then(m => m.AcledSpainContext), { ssr: false, loading: _ph })
const EmberSpainElectricity = dynamic(() => import('@/components/energy/EmberSpainElectricity').then(m => m.EmberSpainElectricity), { ssr: false, loading: _ph })
const ComtradeSpainOverview = dynamic(() => import('@/components/trade/ComtradeSpainOverview').then(m => m.ComtradeSpainOverview), { ssr: false, loading: _ph })

// ── News feed types (backend Ollama-analyzed, sin HTML escapado) ─────────────

interface NewsFeedArticle {
  id: number
  title: string
  url: string
  source_name: string
  source_country?: string
  source_region?: string
  published_at: string | null
  ai_summary?: string
  ai_topics?: string[]
  ai_sentiment?: 'positivo' | 'negativo' | 'neutro' | 'mixto'
  ai_relevance: number
  ai_category?: string
  ai_geo_location?: string
  ai_spain_impact?: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico'
}

// ── Static CCAA metadata ──────────────────────────────────────────────────────

type MapTab = 'electoral' | 'narrativa' | 'figuras'

const BACKEND_NAME_MAP: Record<string, string> = {
 'C. Valenciana': 'Comunidad Valenciana',
 'C-La Mancha': 'Castilla-La Mancha',
 'Castilla y León': 'Castilla y León',
 'País Vasco': 'País Vasco',
 'La Rioja': 'La Rioja',
}

const REGION_GRID: Array<Array<{ name: string; display: string; flex: number; height: number }>> = [
  [
    { name: 'Andalucía',          display: 'Andalucía',   flex: 2.0, height: 96 },
    { name: 'Cataluña',           display: 'Cataluña',    flex: 1.4, height: 96 },
    { name: 'Madrid',             display: 'Madrid',      flex: 1.4, height: 96 },
  ],
  [
    { name: 'C. Valenciana',      display: 'Valencia',    flex: 1, height: 78 },
    { name: 'Galicia',            display: 'Galicia',     flex: 1, height: 78 },
    { name: 'Castilla y León',    display: 'C. y León',   flex: 1, height: 78 },
    { name: 'País Vasco',         display: 'P. Vasco',    flex: 1, height: 78 },
    { name: 'Castilla-La Mancha', display: 'C-La Mancha', flex: 1, height: 78 },
  ],
  [
    { name: 'Canarias',    display: 'Canarias',  flex: 1, height: 64 },
    { name: 'Murcia',      display: 'Murcia',    flex: 1, height: 64 },
    { name: 'Asturias',    display: 'Asturias',  flex: 1, height: 64 },
    { name: 'Aragón',      display: 'Aragón',    flex: 1, height: 64 },
    { name: 'Baleares',    display: 'Baleares',  flex: 1, height: 64 },
    { name: 'Extremadura', display: 'Extremad.', flex: 1, height: 64 },
    { name: 'Navarra',     display: 'Navarra',   flex: 1, height: 64 },
    { name: 'La Rioja',    display: 'Rioja',     flex: 1, height: 64 },
    { name: 'Cantabria',   display: 'Cantabria', flex: 1, height: 64 },
  ],
]

const REGION_COLOR = { pp: '#2D4A8A', psoe: '#C53030', mixed: '#6e7278' } as const
const REGION_LABEL = { pp: 'PP', psoe: 'PSOE', mixed: '?' } as const

// Narrativa dominante por CCAA · actualizado mayo 2026 (post-DANA + concierto catalán
// + sequía + crisis judicial CGPJ + corredor mediterráneo + paro juvenil)
const CCAA_NARRATIVA: Record<string, { tema: string; color: string }> = {
 'Andalucía':          { tema: 'Vivienda urbana',   color: '#2d8a39' },
 'Cataluña':           { tema: 'Concierto fiscal',  color: '#D97706' },
 'Madrid':             { tema: 'Sanidad pública',   color: '#1F4E8C' },
 'C. Valenciana':      { tema: 'Reconstrucción DANA', color: '#0E7490' },
 'Galicia':            { tema: 'Acuicultura · ENCE', color: '#7C3AED' },
 'Castilla y León':    { tema: 'Despoblación',      color: '#b25000' },
 'País Vasco':         { tema: 'Transferencias',    color: '#0F766E' },
 'Castilla-La Mancha': { tema: 'Trasvase Tajo',     color: '#0070D1' },
 'Canarias':           { tema: 'Migración menores', color: '#C01818' },
 'Murcia':             { tema: 'Mar Menor · agua',  color: '#0070D1' },
 'Asturias':           { tema: 'Reindustrialización', color: '#525258' },
 'Aragón':             { tema: 'Hidrógeno · GIGA',  color: '#D97706' },
 'Baleares':           { tema: 'Turismo masivo',    color: '#0E7490' },
 'Extremadura':        { tema: 'Tren digno',        color: '#2d8a39' },
 'Navarra':            { tema: 'Concierto · UPN',   color: '#0F766E' },
 'La Rioja':           { tema: 'Viticultura',       color: '#2d8a39' },
 'Cantabria':          { tema: 'Sanidad rural',     color: '#525258' },
}

// Presidente autonómico actual · mayo 2026 (post-DANA · Mazón dimite y le sucede Pérez Llorca ·
// Buruaga gana Cantabria · Capellán La Rioja · resto continuidad 2023)
const CCAA_FIGURA: Record<string, { name: string; partido: string; trend: string; dir: 'up' | 'down' | 'flat' }> = {
 'Andalucía':          { name: 'J. Moreno',         partido: 'PP',   trend: '+1.4', dir: 'up' },
 'Cataluña':           { name: 'S. Illa',           partido: 'PSC',  trend: '+2.3', dir: 'up' },
 'Madrid':             { name: 'I. D. Ayuso',       partido: 'PP',   trend: '-0.6', dir: 'down' },
 'C. Valenciana':      { name: 'J. Pérez Llorca',   partido: 'PP',   trend: '+0.9', dir: 'up' },
 'Galicia':            { name: 'A. Rueda',          partido: 'PP',   trend: '+0.7', dir: 'up' },
 'Castilla y León':    { name: 'A. Mañueco',        partido: 'PP',   trend: '-0.1', dir: 'flat' },
 'País Vasco':         { name: 'I. Pradales',       partido: 'PNV',  trend: '+1.1', dir: 'up' },
 'Castilla-La Mancha': { name: 'E. García-Page',    partido: 'PSOE', trend: '+0.6', dir: 'up' },
 'Canarias':           { name: 'F. Clavijo',        partido: 'CC',   trend: '-0.8', dir: 'down' },
 'Murcia':             { name: 'F. López Miras',    partido: 'PP',   trend: '-0.4', dir: 'down' },
 'Asturias':           { name: 'A. Barbón',         partido: 'PSOE', trend: '+1.2', dir: 'up' },
 'Aragón':             { name: 'J. Azcón',          partido: 'PP',   trend: '+0.4', dir: 'up' },
 'Baleares':           { name: 'M. Prohens',        partido: 'PP',   trend: '+0.5', dir: 'up' },
 'Extremadura':        { name: 'M. Guardiola',      partido: 'PP',   trend: '-0.2', dir: 'down' },
 'Navarra':            { name: 'M. Chivite',        partido: 'PSN',  trend: '+0.3', dir: 'up' },
 'La Rioja':           { name: 'G. Capellán',       partido: 'PP',   trend: '+0.8', dir: 'up' },
 'Cantabria':          { name: 'M.J. Sáenz Buruaga',partido: 'PP',   trend: '+1.0', dir: 'up' },
}

// Figuras en tendencia · actualizado mayo 2026 (8 actores · tracking semanal)
const TRENDING_FIGURES = [
  { name: 'P. Sánchez',     party: 'PSOE',  trend: '-0.4', dir: 'down' as const, color: '#C53030' },
  { name: 'A. Feijóo',      party: 'PP',    trend: '+1.6', dir: 'up' as const, color: '#2D4A8A' },
  { name: 'I. D. Ayuso',    party: 'PP',    trend: '+2.2', dir: 'up' as const, color: '#2D4A8A' },
  { name: 'S. Abascal',     party: 'VOX',   trend: '+0.7', dir: 'up' as const, color: '#63BE21' },
  { name: 'Y. Díaz',        party: 'SUMAR', trend: '-1.1', dir: 'down' as const, color: '#BF3F7E' },
  { name: 'C. Puigdemont',  party: 'JUNTS', trend: '+0.5', dir: 'up' as const, color: '#1FA89B' },
  { name: 'P. Bolaños',     party: 'PSOE',  trend: '-0.3', dir: 'down' as const, color: '#C53030' },
  { name: 'M. J. Montero',  party: 'PSOE',  trend: '+0.8', dir: 'up' as const, color: '#C53030' },
]

// ── Module grid (single unified section) ──────────────────────────────────────

const MODULES = [
  { href: '/dosieres',            label: 'Dosieres de personas',  sub: '3.342 fichas · Congreso + Senado + 18 parlamentos autonómicos + 50 ayuntamientos capitales · relaciones · patrimonio', accent: '#7C2D12', tag: 'NUEVO' },
  { href: '/coaliciones',         label: 'Hub electoral',         sub: '8 tabs · Adversario · Voto blando',    accent: '#5B21B6', tag: 'NUEVO' },
  { href: '/mapa-actores',        label: 'Mapa de actores',       sub: 'Grafo · Dossier · Cuadrante ideológico', accent: '#1F4E8C', tag: 'EXPANDIDO' },
  { href: '/riesgo',              label: 'Índice de Riesgo Político',             sub: 'Señales · simulador · escenarios',     accent: '#c42c2c', tag: 'EXPANDIDO' },
  { href: '/medios-narrativa',    label: 'Medios y narrativa',     sub: '487 fuentes · ciclo de vida narrativo',accent: '#b25000', tag: 'EXPANDIDO' },
  { href: '/monitor-legislativo', label: 'Monitor legislativo',   sub: 'BOE · Congreso · Senado · timeline',   accent: '#0F766E', tag: 'NUEVO' },
  { href: '/briefing',            label: 'Briefing diario',        sub: 'PDF · archivo histórico · digest',     accent: '#2d8a39', tag: 'EXPANDIDO' },
  { href: '/geopolitica',         label: 'Geopolítica',            sub: 'Live ticker · OSINT · presencia España',accent: '#0E7490', tag: 'NUEVO' },
  { href: '/workspaces',          label: 'Workspaces',             sub: 'KPIs · briefings archivados',          accent: '#7C3AED', tag: 'NUEVO' },
  { href: '/nowcasting',          label: 'Intención de voto',      sub: 'Encuestas · nowcast · partidos',       accent: '#0070D1', tag: '' },
  { href: '/escenarios',          label: 'Mayorías y coaliciones', sub: "Escenarios de mayoría · D'Hondt",      accent: '#8B5CF6', tag: '' },
  { href: '/macro',               label: 'Indicadores macro',      sub: 'PIB · deuda · mercados en tiempo real',accent: '#16A34A', tag: '' },
  { href: '/alertas',             label: 'Alertas activas',        sub: 'Señales críticas · detección escaladas',accent: '#D97706', tag: '' },
]

/** Converts whatever the backend sends in news_pulse.parties to a display string.
 *  Backend can return a string "PP, PSOE", an array of strings ["PP","PSOE"],
 *  or an array of objects [{partido:'PP',pct:0.5},...] — all are safe here. */
function sanitizeParties(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        return String(o.partido ?? o.siglas ?? o.nombre ?? o.id ?? '')
      }
      return String(item)
    }).filter(Boolean).join(', ')
  }
  return ''
}

// Flecha decorativa reutilizable; aria-hidden para que los lectores de pantalla
// no la lean (el botón ya tiene texto visible).
function ArrowIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}

// Saludo personalizado · el token local codifica el email (local.<b64>.session).
const KNOWN_NAMES: Record<string, string> = { oscar: 'Óscar', antonio: 'Antonio', invitado: 'Invitado' }
function userFirstName(): string {
  try {
    const t = getAccessToken()
    if (!t) return ''
    const email = atob(t.split('.')[1] || '')
    const local = (email.split('@')[0] || '').toLowerCase()
    return KNOWN_NAMES[local] ?? (local ? local.charAt(0).toUpperCase() + local.slice(1) : '')
  } catch {
    return ''
  }
}
function greetingForHour(h: number): string {
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const router = useRouter()
  const [mapTab, setMapTab] = useState<MapTab>('electoral')
  // null = comprobando sesión; evita renderizar el dashboard antes de confirmar auth.
  const [authed, setAuthed] = useState<boolean | null>(null)

  // React Query (caché compartida + dedupe). El provider está en app/layout.tsx.
  const homeQ = useApiQuery<DashboardHome>(
    ['dashboard', 'home'],
    () => apiClient.get<DashboardHome>('/api/dashboard/home'),
    { refetchInterval: 60_000 },
  )
  const data = homeQ.data
  const source = homeQ.meta?.source ?? null
  const updatedAt = homeQ.meta?.ts ?? null
  const loading = homeQ.isLoading
  const refresh = homeQ.refetch

  // /api/news/feed devuelve artículos ya analizados (ai_summary limpio, ai_relevance…)
  const { data: newsRaw, isLoading: trendsLoading } = useApiQuery<{ articles?: NewsFeedArticle[]; count?: number }>(
    ['news', 'feed', 'dashboard'],
    () => apiClient.get('/api/news/feed?limit=12&min_relevance=0.5'),
    { refetchInterval: 120_000 },
  )

  // Alertas con shape rico (misma visual que /alertas)
  const { data: signalsData } = useApiQuery<{ signals?: AlertaItem[] }>(
    ['intelligence', 'signals', 'legacy'],
    () => apiClient.get('/api/intelligence/signals?legacy=1'),
    { refetchInterval: 30_000 },
  )
  // "Lo urgente de hoy" sale de una fuente VIVA que varía: artículos de alto
  // impacto del feed (si hay backend) o, en demo, los titulares RSS de news_pulse.
  // Cada urgente lleva su medio como fuente y enlaza a la noticia real. Si no hay
  // noticias, cae a las señales curadas.
  const relTs = (iso: string | null): string => {
    if (!iso) return 'hoy'
    const mm = Math.round((Date.now() - Date.parse(iso)) / 60000)
    if (isNaN(mm)) return 'hoy'
    if (mm < 60) return `hace ${mm} min`
    const h = Math.round(mm / 60)
    return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`
  }
  const googleNews = (t: string) => `https://news.google.com/search?q=${encodeURIComponent(t)}&hl=es`
  const newsUrgent: AlertaItem[] = (() => {
    const arts = newsRaw?.articles ?? []
    const high = arts.filter(a => a.ai_spain_impact === 'critico' || a.ai_spain_impact === 'alto' || (a.ai_relevance ?? 0) >= 0.72)
    if (high.length) {
      return high
        .sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0))
        .slice(0, 6)
        .map(a => ({
          id: `urg-${a.id}`,
          level: (a.ai_spain_impact === 'critico' ? 'rojo-parpadeante' : a.ai_spain_impact === 'alto' ? 'rojo' : 'naranja') as AlertaItem['level'],
          category: (a.ai_category ?? 'actualidad') as AlertaItem['category'],
          title: a.title,
          description: a.ai_summary ?? '',
          source: a.source_name,
          ts: relTs(a.published_at),
          evidenceUrl: a.url || googleNews(a.title),
        }))
    }
    const np = data?.news_pulse ?? []
    return np.slice()
      .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
      .slice(0, 6)
      .map(n => ({
        id: `urg-${n.id}`,
        level: ((n.relevance ?? 0) >= 0.9 ? 'rojo' : (n.relevance ?? 0) >= 0.78 ? 'naranja' : 'amarillo') as AlertaItem['level'],
        category: 'actualidad' as AlertaItem['category'],
        title: n.title,
        description: '',
        source: n.source,
        ts: 'hoy',
        evidenceUrl: n.url || googleNews(n.title),
      }))
  })()
  const richAlerts: AlertaItem[] = (newsUrgent.length ? newsUrgent : (signalsData?.signals ?? []))
    .slice()
    .sort((a, b) => LEVELS_ORDER.indexOf(a.level) - LEVELS_ORDER.indexOf(b.level))
  const top5Alerts = richAlerts.slice(0, 5)

  useEffect(() => {
    const ok = isAuthenticated()
    if (!ok) router.push('/login')
    setAuthed(ok)
  }, [router])

  const isReady = !!data && Array.isArray(data.parties) && data.parties.length > 0

  // Sesión en localStorage (solo legible en cliente). Hasta confirmarla no
  // renderizamos el dashboard: evita el "flash" antes de redirigir al login.
  if (authed !== true) {
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} aria-busy="true" />
  }

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
 <AppHeader/>

 <main style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 40px 64px' }}>

        {/* ═══════════════ 0 · SALUDO PERSONALIZADO ═══════════════ */}
 <div style={{ marginBottom: 18 }}>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#1d1d1f' }}>
            {greetingForHour(new Date().getHours())}{userFirstName() ? `, ${userFirstName()}` : ''}
 </h1>
 <p style={{ fontSize: 13, color: '#6e6e73', margin: '3px 0 0', textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
 </p>
 </div>

        {/* Acciones rápidas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -8, marginBottom: 18 }}>
          {[
            { label: 'Briefing diario', href: '/briefing', accent: '#2d8a39' },
            { label: 'Abrir workspace', href: '/workspaces', accent: '#7C3AED' },
            { label: 'Mapa OSINT', href: '/osint-global', accent: '#0E7490' },
            { label: 'Alertas activas', href: '/alertas', accent: '#D97706' },
          ].map(qa => (
            <a key={qa.href} href={qa.href} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12.5, fontWeight: 600, color: qa.accent,
              background: '#fff', border: `1px solid ${qa.accent}33`, borderRadius: 999,
              padding: '6px 13px', textDecoration: 'none',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: qa.accent }} />
              {qa.label}
            </a>
          ))}
        </div>

        {/* ═══════════════ 1 · IA · chat con PoliteIA ═══════════════
           Primera vista de la pantalla. Cabecera dark con la conversación
           con PoliteIA + lectura analítica del día + tres preguntas
           sugeridas para profundizar.
        */}
 <BrainBriefing/>

        {/* ═══════════════ 2 · INFORMES · PDF y audio del briefing ═══════════════
           Justo debajo de la IA. Para descargar el briefing diario en PDF
           (formato nota o informe completo) o escucharlo en audio (TTS).
        */}
 <BriefingExports/>

        {/* ═══════════════ BANNER · Dosieres de personas ═══════════════ */}
 <section style={{
          background: 'linear-gradient(135deg, #1F4E8C 0%, #0F2A4F 100%)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          color: '#fff',
        }}>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
 <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '3px 9px', borderRadius: 999,
                background: 'rgba(255,255,255,0.18)', color: '#fff',
              }}>NUEVO</span>
 <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                Inteligencia política · personas
 </span>
 </div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.018em', margin: '0 0 4px' }}>
              3.342 dosieres · Congreso + Senado + 18 autonómicos + 50 ayuntamientos capitales
 </h2>
 <p style={{ fontSize: 13, margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
              Gobierno, oposición, regionalistas y todos los grupos parlamentarios. Cada ficha trae perfil ampliado, relaciones políticas valoradas (+10 / −10) y patrimonio declarado.
 </p>
 </div>
 <a
            href="/dosieres"
            style={{
              padding: '12px 22px', borderRadius: 999,
              background: '#fff', color: '#1F4E8C',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
              textDecoration: 'none', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'transform 150ms, box-shadow 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            Abrir dosieres →
 </a>
 </section>

        {/* ═══════════════ SITUACIÓN MUNDIAL · OSINT en vivo ═══════════════
           Mini-mapa OSINT (conflictos, guerras, desastres, sanciones) + alertas
           en vivo. Reutiliza el módulo de mapa en modo embed. */}
 <section style={{ marginBottom: 20 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
 <span style={{ width: 7, height: 7, borderRadius: 99, background: '#0E7490' }} />
              Situación mundial · OSINT en vivo
 </h2>
 <a href="/osint-global" style={{ fontSize: 12, fontWeight: 600, color: '#0E7490', textDecoration: 'none' }}>Abrir mapa completo →</a>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 14 }} className="home-osint-grid">
 <SectorMapPreview sector="inicio" accent="#0E7490" height={340} caption="situación mundial · conflictos y desastres" marginTop={0} lazyClick />
 <OsintAlertsCard height={340} />
 </div>
 </section>

        {/* ═══════════════ 3 · PANEL EJECUTIVO · KPIs ═══════════════
           Bloque destacado · KPIs principales + risk + macro.
           Las alertas tienen ahora sección propia debajo (mejor organizada).
           Layout interno:
             [ Risk Hero (1.2fr) | KPIs 2x2 (1fr × 2) ]
             [ Macro strip (4 cols con sparklines) ]
        */}
 <section style={{
          background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
          borderRadius: 16, padding: '20px 22px', marginBottom: 18,
          border: '1px solid #ECECEF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          {/* Section header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
                Tu panel de hoy
 </h2>
 <span style={{ fontSize: 11.5, color: '#86868b', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                Todo lo que necesitas saber, de un vistazo
 </span>
 </div>
 <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
 </div>

          {homeQ.isError && !data && (
 <div role="alert" style={{
              background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
 <span>No se pudieron cargar los datos del panel.</span>
 <button onClick={() => refresh()} style={{
                background: '#B91C1C', color: '#fff', border: 'none', borderRadius: 999,
                padding: '5px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Reintentar</button>
 </div>
          )}

          {/* Row 1: Risk hero (left) + KPIs grid 2x2 (right) */}
 <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: 12, marginBottom: 12 }}>

            {/* Risk hero card */}
            {(() => {
              const risk = data?.risk
              const score = risk?.score ?? 0
              const semaforo = (risk?.semaforo ?? 'verde').toLowerCase()
              const semColor = semaforo === 'rojo' ? '#DC2626' : semaforo === 'ambar' || semaforo === 'amarillo' ? '#D97706' : '#16A34A'
              const semLabel = semaforo === 'rojo' ? 'Rojo' : semaforo === 'ambar' || semaforo === 'amarillo' ? 'Ámbar' : 'Verde'
              return (
 <div onClick={() => router.push('/riesgo')}
                  role="button" tabIndex={0}
                  aria-label={`Índice de riesgo político: ${semLabel}. Abrir detalle`}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/riesgo') } }}
                  style={{
                  background: '#fff', borderRadius: 12, padding: '16px 18px',
                  border: '1px solid #ECECEF', borderLeft: `4px solid ${semColor}`,
                  cursor: 'pointer', transition: 'box-shadow 150ms, transform 150ms',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 150,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
 <div>
 <p style={{ fontSize: 11.5, color: '#86868b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                      ¿Cuánta tensión hay hoy?
 </p>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', color: semColor, lineHeight: 1 }}>
                        {isReady ? <CountUp value={score}/> : <Skeleton width={84} height={48} radius={6}/>}
 </span>
 <span style={{ fontSize: 12, color: '#86868b', fontWeight: 500 }}>/100</span>
 </div>
 </div>
 <div>
 <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: `${semColor}14`, border: `1px solid ${semColor}33` }}>
 <span style={{ width: 7, height: 7, borderRadius: '50%', background: semColor }}/>
 <span style={{ fontSize: 12, fontWeight: 700, color: semColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{semLabel}</span>
 </div>
 <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '6px 0 0' }}>
                      Cómo está el clima político y económico · pincha para ver más
 </p>
 </div>
 </div>
              )
            })()}

            {/* KPIs grid 2x2 */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 10 }}>
              {(data?.kpis ?? []).slice(0, 4).map(k => {
                const numeric = typeof k.value === 'number' ? k.value : Number(String(k.value).replace(/[^0-9.-]/g, ''))
                const suffix = typeof k.value === 'string' && k.value.includes('%') ? '%' : ''
                return (
 <div key={k.label} style={{
                    background: '#fff', borderRadius: 10, padding: '12px 14px',
                    border: '1px solid #ECECEF', borderLeft: `3px solid ${k.accent}`,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
 <p style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>{k.label}</p>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: k.accent, lineHeight: 1, marginTop: 4 }}>
                      {isReady && !Number.isNaN(numeric)
                        ? <><CountUp value={numeric}/>{suffix}</>
                        : <Skeleton width={58} height={30} radius={4}/>
                      }
 </div>
 <p style={{ fontSize: 11.5, color: '#86868b', margin: '3px 0 0', lineHeight: 1.3 }}>{k.sub}</p>
 </div>
                )
              })}
              {!data?.kpis && !isReady && [0,1,2,3].map(i => (
 <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ECECEF' }}>
 <Skeleton width={80} height={11} radius={3} style={{ marginBottom: 8 }}/>
 <Skeleton width={80} height={30} radius={4}/>
 </div>
              ))}
 </div>
 </div>

          {/* Row 2: Macro strip (4 cols con sparklines) */}
          {data?.macro && data.macro.length > 0 && (
 <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, data.macro.length)}, 1fr)`, gap: 8, marginBottom: 12 }}>
              {data.macro.slice(0, 4).map(m => {
                const goodIsUp = m.good === 'up'
                const isPositiveDir = m.dir === 'up'
                const isGood = goodIsUp ? isPositiveDir : !isPositiveDir
                const trendColor = isGood ? '#16A34A' : '#DC2626'
                const data_arr = Array.isArray(m.data) && m.data.length > 1 ? m.data : []
                const min = data_arr.length ? Math.min(...data_arr) : 0
                const max = data_arr.length ? Math.max(...data_arr) : 1
                const range = max - min || 1
                const w = 80, h = 22
                const points = data_arr.map((v, i) => {
                  const x = (i / (data_arr.length - 1)) * w
                  const y = h - ((v - min) / range) * h
                  return `${x},${y}`
                }).join(' ')
                return (
 <div key={m.label} onClick={() => router.push('/macro')} style={{
                    background: '#fff', borderRadius: 10, padding: '10px 12px',
                    border: '1px solid #ECECEF', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D6D6DA' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECECEF' }}
                  >
 <div style={{ minWidth: 0, flex: 1 }}>
 <p style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, marginBottom: 2 }}>{m.label}</p>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em', color: '#1d1d1f' }}>{m.value}</span>
 <span style={{ fontSize: 11.5, fontWeight: 700, color: trendColor }}>
                          {isPositiveDir ? '↑' : '↓'} {m.delta}
 </span>
 </div>
 </div>
                    {data_arr.length > 1 && (
 <svg width={w} height={h} style={{ flexShrink: 0 }}>
 <polyline points={points} fill="none" stroke={trendColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
 </svg>
                    )}
 </div>
                )
              })}
 </div>
          )}

 </section>

        {/* ═══════════════ ALERTAS · sección propia mejor organizada ═══════════════
           Antes estaban dentro del panel ejecutivo (Row 3) — ahora tienen su
           propio espacio para destacarlas y dar contexto: contador con
           desglose por nivel (críticas/altas/medias), CTA prominente.
        */}
 <section style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 18,
          border: '1px solid #ECECEF',
          borderLeft: top5Alerts.length > 0 ? '4px solid #DC2626' : '4px solid #16A34A',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {(() => {
            const criticas = richAlerts.filter(a => a.level === 'rojo-parpadeante').length
            const altas = richAlerts.filter(a => a.level === 'rojo').length
            const medias = richAlerts.filter(a => a.level === 'naranja' || a.level === 'amarillo').length
            return (
              <>
                {/* Header con contador desglosado */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f' }}>
                      {top5Alerts.length > 0 ? 'Lo urgente de hoy' : 'Hoy todo en calma'}
 </h2>
                    {top5Alerts.length > 0 && (
 <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {criticas > 0 && (
 <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, background: '#FEE2E2', color: '#991B1B', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {criticas} {criticas === 1 ? 'crítica' : 'críticas'}
 </span>
                        )}
                        {altas > 0 && (
 <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {altas} altas
 </span>
                        )}
                        {medias > 0 && (
 <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, background: '#DBEAFE', color: '#1E40AF', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {medias} medias
 </span>
                        )}
 </div>
                    )}
 </div>
                  {top5Alerts.length > 0 && (
 <button onClick={() => router.push('/alertas')} style={{
                      background: '#1d1d1f', border: 'none', cursor: 'pointer',
                      fontSize: 12.5, color: '#fff', fontFamily: 'inherit', fontWeight: 600,
                      padding: '7px 16px', borderRadius: 999,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transition: 'transform 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                      Ver las {richAlerts.length} alertas
 <ArrowIcon size={11}/>
 </button>
                  )}
 </div>

                {/* Lista */}
                {top5Alerts.length === 0 && !loading ? (
 <EmptyState
                    severity="success"
                    compact
                    title="Sin alertas en este momento"
                    description="No vemos nada raro en las últimas 24 horas. Si algo se mueve, te lo decimos aquí."
                    source="Politeia · revisando todas las fuentes"
                    lastUpdated={data?.last_updated ?? null}
                    secondaryAction={{ label: 'Ver alertas anteriores', href: '/alertas' }}
                  />
                ) : (
                  <>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {top5Alerts.map(a => (
 <AlertCard key={a.id} alert={a} compact onDetailClick={() => router.push('/alertas')}/>
                      ))}
 </div>
 <AlertKeyframes/>
                  </>
                )}
              </>
            )
          })()}
 </section>

        {/* Lo que se está moviendo ahora · artículos analizados por IA del backend */}
        {(() => {
          // Color por categoría detectada por IA
          const CATEGORIA_COLOR: Record<string, string> = {
            politica: '#1F4E8C',
            geopolitica: '#c42c2c',
            economia: '#2d8a39',
            sociedad: '#7C3AED',
            sucesos: '#D97706',
            deporte: '#0E7490',
            cultura: '#7C2D12',
          }
          // Color del sentimiento detectado por IA
          const SENT_COLOR: Record<string, string> = {
            positivo: '#16A34A', negativo: '#DC2626', neutro: '#6e6e73', mixto: '#D97706',
          }
          // Bandera por país (subset común)
          const COUNTRY_FLAG: Record<string, string> = {
            ES: '🇪🇸', US: '🇺🇸', UK: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹',
            UA: '🇺🇦', RU: '🇷🇺', CN: '🇨🇳', IL: '🇮🇱', PS: '🇵🇸',
          }

          const articles: NewsFeedArticle[] = (newsRaw?.articles ?? [])
            .slice()
            .sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0))
            .slice(0, 12)
          const highImpact = articles.filter(a =>
            a.ai_spain_impact === 'alto' || a.ai_spain_impact === 'critico'
          ).slice(0, 3)
          const sourcePills = Array.from(new Set(articles.map(a => a.source_name))).slice(0, 5)
          const lastTs = articles.length > 0 ? articles[0].published_at : null
          const formattedTs = lastTs
            ? new Date(lastTs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            : null

          return (
 <section style={{ marginBottom: 20 }}>
              {/* Section header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f' }}>
                  Lo que se está moviendo ahora
 </h2>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {formattedTs && (
 <span style={{ fontSize: 11.5, color: '#6e6e73', fontWeight: 500 }}>
                      {formattedTs}
 </span>
                  )}
                  {sourcePills.map(src => (
 <span key={src} style={{
                      fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                      background: '#F5F5F7', color: '#6e6e73', letterSpacing: '0.03em',
                      border: '1px solid #ECECEF',
                    }}>
                      {src}
 </span>
                  ))}
 </div>
 </div>

              {/* Horizontal scroll row · artículos */}
              {trendsLoading ? (
 <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
                  {[0,1,2,3,4,5].map(i => (
 <div key={i} style={{
                      minWidth: 240, maxWidth: 280, flexShrink: 0,
                      background: '#fff', borderRadius: 10, padding: '12px 13px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: '1px solid #ECECEF', borderLeft: '3px solid #e8e8ed',
                    }}>
 <Skeleton width={160} height={10} radius={4} style={{ marginBottom: 7 }}/>
 <Skeleton width={80} height={8} radius={4} style={{ marginBottom: 8 }}/>
 <Skeleton width={180} height={8} radius={4} style={{ marginBottom: 4 }}/>
 <Skeleton width={140} height={8} radius={4} style={{ marginBottom: 12 }}/>
 <Skeleton width={'100%' as unknown as number} height={3} radius={3}/>
 </div>
                  ))}
 </div>
              ) : articles.length === 0 ? (
 <div style={{
                  background: '#fff', borderRadius: 10, padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #ECECEF',
                  textAlign: 'center', color: '#6e6e73', fontSize: 13,
                }}>
                  No tenemos artículos analizados ahora mismo
 </div>
              ) : (
 <div style={{
                  display: 'flex', gap: 8, overflowX: 'auto',
                  paddingBottom: 4,
                  msOverflowStyle: 'none',
                } as React.CSSProperties}>
                  {articles.map(a => {
                    const accentColor = a.ai_category ? (CATEGORIA_COLOR[a.ai_category] ?? '#6e6e73') : '#6e6e73'
                    const isHigh = a.ai_spain_impact === 'alto' || a.ai_spain_impact === 'critico'
                    const borderLeft = isHigh ? '3px solid #c42c2c' : `3px solid ${accentColor}`
                    return (
 <div key={a.id}
                        onClick={() => a.url ? window.open(a.url, '_blank', 'noopener,noreferrer') : undefined}
                        style={{
                          minWidth: 240, maxWidth: 280, flexShrink: 0,
                          background: '#fff', borderRadius: 10, padding: '11px 13px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          border: '1px solid #ECECEF', borderLeft,
                          cursor: a.url ? 'pointer' : 'default',
                          display: 'flex', flexDirection: 'column', gap: 5,
                          position: 'relative',
                          transition: 'box-shadow 150ms',
                        }}
                        onMouseEnter={e => { if (a.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                      >
                        {/* Badges: categoría + impacto España */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
 <span style={{
                            fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: `${accentColor}14`, color: accentColor, letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}>
                            {a.ai_category ?? 'noticia'}
 </span>
                          {isHigh && (
 <span style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                              background: '#FEE2E2', color: '#991B1B', letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}>
                              Impacto ES {a.ai_spain_impact}
 </span>
                          )}
 </div>

                        {/* Título de la noticia */}
 <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                          {a.title}
 </div>

                        {/* Fuente + país */}
 <div style={{ fontSize: 11.5, color: '#6e6e73', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {a.source_country && COUNTRY_FLAG[a.source_country] && (
 <span>{COUNTRY_FLAG[a.source_country]}</span>
                          )}
 <span>{a.source_name}</span>
 </div>

                        {/* Resumen IA (limpio, sin HTML) */}
                        {a.ai_summary && (
 <div style={{
                            fontSize: 12, color: '#444', lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties}>
                            {a.ai_summary}
 </div>
                        )}

                        {/* Topics IA (chips) */}
                        {a.ai_topics && a.ai_topics.length > 0 && (
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {a.ai_topics.slice(0, 3).map(t => (
 <span key={t} style={{
                                fontSize: 10, padding: '1px 5px', borderRadius: 999,
                                background: '#F0F4FF', color: '#1F4E8C', fontWeight: 600,
                                border: '1px solid #dce6ff',
                              }}>
                                {t}
 </span>
                            ))}
 </div>
                        )}

                        {/* Footer: relevancia + sentimiento + flecha */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
 <div style={{ flex: 1, height: 3, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
 <div style={{ width: `${Math.min(100, (a.ai_relevance ?? 0) * 100)}%`, height: '100%', background: accentColor, borderRadius: 3 }}/>
 </div>
                          {a.ai_sentiment && (
 <span style={{ fontSize: 10, color: SENT_COLOR[a.ai_sentiment] ?? '#6e6e73', fontWeight: 700, letterSpacing: '0.04em' }}>
                              ●
 </span>
                          )}
                          {a.url && (
 <span style={{ fontSize: 13, color: '#6e6e73', flexShrink: 0, lineHeight: 1 }}>→</span>
                          )}
 </div>
 </div>
                    )
                  })}
 </div>
              )}

              {/* Highlights · noticias con alto impacto en España */}
              {highImpact.length > 0 && !trendsLoading && (
 <div style={{ display: 'grid', gridTemplateColumns: `repeat(${highImpact.length}, 1fr)`, gap: 8, marginTop: 8 }}>
                  {highImpact.map(a => (
 <div key={`hi-${a.id}`}
                      onClick={() => a.url ? window.open(a.url, '_blank', 'noopener,noreferrer') : undefined}
                      style={{
                        background: '#fff', borderRadius: 10, padding: '13px 15px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid #f0d0d0', borderLeft: '3px solid #c42c2c',
                        cursor: a.url ? 'pointer' : 'default',
                        transition: 'box-shadow 150ms',
                      }}
                      onMouseEnter={e => { if (a.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                    >
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
 <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#991B1B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Impacto ES {a.ai_spain_impact}
 </span>
 </div>
 <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                        {a.title}
 </div>
                      {a.ai_summary && (
 <div style={{
                          fontSize: 12, color: '#444', lineHeight: 1.4, marginBottom: 6,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        } as React.CSSProperties}>
                          {a.ai_summary}
 </div>
                      )}
 <div style={{ fontSize: 11.5, color: '#6e6e73', fontWeight: 500 }}>{a.source_name}</div>
 </div>
                  ))}
 </div>
              )}
 </section>
          )
        })()}

        {/* News pulse (full width arriba) + Mapa territorial (full width abajo) */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

          {/* Pulso informativo · misma visual que las alertas (AlertCard) */}
 <section style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #ECECEF' }}>
            {/* Cabecera estilo "Top 5 alertas del día": label uppercase + chip + botón accent */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <span style={{ fontSize: 11.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Las 5 noticias del día
 </span>
                {data?.news_pulse && data.news_pulse.length > 0 && (
 <span style={{
                    fontSize: 11, padding: '2px 7px', borderRadius: 999,
                    background: '#F5F5F7', color: '#6e6e73', fontWeight: 600,
                  }}>
                    {data.news_pulse.length} titulares
 </span>
                )}
 </div>
 <button onClick={() => router.push('/medios-narrativa')} style={{
                background: '#0071e3', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#fff', fontFamily: 'inherit', fontWeight: 600,
                padding: '5px 12px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                Ver todo
 <ArrowIcon size={10}/>
 </button>
 </div>

            {data?.news_pulse && data.news_pulse.length > 0 && (
 <MetricTrace
                compact
                sources={[
                  { name: 'Agregador propio', href: '/medios-narrativa' },
                  { name: 'RSS · 30+ medios', href: '/medios-narrativa' },
                ]}
                period="últimas 48h"
                sampleSize={`${data.news_pulse.length} titulares analizados`}
                updatedAt={data?.last_updated ?? null}
                methodology="Sentiment heurístico por keywords. Ranking por relevancia del medio (audiencia mensual) × frescor (recencia del artículo)."
                style={{ marginBottom: 12, borderTop: 'none', paddingTop: 0 }}
              />
            )}

            {data?.news_pulse && data.news_pulse.length > 0 ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.news_pulse.slice(0, 5).map(n => {
                  const item: NewsItem = {
                    id: n.id,
                    title: n.title,
                    source: n.source,
                    sentiment: n.sentiment,
                    relevance: n.relevance,
                    url: n.url ?? newsRaw?.articles?.find(a => a.title === n.title)?.url ?? googleNews(n.title),
                    parties: sanitizeParties(n.parties),
                    ts: null,
                  }
                  return <NewsCard key={n.id} item={item} compact/>
                })}
 </div>
            ) : loading ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0,1,2,3,4].map(i => <Skeleton key={i} height={64} radius={14}/>)}
 </div>
            ) : (
 <EmptyState
                severity="neutral"
                title="Aún no hemos cargado las noticias"
                description="Estamos recogiendo los titulares de los medios en este momento. Dale un minuto."
                reason="Algunos feeds tardan un poco en arrancar después de un parón."
                source="Recogemos de 30 y pico de medios"
                lastUpdated={data?.last_updated ?? null}
                primaryAction={{ label: 'Probar otra vez', onClick: () => refresh() }}
                secondaryAction={{ label: 'Ver qué medios están caídos', href: '/medios-narrativa' }}
              />
            )}
 </section>

          {/* Mapa territorial — enriched */}
 <section style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Header + tab toggle */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                Qué pasa en cada comunidad
 </h2>
 <div style={{ display: 'flex', background: '#F5F5F7', borderRadius: 8, padding: 2, gap: 1 }}>
                {(['electoral', 'narrativa', 'figuras'] as MapTab[]).map(tab => (
 <button key={tab} onClick={() => setMapTab(tab)} style={{
                    background: mapTab === tab ? '#fff' : 'transparent',
                    border: 'none', cursor: 'pointer', borderRadius: 6,
                    padding: '3px 8px', fontSize: 11.5, fontWeight: 600,
                    color: mapTab === tab ? '#1d1d1f' : '#6e6e73',
                    fontFamily: 'inherit', letterSpacing: '0.01em',
                    boxShadow: mapTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize',
                    transition: 'all 150ms',
                  }}>
                    {tab === 'electoral' ? 'Electoral' : tab === 'narrativa' ? 'Narrativa' : 'Figuras'}
 </button>
                ))}
 </div>
 </div>

            {/* Map cells */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {REGION_GRID.map((row, ri) => (
 <div key={ri} style={{ display: 'flex', gap: 3 }}>
                  {row.map(cell => {
                    const region = data?.regions?.find(r => r.name === cell.name || r.name === BACKEND_NAME_MAP[cell.name])

                    if (mapTab === 'narrativa') {
                      const nv = CCAA_NARRATIVA[cell.name]
                      return (
 <div key={cell.name} onClick={() => router.push(`/mapa?ccaa=${encodeURIComponent(cell.name)}`)}
                          title={`${cell.name} · Narrativa dominante: ${nv?.tema ?? '?'}`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            background: nv ? `${nv.color}e8` : '#6e727888',
                            borderRadius: 6, padding: '5px 7px', color: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}>
 <div style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.8 }}>{cell.display}</div>
 <div style={{ fontSize: cell.height >= 78 ? 12.5 : 11.5, fontWeight: 700, lineHeight: 1.1 }}>{nv?.tema ?? '?'}</div>
 </div>
                      )
                    }

                    if (mapTab === 'figuras') {
                      const fg = CCAA_FIGURA[cell.name]
                      const dirColor = fg?.dir === 'up' ? '#16A34A' : fg?.dir === 'down' ? '#DC2626' : '#6e6e73'
                      const dirArrow = fg?.dir === 'up' ? '↑' : fg?.dir === 'down' ? '↓' : '–'
                      return (
 <div key={cell.name} onClick={() => router.push('/mapa-actores')}
                          title={`${cell.name} · ${fg?.name ?? '?'} (${fg?.partido ?? '?'})`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            background: '#1c2333',
                            borderRadius: 6, padding: '5px 7px', color: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderLeft: `3px solid ${dirColor}`,
                          }}>
 <div style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.6 }}>{cell.display}</div>
                          {cell.height >= 64 ? (
 <div>
 <div style={{ fontSize: cell.height >= 78 ? 12.5 : 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fg?.name ?? '?'}</div>
 <div style={{ fontSize: 12.5, color: dirColor, fontWeight: 700 }}>{dirArrow} {fg?.trend}</div>
 </div>
                          ) : (
 <div style={{ fontSize: 12.5, fontWeight: 700, color: dirColor }}>{dirArrow}{fg?.trend}</div>
                          )}
 </div>
                      )
                    }

                    // Electoral (default)
                    const lean = (region?.lean ?? 'mixed') as 'pp' | 'psoe' | 'mixed'
                    const diff = region?.diff ?? 0
                    return (
 <div key={cell.name} onClick={() => router.push(`/nowcasting?ccaa=${encodeURIComponent(cell.name)}`)}
                        title={region ? `${cell.name} · PP ${region.pp_pct}% · PSOE ${region.psoe_pct}% · dif ${region.diff > 0 ? '+' : ''}${region.diff}` : cell.name}
                        style={{
                          flex: cell.flex, height: cell.height,
                          background: REGION_COLOR[lean], borderRadius: 6,
                          padding: '5px 7px', color: '#fff',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          cursor: 'pointer', transition: 'background 600ms ease',
                        }}>
 <div style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.75 }}>{cell.display}</div>
                        {region && cell.height >= 64 ? (
 <div>
 <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff', marginBottom: 2 }}>
                              {lean === 'pp' ? 'PP' : lean === 'psoe' ? 'PSOE' : 'MIXTO'}
 </div>
 <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
                              PP {region.pp_pct.toFixed(1)}% · PSOE {region.psoe_pct.toFixed(1)}%
 </div>
 <div style={{ height: 3, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
 <div style={{ flex: region.pp_pct, background: '#5a9af0' }}/>
 <div style={{ flex: region.psoe_pct, background: '#f87171' }}/>
 <div style={{ flex: Math.max(0, 100 - region.pp_pct - region.psoe_pct), background: 'rgba(255,255,255,0.2)' }}/>
 </div>
 </div>
                        ) : cell.height >= 64 ? (
 <div>
 <div style={{ fontSize: cell.height >= 78 ? 16 : 13.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
                              {REGION_LABEL[lean]}
 </div>
                            {diff !== 0 && (
 <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2, fontWeight: 600 }}>
                                {diff > 0 ? '+' : ''}{Math.round(diff)} esc.
 </div>
                            )}
 </div>
                        ) : region ? (
                          // Small cell with real data: label + proportional bar
 <div>
 <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 3 }}>
                              {lean === 'pp' ? 'PP' : lean === 'psoe' ? 'PSOE' : 'MX'}
 </div>
 <div style={{ height: 3, borderRadius: 1, overflow: 'hidden', display: 'flex' }}>
 <div style={{ flex: region.pp_pct, background: '#5a9af0' }}/>
 <div style={{ flex: region.psoe_pct, background: '#f87171' }}/>
 <div style={{ flex: Math.max(0, 100 - region.pp_pct - region.psoe_pct), background: 'rgba(255,255,255,0.2)' }}/>
 </div>
 </div>
                        ) : (
 <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
                            {REGION_LABEL[lean]}
 </div>
                        )}
 </div>
                    )
                  })}
 </div>
              ))}
 </div>

            {/* Trending figures strip */}
 <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 9 }}>
 <div style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>
                Quién está subiendo y quién está bajando
 <span style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>· tracking semanal · datos a mayo 2026</span>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {TRENDING_FIGURES.map(f => {
                  const arrow = f.dir === 'up' ? '↑' : '↓'
                  const trendColor = f.dir === 'up' ? '#16A34A' : '#DC2626'
                  return (
 <button key={f.name} onClick={() => router.push('/mapa-actores')} style={{
                      background: '#F9F9FB', border: 'none', borderRadius: 7,
                      padding: '6px 7px', cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FB' }}>
 <div style={{ width: '100%', height: 2, background: f.color, borderRadius: 1, marginBottom: 5 }}/>
 <div style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span style={{ fontSize: 10, color: '#6e6e73' }}>{f.party}</span>
 <span style={{ fontSize: 10.5, fontWeight: 700, color: trendColor }}>{arrow}{f.trend}</span>
 </div>
 </button>
                  )
                })}
 </div>
 </div>

 </section>

 </div>

        {/* ═══════════════ CENTROS DE INTELIGENCIA ═══════════════
           Navegación principal · 12 módulos. Va al final porque es navegación,
           no contenido en vivo (los KPIs y tendencias se ven antes).
        */}

        {/* ─── Mercados live (Finnhub) + Conflictos contexto España (UCDP + GDELT) ─── */}
        <section
          style={{
            marginTop: 24,
            marginBottom: 24,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 14,
          }}
        >
          <MarketSnapshot variant="dashboard" compact={false} />
          {/* Sprint Nasdaq-Wire · macro USA + commodities oficiales (LBMA/OPEC/FRED).
              Si NASDAQ_DATA_LINK_KEY no está en env vars, muestra empty state honesto
              en lugar de fingir datos. Cache 6h en el endpoint. */}
          <NasdaqMacroSnapshot variant="dashboard" />
          <AcledSpainContext days={30} compact />
          <EmberSpainElectricity compact />
          <ComtradeSpainOverview compact />
        </section>

 <section style={{ marginTop: 24 }}>
 <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f' }}>
              ¿Dónde quieres ir ahora?
 </h2>
 <span style={{ fontSize: 12, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {MODULES.length} secciones · pincha en la que necesites
 </span>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {MODULES.map(m => (
 <button key={m.href} onClick={() => router.push(m.href)} style={{
                background: '#fff',
                border: m.tag ? `1px solid ${m.accent}22` : '1px solid #ECECEF',
                borderLeft: `3px solid ${m.accent}`,
                borderRadius: 10, padding: '11px 13px', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
 <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.005em', lineHeight: 1.3 }}>{m.label}</span>
                  {m.tag && (
 <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 999, letterSpacing: '0.05em', background: `${m.accent}18`, color: m.accent, flexShrink: 0, marginLeft: 6 }}>
                      {m.tag}
 </span>
                  )}
 </div>
 <p style={{ margin: 0, fontSize: 12, color: '#6e6e73', lineHeight: 1.35 }}>{m.sub}</p>
 </button>
            ))}
 </div>
 </section>

 </main>

 <footer style={{ borderTop: '1px solid var(--hairline)', padding: '18px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
        Politeia Analítica · {new Date().getFullYear()}
 <span style={{ marginLeft: 16 }}><LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60}/></span>
 </footer>
 </div>
  )
}
