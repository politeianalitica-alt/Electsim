'use client'
/**
 * `<AnalisisGroq />` · Tab 7 · Análisis IA con razonamiento Groq.
 *
 * Razona sobre el contexto live de medios: pulso RSS + topics + actores +
 * sentimiento + GDELT. Genera 4 secciones estructuradas (resumen, hallazgos,
 * riesgo framing, qué vigilar) usando @/lib/ai → Groq llama-3.3-70b cuando
 * está configurado.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#A855F7'

export function AnalisisGroq() {
  const [intel, setIntel] = useState<any>(null)
  const [gdelt, setGdelt] = useState<any>(null)
  const [lectura, setLectura] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingIa, setLoadingIa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState<24 | 48 | 72 | 168>(48)
  const [focus, setFocus] = useState<string>('panorama')

  useEffect(() => {
    let alive = true
    setLoadingData(true)
    Promise.all([
      fetch(`/api/medios/intel?hours=${hours}&sources=50`).then((r) => r.json()).catch(() => null),
      fetch(`/api/gdelt/articles?query=España+OR+Spain&timespan=24h&maxrows=30`).then((r) => r.json()).catch(() => null),
    ]).then(([i, g]) => {
      if (!alive) return
      setIntel(i); setGdelt(g); setLoadingData(false)
    })
    return () => { alive = false }
  }, [hours])

  const runAnalysis = async () => {
    if (!intel) return
    setLoadingIa(true); setError(null); setLectura(null)

    // Build rich context for Groq
    const topics = (intel.topicparty || []).slice(0, 12).map((c: any) => ({
      label: `${c.topic} · ${c.party}`,
      count: c.count,
    }))
    const actors = (intel.figures || []).slice(0, 12).map((f: any) => ({
      name: f.figure,
      mentions: f.n,
      sentiment: f.sentiment_score || 0,
    }))
    const narratives = (intel.narratives || []).slice(0, 6).map((n: any) => ({
      frame: n.title || n.frame,
      count: n.n_articles || n.count || 0,
    }))
    const sample_titles = (intel.feed?.nacional?.items || intel.feed?.tier1 || [])
      .slice(0, 12)
      .map((a: any) => a.title)
      .filter(Boolean)
    const gdelt_titles = (gdelt?.articles || []).slice(0, 8).map((a: any) => a.title)
    const all_titles = [...sample_titles, ...gdelt_titles].slice(0, 20)

    const totalArticles = intel.meta?.total || 0

    // Compose tab-specific prompt context
    const focusContext: Record<string, any> = {
      'panorama': {
        tabId: 'analisis-ia',
        query: 'Panorama mediático España últimas ' + hours + 'h',
      },
      'riesgos': {
        tabId: 'analisis-ia-riesgos',
        query: 'Riesgos políticos y narrativas adversas España últimas ' + hours + 'h',
      },
      'agenda': {
        tabId: 'analisis-ia-agenda',
        query: 'Agenda setting: qué temas dominan vs qué quedan invisibilizados',
      },
      'gobierno': {
        tabId: 'analisis-ia-gobierno',
        query: 'Cobertura del Gobierno y oposición · análisis ideológico',
      },
    }

    try {
      const r = await fetch('/api/medios/lectura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...focusContext[focus],
          context: {
            n_articles: totalArticles,
            total_results: totalArticles,
            top_sources: (intel.meta?.sources_list || []).slice(0, 8).map((s: string) => ({ source: s, count: 0 })),
            actors,
            topics,
            narratives,
            sample_titles: all_titles,
            sentiment: {
              score: actors.length ? actors.reduce((s: number, a: any) => s + a.sentiment, 0) / actors.length : 0,
              positive: actors.filter((a: any) => a.sentiment > 0.1).length,
              negative: actors.filter((a: any) => a.sentiment < -0.1).length,
              neutral: actors.filter((a: any) => Math.abs(a.sentiment) <= 0.1).length,
            },
            ideologicalComparison: [],
            timeline_summary: { from: new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
          },
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) {
        setError(d.error || d.hint || `HTTP ${r.status}`)
      } else {
        setLectura(d.lectura)
      }
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setLoadingIa(false)
    }
  }

  const totalArticles = intel?.meta?.total ?? 0
  const totalActors = intel?.figures?.length ?? 0
  const totalTopics = intel?.topicparty?.length ?? 0
  const gdeltN = gdelt?.n_articles ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: `4px solid ${ACCENT}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
              ✦ Análisis IA · razonamiento Groq sobre contexto live
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', maxWidth: 720, lineHeight: 1.5 }}>
              El LLM lee {totalArticles} artículos RSS + {gdeltN} GDELT + {totalActors} actores + {totalTopics} topics y produce 4 secciones estructuradas: resumen, hallazgos, riesgo framing, qué vigilar.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[24, 48, 72, 168].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h as any)}
                style={{
                  background: hours === h ? ACCENT : '#fff',
                  color: hours === h ? '#fff' : '#475569',
                  border: `1px solid ${hours === h ? ACCENT : '#e5e7eb'}`,
                  borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {h < 168 ? `${h}h` : '7d'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Foco del análisis
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'panorama', label: 'Panorama general' },
              { id: 'riesgos',  label: 'Riesgos & narrativas adversas' },
              { id: 'agenda',   label: 'Agenda-setting' },
              { id: 'gobierno', label: 'Gobierno vs oposición' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFocus(f.id)}
                style={{
                  background: focus === f.id ? '#faf5ff' : '#fff',
                  color: focus === f.id ? ACCENT : '#475569',
                  border: `1px solid ${focus === f.id ? ACCENT : '#e5e7eb'}`,
                  borderRadius: 999, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
            {loadingData ? 'Cargando contexto live…' : `${totalArticles} artículos RSS + ${gdeltN} GDELT cargados`}
          </p>
          <button
            onClick={runAnalysis}
            disabled={loadingData || loadingIa || !intel}
            style={{
              background: loadingIa || loadingData ? '#94a3b8' : ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingIa || loadingData ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loadingIa ? 'Razonando con Groq…' : 'Generar análisis IA →'}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>▲ {error}</p>
        </section>
      )}

      {lectura && (
        <section style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: 18, borderLeft: `4px solid ${ACCENT}` }}>
          <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
            ✦ Lectura IA · {focus} · {hours}h
          </p>
          <pre style={{
            fontFamily: 'inherit',
            fontSize: 13,
            color: '#0f172a',
            lineHeight: 1.7,
            margin: '12px 0 0',
            whiteSpace: 'pre-wrap',
          }}>{lectura}</pre>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '16px 0 0', fontStyle: 'italic' }}>
            Generado por IA · revisar antes de citar · disclaimer A2 CLAUDE.md
          </p>
        </section>
      )}

      {/* Contexto crudo expandible */}
      {!loadingData && intel && (
        <details style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <summary style={{ fontSize: 11, color: '#64748b', fontWeight: 600, cursor: 'pointer', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            ⬢ Ver contexto que se le pasa al LLM
          </summary>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <Block label="Top actores" items={(intel.figures || []).slice(0, 8).map((f: any) => `${f.figure} (${f.n})`)} />
            <Block label="Top topics×partido" items={(intel.topicparty || []).slice(0, 8).map((c: any) => `${c.topic}/${c.party} (${c.count})`)} />
            <Block label="Narrativas detectadas" items={(intel.narratives || []).slice(0, 6).map((n: any) => n.title || n.frame)} />
            <Block label="GDELT titulares 24h" items={(gdelt?.articles || []).slice(0, 6).map((a: any) => a.title)} />
          </div>
        </details>
      )}
    </div>
  )
}

function Block({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ background: '#f8fafc', borderRadius: 6, padding: 10 }}>
      <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 10, color: '#0f172a', lineHeight: 1.5 }}>
        {items.slice(0, 8).map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}

export default AnalisisGroq
