'use client'
/**
 * MediaIntelV2Dashboard — capa 4 del módulo de medios.
 *
 * Lee de /api/media-intel-v2/* (proxies del backend /api/media-intel/*).
 * Todos los gráficos son SVG nativos para mantener consistencia con
 * MacroFinanceDashboard (sin recharts ni date-fns).
 *
 * 7 pestañas:
 *  1. Panorama   — KPIs + espectro ideológico + cobertura CCAA
 *  2. Sentimiento — series temporales sentimiento por etiqueta
 *  3. Entidades  — top PER / ORG / LOC en ventana temporal
 *  4. Tópicos    — clusters BERTopic emergentes
 *  5. Spikes     — fuentes con z-score > umbral
 *  6. Alertas    — narrativas combinadas (spike + sentimiento)
 *  7. Feed       — artículos paginados con filtros
 */
import { useEffect, useMemo, useState } from 'react'

type Tab = 'panorama' | 'sentimiento' | 'entidades' | 'topicos' | 'spikes' | 'alertas' | 'feed'

const TAB_LABELS: Record<Tab, string> = {
  panorama:    'Panorama',
  sentimiento: 'Sentimiento',
  entidades:   'Entidades',
  topicos:     'Tópicos',
  spikes:      'Spikes',
  alertas:     'Alertas',
  feed:        'Feed',
}

const IDEOLOGIA_COLORS: Record<string, string> = {
  izquierda:       '#E53935',
  centroizquierda: '#EF6C00',
  centro:          '#5856D6',
  centroderecha:   '#0D7F3F',
  derecha:         '#1565C0',
  institucional:   '#6D4C41',
  internacional:   '#00838F',
}

const SENT_COLORS = {
  positivo: '#16A34A',
  negativo: '#DC2626',
  neutro:   '#94A3B8',
}

const IDEOLOGIA_ORDER = ['izquierda','centroizquierda','centro','centroderecha','derecha','institucional','internacional']
const IDEOLOGIA_LABELS: Record<string,string> = {
  izquierda:'Izquierda', centroizquierda:'Centro-izq.', centro:'Centro',
  centroderecha:'Centro-der.', derecha:'Derecha', institucional:'Institucional',
  internacional:'Internacional',
}

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—'
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(s))
  } catch { return s }
}

const fmtDateOnly = (s: string | null | undefined) => {
  if (!s) return '—'
  try {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(s))
  } catch { return s }
}

interface Stats {
  total: number
  ultimas_24h: number
  ultima_hora: number
  fuentes_activas: number
  duplicados: number
  spikes_activos: number
}

interface Espectro {
  ideologia: string
  articulos: number
  fuentes: number
  avg_words?: number
}

