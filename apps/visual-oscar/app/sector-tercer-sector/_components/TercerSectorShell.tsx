'use client'
/**
 * <TercerSectorShell /> · Tercer Sector v3 · Sprint TS1
 *
 * Navegación de 2 niveles para /sector-tercer-sector (mismo patrón que
 * EnergiaShell / TurismoShell). El primer nivel es una barra superior con las 6
 * secciones del sector. La sección activa se controla con `?ts=` en la URL
 * (deep-linkable, SSR-prefetch friendly) usando el hook `useUrlState` existente.
 *
 * Default = 'global' · la landing <TSVisionGlobalView /> que PRESERVA los KPIs
 * hero + el panel IATI (`/api/iati/spain-overview`) de la página plana anterior,
 * para no perder funcionalidad viva.
 *
 * Lazy mount: solo se monta la vista de la sección activa (igual que
 * EnergiaShell / TurismoShell), evitando 6×N fetches al cargar.
 *
 *   - 'global'        → <TSVisionGlobalView />    (visión global · KPIs + IATI · TS1/TS3)
 *   - 'organizaciones'→ <TSOrganizacionesView />  (directorio ONGs dinámico · TS4)
 *   - 'cooperacion'   → <TSCooperacionView />     (cooperación internacional IATI · TS5)
 *   - 'financiacion'  → <TSFinanciacionView />    (BDNS · EU grants · EIB · IRPF · TS6)
 *   - 'licitaciones'  → <TSLicitacionesView />    (agregador multinivel + pliegos · TS7)
 *   - 'contexto'      → <TSContextoView />        (macro · marco regulatorio · TS8)
 *
 * Cero emojis (CLAUDE.md §0.5): caracteres Unicode geométricos (◉ ◍ ⬡ ◈ ⊞ ◔).
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { TSVisionGlobalView } from './TSVisionGlobalView'
import { TSOrganizacionesView } from './TSOrganizacionesView'
import { TSCooperacionView } from './TSCooperacionView'
import { TSFinanciacionView } from './TSFinanciacionView'
import { TSLicitacionesView } from './TSLicitacionesView'
import { TSContextoView } from './TSContextoView'

/** Identificadores de sección (valor del searchParam `?ts=`). */
export type TercerSectorTab =
  | 'global'
  | 'organizaciones'
  | 'cooperacion'
  | 'financiacion'
  | 'licitaciones'
  | 'contexto'

interface SeccionTab {
  id: TercerSectorTab
  label: string
  /** Marca Unicode (no emoji) para la barra. */
  glyph: string
  desc: string
}

const SECCIONES: SeccionTab[] = [
  { id: 'global',         label: 'Visión Global',     glyph: '◉', desc: 'Tamaño del sector · IATI · financiación' },
  { id: 'organizaciones', label: 'Organizaciones',    glyph: '◍', desc: 'Directorio de ONGs y fundaciones' },
  { id: 'cooperacion',    label: 'Cooperación',       glyph: '⬡', desc: 'IATI · países · sectores DAC' },
  { id: 'financiacion',   label: 'Financiación',      glyph: '◈', desc: 'BDNS · EU grants · EIB · IRPF 0,7%' },
  { id: 'licitaciones',   label: 'Licitaciones',      glyph: '⊞', desc: 'Multinivel · análisis de pliegos' },
  { id: 'contexto',       label: 'Contexto e impacto', glyph: '◔', desc: 'Macro · marco regulatorio' },
]

export default function TercerSectorShell() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useUrlState<TercerSectorTab>('ts', 'global')
  const activa = SECCIONES.find((s) => s.id === tab) ?? SECCIONES[0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      {/* ───── Barra de subpestañas · sección del tercer sector (nivel 1) ───── */}
      <nav
        aria-label="Sección del tercer sector"
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
          <TSVisionGlobalView />
        ) : activa.id === 'organizaciones' ? (
          <TSOrganizacionesView />
        ) : activa.id === 'cooperacion' ? (
          <TSCooperacionView />
        ) : activa.id === 'financiacion' ? (
          <TSFinanciacionView />
        ) : activa.id === 'licitaciones' ? (
          <TSLicitacionesView />
        ) : (
          <TSContextoView />
        )}
      </main>
    </div>
  )
}
