'use client'
/**
 * <LicResumen /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · facetas)
 *
 * Resumen del conjunto de resultados del agregador multinivel: distribución
 * `por_nivel` (clickable → filtra) y `por_fuente`, total de licitaciones, y —de
 * forma HONESTA (CLAUDE.md)— las `fuentes_error` que cayeron en este barrido, con
 * su mensaje. Nunca oculta una fuente caída: el analista debe saber qué cobertura
 * tiene realmente. Cero emojis · Unicode geométrico.
 */
import type { FuenteLicitacion, NivelLicitacion } from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, NIVELES, nivelMeta, fuenteLabel, FUENTES } from './LicShared'

interface Props {
  total: number
  porNivel: Record<string, number>
  porFuente: Record<string, number>
  fuentesOk: FuenteLicitacion[]
  fuentesError: { fuente: FuenteLicitacion; error: string }[]
  nivelActivo: NivelLicitacion | null
  onNivel: (n: NivelLicitacion | null) => void
  fetchedAt?: string | null
}

export function LicResumen({
  total,
  porNivel,
  porFuente,
  fuentesOk,
  fuentesError,
  nivelActivo,
  onNivel,
  fetchedAt,
}: Props) {
  const nivelEntries = NIVELES.map((n) => ({ meta: n, count: porNivel[n.id] || 0 })).filter((e) => e.count > 0)
  const fuenteEntries = Object.entries(porFuente)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])

  const nFuentes = fuentesOk.length + fuentesError.length

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 14,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          {total.toLocaleString('es-ES')} {total === 1 ? 'licitación' : 'licitaciones'}
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
            tras filtros · {fuentesOk.length}/{nFuentes} fuentes activas
          </span>
        </h2>
        {fetchedAt && (
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            Barrido · {new Date(fetchedAt).toLocaleString('es-ES')}
          </span>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {/* Por nivel · clickable */}
        <div>
          <p style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Por nivel
          </p>
          {nivelEntries.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nivelEntries.map(({ meta, count }) => {
                const on = nivelActivo === meta.id
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => onNivel(on ? null : meta.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      border: '1px solid',
                      borderColor: on ? meta.color : 'transparent',
                      background: on ? `${meta.color}10` : 'transparent',
                      borderRadius: 8,
                      padding: '5px 8px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                    title={meta.desc}
                  >
                    <span aria-hidden="true" style={{ color: meta.color, fontSize: 12 }}>{meta.glyph}</span>
                    <span style={{ fontSize: 11.5, color: '#334155', fontWeight: 600, minWidth: 96 }}>{meta.short}</span>
                    <span style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 999 }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>
                      {count.toLocaleString('es-ES')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Por fuente */}
        <div>
          <p style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Por fuente
          </p>
          {fuenteEntries.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fuenteEntries.map(([f, c]) => {
                const url = (FUENTES as Record<string, { url: string }>)[f]?.url
                const inner = (
                  <>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{fuenteLabel(f)}</span>
                    <span style={{ fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>{c.toLocaleString('es-ES')}</span>
                  </>
                )
                const style: React.CSSProperties = {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10.5,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '3px 9px',
                  textDecoration: 'none',
                }
                return url ? (
                  <a key={f} href={url} target="_blank" rel="noreferrer" title={`Abrir ${fuenteLabel(f)}`} style={style}>
                    {inner}
                  </a>
                ) : (
                  <span key={f} style={style}>{inner}</span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fuentes caídas · honesto */}
      {fuentesError.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: '#92400E', letterSpacing: '0.02em' }}>
            <span aria-hidden="true">!</span> {fuentesError.length} {fuentesError.length === 1 ? 'fuente no respondió' : 'fuentes no respondieron'} en este barrido
          </p>
          <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fuentesError.map((e) => (
              <li key={e.fuente} style={{ fontSize: 10, color: '#92400E' }}>
                <strong>{fuenteLabel(e.fuente)}</strong>
                <span style={{ opacity: 0.75 }}> · {e.error}</span>
              </li>
            ))}
          </ul>
          <p style={{ margin: '6px 0 0', fontSize: 9.5, color: '#B45309', opacity: 0.85 }}>
            Los resultados mostrados no incluyen estas fuentes. Reintenta más tarde para una cobertura completa.
          </p>
        </div>
      )}
    </section>
  )
}

export default LicResumen
