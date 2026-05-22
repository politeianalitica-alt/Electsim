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
import { PulsoMacroTab } from '@/components/macro/tabs/PulsoMacroTab'
import { RegimenMonetarioTab } from '@/components/macro/tabs/RegimenMonetarioTab'
import { MargenFiscalTab } from '@/components/macro/tabs/MargenFiscalTab'
import { DependenciasExternasTab } from '@/components/macro/tabs/DependenciasExternasTab'
import { RiesgoSistemicoTab } from '@/components/macro/tabs/RiesgoSistemicoTab'
import { MercadosActivosTab } from '@/components/macro/tabs/MercadosActivosTab'
import { FlujosCapitalTab } from '@/components/macro/tabs/FlujosCapitalTab'
import { ProductividadCompetitividadTab } from '@/components/macro/tabs/ProductividadCompetitividadTab'
import { EmpresasBeneficiosTab } from '@/components/macro/tabs/EmpresasBeneficiosTab'
import { HogaresEmpleoViviendaTab } from '@/components/macro/tabs/HogaresEmpleoViviendaTab'
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
          {safeActiveTab === 'pulso-macro' && <PulsoMacroTab />}
          {safeActiveTab === 'regimen-monetario' && <RegimenMonetarioTab />}
          {safeActiveTab === 'margen-fiscal' && <MargenFiscalTab />}
          {safeActiveTab === 'dependencias-externas' && <DependenciasExternasTab />}
          {safeActiveTab === 'riesgo-sistemico' && <RiesgoSistemicoTab />}
          {safeActiveTab === 'mercados-activos' && <MercadosActivosTab />}
          {safeActiveTab === 'flujos-capital' && <FlujosCapitalTab />}
          {safeActiveTab === 'productividad-competitividad' && <ProductividadCompetitividadTab />}
          {safeActiveTab === 'empresas-beneficios' && <EmpresasBeneficiosTab />}
          {safeActiveTab === 'hogares-empleo-vivienda' && <HogaresEmpleoViviendaTab />}
          {safeActiveTab === 'demografia-territorio' && <SubtabContent subtabSlug="demografia-territorio" showHeader={false} />}
          {safeActiveTab === 'sociedad-bienestar' && <SubtabContent subtabSlug="sociedad-bienestar" showHeader={false} />}
          {safeActiveTab === 'medio-rural' && <SubtabContent subtabSlug="medio-rural" showHeader={false} />}
          {safeActiveTab === 'cultura-ocio' && <SubtabContent subtabSlug="cultura-ocio" showHeader={false} />}
          {safeActiveTab === 'instituciones-estado' && <SubtabContent subtabSlug="instituciones-estado" showHeader={false} />}
        </MacroShell>

        <footer style={{ marginTop: 28, padding: '14px 0', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Economía · Politeia Analítica · 15 dimensiones macro-financieras profesionales · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
