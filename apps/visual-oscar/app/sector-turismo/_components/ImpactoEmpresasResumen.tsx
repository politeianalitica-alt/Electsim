'use client'
/**
 * <ImpactoEmpresasResumen /> · Turismo v3 · Sprint T9 · Impacto económico
 *
 * Resumen AGREGADO de las empresas cotizadas del sector (el detalle por
 * compañía vive en <TurismoEmpresasPanel />, que NO se toca). Aquí solo se
 * sintetiza, para no duplicar el grid de tarjetas:
 *   - nº de compañías y nº con cotización disponible (free tier / rate-limit),
 *   - sesgo del día (cuántas suben / bajan / planas),
 *   - desglose por segmento (hotelera/aerolínea/GDS/aeropuertos/OTA/turoperador).
 *
 * Consume el MISMO endpoint `{ empresas: [...] }` de /api/turismo/empresas.
 * Degrada honesto: si no hay quotes disponibles, lo dice; nunca inventa el
 * sesgo. Cero emojis · Unicode (⇡ ⇣ →).
 */
import { useEffect, useMemo, useState } from 'react'

const ACCENT = '#0EA5E9'
const UP = '#16A34A'
const DOWN = '#DC2626'
const FLAT = '#9CA3AF'

interface Quote {
  price: number | null
  change_percent: number | null
  available: boolean
}
interface Empresa {
  slug: string
  nombre: string
  ticker: string
  segmento: string
  quote: Quote
}
interface EmpresasEnvelope {
  ok?: boolean
  empresas?: Empresa[]
}

type LoadState = 'loading' | 'ready' | 'error'

/** Etiqueta legible de segmento. */
const SEG_LABEL: Record<string, string> = {
  hotelera: 'Hotelera',
  aerolinea: 'Aerolínea',
  gds: 'GDS',
  aeropuertos: 'Aeropuertos',
  ota: 'OTA',
  turoperador: 'Turoperador',
}

interface Agg {
  total: number
  withQuote: number
  up: number
  down: number
  flat: number
  bySegment: Array<{ key: string; label: string; count: number; up: number; down: number }>
}

function aggregate(empresas: Empresa[]): Agg {
  let withQuote = 0
  let up = 0
  let down = 0
  let flat = 0
  const segMap = new Map<string, { count: number; up: number; down: number }>()
  for (const e of empresas) {
    const seg = (e.segmento || 'otros').toLowerCase()
    const s = segMap.get(seg) ?? { count: 0, up: 0, down: 0 }
    s.count += 1
    const q = e.quote
    const has = !!q?.available && q.price != null
    if (has) {
      withQuote += 1
      const chg = q.change_percent
      if (chg == null) {
        flat += 1
      } else if (chg > 0) {
        up += 1
        s.up += 1
      } else if (chg < 0) {
        down += 1
        s.down += 1
      } else {
        flat += 1
      }
    }
    segMap.set(seg, s)
  }
  const bySegment = Array.from(segMap.entries())
    .map(([key, v]) => ({ key, label: SEG_LABEL[key] ?? key, ...v }))
    .sort((a, b) => b.count - a.count)
  return { total: empresas.length, withQuote, up, down, flat, bySegment }
}

export function ImpactoEmpresasResumen() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const j: EmpresasEnvelope = await fetch('/api/turismo/empresas', { cache: 'no-store' }).then((r) => r.json())
        if (!alive) return
        setEmpresas(Array.isArray(j?.empresas) ? j.empresas : [])
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const agg = useMemo(() => aggregate(empresas), [empresas])

  // Sesgo del día solo si hay quotes; si no, honesto.
  const bias: { label: string; color: string } = (() => {
    if (agg.withQuote === 0) return { label: 'sin cotización', color: FLAT }
    if (agg.up > agg.down) return { label: 'sesgo al alza', color: UP }
    if (agg.down > agg.up) return { label: 'sesgo a la baja', color: DOWN }
    return { label: 'mixto / plano', color: FLAT }
  })()

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: '-0.013em',
            color: '#1d1d1f',
          }}
        >
          Cotizadas del sector · resumen
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Síntesis de mercado · el detalle por compañía está bajo este bloque
        </p>
      </header>

      {state === 'loading' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 72, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12 }} />
          ))}
        </div>
      ) : state === 'error' ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No se pudo cargar el resumen de cotizadas en este momento.
        </p>
      ) : agg.total === 0 ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          Aún no hay empresas cotizadas disponibles para el sector turismo.
        </p>
      ) : (
        <>
          {/* Tres KPIs agregados. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
            <AggKpi label="Compañías cotizadas" value={String(agg.total)} sub={`${agg.bySegment.length} segmentos`} accent={ACCENT} />
            <AggKpi
              label="Con cotización"
              value={`${agg.withQuote} / ${agg.total}`}
              sub={agg.withQuote < agg.total ? 'resto: rate-limit / free tier' : 'cobertura completa'}
              accent={ACCENT}
            />
            <AggKpi
              label="Sesgo del día"
              value={agg.withQuote > 0 ? `${agg.up} ⇡ · ${agg.down} ⇣` : '—'}
              sub={bias.label}
              accent={bias.color}
            />
          </div>

          {/* Desglose por segmento. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {agg.bySegment.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: '#FAFAFA',
                  border: '1px solid #ECECEF',
                  borderRadius: 999,
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f' }}>{s.label}</span>
                <span style={{ fontSize: 11, color: '#6e6e73' }}>{s.count}</span>
                {(s.up > 0 || s.down > 0) && (
                  <span style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {s.up > 0 && <span style={{ color: UP }}>{s.up}⇡</span>}
                    {s.up > 0 && s.down > 0 && <span style={{ color: '#D1D5DB' }}> · </span>}
                    {s.down > 0 && <span style={{ color: DOWN }}>{s.down}⇣</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function AggKpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ padding: '12px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, borderLeft: `4px solid ${accent}` }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export default ImpactoEmpresasResumen
