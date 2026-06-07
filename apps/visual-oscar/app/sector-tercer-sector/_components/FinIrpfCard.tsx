'use client'
/**
 * <FinIrpfCard /> · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Tarjeta CURADA + DATADA del 0,7% del IRPF a fines sociales (tramo estatal,
 * Ministerio de Derechos Sociales). No es un dato vivo de API: es un valor de
 * referencia, fechado por ejercicio y con su fuente oficial enlazada, tal como lo
 * sirve la route handler (`data.irpf_07`). Honestidad de procedencia (CLAUDE.md):
 * se muestra el ejercicio y se nota que las CCAA gestionan un tramo autonómico
 * adicional. Cero emojis · Unicode geométrico.
 */
import { ACCENT, ACCENT_DARK, type FinIrpf07 } from './FinShared'

export function FinIrpfCard({ irpf }: { irpf: FinIrpf07 | null }) {
  if (!irpf) {
    return (
      <div style={{ fontSize: 12, color: '#9CA3AF', padding: '10px 0' }}>
        Dato del IRPF 0,7% no disponible.
      </div>
    )
  }

  const stat: React.CSSProperties = {
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 12,
    padding: '14px 16px',
    flex: '1 1 180px',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={stat}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: ACCENT_DARK, opacity: 0.85 }}>
            Recaudación estimada
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: ACCENT_DARK, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 3 }}>
            {irpf.recaudacion_estimada_meur.toLocaleString('es-ES')}
            <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 5 }}>M€</span>
          </div>
          <div style={{ fontSize: 10, color: '#15803D', marginTop: 3 }}>tramo estatal · ejercicio {irpf.ejercicio}</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: ACCENT_DARK, opacity: 0.85 }}>
            Entidades beneficiarias
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: ACCENT_DARK, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 3 }}>
            ≈ {irpf.beneficiarias_aprox.toLocaleString('es-ES')}
          </div>
          <div style={{ fontSize: 10, color: '#15803D', marginTop: 3 }}>ONGs con programas subvencionados</div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: '#475569', lineHeight: 1.55 }}>{irpf.nota}</p>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>
          Dato curado · {irpf.fuente} · ref. {irpf.fecha_ref}
        </span>
        <a
          href={irpf.fuente_url}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
            textDecoration: 'none',
            border: '1px solid #BBF7D0',
            background: '#F0FDF4',
            borderRadius: 999,
            padding: '4px 11px',
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          Convocatoria oficial ↗
        </a>
      </div>
    </div>
  )
}

export default FinIrpfCard
