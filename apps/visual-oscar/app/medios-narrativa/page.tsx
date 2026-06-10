'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import MediosHero from '@/components/medios/MediosHero'
import MapaNoticiasEspana from '@/components/medios/MapaNoticiasEspana'
import BoardToolbar from '@/components/medios/BoardToolbar'
import { downloadCsv } from '@/lib/medios/export'
import TonoRealPanel from '@/components/medios/TonoRealPanel'
import { loadPrefs, setWeight, weightMultiplier, levelLabel, levelColor, type WeightLevel } from '@/lib/media-prefs'

// ─────────────────────────────────────────────────────────────────────────
// Modelo · shape REAL de /api/medios (sin mocks, sin datos inventados)
// ─────────────────────────────────────────────────────────────────────────
type ApiMedio = {
  id: string; nombre: string; grupo: string; tipo: string; ambito: string
  ccaa: string | null; ideologia: number; audiencia_M: number; credibilidad: number
  rss: string | null; web: string; color?: string
  provincia?: string | null; municipio?: string | null
  scope_level?: 'nacional' | 'autonomico' | 'provincial' | 'local' | 'europeo' | null
}
type Stats = {
  total: number
  por_tipo: Record<string, number>
  por_ambito: Record<string, number>
  por_scope: Record<string, number>
  por_ccaa: Record<string, number>
  por_ideologia: Record<string, number>
  por_grupo: { grupo: string; n: number; share: number; audiencia_M: number }[]
  con_rss: number; rss_share: number; audiencia_total_M: number
  credibilidad_media: number; n_grupos_distintos: number
}
type MediosResponse = { medios: ApiMedio[]; stats: Stats }

const TIPO_COLOR: Record<string, string> = {
  'Prensa': '#5B21B6', 'Digital': '#0F766E', 'TV': '#DC2626',
  'Radio': '#F97316', 'Agencias': '#6e6e73', 'Revista': '#0EA5E9',
}
const TIPO_ORDER = ['Prensa', 'Digital', 'TV', 'Radio', 'Agencias', 'Revista']

const CCAA_CODE_LABEL: Record<string, string> = {
  AND: 'Andalucía', ARA: 'Aragón', AST: 'Asturias', BAL: 'Baleares', CAN: 'Canarias',
  CNT: 'Cantabria', CLM: 'Castilla-La Mancha', CYL: 'Castilla y León', CAT: 'Cataluña',
  EXT: 'Extremadura', GAL: 'Galicia', MAD: 'Madrid', MUR: 'Murcia', NAV: 'Navarra',
  PV: 'País Vasco', RIO: 'La Rioja', VAL: 'Valencia', CEU: 'Ceuta', MEL: 'Melilla',
}
const SCOPE_LABEL: Record<string, string> = {
  nacional: 'Nacional', autonomico: 'Autonómico', provincial: 'Provincial', local: 'Local', europeo: 'Europeo',
}
const SCOPES = ['Todos', 'nacional', 'autonomico', 'provincial', 'local'] as const

const IDEO_BUCKETS: { key: string; label: string; color: string }[] = [
  { key: 'izquierda', label: 'Izquierda', color: '#E1322D' },
  { key: 'centro-izquierda', label: 'C-izquierda', color: '#EE7E7B' },
  { key: 'centro', label: 'Centro', color: '#9CA3AF' },
  { key: 'centro-derecha', label: 'C-derecha', color: '#6E9BD1' },
  { key: 'derecha', label: 'Derecha', color: '#1F4E8C' },
]

