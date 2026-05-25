'use client'
/**
 * `<GeoTvBroadcast />` · Sprint G12.
 *
 * Narrative tracking en TV news vía GDELT TV API. Monitorea menciones
 * de temas en broadcasts (CNN, Fox, MSNBC, BBC, Al Jazeera, RT, France24,
 * DW, etc.) — capa narrativa distinta a la web prensa, útil para detectar
 * priming/agenda-setting por redes específicas.
 *
 * 4 modos coordinados:
 *   - Volume timeline 7d (sparkline)
 *   - Tone timeline 7d (sparkline coloreado por avg)
 *   - Station chart (qué redes amplifican más)
 *   - Clip gallery (últimos clips con station + show + snippet)
 */
import { useEffect, useState } from 'react'

interface ClipItem { date: string; station: string; show: string; snippet: string; url: string; image_url: string }
interface TimelinePoint { date: string; value?: number; tone?: number }
interface Station { name?: string; station?: string; count?: number; value?: number }

interface VolResp { ok: boolean; n_points?: number; timeline?: TimelinePoint[]; data_quality?: any; error?: string }
interface ToneResp { ok: boolean; n_points?: number; avg_tone?: number | null; timeline?: TimelinePoint[]; error?: string }
interface ClipResp { ok: boolean; n_clips?: number; clips?: ClipItem[]; error?: string }
interface StationResp { ok: boolean; n_stations?: number; stations?: any; error?: string }

const QUERY_PRESETS = [
  { v: 'Ukraine',  l: 'Ucrania' },
  { v: 'Gaza OR Palestine', l: 'Gaza' },
  { v: 'Israel', l: 'Israel' },
  { v: 'China', l: 'China' },
  { v: 'Russia', l: 'Rusia' },
  { v: 'NATO', l: 'OTAN' },
  { v: 'European Union', l: 'UE' },
  { v: 'Spain', l: 'España' },
]
const THEME_PRESETS = [
  { v: '',                  l: 'sin filtro temático' },
  { v: 'INTERNAL_CONFLICT', l: 'Conflicto interno' },
  { v: 'PROTEST',           l: 'Protesta' },
  { v: 'TERROR',            l: 'Terrorismo' },
  { v: 'MIGRATION',         l: 'Migración' },
  { v: 'ECON_INFLATION',    l: 'Inflación' },
  { v: 'CYBER',             l: 'Cyber' },
  { v: 'NATO_MILITARY',     l: 'NATO militar' },
]
const TIMESPAN_OPTIONS = [
  { v: '24h', l: '24h' },
  { v: '3d',  l: '3 días' },
  { v: '7d',  l: '7 días' },
  { v: '14d', l: '2 semanas' },
]

function toneColor(t: number | null | undefined): string {
  if (t === null || t === undefined) return '#94a3b8'
  if (t <= -3) return '#dc2626'
  if (t <= -1) return '#f97316'
  if (t >= 3) return '#16a34a'
  if (t >= 1) return '#84cc16'
  return '#94a3b8'
}

