'use client'
/**
 * /config-cliente · Configuración completa del cliente (estilo Linear/Stripe Settings)
 *
 * 14 secciones con datos detallados, toggles funcionales, tablas, métricas
 * de uso, integraciones, seguridad, facturación, etc.
 */
import './config-cliente.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'

// ─── Tipos ──────────────────────────────────────────────
type SystemHealth = {
  status?: 'ok' | 'degraded' | 'down'
  uptime_pct?: number; api_latency_ms?: number; db_latency_ms?: number
  ollama?: { status?: string; model?: string; latency_ms?: number }
  last_check?: string
}
type PipelineRun = {
  id: string; name: string; status: 'success' | 'running' | 'failed' | 'queued'
  started_at?: string; duration_s?: number; rows_in?: number; rows_out?: number
  schedule?: string; descripcion?: string
}

type SectionId =
  | 'cuenta' | 'equipo' | 'workspaces' | 'sectores' | 'watchlists' | 'fuentes'
  | 'brain' | 'api' | 'integraciones' | 'seguridad' | 'notificaciones'
  | 'personalizacion' | 'pipelines' | 'sistema' | 'logs' | 'facturacion' | 'soporte'

const SECTIONS: Array<{ id: SectionId; label: string; group: string; icon: string }> = [
  { id: 'cuenta',          label: 'Empresa y cuenta',     group: 'Organización', icon: '' },
  { id: 'equipo',          label: 'Equipo y usuarios',    group: 'Organización', icon: '◍' },
  { id: 'workspaces',      label: 'Workspaces',           group: 'Organización', icon: '' },
  { id: 'sectores',        label: 'Sectores y cobertura', group: 'Producto',     icon: '⌘' },
  { id: 'watchlists',      label: 'Watchlists y keywords',group: 'Producto',     icon: '⊙' },
  { id: 'fuentes',         label: 'Fuentes de datos',     group: 'Producto',     icon: '◊' },
  { id: 'brain',           label: 'Brain · IA',           group: 'Producto',     icon: '◈' },
  { id: 'api',             label: 'API y webhooks',       group: 'Integración',  icon: '⊕' },
  { id: 'integraciones',   label: 'Integraciones',        group: 'Integración',  icon: '⊠' },
  { id: 'notificaciones',  label: 'Notificaciones',       group: 'Integración',  icon: '◆' },
  { id: 'seguridad',       label: 'Seguridad y compliance',group: 'Plataforma',  icon: '⊡' },
  { id: 'personalizacion', label: 'Personalización',      group: 'Plataforma',   icon: '◐' },
  { id: 'pipelines',       label: 'Pipelines ETL',        group: 'Sistema',      icon: '↻' },
  { id: 'sistema',         label: 'Salud del sistema',    group: 'Sistema',      icon: '✓' },
  { id: 'logs',            label: 'Logs y auditoría',     group: 'Sistema',      icon: '☰' },
  { id: 'facturacion',     label: 'Facturación y uso',    group: 'Cuenta',       icon: '€' },
  { id: 'soporte',         label: 'Soporte',              group: 'Cuenta',       icon: '?' },
]

const FALLBACK_HEALTH: SystemHealth = {
  status: 'ok', uptime_pct: 99.94, api_latency_ms: 142, db_latency_ms: 18,
  ollama: { status: 'ok', model: 'politeia-brain:latest', latency_ms: 1240 },
  last_check: new Date().toISOString(),
}
const FALLBACK_PIPELINES: PipelineRun[] = [
  { id: 'boe', name: 'ETL · BOE diario', status: 'success', started_at: '2026-05-08T06:00:00Z', duration_s: 142, rows_in: 312, rows_out: 312, schedule: '0 6 * * *', descripcion: 'Boletín Oficial del Estado · normativa diaria' },
  { id: 'bocg', name: 'ETL · BOCG iniciativas', status: 'success', started_at: '2026-05-08T06:10:00Z', duration_s: 87, rows_in: 28, rows_out: 28, schedule: '0 6 * * *', descripcion: 'Boletín Oficial Cortes · iniciativas Congreso' },
  { id: 'congreso', name: 'ETL · Congreso · iniciativas y votos', status: 'success', started_at: '2026-05-08T06:15:00Z', duration_s: 98, rows_in: 47, rows_out: 47, schedule: '0,15,30,45 * * * *' },
  { id: 'senado', name: 'ETL · Senado · iniciativas', status: 'success', started_at: '2026-05-08T06:20:00Z', duration_s: 65, rows_in: 18, rows_out: 18, schedule: '0,30 * * * *' },
  { id: 'placsp', name: 'ETL · PLACSP atom (3 páginas)', status: 'success', started_at: '2026-05-08T07:00:00Z', duration_s: 28, rows_in: 1050, rows_out: 1050, schedule: '0 * * * *', descripcion: 'Plataforma Contratación Sector Público' },
  { id: 'andalucia', name: 'ETL · Andalucía SIREC', status: 'success', started_at: '2026-05-08T07:05:00Z', duration_s: 0.16, rows_in: 100, rows_out: 100, schedule: '*/15 * * * *' },
  { id: 'catalunya', name: 'ETL · Catalunya Socrata', status: 'success', started_at: '2026-05-08T07:10:00Z', duration_s: 0.6, rows_in: 250, rows_out: 250, schedule: '*/15 * * * *' },
  { id: 'valencia', name: 'ETL · Valencia CKAN', status: 'success', started_at: '2026-05-08T07:12:00Z', duration_s: 0.7, rows_in: 50, rows_out: 50, schedule: '0 */2 * * *' },
  { id: 'ted', name: 'ETL · TED Europa', status: 'success', started_at: '2026-05-08T07:15:00Z', duration_s: 0.33, rows_in: 30, rows_out: 30, schedule: '0 */6 * * *' },
  { id: 'aemps', name: 'ETL · AEMPS CIMA', status: 'success', started_at: '2026-05-08T07:30:00Z', duration_s: 1.1, rows_in: 4500, rows_out: 4500, schedule: '0 */2 * * *', descripcion: 'Catálogo medicamentos + desabastecimientos' },
  { id: 'ree', name: 'ETL · REE apidatos', status: 'success', started_at: '2026-05-08T07:00:00Z', duration_s: 0.2, rows_in: 24, rows_out: 24, schedule: '0 * * * *' },
  { id: 'ecb', name: 'ETL · ECB SDW', status: 'success', started_at: '2026-05-08T07:00:00Z', duration_s: 0.4, rows_in: 5, rows_out: 5, schedule: '0 8,14 * * *' },
  { id: 'ine', name: 'ETL · INE TempUS', status: 'success', started_at: '2026-05-08T08:00:00Z', duration_s: 1.5, rows_in: 240, rows_out: 240, schedule: '0 */4 * * *' },
  { id: 'wb', name: 'ETL · World Bank indicators', status: 'success', started_at: '2026-05-08T08:30:00Z', duration_s: 1.2, rows_in: 320, rows_out: 320, schedule: '0 0 * * 0' },
  { id: 'prensa', name: 'ETL · Prensa RSS (15 medios)', status: 'running', started_at: '2026-05-08T09:00:00Z', rows_in: 0, schedule: '*/30 * * * *' },
  { id: 'narrativas', name: 'NLP · Detección narrativas', status: 'queued', schedule: '*/10 * * * *', descripcion: 'TF-IDF + clustering DBSCAN sobre prensa diaria' },
  { id: 'embeddings', name: 'NLP · Generación embeddings (nomic)', status: 'queued', schedule: '0 */6 * * *' },
  { id: 'gdelt', name: 'ETL · GDELT geopolítico', status: 'failed', started_at: '2026-05-08T05:45:00Z', duration_s: 12, descripcion: 'Timeout · reintento programado' },
]

