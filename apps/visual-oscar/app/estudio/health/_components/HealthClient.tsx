'use client'

import { useQuery } from '@tanstack/react-query'
import { healthApi } from '@/lib/estudio/api-client'
import type { SystemHealth, ServiceStatus } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './Health.module.css'

const SERVICE_LABELS: Record<string, { label: string; glyph: string }> = {
  database:        { label: 'Base de datos',     glyph: '⊟' },
  redis:           { label: 'Cache (Redis)',     glyph: '⚡' },
  pipeline_runner: { label: 'Pipeline Runner',   glyph: '⟶' },
  ai_engine:       { label: 'Motor IA',          glyph: '✦' },
  storage:         { label: 'Almacenamiento',    glyph: '◫' },
  search_index:    { label: 'Índice búsqueda',   glyph: '⌕' },
  message_queue:   { label: 'Cola de mensajes',  glyph: '⇉' },
}

const STATUS_META: Record<ServiceStatus, { label: string; color: string; dot: string }> = {
  up:       { label: 'Operativo',   color: '#22c55e', dot: '●' },
  degraded: { label: 'Degradado',   color: '#f59e0b', dot: '◐' },
  down:     { label: 'Caído',       color: '#ef4444', dot: '○' },
  unknown:  { label: 'Desconocido', color: '#9ca3af', dot: '◌' },
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3_600)
  const m = Math.floor((seconds % 3_600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function LatencyBar({ ms }: { ms: number }) {
  const max = 1_000
  const pct = Math.min((ms / max) * 100, 100)
  const color = ms < 50 ? '#22c55e' : ms < 200 ? '#f59e0b' : '#ef4444'
  return (
    <div className={styles.latencyWrap}>
      <div className={styles.latencyBar}>
        <div className={styles.latencyFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.latencyLabel} style={{ color }}>{ms}ms</span>
    </div>
  )
}

export default function HealthClient() {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<SystemHealth>({
    queryKey:        ['domo', 'health'],
    queryFn:         healthApi.check,
    refetchInterval: 30_000,
    staleTime:       15_000,
  })

  const allServices  = data ? Object.entries(data.services) : []
  const downCount    = allServices.filter(([, s]) => s.status === 'down').length
  const degradedCount = allServices.filter(([, s]) => s.status === 'degraded').length

  const overallMeta = data
    ? data.status === 'healthy'
      ? { label: 'Todos los sistemas operativos', color: '#22c55e', glyph: '✓' }
      : data.status === 'degraded'
      ? { label: `${degradedCount} servicio${degradedCount !== 1 ? 's' : ''} degradado${degradedCount !== 1 ? 's' : ''}`, color: '#f59e0b', glyph: '!' }
      : { label: `${downCount} servicio${downCount !== 1 ? 's' : ''} caído${downCount !== 1 ? 's' : ''}`, color: '#ef4444', glyph: '×' }
    : null

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Health</h1>
          <p className={styles.subtitle}>Estado en tiempo real de todos los servicios del módulo Domo</p>
        </div>
        <div className={styles.headerRight}>
          {dataUpdatedAt > 0 && (
            <span className={styles.lastCheck}>
              Última comprobación: {new Date(dataUpdatedAt).toLocaleTimeString('es')}
            </span>
          )}
          <button onClick={() => refetch()} disabled={isFetching} className={styles.refreshBtn}>
            <span style={{ display: 'inline-block', animation: isFetching ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
            {isFetching ? ' Comprobando…' : ' Actualizar'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 80, borderRadius: 12, marginBottom: '1.25rem' }} />
      ) : error ? (
        <div className={styles.errorBanner}>
          × No se puede conectar al backend. Verifica que el servidor esté activo.
        </div>
      ) : overallMeta && data ? (
        <div className={styles.overallBanner} style={{ borderColor: `${overallMeta.color}40`, background: `${overallMeta.color}08` }}>
          <span className={styles.overallIcon} style={{ color: overallMeta.color }}>{overallMeta.glyph}</span>
          <div>
            <div className={styles.overallLabel} style={{ color: overallMeta.color }}>{overallMeta.label}</div>
            <div className={styles.overallMeta}>
              v{data.version} · Uptime: {formatUptime(data.uptimeSeconds ?? 0)} · {allServices.length} servicios monitorizados
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.grid}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 110, borderRadius: 12 }} />)
          : allServices.map(([key, service]) => {
              const meta  = STATUS_META[service.status ?? 'unknown']
              const label = SERVICE_LABELS[key] ?? { label: key, glyph: '●' }
              return (
                <div
                  key={key}
                  className={styles.serviceCard}
                  style={{ borderColor: `${meta.color}30` }}
                >
                  <div className={styles.serviceHeader}>
                    <span className={styles.serviceIcon}>{label.glyph}</span>
                    <span className={styles.serviceName}>{label.label}</span>
                    <span className={styles.statusDot} style={{ color: meta.color }} title={meta.label}>{meta.dot}</span>
                  </div>
                  <div className={styles.statusLabel} style={{ color: meta.color }}>{meta.label}</div>
                  {service.latencyMs !== undefined && <LatencyBar ms={service.latencyMs} />}
                  {service.message && <div className={styles.serviceMsg}>{service.message}</div>}
                </div>
              )
            })
        }
      </div>

      <div className={styles.sprintsSection}>
        <h2 className={styles.sprintsTitle}>Módulos Domo — Sprint Coverage</h2>
        <div className={styles.sprintsTable}>
          {[
            { sprint: 1, module: 'Foundation + Sidebar',         route: '/estudio' },
            { sprint: 2, module: 'Fuentes de datos',             route: '/estudio/fuentes' },
            { sprint: 3, module: 'Pipelines ETL',                route: '/estudio/pipeline' },
            { sprint: 4, module: 'Datasets',                     route: '/estudio/dataset' },
            { sprint: 5, module: 'Dashboards constructor',       route: '/estudio/dashboard' },
            { sprint: 6, module: 'Alertas + Notif + Sharing',    route: '/estudio/alertas' },
            { sprint: 7, module: 'Gobernanza + AI Query',        route: '/estudio/gobernanza' },
            { sprint: 8, module: 'Health + Cmd-K + Anotaciones', route: '/estudio/health' },
          ].map(row => (
            <div key={row.sprint} className={styles.sprintRow}>
              <span className={styles.sprintNum}>Sprint {row.sprint}</span>
              <span className={styles.sprintModule}>{row.module}</span>
              <code className={styles.sprintRoute}>{row.route}</code>
              <span className={styles.sprintStatus} style={{ color: '#22c55e' }}>✓ Completado</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
