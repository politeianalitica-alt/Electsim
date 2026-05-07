'use client'

import { useState } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'

interface CCAARegion { n: number; pos: number; neg: number; neu: number; sent_score: number; top_topics: string[] }
interface EuropeCountry { n: number; pos: number; neg: number; spain_imp: number; sample_titles: string[] }

const CCAA_GRID: Array<Array<{ name: string; display: string; flex: number; height: number }>> = [
  [
    { name: 'Galicia',           display: 'Galicia',     flex: 1.2, height: 56 },
    { name: 'Asturias',          display: 'Asturias',    flex: 1.0, height: 56 },
    { name: 'Cantabria',         display: 'Cantabria',   flex: 1.0, height: 56 },
    { name: 'País Vasco',        display: 'P. Vasco',    flex: 1.0, height: 56 },
    { name: 'Navarra',           display: 'Navarra',     flex: 0.9, height: 56 },
  ],
  [
    { name: 'Castilla y León',   display: 'C. y León',   flex: 2.5, height: 64 },
    { name: 'La Rioja',          display: 'Rioja',       flex: 0.8, height: 64 },
    { name: 'Aragón',            display: 'Aragón',      flex: 1.4, height: 64 },
    { name: 'Cataluña',          display: 'Cataluña',    flex: 1.4, height: 64 },
  ],
  [
    { name: 'Extremadura',       display: 'Extremad.',   flex: 1.2, height: 64 },
    { name: 'Madrid',            display: 'Madrid',      flex: 0.9, height: 64 },
    { name: 'Castilla-La Mancha',display: 'C-La Mancha', flex: 1.6, height: 64 },
    { name: 'C. Valenciana',     display: 'Valencia',    flex: 1.3, height: 64 },
    { name: 'Baleares',          display: 'Baleares',    flex: 0.8, height: 64 },
  ],
  [
    { name: 'Andalucía',         display: 'Andalucía',   flex: 3.4, height: 64 },
    { name: 'Murcia',            display: 'Murcia',      flex: 1.0, height: 64 },
    { name: 'Canarias',          display: 'Canarias',    flex: 1.4, height: 64 },
  ],
]

const EUROPE_COUNTRIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Spain',          lat: 40.4, lon: -3.7 },
  { name: 'France',         lat: 46.6, lon:  2.4 },
  { name: 'United Kingdom', lat: 51.5, lon: -0.1 },
  { name: 'Germany',        lat: 51.2, lon: 10.5 },
  { name: 'Italy',          lat: 41.9, lon: 12.5 },
  { name: 'Portugal',       lat: 38.7, lon: -9.1 },
  { name: 'Belgium',        lat: 50.8, lon:  4.4 },
  { name: 'Netherlands',    lat: 52.4, lon:  4.9 },
  { name: 'Greece',         lat: 38.0, lon: 23.7 },
  { name: 'Poland',         lat: 52.2, lon: 21.0 },
  { name: 'Switzerland',    lat: 46.8, lon:  8.2 },
  { name: 'Austria',        lat: 48.2, lon: 16.4 },
  { name: 'Sweden',         lat: 59.3, lon: 18.1 },
  { name: 'Norway',         lat: 59.9, lon: 10.7 },
  { name: 'Denmark',        lat: 55.7, lon: 12.6 },
  { name: 'Ireland',        lat: 53.3, lon: -6.2 },
  { name: 'Czech Republic', lat: 50.1, lon: 14.4 },
  { name: 'Hungary',        lat: 47.5, lon: 19.0 },
  { name: 'Romania',        lat: 44.4, lon: 26.1 },
  { name: 'Ukraine',        lat: 50.4, lon: 30.5 },
  { name: 'Russia',         lat: 55.8, lon: 37.6 },
  { name: 'Turkey',         lat: 41.0, lon: 28.9 },
]

