'use client'
/**
 * Dashboard Sector Banca & Seguros · World Bank financial indicators.
 * Auto-refresh 60 min.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_BANCA, REGULADORES_BANCA, AREAS_BANCA, PROGRAMAS_BANCA,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#1F4E8C'
const ACCENT_DARK = '#0d2e58'

interface Resumen {
  kpis: {
    credito_pib_pct: number | null; credito_pib_year?: number
    npl_pct: number | null; npl_year?: number
    bank_capital_pct: number | null; bank_capital_year?: number
  }
  serie_credito: Array<{ t: string; v: number | null }>
  serie_npl: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export default function SectorBancaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    const r = await fetch('/api/sectores/banca/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setUpdatedAt(new Date())
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 60 * 60 * 1000); return () => clearInterval(t) }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · BANCA & SEGUROS · WORLD BANK INDICATORS"
          title="Sistema financiero español en datos abiertos"
          sub="Crédito al sector privado · ratio NPL · capital bancario · 10 entidades cotizadas (Santander, BBVA, CaixaBank, Sabadell, Bankinter, Mapfre…) y marco regulatorio (BdE, CNMV, DGSFP, BCE, EBA, EIOPA)."
          updatedAt={updatedAt} fetchMs={data?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
            <HeroKPI label={`Crédito al privado (${data?.kpis.credito_pib_year || ''})`} value={data?.kpis.credito_pib_pct} unit="% PIB" decimals={1} accent="#7DD3FC"/>
            <HeroKPI label={`NPL ratio (${data?.kpis.npl_year || ''})`} value={data?.kpis.npl_pct} unit="%" decimals={2} accent="#FCA5A5" sub="Préstamos morosos"/>
            <HeroKPI label={`Capital bancario (${data?.kpis.bank_capital_year || ''})`} value={data?.kpis.bank_capital_pct} unit="% activos" decimals={1} accent="#86EFAC"/>
            <HeroKPI label="Entidades cotizadas" value={EMPRESAS_BANCA.filter(e => e.ticker !== '—').length} unit="" accent="#FCD34D" sub="IBEX + selectivos"/>
          </>}
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Crédito al sector privado · % del PIB" subtitle="Banco Mundial · serie histórica desde 2010">
            {data && <SerieLineChart points={data.serie_credito} color={ACCENT} formatY={n => `${n.toFixed(0)}%`}/>}
          </Panel>
          <Panel title="NPL · préstamos morosos" subtitle="Banco Mundial · % sobre total préstamos">
            {data && <SerieLineChart points={data.serie_npl} color="#DC2626" formatY={n => `${n.toFixed(1)}%`}/>}
          </Panel>
        </div>

        <Panel title="Programas y políticas activas" subtitle="Recargo · Bono Sequía · SAREB · Digitalización" marginBottom>
          <ProgramasGrid programas={PROGRAMAS_BANCA} columns={4}/>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas cotizadas del sector" subtitle={`${EMPRESAS_BANCA.length} entidades · IBEX 35 y selectivos`}>
            <EmpresasGrid empresas={EMPRESAS_BANCA} accent={ACCENT}/>
          </Panel>
          <Panel title="Reguladores y supervisores" subtitle="Marco institucional banca + seguros">
            <RegLista reguladores={REGULADORES_BANCA}/>
          </Panel>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 66 · Servicios financieros y de seguros">
            <LicitacionesShortcut cpv_div="66" label="financieros y seguros"/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas areas={AREAS_BANCA}/>
          </Panel>
        </div>
      </main>
    </div>
  )
}
