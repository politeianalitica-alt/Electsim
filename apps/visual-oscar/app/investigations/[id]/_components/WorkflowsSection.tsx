'use client'
/**
 * <WorkflowsSection /> · sección colapsable dentro del BrainCopilotPanel.
 *
 * Muestra las recipes del workflow registry y permite ejecutarlas con
 * inputs prellenados desde el contexto de la investigación activa:
 *
 *   - title de la investigación → topic / event_description
 *   - description → context / context_notes
 *   - primer actor_person pinneado → target_actor / affected_actor
 *   - 2+ party pinneados → proposed_coalition (slugs)
 *   - todos los pinned → entity_refs
 *
 * Cuando el analista pulsa una recipe se expande un mini-form con los
 * `inputs_schema` declarados; al enviar, se ejecuta vía workflowsApi.run
 * y el resultado se entrega vía `onResult(...)` para que el panel padre
 * lo añada a la conversation feed.
 */
import { useEffect, useState } from 'react'
import { workflowsApi } from '@/lib/api/workflows'
import type {
  WorkflowSummary, WorkflowResult, RunWorkflowRequest,
} from '@/types/workflows'
import { CATEGORY_LABEL, CATEGORY_COLOR } from '@/types/workflows'
import type { InvestigationDetail } from '@/types/investigations'
import type { EntitySummary } from '@/types/ontology'

