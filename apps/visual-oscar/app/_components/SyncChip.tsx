'use client'

/**
 * SyncChip — indicador discreto del estado de sync de un namespace.
 *
 * Escucha SYNC_STATUS_EVENT (lib/sync/namespace-sync) filtrado por
 * namespace. Estados: nada (aún sin intentar), sincronizando, al día,
 * error y 'sin nube' (Blob no configurado · modo solo-local).
 */

import { useEffect, useState } from 'react'
import { SYNC_STATUS_EVENT, type SyncStatusDetail, type SyncStatus } from '@/lib/sync/namespace-sync'

const META: Record<SyncStatus, { label: string; color: string; bg: string }> = {
  syncing: { label: '◐ sincronizando…', color: '#6e6e73', bg: '#f5f5f7' },
  ok:      { label: '✓ nube al día',    color: '#2d8a39', bg: 'rgba(45,138,57,0.08)' },
  error:   { label: '! sync con error', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  off:     { label: 'solo local',        color: '#86868b', bg: '#f5f5f7' },
}

export default function SyncChip({ namespace }: { namespace: string }) {
  const [status, setStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent<SyncStatusDetail>).detail
      if (detail?.namespace === namespace) setStatus(detail.status)
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus)
  }, [namespace])

  if (!status) return null
  const meta = META[status]
  return (
    <span
      title={status === 'off'
        ? 'Sin almacenamiento en la nube configurado: los datos viven solo en este navegador'
        : 'Sincronización con la nube de tu cuenta (mismo login = mismos datos en todos los dispositivos)'}
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
        borderRadius: 99, fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap',
        color: meta.color, background: meta.bg, flexShrink: 0,
      }}
    >
      {meta.label}
    </span>
  )
}
