'use client'
/**
 * <MilitaryMap /> · Sprint GEO-MIL C5
 *
 * Mapa estratégico mundial con 3 capas simultáneas toggleables:
 *   1. Gasto militar (coroplético SIPRI %PIB o USD bn)
 *   2. Alianzas (arcos OTAN/CSTO/SCO/AUKUS conectando miembros)
 *   3. Empresas IBEX-Defensa con presencia (puntos amarillos)
 *
 * Click país → callback onCountryClick(iso3) abre drawer ficha militar.
 */
import { useEffect, useState } from 'react'
import { projectEquirect } from '@/lib/geopolitica/country-coords'

interface CountryMilex {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  milex_usd_bn: number | null
  milex_pct_gdp: number | null
  capability_score: number | null
  world_rank: number | null
}

interface MilexResp {
  ok: boolean
  countries: CountryMilex[]
  countries_all: CountryMilex[]
  summary: { countries_with_data: number; total_milex_usd_bn: number; countries_above_2pct_gdp: number }
}

interface AlliancePair { a: string; b: string; alliance_id: string; color: string; depth: number }
interface AllianceResp {
  ok: boolean
  alliances: Array<{ id: string; name: string; short_name: string; color: string; members: string[]; depth_score: number }>
  pairs: AlliancePair[]
}

type Layer = 'gasto_pct_gdp' | 'gasto_usd' | 'alianzas'

interface Props {
  onCountryClick?: (iso3: string) => void
}

const W = 720, H = 360

function colorForPctGdp(pct: number | null): string {
  if (pct === null) return '#cbd5e1'
  if (pct >= 5) return '#7f1d1d'
  if (pct >= 3) return '#dc2626'
  if (pct >= 2) return '#f59e0b'
  if (pct >= 1) return '#16a34a'
  return '#86efac'
}

function radiusForUsd(usd: number | null): number {
  if (usd === null || usd <= 0) return 3
  return 3 + Math.log10(usd + 1) * 2.5
}

