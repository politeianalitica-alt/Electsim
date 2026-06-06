'use client'
/**
 * <TiposNav /> · Turismo v3 · Sprint T7
 *
 * Sub-navegación interna (nivel 3) de la vista "Tipos de turismo". Una pastilla
 * por tipo de turismo; la activa se controla con `?tt=` en la URL (deep-linkable,
 * scoped para no colisionar con el `?turismo=` del TurismoShell). Cada item marca
 * si su panel es de DATO VIVO (◉) o CURADO (◍) para que el usuario sepa, de un
 * vistazo, qué secciones llevan series en tiempo real.
 *
 * Scroll horizontal en pantallas estrechas (overflow-x). Cero emojis · Unicode.
 */
import type { TipoId } from './TiposCatalog'
import { TIPOS_NAV } from './TiposCatalog'
import { ACCENT } from './TiposShared'

export function TiposNav({ active, onSelect }: { active: TipoId; onSelect: (id: TipoId) => void }) {
  return (
    <nav
      aria-label="Tipo de turismo"
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 4,
      }}
    >
      {TIPOS_NAV.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            aria-current={isActive ? 'page' : undefined}
            title={t.desc}
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: `1px solid ${isActive ? ACCENT : '#E4E4E7'}`,
              background: isActive ? ACCENT : '#fff',
              color: isActive ? '#fff' : '#3a3a3d',
              borderRadius: 999,
              padding: '7px 13px',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              transition: 'background 140ms ease, border-color 140ms ease',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 12, opacity: isActive ? 1 : 0.7 }}>
              {t.glyph}
            </span>
            {t.label}
            <span
              aria-hidden="true"
              title={t.live ? 'Dato en vivo' : 'Contexto curado + datado'}
              style={{
                fontSize: 9,
                marginLeft: 2,
                opacity: isActive ? 0.95 : 0.6,
                color: isActive ? '#fff' : t.live ? '#047857' : '#a1a1aa',
              }}
            >
              {t.live ? '◉' : '◍'}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default TiposNav
