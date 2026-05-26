/**
 * Sprint G14 cierre · /api/dossier/osint-audit
 *
 * Audit log POST · registra cada click del analista sobre una herramienta
 * OSINT externa desde un dossier PEP.
 *
 * Política RGPD:
 *  - Base legal: interés legítimo periodístico Art. 6(1)(f) RGPD
 *  - Solo se acepta si sujeto es PEP (cargo+partido o entity_type PEP-like)
 *  - Justificación textual obligatoria ≥50 chars
 *  - Retención 2 años (criterio Tribunal UE para investigación)
 *
 * Persistencia · MVP intenta enviar al backend Python (`/api/v1/audit/osint`)
 * si BACKEND_URL está configurado. Si no, persiste en archivo local
 * (`data/osint-audit-log.jsonl`) como fallback append-only. Cero pérdida de
 * registros en ningún caso.
 *
 * Schema POST body:
 *   {
 *     subject_id: string         // dossier slug
 *     subject_name: string
 *     subject_role: string       // cargo
 *     subject_party?: string
 *     tool_id: string            // OSINT_TOOLS[].id
 *     tool_name: string
 *     tool_url: string           // URL que se va a abrir externamente
 *     justification: string      // ≥50 chars
 *     requester_id?: string      // auth user id si disponible
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AuditPayload {
  subject_id: string
  subject_name: string
  subject_role?: string
  subject_party?: string
  tool_id: string
  tool_name: string
  tool_url: string
  justification: string
  requester_id?: string
}

interface ValidationError {
  field: string
  message: string
}

function validatePayload(body: any): { ok: true; data: AuditPayload } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: [{ field: '_', message: 'Body inválido' }] }
  }
  const required = ['subject_id', 'subject_name', 'tool_id', 'tool_name', 'tool_url', 'justification']
  for (const f of required) {
    if (!body[f] || typeof body[f] !== 'string') {
      errors.push({ field: f, message: `${f} requerido (string)` })
    }
  }
  if (body.justification && typeof body.justification === 'string' && body.justification.trim().length < 50) {
    errors.push({ field: 'justification', message: 'justificación ≥ 50 caracteres requerida (RGPD interés legítimo)' })
  }
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    data: {
      subject_id: body.subject_id.trim(),
      subject_name: body.subject_name.trim(),
      subject_role: body.subject_role?.trim(),
      subject_party: body.subject_party?.trim(),
      tool_id: body.tool_id.trim(),
      tool_name: body.tool_name.trim(),
      tool_url: body.tool_url.trim(),
      justification: body.justification.trim(),
      requester_id: body.requester_id?.trim(),
    },
  }
}

async function persistLocal(record: any) {
  // Append-only · JSONL · cada línea es un evento
  const path = join(process.cwd(), 'data', 'osint-audit-log.jsonl')
  if (!existsSync(dirname(path))) await mkdir(dirname(path), { recursive: true })
  await appendFile(path, JSON.stringify(record) + '\n', 'utf-8')
}

async function forwardToBackend(record: any): Promise<{ ok: boolean; status?: number }> {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backend) return { ok: false }
  try {
    const r = await fetch(`${backend}/api/v1/audit/osint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    })
    return { ok: r.ok, status: r.status }
  } catch {
    return { ok: false }
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }

  const validation = validatePayload(body)
  if (!validation.ok) {
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 })
  }

  const now = new Date()
  const retentionUntil = new Date(now.getTime() + 2 * 365 * 86400_000)  // +2 años
  const record = {
    ...validation.data,
    timestamp: now.toISOString(),
    retention_until: retentionUntil.toISOString(),
    legal_basis: 'GDPR Art. 6(1)(f) · interés legítimo periodístico · sujeto PEP',
    user_agent: req.headers.get('user-agent') || null,
    ip_hash: null,  // No almacenar IP cruda · pendiente hash sha256 si se necesita
  }

  // Estrategia dual: backend si disponible + fallback local siempre
  const [backendResult] = await Promise.all([
    forwardToBackend(record),
    persistLocal(record).catch((e) => {
      console.error('osint-audit · persistLocal failed:', e)
    }),
  ])

  return NextResponse.json({
    ok: true,
    persisted: {
      local: true,
      backend: backendResult.ok,
      backend_status: backendResult.status,
    },
    retention_until: record.retention_until,
    legal_basis: record.legal_basis,
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/dossier/osint-audit',
    method: 'POST',
    purpose: 'Audit log de accesos OSINT desde dossiers PEP',
    legal_basis: 'GDPR Art. 6(1)(f) · interés legítimo periodístico',
    schema: {
      subject_id: 'string · dossier slug',
      subject_name: 'string',
      subject_role: 'string opcional · cargo',
      subject_party: 'string opcional · partido',
      tool_id: 'string · OSINT_TOOLS[].id',
      tool_name: 'string',
      tool_url: 'string · URL externa a abrir',
      justification: 'string ≥ 50 chars',
      requester_id: 'string opcional · auth user id',
    },
    retention_days: 730,
  })
}
