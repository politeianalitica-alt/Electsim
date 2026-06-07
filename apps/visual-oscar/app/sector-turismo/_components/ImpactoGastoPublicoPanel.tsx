'use client'
/**
 * <ImpactoGastoPublicoPanel /> · Turismo v3 · Sprint T9 · Impacto económico
 *
 * Gasto público ligado al turismo: PERTE + planes (Componente 14 del Plan de
 * Recuperación, ETSE 2030, Turespaña, etc.). Tabla de programas con presupuesto
 * comprometido (M€), fuente y fecha, + total y una barra de peso relativo.
 *
 * Honestidad de dato (CLAUDE.md): NO existe API pública de ejecución/pagado de
 * estos programas; el dato es presupuesto COMPROMETIDO, curado y datado. Se dice
 * explícitamente; no se simula una columna de "ejecutado".
 *
 * Consume el envelope `{ ok, data: { gasto_publico_perte, gasto_publico_total_meur } }`
 * de /api/turismo/impacto-economico. Cero emojis.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#0EA5E9'

interface PerteProgram {
  programa: string
  presupuesto_meur: number
  fuente: string
  fecha: string
}
interface ImpactoData {
  gasto_publico_perte: PerteProgram[]
  gasto_publico_total_meur: number
}
interface ImpactoEnvelope {
  ok: boolean
  data: (ImpactoData & Record<string, unknown>) | null
}

type LoadState = 'loading' | 'ready' | 'error'

function fmtMeur(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

export function ImpactoGastoPublicoPanel() {
  const [programas, setProgramas] = useState<PerteProgram[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const j: ImpactoEnvelope = await fetch('/api/turismo/impacto-economico', { cache: 'no-store' }).then((r) =>
          r.json(),
        )
        if (!alive) return
        const list = Array.isArray(j?.data?.gasto_publico_perte) ? j.data!.gasto_publico_perte : []
        setProgramas(list)
        setTotal(typeof j?.data?.gasto_publico_total_meur === 'number' ? j.data!.gasto_publico_total_meur : null)
        setState(j?.ok && list.length > 0 ? 'ready' : j?.ok ? 'ready' : 'error')
      } catch {
        if (alive) setState('error')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const maxBudget = programas.reduce((m, p) => Math.max(m, p.presupuesto_meur || 0), 0)
  const sum = total ?? programas.reduce((s, p) => s + (p.presupuesto_meur || 0), 0)

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
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
            Gasto público · PERTE y planes
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Presupuesto comprometido por programa · curado y datado
          </p>
        </div>
        {state === 'ready' && sum > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: ACCENT,
                lineHeight: 1,
              }}
            >
              {fmtMeur(sum)}
              <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4, color: '#6e6e73' }}>M€</span>
            </div>
            <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 2 }}>
              {programas.length} programa{programas.length === 1 ? '' : 's'} · total comprometido
            </div>
          </div>
        )}
      </header>

      {state === 'loading' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 44, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }} />
          ))}
        </div>
      ) : state === 'error' ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No se pudo cargar el gasto público en este momento. Reintenta más tarde.
        </p>
      ) : programas.length === 0 ? (
        <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
          No hay programas de gasto público curados disponibles.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#86868b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Programa</th>
                <th style={{ padding: '0 8px 8px', fontWeight: 700, width: 180 }}>Presupuesto comprometido</th>
                <th style={{ padding: '0 8px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>Fuente</th>
                <th style={{ padding: '0 0 8px 8px', fontWeight: 700, width: 56, textAlign: 'right' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {programas.map((p, i) => {
                const pct = maxBudget > 0 ? (p.presupuesto_meur / maxBudget) * 100 : 0
                const share = sum > 0 ? (p.presupuesto_meur / sum) * 100 : 0
                return (
                  <tr key={`${p.programa}-${i}`} style={{ borderTop: '1px solid #F0F0F2' }}>
                    <td style={{ padding: '10px 8px 10px 0', color: '#1d1d1f', lineHeight: 1.4, maxWidth: 360 }}>
                      {p.programa}
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#F0F0F2', borderRadius: 999, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMeur(p.presupuesto_meur)} M€
                        </span>
                        <span style={{ fontSize: 9.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#6e6e73', fontSize: 11, lineHeight: 1.4, maxWidth: 220 }}>
                      {p.fuente}
                    </td>
                    <td style={{ padding: '10px 0 10px 8px', color: '#6e6e73', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p.fecha}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Honestidad de dato: no hay API de ejecución/pagado. */}
      {state === 'ready' && programas.length > 0 && (
        <p
          style={{
            margin: '14px 0 0',
            padding: '8px 10px',
            background: '#FFFBEB',
            border: '1px solid #FEF3C7',
            borderRadius: 8,
            fontSize: 10.5,
            color: '#92400E',
            lineHeight: 1.5,
          }}
        >
          <strong>Sin dato de ejecución.</strong> Las cifras son presupuesto <em>comprometido</em> (curado y datado por
          fuente). No existe una API pública de ejecución/pagado de estos programas, por lo que no se muestra una columna
          de gasto ejecutado: hacerlo sería inventar el dato.
        </p>
      )}
    </section>
  )
}

export default ImpactoGastoPublicoPanel
