'use client'
/**
 * <PetroleoTermStructure /> · Energía v3 · E6 (Petróleo profundo)
 *
 * Estructura temporal del Brent. HONESTIDAD (CLAUDE.md + brief): NO inventamos
 * contango. No hay fuente gratuita de la CURVA de futuros (la lib de commodities
 * sólo da serie spot front-month, no precios por vencimiento), así que NO
 * dibujamos forward curve. En su lugar:
 *   - Mostramos el spread Brent-WTI actual (ya disponible en la vista) como
 *     ancla cuantitativa de la diferencia entre crudos de referencia.
 *   - Explicamos qué son contango y backwardation de forma cualitativa.
 *
 * Si en el futuro se añade una fuente de la curva (precios por vencimiento),
 * este componente es el lugar para dibujarla. Cero emojis · Unicode (⇡ ⇣).
 *
 * NO duplica el SpreadChart (la serie del spread vive en PetroleoView ROW 2);
 * aquí sólo usamos el ÚLTIMO valor del spread + contexto.
 */
import { useMemo } from 'react'
import { brentWtiSpread } from '@/lib/energia/commodities'
import type { EnergyCommoditySeries } from '@/lib/energia/types'

const OIL = '#0F766E'

export function PetroleoTermStructure({
  brent,
  wti,
}: {
  brent: EnergyCommoditySeries | null
  wti: EnergyCommoditySeries | null
}) {
  const spread = brentWtiSpread(brent?.latest ?? null, wti?.latest ?? null)

  // Pequeño cambio del spread vs ~7 días atrás (sin inventar curva): si el
  // diferencial entre crudos se mueve, es señal de re-pricing relativo.
  const spread7dAgo = useMemo(() => {
    if (!brent || !wti) return null
    const wByDate = new Map(wti.series.map((p) => [p.date, p.value]))
    const aligned: Array<{ date: string; value: number }> = []
    for (const b of brent.series) {
      const w = wByDate.get(b.date)
      if (w != null && Number.isFinite(w)) aligned.push({ date: b.date, value: b.value - w })
    }
    if (aligned.length < 2) return null
    const last = aligned[aligned.length - 1]
    const lastMs = Date.parse(last.date)
    if (!Number.isFinite(lastMs)) return null
    const target = lastMs - 7 * 24 * 60 * 60 * 1000
    for (let i = aligned.length - 2; i >= 0; i--) {
      const ms = Date.parse(aligned[i].date)
      if (Number.isFinite(ms) && ms <= target) return aligned[i].value
    }
    return null
  }, [brent, wti])

  const spreadDelta = spread != null && spread7dAgo != null ? spread - spread7dAgo : null

  return (
    <div>
      {/* Spread Brent-WTI actual como ancla cuantitativa */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Spread Brent-WTI (actual)</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: OIL, letterSpacing: '-0.02em' }}>
            {spread != null ? `${spread >= 0 ? '+' : ''}${spread.toFixed(2)} $/bbl` : '—'}
          </div>
        </div>
        {spreadDelta != null && (
          <div>
            <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cambio 7d del spread</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: spreadDelta >= 0 ? '#16A34A' : '#DC2626', letterSpacing: '-0.02em' }}>
              {spreadDelta >= 0 ? '⇡' : '⇣'} {Math.abs(spreadDelta).toFixed(2)} $/bbl
            </div>
          </div>
        )}
      </div>

      {/* Explicación cualitativa contango / backwardation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ConceptCard
          titulo="Contango"
          glyph="⇡"
          detalle="Los futuros lejanos cotizan POR ENCIMA del spot. Señala oferta amplia / inventarios cómodos; incentiva almacenar crudo para venderlo más caro a futuro. Típico en mercados holgados."
        />
        <ConceptCard
          titulo="Backwardation"
          glyph="⇣"
          detalle="Los futuros lejanos cotizan POR DEBAJO del spot. Señala mercado tenso / inventarios bajos; se paga prima por tener crudo YA. Típico cuando hay miedo a falta de suministro."
        />
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        No se dibuja la curva forward del Brent porque no hay una fuente gratuita de precios por
        vencimiento en las APIs configuradas (la serie disponible es el front-month spot, no la curva
        completa). Para no inventar la estructura, mostramos el spread Brent-WTI real y el marco
        conceptual; en cuanto se incorpore una fuente de la curva por vencimientos, se representará aquí.
      </p>
    </div>
  )
}

export default PetroleoTermStructure

function ConceptCard({ titulo, glyph, detalle }: { titulo: string; glyph: string; detalle: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span aria-hidden="true" style={{ fontSize: 14, color: OIL, fontWeight: 700 }}>{glyph}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{titulo}</span>
      </div>
      <p style={{ margin: 0, fontSize: 10.5, color: '#3a3a3d', lineHeight: 1.45 }}>{detalle}</p>
    </div>
  )
}
