'use client'
/**
 * <EntityBacklinks /> · backlinks de una entity desde el workspace (Pilar 1+2).
 *
 * Toma `kind+slug` (o entity_id directo) y muestra:
 *   - Investigaciones donde esta entidad está pinned
 *   - Artifacts (notebook_block, hypothesis, evidence...) que la referencian
 *
 * Si la entity no existe todavía en la ontología (404 del backend), el
 * componente se renderiza vacío sin romper. Esto permite añadirlo
 * inmediatamente a /figuras, /partidos, /instituciones sin esperar al
 * backfill.
 *
 * También expone un botón "Fijar a investigación..." que abre un selector
 * para crear/elegir investigación y pinar la entidad ahí.
 */
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { EntityKind } from '@/types/ontology'
import { ARTIFACT_LABEL } from '@/types/investigations'

interface InvestigationRef {
  id: number
  slug: string
  title: string
  status: string
  updated_at: string
  pinned_position: number | null
  pinned_note: string
}

interface ArtifactRef {
  id: number
  investigation_id: number
  investigation_slug: string
  investigation_title: string
  artifact_kind: keyof typeof ARTIFACT_LABEL
  title: string
  updated_at: string
}

interface BacklinksResp {
  entity_id: number
  investigations: InvestigationRef[]
  artifact_refs: ArtifactRef[]
  total_pinned: number
  total_artifact_refs: number
}

interface EntityResp {
  id: number
  kind: EntityKind
  display_name: string
}

export interface EntityBacklinksProps {
  /** Resolver la entidad por kind+slug (típicamente desde el catálogo del componente padre) */
  kind?: EntityKind
  slug?: string
  /** Alternativamente, pasar el entity_id directo si ya se conoce */
  entityId?: number
  /** Nombre humano para mostrar en el modal de pin (fallback si no hay entity todavía) */
  fallbackName?: string
  /** Estilo compacto (1 línea con count) vs full (lista completa). Default 'full'. */
  variant?: 'full' | 'compact'
  /** Sin cabecera con título · útil cuando ya está dentro de una sección con título */
  hideTitle?: boolean
}

