'use client'
/**
 * <AlojRentabilidad /> · Turismo v3 · Sprint T5
 *
 * Rentabilidad HOTELERA (IRSH · solo hoteles):
 *   - ADR  · tarifa media diaria (€).
 *   - RevPAR · ingreso por habitación disponible (€).
 *   - Relación: RevPAR = ADR × grado de ocupación. Mostramos la ocupación
 *     IMPLÍCITA (RevPAR/ADR) y la contrastamos con el grado de ocupación
 *     reportado por la EOH como control de coherencia.
 *
 * Nota de honestidad (CLAUDE.md · no inventar): el endpoint /api/turismo/ocupacion
 * entrega ADR/RevPAR como dato del último mes (escalar), no como serie histórica.
 * Por eso la "evolución" la ilustramos con la serie REAL disponible —
 * pernoctaciones hoteleras (estacionalidad de la demanda, motor del RevPAR)— y
 * lo etiquetamos como tal, sin disfrazar pernoctaciones de ADR. Cero emojis.
 */
import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { type OcupacionTipo, TIPO_COLOR, fmtEur, fmtPct, fmtNum, fmtPeriod, AlojEmpty } from './AlojShared'

const HOTEL_COLOR = TIPO_COLOR.hoteles
const REVPAR_COLOR = '#0369A1'

function StatBlock({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div style={{ background: '#F9FAFB', border: '1px solid #ECECEF', borderRadius: 12, padding: '14px 16px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export function AlojRentabilidad({ hotel }: { hotel: OcupacionTipo | undefined }) {
  const adr = hotel?.adr_eur ?? null
  const revpar = hotel?.revpar_eur ?? null
  const gradoReportado = hotel?.grado_ocupacion_pct ?? null

  // Ocupación implícita por la identidad RevPAR = ADR × ocupación.
  const ocupImplicita = adr != null && revpar != null && adr > 0 ? (revpar / adr) * 100 : null

  const serie = useMemo(
    () => (hotel?.serie_pernoctaciones || []).filter((p) => p.value != null).map((p) => ({ t: p.period, v: p.value as number })),
    [hotel?.serie_pernoctaciones],
  )

  if (!hotel || (adr == null && revpar == null)) {
    return (
      <AlojEmpty>
        Rentabilidad hotelera (ADR / RevPAR) no disponible en este momento. La estadística IRSH del INE
        publica estos indicadores solo para hoteles; cuando vuelva el dato se mostrará aquí.
      </AlojEmpty>
    )
  }

  const max = Math.max(adr ?? 0, revpar ?? 0, 1)

  return (
    <div>
      {/* Explicación de la identidad (1 línea) */}
      <div style={{ fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5, marginBottom: 14, background: '#F0F9FF', border: '1px solid #E0F2FE', borderRadius: 10, padding: '8px 12px' }}>
        <strong>RevPAR = ADR × grado de ocupación.</strong> El ADR es lo que cuesta de media una habitación
        vendida; el RevPAR reparte ese ingreso entre todas las habitaciones disponibles (vendidas o no), así
        que cae cuando baja la tarifa o la ocupación.
      </div>

      {/* ADR + RevPAR + ocupación implícita */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <StatBlock label="ADR" value={fmtEur(adr)} color={HOTEL_COLOR} sub={`tarifa media diaria · ${fmtPeriod(hotel.last_period)}`} />
        <StatBlock label="RevPAR" value={fmtEur(revpar)} color={REVPAR_COLOR} sub="ingreso por habitación disponible" />
        <StatBlock
          label="Ocupación implícita"
          value={ocupImplicita != null ? fmtPct(ocupImplicita) : '—'}
          color="#475569"
          sub={gradoReportado != null ? `EOH reporta ${fmtPct(gradoReportado)}` : 'RevPAR ÷ ADR'}
        />
      </div>

      {/* Barras comparadas ADR vs RevPAR */}
      <div style={{ marginBottom: 16 }}>
        {[
          { label: 'ADR', v: adr, color: HOTEL_COLOR },
          { label: 'RevPAR', v: revpar, color: REVPAR_COLOR },
        ].map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 84px', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3a3a3d' }}>{row.label}</span>
            <div style={{ height: 12, background: '#F5F5F7', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: row.v != null ? `${(row.v / max) * 100}%` : 0, height: '100%', background: row.color, transition: 'width 250ms ease' }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: row.color, textAlign: 'right' }}>{fmtEur(row.v)}</span>
          </div>
        ))}
        <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 2 }}>
          La distancia ADR → RevPAR es justo la parte de tarifa que se pierde por habitaciones no vendidas.
        </div>
      </div>

      {/* "Evolución": serie real disponible = pernoctaciones hoteleras (estacionalidad de la demanda) */}
      <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 6 }}>
        Estacionalidad de la demanda hotelera · pernoctaciones mensuales (motor del RevPAR)
      </div>
      {serie.length < 2 ? (
        <AlojEmpty>Sin serie de pernoctaciones hoteleras para ilustrar la estacionalidad.</AlojEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={serie} margin={{ top: 6, right: 12, bottom: 0, left: 6 }}>
            <defs>
              <linearGradient id="aloj-rev-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HOTEL_COLOR} stopOpacity={0.28} />
                <stop offset="100%" stopColor={HOTEL_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F5F5F7" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 9.5, fill: '#86868b' }} tickLine={false} axisLine={false} tickFormatter={fmtPeriod} minTickGap={28} />
            <YAxis
              tick={{ fontSize: 9.5, fill: '#86868b' }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              formatter={(v: number) => [`${fmtNum(v)} pernoct.`, 'Hoteles']}
              labelFormatter={(l) => fmtPeriod(String(l))}
            />
            <Area type="monotone" dataKey="v" stroke={HOTEL_COLOR} strokeWidth={2} fill="url(#aloj-rev-area)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 4 }}>
        Nota: el corte actual del INE entrega ADR y RevPAR como dato del último mes, no como serie; arriba se
        muestra la serie real disponible (pernoctaciones), no una serie de ADR/RevPAR inventada.
      </div>
    </div>
  )
}

export default AlojRentabilidad
