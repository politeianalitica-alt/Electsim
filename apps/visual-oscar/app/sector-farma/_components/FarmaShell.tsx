'use client'
/**
 * <FarmaShell /> · Farma v3 · Sprint F1
 *
 * Shell de navegación con 7 sub-tabs deep-linkables (?fr=).
 *
 * Default = 'global' · landing que PRESERVA el dashboard original
 * (CIMA AEMPS · KPIs · desabastecimientos · ranking labs · ATC · buscador
 * · empresas · reguladores · áreas · intel panel · cuaderno).
 *
 * Lazy mount: sólo se monta la vista de la sección activa.
 *
 *   - 'global'             → <FarmaGlobalView />          (CIMA + buscador)
 *   - 'catalogo'           → <FarmaCatalogoView />        (stub V1 + V2)
 *   - 'desabastecimientos' → <FarmaDesabastecimientosView /> (stub V1 + V2)
 *   - 'pipeline'           → <FarmaPipelineView />        (ClinicalTrials.gov)
 *   - 'mercado'            → <FarmaMercadoView />         (cotizadas IBEX)
 *   - 'gasto'              → <FarmaGastoView />           (Eurostat gasto+acceso)
 *   - 'regulacion'         → <FarmaRegulacionView />      (AEMPS+EMA+reguladores)
 *
 * Sin emojis. Color principal del sector farma: azul cian #0EA5E9.
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { FarmaGlobalView } from './FarmaGlobalView'
import { FarmaPipelineView } from './FarmaPipelineView'
import { FarmaMercadoView } from './FarmaMercadoView'
import { FarmaGastoView } from './FarmaGastoView'
import { FarmaRegulacionView } from './FarmaRegulacionView'
import { FarmaCatalogoView, FarmaDesabastecimientosView } from './FarmaStub'
import type { FarmaTabId } from '@/lib/farma/catalogos'

interface SeccionTab {
  id: FarmaTabId
  label: string
  glyph: string
  desc: string
}

const SECCIONES: SeccionTab[] = [
  { id: 'global',             label: 'Visión Global',     glyph: '◉', desc: 'CIMA · desabastecimientos · ATC · buscador' },
  { id: 'catalogo',           label: 'Catálogo',          glyph: '⊞', desc: 'Buscador profundo CIMA · ATC' },
  { id: 'desabastecimientos', label: 'Desabastecimientos',glyph: '⊟', desc: 'AEMPS · EMA Shortages cruce' },
  { id: 'pipeline',           label: 'Pipeline I+D',      glyph: '⬡', desc: 'ClinicalTrials.gov · ensayos en España' },
  { id: 'mercado',            label: 'Mercado',           glyph: '◍', desc: 'Cotizadas · CNMV · áreas terapéuticas' },
  { id: 'gasto',              label: 'Gasto y acceso',    glyph: '◐', desc: 'Eurostat · gasto · acceso medicamentos' },
  { id: 'regulacion',         label: 'Regulación',        glyph: '✦', desc: 'AEMPS · EMA RSS · programas + PERTE' },
]

export default function FarmaShell() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useUrlState<FarmaTabId>('fr', 'global')
  const activa = SECCIONES.find((s) => s.id === tab) ?? SECCIONES[0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      {/* Barra superior · sección farma (nivel 1) · subrayado limpio */}
      <nav
        aria-label="Sección del sector farmacéutico"
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
                title={s.desc}
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
        {/* Contenido (nivel 2 · lazy) */}
        {activa.id === 'global' ? (
          <FarmaGlobalView />
        ) : activa.id === 'catalogo' ? (
          <FarmaCatalogoView />
        ) : activa.id === 'desabastecimientos' ? (
          <FarmaDesabastecimientosView />
        ) : activa.id === 'pipeline' ? (
          <FarmaPipelineView />
        ) : activa.id === 'mercado' ? (
          <FarmaMercadoView />
        ) : activa.id === 'gasto' ? (
          <FarmaGastoView />
        ) : (
          <FarmaRegulacionView />
        )}
      </main>
    </div>
  )
}
