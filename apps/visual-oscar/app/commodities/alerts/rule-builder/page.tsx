'use client'
/**
 * /commodities/alerts/rule-builder · constructor visual de reglas
 * multi-condición. Permite crear alertas tipo:
 *   "trigo sube ≥5% Y maíz cae ≥3% al mismo tiempo"
 *
 * UX:
 *   - Lista vertical de condiciones (max 8)
 *   - Cada condición: select commodity + select operador + input valor
 *   - Reorder con flechas ↑↓ (sin libs externas)
 *   - Toggle AND/OR
 *   - Preview JSON live + envío POST al backend
 *   - Vuelve a /commodities/alerts al guardar
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommodityCatalog } from '@/hooks/useCommodities'

type Operator =
  | 'price_gt'
  | 'price_lt'
  | 'change_pct_gte'
  | 'change_pct_lte'
  | 'rsi_gt'
  | 'rsi_lt'

interface Condition {
  slug: string
  op: Operator
  value: number
  period_days?: number
}

const OPERATORS: { value: Operator; label: string; hint: string }[] = [
  { value: 'price_gt', label: 'Precio >', hint: 'precio absoluto supera el umbral' },
  { value: 'price_lt', label: 'Precio <', hint: 'precio absoluto cae bajo umbral' },
  { value: 'change_pct_gte', label: 'Var. % ≥', hint: 'subida diaria ≥ X% (X positivo)' },
  { value: 'change_pct_lte', label: 'Var. % ≤', hint: 'caída diaria ≤ X% (X negativo)' },
  { value: 'rsi_gt', label: 'RSI(14) >', hint: 'sobrecomprado · típico 70' },
  { value: 'rsi_lt', label: 'RSI(14) <', hint: 'sobrevendido · típico 30' },
]

const DEFAULT_USER_ID = 'anon@politeia.local'

export default function RuleBuilderPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { items: catalog } = useCommodityCatalog()
  const [ruleName, setRuleName] = useState('Spread divergente')
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [channels, setChannels] = useState<('inapp' | 'email' | 'push')[]>(['inapp'])
  const [cooldownMinutes, setCooldownMinutes] = useState(60)
  const [adaptiveCooldown, setAdaptiveCooldown] = useState(true)
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Seed inicial · 2 condiciones de ejemplo
  useEffect(() => {
    if (conditions.length === 0 && catalog.length >= 2) {
      setConditions([
        { slug: catalog[0].slug, op: 'change_pct_gte', value: 5 },
        { slug: catalog[1].slug, op: 'change_pct_lte', value: -3 },
      ])
    }
  }, [catalog, conditions.length])

  const addCondition = () => {
    if (conditions.length >= 8) return
    const defaultSlug = catalog[0]?.slug ?? ''
    setConditions((prev) => [...prev, { slug: defaultSlug, op: 'change_pct_gte', value: 5 }])
  }

  const removeCondition = (i: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updateCondition = (i: number, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  const moveCondition = (from: number, to: number) => {
    setConditions((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  const ruleDefinition = useMemo(
    () => ({
      logic,
      conditions: conditions.map((c) => ({
        slug: c.slug,
        op: c.op,
        value: Number(c.value),
        ...(c.period_days ? { period_days: c.period_days } : {}),
      })),
    }),
    [logic, conditions],
  )

  const canSave = conditions.length > 0 && ruleName.trim().length > 0 && userId.trim().length > 0

  const save = async () => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const body = {
        user_id: userId,
        rule_name: ruleName,
        rule_definition: ruleDefinition,
        channels,
        cooldown_minutes: cooldownMinutes,
        active: true,
        metadata: { adaptive_cooldown: adaptiveCooldown },
      }
      const r = await fetch('/api/commodities/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok || data.error) {
        setError(data.error ?? `status ${r.status}`)
        setBusy(false)
        return
      }
      setSuccess(`Regla creada: ${data.id}`)
      setTimeout(() => router.push('/commodities/alerts'), 800)
    } catch (e) {
      setError(String(e))
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities/alerts" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver a alertas
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          RuleBuilder · alertas multi-condición
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Construye reglas compuestas (hasta 8 condiciones). Cooldown adaptativo
          ajusta automáticamente según volatilidad histórica del commodity más
          volátil de la regla.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 16,
          }}
        >
          {/* Editor */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Nombre de la regla"
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                }}
              />
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Email usuario (para notificaciones)"
                style={{
                  width: 240,
                  padding: '8px 12px',
                  fontSize: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Lógica:</span>
              {(['AND', 'OR'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLogic(l)}
                  style={{
                    padding: '4px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: logic === l ? '#7c3aed' : '#fff',
                    color: logic === l ? '#fff' : '#374151',
                    border: '1px solid',
                    borderColor: logic === l ? '#7c3aed' : '#e5e7eb',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>
                {logic === 'AND'
                  ? 'Todas las condiciones deben cumplirse'
                  : 'Basta con una condición cumplida'}
              </span>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '12px 0 8px' }}>
              Condiciones ({conditions.length}/8)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conditions.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 160px 100px 28px',
                    gap: 6,
                    alignItems: 'center',
                    padding: 8,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => moveCondition(i, i - 1)}
                      disabled={i === 0}
                      style={{
                        ...arrowBtn,
                        opacity: i === 0 ? 0.3 : 1,
                      }}
                      aria-label="Mover arriba"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCondition(i, i + 1)}
                      disabled={i === conditions.length - 1}
                      style={{
                        ...arrowBtn,
                        opacity: i === conditions.length - 1 ? 0.3 : 1,
                      }}
                      aria-label="Mover abajo"
                    >
                      ↓
                    </button>
                  </div>
                  <select
                    value={c.slug}
                    onChange={(e) => updateCondition(i, { slug: e.target.value })}
                    style={inputSm}
                  >
                    {catalog.map((cm) => (
                      <option key={cm.slug} value={cm.slug}>
                        {cm.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={c.op}
                    onChange={(e) => updateCondition(i, { op: e.target.value as Operator })}
                    style={inputSm}
                    title={OPERATORS.find((o) => o.value === c.op)?.hint ?? ''}
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={c.value}
                    onChange={(e) => updateCondition(i, { value: Number(e.target.value) })}
                    style={inputSm}
                  />
                  <button
                    onClick={() => removeCondition(i)}
                    aria-label="Quitar condición"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: '#dc2626',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addCondition}
              disabled={conditions.length >= 8}
              style={{
                marginTop: 12,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: '#fff',
                border: '1px dashed #9ca3af',
                borderRadius: 6,
                cursor: conditions.length >= 8 ? 'not-allowed' : 'pointer',
                opacity: conditions.length >= 8 ? 0.5 : 1,
              }}
            >
              + Añadir condición {conditions.length >= 8 ? '(máx alcanzado)' : ''}
            </button>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 8px' }}>
              Notificaciones
            </h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {(['inapp', 'email', 'push'] as const).map((ch) => (
                <label key={ch} style={{ display: 'flex', gap: 4, fontSize: 12, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={channels.includes(ch)}
                    onChange={(e) =>
                      setChannels((prev) =>
                        e.target.checked ? [...prev, ch] : prev.filter((c) => c !== ch),
                      )
                    }
                  />
                  {ch}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                Cooldown base (min):
              </label>
              <input
                type="number"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                min={5}
                max={1440}
                style={{ ...inputSm, width: 80 }}
              />
              <label
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: '#374151',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <input
                  type="checkbox"
                  checked={adaptiveCooldown}
                  onChange={(e) => setAdaptiveCooldown(e.target.checked)}
                />
                Cooldown adaptativo según volatilidad
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={save}
                disabled={!canSave || busy}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  background: !canSave || busy ? '#9ca3af' : '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !canSave || busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Guardando…' : '💾 Crear regla'}
              </button>
              <Link
                href="/commodities/alerts"
                style={{
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  color: '#374151',
                  textDecoration: 'none',
                }}
              >
                Cancelar
              </Link>
            </div>
            {error ? (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>⚠ {error}</p>
            ) : null}
            {success ? (
              <p style={{ fontSize: 12, color: '#16a34a', marginTop: 10 }}>✓ {success}</p>
            ) : null}
          </div>

          {/* Preview */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Panel title="Preview · texto humano">
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                Esta alerta disparará cuando{' '}
                {logic === 'AND' ? 'TODAS' : 'AL MENOS UNA'} de las siguientes condiciones se cumpla:
              </p>
              <ul style={{ paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                {conditions.map((c, i) => {
                  const meta = catalog.find((cm) => cm.slug === c.slug)
                  const op = OPERATORS.find((o) => o.value === c.op)
                  return (
                    <li key={i}>
                      <strong>{meta?.name ?? c.slug}</strong> · {op?.label ?? c.op}{' '}
                      <strong>{c.value}</strong>
                    </li>
                  )
                })}
              </ul>
            </Panel>

            <Panel title="Preview · JSON rule_definition">
              <pre
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, 'Cascadia Code', monospace",
                  fontSize: 10.5,
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: 12,
                  borderRadius: 6,
                  overflow: 'auto',
                  maxHeight: 280,
                }}
              >
                {JSON.stringify(ruleDefinition, null, 2)}
              </pre>
            </Panel>

            <Panel title="Cómo se evaluará">
              <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                · Cron del backend evalúa cada 15 min<br />
                · Snapshots pre-warmed por slug (cache 5 min)<br />
                · Cooldown {cooldownMinutes}min · {adaptiveCooldown ? 'ajustado por σ histórica' : 'fijo'}<br />
                · Push SSE en tiempo real cuando dispare<br />
                · Email vía Resend si configurado
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{title}</h3>
      {children}
    </div>
  )
}

const inputSm: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  background: '#fff',
  width: '100%',
}

const arrowBtn: React.CSSProperties = {
  width: 22,
  height: 18,
  fontSize: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  borderRadius: 3,
  cursor: 'pointer',
  padding: 0,
}