const USUARIOS_DEMO = [
  { id: 'u1', nombre: 'María López',      email: 'm.lopez@cliente.es',     rol: 'Admin',     ultima: 'hace 2 min',  estado: 'Activa' as const },
  { id: 'u2', nombre: 'Carlos Ruiz',      email: 'c.ruiz@cliente.es',      rol: 'Editor',    ultima: 'hace 14 min', estado: 'Activa' as const },
  { id: 'u3', nombre: 'Ana Gómez',        email: 'a.gomez@cliente.es',     rol: 'Analista',  ultima: 'hace 30 min', estado: 'Activa' as const },
  { id: 'u4', nombre: 'Javier Martín',    email: 'j.martin@cliente.es',    rol: 'Analista',  ultima: 'hace 1h',     estado: 'Activa' as const },
  { id: 'u5', nombre: 'Lucía Herrero',    email: 'l.herrero@cliente.es',   rol: 'Lector',    ultima: 'hace 2h',     estado: 'Activa' as const },
  { id: 'u6', nombre: 'Pablo Sánchez',    email: 'p.sanchez@cliente.es',   rol: 'Lector',    ultima: 'hace 1d',     estado: 'Activa' as const },
  { id: 'u7', nombre: 'Elena Vega',       email: 'e.vega@cliente.es',      rol: 'Editor',    ultima: 'hace 5h',     estado: 'Activa' as const },
  { id: 'u8', nombre: 'Daniel Castro',    email: 'd.castro@cliente.es',    rol: 'Analista',  ultima: 'hace 2 sem',  estado: 'Suspendida' as const },
  { id: 'u9', nombre: 'Sara Romero',      email: 's.romero@cliente.es',    rol: 'Lector',    ultima: 'hace 3d',     estado: 'Activa' as const },
  { id: 'u10', nombre: 'Ricardo Ortiz',   email: 'r.ortiz@cliente.es',     rol: 'Admin',     ultima: 'hace 5 min',  estado: 'Activa' as const },
  { id: 'u11', nombre: 'Marta Reyes',     email: 'm.reyes@cliente.es',     rol: 'Analista',  ultima: 'hace 6h',     estado: 'Activa' as const },
  { id: 'u12', nombre: 'Iván Núñez',      email: 'i.nunez@cliente.es',     rol: 'Lector',    ultima: 'hace 2 meses',estado: 'Inactiva' as const },
]

const WORKSPACES_DEMO = [
  { id: 'ws_espana_2026', nombre: 'España · Análisis 2026', tipo: 'Estratégico', items: 1245, miembros: 8, ult: 'hace 12 min' },
  { id: 'ws_andalucia',   nombre: 'Andalucía · Elecciones',  tipo: 'Electoral',   items: 380,  miembros: 4, ult: 'hace 1h' },
  { id: 'ws_sector_ene',  nombre: 'Sector Energía',          tipo: 'Sectorial',   items: 540,  miembros: 5, ult: 'hace 3h' },
  { id: 'ws_legisl',      nombre: 'Monitor Legislativo',     tipo: 'Operativo',   items: 920,  miembros: 6, ult: 'hace 25 min' },
  { id: 'ws_crisis_q2',   nombre: 'Crisis Tracker Q2',       tipo: 'Crisis',      items: 152,  miembros: 3, ult: 'hace 2d' },
]

const SECTORES_DEMO = [
  { id: 'energia',           label: 'Energía & Utilities',         activo: true,  items_24h: 142 },
  { id: 'farma',             label: 'Farma & Salud',               activo: true,  items_24h: 87 },
  { id: 'defensa',           label: 'Defensa & Industria',         activo: true,  items_24h: 64 },
  { id: 'vivienda',          label: 'Vivienda & Inmobiliario',     activo: true,  items_24h: 95 },
  { id: 'banca',             label: 'Banca & Seguros',             activo: true,  items_24h: 110 },
  { id: 'agro',              label: 'Agroalimentario & Rural',     activo: false, items_24h: 0 },
  { id: 'telecom',           label: 'Telecom & Digital',           activo: true,  items_24h: 78 },
  { id: 'infraestructuras',  label: 'Infraestructuras & Movilidad',activo: false, items_24h: 0 },
  { id: 'turismo',           label: 'Turismo & Hostelería',        activo: false, items_24h: 0 },
]

const WATCHLISTS_DEMO = [
  { id: 'wl1', nombre: 'Junts y aliados',          terminos: 4, alertas: 14, activa: true },
  { id: 'wl2', nombre: 'Reforma fiscal 2027',      terminos: 4, alertas: 8,  activa: true },
  { id: 'wl3', nombre: 'Sector vivienda',          terminos: 4, alertas: 22, activa: true },
  { id: 'wl4', nombre: 'Adversarios PP',           terminos: 3, alertas: 18, activa: true },
  { id: 'wl5', nombre: 'Sector energía',           terminos: 4, alertas: 11, activa: true },
  { id: 'wl6', nombre: 'Cataluña post 12M',        terminos: 4, alertas: 9,  activa: true },
  { id: 'wl7', nombre: 'Narrativas hostiles',      terminos: 3, alertas: 27, activa: true },
  { id: 'wl8', nombre: 'VOX y extrema derecha',    terminos: 3, alertas: 13, activa: true },
  { id: 'wl9', nombre: 'Sumar y Yolanda Díaz',     terminos: 3, alertas: 6,  activa: false },
  { id: 'wl10', nombre: 'Sector defensa UE',       terminos: 4, alertas: 7,  activa: true },
]

const FUENTES_DEMO = [
  { fuente: 'BOE',                    estado: 'OK', items_24h: 312, lat_ms: 240, calidad: 99 },
  { fuente: 'BOCG',                   estado: 'OK', items_24h: 28,  lat_ms: 180, calidad: 98 },
  { fuente: 'Congreso',               estado: 'OK', items_24h: 47,  lat_ms: 320, calidad: 97 },
  { fuente: 'Senado',                 estado: 'OK', items_24h: 18,  lat_ms: 290, calidad: 96 },
  { fuente: 'PLACSP nacional',        estado: 'OK', items_24h: 1050, lat_ms: 8200, calidad: 95 },
  { fuente: 'Andalucía SIREC',        estado: 'OK', items_24h: 480, lat_ms: 160, calidad: 99 },
  { fuente: 'Catalunya Socrata',      estado: 'OK', items_24h: 890, lat_ms: 600, calidad: 99 },
  { fuente: 'Valencia CKAN',          estado: 'OK', items_24h: 210, lat_ms: 700, calidad: 96 },
  { fuente: 'TED Europa',             estado: 'OK', items_24h: 130, lat_ms: 330, calidad: 97 },
  { fuente: 'AEMPS CIMA',             estado: 'OK', items_24h: 4500, lat_ms: 980, calidad: 98 },
  { fuente: 'REE apidatos',           estado: 'OK', items_24h: 24,  lat_ms: 200, calidad: 100 },
  { fuente: 'INE TempUS',             estado: 'OK', items_24h: 240, lat_ms: 410, calidad: 99 },
  { fuente: 'ECB SDW',                estado: 'OK', items_24h: 5,   lat_ms: 220, calidad: 100 },
  { fuente: 'World Bank',             estado: 'OK', items_24h: 320, lat_ms: 1100, calidad: 100 },
  { fuente: 'Prensa RSS (15 medios)', estado: 'OK', items_24h: 1840, lat_ms: 'múltiple', calidad: 92 },
  { fuente: 'GDELT geopolítico',      estado: 'FAIL', items_24h: 0, lat_ms: 'timeout', calidad: 0 },
]

