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
import {
  ViviendaMercadoView,
  ViviendaPoliticaView,
  ViviendaTuristicaView,
  ViviendaSostenibilidadView,
} from './ViviendaStub'
import type { ViviendaTabId } from '@/lib/vivienda/catalogos'

const ACCENT = '#DB2777' // pink-600 · color histórico del sector vivienda

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
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* ───── Barra superior · sección de vivienda (nivel 1) ───── */}
        <nav
          aria-label="Sección del sector vivienda"
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
