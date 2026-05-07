'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import Hemicycle from '@/components/Hemicycle'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import BrainBriefing from '@/components/BrainBriefing'
import Sparkline from '@/components/Sparkline'


const PARTIES = [
  { name: 'PP',     pct: 32.1, color: '#0070D1', seats: 132 },
  { name: 'PSOE',   pct: 26.8, color: '#C01818', seats: 110 },
  { name: 'VOX',    pct: 12.4, color: '#63BE21', seats: 42  },
  { name: 'Sumar',  pct: 10.2, color: '#BF3F7E', seats: 35  },
  { name: 'ERC',    pct: 3.1,  color: '#FFAB00', seats: 11  },
  { name: 'Junts',  pct: 2.8,  color: '#00C4D4', seats: 7   },
  { name: 'PNV',    pct: 2.1,  color: '#078930', seats: 5   },
  { name: 'Bildu',  pct: 2.0,  color: '#4CAF50', seats: 4   },
  { name: 'CC',     pct: 1.4,  color: '#FFC107', seats: 2   },
  { name: 'BNG',    pct: 0.9,  color: '#5DC0D3', seats: 1   },
  { name: 'Otros',  pct: 6.2,  color: '#9E9E9E', seats: 1   },
]

const HEMI_DATASETS: Record<string, HParty[]> = {
  estimacion: [
    { id: 'pp',     name: 'PP',       color: '#1F4E8C', seats: 132 },
    { id: 'psoe',   name: 'PSOE',     color: '#E1322D', seats: 110 },
    { id: 'vox',    name: 'VOX',      color: '#5BA02E', seats: 42  },
    { id: 'sumar',  name: 'Sumar',    color: '#D43F8D', seats: 35  },
    { id: 'erc',    name: 'ERC',      color: '#E8A030', seats: 11  },
    { id: 'junts',  name: 'Junts',    color: '#1FA89B', seats: 7   },
    { id: 'pnv',    name: 'PNV',      color: '#7DB94B', seats: 5   },
    { id: 'bildu',  name: 'EH Bildu', color: '#3F7A3A', seats: 4   },
    { id: 'cc',     name: 'CC',       color: '#F2C43A', seats: 2   },
    { id: 'bng',    name: 'BNG',      color: '#5BB3D9', seats: 1   },
    { id: 'otros',  name: 'Otros',    color: '#C0C0C5', seats: 1   },
  ],
  g2023: [
    { id: 'pp',     name: 'PP',       color: '#1F4E8C', seats: 137 },
    { id: 'psoe',   name: 'PSOE',     color: '#E1322D', seats: 121 },
    { id: 'vox',    name: 'VOX',      color: '#5BA02E', seats: 33  },
    { id: 'sumar',  name: 'Sumar',    color: '#D43F8D', seats: 31  },
    { id: 'erc',    name: 'ERC',      color: '#E8A030', seats: 7   },
    { id: 'junts',  name: 'Junts',    color: '#1FA89B', seats: 7   },
    { id: 'bildu',  name: 'EH Bildu', color: '#3F7A3A', seats: 6   },
    { id: 'pnv',    name: 'PNV',      color: '#7DB94B', seats: 5   },
    { id: 'cc',     name: 'CC',       color: '#F2C43A', seats: 1   },
    { id: 'bng',    name: 'BNG',      color: '#5BB3D9', seats: 1   },
    { id: 'upn',    name: 'UPN',      color: '#0E7D8C', seats: 1   },
  ],
  g2019: [
    { id: 'psoe',   name: 'PSOE',     color: '#E1322D', seats: 120 },
    { id: 'pp',     name: 'PP',       color: '#1F4E8C', seats: 89  },
    { id: 'vox',    name: 'VOX',      color: '#5BA02E', seats: 52  },
    { id: 'sumar',  name: 'UP',       color: '#D43F8D', seats: 35  },
    { id: 'erc',    name: 'ERC',      color: '#E8A030', seats: 13  },
    { id: 'otros',  name: 'Cs',       color: '#FF8A00', seats: 10  },
    { id: 'junts',  name: 'JxC',      color: '#1FA89B', seats: 8   },
    { id: 'pnv',    name: 'PNV',      color: '#7DB94B', seats: 6   },
    { id: 'bildu',  name: 'EH Bildu', color: '#3F7A3A', seats: 5   },
    { id: 'cc',     name: 'CC',       color: '#F2C43A', seats: 2   },
    { id: 'bng',    name: 'BNG',      color: '#5BB3D9', seats: 1   },
    { id: 'upn',    name: 'Otros',    color: '#C0C0C5', seats: 9   },
  ],
}