const WEBHOOKS_DEMO = [
  { id: 'wh1', endpoint: 'https://cliente.es/api/politeia/webhook', eventos: ['alerta.critica', 'crisis.nueva'], activo: true, last: 'hace 12 min', exitos_24h: 47 },
  { id: 'wh2', endpoint: 'https://hooks.slack.com/services/T0X...', eventos: ['briefing.diario', 'alerta.alta'], activo: true, last: 'hace 1h', exitos_24h: 14 },
  { id: 'wh3', endpoint: 'https://teams.microsoft.com/webhook/...', eventos: ['briefing.diario'], activo: false, last: 'hace 2 días', exitos_24h: 0 },
]

const INTEGRACIONES = [
  { id: 'slack', nombre: 'Slack', estado: 'Conectada', desc: 'Briefings y alertas → #politeia-feed', icon: '#', color: '#611f69' },
  { id: 'msteams', nombre: 'Microsoft Teams', estado: 'No conectada', desc: 'Canal corporativo · webhook', icon: 'T', color: '#5059c9' },
  { id: 'gdrive', nombre: 'Google Drive', estado: 'No conectada', desc: 'Exportar briefings y memos a Drive', icon: 'D', color: '#1a73e8' },
  { id: 'notion', nombre: 'Notion', estado: 'No conectada', desc: 'Sincronizar canvas y notebooks', icon: 'N', color: '#000' },
  { id: 'email', nombre: 'Email SMTP', estado: 'Conectada', desc: 'Briefing matinal · 06:30 ES', icon: '@', color: '#0f766e' },
  { id: 'gcal', nombre: 'Google Calendar', estado: 'Conectada', desc: 'Calendario político sincronizado', icon: '◷', color: '#dc2626' },
  { id: 'webhook', nombre: 'Webhooks API', estado: 'Conectada', desc: '3 endpoints activos · 47 eventos/24h', icon: '⊕', color: '#5b21b6' },
  { id: 'sso', nombre: 'SSO · SAML 2.0', estado: 'Conectada', desc: 'Okta · 12 usuarios federados', icon: '⊡', color: '#1f4e8c' },
]

const ROLES = ['Admin', 'Editor', 'Analista', 'Lector'] as const
type Rol = typeof ROLES[number]

const ROL_PERMISSIONS: Record<Rol, { permissions: string[]; restrictions: string[]; color: string }> = {
  Admin:    { permissions: ['Crear/eliminar workspaces', 'Gestionar usuarios y roles', 'Configurar integraciones', 'Acceso a logs de auditoría', 'Gestión facturación'], restrictions: [], color: '#DC2626' },
  Editor:   { permissions: ['Crear/editar contenido', 'Gestionar canvas', 'Aprobar drafts', 'Publicar briefings'], restrictions: ['No puede eliminar workspaces', 'No puede gestionar usuarios'], color: '#5B21B6' },
  Analista: { permissions: ['Crear canvas y notebooks', 'Editar borradores', 'Etiquetar evidencias'], restrictions: ['No puede aprobar drafts', 'Acceso solo a workspaces asignados'], color: '#0EA5E9' },
  Lector:   { permissions: ['Leer todo el contenido', 'Comentar', 'Exportar lectura'], restrictions: ['Sin permisos de edición', 'No puede crear contenido'], color: '#6e6e73' },
}

const NOTIF_CHANNELS = [
  { id: 'email_morning', label: 'Briefing matinal · email', desc: 'Resumen ejecutivo diario · 06:30 ES', activo: true },
  { id: 'slack_critical', label: 'Slack · alertas críticas', desc: 'Push inmediato a #politeia-feed', activo: true },
  { id: 'sms_critical', label: 'SMS · solo crisis CRÍTICA', desc: 'A números aprobados', activo: false },
  { id: 'push_high', label: 'Push web · alertas ALTAS', desc: 'Notificaciones en navegador', activo: true },
  { id: 'email_weekly', label: 'Resumen semanal · email', desc: 'Cada domingo 18:00 ES', activo: true },
  { id: 'rss_feed', label: 'Feed RSS privado', desc: 'URL personal con token', activo: false },
  { id: 'webhook_all', label: 'Webhook · todos los eventos', desc: 'A endpoints configurados', activo: true },
]

function statusColor(s?: string) {
  if (s === 'ok' || s === 'success' || s === 'OK' || s === 'Conectada' || s === 'Activa') return '#16A34A'
  if (s === 'degraded' || s === 'running' || s === 'queued') return '#F97316'
  if (s === 'Suspendida' || s === 'Inactiva') return '#6e6e73'
  return '#DC2626'
}

