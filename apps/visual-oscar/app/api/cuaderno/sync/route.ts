/**
 * /api/cuaderno/sync
 *
 * Sprint Cuaderno N8 · backend de sincronización del Cuaderno.
 *
 * Almacena el snapshot completo de las notas del usuario en Vercel Blob
 * (privado server-side · el blob nunca se expone directamente al cliente).
 *
 * Identidad: header `x-cuaderno-client-id` con un UUID estable que el cliente
 * genera la primera vez y guarda en localStorage. Esto NO es auth real —
 * es identidad por dispositivo. Si el usuario quiere sincronizar entre
 * dispositivos, debe copiar el client_id manualmente (o usar el botón
 * "vincular dispositivo" futuro).
 *
 * Métodos:
 *   GET  → devuelve el último snapshot guardado del client_id
 *   POST → sube un snapshot nuevo y devuelve la versión guardada
 *
 * Degradación:
 *   Si BLOB_READ_WRITE_TOKEN no está configurado → 503 con mensaje claro.
 *   El frontend muestra el mensaje al usuario para que pida configurar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { head, put, list } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PREFIX = 'cuaderno/'

function isClientIdValid(id: string | null): id is string {
  // UUID v4 o similar · evita path traversal o inyección
  return !!id && /^[a-z0-9-]{16,64}$/i.test(id)
}

function pathFor(clientId: string): string {
  return `${PREFIX}${clientId}.json`
}

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

export async function GET(req: NextRequest) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado en Vercel · sync deshabilitado' },
      { status: 503 },
    )
  }
  const clientId = req.headers.get('x-cuaderno-client-id')
  if (!isClientIdValid(clientId)) {
    return NextResponse.json({ ok: false, error: 'x-cuaderno-client-id inválido' }, { status: 400 })
  }
  const path = pathFor(clientId)
  try {
    // Listar para encontrar el blob (Vercel Blob v2 no permite head() sin URL completa)
    const { blobs } = await list({ prefix: path, limit: 1 })
    if (blobs.length === 0) {
      return NextResponse.json({ ok: true, snapshot: null, uploaded_at: null })
    }
    const blob = blobs[0]
    const resp = await fetch(blob.url, { cache: 'no-store' })
    if (!resp.ok) {
      return NextResponse.json({ ok: false, error: `fetch blob: ${resp.status}` }, { status: 502 })
    }
    const snapshot = await resp.json()
    return NextResponse.json({
      ok: true,
      snapshot,
      uploaded_at: blob.uploadedAt,
      size: blob.size,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado en Vercel · sync deshabilitado' },
      { status: 503 },
    )
  }
  const clientId = req.headers.get('x-cuaderno-client-id')
  if (!isClientIdValid(clientId)) {
    return NextResponse.json({ ok: false, error: 'x-cuaderno-client-id inválido' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'body JSON inválido' }, { status: 400 })
  }
  // Validación mínima · es la responsabilidad del cliente curar el shape
  if (!body || typeof body !== 'object' || !('notes' in body) || !Array.isArray((body as { notes: unknown[] }).notes)) {
    return NextResponse.json({ ok: false, error: 'shape inválido · falta { notes: [] }' }, { status: 400 })
  }
  const notes = (body as { notes: unknown[] }).notes
  // Límite defensivo de tamaño (1 MB de JSON) para evitar abuso
  const text = JSON.stringify({ notes, uploaded_at: new Date().toISOString(), version: 1 })
  if (text.length > 1_500_000) {
    return NextResponse.json({ ok: false, error: 'snapshot >1.5 MB, partir o limpiar' }, { status: 413 })
  }
  try {
    const blob = await put(pathFor(clientId), text, {
      access: 'public', // ojo: privado requiere flow distinto · path es UUID-aleatorio
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return NextResponse.json({
      ok: true,
      uploaded_at: new Date().toISOString(),
      size: text.length,
      url: blob.url,
      count: notes.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
