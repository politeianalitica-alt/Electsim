'use client'
import './macro.css'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useMacroDataset } from '@/hooks/useMacroDataset'
import type { Indic } from '@/data/macro-fixture'
import { useUrlState } from '@/lib/useUrlState'
import { MacroShell } from '@/components/macro/MacroShell'
import { TAB_IDS, type MacroTabId } from '@/lib/macro/sources-matrix'
import { SubtabContent } from '@/components/macro/pulso/SubtabContent'

// Termómetro score 0-100 desde KPIs · cada indicador suma/resta puntos
function calcTermometro(kpis: Indic[]) {
  let score = 50
  for (const k of kpis) {
    const isGood = k.dir === k.good || k.dir === 'flat'
    score += isGood ? 4 : -3
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

// Selecciona 4 KPIs flash para el hero compacto
function getFlashKpis(kpis: Indic[]): { label: string; value: string; unit?: string; direction?: 'up' | 'down' | 'flat' }[] {
  const wanted = ['pib', 'paro', 'ipc', 'prima_riesgo']
  return wanted.map((id) => {
    const k = kpis.find((x) => x.id === id)
    if (!k) return { label: id.toUpperCase(), value: '—' }
    return {
      label: k.l.toUpperCase(),
      value: k.v,
      unit: k.unidad,
      direction: k.dir as 'up' | 'down' | 'flat',
    }
  })
}

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

  const { kpis } = useMacroDataset()
  const termometro = useMemo(() => calcTermometro(kpis || []), [kpis])
  const flashKpis = useMemo(() => getFlashKpis(kpis || []), [kpis])

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
          thermometerScore={termometro}
          flashKpis={flashKpis}
        >
          {/* Las 15 subtabs ahora renderizan via SubtabContent (unified architecture) */}
          <SubtabContent subtabSlug={safeActiveTab} showHeader={false} />
        </MacroShell>

        <footer style={{ marginTop: 28, padding: '14px 0', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Economía · Politeia Analítica · 15 dimensiones macro-financieras profesionales · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