export default function ConfigClientePage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [section, setSection] = useState<SectionId>('cuenta')
  const { data: hData } = useApi<SystemHealth>('/api/system/health', { refreshInterval: 60_000 })
  const { data: pData } = useApi<{ items?: PipelineRun[] } | PipelineRun[]>('/api/system/pipelines', { refreshInterval: 60_000 })

  const health = hData ?? FALLBACK_HEALTH
  const pipelines: PipelineRun[] = (Array.isArray(pData) ? pData : pData?.items) ?? FALLBACK_PIPELINES

  // State para toggles funcionales
  const [sectoresState, setSectoresState] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTORES_DEMO.map(s => [s.id, s.activo]))
  )
  const [watchlistsState, setWatchlistsState] = useState<Record<string, boolean>>(
    Object.fromEntries(WATCHLISTS_DEMO.map(w => [w.id, w.activa]))
  )
  const [notifState, setNotifState] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_CHANNELS.map(n => [n.id, n.activo]))
  )
  const [tema, setTema] = useState<'auto' | 'claro' | 'oscuro'>('auto')
  const [idioma, setIdioma] = useState<'es' | 'en' | 'ca'>('es')
  const [hora_briefing, setHoraBriefing] = useState('06:30')

  const sectionsByGroup = useMemo(() => {
    const out: Record<string, typeof SECTIONS> = {}
    for (const s of SECTIONS) { (out[s.group] ||= []).push(s) }
    return out
  }, [])

  return (
    <div className="cfg-root">
      <AppHeader/>

      {/* HERO compacto con info del cliente */}
      <section className="cfg-hero">
        <div className="cfg-hero-inner">
          <div>
            <p className="cfg-hero-eyebrow">CONFIGURACIÓN · POLITEIA ENTERPRISE</p>
            <h1 className="cfg-hero-title">
              Acme Consulting · ES-B47383920
            </h1>
            <p className="cfg-hero-sub">
              Suscripción activa hasta 31 dic 2026 · 12 usuarios · 5 workspaces · 6 sectores activos · 10 watchlists
            </p>
          </div>
          <div className="cfg-hero-counters">
            <HeroCounter label="Items hoy" value="9.847" accent="#86EFAC"/>
            <HeroCounter label="API calls 24h" value="142.3k" accent="#7DD3FC"/>
            <HeroCounter label="Uso storage" value="38%" accent="#FCD34D"/>
            <HeroCounter label="Health score" value="98" accent="#FCA5A5"/>
          </div>
        </div>
      </section>

      <main className="cfg-main">

        {/* SIDEBAR · Navegación por secciones */}
        <aside className="cfg-sidebar">
          {Object.entries(sectionsByGroup).map(([group, items]) => (
            <div key={group} className="cfg-sidebar-group">
              <div className="cfg-sidebar-group-label">{group}</div>
              <ul className="cfg-sidebar-list">
                {items.map(s => {
                  const active = section === s.id
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setSection(s.id)}
                        className={`cfg-sidebar-btn${active ? ' cfg-sidebar-btn--active' : ''}`}
                      >
                        <span className="cfg-sidebar-icon">{s.icon}</span>
                        {s.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* CONTENIDO */}
        <div>
          {section === 'cuenta'         && <SecCuenta/>}
          {section === 'equipo'         && <SecEquipo/>}
          {section === 'workspaces'     && <SecWorkspaces/>}
          {section === 'sectores'       && <SecSectores state={sectoresState} onToggle={(id) => setSectoresState(p => ({ ...p, [id]: !p[id] }))}/>}
          {section === 'watchlists'     && <SecWatchlists state={watchlistsState} onToggle={(id) => setWatchlistsState(p => ({ ...p, [id]: !p[id] }))}/>}
          {section === 'fuentes'        && <SecFuentes/>}
          {section === 'brain'          && <SecBrain health={health}/>}
          {section === 'api'            && <SecApi/>}
          {section === 'integraciones'  && <SecIntegraciones/>}
          {section === 'notificaciones' && <SecNotificaciones state={notifState} onToggle={(id) => setNotifState(p => ({ ...p, [id]: !p[id] }))} hora={hora_briefing} setHora={setHoraBriefing}/>}
          {section === 'seguridad'      && <SecSeguridad/>}
          {section === 'personalizacion'&& <SecPersonalizacion tema={tema} setTema={setTema} idioma={idioma} setIdioma={setIdioma}/>}
          {section === 'pipelines'      && <SecPipelines pipelines={pipelines}/>}
          {section === 'sistema'        && <SecSistema health={health}/>}
          {section === 'logs'           && <SecLogs/>}
          {section === 'facturacion'    && <SecFacturacion/>}
          {section === 'soporte'        && <SecSoporte/>}
        </div>
      </main>
    </div>
  )
}

// ─── Componentes auxiliares ──────────────────────────────

function HeroCounter({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="cfg-hcounter">
      <div className="cfg-hcounter-label">{label}</div>
      <div className="cfg-hcounter-value" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="cfg-card" style={style}>
      {children}
    </div>
  )
}

function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="cfg-card-head">
      <div>
        <h3 className="cfg-card-title">{title}</h3>
        {sub && <p className="cfg-card-sub">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

function Field({ label, value, children, sub }: { label: string; value?: string | React.ReactNode; children?: React.ReactNode; sub?: string }) {
  return (
    <div className="cfg-field">
      <div>
        <div className="cfg-field-label">{label}</div>
        {sub && <div className="cfg-field-sub">{sub}</div>}
      </div>
      <div className="cfg-field-value">{children ?? value}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`cfg-toggle ${checked ? 'cfg-toggle--on' : 'cfg-toggle--off'}`}>
      <span className={`cfg-toggle-knob ${checked ? 'cfg-toggle-knob--on' : 'cfg-toggle-knob--off'}`}/>
    </button>
  )
}

function Badge({ label, color, outline = false }: { label: string; color: string; outline?: boolean }) {
  return (
    <span className="cfg-badge" style={{
      background: outline ? `${color}15` : color,
      color: outline ? color : '#fff',
      border: outline ? `1px solid ${color}40` : 'none',
    }}>{label.toUpperCase()}</span>
  )
}

function Button({ children, variant = 'primary', size = 'md', onClick }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md'; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`cfg-btn cfg-btn--${size} cfg-btn--${variant}`}
    >{children}</button>
  )
}

// ─── Secciones ──────────────────────────────────────────

function SecCuenta() {
  return (
    <>
      <Card>
        <CardHeader title="Empresa" sub="Información fiscal y contacto" right={<Button size="sm" variant="secondary">Editar</Button>}/>
        <Field label="Razón social"     value="Acme Consulting & Strategy SL"/>
        <Field label="CIF / NIF"        value="ES-B47383920"/>
        <Field label="Sector"           value="Consultoría política y de comunicación"/>
        <Field label="Tamaño"           value="50-100 empleados"/>
        <Field label="Sede fiscal"      value="C/ Velázquez 89, 28006 Madrid"/>
        <Field label="País"             value="España"/>
        <Field label="Email facturación" value="facturacion@acmeconsulting.es"/>
        <Field label="Email técnico"    value="it@acmeconsulting.es"/>
        <Field label="Teléfono"         value="+34 91 555 0100"/>
      </Card>
      <Card>
        <CardHeader title="Plan y suscripción" sub="Politeia Enterprise · contrato anual"/>
        <Field label="Plan actual">
          <span className="cfg-plan-inline">
            <Badge label="Enterprise" color="#5B21B6"/>
            <span className="cfg-plan-price">€48.000/año · facturación anual</span>
          </span>
        </Field>
        <Field label="Inicio contrato"  value="01 enero 2026"/>
        <Field label="Renovación"       value="31 diciembre 2026 · automática"/>
        <Field label="Próxima factura"  value="€48.000 + IVA · 01 enero 2027"/>
        <Field label="Account Manager"  value="Marta Sanz · m.sanz@politeia.es"/>
        <Field label="Customer Success" value="Pedro Vargas · p.vargas@politeia.es · +34 600 000 000"/>
        <div className="cfg-flex-row-8-mt">
          <Button variant="secondary">Ver factura</Button>
          <Button variant="secondary">Solicitar upgrade</Button>
          <Button variant="danger">Cancelar renovación</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Beneficios incluidos en tu plan"/>
        <ul className="cfg-benefits">
          {[
            'Workspaces ilimitados',
            'Hasta 50 usuarios federados (SSO incluido)',
            '9 sectores verticales con KPIs en vivo',
            'Acceso completo al motor de búsqueda de licitaciones (5 fuentes)',
            'Brain · IA con modelo politeia-brain · 50k tokens/día',
            'API completa · 100k requests/día · webhooks ilimitados',
            'Briefing matinal customizable · 06:30 ES',
            'Soporte 24/7 con SLA 99.9% · respuesta <2h prioridad alta',
            'Custom Success Manager dedicado',
            'Integraciones premium (Slack, Teams, Drive, Notion, Okta, JIRA)',
            'Auditoría de actividad y compliance · GDPR + SOC 2 Type II',
            'Onboarding técnico (8h) y formación continua trimestral',
          ].map(b => (
            <li key={b} className="cfg-benefit">
              <span className="cfg-benefit-check">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function SecEquipo() {
  return (
    <>
      <Card>
        <CardHeader
          title="Usuarios" sub={`${USUARIOS_DEMO.length} miembros · ${USUARIOS_DEMO.filter(u => u.estado === 'Activa').length} activos`}
          right={<><Button size="sm" variant="secondary">Importar CSV</Button> <Button size="sm">+ Invitar usuario</Button></>}
        />
        <table className="cfg-table">
          <thead>
            <tr>
              {['Usuario','Email','Rol','Última actividad','Estado','Acciones'].map(h => (
                <th key={h} className="cfg-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USUARIOS_DEMO.map(u => (
              <tr key={u.id}>
                <td className="cfg-td">
                  <div className="cfg-avatar-cell">
                    <div className="cfg-avatar-circle">
                      {u.nombre.split(/\s+/).map(s => s[0]).slice(0,2).join('')}
                    </div>
                    <span className="cfg-avatar-name">{u.nombre}</span>
                  </div>
                </td>
                <td className="cfg-td cfg-td-muted">{u.email}</td>
                <td className="cfg-td">
                  <Badge label={u.rol} color={ROL_PERMISSIONS[u.rol as Rol].color} outline/>
                </td>
                <td className="cfg-td cfg-td-time">{u.ultima}</td>
                <td className="cfg-td">
                  <Badge label={u.estado} color={statusColor(u.estado)}/>
                </td>
                <td className="cfg-td">
                  <Button size="sm" variant="secondary">Editar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <CardHeader title="Roles y permisos" sub="Matriz de capacidades por rol"/>
        <div className="cfg-roles-grid">
          {ROLES.map(r => {
            const p = ROL_PERMISSIONS[r]
            return (
              <div key={r} className="cfg-role-card" style={{ background:`${p.color}05`, border:`1px solid ${p.color}30`, borderLeft:`3px solid ${p.color}` }}>
                <div className="cfg-role-card-head">
                  <Badge label={r} color={p.color}/>
                  <span className="cfg-role-users">{USUARIOS_DEMO.filter(u => u.rol === r).length} usuarios</span>
                </div>
                <div className="cfg-role-section">
                  <div className="cfg-role-section-label cfg-role-section-label--ok">Permite</div>
                  <ul className="cfg-role-list">
                    {p.permissions.map(perm => <li key={perm}>· {perm}</li>)}
                  </ul>
                </div>
                {p.restrictions.length > 0 && (
                  <div>
                    <div className="cfg-role-section-label cfg-role-section-label--no">Restringe</div>
                    <ul className="cfg-role-list">
                      {p.restrictions.map(r2 => <li key={r2}>· {r2}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}

function SecWorkspaces() {
  return (
    <>
      <Card>
        <CardHeader title="Workspaces" sub={`${WORKSPACES_DEMO.length} workspaces · ilimitados en tu plan`} right={<Button>+ Nuevo workspace</Button>}/>
        <table className="cfg-table">
          <thead>
            <tr>
              {['Nombre','Tipo','Items','Miembros','Última actividad','Acciones'].map(h => (
                <th key={h} className="cfg-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKSPACES_DEMO.map(w => (
              <tr key={w.id}>
                <td className="cfg-td">
                  <div className="cfg-ws-name">{w.nombre}</div>
                  <div className="cfg-ws-id">{w.id}</div>
                </td>
                <td className="cfg-td"><Badge label={w.tipo} color="#1F4E8C" outline/></td>
                <td className="cfg-td cfg-td-num">{w.items.toLocaleString('es-ES')}</td>
                <td className="cfg-td cfg-td-muted">{w.miembros}</td>
                <td className="cfg-td cfg-td-time">{w.ult}</td>
                <td className="cfg-td">
                  <div className="cfg-row-actions">
                    <Button size="sm" variant="secondary">Abrir</Button>
                    <Button size="sm" variant="secondary">Archivar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function SecSectores({ state, onToggle }: { state: Record<string, boolean>; onToggle: (id: string) => void }) {
  return (
    <Card>
      <CardHeader
        title="Sectores y cobertura"
        sub={`${Object.values(state).filter(v => v).length} de ${SECTORES_DEMO.length} sectores activos`}
      />
      <div className="cfg-list-col-8">
        {SECTORES_DEMO.map(s => {
          const active = state[s.id]
          return (
            <div key={s.id} className={`cfg-sector-row ${active ? 'cfg-sector-row--on' : 'cfg-sector-row--off'}`}>
              <Toggle checked={active} onChange={() => onToggle(s.id)}/>
              <div>
                <div className="cfg-sector-label">{s.label}</div>
                <div className="cfg-sector-sub">
                  Items procesados últimas 24h: <strong>{active ? s.items_24h : '0'}</strong>
                </div>
              </div>
              <span className={`cfg-sector-num ${active ? 'cfg-sector-num--on' : 'cfg-sector-num--off'}`}>{active ? s.items_24h : '—'}</span>
              <Button size="sm" variant="secondary">Configurar</Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecWatchlists({ state, onToggle }: { state: Record<string, boolean>; onToggle: (id: string) => void }) {
  return (
    <Card>
      <CardHeader
        title="Watchlists y keywords"
        sub={`${Object.values(state).filter(v => v).length} de ${WATCHLISTS_DEMO.length} listas activas`}
        right={<Button>+ Nueva watchlist</Button>}
      />
      <div className="cfg-list-col-8">
        {WATCHLISTS_DEMO.map(w => {
          const active = state[w.id]
          return (
            <div key={w.id} className="cfg-watch-row">
              <Toggle checked={active} onChange={() => onToggle(w.id)}/>
              <div>
                <div className="cfg-watch-label">{w.nombre}</div>
                <div className="cfg-watch-sub">{w.terminos} términos · {w.alertas} alertas en 7d</div>
              </div>
              <span className={`cfg-watch-num ${w.alertas > 15 ? 'cfg-watch-num--hi' : 'cfg-watch-num--norm'}`}>{w.alertas}</span>
              <Button size="sm" variant="secondary">Editar</Button>
              <Button size="sm" variant="danger">Eliminar</Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecFuentes() {
  return (
    <Card>
      <CardHeader
        title="Fuentes de datos · estado y calidad"
        sub={`${FUENTES_DEMO.filter(f => f.estado === 'OK').length}/${FUENTES_DEMO.length} fuentes operativas · ${FUENTES_DEMO.reduce((s,f)=>s+f.items_24h,0).toLocaleString('es-ES')} items últimas 24h`}
      />
      <table className="cfg-table">
        <thead>
          <tr>
            {['Fuente','Estado','Items 24h','Latencia','Calidad','Acciones'].map(h => (
              <th key={h} className="cfg-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FUENTES_DEMO.map(f => (
            <tr key={f.fuente}>
              <td className="cfg-td cfg-td-strong">{f.fuente}</td>
              <td className="cfg-td"><Badge label={f.estado} color={statusColor(f.estado)}/></td>
              <td className="cfg-td cfg-td-num">{f.items_24h.toLocaleString('es-ES')}</td>
              <td className="cfg-td cfg-td-mono--11">{typeof f.lat_ms === 'number' ? `${f.lat_ms} ms` : f.lat_ms}</td>
              <td className="cfg-td">
                <div className="cfg-quality-cell">
                  <div className="cfg-quality-track">
                    <div className="cfg-quality-fill" style={{ width:`${f.calidad}%`, background: f.calidad >= 95 ? '#16A34A' : f.calidad >= 80 ? '#F97316' : '#DC2626' }}/>
                  </div>
                  <span className="cfg-quality-num">{f.calidad}%</span>
                </div>
              </td>
              <td className="cfg-td">
                <Button size="sm" variant="secondary">Ver logs</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SecBrain({ health }: { health: SystemHealth }) {
  return (
    <>
      <Card>
        <CardHeader title="Brain · IA · politeia-brain" sub="Modelo y configuración" right={<Badge label={health.ollama?.status?.toUpperCase() ?? 'OK'} color={statusColor(health.ollama?.status)}/>}/>
        <Field label="Modelo activo" value={health.ollama?.model ?? 'politeia-brain:latest'}/>
        <Field label="Provider"      value="Ollama · self-hosted en VPS Hetzner"/>
        <Field label="Embeddings"    value="nomic-embed-text · 768 dim"/>
        <Field label="RAG · ChromaDB" value="12.4k documentos vectorizados"/>
        <Field label="Latencia media" value={`${health.ollama?.latency_ms ?? 1240} ms`}/>
        <Field label="Cuota tokens/día" value="50.000 / día · 18.420 usados hoy"/>
        <Field label="Temperatura"   value="0.3 · respuestas factuales"/>
        <Field label="Max tokens"    value="2048 por respuesta"/>
        <Field label="Versionado prompts" value="v3.7 · system prompt actualizado 02 mayo"/>
      </Card>
      <Card>
        <CardHeader title="Prompts del sistema · personalización"/>
        <Field label="Tono editorial" value="Profesional · objetivo · español de España"/>
        <Field label="Formato briefing" value="Resumen 3 frases + bullets + fuentes citadas"/>
        <Field label="Idioma respuestas" value="es-ES · adaptable a en-GB y ca-ES"/>
        <Field label="Contexto fijo">
          <div className="cfg-context-block">
            «Eres un analista político español de Politeia Analítica. Responde siempre con datos verificados, citando fuentes oficiales (BOE, Congreso, INE, CIS). Evita opiniones partidistas. Estructura tus respuestas con resumen + hallazgos + recomendaciones.»
          </div>
        </Field>
      </Card>
    </>
  )
}

function SecApi() {
  return (
    <>
      <Card>
        <CardHeader title="API tokens" sub="Tokens de acceso a la API REST" right={<Button>+ Generar token</Button>}/>
        <Field label="Token producción">
          <div className="cfg-token-row">
            <code className="cfg-token-code">pol_live_4f8a••••••••••••••••••••8c7d</code>
            <Button size="sm" variant="secondary">Copiar</Button>
            <Button size="sm" variant="danger">Revocar</Button>
          </div>
        </Field>
        <Field label="Token desarrollo">
          <div className="cfg-token-row">
            <code className="cfg-token-code">pol_test_2d7b••••••••••••••••••••5e9f</code>
            <Button size="sm" variant="secondary">Copiar</Button>
            <Button size="sm" variant="danger">Revocar</Button>
          </div>
        </Field>
        <Field label="Cuota actual" value="142.300 / 100.000 requests · 142% (overage facturable)" sub="Reset diario 00:00 UTC"/>
        <Field label="Rate limit" value="100 requests/segundo · burst 500"/>
        <Field label="Documentación">
          <a href="#" className="cfg-link">docs.politeia.es/api/v2 ↗</a>
        </Field>
      </Card>
      <Card>
        <CardHeader title="Webhooks" sub={`${WEBHOOKS_DEMO.length} endpoints configurados`} right={<Button>+ Añadir webhook</Button>}/>
        <table className="cfg-table">
          <thead>
            <tr>
              {['Endpoint','Eventos','Última entrega','Éxitos 24h','Estado','Acciones'].map(h => (
                <th key={h} className="cfg-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEBHOOKS_DEMO.map(w => (
              <tr key={w.id}>
                <td className="cfg-td-endpoint">{w.endpoint}</td>
                <td className="cfg-td">
                  <div className="cfg-events-pills">
                    {w.eventos.map(e => <Badge key={e} label={e} color="#5B21B6" outline/>)}
                  </div>
                </td>
                <td className="cfg-td cfg-td-muted">{w.last}</td>
                <td className={`cfg-td-success ${w.exitos_24h > 0 ? 'cfg-td-success--ok' : 'cfg-td-success--zero'}`}>{w.exitos_24h}</td>
                <td className="cfg-td"><Badge label={w.activo ? 'Activo' : 'Pausado'} color={w.activo ? '#16A34A' : '#86868b'}/></td>
                <td className="cfg-td">
                  <div className="cfg-row-actions--4">
                    <Button size="sm" variant="secondary">Ver logs</Button>
                    <Button size="sm" variant="secondary">Test</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function SecIntegraciones() {
  return (
    <Card>
      <CardHeader title="Integraciones" sub={`${INTEGRACIONES.filter(i => i.estado === 'Conectada').length} de ${INTEGRACIONES.length} conectadas`}/>
      <div className="cfg-integ-grid">
        {INTEGRACIONES.map(i => {
          const conectada = i.estado === 'Conectada'
          return (
            <div key={i.id} className={`cfg-integ-card ${conectada ? 'cfg-integ-card--on' : 'cfg-integ-card--off'}`} style={{ borderLeft:`3px solid ${i.color}` }}>
              <div className="cfg-integ-icon" style={{ background: i.color }}>{i.icon}</div>
              <div>
                <div className="cfg-integ-name">{i.nombre}</div>
                <div className="cfg-integ-desc">{i.desc}</div>
                <Badge label={i.estado} color={conectada ? '#16A34A' : '#86868b'}/>
              </div>
              <Button size="sm" variant={conectada ? 'secondary' : 'primary'}>{conectada ? 'Configurar' : 'Conectar'}</Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SecNotificaciones({ state, onToggle, hora, setHora }: { state: Record<string, boolean>; onToggle: (id: string) => void; hora: string; setHora: (h: string) => void }) {
  return (
    <>
      <Card>
        <CardHeader title="Canales de notificación" sub={`${Object.values(state).filter(v => v).length} de ${NOTIF_CHANNELS.length} canales activos`}/>
        <div className="cfg-list-col-8">
          {NOTIF_CHANNELS.map(n => (
            <div key={n.id} className="cfg-notif-row">
              <Toggle checked={state[n.id]} onChange={() => onToggle(n.id)}/>
              <div>
                <div className="cfg-notif-label">{n.label}</div>
                <div className="cfg-notif-sub">{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Horarios y umbrales"/>
        <Field label="Hora briefing matinal">
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="cfg-time-input"/>
        </Field>
        <Field label="Zona horaria" value="Europe/Madrid (CET / CEST)"/>
        <Field label="Severidad mínima · push" value="ALTA"/>
        <Field label="Severidad mínima · SMS" value="CRÍTICA"/>
        <Field label="Quiet hours" value="22:00 – 07:00 (excepto CRÍTICA)"/>
        <Field label="Días no laborables" value="Sábados y domingos · solo CRÍTICA"/>
      </Card>
    </>
  )
}

function SecSeguridad() {
  return (
    <>
      <Card>
        <CardHeader title="Autenticación"/>
        <Field label="2FA (autenticación 2 factores)" value="Obligatoria para todos los usuarios"/>
        <Field label="Método 2FA" value="Authenticator app · TOTP · backup codes"/>
        <Field label="SSO · SAML 2.0" value="Activo · Okta tenant cliente"/>
        <Field label="Política de contraseñas" value="Mínimo 12 chars · mayúscula · número · especial · rotación 90 días"/>
        <Field label="Sesiones simultáneas" value="Máx. 3 dispositivos por usuario"/>
        <Field label="Tiempo inactividad" value="Logout automático tras 30 min sin actividad"/>
      </Card>
      <Card>
        <CardHeader title="Cumplimiento normativo"/>
        <Field label="GDPR" value="Compliant · DPO designado · registro tratamientos"/>
        <Field label="LOPDGDD" value="Compliant · contrato encargado tratamiento firmado"/>
        <Field label="SOC 2 Type II" value="Auditado · informe anual · próxima revisión Sep 2026"/>
        <Field label="ISO 27001" value="Certificado · próxima auditoría Ene 2027"/>
        <Field label="Retención datos" value="Activos: ilimitado · Eliminados: 30 días en backup"/>
        <Field label="Cifrado en tránsito" value="TLS 1.3 · HSTS · cert. Let's Encrypt"/>
        <Field label="Cifrado en reposo" value="AES-256 · keys gestionadas por AWS KMS"/>
        <Field label="Backup" value="Diario · retención 90 días · cifrado · cross-region"/>
        <Field label="Hosting" value="Hetzner Cloud Frankfurt + Vercel Edge"/>
      </Card>
      <Card>
        <CardHeader title="Acciones de privacidad" sub="Derechos GDPR para ejercicio inmediato"/>
        <div className="cfg-flex-row-8-wrap">
          <Button variant="secondary">Exportar datos personales (JSON)</Button>
          <Button variant="secondary">Solicitar rectificación</Button>
          <Button variant="secondary">Solicitar limitación tratamiento</Button>
          <Button variant="danger">Solicitar eliminación cuenta</Button>
        </div>
      </Card>
    </>
  )
}

function SecPersonalizacion({ tema, setTema, idioma, setIdioma }: { tema: string; setTema: (t: 'auto' | 'claro' | 'oscuro') => void; idioma: string; setIdioma: (i: 'es' | 'en' | 'ca') => void }) {
  return (
    <>
      <Card>
        <CardHeader title="Apariencia"/>
        <Field label="Tema">
          <div className="cfg-theme-row">
            {(['auto', 'claro', 'oscuro'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTema(t)}
                className={`cfg-theme-btn${tema === t ? ' cfg-theme-btn--active' : ''}`}
              >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </Field>
        <Field label="Idioma de la interfaz">
          <select value={idioma} onChange={e => setIdioma(e.target.value as 'es' | 'en' | 'ca')} className="cfg-lang-select">
            <option value="es">Español (España)</option>
            <option value="en">English (UK)</option>
            <option value="ca">Català</option>
          </select>
        </Field>
        <Field label="Densidad" value="Compacta · óptima para múltiples paneles"/>
        <Field label="Formato fechas" value="DD/MM/YYYY · 24h · semana lunes"/>
        <Field label="Moneda" value="EUR (€) · símbolo después · separador decimal coma"/>
      </Card>
      <Card>
        <CardHeader title="Branding"/>
        <Field label="Logo cliente">
          <div className="cfg-logo-row">
            <div className="cfg-logo-box">AC</div>
            <Button size="sm" variant="secondary">Cambiar</Button>
          </div>
        </Field>
        <Field label="Color primario" value="#1F4E8C · azul corporativo"/>
        <Field label="Color secundario" value="#5B21B6 · púrpura"/>
        <Field label="Tipografía display" value="System UI · serif para hero"/>
        <Field label="Footer personalizado" value="Acme Consulting · Politeia Analítica"/>
      </Card>
    </>
  )
}

function SecPipelines({ pipelines }: { pipelines: PipelineRun[] }) {
  return (
    <Card>
      <CardHeader title="Pipelines ETL · ejecución" sub={`${pipelines.length} pipelines · auto-refresh 60s · ${pipelines.filter(p => p.status === 'success').length} OK · ${pipelines.filter(p => p.status === 'failed').length} fallidos`}/>
      <table className="cfg-table">
        <thead>
          <tr>
            {['Pipeline','Estado','Schedule','Inicio','Duración','Filas','Acciones'].map(h => (
              <th key={h} className="cfg-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pipelines.map(p => (
            <tr key={p.id}>
              <td className="cfg-td">
                <div className="cfg-ws-name">{p.name}</div>
                {p.descripcion && <div className="cfg-integ-desc">{p.descripcion}</div>}
              </td>
              <td className="cfg-td"><Badge label={p.status} color={statusColor(p.status)}/></td>
              <td className="cfg-td cfg-td-mono">{p.schedule || '—'}</td>
              <td className="cfg-td cfg-td-time">{p.started_at ? new Date(p.started_at).toLocaleTimeString('es-ES') : '—'}</td>
              <td className="cfg-td cfg-td-mono--11">{p.duration_s != null ? `${p.duration_s}s` : '—'}</td>
              <td className="cfg-td cfg-td-tab">
                {p.rows_in != null ? `${p.rows_in.toLocaleString('es-ES')} → ${(p.rows_out ?? p.rows_in).toLocaleString('es-ES')}` : '—'}
              </td>
              <td className="cfg-td">
                <div className="cfg-row-actions--4">
                  <Button size="sm" variant="secondary">Ejecutar</Button>
                  <Button size="sm" variant="secondary">Logs</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SecSistema({ health }: { health: SystemHealth }) {
  return (
    <>
      <div className="cfg-metric-grid-4">
        <SystemMetric label="Estado global" value={health.status?.toUpperCase() ?? 'OK'} color={statusColor(health.status)}/>
        <SystemMetric label="Uptime 30d"    value={`${health.uptime_pct ?? 99.9}%`} color="#16A34A"/>
        <SystemMetric label="Latencia API"  value={`${health.api_latency_ms ?? 142} ms`} color="#0EA5E9"/>
        <SystemMetric label="Latencia DB"   value={`${health.db_latency_ms ?? 18} ms`} color="#5B21B6"/>
      </div>
      <Card>
        <CardHeader title="Servicios y componentes"/>
        <Field label="API REST · v2.4.1"   value="OK · vercel.app · edge cache 200ms"/>
        <Field label="Database · PostgreSQL 16" value="OK · Hetzner cx32 · 24 GB · 8 cores"/>
        <Field label="Cache · Redis 7"     value="OK · 1.2 GB usado · 4 GB total"/>
        <Field label="Vector DB · Chroma"  value="OK · 12.4k embeddings · 768 dim"/>
        <Field label="Brain · Ollama"      value={`${health.ollama?.model} · ${health.ollama?.latency_ms} ms`}/>
        <Field label="Object Storage · R2" value="OK · 3.2 GB usado · 100 GB plan"/>
        <Field label="Job queue · BullMQ"  value="OK · 0 jobs en cola · 47 procesados/min"/>
        <Field label="Observabilidad"      value="Sentry + Datadog · 0 errores P95 últimas 24h"/>
        <Field label="CDN · Vercel Edge"   value="OK · 99.99% hit ratio · 38 ms TTFB media global"/>
      </Card>
      <Card>
        <CardHeader title="Política de SLA · Politeia Enterprise"/>
        <Field label="Uptime garantizado"  value="99.9% mensual · créditos automáticos si <99.5%"/>
        <Field label="RTO"                 value="≤ 4 horas (Recovery Time Objective)"/>
        <Field label="RPO"                 value="≤ 1 hora (Recovery Point Objective)"/>
        <Field label="Mantenimientos planificados" value="Domingos 03:00-05:00 ES · notificación 72h antes"/>
        <Field label="Soporte respuesta P1" value="< 1h · 24/7"/>
        <Field label="Soporte respuesta P2" value="< 4h · horario laboral"/>
      </Card>
    </>
  )
}

function SystemMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="cfg-metric-card">
      <div className="cfg-metric-label">{label}</div>
      <div className="cfg-metric-value" style={{ color }}>{value}</div>
    </div>
  )
}

function SecLogs() {
  const events = [
    { ts: '08:42:13', user: 'María L.', action: 'Editó', target: 'Watchlist "Junts y aliados"', ip: '85.234.12.4', sev: 'INFO' as const },
    { ts: '08:38:45', user: 'Sistema', action: 'Webhook entregado', target: 'cliente.es/webhook', ip: '-', sev: 'INFO' as const },
    { ts: '08:31:02', user: 'Carlos R.', action: 'Creó canvas', target: 'cnv-107 · Mesa Reforma Fiscal', ip: '85.234.12.5', sev: 'INFO' as const },
    { ts: '08:27:18', user: 'API', action: 'Token rate limit hit', target: 'pol_live_4f8a...', ip: '-', sev: 'WARN' as const },
    { ts: '08:14:55', user: 'Pedro S.', action: 'Login SSO', target: 'Okta · acmeconsulting.okta.com', ip: '88.10.142.7', sev: 'INFO' as const },
    { ts: '08:01:22', user: 'Sistema', action: 'Pipeline failed', target: 'gdelt · timeout connection', ip: '-', sev: 'ERROR' as const },
    { ts: '07:55:08', user: 'Sistema', action: 'Briefing enviado', target: 'Email · 12 destinatarios', ip: '-', sev: 'INFO' as const },
    { ts: '07:42:11', user: 'Ana G.', action: 'Exportó draft', target: 'drf-001 · PDF · 1.2 MB', ip: '85.234.12.4', sev: 'INFO' as const },
    { ts: '07:33:00', user: 'Sistema', action: 'ETL ejecutado', target: 'BOE diario · 312 rows', ip: '-', sev: 'INFO' as const },
    { ts: '07:15:44', user: 'Javier M.', action: 'Eliminó workspace', target: 'ws_test_2025', ip: '85.234.12.6', sev: 'WARN' as const },
  ]
  return (
    <Card>
      <CardHeader title="Audit log · últimas 24h" sub="Eventos auditables · exportable a SIEM" right={<><Button size="sm" variant="secondary">Filtrar</Button> <Button size="sm" variant="secondary">Exportar CSV</Button></>}/>
      <table className="cfg-table--sm">
        <thead>
          <tr>
            {['Hora','Usuario','Acción','Target','IP','Severidad'].map(h => (
              <th key={h} className="cfg-th--sm">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td className="cfg-td--sm cfg-td-mono--sm">{e.ts}</td>
              <td className="cfg-td--sm cfg-td-strong">{e.user}</td>
              <td className="cfg-td--sm cfg-td-mid">{e.action}</td>
              <td className="cfg-td--sm cfg-td-mono--ink">{e.target}</td>
              <td className="cfg-td--sm cfg-td-mono-ip">{e.ip}</td>
              <td className="cfg-td--sm">
                <Badge label={e.sev} color={e.sev === 'ERROR' ? '#DC2626' : e.sev === 'WARN' ? '#F97316' : '#16A34A'}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SecFacturacion() {
  return (
    <>
      <div className="cfg-metric-grid-3">
        <SystemMetric label="Plan mensual" value="€4.000" color="#5B21B6"/>
        <SystemMetric label="Overage actual" value="€238" color="#F97316"/>
        <SystemMetric label="Próxima factura" value="€4.238" color="#1d1d1f"/>
      </div>
      <Card>
        <CardHeader title="Uso del mes actual" sub="Mayo 2026 · ciclo 01-31"/>
        <UsageBar label="API calls" used={2_142_300} limit={3_000_000} unit="calls"/>
        <UsageBar label="Brain · tokens IA" used={420_500} limit={1_500_000} unit="tokens"/>
        <UsageBar label="Storage objetos" used={3.2} limit={100} unit="GB"/>
        <UsageBar label="Webhooks entregados" used={1247} limit={5000} unit="entregas"/>
        <UsageBar label="Usuarios federados" used={12} limit={50} unit="usuarios"/>
        <UsageBar label="Workspaces activos" used={5} limit={9999} unit="workspaces" ilimitado/>
      </Card>
      <Card>
        <CardHeader title="Facturas recientes"/>
        <table className="cfg-table">
          <thead>
            <tr>
              {['Periodo','Importe','Estado','Pagada','Acciones'].map(h => (
                <th key={h} className="cfg-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { period: 'Abril 2026',   amount: '€4.000', status: 'Pagada', date: '03 may 2026' },
              { period: 'Marzo 2026',   amount: '€4.000', status: 'Pagada', date: '02 abr 2026' },
              { period: 'Febrero 2026', amount: '€4.000', status: 'Pagada', date: '03 mar 2026' },
              { period: 'Enero 2026',   amount: '€4.000', status: 'Pagada', date: '02 feb 2026' },
              { period: 'Anual 2026',   amount: '€48.000 (-€8.000 dto.)', status: 'Pagada anticipo', date: '15 ene 2026' },
            ].map((f, i) => (
              <tr key={i}>
                <td className="cfg-td-amount">{f.period}</td>
                <td className="cfg-td-amount--display">{f.amount}</td>
                <td className="cfg-td"><Badge label={f.status} color="#16A34A"/></td>
                <td className="cfg-td cfg-td-muted">{f.date}</td>
                <td className="cfg-td">
                  <Button size="sm" variant="secondary">Descargar PDF</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <CardHeader title="Método de pago"/>
        <Field label="Método" value="Domiciliación bancaria SEPA"/>
        <Field label="IBAN" value="ES** **** **** **** **** 4729"/>
        <Field label="Titular" value="Acme Consulting & Strategy SL"/>
        <Field label="Mandato SEPA" value="Firmado 15 ene 2026 · ESM02ZZZACME20260115"/>
        <div className="cfg-flex-row-8-mt">
          <Button variant="secondary">Cambiar método</Button>
          <Button variant="secondary">Descargar mandato</Button>
        </div>
      </Card>
    </>
  )
}

function UsageBar({ label, used, limit, unit, ilimitado }: { label: string; used: number; limit: number; unit: string; ilimitado?: boolean }) {
  const pct = ilimitado ? 0 : (used / limit) * 100
  const color = pct > 90 ? '#DC2626' : pct > 70 ? '#F97316' : '#16A34A'
  return (
    <div className="cfg-usage-row">
      <div className="cfg-usage-head">
        <span className="cfg-usage-label">{label}</span>
        <span className="cfg-usage-value" style={{ color }}>
          {used.toLocaleString('es-ES')} {unit}
          {!ilimitado && <span className="cfg-usage-muted"> / {limit.toLocaleString('es-ES')} ({pct.toFixed(1)}%)</span>}
          {ilimitado && <span className="cfg-usage-muted"> · ILIMITADO</span>}
        </span>
      </div>
      <div className="cfg-usage-track">
        <div className="cfg-usage-fill" style={{ width: ilimitado ? '8%' : `${Math.min(100, pct)}%`, background: color }}/>
      </div>
    </div>
  )
}

function SecSoporte() {
  return (
    <>
      <div className="cfg-soporte-grid">
        {[
          { titulo:'Centro de ayuda', desc:'Documentación, tutoriales, vídeos', cta:'Abrir docs', color:'#1F4E8C' },
          { titulo:'Email · respuesta <2h', desc:'soporte@politeia.es · 24/7 P1', cta:'Escribir email', color:'#5B21B6' },
          { titulo:'Slack compartido', desc:'#politeia-acme · canal directo', cta:'Abrir Slack', color:'#611f69' },
        ].map(s => (
          <div key={s.titulo} className="cfg-soporte-card" style={{ borderTop:`3px solid ${s.color}` }}>
            <h3 className="cfg-soporte-title">{s.titulo}</h3>
            <p className="cfg-soporte-desc">{s.desc}</p>
            <Button>{s.cta}</Button>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title="Tickets recientes" right={<Button>+ Crear ticket</Button>}/>
        <table className="cfg-table">
          <thead>
            <tr>
              {['ID','Asunto','Prioridad','Estado','Última actividad'].map(h => (
                <th key={h} className="cfg-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { id:'#PT-2026-0428', asunto:'Configurar webhook de alertas críticas', prio:'P2', estado:'Resuelto', ult:'hace 2 días' },
              { id:'#PT-2026-0410', asunto:'Añadir nuevo medio al monitor de prensa', prio:'P3', estado:'En curso', ult:'hace 5 días' },
              { id:'#PT-2026-0395', asunto:'Cambio rol usuario · Marta R.', prio:'P3', estado:'Resuelto', ult:'hace 1 semana' },
              { id:'#PT-2026-0383', asunto:'Pipeline GDELT · timeout intermitente', prio:'P2', estado:'En análisis', ult:'hace 1 semana' },
            ].map(t => (
              <tr key={t.id}>
                <td className="cfg-td cfg-td-mono--ink-11">{t.id}</td>
                <td className="cfg-td cfg-td-strong">{t.asunto}</td>
                <td className="cfg-td"><Badge label={t.prio} color={t.prio === 'P1' ? '#DC2626' : t.prio === 'P2' ? '#F97316' : '#1F4E8C'}/></td>
                <td className="cfg-td"><Badge label={t.estado} color={t.estado === 'Resuelto' ? '#16A34A' : '#5B21B6'} outline/></td>
                <td className="cfg-td cfg-td-time">{t.ult}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
