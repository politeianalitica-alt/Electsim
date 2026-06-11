/**
 * /api/sync/[namespace] — Fase 2 · sync genérico de stores locales.
 *
 * Generaliza el patrón de /api/cuaderno/sync (Vercel Blob) para los módulos
 * transversales, con DOS mejoras sobre el original:
 *
 *   1. Identidad derivada de la SESIÓN (cookie politeia_session verificada),
 *      no de un UUID pegado a mano: todos los dispositivos del mismo login
 *      comparten snapshot automáticamente, y nadie sin sesión puede leer
 *      ni escribir (el del Cuaderno aceptaba cualquier client_id).
 *   2. Allowlist de namespaces: solo los stores preparados para merge LWW
 *      con tombstones (items con {id, updatedAt, deletedAt?}).
 *
 * GET  → { ok, items|null, uploaded_at }   último snapshot del usuario
 * POST → { items: [...] }                  sube snapshot completo
 *
 * Degradación: sin BLOB_READ_WRITE_TOKEN → 503 con mensaje claro (el
 * cliente marca el namespace como 'off' y no reintenta en la sesión).
 */

import { NextRequest, NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'
import { COOKIE_NAME, verifyToken } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NAMESPACES = ['cama', 'preinformes', 'cuaderno'] as const
type Namespace = (typeof NAMESPACES)[number]

function isNamespace(ns: string): ns is Namespace {
  return (NAMESPACES as readonly string[]).includes(ns)
}

function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/** Hash estable del email de sesión → clave de blob por usuario (no por dispositivo). */
async function userKeyFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.email) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload.email.toLowerCase()))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

function pathFor(ns: Namespace, userKey: string): string {
  return `sync/${ns}/u-${userKey}.json`
}

/** Validación de shape: cada item debe tener id string y updatedAt numérico. */
function itemsValid(items: unknown): items is Array<{ id: string; updatedAt: number }> {
  return (
    Array.isArray(items) &&
    items.every(
      it => !!it && typeof it === 'object' &&
        typeof (it as { id?: unknown }).id === 'string' &&
        typeof (it as { updatedAt?: unknown }).updatedAt === 'number',
    )
  )
}

export async function GET(req: NextRequest, { params }: { params: { namespace: string } }) {
  if (!isNamespace(params.namespace)) {
    return NextResponse.json({ ok: false, error: `namespace desconocido: ${params.namespace}` }, { status: 404 })
  }
  if (!blobConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado · sync deshabilitado' },
      { status: 503 },
    )
  }
  const userKey = await userKeyFromSession(req)
  if (!userKey) {
    return NextResponse.json({ ok: false, error: 'sesión inválida' }, { status: 401 })
  }
  const path = pathFor(params.namespace, userKey)
  try {
    const { blobs } = await list({ prefix: path, limit: 1 })
    if (blobs.length === 0) {
      return NextResponse.json({ ok: true, items: null, uploaded_at: null })
    }
    const resp = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!resp.ok) {
      return NextResponse.json({ ok: false, error: `fetch blob: ${resp.status}` }, { status: 502 })
    }
    const snapshot = (await resp.json()) as { items?: unknown[] }
    return NextResponse.json({
      ok: true,
      items: Array.isArray(snapshot.items) ? snapshot.items : [],
      uploaded_at: blobs[0].uploadedAt,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { namespace: string } }) {
  if (!isNamespace(params.namespace)) {
    return NextResponse.json({ ok: false, error: `namespace desconocido: ${params.namespace}` }, { status: 404 })
  }
  if (!blobConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado · sync deshabilitado' },
      { status: 503 },
    )
  }
  const userKey = await userKeyFromSession(req)
  if (!userKey) {
    return NextResponse.json({ ok: false, error: 'sesión inválida' }, { status: 401 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'body JSON inválido' }, { status: 400 })
  }
  const items = (body as { items?: unknown })?.items
  if (!itemsValid(items)) {
    return NextResponse.json(
      { ok: false, error: 'shape inválido · se espera { items: [{ id, updatedAt, … }] }' },
      { status: 400 },
    )
  }
  const text = JSON.stringify({ items, uploaded_at: new Date().toISOString(), version: 1 })
  if (text.length > 1_500_000) {
    return NextResponse.json({ ok: false, error: 'snapshot >1.5 MB · limpiar antes de sincronizar' }, { status: 413 })
  }
  try {
    await put(pathFor(params.namespace, userKey), text, {
      access: 'public', // mismo trade-off que el sync del Cuaderno: el path
      addRandomSuffix: false, // contiene un hash no adivinable del usuario
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return NextResponse.json({
      ok: true,
      uploaded_at: new Date().toISOString(),
      count: items.length,
      size: text.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
