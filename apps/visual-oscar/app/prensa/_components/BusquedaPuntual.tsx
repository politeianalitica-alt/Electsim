'use client'
/**
 * `<BusquedaPuntual />` · Tab 2 · Investigación libre del analista.
 *
 * Convierte la plataforma en herramienta de investigación: cualquier tema,
 * cualquier ventana temporal, cualquier bloque de medios.
 *
 * Llama a /api/medios/search · NewsAPI ES + dominios + sourceGroups + sortBy.
 * NEWS_API_KEY no se expone al cliente · solo se usa server-side.
 */
import { useState, useEffect, useCallback } from 'react'
import { useMediosDrawer } from './MediosDrawerProvider'
import { LecturaPoliteia } from './LecturaPoliteia'
import type { SourceGroup } from '@/lib/medios/sources-matrix'
import { IDEOLOGY_RANGES } from '@/lib/medios/sources-matrix'

interface SearchResponse {
  ok: boolean
  query: string
  totalResults?: number
  n_articles?: number
  articles?: any[]
  timeline?: { date: string; count: number }[]
  topSources?: { source: string; count: number }[]
  topDomains?: { domain: string; count: number; ideology?: SourceGroup | null }[]
  actors?: { name: string; mentions: number; sentiment: number }[]
  topics?: { label: string; count: number }[]
  narratives?: { frame: string; count: number; examples: string[] }[]
  sentiment?: { score: number; positive: number; negative: number; neutral: number }
  ideologicalComparison?: { bucket: SourceGroup; count: number; sentiment: number; dominantFrames: string[] }[] | null
  data_quality?: { source_type: string; source_name: string }
  error?: string
  hint?: string
  params_applied?: any
}

const ACCENT = '#DC2626'
const SUGERENCIAS = [
  'crisis migratoria Canarias',
  'Vox Andalucía elecciones',
  'caso Koldo PSOE',
  'aranceles agroalimentarios',
  'defensa europea OTAN',
  'vivienda alquiler Madrid',
  'Marruecos Sáhara',
  'inteligencia artificial regulación UE',
  'energía renovables España',
  'corrupción Junts amnistía',
]

