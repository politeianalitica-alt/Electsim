'use client'
/**
 * <TiposTurismoView /> · Turismo v3 · TurismoShell · Sprint T7
 *
 * El corazón del overhaul: TODOS los tipos de turismo con detalle. Estructura en
 * sub-navegación interna (nivel 3, `?tt=` en la URL) con una sección por tipo;
 * solo se monta el panel activo (lazy-mount → evita 12×N fetches).
 *
 *   DATO VIVO (endpoint del módulo Turismo):
 *     · Sol y playa  → /api/turismo/ccaa (costero) + /api/turismo/estacionalidad
 *     · Urbano       → /api/turismo/destinos?tipo=ciudad
 *     · Rural/nat.   → /api/turismo/ocupacion (EOTR) + destinos rural/naturaleza
 *     · Cruceros     → /api/turismo/cruceros  (ENLAZA a /puertos, no duplica)
 *     · Cultural     → /api/turismo/destinos?tipo=cultural (+ contexto curado)
 *   CURADO + DATADO (fuente + fecha, cifras públicas · sin endpoint propio):
 *     · MICE · salud/wellness · deportivo (esquí/golf) · gastronómico ·
 *       religioso (Camino) · idiomático · shopping (gastro y shopping anclan
 *       además el gasto vivo de INE EGATUR).
 *
 * Reglas (spec T7): edita SOLO esta vista + sub-componentes Tipos*; no toca
 * TurismoShell, lib/, app/api/, sectorial-data.ts. Degradación honesta. Cero
 * emojis · Unicode geométrico.
 */
import { useUrlState } from '@/lib/useUrlState'
import { ACCENT } from './TiposShared'
import type { TipoId } from './TiposCatalog'
import { TIPOS_NAV } from './TiposCatalog'
import { TiposNav } from './TiposNav'
import { TiposSolPlaya } from './TiposSolPlaya'
import { TiposUrbano } from './TiposUrbano'
import { TiposRuralNaturaleza } from './TiposRuralNaturaleza'
import { TiposCruceros } from './TiposCruceros'
import { TiposCultural } from './TiposCultural'
import { TiposCurado } from './TiposCurado'

const VALID = new Set<TipoId>(TIPOS_NAV.map((t) => t.id))
const N_LIVE = TIPOS_NAV.filter((t) => t.live).length

export function TiposTurismoView() {
  const [ttRaw, setTt] = useUrlState<TipoId>('tt', 'solplaya')
  const tt: TipoId = VALID.has(ttRaw) ? ttRaw : 'solplaya'

  return (
    <div>
      {/* Intro · qué cubre esta vista + leyenda vivo/curado */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, #075985 100%)`,
          borderRadius: 14,
          padding: '20px 24px',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>
          TURISMO · TIPOS DE TURISMO
        </p>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Los doce tipos de turismo de España
        </h1>
        <p style={{ margin: 0, maxWidth: 760, fontSize: 12.5, lineHeight: 1.55, opacity: 0.92 }}>
          Una sección por tipo. Los tipos con fuente propia del módulo Turismo (sol y playa, urbano, rural, cruceros,
          cultural) traen indicadores en vivo; el resto se documenta con fichas curadas y datadas (fuente + fecha de
          cifras públicas). Cruceros enlaza al módulo Puertos sin duplicarlo. Nunca se inventan cifras.
        </p>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden="true" style={{ color: '#86EFAC' }}>◉</span> {N_LIVE} con dato vivo
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden="true" style={{ opacity: 0.8 }}>◍</span> {TIPOS_NAV.length - N_LIVE} curados + datados
          </span>
        </div>
      </section>

      {/* Sub-nav interna (nivel 3) */}
      <TiposNav active={tt} onSelect={setTt} />

      {/* Panel activo (lazy: solo se monta el seleccionado) */}
      {tt === 'solplaya' ? (
        <TiposSolPlaya />
      ) : tt === 'urbano' ? (
        <TiposUrbano />
      ) : tt === 'rural' ? (
        <TiposRuralNaturaleza />
      ) : tt === 'cruceros' ? (
        <TiposCruceros />
      ) : tt === 'cultural' ? (
        <TiposCultural />
      ) : (
        <TiposCurado id={tt} />
      )}
    </div>
  )
}

export default TiposTurismoView