const ALERTS = [
  { type: 'warning', text: 'PP supera el 33% en la última encuesta de Sigma Dos' },
  { type: 'info',    text: 'Sumar pierde 1.2 puntos en la media semanal' },
  { type: 'warning', text: 'Tensión parlamentaria sube a 42/100 en el Termómetro' },
  { type: 'info',    text: 'Nueva encuesta: El Mundo / GAD3 — Trabajo de campo: 22–24 abr' },
  { type: 'ok',      text: 'Bono español 10Y se estabiliza en 3.24%' },
  { type: 'warning', text: 'VOX mantiene intención de presentar moción de censura parcial' },
]

const POLLS = [
  { pollster: 'Sigma Dos',   client: 'El Mundo',         date: '24 abr', pp: 32.1, psoe: 26.8, vox: 12.4, sumar: 10.2, otros: 18.5 },
  { pollster: 'GAD3',        client: 'ABC',               date: '22 abr', pp: 31.8, psoe: 27.1, vox: 12.0, sumar: 10.5, otros: 18.6 },
  { pollster: 'CIS',         client: 'Gobierno',          date: '18 abr', pp: 30.2, psoe: 28.4, vox: 11.6, sumar: 11.0, otros: 18.8 },
  { pollster: 'Metroscopia', client: 'El País',           date: '15 abr', pp: 31.5, psoe: 27.0, vox: 12.8, sumar:  9.8, otros: 18.9 },
  { pollster: 'Electomanía', client: 'Autopromocionada',  date: '10 abr', pp: 32.4, psoe: 26.2, vox: 13.1, sumar:  9.5, otros: 18.8 },
]

const REGIONS = [
  { name: 'Andalucía',          lean: 'pp'    },
  { name: 'Aragón',             lean: 'pp'    },
  { name: 'Asturias',           lean: 'psoe'  },
  { name: 'Baleares',           lean: 'psoe'  },
  { name: 'Canarias',           lean: 'mixed' },
  { name: 'Cantabria',          lean: 'pp'    },
  { name: 'Castilla-La Mancha', lean: 'psoe'  },
  { name: 'Castilla y León',    lean: 'pp'    },
  { name: 'Cataluña',           lean: 'mixed' },
  { name: 'Extremadura',        lean: 'pp'    },
  { name: 'Galicia',            lean: 'pp'    },
  { name: 'La Rioja',           lean: 'pp'    },
  { name: 'Madrid',             lean: 'pp'    },
  { name: 'Murcia',             lean: 'pp'    },
  { name: 'Navarra',            lean: 'mixed' },
  { name: 'País Vasco',         lean: 'mixed' },
  { name: 'Valencia',           lean: 'psoe'  },
]

const LEAN_COLOR: Record<string, string> = {
  pp:    '#0070D1',
  psoe:  '#C01818',
  mixed: '#888',
}

