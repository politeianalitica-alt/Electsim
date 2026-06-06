'use client'
/**
 * <AlojTypeCards /> · Turismo v3 · Sprint T5
 *
 * Comparativa por TIPO de alojamiento (hoteles · apartamentos · campings ·
 * rural). Una tarjeta por tipo con: pernoctaciones del último mes, grado de
 * ocupación %, estancia media; y para hoteles además ADR y RevPAR. Cada tarjeta
 * incluye una mini-serie (sparkline · recharts) de pernoctaciones para leer la
 * estacionalidad de un vistazo. Degradación honesta por tipo y por métrica:
 * '—' si null + chip "datos parciales" cuando la fuente degradó. Cero emojis.
 */
import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import {
  type OcupacionTipo,
  TIPO_COLOR,
  TIPO_GLYPH,
  DegradedBadge,
  MetricCell,
  fmtPernoct,
  fmtPct,
  fmtNum,
  fmtEur,
  fmtPeriod,
} from './AlojShared'

function Sparkline({ tipo }: { tipo: OcupacionTipo }) {
  const color = TIPO_COLOR[tipo.tipo] ?? '#0EA5E9'
  const data = useMemo(
    () => (tipo.serie_pernoctaciones || []).filter((p) => p.value != null).map((p) => ({ t: p.period, v: p.value as number })),
    [tipo.serie_pernoctaciones],
  )
  if (data.length < 2) {
    return (
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#86868b' }}>
        Sin serie de pernoctaciones
      </div>
    )
  }
  const gid = `aloj-spark-${tipo.tipo}`
  return (
    <div style={{ height: 56 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
            contentStyle={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            formatter={(v: number) => [`${fmtNum(v)} pernoct.`, '']}
            labelFormatter={(l) => fmtPeriod(String(l))}
            separator=""
          />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${gid})`} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TypeCard({ tipo }: { tipo: OcupacionTipo }) {
  const color = TIPO_COLOR[tipo.tipo] ?? '#0EA5E9'
  const glyph = TIPO_GLYPH[tipo.tipo] ?? '▤'
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 16, borderTop: `3px solid ${color}` }}>
      {/* Cabecera: glyph + label + periodo + chip degradado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span aria-hidden="true" style={{ fontSize: 16, color, lineHeight: 1 }}>{glyph}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#1d1d1f' }}>
            {tipo.label}
          </div>
          <div style={{ fontSize: 9.5, color: '#86868b' }}>{tipo.last_period ? fmtPeriod(tipo.last_period) : 'sin periodo'}</div>
        </div>
        {tipo.degraded && <DegradedBadge />}
      </div>

      {/* Métricas comunes a todos los tipos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <MetricCell label="Pernoctaciones" value={fmtPernoct(tipo.pernoctaciones)} color={color} sub="último mes" />
        <MetricCell label="Grado ocupación" value={fmtPct(tipo.grado_ocupacion_pct)} sub="por plazas" />
        <MetricCell label="Estancia media" value={tipo.estancia_media != null ? `${fmtNum(tipo.estancia_media, 1)}` : '—'} sub="noches" />
        {tipo.tipo === 'hoteles' ? (
          <MetricCell label="ADR" value={fmtEur(tipo.adr_eur)} sub="tarifa media diaria" />
        ) : (
          <MetricCell label="ADR / RevPAR" value="n/d" sub="solo hoteles" />
        )}
      </div>

      {/* RevPAR (solo hoteles) en su propia fila para no romper el grid */}
      {tipo.tipo === 'hoteles' && (
        <div style={{ marginBottom: 10 }}>
          <MetricCell label="RevPAR" value={fmtEur(tipo.revpar_eur)} color={color} sub="ingreso por habitación disponible" />
        </div>
      )}

      {/* Mini-serie de pernoctaciones */}
      <Sparkline tipo={tipo} />
    </div>
  )
}

export function AlojTypeCards({ tipos }: { tipos: OcupacionTipo[] }) {
  // Orden estable y legible: hoteles primero (el grande), luego el resto.
  const ORDER = ['hoteles', 'apartamentos', 'campings', 'rural']
  const sorted = useMemo(
    () => [...tipos].sort((a, b) => ORDER.indexOf(a.tipo) - ORDER.indexOf(b.tipo)),
    [tipos],
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      {sorted.map((t) => (
        <TypeCard key={t.tipo} tipo={t} />
      ))}
    </div>
  )
}

export default AlojTypeCards
