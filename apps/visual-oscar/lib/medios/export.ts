/**
 * Utilidades de exportación y compartición para los tableros de Medios.
 * Todo cliente (sin backend): descarga CSV vía Blob y copia el enlace actual.
 */

function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value)
  // Comilla si contiene separador, comillas, saltos de línea o punto y coma.
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Descarga `rows` como CSV (UTF-8 con BOM para que Excel respete los acentos). */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (typeof document === 'undefined' || !rows.length) return
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set }, new Set()),
  )
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Copia el enlace actual (con filtros en la URL) al portapapeles. */
export async function copyCurrentLink(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch {
    // Fallback para navegadores sin permiso de clipboard.
    try {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      return true
    } catch {
      return false
    }
  }
}