export function GeoTvBroadcast() {
  const [query, setQuery] = useState('Ukraine')
  const [queryInput, setQueryInput] = useState('Ukraine')
  const [themeFilter, setThemeFilter] = useState('')
  const [timespan, setTimespan] = useState('7d')

  const [vol, setVol] = useState<VolResp | null>(null)
  const [tone, setTone] = useState<ToneResp | null>(null)
  const [clips, setClips] = useState<ClipResp | null>(null)
  const [stations, setStations] = useState<StationResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const themeParam = themeFilter ? `&theme=${themeFilter}` : ''
    Promise.all([
      fetch(`/api/gdelt/tv-timeline?query=${encodeURIComponent(query)}&timespan=${timespan}${themeParam}`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/gdelt/tv-tone?query=${encodeURIComponent(query)}&timespan=${timespan}${themeParam}`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/gdelt/tv-clips?query=${encodeURIComponent(query)}&timespan=${timespan === '14d' ? '7d' : timespan}&maxrows=15${themeParam}`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/gdelt/tv-stations?query=${encodeURIComponent(query)}&timespan=${timespan}${themeParam}`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([v, t, c, s]) => {
      if (!alive) return
      setVol(v); setTone(t); setClips(c); setStations(s)
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [query, themeFilter, timespan])

  const stationList: Station[] = (() => {
    const raw = stations?.stations
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') return Object.values(raw) as Station[]
    return []
  })()
    .map((s) => ({ name: s.name || s.station || '?', count: Number(s.count ?? s.value ?? 0) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 12)

  const maxStation = stationList[0]?.count || 1

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #be123c',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#be123c', textTransform: 'uppercase' }}>
          ◆ TV broadcast narrative tracking · GDELT TV API
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Monitorea menciones del tema en TV news (CNN, Fox, MSNBC, BBC, Al Jazeera, RT,
          France24, DW, etc.). Capa narrativa distinta a la web · útil para detectar
          priming/agenda-setting por redes específicas.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={query} onChange={(e) => { setQuery(e.target.value); setQueryInput(e.target.value) }} style={selectStyle}>
            {QUERY_PRESETS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <form onSubmit={(e) => { e.preventDefault(); setQuery(queryInput) }} style={{ display: 'flex', gap: 4 }}>
            <input type="text" value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="query libre..." style={{ ...selectStyle, width: 140 }} />
            <button type="submit" style={btnStyle}>BUSCAR</button>
          </form>
          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)} style={selectStyle} title="Filtro GKG theme">
            {THEME_PRESETS.map((t) => <option key={t.v || 'all'} value={t.v}>{t.l}</option>)}
          </select>
          <select value={timespan} onChange={(e) => setTimespan(e.target.value)} style={selectStyle}>
            {TIMESPAN_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando TV broadcasts…</p>}

      {/* Sparklines volume + tone */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 }}>
        <SparkPanel
          label={`Volumen menciones TV · ${vol?.n_points ?? 0} puntos`}
          data={vol?.timeline?.map((p) => Number(p.value) || 0) || []}
          color="#be123c"
        />
        <SparkPanel
          label={`Tono TV · medio ${tone?.avg_tone !== null && tone?.avg_tone !== undefined ? tone.avg_tone.toFixed(2) : '—'}`}
          data={tone?.timeline?.map((p) => Number(p.tone) || 0) || []}
          color={toneColor(tone?.avg_tone)}
          centered
        />
      </div>

      {/* Station chart */}
      {stationList.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
            Estaciones TV que más amplifican
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {stationList.map((s, i) => (
              <div key={`${s.name}-${i}`} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 60px', gap: 8, alignItems: 'center', fontSize: 10 }}>
                <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <div style={{ background: '#f1f5f9', borderRadius: 2, height: 14, position: 'relative' }}>
                  <div style={{
                    background: '#be123c',
                    height: '100%',
                    borderRadius: 2,
                    width: `${((s.count || 0) / maxStation) * 100}%`,
                  }} />
                </div>
                <span style={{ color: '#be123c', fontFamily: 'ui-monospace, monospace', fontWeight: 700, textAlign: 'right' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clip gallery */}
      {clips?.ok && clips.clips && clips.clips.length > 0 && (
        <div>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
            Últimos clips TV · {clips.n_clips}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
            {clips.clips.map((c, i) => (
              <a key={`${c.date}-${i}`} href={c.url} target="_blank" rel="noopener noreferrer" style={{
                padding: 8,
                background: '#f8fafc',
                borderLeft: '3px solid #be123c',
                borderRadius: 3,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f2' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2, background: '#be123c', color: '#fff', letterSpacing: 0.4, flexShrink: 0 }}>{c.station || 'TV'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{c.show || '(programa)'}</span>
                  </div>
                  <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{String(c.date || '').slice(0, 13)}</span>
                </div>
                {c.snippet && (
                  <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                    {String(c.snippet).slice(0, 240)}{String(c.snippet).length > 240 ? '…' : ''}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && !clips?.ok && !vol?.ok && !tone?.ok && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          GDELT TV API sin respuesta · prueba con otro query o cambia de tema.
        </p>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
        GDELT TV API · clipgallery + timelinevol + timelinetone + stationchart.
        TV news 65+ idiomas globales · diferente a la cobertura web.
      </p>
    </section>
  )
}

function SparkPanel({ label, data, color, centered = false }: { label: string; data: number[]; color: string; centered?: boolean }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Sin datos</p>
      </div>
    )
  }
  const width = 100
  const height = 40
  const max = Math.max(...data.map(Math.abs), 1)
  return (
    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6 }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {centered && <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="#cbd5e1" strokeWidth={0.3} />}
        {data.map((v, i) => {
          const x = (i / data.length) * width
          const w = (width / data.length) * 0.85
          if (centered) {
            const cy = height / 2
            const h = (Math.abs(v) / max) * (height / 2)
            const y = v >= 0 ? cy - h : cy
            return <rect key={i} x={x} y={y} width={w} height={h} fill={color} opacity={0.75} />
          }
          const h = (v / max) * height
          const y = height - h
          return <rect key={i} x={x} y={y} width={w} height={h} fill={color} opacity={0.75} />
        })}
      </svg>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  fontSize: 11,
  padding: '4px 8px',
  cursor: 'pointer',
  color: '#0f172a',
}
const btnStyle: React.CSSProperties = {
  background: '#be123c',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  padding: '4px 10px',
  cursor: 'pointer',
  letterSpacing: 0.4,
}

export default GeoTvBroadcast