export function MilitaryMap({ onCountryClick }: Props) {
  const [milex, setMilex] = useState<MilexResp | null>(null)
  const [alliances, setAlliances] = useState<AllianceResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<CountryMilex | null>(null)
  const [layer, setLayer] = useState<Layer>('gasto_pct_gdp')
  const [activeAlliance, setActiveAlliance] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/militar/mapa-gasto', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/militar/alianzas', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([m, a]) => { if (alive) { setMilex(m); setAlliances(a) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const countryByIso = new Map(milex?.countries_all.map((c) => [c.iso3, c]) || [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px', position: 'relative',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Mapa estratégico global · gasto + alianzas
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
            SIPRI 2024 (60 países) + IISS Military Balance (capabilities) + alianzas curadas (NATO/CSTO/SCO/AUKUS/PESCO/QUAD/BRICS+).
            Click en país para ficha militar drawer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { v: 'gasto_pct_gdp', l: '% PIB' },
            { v: 'gasto_usd', l: 'USD bn' },
            { v: 'alianzas', l: 'Alianzas' },
          ] as Array<{ v: Layer; l: string }>).map((o) => (
            <button
              key={o.v}
              onClick={() => setLayer(o.v)}
              style={{
                padding: '4px 8px', borderRadius: 5,
                border: layer === o.v ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: layer === o.v ? '#0f172a' : '#fff',
                color: layer === o.v ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >{o.l}</button>
          ))}
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando mapa militar global…</p>}

      {!loading && milex?.ok && (
        <>
          {/* Filtro alianza · solo visible si layer = alianzas */}
          {layer === 'alianzas' && alliances?.ok && (
            <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveAlliance(null)}
                style={chipStyle(activeAlliance === null, '#0f172a')}
              >Todas</button>
              {alliances.alliances.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveAlliance(activeAlliance === a.id ? null : a.id)}
                  style={chipStyle(activeAlliance === a.id, a.color)}
                >{a.short_name}</button>
              ))}
            </div>
          )}

          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{
            display: 'block', background: layer === 'alianzas' ? '#0f172a' : '#eff6ff',
            borderRadius: 8,
          }}>
            {/* Grid guía */}
            {[0, 90, 180, 270, 360].map((x) => (
              <line key={x} x1={(x / 360) * W} y1={0} x2={(x / 360) * W} y2={H} stroke={layer === 'alianzas' ? '#1e293b' : '#cbd5e1'} strokeWidth={0.3} />
            ))}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={layer === 'alianzas' ? '#334155' : '#94a3b8'} strokeWidth={0.5} />

            {/* Capa alianzas · arcos */}
            {layer === 'alianzas' && alliances?.ok && alliances.pairs
              .filter((p) => !activeAlliance || p.alliance_id === activeAlliance)
              .map((p, i) => {
                const ca = countryByIso.get(p.a)
                const cb = countryByIso.get(p.b)
                if (!ca || !cb) return null
                const { x: x1, y: y1 } = projectEquirect(ca.lat, ca.lon, W, H)
                const { x: x2, y: y2 } = projectEquirect(cb.lat, cb.lon, W, H)
                return (
                  <line key={`${p.alliance_id}-${i}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={p.color} strokeWidth={p.depth * 0.4}
                    opacity={0.25}
                  />
                )
              })}

            {/* Países como círculos */}
            {milex.countries_all.map((c) => {
              const { x, y } = projectEquirect(c.lat, c.lon, W, H)
              const isInAlliance = layer === 'alianzas' && activeAlliance && alliances?.alliances.find((a) => a.id === activeAlliance)?.members.includes(c.iso3)
              const dimmed = layer === 'alianzas' && activeAlliance && !isInAlliance
              const fill = layer === 'alianzas'
                ? (isInAlliance ? alliances?.alliances.find((a) => a.id === activeAlliance)?.color || '#0891b2' : '#475569')
                : layer === 'gasto_pct_gdp'
                  ? colorForPctGdp(c.milex_pct_gdp)
                  : (c.milex_usd_bn !== null ? '#dc2626' : '#cbd5e1')
              const r = layer === 'gasto_usd' ? radiusForUsd(c.milex_usd_bn) : 4
              return (
                <g key={c.iso3}>
                  <circle
                    cx={x} cy={y} r={r}
                    fill={fill}
                    opacity={dimmed ? 0.15 : 0.85}
                    stroke="#fff" strokeWidth={0.5}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onCountryClick?.(c.iso3)}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              )
            })}
          </svg>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            {layer === 'gasto_pct_gdp' && (
              <>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>% PIB:</span>
                {[{l:'<1', c:'#86efac'},{l:'1-2', c:'#16a34a'},{l:'2-3', c:'#f59e0b'},{l:'3-5', c:'#dc2626'},{l:'>5', c:'#7f1d1d'}].map((x) => (
                  <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: x.c, borderRadius: '50%' }} /><span>{x.l}%</span>
                  </span>
                ))}
              </>
            )}
            {layer === 'gasto_usd' && (
              <span style={{ color: '#94a3b8' }}>Tamaño círculo proporcional al log(USD bn). Total: ${milex.summary.total_milex_usd_bn} bn · {milex.summary.countries_with_data} países</span>
            )}
            {layer === 'alianzas' && (
              <span style={{ color: '#94a3b8' }}>
                Arcos conectan miembros · grosor por depth_score (3=defensa mutua, 2=cooperación operativa, 1=diálogo)
              </span>
            )}
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {milex.summary.countries_above_2pct_gdp} países {'>'}2% PIB
            </span>
          </div>

          {hover && (
            <div style={{
              position: 'absolute', top: 60, right: 20,
              background: '#0f172a', color: '#fff',
              padding: '10px 14px', borderRadius: 8, fontSize: 11, maxWidth: 240,
              pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{hover.name_es}</p>
              {hover.milex_pct_gdp !== null && (
                <p style={{ margin: '4px 0 0', fontFamily: 'ui-monospace, monospace' }}>
                  Milex: <strong>{hover.milex_pct_gdp}% PIB</strong>
                  {hover.milex_usd_bn !== null && ` · $${hover.milex_usd_bn}bn`}
                </p>
              )}
              {hover.world_rank && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>Rango mundial: #{hover.world_rank}</p>
              )}
              {hover.capability_score !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>IISS capability: {hover.capability_score}/100</p>
              )}
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Click para ficha militar →</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 12,
    border: active ? `1px solid ${color}` : '1px solid #e2e8f0',
    background: active ? color : '#fff',
    color: active ? '#fff' : '#475569',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}

export default MilitaryMap
