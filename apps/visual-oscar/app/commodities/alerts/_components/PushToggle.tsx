'use client'
/**
 * PushToggle · banner compacto en /commodities/alerts para activar
 * notificaciones push del navegador (Web Push · VAPID).
 *
 * Muestra estados claros: unsupported / disabled / idle / subscribed / denied.
 * Si está bloqueado, instruye al usuario para reactivar en settings.
 */
import { useWebPush } from '@/hooks/useWebPush'

export function PushToggle({ userId }: { userId?: string }) {
  const { status, lastError, subscribe, unsubscribe } = useWebPush(
    userId ?? 'anon@politeia.local',
  )

  const palette = STYLES[status]

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 12.5,
        color: palette.fg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span aria-hidden style={{ fontWeight: 800, fontSize: 14 }}>
          {palette.mark}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700 }}>{palette.title}</span>
          <span style={{ color: '#6b7280', fontSize: 11.5 }}>{palette.subtitle}</span>
          {lastError && status === 'error' && (
            <span style={{ color: '#dc2626', fontSize: 11, marginTop: 2 }}>
              {lastError.slice(0, 160)}
            </span>
          )}
        </div>
      </div>
      {status === 'idle' && (
        <button onClick={subscribe} style={btnPrimary}>
          Activar push
        </button>
      )}
      {status === 'subscribing' && (
        <button disabled style={{ ...btnPrimary, opacity: 0.6 }}>
          Activando…
        </button>
      )}
      {status === 'subscribed' && (
        <button onClick={unsubscribe} style={btnSecondary}>
          Desactivar
        </button>
      )}
      {status === 'error' && (
        <button onClick={subscribe} style={btnSecondary}>
          Reintentar
        </button>
      )}
    </div>
  )
}

const STYLES: Record<string, { bg: string; border: string; fg: string; mark: string; title: string; subtitle: string }> = {
  unsupported: {
    bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', mark: '!',
    title: 'Push no soportado',
    subtitle: 'Tu navegador no soporta Web Push API.',
  },
  disabled: {
    bg: '#fef3c7', border: '#fde68a', fg: '#92400e', mark: '○',
    title: 'Push no configurado en el servidor',
    subtitle: 'El administrador debe configurar las claves VAPID.',
  },
  idle: {
    bg: '#eff6ff', border: '#bfdbfe', fg: '#1e40af', mark: '◐',
    title: 'Notificaciones push del navegador',
    subtitle: 'Recibe alertas aunque la pestaña esté cerrada.',
  },
  subscribing: {
    bg: '#eff6ff', border: '#bfdbfe', fg: '#1e40af', mark: '⋯',
    title: 'Activando push…',
    subtitle: 'Solicitando permisos y registrando suscripción.',
  },
  subscribed: {
    bg: '#ecfdf5', border: '#a7f3d0', fg: '#065f46', mark: '●',
    title: 'Push activo',
    subtitle: 'Este dispositivo recibirá notificaciones cuando se dispare una alerta.',
  },
  denied: {
    bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', mark: '⨯',
    title: 'Permisos bloqueados',
    subtitle: 'Permite notificaciones desde el icono del candado en la barra de URL y recarga.',
  },
  error: {
    bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', mark: '!',
    title: 'Error con la suscripción push',
    subtitle: 'Pulsa "Reintentar" o consulta consola del navegador.',
  },
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 14px',
  background: '#1e40af',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondary: React.CSSProperties = {
  padding: '7px 14px',
  background: '#fff',
  color: '#1e293b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
