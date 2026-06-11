/**
 * Copia de seguridad global del trabajo local — Fase 2.
 *
 * Exporta TODAS las claves Politeia de localStorage (Cuaderno, Cama,
 * Preinformes, docs del Command Center…) a un único .json descargable, y
 * permite restaurarlo. Es el seguro de vida mientras la persistencia es
 * local-first: cuota llena, cambio de máquina o limpieza del navegador
 * dejan de significar pérdida total.
 */

import { listPoliteiaKeys } from './registry'
import { safeSetItem } from './safe'

export interface BackupFile {
  format: 'politeia-backup'
  version: 1
  exported_at: string
  origin: string
  entries: Record<string, string>
}

/** Construye el objeto de backup con todas las claves Politeia actuales. */
export function buildBackup(): BackupFile {
  const entries: Record<string, string> = {}
  for (const k of listPoliteiaKeys()) {
    const v = localStorage.getItem(k)
    if (v !== null) entries[k] = v
  }
  return {
    format: 'politeia-backup',
    version: 1,
    exported_at: new Date().toISOString(),
    origin: typeof location !== 'undefined' ? location.origin : '',
    entries,
  }
}

/** Descarga el backup como politeia-backup-YYYY-MM-DD.json */
export function downloadBackup(): { keys: number; bytes: number } {
  const backup = buildBackup()
  const text = JSON.stringify(backup, null, 2)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `politeia-backup-${backup.exported_at.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  return { keys: Object.keys(backup.entries).length, bytes: text.length }
}

export interface RestoreResult {
  ok: boolean
  restored: number
  failed: number
  error?: string
}

/**
 * Restaura un backup (sobrescribe las claves incluidas; no borra las demás).
 * Tras restaurar conviene recargar la página para que los stores rehidraten.
 */
export function restoreBackup(json: string): RestoreResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, restored: 0, failed: 0, error: 'El archivo no es JSON válido' }
  }
  const b = parsed as Partial<BackupFile>
  if (b?.format !== 'politeia-backup' || typeof b.entries !== 'object' || !b.entries) {
    return { ok: false, restored: 0, failed: 0, error: 'No es un backup de Politeia (falta format/entries)' }
  }
  let restored = 0
  let failed = 0
  for (const [k, v] of Object.entries(b.entries)) {
    // Solo claves del ecosistema: un backup manipulado no puede escribir
    // claves arbitrarias (tokens de auth, etc.)
    if (typeof v !== 'string' || !(k.startsWith('politeia') || k === 'cuaderno_client_id')) continue
    if (safeSetItem(k, v)) restored++
    else failed++
  }
  return { ok: failed === 0, restored, failed }
}
