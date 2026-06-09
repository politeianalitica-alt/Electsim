'use client'
/**
 * /sector-defensa/teatros
 *
 * Comparador regional / teatros operacionales.
 * Agrupa países por área de tensión y muestra balance de poder agregado.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { TEATROS, getPaisesEnTeatro, type PaisMilitar } from '@/lib/defense/military-catalog'

const TEATRO_INFO: Record<keyof typeof TEATROS, { color: string; descripcion: string; tensiones: string[] }> = {
  'Indo-Pacífico': {
    color: '#0EA5E9',
    descripcion: 'Competición sistémica USA–China · disputa Taiwán · Mar Sur China · AUKUS/QUAD vs Sino-ruso',
    tensiones: ['Estrecho Taiwán', 'Mar Sur China (Spratly, Paracelso)', 'Senkaku/Diaoyu', 'Línea LAC India-China', 'Programa nuclear Corea Norte'],
  },
  'Flanco oriental OTAN': {
    color: '#DC2626',
    descripcion: 'Guerra Ucrania · disuasión vs Rusia · frontera 2.500 km · refuerzo eFP/VJTF',
    tensiones: ['Guerra Ucrania (Donbass, Crimea)', 'Kaliningrado / Suwałki Gap', 'Mar Báltico', 'Ártico (NSR)', 'Bielorrusia nuclearizada'],
  },
  'MENA': {
    color: '#F97316',
    descripcion: 'Guerra Gaza/Líbano · disuasión Israel-Irán · Mar Rojo (Hutíes) · normalización Acuerdos Abraham',
    tensiones: ['Gaza/Líbano sur', 'Confrontación Israel-Irán', 'Mar Rojo/Bab-el-Mandeb', 'Yemen', 'Sahara Occidental', 'Sahel post-Sahel'],
  },
  'Europa Occidental': {
    color: '#1F4E8C',
    descripcion: 'Bloque OTAN/UE · industria defensa europea · FCAS/GCAP/MGCS · Compromiso 2-5% PIB',
    tensiones: ['Apoyo a Ucrania', 'Defensa común UE', 'Carrera industrial (FCAS vs GCAP)'],
  },
  'Latinoamérica': {
    color: '#16A34A',
    descripcion: 'No alineamiento · Brasil potencia regional · crimen organizado transnacional',
    tensiones: ['Crimen organizado (CJNG, Sinaloa)', 'Disputa Malvinas', 'Venezuela/Guyana (Esequibo)'],
  },
  'África Subsahariana': {
    color: '#5D4037',
    descripcion: 'Insurgencias yihadistas (Boko Haram, ISWAP, JNIM) · golpes militares Sahel · presencia rusa Africa Corps',
    tensiones: ['Boko Haram/ISWAP (lago Chad)', 'JNIM (Sahel)', 'Cabo Delgado (Mozambique)', 'RDC/Ruanda'],
  },
}

export default function TeatrosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [teatroActivo, setTeatroActivo] = useState<keyof typeof TEATROS>('Indo-Pacífico')

  const teatros = Object.keys(TEATROS) as Array<keyof typeof TEATROS>

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · BALANCE REGIONAL
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Teatros operacionales · balance de poder
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          6 teatros geopolíticos · balance de poder agregado por área de tensión · ratios cuantitativos
        </p>
      </div>

      {/* SELECTOR TEATROS */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${teatros.length}, 1fr)`, gap: 6, marginBottom: 16 }}>
        {teatros.map(t => {
          const active = teatroActivo === t
          const info = TEATRO_INFO[t]
          return (
            <button key={t} onClick={() => setTeatroActivo(t)}
              style={{
                padding: '10px 12px', borderRadius: 10, border: '1px solid',
                borderColor: active ? info.color : '#DDDDE3',
                background: active ? info.color : '#fff',
                color: active ? '#fff' : '#1d1d1f',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 0.15s',
              }}>
              <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75 }}>TEATRO</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700 }}>{t}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, opacity: 0.8 }}>{TEATROS[t].length} países</p>
            </button>
          )
        })}
      </div>

      <TeatroDetalle teatro={teatroActivo}/>

      <SectorMapPreview sector="defensa" marginTop={28} />
    </div>
  )
}

function TeatroDetalle({ teatro }: { teatro: keyof typeof TEATROS }) {
  const info = TEATRO_INFO[teatro]
  const paises = getPaisesEnTeatro(teatro)

  // Agregados
  const stats = {
    n: paises.length,
    gasto_USD_b: paises.reduce((s, p) => s + p.gasto_militar_USD_b, 0),
    efectivos: paises.reduce((s, p) => s + p.efectivos_activos, 0),
    portaaviones: paises.reduce((s, p) => s + p.capacidades.portaaviones, 0),
    submarinos_nuc: paises.reduce((s, p) => s + p.capacidades.submarinos_nucleares, 0),
    cabezas_nuc: paises.reduce((s, p) => s + (typeof p.inventario.cabezas_nucleares === 'number' ? p.inventario.cabezas_nucleares : 0), 0),
    aeronaves_combate: paises.reduce((s, p) => s + (p.inventario.aeronaves_combate || 0), 0),
    carros_combate: paises.reduce((s, p) => s + (p.inventario.carros_combate || 0), 0),
    buques_superficie: paises.reduce((s, p) => s + (p.inventario.buques_superficie || 0), 0),
  }

  return (
    <>
      {/* CONTEXTO TEATRO */}
      <section style={{
        background: `linear-gradient(135deg, ${info.color}DD 0%, ${info.color}99 100%)`,
        borderRadius: 16, padding: '22px 28px', marginBottom: 14, color: '#fff',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{teatro}</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.95, lineHeight: 1.5 }}>{info.descripcion}</p>
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>TENSIONES ACTIVAS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {info.tensiones.map(t => (
              <span key={t} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs AGREGADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <KPI label="PAÍSES EN TEATRO" value={String(stats.n)} color={info.color}/>
        <KPI label="GASTO MILITAR AGREGADO" value={`${stats.gasto_USD_b.toFixed(0)} bn$`} color="#1F4E8C"/>
        <KPI label="EFECTIVOS ACTIVOS" value={(stats.efectivos / 1_000_000).toFixed(2) + ' M'} color="#0EA5E9"/>
        <KPI label="CABEZAS NUCLEARES" value={stats.cabezas_nuc.toLocaleString('es-ES')} color="#7C3AED"/>
        <KPI label="PORTAAVIONES" value={String(stats.portaaviones)} color="#F97316"/>
        <KPI label="SUBMARINOS NUCLEARES" value={String(stats.submarinos_nuc)} color="#0F766E"/>
        <KPI label="AERONAVES COMBATE" value={stats.aeronaves_combate.toLocaleString('es-ES')} color="#0EA5E9"/>
        <KPI label="CARROS COMBATE" value={stats.carros_combate.toLocaleString('es-ES')} color="#5D4037"/>
      </div>

      {/* MATRIZ DE PAÍSES */}
      <Panel title={`${paises.length} países en ${teatro}`} subtitle="Balance comparativo · ordenados por gasto militar">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '2px solid #ECECEF' }}>
                <Th>País</Th>
                <Th right>Gasto USD bn</Th>
                <Th right>% PIB</Th>
                <Th right>Δ YoY</Th>
                <Th right>Efectivos</Th>
                <Th right>Aeronaves</Th>
                <Th right>Buques</Th>
                <Th right>Subs</Th>
                <Th right>Capacidades</Th>
                <Th right>Riesgo</Th>
              </tr>
            </thead>
            <tbody>
              {paises.sort((a, b) => b.gasto_militar_USD_b - a.gasto_militar_USD_b).map(p => {
                const riesgoColor = p.postura.nivel_riesgo === 'crítico' ? '#7F1D1D' : p.postura.nivel_riesgo === 'alto' ? '#DC2626' : p.postura.nivel_riesgo === 'elevado' ? '#F97316' : p.postura.nivel_riesgo === 'moderado' ? '#F59E0B' : '#16A34A'
                const yoyColor = p.variacion_yoy_pct > 10 ? '#16A34A' : p.variacion_yoy_pct > 0 ? '#0EA5E9' : '#DC2626'
                return (
                  <tr key={p.iso3} style={{ borderBottom: '1px solid #F5F5F7' }}>
                    <Td>
                      <Link href={`/sector-defensa/paises/${p.iso3}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
                        <span style={{ width: 28, height: 16, background: '#525258', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontFamily: 'monospace' }}>{p.iso3}</span>
                        <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{p.pais}</span>
                      </Link>
                    </Td>
                    <Td right><span style={{ fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>{p.gasto_militar_USD_b.toFixed(1)}</span></Td>
                    <Td right>{p.gasto_militar_pct_pib.toFixed(2)}%</Td>
                    <Td right><span style={{ color: yoyColor, fontWeight: 700 }}>{p.variacion_yoy_pct > 0 ? '+' : ''}{p.variacion_yoy_pct.toFixed(1)}%</span></Td>
                    <Td right>{(p.efectivos_activos / 1000).toFixed(0)}k</Td>
                    <Td right>{p.inventario.aeronaves_combate || '—'}</Td>
                    <Td right>{p.inventario.buques_superficie || '—'}</Td>
                    <Td right>{p.inventario.submarinos || '—'}</Td>
                    <Td right>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {p.capacidades.nuclear && <Chip color="#7C3AED">N</Chip>}
                        {p.capacidades.espacial && <Chip color="#0EA5E9">S</Chip>}
                        {p.capacidades.ciber === 'líder' && <Chip color="#16A34A">C+</Chip>}
                        {p.capacidades.ciber === 'avanzada' && <Chip color="#16A34A">C</Chip>}
                        {p.capacidades.portaaviones > 0 && <Chip color="#F97316">CV{p.capacidades.portaaviones}</Chip>}
                      </div>
                    </Td>
                    <Td right>
                      <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: `${riesgoColor}20`, color: riesgoColor, textTransform: 'uppercase' }}>{p.postura.nivel_riesgo}</span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* BALANCE DE PODER · gráfico horizontal */}
      <Panel title="Balance de poder · gasto militar relativo" subtitle="Distribución cuota de gasto del teatro" marginBottom>
        <BalanceBar paises={paises} color={info.color}/>
      </Panel>
    </>
  )
}

