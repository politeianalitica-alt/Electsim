'use client'
/**
 * /commodities/recipe-cost · Recipe Cost Calculator (Vesper)
 *
 * Permite construir una receta (ingredientes + cantidades) y calcular
 * coste real con precios live + análisis de sensibilidad tornado.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommodityCatalog, useRecipes } from '@/hooks/useCommodities'
import type {
  Commodity,
  RecipeCostResponse,
  RecipeIngredient,
  RecipeSensitivityResponse,
} from '@/types/commodities'

interface IngredientRow extends RecipeIngredient {
  unit_price?: number
}

export default function RecipeCostPage() {
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { items: catalog } = useCommodityCatalog()
  const { items: savedRecipes } = useRecipes()
  const initialSlug = search?.get('slug') ?? null

  const [recipeName, setRecipeName] = useState('Mi receta personalizada')
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    if (initialSlug) {
      return [{ slug: initialSlug, name: initialSlug, quantity: 1, unit: 'ton', unit_price: undefined }]
    }
    return []
  })
  const [costResult, setCostResult] = useState<RecipeCostResponse | null>(null)
  const [sensResult, setSensResult] = useState<RecipeSensitivityResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const catalogMap = useMemo(() => {
    const m = new Map<string, Commodity>()
    catalog.forEach((c) => m.set(c.slug, c))
    return m
  }, [catalog])

  const addIngredient = (slug?: string) => {
    const target = slug ?? catalog[0]?.slug ?? ''
    if (!target) return
    const meta = catalogMap.get(target)
    setIngredients((prev) => [
      ...prev,
      {
        slug: target,
        name: meta?.name ?? target,
        quantity: 1,
        unit: meta?.unit?.split('/').pop() ?? 'ton',
      },
    ])
  }

  const updateIngredient = (i: number, patch: Partial<IngredientRow>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)))
  }

  const removeIngredient = (i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  const loadRecipe = async (slug: string) => {
    try {
      const r = await fetch(`/api/commodities/recipes/${slug}`)
      if (!r.ok) return
      const data = await r.json()
      if (Array.isArray(data.ingredients)) {
        setRecipeName(data.name ?? slug)
        setIngredients(
          data.ingredients.map((ing: any) => ({
            slug: ing.slug,
            name: ing.name ?? ing.slug,
            quantity: Number(ing.quantity ?? 0),
            unit: ing.unit ?? 'ton',
          })),
        )
      }
    } catch (e) {
      console.error(e)
    }
  }

  const calculate = async () => {
    if (!ingredients.length) return
    setBusy(true)
    setCostResult(null)
    setSensResult(null)
    try {
      const prices: Record<string, number> = {}
      ingredients.forEach((i) => {
        if (i.unit_price != null && !Number.isNaN(i.unit_price)) prices[i.slug] = i.unit_price
      })
      const usePrices = Object.keys(prices).length > 0 ? prices : null

      const body = {
        ingredients: ingredients.map((i) => ({
          slug: i.slug, name: i.name, quantity: i.quantity, unit: i.unit,
        })),
        prices: usePrices,
      }
      const costRes = await fetch('/api/commodities/recipe-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const cost: RecipeCostResponse = await costRes.json()
      setCostResult(cost)

      // Sensibilidad sólo si tenemos precios completos
      const resolvedPrices: Record<string, number> = { ...prices }
      cost.breakdown.forEach((b) => {
        if (b.unit_price != null && resolvedPrices[b.slug] == null) {
          resolvedPrices[b.slug] = b.unit_price
        }
      })
      if (Object.keys(resolvedPrices).length === ingredients.length && ingredients.length > 0) {
        const sensRes = await fetch('/api/commodities/recipe-sensitivity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: ingredients.map((i) => ({
              slug: i.slug, name: i.name, quantity: i.quantity, unit: i.unit,
            })),
            prices: resolvedPrices,
            shock_pct: 10,
          }),
        })
        const sens: RecipeSensitivityResponse = await sensRes.json()
        setSensResult(sens)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Calculadora de Coste de Producto
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Compón una receta con commodities del catálogo y calcula el coste por unidad
          con precios live o manuales. Análisis de sensibilidad ±10% incluido.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 16,
          }}
        >
          {/* Editor de receta */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <input
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
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
              <select
                onChange={(e) => {
                  if (e.target.value) loadRecipe(e.target.value)
                }}
                defaultValue=""
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: '#fff',
                }}
              >
                <option value="">⊞ Cargar receta del seed…</option>
                {savedRecipes.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={th}>Commodity</th>
                  <th style={th}>Cantidad</th>
                  <th style={th}>Unidad</th>
                  <th style={th}>Precio manual (opcional)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>
                      <select
                        value={ing.slug}
                        onChange={(e) => {
                          const meta = catalogMap.get(e.target.value)
                          updateIngredient(i, {
                            slug: e.target.value,
                            name: meta?.name ?? e.target.value,
                          })
                        }}
                        style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, minWidth: 200 }}
                      >
                        {catalog.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={ing.quantity}
                        step="0.001"
                        onChange={(e) => updateIngredient(i, { quantity: Number(e.target.value) })}
                        style={inputSm}
                      />
                    </td>
                    <td style={td}>
                      <input
                        value={ing.unit ?? ''}
                        onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                        style={{ ...inputSm, width: 80 }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={ing.unit_price ?? ''}
                        placeholder="auto live"
                        step="0.01"
                        onChange={(e) =>
                          updateIngredient(i, {
                            unit_price: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        style={{ ...inputSm, width: 120 }}
                      />
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => removeIngredient(i)}
                        aria-label="Quitar"
                        style={{
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          fontSize: 16, color: '#dc2626',
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => addIngredient()}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: '#fff', border: '1px dashed #9ca3af',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                + Añadir ingrediente
              </button>
              <button
                onClick={calculate}
                disabled={busy || !ingredients.length}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 700,
                  background: busy ? '#9ca3af' : '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 6,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? 'Calculando…' : '$ Calcular coste'}
              </button>
            </div>
          </div>

          {/* Resultados */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Panel title="Coste total">
              {costResult ? (
                <div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {costResult.total_cost.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                    <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 4 }}>EUR</span>
                  </p>
                  {costResult.missing_prices.length ? (
                    <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
                      ▲ Sin precio para: {costResult.missing_prices.join(', ')}
                    </p>
                  ) : null}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0', fontSize: 11 }}>
                    {costResult.breakdown.map((b) => (
                      <li key={b.slug} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span style={{ color: '#6b7280' }}>{b.name}</span>
                        <span style={{ fontWeight: 600 }}>
                          {b.line_cost == null
                            ? '—'
                            : `${b.line_cost.toLocaleString('es-ES', { maximumFractionDigits: 2 })} (${b.pct_of_total?.toFixed(1) ?? '—'}%)`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin cálculo · pulsa "Calcular coste".</p>
              )}
            </Panel>

            <Panel title="Análisis de sensibilidad · ±10%">
              {sensResult ? (
                <div>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>
                    Impacto en coste total si cada commodity sube/baja 10%
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sensResult.shocks.map((s) => (
                      <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        <span style={{ width: 120, color: '#374151', fontWeight: 600 }}>{s.slug}</span>
                        <div style={{ flex: 1, position: 'relative', height: 12, background: '#f3f4f6', borderRadius: 2 }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${50 - Math.min(50, Math.abs(s.impact_down_pct) * 4)}%`,
                              width: `${Math.min(50, Math.abs(s.impact_down_pct) * 4)}%`,
                              height: '100%',
                              background: '#dc2626',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              width: `${Math.min(50, Math.abs(s.impact_up_pct) * 4)}%`,
                              height: '100%',
                              background: '#16a34a',
                            }}
                          />
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#9ca3af' }} />
                        </div>
                        <span style={{ width: 60, textAlign: 'right', color: '#374151', fontWeight: 700 }}>
                          ±{s.range_pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>
                  Disponible cuando todos los ingredientes tienen precio resuelto.
                </p>
              )}
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
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>{title}</h3>
      {children}
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#374151', fontWeight: 700, fontSize: 11 }
const td: React.CSSProperties = { padding: '8px 10px', color: '#374151' }
const inputSm: React.CSSProperties = {
  padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, width: 100,
}
