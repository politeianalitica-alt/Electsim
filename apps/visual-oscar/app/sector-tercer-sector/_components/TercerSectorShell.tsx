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

const ACCENT = '#16A34A'

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
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* ───── Barra superior · sección del tercer sector (nivel 1) ───── */}
        <nav
          aria-label="Sección del tercer sector"
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
