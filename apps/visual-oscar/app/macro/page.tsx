'use client'
import './macro.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useUrlState } from '@/lib/useUrlState'
import { MacroShell } from '@/components/macro/MacroShell'
import { TAB_IDS, type MacroTabId } from '@/lib/macro/sources-matrix'
import { SubtabContent } from '@/components/macro/pulso/SubtabContent'

// Sprint N5 (2026-05-23): MacroShell ahora fetch el overview del subtab activo
// y calcula su propio score + KPIs específicos. Ya NO se le pasan thermometerScore
// ni flashKpis estáticos desde aquí. El hook useMacroDataset (fixture estático
// con indicadores generales) queda como legacy para otras páginas que lo usen.

/**
 * Sprint N1 (2026-05-22): las 15 subtabs unifican arquitectura.
 * Antes las 10 primeras usaban custom Tab components (PulsoMacroTab,
 * RegimenMonetarioTab, ...) de 200-560 LoC cada uno. Ahora todas usan
 * `<SubtabContent subtabSlug>` igual que las 5 nuevas (Sprint F+).
 *
 * Los legacy Tab components quedan archivados en
 * `components/macro/tabs/legacy/` por si hay que volver atrás puntualmente.
 *
 * Mejoras automáticas obtenidas por la migración:
 *  - Score 0-100 (TermometroPulso) basado en thresholds del catálogo
 *  - HeroEjecutivo con IA Gemini auto-load + diagnóstico transversal
 *  - DomainHero específico (Sprint N2 lo extenderá a las 10)
 *  - AlertasMacro derivadas del catálogo
 *  - FamilyKpiGrid agrupando indicadores por familia
 *  - CalendarioReleases próximas publicaciones
 *  - CCAAHexmap territorial con selector métricas
 *  - DatosGobRadar con DatasetAnalyzer expandible (CSV inline)
 *  - RadarChart de dimensiones (top 8 señales)
 *  - Análisis IA auto-loading por gráfica
 *
 * Excepción · Mercados-activos: el legacy tenía 5 paneles enriquecidos
 * (sector breakdown via COMPANY_CATALOG + yield slope + market breadth +
 * FX matrix + commodity heatmap). Extraídos a `<MercadosEnrichmentBlock>`
 * que SubtabContent renderiza condicional cuando subtabSlug='mercados-activos'.
 */
export default function MacroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [activeTab, setActiveTab] = useUrlState<MacroTabId>('tab', 'pulso-macro')
  // Validar que el tab esté en la lista (defensa contra URL corrupta)
  const safeActiveTab: MacroTabId = (TAB_IDS as readonly string[]).includes(activeTab) ? activeTab : 'pulso-macro'

  return (
    <div className="mac-root">
      <AppHeader />
      <main className="mac-main" style={{ paddingTop: 16 }}>
        <MacroShell
          activeId={safeActiveTab}
          onTabChange={setActiveTab}
        >
          {/* Sprint N5: key={safeActiveTab} fuerza remontaje completo del subtab
              cuando cambia el slug, evitando que cualquier estado interno (useRef,
              cache local) persista entre tabs y muestre datos del tab anterior. */}
          <SubtabContent key={safeActiveTab} subtabSlug={safeActiveTab} showHeader={false} />
        </MacroShell>

        <footer style={{ marginTop: 28, padding: '14px 0', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Economía · Politeia Analítica · 15 dimensiones macro-financieras profesionales · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
