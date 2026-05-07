'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

// Componente compartido para /licitaciones, /adjudicaciones, /contratos-vigentes
// Muestra el feed real de la PLACSP con scoring + botón "Analizar con IA" por fila.

type ScoredContrato = {
  id: string; tipo: string; expediente: string; titulo: string
  organismo: string; organismo_nif: string; organismo_tipo: string
  importe: number; estado: string; estado_label: string
  fecha: string; url_detalle: string; ciudad: string | null; cpv: string | null
  importance: number
  components: { importe: number; recency: number; estado: number; organismo: number }
  tags: string[]
}
type FeedResponse = {
  items: ScoredContrato[]
  summary: {
    fetch_ms: number; sources_ok: number; sources_attempted: number; raw_items: number
    scored_items: number; returned: number; importe_total_M: number
    top_importance: number; megaproyectos: number; gran_importe: number; gobierno_central: number
  }
}
type LlmAnalysis = {
  resumen?: string; sectores?: string[]; riesgos?: string[]
  indicador_competencia?: string; relevancia_politica?: number; alertas?: string[]
  llm_source?: 'ollama' | 'backend' | 'fallback'; ms?: number
}

interface Props {
  /** Filtro de tipo: 'licitacion' | 'adjudicacion' | 'both' (default both) */
  tipo?: 'licitacion' | 'adjudicacion' | 'both'
  /** Filtro por estado · ej "PUB" para licitaciones publicadas */
  estado?: string
  /** Importe mínimo en euros */
  minImporte?: number
  /** Cuántos items mostrar */
  limit?: number
  /** Título del panel */
  titulo?: string
  /** Color de acento · default verde */
  accent?: string
}

function formatEUR(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M€`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} k€`
  return `${n.toFixed(0)} €`
}

