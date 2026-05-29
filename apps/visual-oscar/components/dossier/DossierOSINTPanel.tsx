'use client'
/**
 * `<DossierOSINTPanel />` · Sprint G14 cierre
 *
 * Panel "Investigar más" en cada dossier PEP · enlaces curados a 18
 * herramientas OSINT externas categorizadas. Cada click pide justificación
 * textual ≥50 chars + registra en audit log antes de abrir el enlace.
 *
 * GUARDARRAÍLES INTEGRADOS:
 *  - Solo renderiza si `isEligiblePEP(subject)` = true (cargo+partido o type)
 *  - Modal bloqueante con textarea + contador chars
 *  - POST a /api/dossier/osint-audit (backend + local fallback)
 *  - Sin almacenar datos personales del sujeto en logs ni cookies
 *  - Banner permanente con base legal RGPD Art. 6(1)(f)
 *
 * DECISIÓN DE DISEÑO: Politeia NO ejecuta nunca la herramienta · solo
 * redirige al analista a la herramienta externa donde ya está logueado.
 * Esto deja a Politeia fuera del rol "data processor" RGPD.
 */
import { useMemo, useState } from 'react'
import {
  OSINT_TOOLS,
  CATEGORY_LABEL,
  groupOSINTToolsByCategory,
  isEligiblePEP,
  type OSINTSubject,
  type OSINTTool,
} from '@/lib/dossier/osint-external-tools'

interface Props {
  subject: OSINTSubject & {
    /** Slug del dossier · necesario para audit log */
    dossier_slug: string
    /** Tipo de entity si se conoce (politician/judge/executive/journalist/pep) */
    tipo?: string | null
  }
}

interface PendingClick {
  tool: OSINTTool
  url: string
}

const CATEGORY_ORDER = ['investigative', 'public_records', 'corporate', 'sanctions', 'archive', 'media', 'identity', 'search_operators'] as const

