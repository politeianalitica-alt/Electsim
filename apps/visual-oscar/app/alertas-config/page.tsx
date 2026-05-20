'use client'
/**
 * /alertas-config · Sistema de Alertas
 *
 * Página completa de configuración del sistema de alertas. Permite al
 * cliente definir reglas (condiciones que disparan una alerta), canales
 * de notificación (email/Slack/Teams/push/webhook), destinatarios por
 * severidad, umbrales numéricos y revisar el historial reciente.
 *
 * Estética Apple-Newsroom · 5 pestañas · estado local en useState (sin
 * backend; los cambios persistirían contra POST /api/alerts/config en
 * producción real).
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ── Tipos ───────────────────────────────────────────────────────────────
type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
type Categoria = 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'
type Canal = 'email' | 'slack' | 'teams' | 'push' | 'sms' | 'webhook'
type TabId = 'reglas' | 'canales' | 'destinatarios' | 'umbrales' | 'historial'

interface Regla {
  id: string
  nombre: string
  categoria: Categoria
  severidad: Severidad
  condicion: string
  activa: boolean
  disparosUltimos7d: number
}
interface Destinatario {
  id: string
  nombre: string
  rol: string
  email: string
  iniciales: string
  recibe: Severidad[]
  canales: Canal[]
}
interface ConfigCanal {
  id: Canal
  nombre: string
  habilitado: boolean
  destino: string
  descripcion: string
}
interface Umbral {
  id: string
  metrica: string
  unidad: string
  valor: number
  min: number
  max: number
  step: number
  severidad: Severidad
  hint: string
}
interface HistEntry {
  id: string
  ts: string
  reglaNombre: string
  severidad: Severidad
  categoria: Categoria
  canalesEnviados: Canal[]
  destinatariosCount: number
  estado: 'enviada' | 'silenciada' | 'fallida'
}

// ── Datos demo ──────────────────────────────────────────────────────────
const SEV_META: Record<Severidad, { color: string; bg: string }> = {
 'CRÍTICA': { color: '#7F1D1D', bg: 'rgba(127,29,29,0.10)' },
 'ALTA':    { color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
 'MEDIA':   { color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
 'BAJA':    { color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
}
const CAT_COLOR: Record<Categoria, string> = {
 'Mercados': '#16A34A',
 'Gobierno': '#1F4E8C',
 'Parlamento': '#5B21B6',
 'Encuestas': '#0E7490',
 'Geopolítica': '#7C3AED',
 'Medios': '#525258',
 'Riesgo': '#DC2626',
}
const CANAL_META: Record<Canal, { label: string; icon: string }> = {
  email:   { label: 'Email',   icon: '' },
  slack:   { label: 'Slack',   icon: '#' },
  teams:   { label: 'Teams',   icon: 'T' },
  push:    { label: 'Push',    icon: '◔' },
  sms:     { label: 'SMS',     icon: '' },
  webhook: { label: 'Webhook', icon: '' },
}

const REGLAS_INI: Regla[] = [
  { id: 'r1', nombre: 'Prima de riesgo > 110 pb',           categoria: 'Mercados',    severidad: 'CRÍTICA', condicion: 'BondSpread.10Y(ES,DE) ≥ 110 pb sostenido 30 min', activa: true,  disparosUltimos7d: 2 },
  { id: 'r2', nombre: 'IBEX cae más de −2 % en sesión',     categoria: 'Mercados',    severidad: 'ALTA',    condicion: 'IBEX35.intradia ≤ −2.0 %',                       activa: true,  disparosUltimos7d: 1 },
  { id: 'r3', nombre: 'Riesgo de pérdida de votación',      categoria: 'Parlamento',  severidad: 'ALTA',    condicion: 'Whip.margin ≤ 5 escaños · 12h antes',           activa: true,  disparosUltimos7d: 0 },
  { id: 'r4', nombre: 'Sentimiento medios < −0,40',         categoria: 'Medios',      severidad: 'MEDIA',   condicion: 'MediaSentiment.7d ≤ −0.40 (avg ponderada)',     activa: true,  disparosUltimos7d: 4 },
  { id: 'r5', nombre: 'Encuesta sorpresa (Δ > ±2 pp)',      categoria: 'Encuestas',   severidad: 'MEDIA',   condicion: 'NewPoll.delta ≥ |2.0 pp| vs media tracking',    activa: true,  disparosUltimos7d: 3 },
  { id: 'r6', nombre: 'Termómetro de riesgo > 50/100',      categoria: 'Riesgo',      severidad: 'CRÍTICA', condicion: 'PoliticalRiskIndex ≥ 50 · 24h',                 activa: false, disparosUltimos7d: 0 },
  { id: 'r7', nombre: 'Crisis geopolítica España-vínculo',  categoria: 'Geopolítica', severidad: 'ALTA',    condicion: 'GeoEvent.severidad = CRÍTICA AND país.ESLink ≥ 7', activa: true, disparosUltimos7d: 1 },
  { id: 'r8', nombre: 'Trending negativo top 5 nacional',   categoria: 'Medios',      severidad: 'BAJA',    condicion: 'Trending.position ≤ 5 AND sentiment ≤ −0.30',   activa: true,  disparosUltimos7d: 6 },
  { id: 'r9', nombre: 'Filtración alto cargo en prensa',    categoria: 'Gobierno',    severidad: 'CRÍTICA', condicion: 'NamedEntityRisk(altocargo) AND keywords ∈ leak', activa: true,  disparosUltimos7d: 0 },
]

const DESTINATARIOS_INI: Destinatario[] = [
  { id: 'd1', nombre: 'Carlos Vega',  rol: 'Director · Análisis',     email: 'cvega@cliente.es',  iniciales: 'CV', recibe: ['CRÍTICA', 'ALTA', 'MEDIA'], canales: ['email', 'slack', 'sms'] },
  { id: 'd2', nombre: 'Marta Ríos',   rol: 'Senior Analyst',           email: 'mrios@cliente.es',  iniciales: 'MR', recibe: ['CRÍTICA', 'ALTA'],            canales: ['email', 'slack'] },
  { id: 'd3', nombre: 'Pablo Soler',  rol: 'Comunicación · Crisis',   email: 'psoler@cliente.es', iniciales: 'PS', recibe: ['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'], canales: ['email', 'slack', 'push', 'sms'] },
  { id: 'd4', nombre: 'Lucía Hidalgo',rol: 'Estrategia política',     email: 'lhidalgo@cliente.es', iniciales: 'LH', recibe: ['CRÍTICA', 'ALTA'],            canales: ['email'] },
  { id: 'd5', nombre: 'Equipo Legal', rol: 'Buzón compartido',        email: 'legal@cliente.es',  iniciales: 'EL', recibe: ['CRÍTICA'],                       canales: ['email'] },
]

const CANALES_INI: ConfigCanal[] = [
  { id: 'email',   nombre: 'Email',                 habilitado: true,  destino: 'alerts@cliente.es',                                  descripcion: 'Buzón principal del equipo. Las alertas críticas también llegan a los emails individuales.' },
  { id: 'slack',   nombre: 'Slack',                 habilitado: true,  destino: '#politeia-alertas',                                  descripcion: 'Canal centralizado en el workspace de Slack del cliente. Hilos automáticos por incidente.' },
  { id: 'teams',   nombre: 'Microsoft Teams',       habilitado: false, destino: '—',                                                   descripcion: 'Conector deshabilitado. Pulsa "Configurar" para enlazar el canal de Teams.' },
  { id: 'push',    nombre: 'Notificaciones móviles',habilitado: true,  destino: 'iOS · Android (3 dispositivos)',                     descripcion: 'Push silencioso para alertas MEDIA · sonoro para ALTA y CRÍTICA.' },
  { id: 'sms',     nombre: 'SMS',                   habilitado: true,  destino: 'Twilio · números verificados',                       descripcion: 'Sólo CRÍTICAS, fuera del horario de oficina. Coste por SMS aplica.' },
  { id: 'webhook', nombre: 'Webhook',               habilitado: false, destino: '—',                                                  descripcion: 'POST JSON al endpoint que tú indiques. Ideal para integrar con sistemas internos.' },
]

const UMBRALES_INI: Umbral[] = [
  { id: 'u1', metrica: 'Prima de riesgo (10Y vs Bund)',    unidad: 'pb',  valor: 110, min: 60,   max: 250, step: 5,    severidad: 'CRÍTICA', hint: 'Disparo desde 110 pb sostenido 30 min. Histórico crisis 2012: 638 pb.' },
  { id: 'u2', metrica: 'Caída intradía IBEX 35',           unidad: '%',   valor: 2,   min: 0.5,  max: 5,   step: 0.25, severidad: 'ALTA',    hint: 'Disparo cuando el índice cae ≥ N% desde apertura.' },
  { id: 'u3', metrica: 'Margen de votación parlamentaria', unidad: 'esc.',valor: 5,   min: 1,    max: 30,  step: 1,    severidad: 'ALTA',    hint: 'Aviso cuando faltan ≤ N escaños para ganar / perder, 12h antes.' },
  { id: 'u4', metrica: 'Sentimiento medios (umbral −)',    unidad: 'pt',  valor: -0.40, min: -1, max: 0,  step: 0.05, severidad: 'MEDIA',  hint: 'Promedio ponderado por audiencia · 7 días móviles.' },
  { id: 'u5', metrica: 'Termómetro de riesgo político',    unidad: '/100',valor: 50,  min: 20,   max: 90,  step: 5,    severidad: 'CRÍTICA', hint: 'Compuesto por 6 dimensiones (estabilidad, polarización, tensión territorial, …).' },
  { id: 'u6', metrica: 'Δ encuesta sorpresa (vs media)',   unidad: 'pp',  valor: 2,   min: 0.5,  max: 5,   step: 0.25, severidad: 'MEDIA',  hint: 'Aviso cuando una nueva encuesta se desvía ≥ ±N pp del tracking.' },
]

const HIST_INI: HistEntry[] = [
  { id: 'h1', ts: '14:32 · hoy',  reglaNombre: 'Prima de riesgo > 110 pb',          severidad: 'CRÍTICA', categoria: 'Mercados',    canalesEnviados: ['email','slack','sms'], destinatariosCount: 5, estado: 'enviada' },
  { id: 'h2', ts: '12:18 · hoy',  reglaNombre: 'Trending negativo top 5 nacional',  severidad: 'BAJA',    categoria: 'Medios',      canalesEnviados: ['slack'],                destinatariosCount: 3, estado: 'enviada' },
  { id: 'h3', ts: '10:04 · hoy',  reglaNombre: 'Sentimiento medios < −0,40',        severidad: 'MEDIA',   categoria: 'Medios',      canalesEnviados: ['email','slack'],         destinatariosCount: 4, estado: 'enviada' },
  { id: 'h4', ts: '08:42 · hoy',  reglaNombre: 'Encuesta sorpresa (Δ > ±2 pp)',     severidad: 'MEDIA',   categoria: 'Encuestas',   canalesEnviados: ['email'],                 destinatariosCount: 4, estado: 'enviada' },
  { id: 'h5', ts: '23:15 · ayer', reglaNombre: 'IBEX cae más de −2 % en sesión',    severidad: 'ALTA',    categoria: 'Mercados',    canalesEnviados: ['email','push'],          destinatariosCount: 4, estado: 'silenciada' },
  { id: 'h6', ts: '19:30 · ayer', reglaNombre: 'Crisis geopolítica España-vínculo', severidad: 'ALTA',    categoria: 'Geopolítica', canalesEnviados: ['email','slack','push'],  destinatariosCount: 4, estado: 'enviada' },
  { id: 'h7', ts: '17:48 · ayer', reglaNombre: 'Sentimiento medios < −0,40',        severidad: 'MEDIA',   categoria: 'Medios',      canalesEnviados: ['email','slack'],         destinatariosCount: 4, estado: 'enviada' },
  { id: 'h8', ts: '14:00 · ayer', reglaNombre: 'Webhook · cliente externo',         severidad: 'BAJA',    categoria: 'Mercados',    canalesEnviados: [],                        destinatariosCount: 0, estado: 'fallida' },
]

// ── Componentes auxiliares ──────────────────────────────────────────────
function SevChip({ sev }: { sev: Severidad }) {
  const m = SEV_META[sev]
  return (
 <span style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
      color: '#fff', background: m.color, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>{sev}</span>
  )
}
function CatChip({ cat }: { cat: Categoria }) {
  const c = CAT_COLOR[cat]
  return (
 <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      color: c, background: `${c}14`, border: `1px solid ${c}33`,
      padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
    }}>{cat}</span>
  )
}
function CanalIcon({ id }: { id: Canal }) {
  const m = CANAL_META[id]
  return (
 <span title={m.label} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 6,
      background: '#F5F5F7', border: '1px solid #ECECEF',
      fontSize: 11, fontWeight: 700, color: '#3a3a3d',
      fontFamily: 'inherit',
    }}>{m.icon}</span>
  )
}
function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
 <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)', color: '#fff',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.40,
      letterSpacing: '0.02em', flexShrink: 0,
    }}>{initials}</span>
  )
}
function KPICard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
 <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      padding: '14px 16px 12px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
 <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: accent }}/>
 <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
        color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6,
      }}>{label}</div>
 <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.022em', lineHeight: 1, color: accent,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 5 }}>{sub}</div>}
 </div>
  )
}
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
 <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
      padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
 <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d', margin: 0,
        }}>{title}</h2>
        {action}
 </div>
      {children}
 </section>
  )
}
function Toggle({ on, onChange }: { on: boolean; onChange: (n: boolean) => void }) {
  return (
 <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? '#16A34A' : '#d2d2d7',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 180ms', flexShrink: 0,
      }}>
 <span style={{
        position: 'absolute', top: 2,
        left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
        transition: 'left 180ms ease-out',
      }}/>
 </button>
  )
}

// ── Página principal ────────────────────────────────────────────────────
export default function AlertasConfigPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<TabId>('reglas')
  const [reglas, setReglas] = useState(REGLAS_INI)
  const [destinatarios, setDestinatarios] = useState(DESTINATARIOS_INI)
  const [canales, setCanales] = useState(CANALES_INI)
  const [umbrales, setUmbrales] = useState(UMBRALES_INI)
  const [filterCat, setFilterCat] = useState<'Todas' | Categoria>('Todas')
  const [searchQ, setSearchQ] = useState('')

  const totals = useMemo(() => {
    const activas = reglas.filter(r => r.activa).length
    const criticas = reglas.filter(r => r.activa && r.severidad === 'CRÍTICA').length
    const disparos7d = reglas.reduce((s, r) => s + r.disparosUltimos7d, 0)
    const canalesAct = canales.filter(c => c.habilitado).length
    return { activas, criticas, disparos7d, canalesAct, dest: destinatarios.length }
  }, [reglas, canales, destinatarios])

  return (
 <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
 <section style={{
          background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)',
          borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'center',
        }}>
 <div>
 <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
                        textTransform: 'uppercase', margin: '0 0 8px' }}>
              CONFIGURACIÓN · SISTEMA DE ALERTAS
 </p>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
                          letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {totals.activas} reglas activas <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' }}>vigilando.</em>
 </h1>
 <p style={{ fontSize: 13, opacity: 0.78, margin: 0, lineHeight: 1.5 }}>
              Define qué eventos disparan una alerta, por qué canales se envían, a quién y con qué severidad.
              {' '}{totals.criticas} críticas · {totals.canalesAct} canales activos · {totals.dest} destinatarios.
 </p>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { l: 'Reglas activas', v: totals.activas },
              { l: 'Disparos 7d',    v: totals.disparos7d },
              { l: 'Canales',        v: totals.canalesAct },
            ].map((k) => (
 <div key={k.l} style={{
                textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
 <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.75, marginTop: 5, textTransform: 'uppercase', color: '#fff' }}>{k.l}</div>
 </div>
            ))}
 </div>
 </section>

        {/* KPI strip */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
 <KPICard label="Reglas activas" value={totals.activas}    accent="#1F4E8C" sub={`${totals.criticas} críticas`}/>
 <KPICard label="Disparos últimos 7 días" value={totals.disparos7d} accent="#F97316" sub="distribuidos en categorías"/>
 <KPICard label="Canales habilitados" value={totals.canalesAct} accent="#0F766E" sub="email · slack · push · sms"/>
 <KPICard label="Destinatarios" value={totals.dest}       accent="#7C3AED" sub="con configuración por severidad"/>
 </div>

        {/* Tabs pill */}
 <div style={{
          display: 'inline-flex', background: '#F5F5F7', borderRadius: 999,
          padding: 4, marginBottom: 18, overflowX: 'auto', maxWidth: '100%',
        }}>
          {([
            { k: 'reglas',        l: `Reglas · ${reglas.length}` },
            { k: 'canales',       l: `Canales · ${canales.length}` },
            { k: 'destinatarios', l: `Destinatarios · ${destinatarios.length}` },
            { k: 'umbrales',      l: `Umbrales · ${umbrales.length}` },
            { k: 'historial',     l: `Historial · ${HIST_INI.length}` },
          ] as const).map((t) => {
            const active = tab === t.k
            return (
 <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 16px',
                fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 160ms',
              }}>{t.l}</button>
            )
          })}
 </div>

        {/* TAB · Reglas */}
        {tab === 'reglas' && (
 <div>
 <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
 <input
                type="text"
                placeholder="Buscar regla…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 999,
                  padding: '7px 14px', fontSize: 12, fontFamily: 'inherit',
                  outline: 'none', minWidth: 220,
                }}
              />
 <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Categoría:</span>
 <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                {(['Todas', 'Mercados', 'Gobierno', 'Parlamento', 'Encuestas', 'Geopolítica', 'Medios', 'Riesgo'] as const).map((c) => {
                  const active = filterCat === c
                  const cc = c === 'Todas' ? '#1d1d1f' : CAT_COLOR[c]
                  return (
 <button key={c} onClick={() => setFilterCat(c)} style={{
                      background: active ? cc : '#fff',
                      color: active ? '#fff' : '#3a3a3d',
                      border: `1px solid ${active ? cc : '#ECECEF'}`,
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>{c}</button>
                  )
                })}
 </div>
 <span style={{ flex: 1 }}/>
 <button style={{
                background: '#1F4E8C', color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Nueva regla</button>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reglas
                .filter((r) => filterCat === 'Todas' || r.categoria === filterCat)
                .filter((r) => !searchQ.trim() || r.nombre.toLowerCase().includes(searchQ.toLowerCase()))
                .map((r) => {
                  const sev = SEV_META[r.severidad]
                  return (
 <article key={r.id} style={{
                      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
                      padding: '14px 18px',
                      borderLeft: `4px solid ${sev.color}`,
                      display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center',
                    }}>
 <div style={{ minWidth: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
 <SevChip sev={r.severidad}/>
 <CatChip cat={r.categoria}/>
 <span style={{ fontSize: 11, color: '#6e6e73' }}>· {r.disparosUltimos7d} disparos en 7d</span>
 </div>
 <h3 style={{
                          margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 15,
                          fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                        }}>{r.nombre}</h3>
 <code style={{
                          fontFamily: 'ui-monospace,monospace', fontSize: 11,
                          color: '#6e6e73', background: '#F5F5F7', padding: '2px 8px',
                          borderRadius: 6, display: 'inline-block',
                        }}>{r.condicion}</code>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <span style={{ fontSize: 11, color: '#6e6e73' }}>{r.activa ? 'Activa' : 'Pausada'}</span>
 <Toggle on={r.activa} onChange={(n) => setReglas((rs) => rs.map((x) => x.id === r.id ? { ...x, activa: n } : x))}/>
 </div>
 <button style={{
                        background: 'transparent', border: '1px solid #ECECEF', borderRadius: 8,
                        padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>Editar</button>
 </article>
                  )
                })}
 </div>
 </div>
        )}

        {/* TAB · Canales */}
        {tab === 'canales' && (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {canales.map((c) => (
 <Card key={c.id} title={c.nombre.toUpperCase()}
                action={<Toggle on={c.habilitado} onChange={(n) => setCanales((cs) => cs.map((x) => x.id === c.id ? { ...x, habilitado: n } : x))}/>}
              >
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
 <CanalIcon id={c.id}/>
 <code style={{
                    fontFamily: 'ui-monospace,monospace', fontSize: 12,
                    color: c.habilitado ? '#1d1d1f' : '#9CA3AF',
                    background: '#F5F5F7', padding: '4px 10px', borderRadius: 6,
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.destino}</code>
 </div>
 <p style={{ fontSize: 12, color: '#515154', margin: '0 0 12px', lineHeight: 1.45 }}>{c.descripcion}</p>
 <div style={{ display: 'flex', gap: 8 }}>
 <button style={{
                    background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                    padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Configurar</button>
 <button style={{
                    background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
                    padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Probar envío</button>
 </div>
 </Card>
            ))}
 </div>
        )}

        {/* TAB · Destinatarios */}
        {tab === 'destinatarios' && (
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
 <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
                Cada destinatario recibe alertas según las severidades y canales configurados.
 </p>
 <button style={{
                background: '#1F4E8C', color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Añadir destinatario</button>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 12 }}>
              {destinatarios.map((d) => (
 <article key={d.id} style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
                  padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
 <Avatar initials={d.iniciales} size={40}/>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{d.nombre}</div>
 <div style={{ fontSize: 11, color: '#6e6e73' }}>{d.rol}</div>
 <div style={{ fontSize: 10.5, color: '#9CA3AF', fontFamily: 'ui-monospace,monospace' }}>{d.email}</div>
 </div>
 </div>
 <div style={{ marginBottom: 8 }}>
 <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>Recibe severidades</div>
 <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'] as Severidad[]).map((s) => {
                        const active = d.recibe.includes(s)
                        const m = SEV_META[s]
                        return (
 <button key={s}
                            onClick={() => setDestinatarios((ds) => ds.map((x) => x.id === d.id ? {
                              ...x, recibe: active ? x.recibe.filter((y) => y !== s) : [...x.recibe, s],
                            } : x))}
                            style={{
                              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                              color: active ? '#fff' : m.color,
                              background: active ? m.color : '#fff',
                              border: `1px solid ${active ? m.color : m.color + '40'}`,
                              padding: '3px 8px', borderRadius: 999, cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}>{s}</button>
                        )
                      })}
 </div>
 </div>
 <div>
 <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>Canales</div>
 <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {d.canales.map((c) => (
 <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3a3a3d', background: '#F5F5F7', padding: '3px 8px', borderRadius: 999 }}>
 <CanalIcon id={c}/> {CANAL_META[c].label}
 </span>
                      ))}
 </div>
 </div>
 </article>
              ))}
 </div>
 </div>
        )}

        {/* TAB · Umbrales */}
        {tab === 'umbrales' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {umbrales.map((u) => {
              const sev = SEV_META[u.severidad]
              return (
 <article key={u.id} style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
                  padding: '16px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'grid', gridTemplateColumns: '1fr 220px 120px', gap: 22, alignItems: 'center',
                }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
 <SevChip sev={u.severidad}/>
 <h3 style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontSize: 14,
                        fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                      }}>{u.metrica}</h3>
 </div>
 <p style={{ fontSize: 11.5, color: '#6e6e73', margin: 0 }}>{u.hint}</p>
 </div>
 <input
                    type="range"
                    min={u.min}
                    max={u.max}
                    step={u.step}
                    value={u.valor}
                    onChange={(e) => setUmbrales((us) => us.map((x) => x.id === u.id ? { ...x, valor: parseFloat(e.target.value) } : x))}
                    style={{ width: '100%', accentColor: sev.color, cursor: 'pointer' }}
                  />
 <div style={{ textAlign: 'right' }}>
 <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                      color: sev.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {u.valor > 0 && u.min < 0 ? '+' : ''}{u.valor.toFixed(u.step < 1 ? 2 : 0)} <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>{u.unidad}</span>
 </div>
 <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>min {u.min} · max {u.max}</div>
 </div>
 </article>
              )
            })}
 </div>
        )}

        {/* TAB · Historial */}
        {tab === 'historial' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HIST_INI.map((h) => {
              const sev = SEV_META[h.severidad]
              const estadoColor = h.estado === 'enviada' ? '#16A34A' : h.estado === 'silenciada' ? '#F97316' : '#DC2626'
              return (
 <article key={h.id} style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
                  padding: '12px 16px',
                  borderLeft: `4px solid ${sev.color}`,
                  display: 'grid', gridTemplateColumns: '110px 1fr auto auto', gap: 16, alignItems: 'center',
                }}>
 <div>
 <div style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', fontFamily: 'ui-monospace,monospace' }}>{h.ts.split(' · ')[0]}</div>
 <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 1 }}>{h.ts.split(' · ')[1]}</div>
 </div>
 <div style={{ minWidth: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
 <SevChip sev={h.severidad}/>
 <CatChip cat={h.categoria}/>
 </div>
 <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.reglaNombre}</div>
 </div>
 <div style={{ display: 'flex', gap: 5 }}>
                    {h.canalesEnviados.length > 0
                      ? h.canalesEnviados.map((c) => <CanalIcon key={c} id={c}/>)
                      : <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>}
 </div>
 <div style={{ textAlign: 'right' }}>
 <span style={{
                      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                      color: '#fff', background: estadoColor,
                      padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase',
                    }}>{h.estado}</span>
 <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 4 }}>{h.destinatariosCount} destinatarios</div>
 </div>
 </article>
              )
            })}
 </div>
        )}

 </main>
 <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Configuración · Sistema de Alertas · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}