export default function ContratosLiveFeed({
  tipo = 'both',
  estado,
  minImporte,
  limit = 12,
  titulo = 'Plataforma de Contratación · en vivo',
  accent = '#0F766E',
}: Props) {
  // Construir URL con filtros
  const params = new URLSearchParams({ tipo, limit: String(limit) })
  if (estado)     params.set('estado', estado)
  if (minImporte) params.set('min_importe', String(minImporte))
  const apiUrl = `/api/contratos/feed?${params.toString()}`

  const { data: feed, source, updatedAt, refresh, loading } = useApi<FeedResponse>(
    apiUrl,
    { refreshInterval: 600_000 }  // 10 min
  )
  const items = feed?.items || []

  const [analyses, setAnalyses] = useState<Record<string, LlmAnalysis>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})

  async function analyze(c: ScoredContrato) {
    if (analyzing[c.id] || analyses[c.id]) return
    setAnalyzing(a => ({ ...a, [c.id]: true }))
    try {
      const res = await fetch('/api/contratos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id, titulo: c.titulo, organismo: c.organismo,
          importe: c.importe, estado: c.estado, tipo: c.tipo,
          expediente: c.expediente, ciudad: c.ciudad,
        }),
      })
      const json: LlmAnalysis = await res.json()
      setAnalyses(a => ({ ...a, [c.id]: json }))
    } catch {
      setAnalyses(a => ({ ...a, [c.id]: { llm_source: 'fallback', resumen: 'Error al analizar' } }))
    } finally {
      setAnalyzing(a => ({ ...a, [c.id]: false }))
    }
  }

  return (
    <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
      padding:'22px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:accent, textTransform:'uppercase', margin:'0 0 6px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span>{titulo}</span>
            <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={600} onRefresh={refresh}/>
          </p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f' }}>
            {feed?.summary.scored_items || 0} expedientes reales · {feed?.summary.importe_total_M.toLocaleString('es-ES') || 0} M€ agregados (top {limit})
          </h2>
          <p style={{ fontSize:12, color:'#6e6e73', margin:0, lineHeight:1.45 }}>
            Datos directos de los feeds Atom oficiales de la Plataforma de Contratación del Sector Público ·
            scoring 0-100 por importe, estado, organismo y recencia · pulsa <strong>&quot;Analizar con IA&quot;</strong> para enviar a Ollama.
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Mini label="MEGA" value={String(feed?.summary.megaproyectos || 0)} color="#DC2626"/>
          <Mini label="GRAN €" value={String(feed?.summary.gran_importe || 0)} color="#F97316"/>
          <Mini label="GOB. CENTRAL" value={String(feed?.summary.gobierno_central || 0)} color="#1F4E8C"/>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>
          {loading ? 'Cargando feed PLACSP… (puede tardar 5-10s)' : 'Sin expedientes con esos filtros.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(c => {
            const an = analyses[c.id]
            const busy = analyzing[c.id]
            const impColor = c.importance >= 85 ? '#DC2626' : c.importance >= 60 ? '#F97316' : c.importance >= 40 ? accent : '#9CA3AF'
            return (
              <div key={`${c.tipo}-${c.id}`} style={{
                padding:'14px 16px', borderRadius:12,
                background:'#fafafa', border:'1px solid #ECECEF',
                borderLeft:`3px solid ${impColor}`,
              }}>
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'flex-start' }}>
                  {/* Score badge */}
                  <div style={{
                    background: impColor, color:'#fff', borderRadius:10, padding:'10px 12px',
                    textAlign:'center', minWidth:54, flexShrink:0,
                  }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1 }}>{c.importance}</div>
                    <div style={{ fontSize:9, marginTop:2, opacity:0.85, fontWeight:700, letterSpacing:'0.08em' }}>SCORE</div>
                  </div>

                  {/* Cuerpo */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'#1d1d1f' }}>
                        {formatEUR(c.importe)}
                      </span>
                      <span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:4, background:c.estado==='ADJ'||c.estado==='FORM' ? '#16A34A' : c.estado==='ANUL' ? '#DC2626' : c.estado==='DESI' ? '#F97316' : '#1F4E8C', color:'#fff' }}>{c.estado_label}</span>
                      <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:3, background:'#0F766E15', color:'#0F766E' }}>{c.tipo === 'adjudicacion' ? 'Adjudicación' : 'Licitación'}</span>
                      <span style={{ fontSize:10.5, color:'#6e6e73', marginLeft:'auto' }}>{new Date(c.fecha).toLocaleDateString('es-ES')}</span>
                    </div>
                    <a href={c.url_detalle} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'#1d1d1f' }}>
                      <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, lineHeight:1.35 }}>{c.titulo}</p>
                    </a>
                    <p style={{ margin:'0 0 6px', fontSize:11, color:'#6e6e73' }}>
                      {c.organismo}
                      {c.ciudad && <> · <span style={{ color:'#3a3a3d' }}>{c.ciudad}</span></>}
                      {c.expediente && <> · exp. <strong style={{ color:'#3a3a3d' }}>{c.expediente}</strong></>}
                    </p>
                    {c.tags.length > 0 && (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {c.tags.map(t => <span key={t} style={{ fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:3, background:'rgba(0,0,0,0.04)', color:'#3a3a3d' }}>{t}</span>)}
                      </div>
                    )}

                    {/* Análisis IA */}
                    {an && (
                      <div style={{ marginTop:10, padding:'10px 12px', borderRadius:8, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.20)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9.5, fontWeight:800, color:'#fff', background:an.llm_source==='ollama'?'#7C3AED':an.llm_source==='backend'?'#10b981':'#9CA3AF', padding:'2px 7px', borderRadius:4, letterSpacing:'0.04em' }}>
                            {an.llm_source === 'ollama' ? '🤖 OLLAMA' : an.llm_source === 'backend' ? '🤖 BACKEND' : '⚠ FALLBACK'}
                          </span>
                          {an.indicador_competencia && <span style={{ fontSize:10, fontWeight:600, color:'#7C3AED' }}>Competencia: {an.indicador_competencia}</span>}
                          {typeof an.relevancia_politica === 'number' && (
                            <span style={{ fontSize:10, fontWeight:600, color: an.relevancia_politica < -10 ? '#DC2626' : an.relevancia_politica > 10 ? '#16A34A' : '#6e6e73' }}>
                              Relev. política: {an.relevancia_politica > 0 ? '+' : ''}{an.relevancia_politica}
                            </span>
                          )}
                          {an.ms && <span style={{ fontSize:9.5, color:'#9CA3AF', marginLeft:'auto' }}>{(an.ms/1000).toFixed(1)}s</span>}
                        </div>
                        {an.resumen && <p style={{ margin:'0 0 6px', fontSize:12, lineHeight:1.45, color:'#1d1d1f' }}>{an.resumen}</p>}
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
                          {(an.sectores || []).map(s => <span key={s} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:3, background:'#0F766E15', color:'#0F766E' }}>{s}</span>)}
                        </div>
                        {(an.riesgos && an.riesgos.length > 0) && (
                          <div style={{ marginTop:4 }}>
                            <span style={{ fontSize:9.5, fontWeight:700, color:'#DC2626', textTransform:'uppercase', letterSpacing:'0.06em' }}>Riesgos:</span>
                            {an.riesgos.map((r, i) => <span key={i} style={{ fontSize:10, padding:'1px 6px', marginLeft:5, borderRadius:3, background:'#DC262615', color:'#DC2626' }}>{r}</span>)}
                          </div>
                        )}
                        {(an.alertas && an.alertas.length > 0) && (
                          <div style={{ marginTop:4 }}>
                            <span style={{ fontSize:9.5, fontWeight:700, color:'#F97316', textTransform:'uppercase', letterSpacing:'0.06em' }}>Alertas:</span>
                            {an.alertas.map((a, i) => <span key={i} style={{ fontSize:10, marginLeft:5, color:'#F97316' }}>{a}{i < an.alertas!.length - 1 ? ' ·' : ''}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón Analizar IA */}
                  <button onClick={() => analyze(c)} disabled={busy || !!an} style={{
                    background: an ? '#16A34A' : busy ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
                    color:'#fff', border:'none', borderRadius:8, padding:'8px 12px',
                    fontSize:11, fontWeight:700, cursor: busy || an ? 'default' : 'pointer',
                    fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0,
                  }}>
                    {an ? '✓ Analizado' : busy ? '🤖 Analizando…' : '🤖 Analizar con IA'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding:'10px 14px', borderRadius:10, background:`${color}10`, border:`1px solid ${color}30`,
      textAlign:'center', minWidth:70,
    }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, color, marginTop:3, letterSpacing:'0.08em' }}>{label}</div>
    </div>
  )
}