export function WorkflowsSection({
  detail, busy, onPending, onResult, onError,
}: {
  detail: InvestigationDetail | null
  busy: boolean
  onPending: (slug: string, inputs: Record<string, unknown>) => string
  onResult: (entryId: string, result: WorkflowResult) => void
  onError: (entryId: string, error: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [recipes, setRecipes] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || recipes.length > 0) return
    setLoading(true)
    void workflowsApi.list()
      .then(setRecipes)
      .catch((e) => setError(String(e).slice(0, 160)))
      .finally(() => setLoading(false))
  }, [open, recipes.length])

  // Auto-prefill cuando se selecciona una recipe
  useEffect(() => {
    if (!activeSlug) return
    const recipe = recipes.find(r => r.slug === activeSlug)
    if (!recipe) return
    setInputs(prefillFromContext(recipe, detail))
  }, [activeSlug, recipes, detail])

  async function onRun(recipe: WorkflowSummary) {
    if (running || !detail) return
    setRunning(true); setError(null)
    const body: RunWorkflowRequest = {
      inputs: parseInputs(inputs, recipe),
      investigation_id: detail.id,
      pinned_entity_ids: detail.pinned.map(p => p.entity_id),
    }
    const entryId = onPending(recipe.slug, body.inputs)
    try {
      const result = await workflowsApi.run(recipe.slug, body)
      onResult(entryId, result)
      setActiveSlug(null)
    } catch (e) {
      const msg = String(e).slice(0, 200)
      onError(entryId, msg)
      setError(msg)
    } finally {
      setRunning(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={triggerStyle(busy)}
        disabled={busy}
      >
        <span>▶</span>
        <span>Workflows · recetas multi-paso del brain</span>
      </button>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--color-hairline, #ECECEF)',
      borderRadius: 10,
      background: 'var(--color-surface, #fff)',
    }}>
      <button
        onClick={() => setOpen(false)}
        style={{ ...triggerStyle(false), borderRadius: '10px 10px 0 0', borderBottom: '1px solid var(--color-hairline-soft, #ECECEF)' }}
      >
        <span>▼</span>
        <span>Workflows · {recipes.length || '…'} recipes</span>
      </button>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-ink-5, #aeaeb2)' }}>Cargando recipes…</p>
        )}
        {error && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-danger, #c42c2c)' }}>{error}</p>
        )}
        {!loading && recipes.map((r) => {
          const isActive = r.slug === activeSlug
          return (
            <div key={r.slug}>
              <button
                onClick={() => setActiveSlug(isActive ? null : r.slug)}
                disabled={busy && !isActive}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isActive
                    ? 'var(--color-surface-raised, #f5f5f7)'
                    : 'var(--color-bg, #fbfbfd)',
                  border: '1px solid var(--color-hairline-soft, #ECECEF)',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  opacity: busy && !isActive ? 0.5 : 1,
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                  padding: '2px 6px', borderRadius: 4, color: '#fff',
                  background: CATEGORY_COLOR[r.category],
                  textTransform: 'uppercase', flexShrink: 0, marginTop: 1,
                }}>
                  {CATEGORY_LABEL[r.category]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink, #1d1d1f)' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--color-ink-4, #6e6e73)', lineHeight: 1.35, marginTop: 2 }}>
                    {r.description}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--color-ink-5, #aeaeb2)', marginTop: 4 }}>
                    {r.step_count} pasos · tools: {r.tools_used.slice(0, 3).join(', ')}
                    {r.tools_used.length > 3 && ` +${r.tools_used.length - 3}`}
                  </div>
                </div>
              </button>

              {isActive && (
                <div style={{
                  marginTop: 6, marginLeft: 4, marginRight: 4,
                  padding: 10, borderRadius: 8,
                  background: 'var(--color-surface-raised, #f5f5f7)',
                  border: '1px solid var(--color-hairline-soft, #ECECEF)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {Object.entries(r.inputs_schema).map(([key, hint]) => {
                    const value = inputs[key] ?? ''
                    const isLong = hint.length > 60 || key.includes('context') || key.includes('description')
                    return (
                      <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-ink-3, #515154)',
                                       letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {key}
                        </span>
                        {isLong ? (
                          <textarea
                            value={value}
                            onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                            placeholder={hint}
                            disabled={running}
                            rows={3}
                            style={inputStyle(running)}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                            placeholder={hint}
                            disabled={running}
                            style={inputStyle(running)}
                          />
                        )}
                      </label>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                    <button
                      onClick={() => setActiveSlug(null)}
                      style={ghostBtn()}
                      disabled={running}
                    >Cancelar</button>
                    <button
                      onClick={() => void onRun(r)}
                      disabled={running || !detail}
                      style={primaryBtn(running)}
                    >
                      {running ? 'Ejecutando…' : 'Ejecutar workflow'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Auto-prefill desde el contexto de la investigación
// ─────────────────────────────────────────────────────────────────

function prefillFromContext(
  recipe: WorkflowSummary,
  detail: InvestigationDetail | null,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!detail) return out

  // Recolectar pinned entities por kind
  const persons = detail.pinned
    .filter(p => p.entity?.kind === 'actor_person')
    .map(p => p.entity!) as EntitySummary[]
  const parties = detail.pinned
    .filter(p => p.entity?.kind === 'party')
    .map(p => p.entity!) as EntitySummary[]
  const sectors = detail.pinned
    .filter(p => p.entity?.kind === 'sector')
    .map(p => p.entity!) as EntitySummary[]

  for (const key of Object.keys(recipe.inputs_schema)) {
    const k = key.toLowerCase()
    if ((k.includes('topic') || k.includes('description') || k.includes('event')) && detail.title) {
      out[key] = detail.title
      continue
    }
    if ((k.includes('context') || k === 'context_notes' || k === 'known_facts') && detail.description) {
      out[key] = detail.description
      continue
    }
    if ((k === 'target_actor' || k === 'affected_actor') && persons.length > 0) {
      out[key] = persons[0].display_name
      continue
    }
    if (k === 'client_position') {
      out[key] = 'oposición · analista neutral'
      continue
    }
    if (k === 'sector' && sectors.length > 0) {
      out[key] = sectors[0].slug
      continue
    }
    if (k === 'proposed_coalition' && parties.length >= 2) {
      out[key] = parties.map(p => p.slug).join(', ')
      continue
    }
    if (k === 'seats_by_party' && parties.length > 0) {
      // Stub razonable · el analista lo afina antes de ejecutar
      const defaults: Record<string, number> = {
        psoe: 121, pp: 137, vox: 33, sumar: 31, junts: 7, erc: 7,
        bildu: 6, pnv: 5, bng: 1, cc: 1, upn: 1, psc: 0,
      }
      const obj: Record<string, number> = {}
      for (const p of parties) obj[p.slug] = defaults[p.slug] ?? 0
      out[key] = JSON.stringify(obj)
      continue
    }
    if (k === 'chamber') {
      out[key] = 'congreso'
      continue
    }
    if (k === 'sectors_at_risk' && sectors.length > 0) {
      out[key] = sectors.map(s => s.slug).join(', ')
      continue
    }
    out[key] = ''
  }
  return out
}

function parseInputs(inputs: Record<string, string>, recipe: WorkflowSummary): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(inputs)) {
    const trimmed = (raw ?? '').trim()
    if (!trimmed) continue
    // Heurísticas de tipo según el nombre
    const k = key.toLowerCase()
    if (k === 'proposed_coalition' || k === 'sectors_at_risk' ||
        k === 'baseline_pieces' || k === 'recent_pieces') {
      // Lista coma-separada
      out[key] = trimmed.split(',').map(s => s.trim()).filter(Boolean)
      continue
    }
    if (k === 'seats_by_party') {
      // Intento de JSON parse · si falla, lo dejamos como string
      try { out[key] = JSON.parse(trimmed) } catch { out[key] = trimmed }
      continue
    }
    out[key] = trimmed
  }
  return out
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────

function triggerStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    background: 'var(--color-surface-raised, #f5f5f7)',
    border: '1px solid var(--color-hairline, #ECECEF)',
    borderRadius: 10,
    color: 'var(--color-ink-2, #3a3a3d)',
    fontSize: 11.5, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit', textAlign: 'left',
  }
}

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '6px 8px',
    border: '1px solid var(--color-hairline, #ECECEF)',
    borderRadius: 6,
    background: disabled ? 'var(--color-surface-sunken, #e8e8ed)' : 'var(--color-bg, #fbfbfd)',
    fontSize: 11.5, fontFamily: 'inherit',
    color: 'var(--color-ink, #1d1d1f)',
    outline: 'none', resize: 'vertical',
  }
}

function primaryBtn(running: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 6, border: 'none',
    background: 'var(--color-accent, #0071e3)', color: '#fff',
    fontSize: 11.5, fontWeight: 600,
    cursor: running ? 'not-allowed' : 'pointer',
    opacity: running ? 0.5 : 1, fontFamily: 'inherit',
  }
}

function ghostBtn(): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 6,
    background: 'transparent',
    border: '1px solid var(--color-hairline, #ECECEF)',
    color: 'var(--color-ink-4, #6e6e73)', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
