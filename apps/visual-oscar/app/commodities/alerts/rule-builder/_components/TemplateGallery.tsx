'use client'
/**
 * TemplateGallery · galería de templates predefinidos para reglas.
 *
 * Llama a:
 *   GET  /api/commodities/alerts/rule-templates           · lista
 *   POST /api/commodities/alerts/rule-templates/apply     · materializa
 *
 * Cuando el usuario rellena slots/params y pulsa Aplicar, recibe el
 * rule_definition listo y llama `onApply(rule_definition, suggested_name)`
 * para que el RuleBuilder cargue la regla en el editor.
 */
import { useEffect, useMemo, useState } from 'react'

interface SlotMeta {
  key: string
  label: string
  hint?: string
  suggested_categories?: string[]
}

interface ParamMeta {
  key: string
  label: string
  default: number
  min: number
  max: number
  step: number
  unit?: string
}

interface TemplateMeta {
  id: string
  name: string
  description: string
  rationale?: string
  suggested_period_days?: number
  slots: SlotMeta[]
  params: ParamMeta[]
}

interface RuleCondition {
  slug: string
  op: string
  value: number
  period_days?: number
}

interface RuleDefinition {
  logic: 'AND' | 'OR'
  conditions: RuleCondition[]
}

interface Props {
  catalog: { slug: string; name: string; category?: string }[]
  onApply: (rd: RuleDefinition, suggestedName: string) => void
}

export function TemplateGallery({ catalog, onApply }: Props) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, string>>({})
  const [params, setParams] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/commodities/alerts/rule-templates')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setTemplates(d.items ?? [])
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  )

  // Cuando se elige un template, inicializar slots/params con defaults
  useEffect(() => {
    if (!selected) return
    const initSlots: Record<string, string> = {}
    selected.slots.forEach((s) => {
      // Primera sugerencia · filtrar por categoría si el slot lo pide
      let candidate: typeof catalog[number] | undefined
      if (s.suggested_categories?.length && catalog.length) {
        candidate = catalog.find((c) =>
          c.category ? s.suggested_categories?.includes(c.category) : false,
        )
      }
      initSlots[s.key] = (candidate ?? catalog[0])?.slug ?? ''
    })
    setSlots(initSlots)
    const initParams: Record<string, number> = {}
    selected.params.forEach((p) => {
      initParams[p.key] = p.default
    })
    setParams(initParams)
    setError(null)
  }, [selected, catalog])

  const apply = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/commodities/alerts/rule-templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selected.id,
          slots,
          params,
        }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) {
        setError(data?.detail || data?.error || `status ${r.status}`)
        setBusy(false)
        return
      }
      onApply(data.rule_definition as RuleDefinition, data.rule_name as string)
      setBusy(false)
    } catch (e) {
      setError(String(e))
      setBusy(false)
    }
  }

  if (loading) {
    return <p style={{ fontSize: 12, color: '#9ca3af', padding: 12 }}>Cargando templates…</p>
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>
          Templates de reglas
        </h3>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {templates.length} recetas predefinidas
        </span>
      </div>
      <p style={{ fontSize: 11.5, color: '#6b7280', margin: '0 0 10px' }}>
        Empieza con un patrón validado (contango, RSI, correlación rota…) y
        luego ajusta los detalles en el editor de abajo.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {templates.map((t) => {
          const active = selectedId === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                border: active ? '1.5px solid #1e40af' : '1px solid #e5e7eb',
                borderRadius: 8,
                background: active ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{t.name}</div>
              <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 3, lineHeight: 1.3 }}>
                {t.description.slice(0, 80)}
                {t.description.length > 80 ? '…' : ''}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fafafa',
          }}
        >
          {selected.rationale && (
            <p style={{ fontSize: 11.5, color: '#374151', margin: '0 0 10px', lineHeight: 1.5 }}>
              <strong>Por qué:</strong> {selected.rationale}
            </p>
          )}

          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            {selected.slots.map((s) => (
              <label key={s.key} style={lbl}>
                <span style={lblText}>{s.label}</span>
                <select
                  value={slots[s.key] || ''}
                  onChange={(e) => setSlots((p) => ({ ...p, [s.key]: e.target.value }))}
                  style={input}
                >
                  {catalog.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} · {c.slug}
                    </option>
                  ))}
                </select>
                {s.hint && <span style={hintText}>{s.hint}</span>}
              </label>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {selected.params.map((p) => (
              <label key={p.key} style={lbl}>
                <span style={lblText}>
                  {p.label}
                  {p.unit && <span style={{ color: '#9ca3af' }}> ({p.unit})</span>}
                </span>
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={params[p.key] ?? p.default}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                  }
                  style={input}
                />
                <span style={hintText}>
                  rango [{p.min}, {p.max}]
                </span>
              </label>
            ))}
          </div>

          {error && (
            <div
              style={{
                fontSize: 11.5,
                color: '#991b1b',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '6px 10px',
                borderRadius: 6,
                marginBottom: 10,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={apply}
            disabled={busy}
            style={{
              padding: '8px 16px',
              background: busy ? '#9ca3af' : '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Aplicando…' : `Aplicar template`}
          </button>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3 }
const lblText: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#374151' }
const hintText: React.CSSProperties = { fontSize: 10.5, color: '#9ca3af' }
const input: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#fff',
  fontFamily: 'inherit',
}
