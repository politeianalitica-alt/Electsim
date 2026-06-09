'use client'
/**
 * <ViviendaShell /> · Vivienda v3 · Sprint V1
 *
 * Shell de navegación de 2 niveles para `/sector-vivienda`. Mismo patrón
 * que TercerSectorShell / EnergiaShell / TurismoShell. La sección activa
 * se controla con `?vv=` (deep-linkable, SSR-prefetch friendly).
 *
 * Default = 'global' · landing que PRESERVA los 4 KPIs hero + IPV + compraventas
 * + alquiler + cuaderno del rediseño anterior, sin perder datos visibles.
 *
 * Lazy mount: sólo se monta la vista de la sección activa.
 *
 *   - 'global'         → <ViviendaGlobalView />          (KPIs + IPV + compraventas + alquiler)
 *   - 'precios'        → <ViviendaPreciosView />         (V5 · próximamente)
 *   - 'mercado'        → <ViviendaMercadoView />         (V6 · próximamente)
 *   - 'alquiler'       → <ViviendaAlquilerView />        (V7 · ZMT + IPVA + Ley 12/2023)
 *   - 'politica'       → <ViviendaPoliticaView />        (V8 · Plan Estatal + NextGen + BDNS)
 *   - 'social'         → <ViviendaSocialView />          (V9 · vivienda social + tercer sector)
 *   - 'turistica'      → <ViviendaTuristicaView />       (V10 · VUT + DSA)
 *   - 'sostenibilidad' → <ViviendaSostenibilidadView />  (V10 · IDAE + rehab NextGen)
 *
 * Sin emojis (CLAUDE.md §0.5): caracteres Unicode geométricos.
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { ViviendaGlobalView } from './ViviendaGlobalView'
import { ViviendaSocialView } from './ViviendaSocialView'
import { ViviendaPreciosView } from './ViviendaPreciosView'
import { ViviendaAlquilerView } from './ViviendaAlquilerView'
import { ViviendaPoliticaView } from './ViviendaPoliticaView'
import { ViviendaMercadoView, ViviendaTuristicaView, ViviendaSostenibilidadView } from './ViviendaStub'
import type { ViviendaTabId } from '@/lib/vivienda/catalogos'

interface SeccionTab {
  id: ViviendaTabId
  label: string
  glyph: string
  desc: string
}

const SECCIONES: SeccionTab[] = [
  { id: 'global',         label: 'Visión Global',     glyph: '◉', desc: 'KPIs en vivo · IPV · compraventas · alquiler' },
  { id: 'precios',        label: 'Precios',           glyph: '⬡', desc: 'IPV · BdE real · Eurostat · esfuerzo' },
  { id: 'mercado',        label: 'Mercado',           glyph: '⊞', desc: 'Transmisiones · hipotecas · Catastro' },
  { id: 'alquiler',       label: 'Alquiler',          glyph: '◑', desc: 'IPVA · Ley 12/2023 · zonas tensionadas' },
  { id: 'politica',       label: 'Política',          glyph: '⊟', desc: 'Plan Estatal · NextGen · BDNS · AVS' },
  { id: 'social',         label: 'Vivienda social',   glyph: '◍', desc: 'Tercer sector · sinhogarismo · desahucios' },
  { id: 'turistica',      label: 'Turística',         glyph: '◐', desc: 'VUT · DSA · regulación CCAA' },
  { id: 'sostenibilidad', label: 'Sostenibilidad',    glyph: '✦', desc: 'Certificados · rehabilitación · bonos verdes' },
]

export default function ViviendaShell() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useUrlState<ViviendaTabId>('vv', 'global')
  const activa = SECCIONES.find((s) => s.id === tab) ?? SECCIONES[0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      {/* ───── Barra de subpestañas · sección de vivienda (nivel 1) · estilo subrayado limpio ───── */}
      <nav
        aria-label="Sección del sector vivienda"
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
          <ViviendaGlobalView onNavigate={setTab} />
        ) : activa.id === 'precios' ? (
          <ViviendaPreciosView />
        ) : activa.id === 'mercado' ? (
          <ViviendaMercadoView />
        ) : activa.id === 'alquiler' ? (
          <ViviendaAlquilerView />
        ) : activa.id === 'politica' ? (
          <ViviendaPoliticaView />
        ) : activa.id === 'social' ? (
          <ViviendaSocialView />
        ) : activa.id === 'turistica' ? (
          <ViviendaTuristicaView />
        ) : (
          <ViviendaSostenibilidadView />
        )}
      </main>
    </div>
  )
}
