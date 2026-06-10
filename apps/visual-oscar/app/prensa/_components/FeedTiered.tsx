'use client'

/**
 * FeedTiered — "Prensa": pulso en vivo de la prensa con portada de destacadas,
 * resumen agregado, orden configurable y feed multi-tier con filtros dinámicos.
 *
 * Filtros:  Tier (nacional/europeo/regional/local) · Categoría (dinámica) ·
 *           Sector (clasificación automática) · Tono · Búsqueda full-text
 * Orden:    Reciente · Impacto · Más negativo · Más positivo
 *
 * Cada tarjeta: medio + ideología + categoría + tono + figuras/empresas +
 * antigüedad + enlace original y enlace archive.is.
 */

import { useEffect, useMemo, useState } from 'react'
import type { TieredFeed, Tier, TieredArticle } from '@/lib/news-intel'
import { SECTOR_COLORS, type SectorKey } from '@/lib/medios/sector-taxonomy'
import ArchiveLink from '@/components/medios/ArchiveLink'

const TIER_META: Record<Tier, { label: string; color: string; description: string; glyph: string }> = {
  nacional: { label: 'Nacional',  color: '#1F4E8C', description: 'Cobertura de medios de ámbito estatal',  glyph: '◆' },
  europeo:  { label: 'Europeo',   color: '#7C3AED', description: 'Bruselas, Estrasburgo y prensa europea', glyph: '◈' },
  regional: { label: 'Regional',  color: '#0F766E', description: 'CCAA y medios autonómicos',              glyph: '◐' },
  local:    { label: 'Local',     color: '#B45309', description: 'Ayuntamientos, comarcas, prensa local',  glyph: '◑' },
}

const SENTIMENT_COLOR = { positive: '#16A34A', negative: '#DC2626', neutral: '#6e6e73' } as const

type SortBy = 'reciente' | 'impacto' | 'negativo' | 'positivo'
const SORTS: { id: SortBy; label: string }[] = [
  { id: 'reciente', label: 'Reciente' },
  { id: 'impacto',  label: 'Impacto' },
  { id: 'negativo', label: 'Más negativo' },
  { id: 'positivo', label: 'Más positivo' },
]

function ideologyTag(i: number): { label: string; color: string } {
  if (i < -40) return { label: 'izda-fuerte', color: '#4338CA' }
  if (i < -15) return { label: 'izda',         color: '#6366F1' }
  if (i >  40) return { label: 'dcha-fuerte', color: '#DC2626' }
  if (i >  15) return { label: 'dcha',         color: '#F97316' }
  return         { label: 'centro',            color: '#6e6e73' }
}

function tsOf(iso: string | null): number { return iso ? (Date.parse(iso) || 0) : 0 }

