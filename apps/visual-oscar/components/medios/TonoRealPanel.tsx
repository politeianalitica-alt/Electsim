'use client'

/**
 * TonoRealPanel — reactiva el "tono por medio" con datos REALES (no el 0
 * hardcodeado anterior). Bajo demanda (no ralentiza la carga del catálogo):
 * al pulsar "Medir tono real" agrega los titulares de las últimas 72h desde
 * /api/medios/intel y calcula el sentimiento medio por medio. Sin emojis.
 */

import { useState } from 'react'

interface Row { nombre: string; tono: number; n: number }

export default function TonoRealPanel() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(false)

  async function medir() {
    setLoading(true)
    setErr(false)
    try {
      const res = await fetch('/api/medios/intel?hours=72&include=feed', { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const feed = json?.feed
      const arts: Array<{ medio?: { nombre?: string }; sentiment_score?: number }> = feed
        ? [...(feed.tiers?.nacional ?? []), ...(feed.tiers?.europeo ?? []), ...(feed.tiers?.regional ?? []), ...(feed.tiers?.local ?? [])]
        : []
      const m = new Map<string, { sum: number; n: number }>()
      for (const a of arts) {
        const name = a?.medio?.nombre
        if (!name) continue
        const cur = m.get(name) || { sum: 0, n: 0 }
        cur.sum += a.sentiment_score ?? 0
        cur.n++
        m.set(name, cur)
      }
      const out: Row[] = [...m.entries()]
        .map(([nombre, v]) => ({ nombre, tono: +(v.sum / v.n).toFixed(2), n: v.n }))
        .filter((r) => r.n >= 3)
        .sort((a, b) => b.tono - a.tono)
      setRows(out)
    } catch {
      setErr(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: rows ? 14 : 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }}>Tono real por medio</h2>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#6e6e73' }}>
            Sentimiento medio de los titulares de cada medio (últimas 72h). Verde = favorable, rojo = crítico.
          </p>
        </div>
        <button
          onClick={medir}
          disabled={loading}
          style={{ background: loading ? '#F5F5F7' : '#14274E', color: loading ? '#6e6e73' : '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          {loading ? 'Midiendo…' : rows ? '↻ Recalcular' : 'Medir tono real (72h)'}
        </button>
      </div>

      {err && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626' }}>No se pudo medir el tono ahora mismo. Reinténtalo.</p>}

      {rows && rows.length === 0 && !loading && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Sin medios con suficiente cobertura (≥3 titulares) en la ventana.</p>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 7 }}>
          {rows.map((r) => {
            const c = r.tono > 0.10 ? '#16A34A' : r.tono < -0.10 ? '#DC2626' : '#6e6e73'
            const pct = Math.min(50, Math.abs(r.tono) * 50)
            return (
              <div key={r.nombre} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${r.nombre} · ${r.n} titulares`}>{r.nombre}</span>
                <div style={{ position: 'relative', height: 8, background: '#F1F5F9', borderRadius: 999 }}>
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#1d1d1f', opacity: 0.35 }} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 999, background: c, left: r.tono < 0 ? `${50 - pct}%` : '50%', width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: c, textAlign: 'right' }}>{r.tono > 0 ? '+' : ''}{r.tono.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
