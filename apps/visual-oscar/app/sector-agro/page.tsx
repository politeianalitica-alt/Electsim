'use client'
/**
 * Dashboard Sector Agroalimentario & Rural · World Bank agricultural data.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_AGRO, REGULADORES_AGRO, AREAS_AGRO, PROGRAMAS_AGRO,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0d4626'

interface Resumen {
  kpis: {
    agro_pib_pct: number | null; agro_pib_year?: number
    tierra_agraria_pct: number | null; tierra_agraria_year?: number
    food_index: number | null; food_index_year?: number
    tierra_regada_pct: number | null; tierra_regada_year?: number
  }
  serie_pib_agro: Array<{ t: string; v: number | null }>
  serie_food_index: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export default function SectorAgroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    const r = await fetch('/api/sectores/agro/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setUpdatedAt(new Date())
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 60 * 60 * 1000); return () => clearInterval(t) }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · AGROALIMENTARIO & RURAL · WORLD BANK INDICATORS"
          title="Sector primario y agroindustria española"
          sub="Producción agraria · uso de la tierra · índice de producción alimentaria · regadío. Empresas cotizadas (Ebro Foods, Viscofan, Borges, Deoleo, Mercadona, DIA, Coren, Damm) y marco regulatorio nacional + UE (MAPA, AICA, AESAN, FEGA, DG AGRI, COAG/ASAJA/UPA)."
          updatedAt={updatedAt} fetchMs={data?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
            <HeroKPI label={`Agro % PIB (${data?.kpis.agro_pib_year || ''})`} value={data?.kpis.agro_pib_pct} unit="%" decimals={2} accent="#86EFAC"/>
            <HeroKPI label={`Tierra agraria (${data?.kpis.tierra_agraria_year || ''})`} value={data?.kpis.tierra_agraria_pct} unit="% sup." decimals={1} accent="#FCD34D"/>
            <HeroKPI label={`Índice prod. alim. (${data?.kpis.food_index_year || ''})`} value={data?.kpis.food_index} unit="" decimals={1} accent="#7DD3FC" sub="Base 2014-16=100"/>
            <HeroKPI label={`Tierra regada (${data?.kpis.tierra_regada_year || ''})`} value={data?.kpis.tierra_regada_pct} unit="% agraria" decimals={1} accent="#FCA5A5"/>
          </>}
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Agricultura · % del PIB" subtitle="Banco Mundial · serie histórica España">
            {data && <SerieLineChart points={data.serie_pib_agro} color={ACCENT} formatY={n => `${n.toFixed(2)}%`}/>}
          </Panel>
          <Panel title="Índice de producción de alimentos" subtitle="Banco Mundial · base 2014-2016 = 100">
            {data && <SerieLineChart points={data.serie_food_index} color="#7C3AED" formatY={n => n.toFixed(0)}/>}
          </Panel>
        </div>

        <Panel title="Programas y políticas activas" subtitle="PERTE Agro · PAC ecoesquemas · Plan Sequía · Ley Cadena" marginBottom>
          <ProgramasGrid programas={PROGRAMAS_AGRO} columns={4}/>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas tractoras del sector" subtitle={`${EMPRESAS_AGRO.length} compañías · cotizadas y cooperativas`}>
            <EmpresasGrid empresas={EMPRESAS_AGRO} accent={ACCENT}/>
          </Panel>
          <Panel title="Reguladores y operadores" subtitle="Marco institucional agro nacional + UE">
            <RegLista reguladores={REGULADORES_AGRO}/>
          </Panel>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 03 · Productos agrícolas, ganaderos, pesca">
            <LicitacionesShortcut cpv_div="03" label="agrícolas y pesca"/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas areas={AREAS_AGRO}/>
          </Panel>
        </div>
      </main>
    </div>
  )
}