function BalanceBar({ paises, color }: { paises: PaisMilitar[]; color: string }) {
  const total = paises.reduce((s, p) => s + p.gasto_militar_USD_b, 0)
  const sorted = [...paises].sort((a, b) => b.gasto_militar_USD_b - a.gasto_militar_USD_b)
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        {sorted.map((p, i) => {
          const pct = (p.gasto_militar_USD_b / total) * 100
          if (pct < 0.5) return null
          return (
            <div key={p.iso3} style={{ flex: pct, background: shadeColor(color, i * -7), display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }} title={`${p.pais}: ${pct.toFixed(1)}%`}>
              {pct > 7 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{p.iso3}</span>}
            </div>
          )
        })}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 4 }}>
        {sorted.map(p => (
          <li key={p.iso3} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 6px', background: '#FAFAFA', borderRadius: 4 }}>
            <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{p.pais}</span>
            <span style={{ color: '#1F4E8C', fontWeight: 700 }}>{((p.gasto_militar_USD_b / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * (percent / 100))))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * (percent / 100))))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * (percent / 100))))
  return `rgb(${r}, ${g}, ${b})`
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ padding: '8px 10px', textAlign: right ? 'right' : 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</th>
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td style={{ padding: '7px 10px', textAlign: right ? 'right' : 'left', verticalAlign: 'middle' }}>{children}</td>
}
function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: color, color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{children}</span>
}
function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