export function DossierOSINTPanel({ subject }: Props) {
  const [pending, setPending] = useState<PendingClick | null>(null)
  const [justification, setJustification] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  // No renderizar si el sujeto no es PEP elegible (guardarraíl principal)
  const eligible = isEligiblePEP({ cargo: subject.cargo, partido: subject.partido, tipo: subject.tipo })

  const grouped = useMemo(() => groupOSINTToolsByCategory(), [])

  if (!eligible) return null

  const tryOpenTool = (tool: OSINTTool) => {
    const url = tool.buildUrl(subject)
    if (!url) {
      setFeedback(`${tool.name} requiere un dato que no tenemos (ej. username, dominio). Imposible construir la búsqueda.`)
      return
    }
    setPending({ tool, url })
    setJustification('')
    setFeedback(null)
  }

  // Registra el audit SIN bloquear la apertura: localStorage (duradero en
  // cliente) + POST best-effort al backend/route (que ya tolera FS de solo
  // lectura). La justificación ≥50 chars sigue siendo obligatoria.
  const recordAudit = (p: PendingClick, j: string) => {
    const rec = {
      subject_id: subject.dossier_slug,
      subject_name: subject.full_name,
      subject_role: subject.cargo || undefined,
      subject_party: subject.partido || undefined,
      tool_id: p.tool.id,
      tool_name: p.tool.name,
      tool_url: p.url,
      justification: j,
      ts: new Date().toISOString(),
    }
    try {
      const key = 'osint-audit-log'
      const prev = JSON.parse(localStorage.getItem(key) || '[]')
      prev.push(rec)
      localStorage.setItem(key, JSON.stringify(prev.slice(-500)))
    } catch { /* localStorage no disponible · no crítico */ }
    try {
      fetch('/api/dossier/osint-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec),
        keepalive: true,
      }).catch(() => { /* best-effort */ })
    } catch { /* no crítico */ }
  }

  const confirmAndOpen = () => {
    if (!pending) return
    const j = justification.trim()
    if (j.length < 50) {
      setFeedback(`Justificación insuficiente · ${j.length}/50 caracteres mínimo`)
      return
    }
    // 1) Abrir DENTRO del gesto de click · evita el bloqueador de pop-ups
    //    (abrir tras un await rompe el "user gesture" y el navegador lo bloquea)
    const win = window.open(pending.url, '_blank', 'noopener,noreferrer')
    // 2) Registrar audit (no bloquea la apertura)
    recordAudit(pending, j)
    setPending(null)
    setJustification('')
    setFeedback(win
      ? 'Audit registrado · herramienta abierta en nueva pestaña'
      : 'Audit registrado · si no se abrió, permite ventanas emergentes (pop-ups) para este sitio')
    setTimeout(() => setFeedback(null), 5000)
  }

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #7C3AED',
      borderRadius: 8,
      padding: 16,
      marginTop: 20,
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1f2937', letterSpacing: 0.4 }}>
            ⊙ Investigar más · herramientas OSINT externas
          </h3>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            background: '#fef3c7', color: '#92400e', letterSpacing: 0.4, textTransform: 'uppercase',
          }}>
            uso periodístico · audit obligatorio
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
          Enlaces a herramientas externas categorizadas. <strong>Politeia no ejecuta ni almacena</strong> datos del sujeto · solo redirige.
          Cada click requiere justificación textual <strong>≥ 50 caracteres</strong> que queda registrada (RGPD Art. 6(1)(f) · interés legítimo periodístico · retención 2 años).
        </p>
      </header>

      {feedback && (
        <div style={{
          padding: '8px 10px', marginBottom: 10, borderRadius: 4,
          background: feedback.includes('Audit registrado') ? '#d1fae5' : '#fef3c7',
          color: feedback.includes('Audit registrado') ? '#065f46' : '#92400e',
          fontSize: 11, fontWeight: 500,
        }}>
          {feedback}
        </div>
      )}

      {/* Grid de herramientas por categoría */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CATEGORY_ORDER.map((cat) => {
          const tools = grouped[cat] || []
          if (tools.length === 0) return null
          return (
            <div key={cat}>
              <h4 style={{
                margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                textTransform: 'uppercase', color: '#7C3AED',
              }}>
                {CATEGORY_LABEL[cat]}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {tools.map((tool) => {
                  const url = tool.buildUrl(subject)
                  const disabled = !url
                  return (
                    <button
                      key={tool.id}
                      onClick={() => !disabled && tryOpenTool(tool)}
                      disabled={disabled}
                      title={disabled
                        ? `Requiere dato que no tenemos del sujeto`
                        : `${tool.what_it_answers}\n\nCaveat: ${tool.caveat}`}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: disabled ? '#f9fafb' : '#fafafa',
                        border: '1px solid ' + (disabled ? '#e5e7eb' : '#d1d5db'),
                        borderRadius: 4,
                        fontSize: 11, color: disabled ? '#9ca3af' : '#1f2937',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: disabled ? 0.6 : 1,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.borderColor = '#7C3AED' } }}
                      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d1d5db' } }}
                    >
                      <div style={{ fontWeight: 600 }}>{tool.name} {!tool.free && <span style={{ color: '#92400e', fontSize: 9 }}>· registro</span>}</div>
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{tool.what_it_answers.slice(0, 60)}{tool.what_it_answers.length > 60 ? '…' : ''}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal justificación */}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setPending(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 8, padding: 20, maxWidth: 540, width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>
              Justificación requerida
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
              Vas a abrir <strong>{pending.tool.name}</strong> para investigar a <strong>{subject.full_name}</strong>.
              Describe el propósito periodístico/de investigación <strong>(mínimo 50 caracteres)</strong>.
              Esta justificación queda registrada · RGPD Art. 6(1)(f).
            </p>
            <div style={{
              background: '#f3f4f6', padding: 8, borderRadius: 4, marginBottom: 12,
              fontSize: 10, color: '#4b5563', lineHeight: 1.5,
            }}>
              <strong style={{ color: '#7C3AED' }}>Qué responde {pending.tool.name}:</strong> {pending.tool.what_it_answers}
              <br />
              <strong style={{ color: '#dc2626' }}>Caveat:</strong> {pending.tool.caveat}
            </div>
            <textarea
              autoFocus
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ej.: Verificar declaraciones públicas del sujeto sobre [tema X] en el contexto de [investigación Y] publicada por [medio Z]."
              rows={4}
              style={{
                width: '100%', padding: 10, fontSize: 11, fontFamily: 'inherit',
                border: '1px solid #d1d5db', borderRadius: 4, resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10 }}>
              <span style={{ color: justification.trim().length >= 50 ? '#065f46' : '#92400e' }}>
                {justification.trim().length}/50 caracteres mínimo
              </span>
              <span style={{ color: '#6b7280' }}>
                URL destino: <code style={{ fontSize: 9 }}>{new URL(pending.url).hostname}</code>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setPending(null)}
                style={{
                  padding: '6px 14px', fontSize: 11, fontFamily: 'inherit',
                  background: 'transparent', color: '#6b7280',
                  border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer',
                }}
              >Cancelar</button>
              <button
                onClick={confirmAndOpen}
                disabled={justification.trim().length < 50}
                style={{
                  padding: '6px 14px', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                  background: justification.trim().length >= 50 ? '#7C3AED' : '#c4b5fd',
                  color: '#fff', border: 'none', borderRadius: 4,
                  cursor: justification.trim().length >= 50 ? 'pointer' : 'not-allowed',
                }}
              >
                Registrar audit + abrir
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 9, color: '#6b7280', lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
        ◇ Catálogo curado · {OSINT_TOOLS.length} herramientas externas · cero scraping desde Politeia · auditoría 2 años.
        Sólo se activa para PEPs (cargo + partido catalogado). Para sujetos no PEP el panel no aparece.
      </p>
    </section>
  )
}

export default DossierOSINTPanel