// jitter determinista por id (anti-solape sin aleatoriedad por render)
function hashId(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }
function jitter(id: string, amp: number): [number, number] {
  const h = hashId(id)
  return [((h & 0xff) / 255 - 0.5) * 2 * amp, (((h >> 8) & 0xff) / 255 - 0.5) * 2 * amp]
}
function ideoColor(x: number): string { return x < -10 ? '#E1322D' : x > 10 ? '#1F4E8C' : '#6e6e73' }
function ideoBucket(x: number): string {
  if (x <= -40) return 'izquierda'; if (x <= -10) return 'centro-izquierda'
  if (x < 10) return 'centro'; if (x < 40) return 'centro-derecha'; return 'derecha'
}
function cred100(c: number): number { return Math.round((c <= 1 ? c * 100 : c)) }

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function MapaDeMediosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, source, updatedAt, refresh } = useApi<MediosResponse>('/api/medios', { refreshInterval: 300_000 })
  const medios = useMemo(() => data?.medios ?? [], [data])
  const stats = data?.stats

  // ── Filtros ───────────────────────────────────────────────────────────
  const [filterTipo, setFilterTipo] = useState<string>('Todos')
  const [filterScope, setFilterScope] = useState<string>('Todos')
  const [query, setQuery] = useState('')
  const [yAxis, setYAxis] = useState<'credibilidad' | 'alcance'>('credibilidad')
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const focused = pinned ?? hovered

  // ── Preferencias de peso por medio (persistidas) ────────────────────────
  const [prefs, setPrefs] = useState<Record<string, WeightLevel>>({})
  useEffect(() => {
    setPrefs(loadPrefs().weights)
    const r = () => setPrefs(loadPrefs().weights)
    window.addEventListener('media-prefs:change', r)
    return () => window.removeEventListener('media-prefs:change', r)
  }, [])
  function handleSetWeight(id: string, lv: WeightLevel) { setWeight(id, lv); setPrefs(loadPrefs().weights) }

  const tiposPresentes = useMemo(() => {
    const set = new Set(medios.map(m => m.tipo))
    return ['Todos', ...TIPO_ORDER.filter(t => set.has(t))]
  }, [medios])

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return medios.filter(m =>
      (filterTipo === 'Todos' || m.tipo === filterTipo) &&
      (filterScope === 'Todos' || (m.scope_level ?? 'nacional') === filterScope) &&
      (q === '' || m.nombre.toLowerCase().includes(q) || m.grupo.toLowerCase().includes(q)),
    )
  }, [medios, filterTipo, filterScope, query])

  const focusedM = focused ? visibles.find(m => m.id === focused) ?? medios.find(m => m.id === focused) : null
  const focusedWeight: WeightLevel = focusedM ? (prefs[focusedM.id] ?? 0) : 0

  // Medios por CCAA para el mini-mapa de la cabecera
  const mediosPorCCAA = useMemo(() => {
    const o: Record<string, { n: number }> = {}
    for (const m of visibles) {
      if (!m.ccaa) continue
      const label = CCAA_CODE_LABEL[m.ccaa]
      if (!label) continue
      o[label] = { n: (o[label]?.n ?? 0) + 1 }
    }
    return o
  }, [visibles])

  // Distribución ideológica (sobre el conjunto filtrado)
  const ideoDist = useMemo(() => {
    const b: Record<string, number> = { izquierda: 0, 'centro-izquierda': 0, centro: 0, 'centro-derecha': 0, derecha: 0 }
    for (const m of visibles) b[ideoBucket(m.ideologia)]++
    return b
  }, [visibles])
  const ideoMax = Math.max(1, ...Object.values(ideoDist))

  // Concentración por grupo mediático (sobre el conjunto filtrado)
  const grupos = useMemo(() => {
    const m = new Map<string, { n: number; aud: number }>()
    for (const md of visibles) {
      const c = m.get(md.grupo) || { n: 0, aud: 0 }
      c.n++; c.aud += md.audiencia_M; m.set(md.grupo, c)
    }
    return [...m.entries()].map(([grupo, v]) => ({ grupo, n: v.n, aud: +v.aud.toFixed(1) }))
      .sort((a, b) => b.n - a.n).slice(0, 10)
  }, [visibles])
  const grupoMaxN = Math.max(1, ...grupos.map(g => g.n))

  const credMedia = useMemo(() => visibles.length
    ? Math.round(visibles.reduce((s, m) => s + cred100(m.credibilidad), 0) / visibles.length) : 0, [visibles])
  const conRss = useMemo(() => visibles.filter(m => !!m.rss).length, [visibles])
  const audTotal = useMemo(() => +visibles.reduce((s, m) => s + m.audiencia_M, 0).toFixed(1), [visibles])

  // ── Geometría del scatter ───────────────────────────────────────────────
  const W = 1000, H = 440, PAD_T = 26, PAD_B = 46, PAD_L = 44, PAD_R = 40
  const xToPx = (x: number) => PAD_L + ((x + 100) / 200) * (W - PAD_L - PAD_R)
  const yFrac = (m: ApiMedio) => yAxis === 'credibilidad'
    ? Math.max(0, Math.min(1, m.credibilidad <= 1 ? m.credibilidad : m.credibilidad / 100))
    : Math.sqrt(Math.min(m.audiencia_M, 20)) / Math.sqrt(20)
  const yToPx = (m: ApiMedio) => PAD_T + (1 - yFrac(m)) * (H - PAD_T - PAD_B)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <MediosHero
          accent="#7C2D92"
          eyebrow={`Mapa de medios · ${stats?.total ?? medios.length} medios de comunicación`}
          badge={<LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh} />}
          title={<>{stats?.total ?? medios.length} medios <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#9ca3af' }}>situados por ideología, credibilidad y audiencia</em></>}
          subtitle={`Catálogo completo de prensa, digital, TV, radio y agencias · ${stats?.n_grupos_distintos ?? 0} grupos mediáticos · ${stats?.con_rss ?? 0} con RSS para ingestión en tiempo real`}
          kpis={[
            { label: 'Medios', value: visibles.length, color: '#7C2D92' },
            { label: 'Credibilidad media', value: credMedia },
            { label: 'Con RSS', value: conRss },
            { label: 'Audiencia', value: <>{audTotal}<span style={{ fontSize: 12, color: '#9ca3af' }}>M</span></> },
            { label: 'Grupos', value: stats?.n_grupos_distintos ?? 0 },
          ]}
          mapLabel="Medios por comunidad"
          map={<MapaNoticiasEspana data={mediosPorCCAA} unidad="medios" colorHigh="#7C2D92" />}
        />

        {/* Filtros */}
        <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '12px 16px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <Segmented label="Tipo" options={tiposPresentes} value={filterTipo} onChange={setFilterTipo} colorOf={(t) => t !== 'Todos' ? TIPO_COLOR[t] : '#1d1d1f'} dot />
          <Segmented label="Ámbito" options={SCOPES as unknown as string[]} value={filterScope} onChange={setFilterScope} labelOf={(s) => s === 'Todos' ? 'Todos' : SCOPE_LABEL[s] ?? s} />
          <Segmented label="Eje Y" options={['credibilidad', 'alcance']} value={yAxis} onChange={(v) => setYAxis(v as 'credibilidad' | 'alcance')} labelOf={(s) => s === 'credibilidad' ? 'Credibilidad' : 'Alcance'} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar medio o grupo…"
              style={{ fontSize: 12.5, padding: '7px 12px', borderRadius: 999, border: '1px solid #ECECEF', background: '#FAFAFB', fontFamily: 'inherit', width: 200, outline: 'none', color: '#1d1d1f' }}
            />
            <span style={{ fontSize: 11.5, color: '#6e6e73', whiteSpace: 'nowrap' }}>{visibles.length} visibles · burbuja = audiencia</span>
          </div>
        </section>

        {/* Mapa (scatter) + detalle */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Fondo cuadrantes izq/dcha */}
              <rect x={0} y={0} width={(W) / 2} height={H} fill="#FAFAFB" />
              <rect x={W / 2} y={0} width={W / 2} height={H} fill="#F6F6F8" />
              {/* Gridlines horizontales */}
              {[0.25, 0.5, 0.75].map(g => (
                <line key={g} x1={PAD_L} y1={PAD_T + (1 - g) * (H - PAD_T - PAD_B)} x2={W - PAD_R} y2={PAD_T + (1 - g) * (H - PAD_T - PAD_B)} stroke="#1d1d1f" strokeWidth="1" opacity="0.06" />
              ))}
              {/* Eje vertical (centro político) */}
              <line x1={W / 2} y1={PAD_T - 6} x2={W / 2} y2={H - PAD_B} stroke="#1d1d1f" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" />
              {/* Línea base */}
              <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#1d1d1f" strokeWidth="1" opacity="0.15" />
              {/* Etiquetas de ejes */}
              <text x={PAD_L} y={H - 14} fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em">IZQUIERDA</text>
              <text x={W - PAD_R} y={H - 14} fontSize="13" fontWeight="700" fill="#6e6e73" letterSpacing="0.08em" textAnchor="end">DERECHA</text>
              <text x={PAD_L} y={PAD_T + 4} fontSize="12" fontWeight="700" fill="#6e6e73" letterSpacing="0.06em">{yAxis === 'credibilidad' ? '+ CREDIBILIDAD' : '+ ALCANCE'}</text>

              {/* Burbujas */}
              {visibles.map(m => {
                const w = prefs[m.id] ?? 0
                const mult = weightMultiplier(w)
                const baseR = 4.5 + Math.sqrt(Math.min(m.audiencia_M, 20)) * 3.4
                const r = Math.max(3.5, Math.min(26, baseR) * mult)
                const [jx, jy] = jitter(m.id, 5)
                const cx = xToPx(m.ideologia) + jx
                const cy = yToPx(m) + jy
                const isFocus = focused === m.id
                const dim = focused && !isFocus
                const c = TIPO_COLOR[m.tipo] ?? '#6e6e73'
                const opacity = w === -2 ? 0.14 : (dim ? 0.16 : 0.82)
                const showLabel = m.audiencia_M >= 2.5 || isFocus || w > 0
                return (
                  <g key={m.id} style={{ cursor: 'pointer' }}
                     onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)}
                     onClick={() => setPinned(pinned === m.id ? null : m.id)}>
                    <circle cx={cx} cy={cy} r={r} fill={c} opacity={opacity}
                            stroke={isFocus ? '#1d1d1f' : w > 0 ? '#7C3AED' : 'rgba(255,255,255,0.55)'}
                            strokeWidth={isFocus ? 2 : w > 0 ? 2 : 1.2}
                            strokeDasharray={w === -1 ? '3 3' : undefined}
                            style={{ transition: 'opacity 180ms' }} />
                    {showLabel && (
                      <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize="10.5" fontWeight="700"
                            fill="#1d1d1f" opacity={dim ? 0.5 : 1} style={{ pointerEvents: 'none' }}>{m.nombre}</text>
                    )}
                  </g>
                )
              })}
            </svg>
            {/* Leyenda tipos */}
            <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: '1px solid #ECECEF', flexWrap: 'wrap' }}>
              {TIPO_ORDER.filter(t => visibles.some(m => m.tipo === t)).map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3a3a3d' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: TIPO_COLOR[t] }} />{t}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#9ca3af' }}>Eje X: ideología −100…+100 · Eje Y: {yAxis === 'credibilidad' ? 'credibilidad 0…100' : 'audiencia (escala raíz)'}</span>
            </div>
          </div>

          {/* Detalle */}
          <aside style={{ background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 18px 14px', position: 'sticky', top: 60, alignSelf: 'start' }}>
            {focusedM ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9.5, color: TIPO_COLOR[focusedM.tipo] ?? '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{focusedM.tipo}{focusedM.scope_level ? ` · ${SCOPE_LABEL[focusedM.scope_level] ?? focusedM.scope_level}` : ''}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.014em', color: '#1d1d1f', lineHeight: 1.15 }}>{focusedM.nombre}</div>
                  <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 2 }}>Grupo: <strong style={{ color: '#1d1d1f' }}>{focusedM.grupo}</strong>{focusedM.ccaa && CCAA_CODE_LABEL[focusedM.ccaa] ? ` · ${CCAA_CODE_LABEL[focusedM.ccaa]}` : ''}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <Box label="Audiencia" value={`${focusedM.audiencia_M.toFixed(1)} M`} color={TIPO_COLOR[focusedM.tipo] ?? '#6e6e73'} />
                  <Box label="Credibilidad" value={`${cred100(focusedM.credibilidad)}`} color="#0F766E" />
                </div>

                {/* Sesgo ideológico */}
                <BarRow label="Sesgo ideológico" value={`${focusedM.ideologia > 0 ? '+' : ''}${focusedM.ideologia}`}
                        valueColor={ideoColor(focusedM.ideologia)} center
                        fill={focusedM.ideologia < 0 ? '#E1322D' : '#1F4E8C'}
                        left={focusedM.ideologia < 0 ? 50 + focusedM.ideologia / 2 : 50} width={Math.abs(focusedM.ideologia) / 2}
                        scaleLeft="−100 izq" scaleMid="0" scaleRight="+100 dcha" />

                {/* Credibilidad */}
                <BarRow label="Credibilidad editorial" value={`${cred100(focusedM.credibilidad)}/100`} valueColor="#0F766E"
                        fill="#0F766E" left={0} width={cred100(focusedM.credibilidad)}
                        scaleLeft="0" scaleMid="50" scaleRight="100" />

                {/* RSS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px' }}>
                  <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>RSS</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: focusedM.rss ? '#dcfce7' : '#f3f4f6', color: focusedM.rss ? '#15803d' : '#9ca3af' }}>
                    {focusedM.rss ? '◉ ingestión activa' : '○ sin feed'}
                  </span>
                </div>

                {/* Peso por usuario */}
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Importancia para mí</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: levelColor(focusedWeight) }}>{levelLabel(focusedWeight)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
                    {([-2, -1, 0, 1, 2] as WeightLevel[]).map(lv => (
                      <button key={lv} onClick={() => handleSetWeight(focusedM.id, lv)} title={levelLabel(lv)} style={{
                        background: focusedWeight === lv ? levelColor(lv) : '#FAFAFB',
                        color: focusedWeight === lv ? '#fff' : '#1d1d1f',
                        border: `1px solid ${focusedWeight === lv ? levelColor(lv) : '#ECECEF'}`,
                        borderRadius: 6, padding: '6px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{lv === -2 ? '−−' : lv === -1 ? '−' : lv === 0 ? '·' : lv === 1 ? '+' : '++'}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'center', fontStyle: 'italic' }}>Ajusta el tamaño de su burbuja en el mapa (×{weightMultiplier(focusedWeight)})</div>
                </div>

                {focusedM.web && (
                  <a href={focusedM.web} target="_blank" rel="noopener" style={{ marginTop: 8, display: 'block', textAlign: 'center', fontSize: 11.5, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none', padding: '6px 0', borderTop: '1px solid #ECECEF' }}>Ir al medio ↗</a>
                )}
                <div style={{ marginTop: 6, fontSize: 11, color: '#86868b', textAlign: 'right' }}>{pinned ? 'Fijado · pulsa otra vez para soltar' : 'Pulsa una burbuja para fijar'}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Cómo leer el mapa</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.014em', color: '#1d1d1f', marginBottom: 10 }}>Pasa el cursor por una burbuja</div>
                <p style={{ fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.55, margin: '0 0 12px' }}>
                  Cada burbuja es un medio. <strong>Eje horizontal</strong>: sesgo ideológico estimado (izquierda ↔ derecha). <strong>Eje vertical</strong>: {yAxis === 'credibilidad' ? 'credibilidad editorial' : 'alcance/audiencia'}. <strong>Tamaño</strong>: audiencia. <strong>Color</strong>: tipo de medio.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Box label="Credibilidad media" value={`${credMedia}`} color="#0F766E" />
                  <Box label="Con RSS" value={`${conRss}/${visibles.length}`} color="#7C2D92" />
                </div>
              </>
            )}
          </aside>
        </section>

        {/* Distribución ideológica + Concentración por grupo */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Distribución ideológica */}
          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }}>Distribución ideológica · {visibles.length} medios</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, alignItems: 'end', height: 150 }}>
              {IDEO_BUCKETS.map(b => {
                const n = ideoDist[b.key] ?? 0
                return (
                  <div key={b.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>{n}</div>
                    <div style={{ width: '100%', height: `${(n / ideoMax) * 110}px`, minHeight: 3, background: b.color, borderRadius: '4px 4px 0 0' }} />
                    <div style={{ fontSize: 9.5, color: '#6e6e73', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>{b.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Concentración por grupo */}
          <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }}>Concentración por grupo mediático</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {grupos.map(g => (
                <div key={g.grupo} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 64px', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={g.grupo}>{g.grupo}</span>
                  <div style={{ position: 'relative', height: 16, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(g.n / grupoMaxN) * 100}%`, background: '#7C2D92', borderRadius: 4, opacity: 0.85 }} />
                    <span style={{ position: 'absolute', left: 6, top: 1, fontSize: 10.5, fontWeight: 700, color: g.n / grupoMaxN > 0.18 ? '#fff' : '#1d1d1f' }}>{g.n}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#6e6e73', textAlign: 'right' }}>{g.aud.toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tono real por medio · bajo demanda (no ralentiza la carga) */}
        <div style={{ marginBottom: 14 }}>
          <TonoRealPanel />
        </div>

        {/* Catálogo completo */}
        <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }}>Catálogo · {visibles.length} medios</h2>
            <BoardToolbar
              count={visibles.length}
              onExportCsv={() => downloadCsv('catalogo-medios', visibles.map((m) => ({
                nombre: m.nombre, tipo: m.tipo, grupo: m.grupo, ambito: m.scope_level ?? m.ambito ?? '',
                ccaa: m.ccaa ?? '', ideologia: m.ideologia, credibilidad: cred100(m.credibilidad),
                audiencia_M: m.audiencia_M, rss: m.rss ? 'sí' : 'no', web: m.web,
              })))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 8 }}>
            {[...visibles].sort((a, b) => b.audiencia_M - a.audiencia_M).map(m => (
              <div key={m.id}
                 onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)}
                 style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 10, alignItems: 'center', padding: '9px 12px', background: focused === m.id ? '#fff' : '#FAFAFB', border: `1px solid ${focused === m.id ? (TIPO_COLOR[m.tipo] ?? '#ECECEF') + '66' : '#ECECEF'}`, borderRadius: 10, color: 'inherit', transition: 'all 140ms' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: TIPO_COLOR[m.tipo] ?? '#6e6e73' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <a href={m.web || '#'} target="_blank" rel="noopener noreferrer" title={`Abrir ${m.nombre}`} style={{ color: 'inherit', textDecoration: 'none' }}>{m.nombre} <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400 }}>↗</span></a>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#6e6e73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.tipo} · {m.grupo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>{m.audiencia_M.toFixed(1)}M</div>
                  <div style={{ fontSize: 10, color: ideoColor(m.ideologia), fontWeight: 700, marginTop: 2 }}>{m.ideologia > 0 ? '+' : ''}{m.ideologia} · cred {cred100(m.credibilidad)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '18px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Mapa de Medios · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────────────────────────────────
function Box({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 9, padding: '8px 10px' }}>
      <div style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color, marginTop: 1 }}>{value}</div>
    </div>
  )
}

function BarRow({ label, value, valueColor, fill, left, width, center, scaleLeft, scaleMid, scaleRight }: {
  label: string; value: string; valueColor: string; fill: string; left: number; width: number
  center?: boolean; scaleLeft: string; scaleMid: string; scaleRight: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: valueColor }}>{value}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#fff', borderRadius: 3, border: '1px solid #ECECEF' }}>
        {center && <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#1d1d1f', opacity: 0.4 }} />}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${Math.max(0, width)}%`, background: fill, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#86868b', marginTop: 3 }}>
        <span>{scaleLeft}</span><span>{scaleMid}</span><span>{scaleRight}</span>
      </div>
    </div>
  )
}

function Segmented({ label, options, value, onChange, colorOf, labelOf, dot }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
  colorOf?: (v: string) => string; labelOf?: (v: string) => string; dot?: boolean
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, gap: 2, flexWrap: 'wrap' }}>
        {options.map(o => {
          const active = value === o
          const c = colorOf ? colorOf(o) : '#1d1d1f'
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              background: active ? '#fff' : 'transparent', color: active ? c : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 11.5, fontWeight: active ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {dot && o !== 'Todos' && colorOf && <span style={{ width: 7, height: 7, borderRadius: '50%', background: colorOf(o) }} />}
              {labelOf ? labelOf(o) : o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
