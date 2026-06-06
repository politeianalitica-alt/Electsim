'use client'
/**
 * <PetroleoOpecQuota /> · Energía v3 · E6 (Petróleo profundo)
 *
 * Tarjeta CURADA: objetivo de producción de OPEP+ vs producción real reciente.
 * No hay API JSON gratuita y fiable del nivel de bombeo en vivo, así que esto es
 * un dato curado pero HONESTO: cifras públicas con fuente y fecha de referencia
 * explícitas (patrón URANIO_REF de NuclearView). No inventa el dato del día.
 *
 * Fuentes: comunicados OPEC (Declaration of Cooperation) + OPEC Monthly Oil
 * Market Report (MOMR). Las cifras se leen como orden de magnitud del marco
 * vigente, no como el bombeo exacto del mes corriente. Cero emojis · Unicode.
 *
 * NO toca catalog.ts/types.ts/shared (constantes locales con su fuente).
 */

const OIL = '#0F766E'

/**
 * Marco de producción OPEP+ vigente (curado · dato público con fecha).
 * Revisar contra el comunicado/MOMR más reciente al actualizar la vista.
 */
const OPEC_QUOTA_REF = {
  /** Cuota grupal OPEP+ 2026 acordada (Declaration of Cooperation, nov-2025). */
  objetivo_grupal_2026_mbd: 39.725,
  /** Recortes de producción aún en vigor (~3% de la demanda mundial). */
  recortes_vigentes_mbd: 3.24,
  /** Último ajuste al alza comunicado del bloque de 8 (ene-2026 · referencia). */
  ajuste_reciente_kbd: 206,
  fecha_ref: 'jun 2026',
  fuente: 'OPEC · Declaration of Cooperation + Monthly Oil Market Report (MOMR).',
  fuente_url: 'https://www.opec.org/monthly-oil-market-report.html',
  nota:
    'OPEP+ ha ido deshaciendo de forma gradual los recortes voluntarios a lo largo de 2025-2026. ' +
    'El objetivo grupal y los recortes vigentes marcan el sesgo de oferta del cártel; cuando la ' +
    'producción real queda por debajo del objetivo (cumplimiento alto o capacidad limitada de ' +
    'algunos socios) el mercado lee menos oferta y sostiene el Brent. La salida de EAU de la OPEP ' +
    '(may-2026) reordena la composición del grupo.',
}

export function PetroleoOpecQuota() {
  const d = OPEC_QUOTA_REF
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Figure label="Objetivo grupal OPEP+ 2026" value={d.objetivo_grupal_2026_mbd} unit="Mbd" />
        <Figure label="Recortes aún vigentes" value={d.recortes_vigentes_mbd} unit="Mbd" sub="~3% demanda mundial" />
        <Figure label="Último ajuste al alza" value={`+${d.ajuste_reciente_kbd}`} unit="kbd" sub="bloque de 8 países" />
      </div>

      <div
        style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5,
          fontWeight: 600, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '5px 10px',
        }}
      >
        <span aria-hidden="true">!</span> Dato curado · referencia {d.fecha_ref} (no es el bombeo en vivo)
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{d.nota}</p>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {d.fuente} Referencia: {d.fecha_ref}.
      </p>
    </div>
  )
}

export default PetroleoOpecQuota

function Figure({ label, value, unit, sub }: { label: string; value: number | string; unit: string; sub?: string }) {
  const display = typeof value === 'number' ? value.toLocaleString('es-ES', { maximumFractionDigits: 3 }) : value
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: OIL, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {display}
        <span style={{ fontSize: 11, fontWeight: 600, color: '#86868b', marginLeft: 5 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 9.5, color: '#A0A0A5', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
