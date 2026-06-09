'use client'
/**
 * <TurismoShell /> · Turismo v3 · Sprint T1
 *
 * Navegación de 2 niveles para /sector-turismo (mismo patrón que EnergiaShell).
 * El primer nivel es una barra superior con las 7 secciones del sector. La
 * sección activa se controla con `?turismo=` en la URL (deep-linkable,
 * SSR-prefetch friendly) usando el hook `useUrlState` existente.
 *
 * Default = 'global' · la landing <VisionGlobalTurismoView /> (preserva los
 * 4 KPIs hero + los 2 gráficos FRONTUR/EOH de la página plana anterior).
 *
 * Lazy mount: solo se monta la vista de la sección activa (igual que
 * EnergiaShell), evitando 7×N fetches al cargar.
 *
 *   - 'global'       → <VisionGlobalTurismoView /> (cuadro ejecutivo · base viva T1)
 *   - 'demanda'      → <DemandaMercadosView />     (FRONTUR por mercado · EGATUR · T4)
 *   - 'alojamiento'  → <AlojamientoView />         (ocupación por tipo · ADR/RevPAR · T5)
 *   - 'destinos'     → <DestinosTerritorioView />  (mapa CCAA · destinos · tasa · T6)
 *   - 'tipos'        → <TiposTurismoView />        (sol&playa · MICE · cruceros · … · T7)
 *   - 'conectividad' → <ConectividadView />        (AENA · aerolíneas · cruceros · T8)
 *   - 'economico'    → <ImpactoEconomicoView />    (%PIB · empleo · empresas · T9)
 *
 * Cero emojis (CLAUDE.md §0.5): caracteres Unicode geométricos (◉ ◍ ▤ ◔ ◫ ⟶).
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { VisionGlobalTurismoView } from './VisionGlobalTurismoView'
import { DemandaMercadosView } from './DemandaMercadosView'
import { AlojamientoView } from './AlojamientoView'
import { DestinosTerritorioView } from './DestinosTerritorioView'
import { TiposTurismoView } from './TiposTurismoView'
import { ConectividadView } from './ConectividadView'
import { ImpactoEconomicoView } from './ImpactoEconomicoView'

/** Identificadores de sección (valor del searchParam `?turismo=`). */
export type TurismoTab =
  | 'global'
  | 'demanda'
  | 'alojamiento'
  | 'destinos'
  | 'tipos'
  | 'conectividad'
  | 'economico'

interface SeccionTab {
  id: TurismoTab
  label: string
  /** Marca Unicode (no emoji) para la barra. */
  glyph: string
  desc: string
}

const SECCIONES: SeccionTab[] = [
  { id: 'global',       label: 'Visión Global',     glyph: '◉', desc: 'Cuadro ejecutivo · FRONTUR + EOH' },
  { id: 'demanda',      label: 'Demanda y mercados', glyph: '◍', desc: 'Mercados emisores · gasto' },
  { id: 'alojamiento',  label: 'Alojamiento',        glyph: '▤', desc: 'Ocupación por tipo · ADR/RevPAR' },
  { id: 'destinos',     label: 'Destinos y territorio', glyph: '◔', desc: 'Mapa CCAA · destinos · tasa' },
  { id: 'tipos',        label: 'Tipos de turismo',   glyph: '◫', desc: 'Sol&playa · MICE · cruceros · …' },
  { id: 'conectividad', label: 'Conectividad',       glyph: '⟶', desc: 'AENA · aerolíneas · cruceros' },
  { id: 'economico',    label: 'Impacto económico',  glyph: '◈', desc: '%PIB · empleo · empresas' },
]

export default function TurismoShell() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useUrlState<TurismoTab>('turismo', 'global')
  const activa = SECCIONES.find((s) => s.id === tab) ?? SECCIONES[0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      {/* ───── Barra superior · sección de turismo (nivel 1) ───── */}
      <nav
        aria-label="Sección de turismo"
        style={{
          position: 'sticky',
          top: 44,
          zIndex: 40,
          background: 'rgba(251,251,253,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: '0 auto',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {SECCIONES.map((s) => {
            const active = s.id === activa.id
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1d1d1f' : '#6e6e73',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #1d1d1f' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-text)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </nav>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* ───── Contenido de la sección activa (nivel 2 · lazy) ───── */}
        {activa.id === 'global' ? (
          <VisionGlobalTurismoView />
        ) : activa.id === 'demanda' ? (
          <DemandaMercadosView />
        ) : activa.id === 'alojamiento' ? (
          <AlojamientoView />
        ) : activa.id === 'destinos' ? (
          <DestinosTerritorioView />
        ) : activa.id === 'tipos' ? (
          <TiposTurismoView />
        ) : activa.id === 'conectividad' ? (
          <ConectividadView />
        ) : (
          <ImpactoEconomicoView />
        )}
      </main>
    </div>
  )
}