export default function MediaIntelV2Dashboard() {
  const [tab, setTab] = useState<Tab>('panorama')
  const [horas, setHoras] = useState<number>(168)  // last 7 days by default to ensure data shown
  const [ideologiaFiltro, setIdeologiaFiltro] = useState<string | null>(null)

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '20px 22px', marginTop: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <header style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Media Intelligence v2 · datos en vivo
        </span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', margin: '4px 0', color: '#1d1d1f' }}>
          Monitor de medios &amp; narrativas
        </h2>
        <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: 0, lineHeight: 1.5 }}>
          69 fuentes RSS (24 nacionales · 16 regionales CCAA · 11 internacionales · 8 institucionales · 10 especializadas).
          Procesamiento: limpieza, dedup fuzzy, detección de idioma/CCAA, spike z-score, sentimiento + NER + clustering.
        </p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, flexWrap: 'wrap' }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => {
            const active = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 14px',
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{TAB_LABELS[t]}</button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[6, 24, 168, 720].map(h => (
            <button key={h} onClick={() => setHoras(h)} style={{
              background: horas === h ? '#1d1d1f' : '#fff',
              color: horas === h ? '#fff' : '#3a3a3d',
              border: '1px solid #ECECEF', borderRadius: 6,
              padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{h === 168 ? '7d' : h === 720 ? '30d' : `${h}h`}</button>
          ))}
        </div>
      </div>

      {tab === 'panorama'    && <Panorama horas={horas} ideologiaFiltro={ideologiaFiltro} setIdeologiaFiltro={setIdeologiaFiltro}/>}
      {tab === 'sentimiento' && <Sentimiento horas={horas} ideologia={ideologiaFiltro}/>}
      {tab === 'entidades'   && <Entidades horas={horas}/>}
      {tab === 'topicos'     && <Topicos horas={horas}/>}
      {tab === 'spikes'      && <Spikes horas={Math.min(horas, 24)}/>}
      {tab === 'alertas'     && <Alertas horas={Math.min(horas, 24)}/>}
      {tab === 'feed'        && <Feed horas={horas} ideologia={ideologiaFiltro}/>}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Panorama
// ─────────────────────────────────────────────────────────────────────────

function Panorama({ horas, ideologiaFiltro, setIdeologiaFiltro }: {
  horas: number; ideologiaFiltro: string | null; setIdeologiaFiltro: (s: string | null) => void
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [espectro, setEspectro] = useState<Espectro[]>([])
  const [ccaa, setCcaa] = useState<Array<{ ccaa: string; articulos: number; fuentes: number }>>([])
  const [terminos, setTerminos] = useState<Array<{ termino: string; frecuencia: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/media-intel-v2/stats`).then(r => r.json()),
      fetch(`/api/media-intel-v2/espectro?horas=${horas}`).then(r => r.json()),
      fetch(`/api/media-intel-v2/cobertura-ccaa?horas=${horas}`).then(r => r.json()),
      fetch(`/api/media-intel-v2/terminos?horas=${Math.min(horas, 168)}&limit=18`).then(r => r.json()),
    ])
      .then(([s, e, c, t]) => {
        setStats(s)
        setEspectro(Array.isArray(e) ? e : [])
        setCcaa(Array.isArray(c) ? c : [])
        setTerminos(Array.isArray(t) ? t : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [horas])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6e6e73', fontSize: 12 }}>Cargando…</div>

  const totalEspectro = espectro.reduce((s, e) => s + e.articulos, 0) || 1
  const maxEspectro = Math.max(...espectro.map(e => e.articulos), 1)

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Artículos totales',  value: stats?.total ?? 0,           color: '#1F4E8C' },
          { label: 'Últimas 24h',        value: stats?.ultimas_24h ?? 0,     color: '#5856D6' },
          { label: 'Última hora',        value: stats?.ultima_hora ?? 0,     color: '#34C759' },
          { label: 'Fuentes activas',    value: stats?.fuentes_activas ?? 0, color: '#7C3AED' },
          { label: 'Spikes activos',     value: stats?.spikes_activos ?? 0,  color: '#FF3B30' },
          { label: 'Duplicados',         value: stats?.duplicados ?? 0,      color: '#8E8E93' },
        ].map(k => (
          <div key={k.label} style={{
            border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px', background: '#FAFAFB',
          }}>
            <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {k.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1.1, marginTop: 4 }}>
              {k.value.toLocaleString('es-ES')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 14, marginBottom: 14 }}>
        {/* Espectro ideológico */}
        <Card title={`Espectro ideológico · últimas ${horas}h`}>
          {espectro.length === 0 ? <Empty/> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {IDEOLOGIA_ORDER.map(id => {
                const item = espectro.find(e => e.ideologia === id)
                if (!item) return null
                const color = IDEOLOGIA_COLORS[id] ?? '#8E8E93'
                const pct = Math.round((item.articulos / totalEspectro) * 100)
                const barPct = Math.round((item.articulos / maxEspectro) * 100)
                const isSelected = ideologiaFiltro === id
                return (
                  <button key={id} onClick={() => setIdeologiaFiltro(isSelected ? null : id)} style={{
                    all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 8px', borderRadius: 8,
                    background: isSelected ? color + '14' : 'transparent',
                    border: `1px solid ${isSelected ? color : 'transparent'}`,
                  }}>
                    <span style={{ width: 110, fontSize: 12, fontWeight: 600, color: '#1d1d1f', flexShrink: 0 }}>
                      {IDEOLOGIA_LABELS[id] ?? id}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F2F2F7', overflow: 'hidden' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.3s' }}/>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 56 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{item.articulos}</span>
                      <span style={{ fontSize: 10, color: '#86868b' }}>{pct}% · {item.fuentes}f</span>
                    </div>
                  </button>
                )
              })}
              {ideologiaFiltro && (
                <button onClick={() => setIdeologiaFiltro(null)} style={{
                  background: 'transparent', border: 'none', color: '#6e6e73',
                  fontSize: 11, cursor: 'pointer', textDecoration: 'underline', marginTop: 4,
                }}>Quitar filtro</button>
              )}
            </div>
          )}
        </Card>

        {/* Términos calientes */}
        <Card title={`Términos calientes · últimas ${horas}h`}>
          {terminos.length === 0 ? <Empty/> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {terminos.map((t, i) => {
                const maxFreq = terminos[0]?.frecuencia ?? 1
                const size = 10 + (t.frecuencia / maxFreq) * 8
                return (
                  <span key={t.termino} style={{
                    fontSize: size, fontWeight: 600, color: i < 5 ? '#1d1d1f' : '#3a3a3d',
                    padding: '4px 9px', background: '#F5F5F7', borderRadius: 6,
                    border: '1px solid #ECECEF',
                  }}>
                    {t.termino} <span style={{ fontSize: 10, color: '#86868b', marginLeft: 4 }}>{t.frecuencia}</span>
                  </span>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Cobertura CCAA */}
      {ccaa.length > 0 && (
        <Card title="Cobertura por CCAA">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {ccaa.slice(0, 20).map(c => (
              <div key={c.ccaa} style={{
                border: '1px solid #ECECEF', borderRadius: 6,
                padding: '7px 9px', background: '#fff',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{c.ccaa}</div>
                <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{c.articulos} art · {c.fuentes} medios</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Sentimiento
// ─────────────────────────────────────────────────────────────────────────

function Sentimiento({ horas, ideologia }: { horas: number; ideologia: string | null }) {
  const [data, setData] = useState<Array<{ bucket: string; sentiment_label: string; articulos: number; score_medio: number; ideologia: string }>>([])
  const granularity = horas <= 48 ? 'hour' : 'day'
  useEffect(() => {
    const url = `/api/media-intel-v2/sentimiento?horas=${horas}&granularidad=${granularity}${ideologia ? `&ideologia=${ideologia}` : ''}`
    fetch(url).then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [horas, ideologia, granularity])

  // Aggregate by bucket
  const byBucket = new Map<string, { positivo: number; negativo: number; neutro: number }>()
  for (const row of data) {
    const b = row.bucket
    const e = byBucket.get(b) ?? { positivo: 0, negativo: 0, neutro: 0 }
    if (row.sentiment_label === 'positivo') e.positivo += row.articulos
    else if (row.sentiment_label === 'negativo') e.negativo += row.articulos
    else e.neutro += row.articulos
    byBucket.set(b, e)
  }
  const series = Array.from(byBucket.entries())
    .map(([b, v]) => ({ bucket: b, ...v }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))

  return (
    <Card title={`Evolución del sentimiento · últimas ${horas}h${ideologia ? ` (filtro: ${IDEOLOGIA_LABELS[ideologia] ?? ideologia})` : ''}`}>
      {series.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          Sin datos NLP cargados aún. El pipeline de sentimiento corre cada N min — si transformers no está instalado, los artículos se marcan como neutros.
        </div>
      ) : <StackedAreaChart data={series} keys={['positivo','negativo','neutro']} colors={SENT_COLORS}/>}
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 10 }}>
        BETO sentiment (es) + DistilBERT multilingual (ca/eu/gl/fr/en). Modelo: <code>finiteautomata/beto-sentiment-analysis</code>.
      </p>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Entidades
// ─────────────────────────────────────────────────────────────────────────

function Entidades({ horas }: { horas: number }) {
  const [tipo, setTipo] = useState<'PER' | 'ORG' | 'LOC'>('PER')
  const [data, setData] = useState<Array<{ entidad: string; menciones: number; score_medio: number }>>([])
  useEffect(() => {
    fetch(`/api/media-intel-v2/entidades?tipo=${tipo}&horas=${horas}&limit=20`)
      .then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [tipo, horas])
  const max = Math.max(...data.map(d => d.menciones), 1)
  return (
    <Card title={`Entidades más citadas · últimas ${horas}h`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['PER','ORG','LOC'] as const).map(t => (
          <button key={t} onClick={() => setTipo(t)} style={{
            background: tipo === t ? '#1d1d1f' : '#fff',
            color: tipo === t ? '#fff' : '#3a3a3d',
            border: '1px solid #ECECEF', borderRadius: 999,
            padding: '5px 14px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
          }}>
            {t === 'PER' ? 'Personas' : t === 'ORG' ? 'Organizaciones' : 'Lugares'}
          </button>
        ))}
      </div>
      {data.length === 0 ? <Empty msg="Sin entidades extraídas todavía. Requiere NLP backend con transformers instalado."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((e, i) => (
            <div key={e.entidad} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: '#86868b', textAlign: 'right' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.entidad}
              </span>
              <div style={{ width: 100, height: 5, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(e.menciones / max) * 100}%`, height: '100%', background: '#5856D6' }}/>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5856D6', minWidth: 30, textAlign: 'right' }}>{e.menciones}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Tópicos
// ─────────────────────────────────────────────────────────────────────────

function Topicos({ horas }: { horas: number }) {
  const [data, setData] = useState<Array<{ topico: string; articulos: number; sentiment_medio: number; fuentes_distintas: number; ideologias?: string[] }>>([])
  useEffect(() => {
    fetch(`/api/media-intel-v2/topicos?horas=${horas}&limit=25`).then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [horas])
  return (
    <Card title={`Clusters temáticos BERTopic · últimas ${horas}h`}>
      {data.length === 0 ? (
        <Empty msg="Sin clusters todavía. BERTopic procesa en batch cada 3h — requiere transformers + sentence-transformers + bertopic en el backend."/>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.map(t => {
            const sentColor = t.sentiment_medio > 0.2 ? '#16A34A'
                            : t.sentiment_medio < -0.2 ? '#DC2626' : '#94A3B8'
            const size = Math.max(11, Math.min(16, 11 + Math.log(t.articulos + 1) * 1.2))
            return (
              <div key={t.topico} style={{
                padding: '6px 12px', borderRadius: 8,
                background: '#FAFAFB',
                border: `1px solid ${sentColor}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentColor }}/>
                  <span style={{ fontSize: size, fontWeight: 600, color: '#1d1d1f' }}>{t.topico}</span>
                </div>
                <div style={{ fontSize: 10, color: '#86868b', marginLeft: 12, marginTop: 2 }}>
                  {t.articulos} art · {t.fuentes_distintas} medios
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Spikes
// ─────────────────────────────────────────────────────────────────────────

function Spikes({ horas }: { horas: number }) {
  const [data, setData] = useState<Array<{ fuente_id: string; fuente_nombre: string; ideologia: string; cnt_reciente: number; z_score: number }>>([])
  useEffect(() => {
    fetch(`/api/media-intel-v2/spikes?horas=${horas}&umbral_sigma=0.8`).then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [horas])
  const zColor = (z: number) => z >= 3 ? '#7f1d1d' : z >= 1.5 ? '#ef4444' : z >= 0.5 ? '#F97316' : '#94A3B8'
  return (
    <Card title={`Fuentes con actividad anómala · últimas ${horas}h`}>
      {data.length === 0 ? <Empty msg="Sin spikes detectados con z > 0.8 σ"/> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAFAFB', borderBottom: '2px solid #ECECEF' }}>
              {['Fuente','Ideología','Artículos','Z-score'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.fuente_id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1d1d1f' }}>{r.fuente_nombre}</td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                 background: (IDEOLOGIA_COLORS[r.ideologia] ?? '#94A3B8') + '20',
                                 color: IDEOLOGIA_COLORS[r.ideologia] ?? '#3a3a3d',
                                 fontWeight: 700 }}>
                    {IDEOLOGIA_LABELS[r.ideologia] ?? r.ideologia}
                  </span>
                </td>
                <td style={{ padding: '7px 10px', color: '#1d1d1f' }}>{r.cnt_reciente}</td>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: zColor(r.z_score), fontFamily: 'monospace' }}>
                  {r.z_score.toFixed(2)}σ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Alertas
// ─────────────────────────────────────────────────────────────────────────

function Alertas({ horas }: { horas: number }) {
  const [data, setData] = useState<Array<{ fuente_id: string; fuente_nombre: string; ideologia: string; articulos_afectados: number; sentiment_medio: number; max_spike: number; titulos_muestra: string[] }>>([])
  useEffect(() => {
    fetch(`/api/media-intel-v2/alertas?horas=${horas}`).then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [horas])
  return (
    <Card title={`Alertas narrativas · últimas ${horas}h`}>
      {data.length === 0 ? <Empty msg="Sin alertas. Actividad dentro de parámetros normales."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map(a => {
            const ideoColor = IDEOLOGIA_COLORS[a.ideologia] ?? '#94A3B8'
            return (
              <article key={a.fuente_id} style={{
                padding: '10px 14px', borderRadius: 10,
                background: '#FFF8F7', border: '1px solid #FFDDD9',
                borderLeft: `4px solid ${ideoColor}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>
                    {a.fuente_nombre}{' '}
                    <span style={{ fontSize: 10, fontWeight: 600, color: ideoColor, padding: '1px 6px', background: ideoColor + '14', borderRadius: 3, marginLeft: 6 }}>
                      {IDEOLOGIA_LABELS[a.ideologia] ?? a.ideologia}
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontFamily: 'monospace' }}>
                    {a.max_spike > 0 && <span style={{ color: '#FF6D00' }}>z={a.max_spike.toFixed(1)}σ</span>}
                    <span style={{ color: a.sentiment_medio < 0 ? '#DC2626' : '#94A3B8' }}>
                      sent={a.sentiment_medio.toFixed(2)}
                    </span>
                  </div>
                </div>
                {a.titulos_muestra?.[0] && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#6e6e73', lineHeight: 1.45 }}>
                    {a.titulos_muestra[0]}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Feed
// ─────────────────────────────────────────────────────────────────────────

interface Articulo {
  id: number
  titulo: string
  resumen: string | null
  url: string
  fuente_nombre: string
  fuente: string
  ideologia: string | null
  fecha_publicacion: string | null
  fecha_scraping: string | null
  imagen_url: string | null
  sentiment_label: string | null
  spike_score: number | null
}

function Feed({ horas, ideologia }: { horas: number; ideologia: string | null }) {
  const [q, setQ] = useState('')
  const [soloSpikes, setSoloSpikes] = useState(false)
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<Articulo[]>([])
  const LIMIT = 25

  useEffect(() => { setOffset(0) }, [horas, ideologia, q, soloSpikes])

  useEffect(() => {
    const p = new URLSearchParams({
      horas: String(horas), limit: String(LIMIT), offset: String(offset),
      ...(q ? { q } : {}),
      ...(ideologia ? { ideologia } : {}),
      ...(soloSpikes ? { solo_spikes: 'true' } : {}),
    })
    fetch(`/api/media-intel-v2/articulos?${p}`).then(r => r.json()).then(j => setData(Array.isArray(j) ? j : []))
  }, [horas, ideologia, q, soloSpikes, offset])

  return (
    <Card title={`Feed de artículos · últimas ${horas}h${ideologia ? ` (filtro: ${IDEOLOGIA_LABELS[ideologia] ?? ideologia})` : ''}`}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input type="search" placeholder="Buscar en títulos y resúmenes…" value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            flex: 1, minWidth: 220, height: 32, borderRadius: 8,
            border: '1px solid #ECECEF', padding: '0 12px', fontSize: 12.5,
            outline: 'none', background: '#FBFBFD',
          }}/>
        <button onClick={() => setSoloSpikes(s => !s)} style={{
          height: 32, padding: '0 12px', borderRadius: 999,
          border: '1px solid ' + (soloSpikes ? '#FF9500' : '#ECECEF'),
          background: soloSpikes ? '#FFF3E0' : '#fff',
          color: soloSpikes ? '#FF6D00' : '#3a3a3d',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        }}>Solo spikes</button>
      </div>
      {data.length === 0 ? <Empty msg="Sin artículos para los filtros aplicados."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map(art => (
            <a key={art.id} href={art.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 10,
              border: '1px solid #ECECEF', background: '#fff', textDecoration: 'none',
            }}>
              {art.imagen_url && (
                <img src={art.imagen_url} alt="" style={{
                  width: 56, height: 56, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
                }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73' }}>{art.fuente_nombre || art.fuente}</span>
                  {art.ideologia && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 3,
                      background: (IDEOLOGIA_COLORS[art.ideologia] ?? '#94A3B8') + '20',
                      color: IDEOLOGIA_COLORS[art.ideologia] ?? '#3a3a3d',
                    }}>{IDEOLOGIA_LABELS[art.ideologia] ?? art.ideologia}</span>
                  )}
                  <span style={{ fontSize: 10, color: '#86868b' }}>{fmtDate(art.fecha_scraping || art.fecha_publicacion)}</span>
                  {art.sentiment_label && art.sentiment_label !== 'neutro' && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                      background: (SENT_COLORS[art.sentiment_label as keyof typeof SENT_COLORS] || '#94A3B8') + '20',
                      color: SENT_COLORS[art.sentiment_label as keyof typeof SENT_COLORS] || '#94A3B8',
                    }}>{art.sentiment_label}</span>
                  )}
                  {art.spike_score && art.spike_score > 2 && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                                   background: '#FFF3E0', color: '#FF6D00' }}>
                      {art.spike_score.toFixed(1)}σ
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.4 }}>
                  {art.titulo}
                </p>
                {art.resumen && (
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73', lineHeight: 1.4,
                              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {art.resumen}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={pgBtn(offset === 0)}>← Anterior</button>
        <button disabled={data.length < LIMIT} onClick={() => setOffset(o => o + LIMIT)} style={pgBtn(data.length < LIMIT)}>Siguiente →</button>
      </div>
    </Card>
  )
}

function pgBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
    border: '1px solid #ECECEF', cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? '#C7C7CC' : '#1d1d1f', background: '#fff',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SVG StackedAreaChart (native, no recharts)
// ─────────────────────────────────────────────────────────────────────────

interface StackedPoint { bucket: string; [k: string]: string | number }

function StackedAreaChart({ data, keys, colors }: {
  data: StackedPoint[]; keys: string[]; colors: Record<string, string>
}) {
  const W = 800, H = 240, padX = 36, padY = 22
  if (data.length === 0) return <Empty/>
  const dates = data.map(d => String(d.bucket))
  const xScale = (i: number) => padX + (i / Math.max(1, dates.length - 1)) * (W - padX * 2)
  const totals = data.map(d => keys.reduce((s, k) => s + (Number(d[k]) || 0), 0))
  const maxTot = Math.max(...totals, 1)
  const yScale = (v: number) => padY + (1 - v / maxTot) * (H - padY * 2)

  // Build stacked paths
  const stacks: number[][] = data.map(() => [0])
  for (const k of keys) {
    for (let i = 0; i < data.length; i++) {
      stacks[i].push(stacks[i][stacks[i].length - 1] + (Number(data[i][k]) || 0))
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={padX} y1={padY + p * (H - padY * 2)} x2={W - padX}
              y2={padY + p * (H - padY * 2)} stroke="#F5F5F7" strokeWidth={1}/>
      ))}
      {keys.map((k, kIdx) => {
        const color = colors[k] ?? '#94A3B8'
        const pts: [number, number][] = data.map((_, i) => [xScale(i), yScale(stacks[i][kIdx + 1])])
        const ptsLower: [number, number][] = data.map((_, i) => [xScale(i), yScale(stacks[i][kIdx])])
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') +
                     ' ' + ptsLower.slice().reverse().map((p, i) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'
        return <path key={k} d={path} fill={color} fillOpacity={0.45} stroke={color} strokeWidth={1}/>
      })}
      {/* X-axis labels */}
      {data.length > 0 && [0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={xScale(i)} y={H + 12} textAnchor="middle" style={{ fontSize: 10, fill: '#6e6e73' }}>
          {fmtDateOnly(String(data[i].bucket))}
        </text>
      ))}
      {/* Legend */}
      <g transform={`translate(${padX}, ${H + 22})`}>
        {keys.map((k, i) => (
          <g key={k} transform={`translate(${i * 110}, 0)`}>
            <rect width={12} height={6} fill={colors[k] ?? '#94A3B8'} rx={1}/>
            <text x={16} y={6} style={{ fontSize: 10, fill: '#3a3a3d' }}>{k}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
      padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700,
                   color: '#1d1d1f', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Empty({ msg = 'Sin datos para este horizonte.' }: { msg?: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
      {msg}
    </div>
  )
}
