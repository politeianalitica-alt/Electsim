'use client'
/**
 * <DestinosSaturacion /> · Turismo v3 · Sprint T6 (Destinos y territorio)
 *
 * Presión turística / saturación. La señal honesta que SÍ podemos construir con
 * lo disponible es la PRESIÓN RELATIVA: pernoctaciones anuales por habitante de
 * cada comunidad (pernoctaciones de `/api/turismo/ccaa` ÷ población del
 * `CCAA_CATALOG`, una constante demográfica). Es un proxy estándar de carga
 * turística sobre el territorio — no la "saturación" granular de un destino
 * concreto, y así se explica.
 *
 * Complemento: CONCENTRACIÓN territorial = cuota acumulada del top-3 / top-5 de
 * CCAA sobre el total nacional (cuánto turismo se apelotona en pocas regiones).
 *
 * Honestidad (CLAUDE.md): si no hay población o pernoctaciones para una región,
 * se omite de la presión per-cápita; no se infiere. Lo que NO tenemos (tasa
 * turística por destino, plazas de vivienda turística por municipio) se declara
 * abiertamente en la nota, sin simularlo. Cero emojis · Unicode geométrico.
 */
import { useMemo } from 'react'
import type { CcaaRow } from './DestinosTerritorioView'

const ACCENT = '#0EA5E9'
const HOT = '#EA580C'

interface Props {
  rows: CcaaRow[]
  /** Habitantes por NUTS2 (catálogo). */
  poblacionByNuts2: Record<string, number>
  totalPernoctaciones: number | null
  year: number | null
  loading?: boolean
}

interface PresionRow {
  ccaa: string
  nuts2: string
  perHab: number
  pernoctaciones: number
}

export function DestinosSaturacion({ rows, poblacionByNuts2, totalPernoctaciones, year, loading = false }: Props) {
  const presion = useMemo<PresionRow[]>(() => {
    const out: PresionRow[] = []
    for (const r of rows) {
      const pob = poblacionByNuts2[r.nuts2]
      if (r.pernoctaciones == null || !pob || pob <= 0) continue
      out.push({ ccaa: r.ccaa, nuts2: r.nuts2, perHab: r.pernoctaciones / pob, pernoctaciones: r.pernoctaciones })
    }
    return out.sort((a, b) => b.perHab - a.perHab)
  }, [rows, poblacionByNuts2])

  // Concentración: cuota acumulada top-3 / top-5.
  const { top3, top5 } = useMemo(() => {
    const withPernoct = rows
      .filter((r) => r.pernoctaciones != null)
      .sort((a, b) => (b.pernoctaciones as number) - (a.pernoctaciones as number))
    const tot =
      totalPernoctaciones && totalPernoctaciones > 0
        ? totalPernoctaciones
        : withPernoct.reduce((s, r) => s + (r.pernoctaciones as number), 0)
    const sumN = (n: number) => withPernoct.slice(0, n).reduce((s, r) => s + (r.pernoctaciones as number), 0)
    return {
      top3: tot > 0 ? (sumN(3) / tot) * 100 : null,
      top5: tot > 0 ? (sumN(5) / tot) * 100 : null,
    }
  }, [rows, totalPernoctaciones])

  if (loading) {
    return <div style={{ height: 220, background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12 }} />
  }

  const maxPerHab = Math.max(1, ...presion.map((p) => p.perHab))

  return (
    <div>
      {/* Concentración */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <ConcentracionStat label="Concentración top-3 CCAA" value={top3} hint="del total nacional de pernoctaciones" />
        <ConcentracionStat label="Concentración top-5 CCAA" value={top5} hint="del total nacional de pernoctaciones" />
      </div>

      {/* Presión per cápita */}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: 10 }}>
        Presión turística relativa · pernoctaciones por habitante{year ? ` · ${year}` : ''}
      </div>
      {presion.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
          No hay datos suficientes (pernoctaciones + población) para calcular la presión per cápita.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {presion.map((p, i) => {
            const pct = Math.max(2, (p.perHab / maxPerHab) * 100)
            // Tinte de "calor" para el tercio superior (mayor presión).
            const hot = i < Math.ceil(presion.length / 3)
            const barColor = hot ? HOT : ACCENT
            return (
              <div key={p.nuts2} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.1fr) 2fr auto', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.ccaa}>
                  {p.ccaa}
                </span>
                <div style={{ height: 16, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 5, transition: 'width 200ms ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: hot ? '#9A3412' : '#0C4A6E', fontFamily: 'var(--font-display)', minWidth: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.perHab.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}> /hab</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 10, color: '#94A3B8', lineHeight: 1.55 }}>
        <strong style={{ color: '#64748B' }}>Qué mide y qué no.</strong> La presión per cápita (pernoctaciones
        ÷ población residente) es un proxy de carga turística por comunidad, no la saturación de un destino
        concreto. No disponemos en vivo de tasa turística municipal ni de plazas de vivienda turística por
        municipio (INE EOTR / registros autonómicos) para esta vista, así que no se estiman: solo se muestra
        la señal que las fuentes actuales (Eurostat NUTS2 + padrón) permiten calcular con honestidad.
      </p>
    </div>
  )
}

function ConcentracionStat({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A3412' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: HOT, fontFamily: 'var(--font-display)', lineHeight: 1.1, marginTop: 4 }}>
        {value != null ? `${value.toFixed(0)}%` : '—'}
      </div>
      <div style={{ fontSize: 9.5, color: '#A8A29E', marginTop: 2 }}>{hint}</div>
    </div>
  )
}

export default DestinosSaturacion
