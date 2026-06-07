'use client'
/**
 * <FinFuentesError /> · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Banda de degradación HONESTA (CLAUDE.md): cuando una fuente del agregador de
 * financiación falla (BDNS convocatorias, BDNS concesiones, SEDIA), el endpoint
 * la lista en `data.fuentes_error`. Aquí se muestra tal cual, sin esconderla y
 * sin inventar datos. Si no hay errores no renderiza nada. Cero emojis.
 */
import type { FinFuenteError } from './FinShared'

const FUENTE_LABEL: Record<string, string> = {
  bdns_convocatorias: 'BDNS · convocatorias',
  bdns_concesiones: 'BDNS · concesiones',
  sedia: 'SEDIA · grants UE',
}

export function FinFuentesError({ errores }: { errores: FinFuenteError[] }) {
  if (!errores || errores.length === 0) return null
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 14,
      }}
    >
      <span aria-hidden="true" style={{ color: '#B45309', fontWeight: 800, fontSize: 13 }}>
        !
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400E' }}>
        Fuentes degradadas ahora mismo:
      </span>
      {errores.map((e) => (
        <span
          key={e.fuente}
          title={e.error}
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: '#92400E',
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 999,
            padding: '2px 9px',
          }}
        >
          {FUENTE_LABEL[e.fuente] ?? e.fuente}
        </span>
      ))}
      <span style={{ fontSize: 10, color: '#A16207', marginLeft: 'auto' }}>
        Se muestra lo disponible del resto de fuentes.
      </span>
    </div>
  )
}

export default FinFuentesError