const MACRO = [
  { label: 'Bono 10Y',       value: '3.24%',  delta: '+0.04',  dir: 'up',   good: 'down',
    data: [3.18,3.20,3.19,3.22,3.21,3.23,3.20,3.22,3.24,3.23,3.24] },
  { label: 'IBEX 35',        value: '11.240', delta: '+1.2%',  dir: 'up',   good: 'up',
    data: [10900,11050,10980,11100,11080,11150,11200,11180,11220,11240,11240] },
  { label: 'Euríbor',        value: '2.84%',  delta: '-0.06',  dir: 'down', good: 'down',
    data: [2.95,2.92,2.90,2.88,2.87,2.86,2.86,2.85,2.85,2.84,2.84] },
  { label: 'Prima de riesgo',value: '102 pb', delta: '+3 pb',  dir: 'up',   good: 'down',
    data: [94,96,95,97,98,99,98,100,101,102,102] },
  { label: 'IPC interanual', value: '2.9%',   delta: '-0.2 pp',dir: 'down', good: 'down',
    data: [3.5,3.4,3.3,3.2,3.1,3.1,3.0,3.0,2.9,2.9,2.9] },
  { label: 'Paro EPA',       value: '11.4%',  delta: '-0.3 pp',dir: 'down', good: 'down',
    data: [12.0,11.9,11.8,11.7,11.7,11.6,11.5,11.5,11.4,11.4,11.4] },
  { label: 'PIB interanual', value: '+2.7%',  delta: '+0.3 pp',dir: 'up',   good: 'up',
    data: [2.0,2.1,2.2,2.2,2.3,2.4,2.5,2.6,2.6,2.7,2.7] },
  { label: 'EUR / USD',      value: '1.084',  delta: '+0.6%',  dir: 'up',   good: 'up',
    data: [1.072,1.075,1.073,1.078,1.076,1.080,1.079,1.082,1.083,1.084,1.084] },
  { label: 'Brent',          value: '$84.20', delta: '-1.1%',  dir: 'down', good: 'down',
    data: [86.5,86.0,85.8,85.4,85.1,84.9,84.7,84.5,84.4,84.2,84.2] },
  { label: 'Confianza CIS',  value: '94.2',   delta: '+1.8',   dir: 'up',   good: 'up',
    data: [89.0,89.5,90.1,90.8,91.2,91.9,92.4,93.0,93.6,94.0,94.2] },
]

