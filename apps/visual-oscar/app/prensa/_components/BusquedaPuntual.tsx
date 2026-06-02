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
  // Sprint M4 · análisis enriquecido (opcional · presente si mode=deep|dossier|comparative)
  article_readings?: Array<any>
  narrative_clusters?: Array<{
    id: string
    title: string
    short_summary: string
    frame_type: string
    main_topic: string
    dominant_actors: string[]
    benefited_actors: string[]
    harmed_actors: string[]
    representative_titles: string[]
    velocity_score: number
    acceleration_score: number
    ideological_spread: { left: number; center: number; right: number; balanced: boolean }
    controversy_score: number
    confidence: { overall: number; reasons: string[] }
    why_this_is_a_narrative: string
    evidence: Array<{ title: string; medium: string; url: string; ideology: string }>
  }>
  actor_impacts?: Array<{
    actor: string
    mentions: number
    dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
    beneficial: number
    harmful: number
    neutral: number
    uncertain: number
    sample_reasons: string[]
  }>
  source_diversity?: {
    ideological_balance_score: number
    territorial_balance_score: number
    warnings: string[]
  }
  methodology_confidence?: { overall: number; reasons: string[] }
  analysis_warnings?: Array<{ level: 'info' | 'warning' | 'critical'; category: string; message: string; evidence?: string }>
  coverage_gaps?: Array<{ topic: string; total_mentions: number; interpretation: string }>
  framing_comparison?: Array<{
    bucket: string
    count: number
    dominant_topics: { topic: string; count: number }[]
    dominant_frames: { frame: string; count: number }[]
    actors_emphasized: { actor: string; mentions: number }[]
    actors_omitted: string[]
    average_tone: number
    controversy_score: number
    representative_titles: string[]
    distinctive_terms: { term: string; lift: number }[]
    interpretation: string
  }>
  // Sprint M5 FASE 3 · comparative real (presente sólo si mode='comparative')
  comparative_runs?: Array<{
    bucket: SourceGroup
    n_articles: number
    sentiment_mean: number
    positive: number
    negative: number
    neutral: number
    top_frames: { frame: string; count: number }[]
    top_actors: { actor: string; mentions: number }[]
    top_domains: { domain: string; count: number }[]
    representative_titles: string[]
  }>
  suggested_followup_queries?: Array<{
    query: string
    reason: string
    expected_focus: string
    params?: {
      sortBy?: 'relevancy' | 'publishedAt' | 'popularity'
      sourceGroups?: string[]
      from?: string
      to?: string
      language?: string
    }
  }>
  // Sprint M5 FASE 1 · transparencia matching catálogo
  catalog_match?: {
    catalog_total: number
    matched_sources: number
    unmatched_sources: number
    catalog_match_rate: number
    match_strategies: Record<string, number>
    unmatched_samples: Array<{ domain: string; name: string }>
  }
  analysis_layers?: {
    legacy_available: boolean
    preferred: string[]
    legacy_fallback: string[]
    note: string
  }
  _meta?: { source: string; ts: string; latency_ms: number; warnings: string[]; methodology_version: string; confidence?: number }
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
  // Sprint M5 FASE 3 · modo análisis · 'deep' = una query con todos · 'comparative' = N queries por bucket
  const [mode, setMode] = useState<'deep' | 'comparative'>('deep')
  // Sprint M5 FASE 2 · view mode UI · 'executive' (solo conclusiones) o 'analyst' (todo + auditoría)
  const [viewMode, setViewMode] = useState<'executive' | 'analyst'>('executive')

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
          mode,   // Sprint M5 FASE 3 · 'deep' (default) o 'comparative' (queries por bucket)
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
  }, [query, language, sortBy, sourceGroups, from, to, pageSize, mode])

  const toggleSourceGroup = (g: SourceGroup) => {
    setSourceGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])
  }

  const openArticleDrill = (article: any) => {
    // Sprint M5 · busca ArticleReading correspondiente · drawer auditable
    const reading = (result?.article_readings || []).find((r: any) => r.url === article.url)
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

          {/* Sprint M5 · Lectura estructurada Politeia si existe reading */}
          {reading && <ArticleReadingPanel reading={reading} />}

          <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>METADATA</p>
            <table style={{ width: '100%', fontSize: 11, marginTop: 6 }}>
              <tbody>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Autor</td><td>{article.author || '—'}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Dominio</td><td><code>{article.domain}</code></td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Idioma</td><td>{article.language}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Sentimiento (legacy plano)</td><td>{(article.sentiment_score * 100).toFixed(0)}%</td></tr>
                <tr><td style={{ color: '#64748b', padding: '3px 0' }}>Ideología medio</td><td>{article.ideology_bucket || '—'}</td></tr>
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

        {/* Sprint M5 FASE 3 · Toggle modo análisis */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Modo análisis
          </span>
          <div style={{ display: 'inline-flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <button
              onClick={() => setMode('deep')}
              style={{
                background: mode === 'deep' ? ACCENT : '#fff',
                color: mode === 'deep' ? '#fff' : '#475569',
                border: 'none', padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              title="Una query con todos los dominios juntos"
            >
              Único pase (deep)
            </button>
            <button
              onClick={() => setMode('comparative')}
              style={{
                background: mode === 'comparative' ? ACCENT : '#fff',
                color: mode === 'comparative' ? '#fff' : '#475569',
                border: 'none', padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              title="N queries · una por bucket ideológico · balance garantizado"
            >
              Comparativo por bucket
            </button>
          </div>
          <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
            {mode === 'comparative'
              ? 'Ejecuta 3+ queries paralelas (izquierda, centro, derecha). Cuesta más cuota API pero garantiza balance.'
              : 'Una query con todos los dominios. Más rápido. Riesgo: dominios mayoritarios ahogan a minoritarios.'}
          </span>
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
            ▲ {error}
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
              ▭ Imprimir/PDF (HTML)
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

            {/* Sprint M5 FASE 2 · Toggle ejecutivo/analista */}
            <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Vista</span>
              <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('executive')}
                  title="Sólo conclusiones de alta señal (narrativas, actores, comparativa)"
                  style={{ background: viewMode === 'executive' ? '#0f172a' : '#fff', color: viewMode === 'executive' ? '#fff' : '#475569', border: 'none', padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ◉ Ejecutiva
                </button>
                <button
                  onClick={() => setViewMode('analyst')}
                  title="Vista completa con paneles de auditoría, framing, gaps, unmatched sources, metadatos"
                  style={{ background: viewMode === 'analyst' ? '#0f172a' : '#fff', color: viewMode === 'analyst' ? '#fff' : '#475569', border: 'none', padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ⊞ Analista
                </button>
              </div>
            </div>
          </section>

          {/* Sprint M5 FASE 2 · Empty state inteligente · n_articles === 0 */}
          {result.n_articles === 0 && (
            <EmptyResultsHint
              query={result.query}
              params={result.params_applied}
              onSuggest={(s) => {
                if (s.removeSourceGroups) setSourceGroups([])
                if (s.widenDates) { setFrom(''); setTo('') }
                if (s.switchSort) setSortBy('publishedAt')
                if (s.switchLanguage) setLanguage('es')
                setTimeout(() => runSearch(), 100)
              }}
            />
          )}

          {/* Lectura Politeia IA · ahora con contexto estructurado completo */}
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
              // Sprint M4 · contexto estructurado
              narrative_clusters: result.narrative_clusters,
              framing_comparison: result.framing_comparison,
              actor_impacts: result.actor_impacts,
              analysis_warnings: result.analysis_warnings,
              coverage_gaps: result.coverage_gaps,
            } as any}
          />

          {/* Sprint M5 FASE 2 · MetodologiaPanel sólo en vista analista */}
          {viewMode === 'analyst' && <MetodologiaPanel result={result} />}

          {/* ── Paneles de alta señal (ambas vistas) ─────────────────────── */}
          {/* Sprint M4 · Panel 2 · Narrativas detectadas (NewsAPI · deep) */}
          {result.narrative_clusters && result.narrative_clusters.length > 0 && (
            <NarrativasPanel clusters={result.narrative_clusters} />
          )}

          {/* Sprint M4 · Panel 3 · Actores e impacto */}
          {result.actor_impacts && result.actor_impacts.length > 0 && (
            <ActoresImpactoPanel impacts={result.actor_impacts} />
          )}

          {/* Sprint M5 FASE 3 · Comparative runs (N queries por bucket) · siempre que exista */}
          {result.comparative_runs && result.comparative_runs.length > 0 && (
            <ComparativeRunsPanel runs={result.comparative_runs} />
          )}

          {/* ── Paneles de auditoría · sólo vista analista ────────────────── */}
          {viewMode === 'analyst' && (
            <>
              {/* Sprint M4 · Panel 4 · Comparación ideológica enriquecida */}
              {result.framing_comparison && result.framing_comparison.length > 0 && (
                <FramingComparisonPanel framing={result.framing_comparison} />
              )}

              {/* Sprint M4 · Panel 5 · Coverage gaps + followup queries */}
              {((result.coverage_gaps && result.coverage_gaps.length > 0) || (result.suggested_followup_queries && result.suggested_followup_queries.length > 0)) && (
                <GapsYFollowupPanel
                  gaps={result.coverage_gaps || []}
                  followups={result.suggested_followup_queries || []}
                  onRunFollowup={(f) => {
                    // Sprint M5 · ejecuta con params estructurados (no sólo texto)
                    setQuery(f.query)
                    if (f.params?.sortBy) setSortBy(f.params.sortBy)
                    if (f.params?.sourceGroups) setSourceGroups(f.params.sourceGroups as SourceGroup[])
                    if (f.params?.from) setFrom(f.params.from)
                    if (f.params?.to) setTo(f.params.to)
                    if (f.params?.language) setLanguage(f.params.language as 'es' | 'en' | 'fr')
                    setTimeout(() => runSearch(), 100)
                  }}
                />
              )}

              {/* Sprint M5 FASE 5 · Transparencia matching catálogo · Unmatched sources */}
              {result.catalog_match && result.catalog_match.unmatched_sources > 0 && (
                <UnmatchedSourcesPanel match={result.catalog_match} />
              )}

              {/* Sprint M5 FASE 5 · AnalysisAuditDrawer trigger transversal */}
              <AnalysisAuditPanel result={result} />
            </>
          )}

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

// ════════════════════════════════════════════════════════════════════
// Sprint M4 · Paneles de análisis enriquecido NewsAPI deep
// ════════════════════════════════════════════════════════════════════

function MetodologiaPanel({ result }: { result: SearchResponse }) {
  const conf = result.methodology_confidence?.overall ?? result._meta?.confidence ?? 0
  const confPct = Math.round(conf * 100)
  const confColor = confPct >= 70 ? '#16a34a' : confPct >= 50 ? '#f59e0b' : '#dc2626'
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #475569', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#475569', textTransform: 'uppercase' }}>
          ◆ Resumen metodológico · NewsAPI deep
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Análisis enriquecido sobre {result.n_articles} artículos · proveedor {result._meta?.source === 'live' ? 'NewsAPI · live' : result._meta?.source ?? 'NewsAPI'}.
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 10 }}>
        <Kpi label="Total resultados" value={result.totalResults?.toLocaleString('es-ES') ?? '—'} color="#0f172a" />
        <Kpi label="Analizados" value={String(result.n_articles ?? 0)} color="#0f172a" />
        <Kpi label="Confianza" value={`${confPct}%`} color={confColor} />
        <Kpi label="Balance ideo" value={result.source_diversity?.ideological_balance_score != null ? `${(result.source_diversity.ideological_balance_score * 100).toFixed(0)}%` : '—'} color="#1e40af" />
        <Kpi label="Balance terr" value={result.source_diversity?.territorial_balance_score != null ? `${(result.source_diversity.territorial_balance_score * 100).toFixed(0)}%` : '—'} color="#16a34a" />
        <Kpi label="Latencia" value={result._meta?.latency_ms ? `${result._meta.latency_ms}ms` : '—'} color="#94a3b8" />
      </div>
      {result.methodology_confidence?.reasons && result.methodology_confidence.reasons.length > 0 && (
        <div style={{ fontSize: 10, color: '#92400e', background: '#fef3c7', padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <strong style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 9 }}>! Limitaciones de confianza:</strong>{' '}
          {result.methodology_confidence.reasons.join(' · ')}
        </div>
      )}
      {result.analysis_warnings && result.analysis_warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {result.analysis_warnings.map((w, i) => {
            const color = w.level === 'critical' ? '#dc2626' : w.level === 'warning' ? '#f59e0b' : '#0891b2'
            const bg = w.level === 'critical' ? '#fee2e2' : w.level === 'warning' ? '#fef3c7' : '#e0f2fe'
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 6, background: bg, borderLeft: `3px solid ${color}`, borderRadius: 3, fontSize: 10 }}>
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2, background: color, color: '#fff', letterSpacing: 0.4 }}>{w.level.toUpperCase()}</span>
                <span style={{ color: '#0f172a' }}>{w.message}{w.evidence ? <span style={{ color: '#64748b' }}> · {w.evidence}</span> : null}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 8, background: '#f8fafc', borderRadius: 4 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function NarrativasPanel({ clusters }: { clusters: NonNullable<SearchResponse['narrative_clusters']> }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
          ◆ Narrativas detectadas · clustering metodológico
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          {clusters.length} narrativas auditables · frame · actores · velocity · evidencia balanceada por bloque ideológico.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {clusters.map((c) => {
          const isOpen = openId === c.id
          return (
            <article key={c.id} style={{ background: isOpen ? '#faf5ff' : '#fff', border: '1px solid #e9d5ff', borderLeft: '3px solid #7c3aed', borderRadius: 4, padding: 10 }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>{c.short_summary}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#7c3aed', color: '#fff', letterSpacing: 0.4 }}>{c.frame_type}</span>
                  <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>v {c.velocity_score.toFixed(2)} a/h</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.confidence.overall >= 0.6 ? '#16a34a' : '#f59e0b' }}>conf {(c.confidence.overall * 100).toFixed(0)}%</span>
                </div>
              </header>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 9, color: '#64748b', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', width: 100 }}>
                  <div style={{ width: `${c.ideological_spread.left * 100}%`, background: '#dc2626' }} />
                  <div style={{ width: `${c.ideological_spread.center * 100}%`, background: '#94a3b8' }} />
                  <div style={{ width: `${c.ideological_spread.right * 100}%`, background: '#1e40af' }} />
                </div>
                <span>{c.ideological_spread.balanced ? '✓ balanceada' : '! sesgada'}</span>
                {c.harmed_actors.length > 0 && <span>⊖ {c.harmed_actors.slice(0, 2).join(', ')}</span>}
                {c.benefited_actors.length > 0 && <span style={{ color: '#16a34a' }}>⊕ {c.benefited_actors.slice(0, 2).join(', ')}</span>}
                <button onClick={() => setOpenId(isOpen ? null : c.id)} style={{ marginLeft: 'auto', background: isOpen ? '#7c3aed' : '#f1f5f9', color: isOpen ? '#fff' : '#475569', border: 'none', borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', letterSpacing: 0.4 }}>
                  {isOpen ? '× cerrar' : 'evidencia'}
                </button>
              </div>
              {isOpen && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e5e7eb' }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#475569', fontStyle: 'italic' }}>{c.why_this_is_a_narrative}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                    {c.evidence.slice(0, 5).map((e, i) => (
                      <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" style={{ padding: '3px 6px', background: '#fff', borderLeft: '2px solid #cbd5e1', borderRadius: 3, textDecoration: 'none', color: 'inherit', fontSize: 10 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#64748b', marginRight: 6, letterSpacing: 0.3 }}>{e.ideology.toUpperCase()}</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{e.medium}</span>
                        <span style={{ color: '#475569', marginLeft: 6 }}>· {e.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ActoresImpactoPanel({ impacts }: { impacts: NonNullable<SearchResponse['actor_impacts']> }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#0891b2', textTransform: 'uppercase' }}>
          ◆ Actores e impacto político
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Cada actor con menciones · barra horizontal beneficial/harmful/neutral/uncertain · razón de muestra.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {impacts.slice(0, 12).map((a) => {
          const total = a.beneficial + a.harmful + a.neutral + a.uncertain || 1
          const impactColor = a.dominant_impact === 'beneficial' ? '#16a34a' : a.dominant_impact === 'harmful' ? '#dc2626' : '#94a3b8'
          return (
            <div key={a.actor} style={{ display: 'grid', gridTemplateColumns: '180px 50px 1fr 100px', gap: 8, alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4, fontSize: 11 }}>
              <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.sample_reasons[0] || ''}>{a.actor}</span>
              <span style={{ color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{a.mentions}</span>
              <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden' }}>
                {a.beneficial > 0 && <div style={{ width: `${(a.beneficial / total) * 100}%`, background: '#16a34a' }} title={`beneficial ${a.beneficial}`} />}
                {a.harmful > 0 && <div style={{ width: `${(a.harmful / total) * 100}%`, background: '#dc2626' }} title={`harmful ${a.harmful}`} />}
                {a.neutral > 0 && <div style={{ width: `${(a.neutral / total) * 100}%`, background: '#94a3b8' }} title={`neutral ${a.neutral}`} />}
                {a.uncertain > 0 && <div style={{ width: `${(a.uncertain / total) * 100}%`, background: '#cbd5e1' }} title={`uncertain ${a.uncertain}`} />}
              </div>
              <span style={{ fontSize: 8, color: impactColor, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'right' }}>● {a.dominant_impact}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FramingComparisonPanel({ framing }: { framing: NonNullable<SearchResponse['framing_comparison']> }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #8b5cf6', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#8b5cf6', textTransform: 'uppercase' }}>
          ◆ Comparación ideológica · framing por bloque
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Qué bloque enfatiza qué actor · qué temas omite · vocabulario distintivo (lift = sobre-indexación vs media).
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {framing.map((b) => (
          <div key={b.bucket} style={{ background: '#faf5ff', borderRadius: 4, padding: 10, borderLeft: '3px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', letterSpacing: 0.3, textTransform: 'uppercase' }}>{b.bucket}</span>
              <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                {b.count} arts · tono {(b.average_tone * 100).toFixed(0)}% · controv {b.controversy_score}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#475569', fontStyle: 'italic', marginBottom: 6 }}>{b.interpretation}</p>
            {b.dominant_frames.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#7c3aed' }}>Frames:</strong>{' '}
                {b.dominant_frames.map((f) => `${f.frame}(${f.count})`).join(' · ')}
              </p>
            )}
            {b.actors_emphasized.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#0891b2' }}>Enfatiza:</strong>{' '}
                {b.actors_emphasized.map((a) => `${a.actor} (${a.mentions})`).join(' · ')}
              </p>
            )}
            {b.actors_omitted.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#dc2626' }}>OMITE:</strong>{' '}
                <span style={{ color: '#475569' }}>{b.actors_omitted.join(', ')}</span>
              </p>
            )}
            {b.distinctive_terms.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                <strong style={{ color: '#84cc16' }}>Vocab distintivo:</strong>{' '}
                {b.distinctive_terms.slice(0, 5).map((t) => `${t.term} (×${t.lift.toFixed(1)})`).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function GapsYFollowupPanel({ gaps, followups, onRunFollowup }: {
  gaps: NonNullable<SearchResponse['coverage_gaps']>
  followups: NonNullable<SearchResponse['suggested_followup_queries']>
  onRunFollowup: (f: any) => void
}) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#f59e0b', textTransform: 'uppercase' }}>
          ◆ Gaps de cobertura · queries sugeridas
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {gaps.length > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>
              Coverage gaps
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {gaps.map((g) => (
                <div key={g.topic} style={{ padding: 6, background: '#fef3c7', borderLeft: '2px solid #f59e0b', borderRadius: 3, fontSize: 10 }}>
                  <strong style={{ color: '#92400e' }}>{g.topic}</strong>{' '}
                  <span style={{ color: '#0f172a' }}>· {g.total_mentions} menciones</span>
                  <p style={{ margin: '2px 0 0', color: '#475569' }}>{g.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {followups.length > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>
              Queries sugeridas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {followups.slice(0, 8).map((f, i) => (
                <button key={i} onClick={() => onRunFollowup(f)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: 6, background: '#f0f9ff', borderLeft: '2px solid #0ea5e9', borderRadius: 3, fontSize: 10, cursor: 'pointer', border: 'none', textAlign: 'left' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{f.query}</span>
                  <span style={{ color: '#475569', fontSize: 9 }}>{f.reason}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * `<ArticleReadingPanel />` · Sprint M5
 *
 * Render auditable de la lectura determinista Politeia sobre un artículo
 * (extracted from media-analysis.ts > readArticle()).
 * No usa LLM. Refleja qué entendió el sistema a partir de titular+descripción.
 */
function ArticleReadingPanel({ reading }: { reading: any }) {
  if (!reading) return null
  const s = reading.sentiment || {}
  const c = reading.confidence || {}
  const fmtPct = (n: number | undefined) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : '—')
  const fmtSigned = (n: number | undefined) => (typeof n === 'number' ? (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)) : '—')
  const list = (arr: any) => (Array.isArray(arr) && arr.length > 0 ? arr.join(' · ') : '—')

  const Row = ({ label, value }: { label: string; value: any }) => (
    <tr>
      <td style={{ color: '#64748b', padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap', width: 170 }}>{label}</td>
      <td style={{ color: '#0f172a', padding: '3px 0' }}>{value ?? '—'}</td>
    </tr>
  )

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fefce8', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 8 }}>
      <header style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#92400e', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          ◆ Lectura estructurada Politeia
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#78716c', fontStyle: 'italic' }}>
          Lectura determinista basada en titular/descripción. No sustituye lectura humana del texto completo.
        </p>
      </header>

      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          <Row label="Frame narrativo" value={<strong>{reading.frame || '—'}</strong>} />
          <Row label="Tema principal" value={reading.main_topic} />
          <Row label="Temas secundarios" value={list(reading.secondary_topics)} />
          <Row label="Acción · verbo" value={reading.action_verb} />
          <Row label="Acción · sujeto" value={reading.action_subject} />
          <Row label="Acción · objeto" value={reading.action_object} />
          <Row label="Actores" value={list(reading.actors)} />
          <Row label="Partidos" value={list(reading.parties)} />
          <Row label="Instituciones" value={list(reading.institutions)} />
          <Row label="Empresas" value={list(reading.companies)} />
          <Row label="Territorio mencionado" value={list(reading.territory_mentioned)} />
          <Row label="Territorio afectado" value={list(reading.territory_affected)} />
          <Row label="Beneficiarios" value={list(reading.beneficiaries)} />
          <Row label="Afectados" value={list(reading.affected)} />
        </tbody>
      </table>

      <div style={{ marginTop: 10, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#92400e', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
          Sentimiento
        </p>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <tbody>
            <Row label="Tono del evento" value={s.event_tone} />
            <Row label="Tono titular (score)" value={fmtSigned(s.headline_tone_score)} />
            <Row label="Registro emocional" value={s.emotional_register} />
            <Row label="Score controversia" value={fmtPct(s.controversy_score)} />
            <Row label="Sentimiento por actor" value={
              s.actor_sentiment && typeof s.actor_sentiment === 'object'
                ? Object.entries(s.actor_sentiment).map(([k, v]: any) => `${k}: ${fmtSigned(v)}`).join(' · ')
                : '—'
            } />
            <Row label="Impacto por actor" value={
              s.actor_impact && typeof s.actor_impact === 'object'
                ? Object.entries(s.actor_impact).map(([k, v]: any) => `${k}: ${v}`).join(' · ')
                : '—'
            } />
            {s.explanation && (
              <Row label="Explicación" value={<span style={{ fontStyle: 'italic', color: '#475569' }}>{s.explanation}</span>} />
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#92400e', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
          Relevancia
        </p>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <tbody>
            <Row label="Riesgo político" value={fmtPct(reading.political_risk)} />
            <Row label="Relevancia España" value={fmtPct(reading.spain_relevance)} />
            <Row label="Relevancia electoral" value={fmtPct(reading.electoral_relevance)} />
            <Row label="Relevancia institucional" value={fmtPct(reading.institutional_relevance)} />
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#92400e', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
          Confianza · {fmtPct(c.overall)}
        </p>
        {Array.isArray(c.reasons) && c.reasons.length > 0 ? (
          <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 10, color: '#475569' }}>
            {c.reasons.map((r: string, i: number) => (<li key={i} style={{ marginBottom: 2 }}>{r}</li>))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>—</p>
        )}
      </div>
    </section>
  )
}

/**
 * `<ComparativeRunsPanel />` · Sprint M5 FASE 3
 *
 * Renderiza el agregado por bucket ideológico cuando mode='comparative'.
 * Cada bucket es una query independiente contra NewsAPI (no slice del total).
 * Permite ver de un golpe: cuánto cubrió cada bloque, sentiment medio, frames
 * dominantes, actores enfatizados y dominios líderes.
 */
function ComparativeRunsPanel({ runs }: { runs: NonNullable<SearchResponse['comparative_runs']> }) {
  const bucketColor: Record<string, string> = {
    left: '#dc2626', 'center-left': '#f97316', center: '#64748b',
    'center-right': '#0ea5e9', right: '#1e40af',
    economic: '#7c3aed', regional: '#059669', international: '#0d9488', 'fact-checkers': '#475569',
  }
  const bucketLabel: Record<string, string> = {
    left: 'Izquierda', 'center-left': 'Centro-izq.', center: 'Centro',
    'center-right': 'Centro-der.', right: 'Derecha',
    economic: 'Económico', regional: 'Regional', international: 'Internacional', 'fact-checkers': 'Fact-checkers',
  }
  const totalN = runs.reduce((s, r) => s + r.n_articles, 0)
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #6366f1', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#6366f1', textTransform: 'uppercase' }}>
          ◆ Comparativa real por bucket · {runs.length} queries paralelas · {totalN} artículos
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
          Cada bucket es una query independiente contra NewsAPI con dominios filtrados. Balance garantizado: ningún bucket "ahoga" a otro.
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(runs.length, 3)}, 1fr)`, gap: 10 }}>
        {runs.map((r) => {
          const color = bucketColor[r.bucket] || '#475569'
          const senPct = Math.round((r.sentiment_mean + 1) * 50) // -1..1 → 0..100
          return (
            <div key={r.bucket} style={{ padding: 10, background: '#f8fafc', border: '1px solid #e5e7eb', borderTop: `3px solid ${color}`, borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <strong style={{ fontSize: 12, color }}>{bucketLabel[r.bucket] || r.bucket}</strong>
                <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>{r.n_articles} arts</span>
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>
                Sentiment · <strong style={{ color: r.sentiment_mean > 0.1 ? '#059669' : r.sentiment_mean < -0.1 ? '#dc2626' : '#64748b' }}>
                  {r.sentiment_mean > 0 ? '+' : ''}{r.sentiment_mean.toFixed(2)}
                </strong>{' '}· {r.positive}+ / {r.neutral}● / {r.negative}−
              </div>
              <div style={{ width: '100%', height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 8 }}>
                <div style={{ width: `${senPct}%`, height: '100%', background: color, borderRadius: 2 }} />
              </div>
              {r.top_frames.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Frames</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {r.top_frames.slice(0, 4).map((f) => (
                      <span key={f.frame} style={{ fontSize: 9, padding: '2px 6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, color: '#475569' }}>
                        {f.frame} <strong>{f.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {r.top_actors.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Actores</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {r.top_actors.slice(0, 5).map((a) => (
                      <span key={a.actor} style={{ fontSize: 9, padding: '2px 6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, color: '#0f172a' }}>
                        {a.actor} <strong>{a.mentions}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {r.top_domains.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Dominios</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {r.top_domains.slice(0, 4).map((d) => (
                      <span key={d.domain} style={{ fontSize: 9, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                        {d.domain} · {d.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {r.representative_titles.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Titulares</summary>
                  <ul style={{ margin: '4px 0 0 14px', padding: 0, fontSize: 10, color: '#334155' }}>
                    {r.representative_titles.slice(0, 3).map((t, i) => (
                      <li key={i} style={{ marginBottom: 2, lineHeight: 1.4 }}>{t}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * `<UnmatchedSourcesPanel />` · Sprint M5 FASE 5
 *
 * Lista los dominios que NewsAPI devolvió pero el catálogo Politeia no pudo
 * mapear a una fuente conocida. Permite al analista detectar:
 *   - Errores de matching (medio español sin alias en el catálogo)
 *   - Fuentes nuevas que merecen ser añadidas (write manual al catálogo)
 *   - Ruido (blogs, agregadores, fuentes irrelevantes)
 *
 * NO escribe al catálogo automáticamente. Solo expone la información.
 */
function UnmatchedSourcesPanel({ match }: { match: NonNullable<SearchResponse['catalog_match']> }) {
  const ratePct = Math.round(match.catalog_match_rate * 100)
  const rateColor = ratePct >= 70 ? '#059669' : ratePct >= 50 ? '#f59e0b' : '#dc2626'
  const strategies = Object.entries(match.match_strategies || {})
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#f59e0b', textTransform: 'uppercase' }}>
            ◆ Fuentes sin match en catálogo Politeia
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
            {match.matched_sources} fuentes mapeadas · <strong style={{ color: rateColor }}>{ratePct}%</strong> de match · {match.unmatched_sources} sin perfil ideológico
          </p>
        </div>
        {strategies.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {strategies.sort((a, b) => b[1] - a[1]).map(([strat, n]) => (
              <span key={strat} style={{ fontSize: 9, padding: '2px 6px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 999, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                {strat}: <strong style={{ color: '#0f172a' }}>{n}</strong>
              </span>
            ))}
          </div>
        )}
      </header>

      {ratePct < 50 && (
        <div style={{ padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 10, fontSize: 11, color: '#991b1b' }}>
          ▲ Match rate bajo. El análisis ideológico puede ser poco representativo · considera ampliar el catálogo o ajustar dominios.
        </div>
      )}

      {match.unmatched_samples.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Muestras (hasta {match.unmatched_samples.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 4 }}>
            {match.unmatched_samples.map((s, i) => (
              <div key={i} style={{ padding: 6, background: '#f8fafc', borderLeft: '2px solid #f59e0b', borderRadius: 3, fontSize: 11 }}>
                <code style={{ color: '#0f172a', fontWeight: 600 }}>{s.domain || '—'}</code>
                {s.name && s.name !== s.domain && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{s.name}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * `<AnalysisAuditPanel />` · Sprint M5 FASE 5
 *
 * Panel transversal que explica QUÉ se calculó, CÓMO y con qué limitaciones.
 * No reemplaza paneles individuales · los agrupa con metadatos auditables:
 *   - Capas analíticas (preferred vs legacy fallback)
 *   - Methodology version + latencia
 *   - Confidence overall + reasons
 *   - Warnings críticos
 *
 * Es el equivalente del "data lineage" para una búsqueda · permite que el
 * analista justifique cualquier afirmación derivada del resultado.
 */
function AnalysisAuditPanel({ result }: { result: SearchResponse }) {
  const [expanded, setExpanded] = useState(false)
  const meta = result._meta
  const conf = result.methodology_confidence
  const layers = result.analysis_layers
  const criticalWarn = (result.analysis_warnings || []).filter((w) => w.level === 'critical')
  const otherWarn = (result.analysis_warnings || []).filter((w) => w.level !== 'critical')

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #6b7280', borderRadius: 10, padding: 12 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#6b7280', textTransform: 'uppercase' }}>
            ◆ Auditoría del análisis · cómo se construyó este resultado
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>
            {meta?.methodology_version && <>v{meta.methodology_version} · </>}
            {meta?.latency_ms && <>{meta.latency_ms}ms · </>}
            {conf && <>confianza {Math.round(conf.overall * 100)}% · </>}
            {criticalWarn.length > 0 && <strong style={{ color: '#dc2626' }}>{criticalWarn.length} críticas</strong>}
            {criticalWarn.length === 0 && otherWarn.length > 0 && <strong style={{ color: '#f59e0b' }}>{otherWarn.length} advertencias</strong>}
            {criticalWarn.length === 0 && otherWarn.length === 0 && <span style={{ color: '#059669' }}>sin advertencias</span>}
          </p>
        </div>
        <span style={{ fontSize: 16, color: '#94a3b8' }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Capas analíticas */}
          {layers && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Capas analíticas (UI prioriza preferred)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div style={{ padding: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4 }}>
                  <strong style={{ color: '#059669', fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Preferred</strong>
                  <ul style={{ margin: '4px 0 0 14px', padding: 0, color: '#0f172a', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                    {layers.preferred.map((k) => <li key={k}>{k}</li>)}
                  </ul>
                </div>
                <div style={{ padding: 6, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                  <strong style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Legacy fallback</strong>
                  <ul style={{ margin: '4px 0 0 14px', padding: 0, color: '#64748b', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                    {layers.legacy_fallback.map((k) => <li key={k}>{k}</li>)}
                  </ul>
                </div>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>{layers.note}</p>
            </div>
          )}

          {/* Confidence reasons */}
          {conf && conf.reasons && conf.reasons.length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Limitaciones detectadas (qué baja la confianza)
              </p>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11, color: '#475569' }}>
                {conf.reasons.map((r, i) => <li key={i} style={{ marginBottom: 2 }}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {(criticalWarn.length > 0 || otherWarn.length > 0) && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Advertencias analíticas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[...criticalWarn, ...otherWarn].map((w, i) => (
                  <div key={i} style={{ padding: 6, background: w.level === 'critical' ? '#fef2f2' : w.level === 'warning' ? '#fefce8' : '#eff6ff', border: `1px solid ${w.level === 'critical' ? '#fecaca' : w.level === 'warning' ? '#fde68a' : '#bfdbfe'}`, borderRadius: 4, fontSize: 11 }}>
                    <strong style={{ color: w.level === 'critical' ? '#991b1b' : w.level === 'warning' ? '#92400e' : '#1e40af', textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.4 }}>
                      [{w.level}] {w.category}
                    </strong>{' · '}
                    <span style={{ color: '#0f172a' }}>{w.message}</span>
                    {w.evidence && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>{w.evidence}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {meta && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Metadatos técnicos
              </p>
              <table style={{ width: '100%', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
                <tbody>
                  <tr><td style={{ color: '#64748b', padding: '2px 8px 2px 0', width: 140 }}>methodology_version</td><td style={{ color: '#0f172a' }}>{meta.methodology_version}</td></tr>
                  <tr><td style={{ color: '#64748b', padding: '2px 8px 2px 0' }}>source</td><td style={{ color: '#0f172a' }}>{meta.source}</td></tr>
                  <tr><td style={{ color: '#64748b', padding: '2px 8px 2px 0' }}>latency_ms</td><td style={{ color: '#0f172a' }}>{meta.latency_ms}</td></tr>
                  <tr><td style={{ color: '#64748b', padding: '2px 8px 2px 0' }}>ts</td><td style={{ color: '#0f172a' }}>{meta.ts}</td></tr>
                  {result.params_applied && (
                    <tr><td style={{ color: '#64748b', padding: '2px 8px 2px 0', verticalAlign: 'top' }}>params_applied</td><td style={{ color: '#0f172a' }}><code>{JSON.stringify(result.params_applied)}</code></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ margin: 0, padding: 8, background: '#f8fafc', borderRadius: 4, fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
            Esta auditoría refleja qué calculó el motor determinista. La lectura humana del texto completo puede matizar o contradecir cualquier conclusión derivada.
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * `<EmptyResultsHint />` · Sprint M5 FASE 2
 *
 * Cuando NewsAPI devuelve 0 artículos, en lugar de un mensaje genérico el
 * analista recibe sugerencias accionables derivadas de los params que aplicó:
 *   - Si filtró por sourceGroups → sugiere quitar el filtro
 *   - Si limitó la ventana temporal → sugiere ampliar fechas
 *   - Si pidió "popularity" sort → sugiere "publishedAt" (más artículos)
 *   - Si usó idioma minoritario → sugiere "es"
 * Cada sugerencia tiene un botón "Aplicar" que ejecuta el cambio + nueva búsqueda.
 */
function EmptyResultsHint({
  query, params, onSuggest,
}: {
  query: string
  params: any
  onSuggest: (s: { removeSourceGroups?: boolean; widenDates?: boolean; switchSort?: boolean; switchLanguage?: boolean }) => void
}) {
  const hasSourceGroups = Array.isArray(params?.sourceGroups) && params.sourceGroups.length > 0
  const hasDates = !!(params?.from || params?.to)
  const isPopularitySort = params?.sortBy === 'popularity'
  const isNonES = params?.language && params.language !== 'es'

  const suggestions: Array<{ label: string; reason: string; action: () => void }> = []
  if (hasSourceGroups) suggestions.push({
    label: 'Quitar filtro ideológico',
    reason: `Buscaste sólo en ${params.sourceGroups.length} bucket(s) · NewsAPI puede no tener cobertura en todos los dominios filtrados`,
    action: () => onSuggest({ removeSourceGroups: true }),
  })
  if (hasDates) suggestions.push({
    label: 'Ampliar ventana temporal',
    reason: 'NewsAPI free tier limita a últimos 30 días · ventanas cortas o antiguas devuelven vacío',
    action: () => onSuggest({ widenDates: true }),
  })
  if (isPopularitySort) suggestions.push({
    label: 'Cambiar a sort por fecha',
    reason: '"popularity" requiere artículos con tráfico medido · "publishedAt" devuelve más volumen',
    action: () => onSuggest({ switchSort: true }),
  })
  if (isNonES) suggestions.push({
    label: 'Cambiar a idioma español',
    reason: `Buscaste en "${params.language}" · la cobertura es mucho mayor en español para temas de política española`,
    action: () => onSuggest({ switchLanguage: true }),
  })

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #94a3b8', borderRadius: 10, padding: 16 }}>
      <header style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#0f172a', fontWeight: 700 }}>
          0 artículos para "{query}"
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          NewsAPI no encontró resultados con los filtros aplicados. Esto es información: el tema puede no haber tenido cobertura en la ventana / bloques pedidos, o los filtros son demasiado estrechos.
        </p>
      </header>

      {suggestions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Sugerencias para ampliar la búsqueda
          </p>
          {suggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 8, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.reason}</div>
              </div>
              <button
                onClick={s.action}
                style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Aplicar y reintentar →
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          Los filtros ya están al mínimo. Prueba reformular la query (sinónimos, actores específicos, otro encuadre) o consulta directamente a RSS interno (/api/medios/intel).
        </p>
      )}
    </section>
  )
}