export default function EntityBacklinks({
  kind, slug, entityId, fallbackName,
  variant = 'full', hideTitle = false,
}: EntityBacklinksProps) {
  const [entity, setEntity] = useState<EntityResp | null>(null)
  const [backlinks, setBacklinks] = useState<BacklinksResp | null>(null)
  const [pinningOpen, setPinningOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      let id = entityId ?? null
      if (!id && kind && slug) {
        const r = await fetch(`/api/entities/by-slug/${kind}/${encodeURIComponent(slug)}`)
        if (r.status === 404) { setNotFound(true); setLoading(false); return }
        if (!r.ok) throw new Error(`${r.status}`)
        const ent = (await r.json()) as EntityResp
        setEntity(ent)
        id = ent.id
      } else if (id) {
        const r = await fetch(`/api/entities/${id}`)
        if (r.ok) setEntity((await r.json()) as EntityResp)
      }
      if (!id) { setNotFound(true); setLoading(false); return }

      const r2 = await fetch(`/api/entities/${id}/backlinks`)
      if (r2.ok) {
        setBacklinks((await r2.json()) as BacklinksResp)
      }
    } catch {
      // En modo silent · backend down o entity no migrada → no rompemos la ficha
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [kind, slug, entityId])

  useEffect(() => { void load() }, [load])

  // Si la entity no existe todavía en la ontología, no renderizamos nada
  // (el catálogo curado aparecerá completo en producción cuando se ejecute backfill).
  if (notFound) return null

  if (loading) {
    return variant === 'compact' ? null : (
      <div style={{
        padding: 14, border: '1px dashed var(--color-hairline)',
        borderRadius: 12, fontSize: 11, color: 'var(--color-ink-5)',
      }}>Buscando referencias en el workspace…</div>
    )
  }

  if (!backlinks) return null

  const total = backlinks.total_pinned + backlinks.total_artifact_refs

  if (variant === 'compact') {
    if (total === 0) return null
    return (
      <span style={{ fontSize: 11, color: 'var(--color-accent-text)' }}>
        Aparece en {total} {total === 1 ? 'sitio' : 'sitios'} de tu workspace
      </span>
    )
  }

  return (
    <section style={{
      padding: 14,
      background: 'var(--color-surface, #fff)',
      border: '1px solid var(--color-hairline, #ECECEF)',
      borderRadius: 12,
    }}>
      {!hideTitle && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <p style={{
            margin: 0, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--color-ink-4, #6e6e73)',
          }}>
            En tu workspace · {total} referencia{total === 1 ? '' : 's'}
          </p>
          {entity && (
            <button onClick={() => setPinningOpen(true)} style={{
              fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 6,
              background: 'var(--color-surface-raised, #f5f5f7)',
              border: '1px solid var(--color-hairline, #ECECEF)',
              color: 'var(--color-ink-2, #3a3a3d)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Fijar a investigación…
            </button>
          )}
        </div>
      )}

      {total === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-ink-5, #aeaeb2)', lineHeight: 1.5 }}>
          Aún no la has citado en ninguna investigación.
          {entity && ' Usa "Fijar a investigación..." o Cmd+P dentro de un caso para empezar.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {backlinks.investigations.map((inv) => (
            <Link key={`inv-${inv.id}`} href={`/investigations/${inv.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--color-bg, #fbfbfd)',
              border: '1px solid var(--color-hairline-soft, #ECECEF)',
              textDecoration: 'none',
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(31,78,140,0.10)', color: '#1F4E8C',
              }}>
                PIN
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink, #1d1d1f)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inv.title}
                </div>
                {inv.pinned_note && (
                  <div style={{ fontSize: 10.5, color: 'var(--color-ink-5, #aeaeb2)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.pinned_note}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-ink-5, #aeaeb2)' }}>
                {new Date(inv.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            </Link>
          ))}

          {backlinks.artifact_refs.map((art) => (
            <Link
              key={`art-${art.id}`}
              href={`/investigations/${art.investigation_id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--color-bg, #fbfbfd)',
                border: '1px solid var(--color-hairline-soft, #ECECEF)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(15,118,110,0.10)', color: '#0F766E',
              }}>
                {(ARTIFACT_LABEL[art.artifact_kind] || art.artifact_kind).slice(0, 4).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink, #1d1d1f)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {art.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-ink-5, #aeaeb2)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  en {art.investigation_title}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-ink-5, #aeaeb2)' }}>
                {new Date(art.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            </Link>
          ))}
        </div>
      )}

      {pinningOpen && entity && (
        <PinToInvestigationModal
          entityId={entity.id}
          entityName={entity.display_name}
          onClose={() => setPinningOpen(false)}
          onPinned={() => { setPinningOpen(false); void load() }}
        />
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Modal · fijar la entidad a una investigación nueva o existente
// ─────────────────────────────────────────────────────────────────

interface InvSummary { id: number; slug: string; title: string; status: string; updated_at: string }

function PinToInvestigationModal({
  entityId, entityName, onClose, onPinned,
}: {
  entityId: number
  entityName: string
  onClose: () => void
  onPinned: () => void
}) {
  const [investigations, setInvestigations] = useState<InvSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const uid = typeof window !== 'undefined'
          ? (window.localStorage.getItem('politeia.user_id') || 'demo')
          : 'demo'
        const r = await fetch('/api/investigations', {
          headers: { 'X-User-Id': uid },
        })
        if (r.ok) setInvestigations(await r.json())
      } finally { setLoading(false) }
    })()
  }, [])

  async function pinTo(invId: number) {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const uid = window.localStorage.getItem('politeia.user_id') || 'demo'
      const r = await fetch(`/api/investigations/${invId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({ entity_id: entityId }),
      })
      if (!r.ok) throw new Error(`${r.status}`)
      onPinned()
    } catch (e) {
      setError(String(e).slice(0, 200))
    } finally { setBusy(false) }
  }

  async function createAndPin() {
    if (!newTitle.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const uid = window.localStorage.getItem('politeia.user_id') || 'demo'
      const r = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({ title: newTitle.trim(), owner_id: uid, status: 'active' }),
      })
      if (!r.ok) throw new Error(`${r.status}`)
      const inv = await r.json() as { id: number }
      await pinTo(inv.id)
    } catch (e) {
      setError(String(e).slice(0, 200))
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', paddingTop: '12vh',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
        padding: 22, boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
        maxHeight: '72vh', overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Fijar «{entityName}» a una investigación
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6e6e73' }}>
          Elige una investigación activa o crea una nueva con esta entidad ya pinneada.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); void createAndPin() }}
              style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Crear nueva investigación con este título…"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid #ECECEF', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button type="submit" disabled={!newTitle.trim() || busy} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: '#1F4E8C', color: '#fff', fontSize: 12.5, fontWeight: 600,
            cursor: !newTitle.trim() || busy ? 'not-allowed' : 'pointer',
            opacity: !newTitle.trim() || busy ? 0.5 : 1, fontFamily: 'inherit',
          }}>{busy ? '…' : 'Crear + fijar'}</button>
        </form>

        {error && (
          <div style={{
            padding: 10, marginBottom: 12, fontSize: 11,
            background: 'rgba(196,44,44,0.08)', color: '#c42c2c', borderRadius: 6,
          }}>{error}</div>
        )}

        {loading ? (
          <p style={{ margin: 0, fontSize: 12, color: '#aeaeb2' }}>Cargando…</p>
        ) : investigations.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#aeaeb2' }}>
            Aún no tienes investigaciones · usa el cuadro de arriba para crear la primera.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0,
                       display: 'flex', flexDirection: 'column', gap: 6 }}>
            {investigations.map((inv) => (
              <li key={inv.id}>
                <button
                  onClick={() => void pinTo(inv.id)}
                  disabled={busy}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    background: '#fbfbfd', border: '1px solid #ECECEF',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                    {inv.title}
                  </span>
                  <span style={{ fontSize: 10, color: '#aeaeb2', textTransform: 'uppercase' }}>{inv.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} style={{
            padding: '6px 14px', borderRadius: 6,
            background: 'transparent', border: '1px solid #ECECEF',
            fontSize: 12, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