export function BusquedaPuntual() {
  const { openDrill } = useMediosDrawer()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState<'es' | 'en' | 'fr'>('es')
  const [sortBy, setSortBy] = useState<'publishedAt' | 'relevancy' | 'popularity'>('relevancy')
  const [sourceGroups, setSourceGroups] = useState<SourceGroup[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [pageSize, setPageSize] = useState(50)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await fetch('/api/medios/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          language,
          sortBy,
          sourceGroups: sourceGroups.length ? sourceGroups : undefined,
          from: from || undefined,
          to: to || undefined,
          pageSize,
        }),
      })
      const data: SearchResponse = await r.json()
      if (!r.ok || !data.ok) {
        setError(data.error || data.hint || `HTTP ${r.status}`)
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [query, language, sortBy, sourceGroups, from, to, pageSize])

  const toggleSourceGroup = (g: SourceGroup) => {
    setSourceGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])
  }

  const openArticleDrill = (article: any) => {
    openDrill({
      title: article.title,
      subtitle: `${article.source} · ${new Date(article.published).toLocaleString('es-ES')}`,
      accent: ACCENT,
      content: (
        <div>
          {article.image && (
            <img
              src={article.image}
              alt=""
              style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{article.description}</p>
          <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>METADATA</p>
            <table style={{ width: '100%', fontSize: 11, marginTop: 6 }}>
              <tbody>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Autor</td><td>{article.author || '—'}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Dominio</td><td><code>{article.domain}</code></td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Idioma</td><td>{article.language}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Sentimiento</td><td>{(article.sentiment_score * 100).toFixed(0)}%</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Ideología</td><td>{article.ideology_bucket || '—'}</td></tr>
              </tbody>
            </table>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 16, padding: '8px 16px', background: ACCENT, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
          >
            Abrir en {article.source} →
          </a>
        </div>
      ),
    })
  }

  // Atajos teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        runSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [runSearch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Form principal */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          Búsqueda puntual · Investigación libre
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px', lineHeight: 1.5 }}>
          Cualquier tema, ventana temporal y bloque de medios. NewsAPI + RSS interno + futuras fuentes GDELT/Media Cloud.
          Atajo: <kbd style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }}>⌘+Enter</kbd>
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder='Ej: "crisis migratoria Canarias" OR "Vox Andalucía" — operadores AND OR NOT y comillas soportados'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSearch() } }}
            style={{
              flex: '1 1 380px',
              padding: '10px 14px',
              fontSize: 14,
              border: '1.5px solid #e5e7eb',
              borderRadius: 8,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={runSearch}
            disabled={loading || !query.trim()}
            style={{
              background: loading || !query.trim() ? '#94a3b8' : ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Buscando…' : 'Investigar →'}
          </button>
        </div>

        {/* Filtros avanzados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
          <Field label="Idioma">
            <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={selectStyle}>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="fr">Francés</option>
            </select>
          </Field>
          <Field label="Ordenar por">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={selectStyle}>
              <option value="relevancy">Relevancia</option>
              <option value="publishedAt">Fecha</option>
              <option value="popularity">Popularidad</option>
            </select>
          </Field>
          <Field label="Desde">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={selectStyle} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={selectStyle} />
          </Field>
          <Field label="Page size">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={selectStyle}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100 (max)</option>
            </select>
          </Field>
        </div>

        {/* Bloques ideológicos */}
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Filtrar por bloque ideológico (opcional)
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(IDEOLOGY_RANGES) as SourceGroup[]).map((g) => {
              const cfg = IDEOLOGY_RANGES[g]
              const active = sourceGroups.includes(g)
              return (
                <button
                  key={g}
                  onClick={() => toggleSourceGroup(g)}
                  style={{
                    background: active ? cfg.color : '#fff',
                    color: active ? '#fff' : cfg.color,
                    border: `1px solid ${cfg.color}`,
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sugerencias */}
        {!result && !loading && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #e5e7eb' }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 8px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Sugerencias de búsqueda
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGERENCIAS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(s) }}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12, color: '#991b1b', margin: 0, fontWeight: 600 }}>
            ⚠ {error}
          </p>
          {error === 'no_api_key' && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0' }}>
              NEWSAPI_KEY no configurado en Vercel env vars. Contacta al admin para activar la búsqueda con NewsAPI.
            </p>
          )}
        </section>
      )}

      {/* Resultados */}
      {result?.ok && (
        <>
          {/* Acciones rápidas: dossier + lectura IA */}
          <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                const r = await fetch('/api/medios/dossier', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: result.query, search_response: result }),
                })
                const blob = await r.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                const ds = new Date().toISOString().slice(0, 10)
                a.download = `politeia-dossier-${result.query.toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}-${ds}.md`
                a.click()
                URL.revokeObjectURL(url)
              }}
              style={{ background: '#fff', color: '#DC2626', border: '1px solid #DC2626', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ↓ Exportar dossier (Markdown)
            </button>
            <button
              onClick={async () => {
                const r = await fetch('/api/medios/dossier?format=html', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: result.query, search_response: result }),
                })
                const html = await r.text()
                const w = window.open('', '_blank')
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500) }
              }}
              style={{ background: '#fff', color: '#1F4E8C', border: '1px solid #1F4E8C', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              🖨 Imprimir/PDF (HTML)
            </button>
            <button
              onClick={() => {
                const stored = JSON.parse(localStorage.getItem('politeia.medios.monitors.v1') || '[]')
                stored.unshift({
                  id: Math.random().toString(36).slice(2, 10),
                  query: result.query,
                  sourceGroups: result.params_applied?.sourceGroups || [],
                  language: result.params_applied?.language || 'es',
                  createdAt: Date.now(),
                })
                localStorage.setItem('politeia.medios.monitors.v1', JSON.stringify(stored))
                alert('Guardado como monitor · Ve a Tab 10 Informes')
              }}
              style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ☆ Guardar como monitor
            </button>
          </section>

          {/* Lectura Politeia IA */}
          <LecturaPoliteia
            tabId="busqueda"
            query={result.query}
            accent="#DC2626"
            context={{
              n_articles: result.n_articles,
              total_results: result.totalResults,
              top_sources: result.topSources,
              actors: result.actors,
              topics: result.topics,
              narratives: result.narratives,
              sentiment: result.sentiment,
              ideologicalComparison: result.ideologicalComparison || [],
              sample_titles: (result.articles || []).slice(0, 8).map((a: any) => a.title),
              timeline_summary: result.timeline?.length ? {
                from: result.timeline[0].date,
                to: result.timeline[result.timeline.length - 1].date,
                peak_date: result.timeline.reduce((m: any, p: any) => (p.count > (m?.count ?? 0) ? p : m), null)?.date,
                peak_value: result.timeline.reduce((m: any, p: any) => (p.count > (m?.count ?? 0) ? p : m), null)?.count,
              } : undefined,
            }}
          />

          {/* Sumario */}
          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Resultados · {result.totalResults?.toLocaleString('es-ES')} artículos totales · mostrados {result.n_articles}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
              <Metric label="Volumen" value={result.totalResults?.toLocaleString('es-ES') ?? '—'} accent={ACCENT} />
              <Metric label="Sentimiento medio" value={`${((result.sentiment?.score ?? 0) * 100).toFixed(0)}%`} accent={(result.sentiment?.score ?? 0) >= 0 ? '#16a34a' : '#dc2626'} />
              <Metric label="Positivos" value={String(result.sentiment?.positive ?? 0)} accent="#16a34a" />
              <Metric label="Negativos" value={String(result.sentiment?.negative ?? 0)} accent="#dc2626" />
              <Metric label="Medios únicos" value={String(result.topSources?.length ?? 0)} accent="#0f766e" />
              <Metric label="Actores detectados" value={String(result.actors?.length ?? 0)} accent="#7c3aed" />
            </div>
          </section>

          {/* Timeline */}
          {result.timeline && result.timeline.length > 1 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Timeline · evolución diaria
              </p>
              <TimelineChart points={result.timeline} accent={ACCENT} />
            </section>
          )}

          {/* Cobertura comparada ideológica */}
          {result.ideologicalComparison && result.ideologicalComparison.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Cobertura comparada · por bloque ideológico
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
                {result.ideologicalComparison.map((b, i) => {
                  const cfg = IDEOLOGY_RANGES[b.bucket]
                  return (
                    <div key={i} style={{ background: '#f8fafc', border: `1px solid ${cfg.color}33`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${cfg.color}` }}>
                      <p style={{ fontSize: 10, color: cfg.color, margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                        {cfg.label}
                      </p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: cfg.color, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                        {b.count} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>artículos</span>
                      </p>
                      <p style={{ fontSize: 11, color: b.sentiment >= 0 ? '#16a34a' : '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>
                        Sentimiento: {(b.sentiment * 100).toFixed(0)}%
                      </p>
                      {b.dominantFrames.length > 0 && (
                        <p style={{ fontSize: 10, color: '#64748b', margin: '6px 0 0' }}>
                          Frames: {b.dominantFrames.join(' · ')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Actors */}
          {result.actors && result.actors.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Actores detectados · ranking por menciones + sentimiento
              </p>
              <table style={{ width: '100%', fontSize: 12, marginTop: 8, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Actor</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Menciones</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Tono</th>
                  </tr>
                </thead>
                <tbody>
                  {result.actors.slice(0, 12).map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '5px 10px', fontWeight: 500 }}>{a.name}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.mentions}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: a.sentiment >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {a.sentiment >= 0 ? '+' : ''}{(a.sentiment * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Topics + Narratives */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {result.topics && result.topics.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Topics auto-detectados (bigrams)
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {result.topics.map((t, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: '4px 10px', background: '#f1f5f9', color: '#0f172a',
                      borderRadius: 999, fontWeight: 500,
                    }}>
                      {t.label} <strong style={{ color: ACCENT }}>{t.count}</strong>
                    </span>
                  ))}
                </div>
              </section>
            )}
            {result.narratives && result.narratives.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Frames narrativos detectados
                </p>
                <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                  {result.narratives.map((n, i) => (
                    <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{n.frame}</span>
                        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n.count}</span>
                      </div>
                      <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                        "{n.examples[0]?.slice(0, 80)}…"
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Top medios */}
          {result.topSources && result.topSources.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Top medios cubriendo el tema
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
                {result.topSources.slice(0, 12).map((s, i) => (
                  <div key={i} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 500 }}>{s.source}</span>
                    <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Articles */}
          {result.articles && result.articles.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Artículos · {result.articles.length} resultados · click para detalle
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {result.articles.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => openArticleDrill(a)}
                    style={{
                      padding: 12,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 100ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 2px 8px ${ACCENT}11` }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.4 }}>
                          {a.title}
                        </p>
                        {a.description && (
                          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {a.description.slice(0, 160)}{a.description.length > 160 ? '…' : ''}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{a.source}</span>
                        <p style={{ fontSize: 9, color: '#cbd5e1', margin: '2px 0 0' }}>
                          {new Date(a.published).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    {a.ideology_bucket && (
                      <span style={{
                        display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 4,
                        background: IDEOLOGY_RANGES[a.ideology_bucket as SourceGroup]?.color + '22',
                        color: IDEOLOGY_RANGES[a.ideology_bucket as SourceGroup]?.color,
                      }}>
                        {IDEOLOGY_RANGES[a.ideology_bucket as SourceGroup]?.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  background: '#fff',
  color: '#0f172a',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, borderLeft: `3px solid ${accent}` }}>
      <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

function TimelineChart({ points, accent }: { points: { date: string; count: number }[]; accent: string }) {
  if (points.length < 2) return null
  const width = 760
  const height = 80
  const max = Math.max(...points.map((p) => p.count))
  const step = width / Math.max(points.length - 1, 1)
  const pts = points.map((p, i) => `${(i * step).toFixed(1)},${(height - (p.count / max) * (height - 8) - 4).toFixed(1)}`).join(' ')
  return (
    <div style={{ marginTop: 10 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * step} cy={height - (p.count / max) * (height - 8) - 4} r={2.5} fill={accent} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
        <span>{points[0].date}</span>
        <span>Pico: {max} · {points.find((p) => p.count === max)?.date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  )
}