export default function DashboardPage() {
  const router = useRouter()
  const [currentPath] = useState('/dashboard')
  const [hemiDataset, setHemiDataset] = useState<keyof typeof HEMI_DATASETS>('estimacion')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  function logout() {
    clearTokens()
    router.push('/login')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ── Nav ── */}
      <AppHeader/>

      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ── Politeia Briefing (chat IA + preguntas predefinidas) ── */}
        <BrainBriefing/>

        {/* ── KPI row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Escaños PP',         value: '132',  sub: 'de 350 · +4 vs. ayer',    accent: '#0070D1' },
            { label: 'Escaños PSOE',       value: '110',  sub: 'de 350 · -2 vs. ayer',    accent: '#C01818' },
            { label: 'Distancia PP–PSOE',  value: '22',   sub: 'escaños · margen sólido', accent: '#8B5CF6' },
            { label: 'P(PP gobierna)',      value: '68%',  sub: 'probabilidad simulada',   accent: '#16A34A' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff', borderRadius: 16, padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${k.accent}`,
            }}>
              <p style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', color: k.accent, lineHeight: 1 }}>{k.value}</div>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '6px 0 0' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Vote bars + Alerts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Intención de voto</h2>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#16A34A', background: '#f0fdf4', borderRadius: 999, padding: '3px 10px', border: '1px solid #bbf7d0' }}>Media de encuestas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {PARTIES.map(p => (
                <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 48px 40px', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{p.name}</span>
                  <div style={{ height: 20, background: 'var(--bg-soft)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${(p.pct/36)*100}%`, height: '100%', background: p.color, borderRadius: 5 }}/>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 600, color: p.color, letterSpacing: '-0.01em' }}>{p.pct}%</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'right' }}>{p.seats}e</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Alertas activas</h2>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#D97706', background: '#fffbeb', borderRadius: 999, padding: '3px 10px', border: '1px solid #fde68a' }}>{ALERTS.length} alertas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALERTS.map((a, i) => (
                <div key={i} style={{
                  padding: '11px 13px', borderRadius: 11,
                  background: a.type === 'warning' ? '#fffbeb' : a.type === 'ok' ? '#f0fdf4' : '#f0f9ff',
                  borderLeft: `3px solid ${a.type === 'warning' ? '#D97706' : a.type === 'ok' ? '#16A34A' : '#0EA5E9'}`,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Hemicycle + Macro ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 18, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Hemiciclo</h2>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {([
                  { k: 'estimacion', label: 'Estimación 2026' },
                  { k: 'g2023',      label: 'Generales 2023' },
                  { k: 'g2019',      label: 'Generales 2019' },
                ] as const).map(o => {
                  const active = hemiDataset === o.k
                  return (
                    <button key={o.k} onClick={() => setHemiDataset(o.k)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border: 'none',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 160ms',
                    }}>{o.label}</button>
                  )
                })}
              </div>
            </div>
            <HemicycleAdvanced parties={HEMI_DATASETS[hemiDataset]}/>
          </div>

          <div onClick={() => router.push('/macro')} style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF', cursor: 'pointer', transition: 'box-shadow 200ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Indicadores macro</h2>
              <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>Ver todos →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 18px' }}>
              {MACRO.map(m => {
                const isGood = m.dir === m.good
                const deltaColor = isGood ? '#16A34A' : '#DC2626'
                return (
                  <div key={m.label} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: '#FAFAFB', border: '1px solid #ECECEF' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3a3a3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', lineHeight: 1.15 }}>{m.value}</div>
                      <div style={{ fontSize: 11, color: deltaColor, marginTop: 1, fontWeight: 500 }}>{m.dir === 'up' ? '↑' : '↓'} {m.delta}</div>
                    </div>
                    <Sparkline data={m.data} color={deltaColor}/>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Polls + Territory ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 18px' }}>Últimas encuestas</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  {['Empresa','Cliente','Fecha','PP','PSOE','VOX','Sumar','Otros'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0 6px 9px', fontWeight: 600, color: 'var(--ink-3)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POLLS.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '9px 6px', fontWeight: 600, color: 'var(--ink)' }}>{p.pollster}</td>
                    <td style={{ padding: '9px 6px', color: 'var(--ink-3)' }}>{p.client}</td>
                    <td style={{ padding: '9px 6px', color: 'var(--ink-4)' }}>{p.date}</td>
                    <td style={{ padding: '9px 6px', fontWeight: 600, color: '#0070D1' }}>{p.pp}%</td>
                    <td style={{ padding: '9px 6px', fontWeight: 600, color: '#C01818' }}>{p.psoe}%</td>
                    <td style={{ padding: '9px 6px', color: '#63BE21' }}>{p.vox}%</td>
                    <td style={{ padding: '9px 6px', color: '#BF3F7E' }}>{p.sumar}%</td>
                    <td style={{ padding: '9px 6px', color: 'var(--ink-4)' }}>{p.otros}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Mapa territorial</h2>
              <span style={{ fontSize: 11, color: '#6E6E73', background: '#F5F5F7', borderRadius: 999, padding: '4px 11px', letterSpacing: '0.06em', fontWeight: 500 }}>17 CC.AA.</span>
            </div>
            {(() => {
              const COLOR = { pp: '#2D4A8A', psoe: '#C53030' } as const
              const LABEL = { pp: 'PP', psoe: 'PSOE' } as const
              const winnerOf = (lean: string) => (lean === 'pp' ? 'pp' : 'psoe') as 'pp' | 'psoe'
              const find = (n: string) => REGIONS.find(r => r.name === n)!
              const block = (display: string, regionName: string, flex: number, height: number) => {
                const r = find(regionName)
                const w = winnerOf(r.lean)
                return (
                  <div key={regionName} style={{
                    flex, height, background: COLOR[w], borderRadius: 8,
                    padding: '8px 12px', color: '#fff',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 500, opacity: 0.78, letterSpacing: '-0.005em' }}>{display}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.012em', lineHeight: 1 }}>{LABEL[w]}</div>
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {block('Andalucía', 'Andalucía', 2.0, 78)}
                    {block('Cataluña',  'Cataluña',  1.4, 78)}
                    {block('Madrid',    'Madrid',    1.4, 78)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {block('Valencia',  'Valencia',  1, 64)}
                    {block('Galicia',   'Galicia',   1, 64)}
                    {block('C. y León', 'Castilla y León', 1, 64)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {block('P. Vasco',    'País Vasco',         1, 56)}
                    {block('C-La Mancha', 'Castilla-La Mancha', 1, 56)}
                    {block('Canarias',    'Canarias',           1, 56)}
                    {block('Murcia',      'Murcia',             1, 56)}
                    {block('Asturias',    'Asturias',           1, 56)}
                    {block('Extremad.',   'Extremadura',        1, 56)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {block('Aragón',    'Aragón',    1, 56)}
                    {block('Baleares',  'Baleares',  1, 56)}
                    {block('Navarra',   'Navarra',   1, 56)}
                    {block('Rioja',     'La Rioja',  1, 56)}
                    {block('Cantabria', 'Cantabria', 1, 56)}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── Coalition scenarios ── */}
        {(() => {
          const TOTAL = 350, MAJ = 176
          const SCN = [
            { id: 'pp-vox',         name: 'PP + VOX',                seats: 172, segs: [{c:'#2D4A8A',n:137},{c:'#5DBC52',n:35}] },
            { id: 'pp-vox-upn-cc',  name: 'PP + VOX + UPN + CC',     seats: 175, segs: [{c:'#2D4A8A',n:137},{c:'#5DBC52',n:35},{c:'#FFCC00',n:1},{c:'#F38A19',n:2}] },
            { id: 'psoe-sumar',     name: 'PSOE + Sumar + nacion.',  seats: 179, segs: [{c:'#C53030',n:121},{c:'#9F4FB6',n:31},{c:'#FF6B35',n:7},{c:'#7E5BAF',n:6},{c:'#23A455',n:7},{c:'#15847C',n:7}] },
            { id: 'gran-coalicion', name: 'Gran coalición',          seats: 261, segs: [{c:'#2D4A8A',n:137},{c:'#C53030',n:124}] },
          ]
          return (
            <div onClick={() => router.push('/escenarios')}
                 style={{ background: '#1d1d1f', borderRadius: 20, padding: '26px 30px', color: '#fff', cursor: 'pointer', transition: 'box-shadow 200ms', }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Escenarios de mayoría</h2>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Ver todos →</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {SCN.map(s => {
                  const viable = s.seats >= MAJ
                  const numColor = viable ? '#5DBC52' : '#F38A19'
                  return (
                    <div key={s.id}
                         onClick={(e) => { e.stopPropagation(); router.push(`/escenarios#${s.id}`) }}
                         style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 22, alignItems: 'center', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 9, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.005em' }}>{s.name}</div>
                        <div style={{ position: 'relative', height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'visible', display: 'flex' }}>
                          <div style={{ display: 'flex', height: '100%', borderRadius: 999, overflow: 'hidden', width: `${s.seats / TOTAL * 100}%` }}>
                            {s.segs.map((seg, i) => (
                              <div key={i} style={{ width: `${seg.n / s.seats * 100}%`, background: seg.c }}/>
                            ))}
                          </div>
                          <div style={{ position: 'absolute', left: `${MAJ / TOTAL * 100}%`, top: -3, bottom: -3, width: 1.5, background: 'rgba(255,255,255,0.55)', transform: 'translateX(-50%)' }}/>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.022em', color: numColor, lineHeight: 1, textAlign: 'right' }}>{s.seats}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </main>

      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '22px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Datos ficticios con fines demostrativos · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
