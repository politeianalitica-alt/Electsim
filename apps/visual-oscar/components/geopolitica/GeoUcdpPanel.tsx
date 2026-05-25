'use client'
/**
 * `<GeoUcdpPanel />` · Sprint G6.
 *
 * UCDP/PRIO Armed Conflict Dataset · validación ESTRUCTURAL del conflicto
 * armado. Mientras ACLED es señal táctica reciente, UCDP es la fuente
 * académica de Uppsala University que cataloga conflictos formalmente
 * (1=conflicto menor 25-999 deaths/año, 2=guerra 1000+).
 *
 * Fuente: https://ucdpapi.pcr.uu.se/api/  · v24.1 mayo 2025
 * Diferenciador: validación académica con histórico desde 1946. No es
 * "alguien murió hoy", es "este conflicto está clasificado oficialmente".
 */
import { useEffect, useState } from 'react'

interface UcdpConflict {
  conflict_id: number
  name: string
  side_a: string
  side_b: string
  incompatibility: number
  intensity_level: number
  type_of_conflict: number
  start_date: string
  year: number
  region: string
}

interface UcdpResp {
  ok: boolean
  country: string
  n_conflicts: number
  years_covered: string
  max_intensity_level: number
  interpretation: string
  conflicts: UcdpConflict[]
  source: string
  note: string
  error?: string
}

const INCOMPAT_LABEL: Record<number, string> = {
  1: 'Territorio',
  2: 'Gobierno',
  3: 'Territorio + Gobierno',
}
const TYPE_LABEL: Record<number, string> = {
  1: 'Extrasistémico',
  2: 'Interestatal',
  3: 'Interno (guerra civil)',
  4: 'Interno internacionalizado',
}
const INTENSITY_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'sin clasificar',                color: '#94a3b8' },
  1: { label: 'CONFLICTO MENOR · 25-999/año',  color: '#f59e0b' },
  2: { label: 'GUERRA · 1000+ deaths/año',     color: '#dc2626' },
}

export function GeoUcdpPanel({ country = 'Ukraine' }: { country?: string }) {
  const [data, setData] = useState<UcdpResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(country)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/ucdp?country=${encodeURIComponent(selectedCountry)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [selectedCountry])

  const intensity = data?.max_intensity_level ?? 0
  const m = INTENSITY_LABEL[intensity] || INTENSITY_LABEL[0]

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${m.color}`,
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: m.color, textTransform: 'uppercase' }}>
            ◆ UCDP · Conflict structural validation
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            Uppsala University · v24.1 (mayo 2025). Complemento estructural de ACLED.
          </p>
        </div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          style={{
            background: '#f8fafc',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            fontSize: 11,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          {['Ukraine', 'Russia (Soviet Union)', 'Yemen', 'Syria', 'Israel', 'Sudan', 'Myanmar', 'Mali', 'Ethiopia', 'Mexico', 'Colombia', 'Afghanistan'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando UCDP…</p>}

      {data && data.ok && (
        <>
          <div style={{
            background: `${m.color}10`,
            border: `1px solid ${m.color}30`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}>
            <p style={{ margin: 0, fontSize: 10, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Nivel máximo · {data.country}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: m.color }}>
              {m.label}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0f172a' }}>
              {data.n_conflicts} conflictos registrados · cobertura {data.years_covered}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
              {data.interpretation}
            </p>
          </div>

          {data.conflicts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {data.conflicts.slice(0, 12).map((c) => {
                const ic = INTENSITY_LABEL[c.intensity_level] || INTENSITY_LABEL[0]
                return (
                  <div key={`${c.conflict_id}-${c.year}`} style={{
                    padding: 8,
                    background: '#f8fafc',
                    borderLeft: `3px solid ${ic.color}`,
                    borderRadius: 4,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{c.name}</span>
                      <span style={{ fontSize: 9, color: ic.color, fontWeight: 700, letterSpacing: 0.4 }}>
                        {c.year} · L{c.intensity_level}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>
                      <strong>{c.side_a}</strong> vs <strong>{c.side_b}</strong>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>
                      {TYPE_LABEL[c.type_of_conflict] || '—'} · sobre {INCOMPAT_LABEL[c.incompatibility] || '—'} · región {c.region}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin conflictos UCDP registrados para {data.country}.</p>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.source} · {data.note}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>
          UCDP no disponible · {data.error}
        </p>
      )}
    </section>
  )
}

export default GeoUcdpPanel
