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

const ACCENT = '#0EA5E9'

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
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* ───── Barra superior · sección de turismo (nivel 1) ───── */}
        <nav
          aria-label="Sección de turismo"
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 18,
            overflowX: 'auto',
            background: '#fff',
            border: '1px solid #ECECEF',
            borderRadius: 14,
            padding: 4,
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
                  flex: '1 1 0',
                  minWidth: 132,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? ACCENT : 'transparent',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span aria-hidden="true" style={{ fontSize: 13, color: active ? '#fff' : ACCENT, opacity: active ? 1 : 0.85 }}>
                    {s.glyph}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.01em',
                      color: active ? '#fff' : '#1d1d1f',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    marginTop: 2,
                    color: active ? 'rgba(255,255,255,0.85)' : '#86868b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.desc}
                </div>
              </button>
            )
          })}
        </nav>

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