function timeSince(iso: string | null): string {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1)    return 'ahora'
  if (mins < 60)   return `hace ${mins}m`
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`
  return `hace ${Math.floor(mins / 1440)}d`
}

const PAGE = 24

export default function FeedTiered({ feed, externalSearch }: { feed?: TieredFeed; externalSearch?: string }) {
  const [activeTier, setActiveTier]     = useState<Tier | 'todos'>('todos')
  const [search, setSearch]             = useState('')
  const [sentFilter, setSentFilter]     = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [sortBy, setSortBy]             = useState<SortBy>('reciente')
  const [shown, setShown]               = useState(PAGE)

  const allArticles: TieredArticle[] = useMemo(() => {
    if (!feed) return []
    return [...feed.tiers.nacional, ...feed.tiers.europeo, ...feed.tiers.regional, ...feed.tiers.local]
  }, [feed])

  const hasFilter = activeTier !== 'todos' || !!search.trim() || sentFilter !== 'all' || catFilter !== 'all' || sectorFilter !== 'all'

  const filtered = useMemo(() => {
    let list = activeTier === 'todos' ? allArticles : (feed?.tiers[activeTier] ?? [])
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.medio.nombre.toLowerCase().includes(q))
    }
    if (sentFilter !== 'all')   list = list.filter(a => a.sentiment === sentFilter)
    if (catFilter !== 'all')    list = list.filter(a => a.category === catFilter)
    if (sectorFilter !== 'all') list = list.filter(a => a.sector === sectorFilter)
    return list
  }, [activeTier, search, sentFilter, catFilter, sectorFilter, allArticles, feed])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sortBy === 'reciente')      arr.sort((a, b) => tsOf(b.pub_date_iso) - tsOf(a.pub_date_iso))
    else if (sortBy === 'impacto')  arr.sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score) || tsOf(b.pub_date_iso) - tsOf(a.pub_date_iso))
    else if (sortBy === 'negativo') arr.sort((a, b) => a.sentiment_score - b.sentiment_score || tsOf(b.pub_date_iso) - tsOf(a.pub_date_iso))
    else                            arr.sort((a, b) => b.sentiment_score - a.sentiment_score || tsOf(b.pub_date_iso) - tsOf(a.pub_date_iso))
    return arr
  }, [filtered, sortBy])

  // Filtro externo: "Filtrar feed por este tema" desde el gráfico de importancia
  // temática rellena la búsqueda del feed con ese tema (filtrado en sitio).
  useEffect(() => { if (externalSearch) setSearch(externalSearch) }, [externalSearch])

  // Reinicia la paginación al cambiar filtros/orden.
  useEffect(() => { setShown(PAGE) }, [activeTier, search, sentFilter, catFilter, sectorFilter, sortBy])

  // Resumen agregado del pulso (sobre todo el conjunto).
  const summary = useMemo(() => {
    let pos = 0, neg = 0, freshest = 0
    const medios = new Set<string>()
    for (const a of allArticles) {
      if (a.sentiment === 'positive') pos++
      else if (a.sentiment === 'negative') neg++
      medios.add(a.medio.id)
      const t = tsOf(a.pub_date_iso)
      if (t > freshest) freshest = t
    }
    const total = allArticles.length
    return { pos, neg, neu: total - pos - neg, medios: medios.size, freshest, total }
  }, [allArticles])

  // Destacadas (portada): relevancia = recencia × impacto, diversificando medio.
  const destacadas = useMemo(() => {
    const now = Date.now()
    const scored = allArticles.map(a => {
      const age = a.pub_date_iso ? (now - tsOf(a.pub_date_iso)) / 3_600_000 : 999
      const rec = 1 / (1 + age / 8)
      return { a, s: rec * (0.3 + Math.abs(a.sentiment_score)) }
    }).sort((x, y) => y.s - x.s)
    const out: TieredArticle[] = []
    const seenMedio = new Set<string>()
    for (const { a } of scored) {
      if (out.length >= 7) break
      if (seenMedio.has(a.medio.id) && out.length < 6) continue
      seenMedio.add(a.medio.id)
      out.push(a)
    }
    return out
  }, [allArticles])

  if (!feed) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando feed…</div>
  }

  const categories = feed.categories
  const sectorFacets = (feed.sectorFacets ?? []).filter(s => s.count > 0)
  const sectorsSorted = [...sectorFacets.filter(s => s.id !== 'otro'), ...sectorFacets.filter(s => s.id === 'otro')]

  const lead = destacadas[0]
  const secundarias = destacadas.slice(1, 7)
  const visibles = sorted.slice(0, shown)

  return (
    <div>
      {/* ── Resumen del pulso ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '12px 18px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <SumItem big label="Noticias" value={summary.total} />
        <Divider />
        <SumItem big label="Medios" value={summary.medios} />
        <Divider />
        <div style={{ minWidth: 200, flex: '1 1 220px' }}>
          <div style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5 }}>Tono del conjunto</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: '#F1F5F9' }}>
            {summary.total > 0 && (<>
              <div title={`Positivo · ${summary.pos}`} style={{ width: `${(summary.pos / summary.total) * 100}%`, background: SENTIMENT_COLOR.positive }} />
              <div title={`Neutro · ${summary.neu}`}   style={{ width: `${(summary.neu / summary.total) * 100}%`, background: '#CBD5E1' }} />
              <div title={`Negativo · ${summary.neg}`} style={{ width: `${(summary.neg / summary.total) * 100}%`, background: SENTIMENT_COLOR.negative }} />
            </>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', marginTop: 4 }}>
            <span style={{ color: SENTIMENT_COLOR.positive, fontWeight: 700 }}>+{summary.pos}</span>
            <span>{summary.neu} neutro</span>
            <span style={{ color: SENTIMENT_COLOR.negative, fontWeight: 700 }}>−{summary.neg}</span>
          </div>
        </div>
        <Divider />
        <div>
          <div style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Actualizado</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginTop: 2 }}>
            {summary.freshest ? timeSince(new Date(summary.freshest).toISOString()) : '—'}
          </div>
        </div>
      </div>

      {/* ── Tier chips ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
        <TierChip tier="todos" label="Todos" count={allArticles.length} active={activeTier === 'todos'} onClick={() => setActiveTier('todos')} accent="#1d1d1f" />
        {(Object.keys(TIER_META) as Tier[]).map(t => (
          <TierChip key={t} tier={t} label={TIER_META[t].label} count={feed.counts[t]} active={activeTier === t}
                    onClick={() => setActiveTier(t)} accent={TIER_META[t].color} description={TIER_META[t].description} glyph={TIER_META[t].glyph} />
        ))}
      </div>

      {/* ── Categorías (dinámicas) ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={labelStyle}>Categoría</span>
        <div style={pillBoxStyle}>
          <button onClick={() => setCatFilter('all')} style={chipStyle(catFilter === 'all', '#1d1d1f')}>
            Todas <ChipNum n={allArticles.length} active={catFilter === 'all'} />
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={chipStyle(catFilter === c.id, categoryColor(c.label))}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: categoryColor(c.label) }} />
              {c.label}
              <ChipNum n={c.count} active={catFilter === c.id} />
              <span style={{ fontSize: 9, fontWeight: 700, color: c.polarity > 0.10 ? '#16A34A' : c.polarity < -0.10 ? '#DC2626' : '#9ca3af' }}>
                {c.polarity > 0 ? '+' : ''}{c.polarity.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sector (clasificación automática) ─────────────────────── */}
      {sectorsSorted.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={labelStyle}>Sector</span>
          <div style={pillBoxStyle}>
            <button onClick={() => setSectorFilter('all')} style={chipStyle(sectorFilter === 'all', '#1d1d1f')}>
              Todos <ChipNum n={allArticles.length} active={sectorFilter === 'all'} />
            </button>
            {sectorsSorted.map(s => {
              const col = SECTOR_COLORS[s.id as SectorKey] ?? '#6e6e73'
              return (
                <button key={s.id} onClick={() => setSectorFilter(s.id)} style={chipStyle(sectorFilter === s.id, col)}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                  {s.label}
                  <ChipNum n={s.count} active={sectorFilter === s.id} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Búsqueda + tono + orden ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en títulos, descripción, medio…" aria-label="Buscar en el feed"
               style={{ flex: '0 0 260px', padding: '8px 14px', borderRadius: 10, border: '1px solid #ECECEF', background: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1d1d1f' }} />
        <span style={labelStyle}>Tono</span>
        <div style={{ display: 'inline-flex', gap: 2, background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {(['all', 'positive', 'neutral', 'negative'] as const).map(s => {
            const col = s === 'positive' ? '#16A34A' : s === 'negative' ? '#DC2626' : '#1d1d1f'
            return (
              <button key={s} onClick={() => setSentFilter(s)} style={chipStyle(sentFilter === s, col)}>
                {s === 'all' ? 'Todos' : s === 'positive' ? 'Positivo' : s === 'negative' ? 'Negativo' : 'Neutro'}
              </button>
            )
          })}
        </div>
        <span style={labelStyle}>Orden</span>
        <div style={{ display: 'inline-flex', gap: 2, background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {SORTS.map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} style={chipStyle(sortBy === s.id, '#7C2D92')}>{s.label}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6e6e73' }}>{filtered.length} de {allArticles.length} noticias</span>
      </div>

      {/* ── Portada de destacadas (solo sin filtros) ──────────────── */}
      {!hasFilter && lead && (
        <section style={{ marginBottom: 18 }}>
          <h3 style={sectionTitle}>✦ Destacadas ahora</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
            <LeadCard article={lead} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {secundarias.map((a, i) => <ArticleRow key={i} article={a} compact />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Feed ──────────────────────────────────────────────────── */}
      <h3 style={sectionTitle}>{hasFilter ? 'Resultados' : 'Cronología'} <span style={{ color: '#9ca3af', fontWeight: 600 }}>· {sorted.length}</span></h3>
      {sorted.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
          Sin noticias que coincidan con los filtros.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: 10 }}>
            {visibles.map((a, i) => <ArticleRow key={i} article={a} snippet />)}
          </div>
          {shown < sorted.length && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => setShown(s => s + PAGE)} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 999, padding: '9px 22px',
                fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
              }}>Mostrar más · {sorted.length - shown} restantes</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Estilos compartidos ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }
const pillBoxStyle: React.CSSProperties = { display: 'inline-flex', flexWrap: 'wrap', gap: 2, background: '#F5F5F7', borderRadius: 999, padding: 3 }
const sectionTitle: React.CSSProperties = { margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }

function Divider() { return <div style={{ width: 1, alignSelf: 'stretch', background: '#ECECEF' }} /> }
function SumItem({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: big ? 24 : 16, fontWeight: 700, color: '#1d1d1f', lineHeight: 1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    background: active ? '#fff' : 'transparent', color: active ? color : '#6e6e73', border: 'none',
    borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 150ms',
  }
}

function ChipNum({ n, active }: { n: number; active: boolean }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#3a3a3d' : '#9ca3af', background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 999 }}>{n}</span>
}

function categoryColor(label: string): string {
  const colors: Record<string, string> = {
    'Política': '#1F4E8C', 'Economía': '#0F766E', 'Empresas': '#7C3AED', 'Internacional': '#B45309',
    'Sociedad': '#DC2626', 'Justicia': '#525258', 'Tecnología': '#0EA5E9', 'Cultura': '#EC4899',
    'Deportes': '#16A34A', 'Sucesos': '#71717A', 'Clima': '#0891B2', 'Medio Ambiente': '#16A34A', 'Otros': '#6e6e73',
  }
  return colors[label] || '#6e6e73'
}

function TierChip({ tier, label, count, active, onClick, accent, description, glyph }: {
  tier: string; label: string; count: number; active: boolean; onClick: () => void; accent: string; description?: string; glyph?: string
}) {
  return (
    <button onClick={onClick} title={description} style={{
      background: active ? accent : '#fff', color: active ? '#fff' : '#1d1d1f', border: `1px solid ${active ? accent : '#ECECEF'}`,
      borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {glyph && <span style={{ fontSize: 13, opacity: active ? 0.9 : 0.55 }}>{glyph}</span>}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  )
}

function MetaRow({ article }: { article: TieredArticle }) {
  const ideo = ideologyTag(article.medio.ideologia)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{article.medio.nombre}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: ideo.color, background: `${ideo.color}15`, padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{ideo.label}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: categoryColor(article.category), background: `${categoryColor(article.category)}15`, padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em' }}>{article.category}</span>
      <span style={{ fontSize: 9.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{article.medio.tipo}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#9ca3af' }}>{timeSince(article.pub_date_iso)}</span>
    </div>
  )
}

function TagsRow({ article }: { article: TieredArticle }) {
  const sColor = SENTIMENT_COLOR[article.sentiment]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: sColor, background: `${sColor}15`, padding: '1px 7px', borderRadius: 999 }}>
        {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
      </span>
      {article.medio.ccaa && <span style={{ fontSize: 10, color: '#6e6e73', background: '#FAFAFB', padding: '1px 6px', borderRadius: 4 }}>{article.medio.ccaa}</span>}
      {article.figures.slice(0, 2).map(f => <span key={f} style={{ fontSize: 10, color: '#0F766E', background: 'rgba(15,118,110,0.08)', padding: '1px 6px', borderRadius: 4 }}>{f}</span>)}
      {article.companies.slice(0, 2).map(c => <span key={c} style={{ fontSize: 10, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '1px 6px', borderRadius: 4 }}>{c}</span>)}
    </div>
  )
}

function ArticleRow({ article, compact, snippet }: { article: TieredArticle; compact?: boolean; snippet?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, padding: compact ? '10px 12px' : '14px 16px' }}>
      <MetaRow article={article} />
      <div style={{ fontSize: compact ? 12.5 : 14, lineHeight: 1.35, fontWeight: 600 }}>
        <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{article.title}</a>{' '}
        <ArchiveLink url={article.link} />
      </div>
      {snippet && article.description && (
        <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45, color: '#6e6e73', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.description.replace(/<[^>]*>/g, '').slice(0, 180)}
        </p>
      )}
      <TagsRow article={article} />
    </div>
  )
}

function LeadCard({ article }: { article: TieredArticle }) {
  const accent = SENTIMENT_COLOR[article.sentiment]
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderTop: `3px solid ${accent}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <MetaRow article={article} />
      <div style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>
        <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none' }}>{article.title}</a>{' '}
        <ArchiveLink url={article.link} />
      </div>
      {article.description && (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: '#3a3a3d', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.description.replace(/<[^>]*>/g, '').slice(0, 320)}
        </p>
      )}
      <TagsRow article={article} />
    </div>
  )
}
