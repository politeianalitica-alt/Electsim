'use client'
/**
 * <PetroleoReservasES /> · Energía v3 · E6 (Petróleo profundo)
 *
 * Tarjeta CURADA: reservas estratégicas de productos petrolíferos de España
 * (CORES). Dato público con fuente y fecha (patrón URANIO_REF de NuclearView);
 * CORES no expone una API JSON de existencias, así que es curado pero honesto.
 *
 * Marco legal (curado · datado):
 *   - Obligación nacional: 92 días de consumo/ventas de productos petrolíferos
 *     (reinstaurada para 2026 vía Orden TED/533/2025 tras la reducción temporal
 *     de 2025). De esos 92: ~42 días gestiona CORES, ~50 días la industria.
 *   - Estándar internacional AIE/UE: ≥90 días de importaciones netas.
 *
 * Cero emojis · Unicode. NO toca catalog.ts/types.ts/shared.
 */

const OIL = '#0F766E'

const RESERVAS_ES_REF = {
  /** Obligación total nacional en días de consumo/ventas. */
  obligacion_dias: 92,
  /** Parte gestionada por CORES. */
  cores_dias: 42,
  /** Parte que debe mantener la industria. */
  industria_dias: 50,
  /** Mínimo internacional de referencia (AIE/UE). */
  minimo_intl_dias: 90,
  fecha_ref: '2026',
  fuente: 'CORES (Corporación de Reservas Estratégicas de Productos Petrolíferos · MITECO) · Orden TED/533/2025.',
  fuente_url: 'https://www.cores.es/es/seguridad-suministro/productos-petroliferos/reservas-cores',
  nota:
    'España, sin producción doméstica de crudo, depende de existencias mínimas de seguridad para ' +
    'absorber disrupciones de suministro. La obligación (92 días) supera el mínimo AIE/UE de 90 días. ' +
    'Tras el apagón de abril de 2025 se redujo temporalmente la obligación de varios productos, ' +
    'restituida a partir de 2026.',
}

export function PetroleoReservasES() {
  const d = RESERVAS_ES_REF
  const cumple = d.obligacion_dias >= d.minimo_intl_dias

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: OIL, letterSpacing: '-0.02em' }}>
          {d.obligacion_dias}
        </span>
        <span style={{ fontSize: 12, color: '#6e6e73' }}>días de cobertura obligatoria (consumo/ventas)</span>
      </div>

      {/* Barra: desglose CORES vs industria sobre la obligación, con línea del mínimo AIE/UE */}
      <div style={{ position: 'relative', height: 18, background: '#F5F5F7', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(d.cores_dias / d.obligacion_dias) * 100}%`, background: OIL }} />
        <div style={{ position: 'absolute', left: `${(d.cores_dias / d.obligacion_dias) * 100}%`, top: 0, bottom: 0, width: `${(d.industria_dias / d.obligacion_dias) * 100}%`, background: '#5EEAD4' }} />
        {/* Marca del mínimo internacional (90 días) */}
        <div title={`Mínimo AIE/UE · ${d.minimo_intl_dias} días`} style={{ position: 'absolute', left: `${(d.minimo_intl_dias / d.obligacion_dias) * 100}%`, top: -2, bottom: -2, width: 2, background: '#1d1d1f' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#6e6e73', marginBottom: 4 }}>
        <Legend color={OIL} label={`CORES · ${d.cores_dias} días`} />
        <Legend color="#5EEAD4" label={`Industria · ${d.industria_dias} días`} />
        <Legend color="#1d1d1f" label={`Mín. AIE/UE · ${d.minimo_intl_dias} días`} />
      </div>

      <div
        style={{
          marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600,
          color: cumple ? '#166534' : '#991B1B', background: cumple ? '#DCFCE7' : '#FEE2E2', borderRadius: 8, padding: '5px 10px',
        }}
      >
        <span aria-hidden="true">{cumple ? '✓' : '!'}</span>
        {cumple ? `Cumple el estándar de ≥${d.minimo_intl_dias} días` : `Por debajo de ${d.minimo_intl_dias} días`}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{d.nota}</p>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {d.fuente} Referencia: {d.fecha_ref}. Dato curado (CORES publica sin API JSON de existencias).
      </p>
    </div>
  )
}

export default PetroleoReservasES

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}
