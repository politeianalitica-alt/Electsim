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

const ACCENT = '#0EA5E9'

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
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* Barra superior · sección farma (nivel 1) */}
        <nav
          aria-label="Sección del sector farmacéutico"
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
                  minWidth: 142,
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