export default function RegionalNewsMaps() {
  const [view, setView] = useState<'spain' | 'europe'>('spain')
  const [selected, setSelected] = useState<string | null>(null)

  const { data, source, updatedAt } = useApi<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(
    '/api/narratives/by-region?hours_back=72',
    { refreshInterval: 180_000 }
  )

  const spain = data?.spain_ccaa ?? {}
  const europe = data?.europe ?? {}

  return (
    <section style={{ marginTop: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Geografía de los debates
          </h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {view === 'spain'
              ? <>Debates por CCAA · <CountUp value={Object.values(spain).reduce((s, v) => s + v.n, 0)}/> noticias regionales</>
              : <>Debates por país europeo · <CountUp value={Object.values(europe).reduce((s, v) => s + v.n, 0)}/> noticias</>}
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {(['spain', 'europe'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setSelected(null) }} style={{
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? '#1d1d1f' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '5px 14px',
              fontSize: 11.5, fontWeight: view === v ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 160ms',
              letterSpacing: '0.02em',
            }}>
              {v === 'spain' ? 'España (CCAA)' : 'Europa'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18 }}>
        {/* Map */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {view === 'spain'
            ? <SpainCCAAMap spain={spain} selected={selected} onSelect={setSelected}/>
            : <EuropeMap europe={europe} selected={selected} onSelect={setSelected}/>}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10.5, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(90deg, #DBEAFE, #1D4ED8)', display: 'inline-block' }}/>
              Volumen de noticias
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }}/>
              Sentiment positivo
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }}/>
              Sentiment negativo
            </span>
          </div>
        </div>

        {/* Details panel */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {selected
            ? view === 'spain'
              ? <CCAADetail name={selected} data={spain[selected]}/>
              : <CountryDetail name={selected} data={europe[selected]}/>
            : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                  {view === 'spain' ? 'Top CCAA por volumen' : 'Top países por volumen'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(view === 'spain'
                    ? Object.entries(spain).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                    : Object.entries(europe).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                  ).map(([name, info]) => {
                    const sentInfo = view === 'spain' ? (info as CCAARegion) : (info as EuropeCountry)
                    const total = sentInfo.pos + sentInfo.neg + ((sentInfo as CCAARegion).neu ?? 0)
                    const polarity = total > 0 ? (sentInfo.pos - sentInfo.neg) / total : 0
                    return (
                      <button
                        key={name}
                        onClick={() => setSelected(name)}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 50px 70px', gap: 8, alignItems: 'center',
                          padding: '7px 10px', background: '#FAFAFB', border: '1px solid #ECECEF',
                          borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          transition: 'all 160ms',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAFB' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-2)' }}><CountUp value={sentInfo.n}/></span>
                        <span style={{ fontSize: 10, color: polarity > 0.1 ? '#16A34A' : polarity < -0.1 ? '#DC2626' : 'var(--ink-4)', fontWeight: 600, textAlign: 'right' }}>
                          {polarity > 0 ? '+' : ''}{polarity.toFixed(2)} sent
                        </span>
                      </button>
                    )
                  })}
                  {(view === 'spain' ? Object.keys(spain) : Object.keys(europe)).length === 0 && (
                    <Skeleton width="100%" height={200} radius={8}/>
                  )}
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 'auto', paddingTop: 12, fontStyle: 'italic' }}>
                  Click en una región del mapa para ver el detalle.
                </p>
              </div>
            )
          }
        </div>
      </div>
    </section>
  )
}

