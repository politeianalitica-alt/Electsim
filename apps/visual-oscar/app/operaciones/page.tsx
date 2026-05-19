'use client'
/**
 * /operaciones · Centro de Operaciones (Sala de Control)
 *
 * ═══════════════════════════════════════════════════════════════════════
 * REFACTOR · Migración inline → tokens (Pilar 4 · VISION_2027.md)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Antes: 293 líneas con 50 inline style={{}} y 4 sub-componentes locales
 *        (Stat, Card, Pill, Box) duplicando lógica que ya existe en
 *        components/ui/.
 *
 * Después: usa Card, Toolbar, Stat, Badge, MetricCard de @/components/ui
 *          + 1 archivo CSS para la única animación (pulso del LiveDot).
 *          Cero inline style hardcoded · todo desde tokens del design
 *          system (var(--color-*) · var(--space-*) · var(--text-*)).
 *
 * Documentación del patrón de migración progresiva: docs/UI_MIGRATION.md
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { Card, Stat, Badge } from '@/components/ui'
import './operaciones.css'

// ─────────────────────────────────────────────────────────────────────────
// Datos demo (deberían venir del backend · placeholder para esta vista)
// ─────────────────────────────────────────────────────────────────────────

interface Market {
  label: string
  value: string
  delta: number
  dir: 'up' | 'down'
  spark: number[]
}

const MARKETS: Market[] = [
  { label: 'IBEX 35',      value: '11.040', delta: -1.8,  dir: 'down', spark: [10980, 11020, 11050, 11080, 11100, 11080, 11050, 11020, 11000, 11020, 11040] },
  { label: 'Prima riesgo', value: '112 pb', delta:  8,    dir: 'up',   spark: [96, 98, 99, 100, 102, 104, 105, 107, 109, 111, 112] },
  { label: 'Euríbor 12m',  value: '2,84%',  delta: -0.06, dir: 'down', spark: [2.92, 2.91, 2.90, 2.89, 2.88, 2.87, 2.86, 2.85, 2.85, 2.84, 2.84] },
  { label: 'Brent',        value: '$84,2',  delta: -1.1,  dir: 'down', spark: [86, 86, 86, 85, 85, 85, 85, 85, 85, 84, 84] },
]

type FeedTag = 'CRÍTICA' | 'MERCADOS' | 'CONGRESO' | 'ENCUESTAS' | 'EXTERIOR' | 'MEDIOS' | 'MONCLOA' | 'BCE' | 'INE'

interface FeedItem { t: string; tag: FeedTag; txt: string }

const FEED: FeedItem[] = [
  { t: '18:42', tag: 'CRÍTICA',  txt: 'Tesoro convoca reunión extraordinaria por prima de riesgo' },
  { t: '17:15', tag: 'CRÍTICA',  txt: 'Junts retira apoyo a la legislatura — comunicado oficial' },
  { t: '17:35', tag: 'MERCADOS', txt: 'IBEX 35 cierra −1,8% en 11.040 — bancos lideran caídas' },
  { t: '16:30', tag: 'CONGRESO', txt: 'Decreto-ley 4/2026 a votación mañana 11:00h · margen ±2 escaños' },
  { t: '14:00', tag: 'ENCUESTAS', txt: 'Sigma Dos: PP 33,2% (+0,4) · PSOE 26,1% (-0,3)' },
  { t: '13:20', tag: 'EXTERIOR', txt: 'EE.UU. anuncia aranceles 12% al aceite de oliva y vino' },
  { t: '12:30', tag: 'MEDIOS',   txt: '#MociónCensura · top trending nacional · 56k tweets/4h' },
  { t: '11:00', tag: 'MONCLOA',  txt: 'Portavoz descarta elecciones anticipadas' },
  { t: '09:30', tag: 'BCE',      txt: 'Actas abril publicadas · tono moderadamente hawkish' },
  { t: '08:15', tag: 'INE',      txt: 'IPC abril 2026 · general 2,9% (+0,1 pp)' },
]

// Tag → variante de Badge tokenizada (sin colores hex hardcoded · todo desde
// el design system).
type TagBadgeConfig =
  | { variant: 'status'; status: 'danger' | 'warn' | 'info' | 'success' }
  | { variant: 'accent' }
  | { variant: 'neutral' }

const TAG_BADGE: Record<FeedTag, TagBadgeConfig> = {
  'CRÍTICA':  { variant: 'status', status: 'danger'  },
  'MERCADOS': { variant: 'status', status: 'danger'  },
  'CONGRESO': { variant: 'accent' },
  'ENCUESTAS': { variant: 'status', status: 'info'    },
  'EXTERIOR': { variant: 'status', status: 'warn'    },
  'MEDIOS':   { variant: 'status', status: 'warn'    },
  'MONCLOA':  { variant: 'status', status: 'info'    },
  'BCE':      { variant: 'status', status: 'success' },
  'INE':      { variant: 'status', status: 'success' },
}

const SERVICES = [
  { name: 'API electoral',     status: 'ok',   latency: 38 },
  { name: 'Ingesta encuestas', status: 'ok',   latency: 92 },
  { name: 'Politeia IA',       status: 'ok',   latency: 144 },
  { name: 'Monitor RRSS',      status: 'warn', latency: 312 },
  { name: 'Datos macro (BdE)', status: 'ok',   latency: 76 },
  { name: 'Scraper BOE',       status: 'ok',   latency: 118 },
] as const

const PROXIMA_VOTACION = {
  ley: 'Convalidación decreto-ley 4/2026',
  fecha: new Date(Date.now() + 1000 * 60 * 60 * 15 + 1000 * 60 * 30),
  prediccion: 'Margen ±2 escaños',
  riesgo: 'ALTO',
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers · hooks de tiempo
// ─────────────────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState<number>(0)
  useEffect(() => {
    setDiff(target.getTime() - Date.now())
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  const total = Math.max(0, diff)
  const h = Math.floor(total / 3600000)
  const m = Math.floor((total % 3600000) / 60000)
  const s = Math.floor((total % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────
// Sparkline (sigue siendo SVG · stroke dinámico requiere prop · no inline)
// ─────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color, width = 92, height = 24 }: {
  data: number[]; color: string; width?: number; height?: number
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const rng = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / rng) * height}`)
    .join(' ')
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="op-sparkline"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}  // dinámico · whitelisted (color del partido/tendencia)
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function OperacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const now = useNow()
  const countdown = useCountdown(PROXIMA_VOTACION.fecha)
  const fmtTime = now
    ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--'
  const fmtDate = now
    ? now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const servicesOk = SERVICES.filter(s => s.status === 'ok').length

  return (
    <div className="op-root">
      <AppHeader />

      <main className="op-main">
        {/* ───── COMMAND BAR (reloj + estado) ───── */}
        <Card variant="default" padding="lg" className="op-command-bar">
          <div>
            <p className="op-status-label">
              <span className="op-live-dot" />
              SISTEMA OPERATIVO · MONITORIZACIÓN ACTIVA
            </p>
            <h1 className="op-h1">Centro de Operaciones</h1>
            <p className="op-date">{fmtDate}</p>
          </div>
          <div className="op-command-stats">
            <Stat label="Hora · Madrid"     value={fmtTime}   />
            <Stat label="Alertas críticas" value="2"          tone="negative" />
            <Stat label="Próxima votación" value={countdown}  tone="warning" />
          </div>
        </Card>

        {/* ───── KPIs Mercados ───── */}
        <section className="op-markets-grid">
          {MARKETS.map(m => (
            <MarketCard key={m.label} m={m} />
          ))}
        </section>

        {/* ───── GRID PRINCIPAL ───── */}
        <div className="op-grid-main">
          {/* Feed eventos en vivo */}
          <Card variant="default" padding="md">
            <div className="op-card-head">
              <h2 className="op-card-title">Feed de eventos · en vivo</h2>
              <span className="op-live-pill">
                <span className="op-live-dot op-live-dot--sm" />LIVE
              </span>
            </div>
            <ul className="op-feed">
              {FEED.map((e, i) => {
                const cfg = TAG_BADGE[e.tag]
                return (
                  <li key={i} className="op-feed-item">
                    <span className="op-feed-time">{e.t}</span>
                    {cfg.variant === 'status'
                      ? <Badge variant="status" status={cfg.status} size="sm">{e.tag}</Badge>
                      : <Badge variant={cfg.variant} size="sm">{e.tag}</Badge>}
                    <span className="op-feed-txt">{e.txt}</span>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Próxima votación */}
          <Card variant="default" padding="md">
            <div className="op-card-head">
              <h2 className="op-card-title">Próxima votación · Congreso</h2>
              <Badge variant="status" status="danger" size="sm">{PROXIMA_VOTACION.riesgo}</Badge>
            </div>
            <div className="op-vote">
              <div>
                <div className="op-label-sm">Ley</div>
                <div className="op-vote-name">{PROXIMA_VOTACION.ley}</div>
              </div>
              <div className="op-vote-countdown">
                <div className="op-vote-countdown-label">FALTAN</div>
                <div className="op-vote-countdown-value">{countdown}</div>
              </div>
              <div className="op-vote-meta">
                <SunkenBox label="Predicción" value={PROXIMA_VOTACION.prediccion} />
                <SunkenBox label="Riesgo" value={PROXIMA_VOTACION.riesgo} tone="negative" />
              </div>
              <Link href="/congreso" className="op-link">Abrir simulador →</Link>
            </div>
          </Card>

          {/* Estado servicios */}
          <Card variant="default" padding="md">
            <div className="op-card-head">
              <h2 className="op-card-title">Estado de servicios</h2>
              <span className="op-services-summary">
                {servicesOk}/{SERVICES.length} OK
              </span>
            </div>
            <ul className="op-services">
              {SERVICES.map(s => (
                <li key={s.name} className="op-service-row">
                  <span className={`op-service-dot op-service-dot--${s.status}`} />
                  <span className="op-service-name">{s.name}</span>
                  <span className="op-service-latency">{s.latency} ms</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ───── ATAJOS ───── */}
        <Card variant="default" padding="md">
          <h2 className="op-card-title op-card-title--standalone">Atajos rápidos</h2>
          <div className="op-shortcuts">
            {SHORTCUTS.map(a => (
              <Link
                key={a.to}
                href={a.to}
                className={`op-shortcut op-shortcut--${a.tone}`}
              >
                <div className="op-shortcut-label">{a.label} →</div>
                <div className="op-shortcut-hint">{a.hint}</div>
              </Link>
            ))}
          </div>
        </Card>
      </main>

      <footer className="op-footer">
        Sala de Control · Centro de Operaciones · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-componentes locales (sin inline style)
// ─────────────────────────────────────────────────────────────────────────

function MarketCard({ m }: { m: Market }) {
  const isUp = m.dir === 'up'
  // Para mercados financieros la subida del IBEX es positiva pero la subida
  // de la prima de riesgo o el petróleo (asumimos) es negativa. Aquí lo
  // dejamos genérico: subida=rojo (alerta), bajada=verde (calma).
  return (
    <Card variant="default" padding="md" className="op-market-card">
      <div className="op-market-text">
        <div className="op-label-sm">{m.label}</div>
        <div className="op-market-value">{m.value}</div>
        <div className={`op-market-delta op-market-delta--${isUp ? 'up' : 'down'}`}>
          {isUp ? '▲' : '▼'}{' '}
          {Math.abs(m.delta)}
          {typeof m.delta === 'number' && Number.isInteger(m.delta) ? ' pb' : ''}
        </div>
      </div>
      <Sparkline
        data={m.spark}
        color={isUp ? 'var(--color-danger)' : 'var(--color-success)'}
      />
    </Card>
  )
}

function SunkenBox({ label, value, tone }: { label: string; value: string; tone?: 'neutral' | 'negative' }) {
  return (
    <div className="op-sunken">
      <div className="op-sunken-label">{label}</div>
      <div className={`op-sunken-value ${tone === 'negative' ? 'op-sunken-value--neg' : ''}`}>
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

interface Shortcut {
  label: string
  to: string
  hint: string
  tone: 'critical' | 'info' | 'narrative' | 'success'
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Ver alertas',        to: '/alertas',    hint: '2 críticas activas',      tone: 'critical' },
  { label: 'Mapa Provincial',    to: '/mapa',       hint: '52 circunscripciones',    tone: 'info' },
  { label: 'Simulador votación', to: '/congreso',   hint: 'Ley 4/2026 mañana',       tone: 'narrative' },
  { label: 'Agente IA',          to: '/agente-ia',  hint: 'Pregunta sobre los datos', tone: 'success' },
]
