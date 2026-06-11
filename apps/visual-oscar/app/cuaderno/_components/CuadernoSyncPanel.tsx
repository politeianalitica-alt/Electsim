'use client'

/**
 * <CuadernoSyncPanel> · panel de sincronización cloud.
 *
 * Sprint Cuaderno N8 · UI para push/pull/sync + vincular dispositivos.
 *
 * UX:
 *   - Botón "↑↓ Sync" en toolbar abre este modal
 *   - 3 acciones:
 *       · Sync     · pull + merge LWW + push (recomendado)
 *       · Push     · sobreescribe remoto con local
 *       · Pull     · sobreescribe local con remoto (con confirmación)
 *   - Info: último sync · número de notas locales
 *   - Vincular dispositivo: copia tu client_id o pega uno de otro dispositivo
 */

import { useEffect, useState } from 'react'
import {
  getClientId,
  setClientId,
  getLastSyncAt,
  push,
  pull,
  sync,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  type SyncResult,
} from '@/lib/cuaderno/cloud-sync'
import { loadAll } from '@/lib/cuaderno/store'

interface Props {
  onClose: () => void
}

export function CuadernoSyncPanel({ onClose }: Props) {
  const [clientId, setClient] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [busy, setBusy] = useState<'sync' | 'push' | 'pull' | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [bindInput, setBindInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmPull, setConfirmPull] = useState(false)
  const [noteCount, setNoteCount] = useState(0)
  const [autoSync, setAutoSync] = useState(false)

  useEffect(() => {
    setClient(getClientId())
    setLastSync(getLastSyncAt())
    setNoteCount(loadAll().length)
    setAutoSync(isAutoSyncEnabled())
  }, [])

  function toggleAutoSync() {
    const next = !autoSync
    setAutoSync(next)
    setAutoSyncEnabled(next)
    // Para que el listener se enganche o se desenganche debe haber un re-mount
    // de CuadernoClient o equivalente. Se recarga al cerrar el modal (ver
    // CuadernoClient · refresh() y la regeneración del hook auto-sync mount).
  }

  async function runSync() {
    setBusy('sync')
    setResult(null)
    const r = await sync()
    setResult(r)
    setLastSync(getLastSyncAt())
    setNoteCount(loadAll().length)
    setBusy(null)
  }

  async function runPush() {
    setBusy('push')
    setResult(null)
    const r = await push()
    setResult(r)
    setLastSync(getLastSyncAt())
    setBusy(null)
  }

  async function runPull() {
    setBusy('pull')
    setResult(null)
    const r = await pull()
    setResult(r)
    setLastSync(getLastSyncAt())
    setNoteCount(loadAll().length)
    setBusy(null)
    setConfirmPull(false)
  }

  function copyClientId() {
    try {
      navigator.clipboard.writeText(clientId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  function bindDevice() {
    const ok = setClientId(bindInput.trim())
    if (ok) {
      setClient(getClientId())
      setBindInput('')
      setResult({ ok: true, error: undefined })
    } else {
      setResult({ ok: false, error: 'Client ID inválido · debe ser un UUID o cadena alfanumérica' })
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 'min(560px, 100%)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          fontFamily: '-apple-system, system-ui, sans-serif',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>↑↓</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
              Sincronización Cloud
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {noteCount} nota{noteCount === 1 ? '' : 's'} locales ·{' '}
              {lastSync ? `último sync: ${new Date(lastSync).toLocaleString('es-ES')}` : 'nunca sincronizado'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, color: '#64748b',
              cursor: 'pointer', padding: 0, width: 28,
            }}
          >
            ×
          </button>
        </div>

        {/* Acciones principales */}
        <div style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{
            fontSize: 10, color: '#64748b', textTransform: 'uppercase',
            letterSpacing: 0.5, fontWeight: 700, marginBottom: 8,
          }}>
            Acciones
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button
              onClick={runSync}
              disabled={busy !== null}
              style={{
                padding: '10px 12px', borderRadius: 6,
                background: busy === 'sync' ? '#cbd5e1' : '#1F4E8C',
                color: '#fff', border: 'none', fontWeight: 600,
                fontSize: 12, cursor: busy === null ? 'pointer' : 'wait',
              }}
            >
              {busy === 'sync' ? '…' : '↺ Sync'}
              <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>
                pull + merge + push
              </div>
            </button>
            <button
              onClick={runPush}
              disabled={busy !== null}
              style={{
                padding: '10px 12px', borderRadius: 6,
                background: '#fff', border: '1px solid #cbd5e1', fontWeight: 600,
                fontSize: 12, color: '#0f172a', cursor: busy === null ? 'pointer' : 'wait',
              }}
            >
              {busy === 'push' ? '…' : '↑ Push'}
              <div style={{ fontSize: 9, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                sube local · sobrescribe remoto
              </div>
            </button>
            <button
              onClick={() => setConfirmPull(true)}
              disabled={busy !== null}
              style={{
                padding: '10px 12px', borderRadius: 6,
                background: '#fff', border: '1px solid #cbd5e1', fontWeight: 600,
                fontSize: 12, color: '#0f172a', cursor: busy === null ? 'pointer' : 'wait',
              }}
            >
              {busy === 'pull' ? '…' : '↓ Pull'}
              <div style={{ fontSize: 9, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                baja remoto · sobrescribe local
              </div>
            </button>
          </div>

          {confirmPull && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 6,
              background: '#fef3c7', border: '1px solid #fcd34d',
              fontSize: 12, color: '#78350f',
            }}>
              <strong>¿Sobrescribir notas locales?</strong>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                Esto reemplazará todas tus notas actuales con las del cloud. Las locales se perderán.
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button
                  onClick={runPull}
                  style={{
                    padding: '4px 10px', fontSize: 11, borderRadius: 4,
                    background: '#dc2626', color: '#fff', border: 'none',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Sí, pull
                </button>
                <button
                  onClick={() => setConfirmPull(false)}
                  style={{
                    padding: '4px 10px', fontSize: 11, borderRadius: 4,
                    background: '#fff', color: '#78350f', border: '1px solid #fcd34d',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {result && (
            <div style={{
              marginTop: 10, padding: 8, borderRadius: 6,
              background: result.ok ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${result.ok ? '#6ee7b7' : '#fca5a5'}`,
              fontSize: 12, color: result.ok ? '#065f46' : '#991b1b',
            }}>
              {result.ok ? (
                <>
                  ✓ Sincronizado
                  {result.pulled !== undefined && ` · ${result.pulled} bajadas`}
                  {result.pushed !== undefined && ` · ${result.pushed} subidas`}
                  {result.merged !== undefined && ` · ${result.merged} total`}
                </>
              ) : (
                <>✗ Error: {result.error}</>
              )}
            </div>
          )}
        </div>

        {/* Auto-sync · toggle opcional */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', fontSize: 12,
          }}>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={toggleAutoSync}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              Auto-sync silencioso
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
              cada cambio · debounce 30s
            </span>
          </label>
          {autoSync && (
            <div style={{
              marginTop: 8, padding: 8, borderRadius: 4,
              background: '#f0f9ff', border: '1px solid #bae6fd',
              fontSize: 10, color: '#075985',
            }}>
              Auto-sync activo · cada edición dispara un sync tras 30s sin cambios.
              Reinicia /cuaderno para que el listener se enganche.
            </div>
          )}
        </div>

        {/* Identidad del dispositivo */}
        <div style={{ padding: 16 }}>
          <div style={{
            fontSize: 10, color: '#64748b', textTransform: 'uppercase',
            letterSpacing: 0.5, fontWeight: 700, marginBottom: 8,
          }}>
            Identidad del dispositivo
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            padding: '8px 10px', background: '#f8fafc', borderRadius: 6,
            border: '1px solid #e2e8f0',
          }}>
            <code style={{
              flex: 1, fontSize: 11, color: '#0f172a',
              fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {clientId}
            </code>
            <button
              onClick={copyClientId}
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4,
                background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer',
                color: '#475569', fontWeight: 600,
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>

          <div style={{
            fontSize: 10, color: '#64748b', textTransform: 'uppercase',
            letterSpacing: 0.5, fontWeight: 700, marginBottom: 6,
          }}>
            Vincular otro dispositivo
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={bindInput}
              onChange={(e) => setBindInput(e.target.value)}
              placeholder="Pega el client_id de otro dispositivo"
              style={{
                flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6,
                border: '1px solid #cbd5e1', outline: 'none',
                fontFamily: 'ui-monospace, monospace',
              }}
            />
            <button
              onClick={bindDevice}
              disabled={!bindInput.trim()}
              style={{
                padding: '6px 14px', fontSize: 12, borderRadius: 6,
                background: bindInput.trim() ? '#1F4E8C' : '#cbd5e1',
                color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Vincular
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
            Al vincular reemplazas tu identidad local. Tras vincular, pulsa "↓ Pull"
            para descargar las notas del dispositivo original. (No es auth criptográfica:
            es identidad por conveniencia entre tus propios dispositivos.)
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #e5e7eb',
          fontSize: 10, color: '#94a3b8', textAlign: 'center',
        }}>
          Sprint N8 · datos en Vercel Blob · merge LWW por updatedAt
        </div>
      </div>
    </div>
  )
}
