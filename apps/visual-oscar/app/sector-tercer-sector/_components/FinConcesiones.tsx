'use client'
/**
 * <FinConcesiones /> · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Concesiones BDNS recientes a entidades del tercer sector: quién recibió cuánto.
 * Dos lecturas complementarias:
 *   1) RANKING de beneficiarios por importe total (barras horizontales recharts),
 *      restringido a las concesiones marcadas `es_tercer_sector` (heurística NIF/
 *      keyword documentada en lib/tercer-sector/bdns.ts).
 *   2) AGREGADO por nivel administrativo del convocante (Estado / Autonómica /
 *      Local / Otros): importe total y nº de concesiones.
 *
 * No es un explorador exhaustivo de subvenciones (eso es BDNS): es el SNAPSHOT del
 * dinero reciente que llega a ONGs. Degradación honesta: sin concesiones con
 * importe → mensaje, sin inventar. Cero emojis · Unicode geométrico.
 */
import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ACCENT,
  fmtEur,
  importePorNivel,
  nivelColor,
  nivelLabel,
  rankBeneficiarios,
  type FinConcesion,
} from './FinShared'

/** Acorta razones sociales largas para el eje del gráfico. */
function shortName(s: string, max = 34): string {
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function FinConcesiones({
  concesiones,
  rankLimit = 12,
}: {
  concesiones: FinConcesion[]
  rankLimit?: number
}) {
  const [soloTs, setSoloTs] = useState(true)

  const base = useMemo(
    () => (soloTs ? concesiones.filter((c) => c.es_tercer_sector) : concesiones),
    [concesiones, soloTs],
  )
  const nTs = useMemo(() => concesiones.filter((c) => c.es_tercer_sector).length, [concesiones])

  const ranking = useMemo(() => rankBeneficiarios(base, rankLimit), [base, rankLimit])
  const porNivel = useMemo(() => importePorNivel(base), [base])

  // Solo entidades con importe > 0 entran en las barras (honesto: no graficamos 0).
  const chartRows = useMemo(
    () =>
      ranking
        .filter((r) => r.total_eur > 0)
        .map((r) => ({
          nombre: shortName(r.nombre),
          full: r.nombre,
          total: r.total_eur,
          num: r.num,
          nivel: r.nivel,
        })),
    [ranking],
  )

  if (concesiones.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#9CA3AF', padding: '14px 0' }}>
        BDNS no devolvió concesiones ahora mismo.
      </div>
    )
  }

  return (
    <div>
      {/* Toggle tercer sector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setSoloTs((v) => !v)}
          style={{
            border: '1px solid',
            borderColor: soloTs ? ACCENT : '#ECECEF',
            background: soloTs ? ACCENT : '#fff',
            color: soloTs ? '#fff' : '#1d1d1f',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {soloTs ? '◉' : '◯'} Solo tercer sector ({nTs})
        </button>
        <span style={{ fontSize: 10.5, color: '#86868b' }}>
          {base.length.toLocaleString('es-ES')} concesiones · {chartRows.length} beneficiarios con importe
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        {/* Ranking de beneficiarios (barras) */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#475569', fontWeight: 700, margin: '0 0 8px' }}>
            TOP BENEFICIARIOS POR IMPORTE
          </p>
          {chartRows.length === 0 ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>
              Ninguna concesión con importe informado en esta muestra.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, chartRows.length * 30)}>
              <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 64, left: 4, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 10.5, fontWeight: 600, fill: '#1d1d1f' }}
                  axisLine={false}
                  tickLine={false}
                  width={180}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
                  formatter={(v: number, _name, item) => [
                    `${fmtEur(v)} · ${item?.payload?.num ?? 0} concesiones`,
                    'Importe total',
                  ]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.full ?? ''}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {chartRows.map((r, i) => (
                    <Cell key={i} fill={nivelColor(r.nivel)} />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: number) => fmtEur(v)}
                    style={{ fontSize: 9.5, fontWeight: 700, fill: '#3a3a3d' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Agregado por nivel */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#475569', fontWeight: 700, margin: '0 0 8px' }}>
            IMPORTE POR NIVEL ADMINISTRATIVO
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porNivel.map((n) => (
              <div
                key={n.nivel}
                style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: '10px 12px',
                  borderLeft: `3px solid ${nivelColor(n.nivel)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{nivelLabel(n.nivel)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: nivelColor(n.nivel), fontVariantNumeric: 'tabular-nums' }}>
                    {fmtEur(n.total_eur)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>
                  {n.num.toLocaleString('es-ES')} concesiones
                </div>
              </div>
            ))}
            {porNivel.length === 0 && (
              <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>Sin desglose por nivel.</div>
            )}
          </div>
        </div>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        BDNS · concesiones/busqueda (keyless). «Tercer sector» se infiere por prefijo de NIF
        (G/R/F/V) y términos de razón social (fundación, asociación, ONG, cooperativa…); heurística
        documentada, no oficial. El color de cada barra indica el nivel del convocante.
      </p>
    </div>
  )
}

export default FinConcesiones
