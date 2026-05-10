'use client'

import { SSEStatus } from '@/hooks/useSSE'

const STATUS_CONFIG: Record<SSEStatus, { color: string; label: string; pulse: boolean }> = {
  connecting:   { color: '#f5a623', label: 'Conectando…',   pulse: true  },
  connected:    { color: '#34c759', label: 'En vivo',        pulse: true  },
  reconnecting: { color: '#ff9500', label: 'Reconectando…', pulse: true  },
  error:        { color: '#ff3b30', label: 'Error',          pulse: false },
  closed:       { color: '#8e8e93', label: 'Desconectado',  pulse: false },
}

interface Props {
  status: SSEStatus
  className?: string
}

export default function SSEStatusIndicator({ status, className = '' }: Props) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
      style={{ color: cfg.color }}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}