// ── Spain CCAA Block Map ─────────────────────────────────────────────────────
function SpainCCAAMap({ spain, selected, onSelect }: { spain: Record<string, CCAARegion>; selected: string | null; onSelect: (n: string) => void }) {
  const max = Math.max(1, ...Object.values(spain).map(v => v.n))
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de España · click para detalle
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {CCAA_GRID.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 5 }}>
            {row.map(cell => {
              const region = spain[cell.name]
              const intensity = region ? region.n / max : 0
              const baseColor = '29, 78, 140'   // RGB azul
              const polarity = region ? region.sent_score : 0
              const isSelected = selected === cell.name

              return (
                <button
                  key={cell.name}
                  onClick={() => onSelect(cell.name)}
                  title={region ? `${cell.name} · ${region.n} arts · pol ${polarity}` : cell.name}
                  style={{
                    flex: cell.flex, height: cell.height,
                    background: region
                      ? `rgba(${baseColor}, ${0.15 + intensity * 0.65})`
                      : '#F5F5F7',
                    border: isSelected ? '2px solid #1F4E8C' : '1px solid #ECECEF',
                    borderRadius: 6, padding: '6px 8px',
                    color: region && intensity > 0.4 ? '#fff' : 'var(--ink-2)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    transition: 'all 200ms',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.85, letterSpacing: '-0.005em' }}>{cell.display}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                      {region ? region.n : '—'}
                    </span>
                    {region && (region.pos > 0 || region.neg > 0) && (
                      <span style={{
                        fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                        background: polarity > 0.1 ? 'rgba(22,163,74,0.85)' : polarity < -0.1 ? 'rgba(220,38,38,0.85)' : 'rgba(110,110,115,0.85)',
                        color: '#fff',
                      }}>
                        {polarity > 0 ? '+' : ''}{polarity.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function CCAADetail({ name, data }: { name: string; data?: CCAARegion }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  const total = data.pos + data.neg + data.neu || 1
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
        Comunidad autónoma
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>
        {name}
      </h3>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        <Stat label="Noticias 72h"  value={data.n} accent="#1F4E8C"/>
        <Stat label="Polaridad"     value={data.sent_score} accent={data.sent_score > 0.1 ? '#16A34A' : data.sent_score < -0.1 ? '#DC2626' : '#6E6E73'} decimals={2}/>
      </div>

      {/* Sentiment bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
          Distribución sentimiento
        </div>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
          <div style={{ width: `${(data.pos / total) * 100}%`, background: '#16A34A', transition: 'width 600ms' }} title={`Positivo ${data.pos}`}/>
          <div style={{ width: `${(data.neu / total) * 100}%`, background: '#9CA3AF', transition: 'width 600ms' }} title={`Neutro ${data.neu}`}/>
          <div style={{ width: `${(data.neg / total) * 100}%`, background: '#DC2626', transition: 'width 600ms' }} title={`Negativo ${data.neg}`}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>{data.pos}+</span>
          <span>{data.neu}=</span>
          <span style={{ color: '#DC2626', fontWeight: 600 }}>{data.neg}−</span>
        </div>
      </div>

      {/* Top topics */}
      {data.top_topics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            Debates dominantes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {data.top_topics.map(t => (
              <span key={t} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 999,
                background: '#EFF6FF', color: '#1F4E8C', fontWeight: 500,
                border: '1px solid #DBEAFE',
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Europe Map ───────────────────────────────────────────────────────────────
function EuropeMap({ europe, selected, onSelect }: { europe: Record<string, EuropeCountry>; selected: string | null; onSelect: (n: string) => void }) {
  const W = 520, H = 380
  const minLat = 35, maxLat = 65, minLon = -12, maxLon = 42

  function project(lat: number, lon: number): [number, number] {
    const x = ((lon - minLon) / (maxLon - minLon)) * W
    const y = H - ((lat - minLat) / (maxLat - minLat)) * H
    return [x, y]
  }

  const max = Math.max(1, ...Object.values(europe).map(v => v.n))

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de Europa · click para detalle
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#FAFAFB', borderRadius: 12 }}>
        {/* Graticule */}
        {[40, 50, 60].map(lat => (
          <line key={lat} x1={0} x2={W} y1={project(lat, 0)[1]} y2={project(lat, 0)[1]} stroke="#ECECEF" strokeWidth={0.5}/>
        ))}
        {[-10, 0, 10, 20, 30, 40].map(lon => (
          <line key={lon} y1={0} y2={H} x1={project(0, lon)[0]} x2={project(0, lon)[0]} stroke="#ECECEF" strokeWidth={0.5}/>
        ))}

        {/* Spain reference (always highlighted) */}
        {(() => {
          const [x, y] = project(40.4, -3.7)
          return <circle cx={x} cy={y} r={28} fill="#1F4E8C0F" stroke="#1F4E8C" strokeWidth={1} strokeDasharray="3 3"/>
        })()}

        {/* Country bubbles */}
        {EUROPE_COUNTRIES.map(c => {
          const data = europe[c.name]
          if (!data || data.n === 0) {
            // Show as small empty circle for context
            const [x, y] = project(c.lat, c.lon)
            return <circle key={c.name} cx={x} cy={y} r={2.5} fill="#D1D5DB" opacity={0.4}/>
          }
          const [x, y] = project(c.lat, c.lon)
          const r = 5 + Math.sqrt(data.n / max) * 22
          const polarity = data.pos - data.neg
          const fill = polarity > 0 ? '#16A34A' : polarity < 0 ? '#DC2626' : '#6E6E73'
          const isSelected = selected === c.name
          return (
            <g key={c.name} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.name)}>
              <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.55}
                      stroke={isSelected ? '#1d1d1f' : fill} strokeWidth={isSelected ? 2 : 0.8}/>
              {data.spain_imp > 0 && (
                <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#DC2626" strokeWidth={1} strokeDasharray="2 2" opacity={0.7}/>
              )}
              <title>{`${c.name} · ${data.n} arts · pos ${data.pos} / neg ${data.neg}${data.spain_imp > 0 ? ' · ' + data.spain_imp + ' impacto España' : ''}`}</title>
              {r > 10 && (
                <text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'var(--font-display)', fill: '#fff', fontWeight: 600, pointerEvents: 'none' }}>
                  {data.n}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function CountryDetail({ name, data }: { name: string; data?: EuropeCountry }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>País</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>
        {name}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <Stat label="Artículos"        value={data.n}         accent="#1F4E8C"/>
        <Stat label="Sentiment +"      value={data.pos}       accent="#16A34A"/>
        <Stat label="Sentiment −"      value={data.neg}       accent="#DC2626"/>
      </div>

      {data.spain_imp > 0 && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Impacto España</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginTop: 2 }}>
            <CountUp value={data.spain_imp}/> noticias con repercusión alta/crítica para España
          </div>
        </div>
      )}

      {data.sample_titles.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            Titulares relevantes
          </div>
          {data.sample_titles.slice(0, 4).map((t, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-2)', padding: '6px 0', borderBottom: '1px solid var(--hairline)', lineHeight: 1.4 }}>
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, decimals = 0 }: { label: string; value: number; accent: string; decimals?: number }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
      <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        <CountUp value={value} decimals={decimals}/>
      </div>
    </div>
  )
}
