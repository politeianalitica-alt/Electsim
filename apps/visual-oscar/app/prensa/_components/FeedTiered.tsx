'use client'

/**
 * FeedTiered — feed multi-tier con filtros dinámicos.
 *
 * Filtros disponibles:
 *   - Tier (nacional / europeo / regional / local)
 *   - Categoría temática (Política/Economía/Empresas/Internacional/etc.) — DINÁMICA
 *   - Tono (positivo / neutro / negativo)
 *   - Búsqueda full-text
 *   - CCAA (cuando aplica)
 *
 * Cada tarjeta muestra: medio + ideología + categoría + tono + figuras
 * y empresas detectadas + antigüedad.
 */

import { useMemo, useState } from 'react'
import type { TieredFeed, Tier, TieredArticle, DynamicCategory } from '@/lib/news-intel'
import { SECTOR_COLORS, type SectorKey } from '@/lib/medios/sector-taxonomy'

const TIER_META: Record<Tier, { label: string; color: string; description: string; glyph: string }> = {
  nacional: { label: 'Nacional',  color: '#1F4E8C', description: 'Cobertura de medios de ámbito estatal',  glyph: '' },
  europeo:  { label: 'Europeo',   color: '#7C3AED', description: 'Bruselas, Estrasburgo y prensa europea', glyph: '◈' },
  regional: { label: 'Regional',  color: '#0F766E', description: 'CCAA y medios autonómicos',              glyph: '◐' },
  local:    { label: 'Local',     color: '#B45309', description: 'Ayuntamientos, comarcas, prensa local',  glyph: '◑' },
}

const SENTIMENT_COLOR = {
  positive: '#16A34A',
  negative: '#DC2626',
  neutral:  '#6e6e73',
}

function ideologyTag(i: number): { label: string; color: string } {
  if (i < -40) return { label: 'izda-fuerte',  color: '#4338CA' }
  if (i < -15) return { label: 'izda',          color: '#6366F1' }
  if (i >  40) return { label: 'dcha-fuerte',  color: '#DC2626' }
  if (i >  15) return { label: 'dcha',          color: '#F97316' }
  return         { label: 'centro',             color: '#6e6e73' }
}

function timeSince(iso: string | null): string {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60)    return `hace ${mins}m`
  if (mins < 1440)  return `hace ${Math.floor(mins / 60)}h`
  return `hace ${Math.floor(mins / 1440)}d`
}

export default function FeedTiered({ feed }: { feed?: TieredFeed }) {
  const [activeTier, setActiveTier] = useState<Tier | 'todos'>('todos')
  const [search, setSearch] = useState('')
  const [sentFilter, setSentFilter] = useState<'all'|'positive'|'negative'|'neutral'>('all')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<string>('all')

  const allArticles: TieredArticle[] = useMemo(() => {
    if (!feed) return []
    return [...feed.tiers.nacional, ...feed.tiers.europeo, ...feed.tiers.regional, ...feed.tiers.local]
  }, [feed])

  const visible = useMemo(() => {
    let list = activeTier === 'todos' ? allArticles : (feed?.tiers[activeTier] ?? [])
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.medio.nombre.toLowerCase().includes(q))
    }
    if (sentFilter !== 'all') list = list.filter(a => a.sentiment === sentFilter)
    if (catFilter !== 'all')  list = list.filter(a => a.category === catFilter)
    if (sectorFilter !== 'all') list = list.filter(a => a.sector === sectorFilter)
    return list
  }, [activeTier, search, sentFilter, catFilter, sectorFilter, allArticles, feed])

  if (!feed) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando feed…</div>
  }

  const categories = feed.categories
  // Sectores con contenido · 'Otros' siempre al final aunque tenga más volumen.
  const sectorFacets = (feed.sectorFacets ?? []).filter(s => s.count > 0)
  const sectorsSorted = [...sectorFacets.filter(s => s.id !== 'otro'), ...sectorFacets.filter(s => s.id === 'otro')]

  return (
    <div>
      {/* ── Tier chips ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
        <TierChip tier="todos" label="Todos" count={allArticles.length} active={activeTier === 'todos'}
                  onClick={() => setActiveTier('todos')} accent="#1d1d1f" />
        {(Object.keys(TIER_META) as Tier[]).map(t => (
          <TierChip key={t} tier={t}
                    label={TIER_META[t].label}
                    count={feed.counts[t]}
                    active={activeTier === t}
                    onClick={() => setActiveTier(t)}
                    accent={TIER_META[t].color}
                    description={TIER_META[t].description}
                    glyph={TIER_META[t].glyph} />
        ))}
      </div>

      {/* ── Categorías temáticas (DINÁMICAS) ────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, background: '#FAFAFB', padding: '10px 14px', borderRadius: 12, border: '1px solid #ECECEF' }}>
        <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 4 }}>
          Categoría temática:
        </span>
        <button onClick={() => setCatFilter('all')} style={chipStyle(catFilter === 'all', '#1d1d1f')}>
          Todas <ChipNum n={allArticles.length} active={catFilter === 'all'} />
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCatFilter(c.id)} style={chipStyle(catFilter === c.id, categoryColor(c.label))}>
            {c.label}
            <ChipNum n={c.count} active={catFilter === c.id} />
            <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700,
              color: catFilter === c.id ? 'rgba(255,255,255,0.85)' : (c.polarity > 0.10 ? '#16A34A' : c.polarity < -0.10 ? '#DC2626' : '#9ca3af') }}>
              {c.polarity > 0 ? '+' : ''}{c.polarity.toFixed(2)}
            </span>
          </button>
        ))}
      </div>

      {/* ── Sector (clasificación automática) ─────────────────── */}
      {sectorsSorted.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, background: '#FAFAFB', padding: '10px 14px', borderRadius: 12, border: '1px solid #ECECEF' }}>
          <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginRight: 4 }}>
            Sector:
          </span>
          <button onClick={() => setSectorFilter('all')} style={chipStyle(sectorFilter === 'all', '#1d1d1f')}>
            Todos <ChipNum n={allArticles.length} active={sectorFilter === 'all'} />
          </button>
          {sectorsSorted.map(s => (
            <button key={s.id} onClick={() => setSectorFilter(s.id)} style={chipStyle(sectorFilter === s.id, SECTOR_COLORS[s.id as SectorKey] ?? '#6e6e73')}>
              {s.label}
              <ChipNum n={s.count} active={sectorFilter === s.id} />
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros (búsqueda + tono) ────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en títulos, descripción, medio…"
          style={{
            flex: '0 0 280px', padding: '7px 12px', borderRadius: 8,
            border: '1px solid #ECECEF', background: '#fff', fontSize: 12.5,
            outline: 'none', fontFamily: 'inherit', color: '#1d1d1f',
          }}
        />
        <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tono:</span>
        {(['all','positive','neutral','negative'] as const).map(s => (
          <button key={s} onClick={() => setSentFilter(s)} style={{
            background: sentFilter === s ? '#1d1d1f' : '#fff',
            color:      sentFilter === s ? '#fff' : '#3a3a3d',
            border: '1px solid #ECECEF', borderRadius: 999, padding: '5px 12px',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'capitalize',
          }}>{s === 'all' ? 'todos' : s === 'positive' ? 'positivo' : s === 'negative' ? 'negativo' : 'neutro'}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6e6e73' }}>
          {visible.length} de {allArticles.length} noticias
        </span>
      </div>

      {/* ── Lista ───────────────────────────────────────────────── */}
      {activeTier === 'todos' && catFilter === 'all' && sentFilter === 'all' && sectorFilter === 'all' && !search ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {(Object.keys(TIER_META) as Tier[]).map(t => {
            const items = feed.tiers[t].slice(0, 8)
            const meta = TIER_META[t]
            return (
              <section key={t} style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', overflow: 'hidden' }}>
                <header style={{
                  padding: '12px 16px', borderBottom: '1px solid #ECECEF',
                  borderTop: `3px solid ${meta.color}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18, color: meta.color, fontWeight: 700 }}>{meta.glyph}</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5, color: '#1d1d1f' }}>{meta.label}</strong>
                    <div style={{ fontSize: 11, color: '#6e6e73' }}>{meta.description}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, background: `${meta.color}15`, padding: '2px 10px', borderRadius: 999 }}>
                    {feed.counts[t]}
                  </span>
                </header>
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Sin noticias en este tier.</div>
                  ) : items.map((a, i) => <ArticleRow key={i} article={a} compact />)}
                </div>
                {items.length > 0 && (
                  <button onClick={() => setActiveTier(t)} style={{
                    width: '100%', padding: '8px 12px', background: '#FAFAFB',
                    border: 0, borderTop: '1px solid #ECECEF',
                    fontSize: 11.5, fontWeight: 600, color: meta.color, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Ver todas las {feed.counts[t]} noticias {meta.label.toLowerCase()} →</button>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
              Sin noticias que coincidan con los filtros.
            </div>
          )}
          {visible.map((a, i) => <ArticleRow key={i} article={a} />)}
        </div>
      )}
    </div>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    background: active ? color : '#fff',
    color: active ? '#fff' : '#1d1d1f',
    border: `1px solid ${active ? color : '#ECECEF'}`,
    borderRadius: 999, padding: '5px 12px',
    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}

function ChipNum({ n, active }: { n: number; active: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      background: active ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.06)',
      padding: '1px 6px', borderRadius: 999,
    }}>{n}</span>
  )
}

function categoryColor(label: string): string {
  const colors: Record<string, string> = {
    'Política': '#1F4E8C',
    'Economía': '#0F766E',
    'Empresas': '#7C3AED',
    'Internacional': '#B45309',
    'Sociedad': '#DC2626',
    'Justicia': '#525258',
    'Tecnología': '#0EA5E9',
    'Cultura': '#EC4899',
    'Deportes': '#16A34A',
    'Sucesos': '#71717A',
    'Clima': '#0891B2',
    'Medio Ambiente': '#16A34A',
    'Otros': '#6e6e73',
  }
  return colors[label] || '#6e6e73'
}

function TierChip({ tier, label, count, active, onClick, accent, description, glyph }: {
  tier: string; label: string; count: number; active: boolean;
  onClick: () => void; accent: string; description?: string; glyph?: string
}) {
  return (
    <button onClick={onClick} title={description} style={{
      background: active ? accent : '#fff',
      color:      active ? '#fff' : '#1d1d1f',
      border:     `1px solid ${active ? accent : '#ECECEF'}`,
      borderRadius: 12, padding: '10px 12px',
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {glyph && <span style={{ fontSize: 14 }}>{glyph}</span>}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  )
}

function ArticleRow({ article, compact }: { article: TieredArticle; compact?: boolean }) {
  const ideo = ideologyTag(article.medio.ideologia)
  const sColor = SENTIMENT_COLOR[article.sentiment]
  return (
    <a href={article.link} target="_blank" rel="noopener" style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
      padding: compact ? '10px 12px' : '14px 16px',
      textDecoration: 'none', color: 'inherit', display: 'block',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{article.medio.nombre}</span>
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: ideo.color, background: `${ideo.color}15`,
          padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{ideo.label}</span>
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: categoryColor(article.category),
          background: `${categoryColor(article.category)}15`,
          padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em',
        }}>{article.category}</span>
        <span style={{ fontSize: 9.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {article.medio.tipo}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#9ca3af' }}>
          {timeSince(article.pub_date_iso)}
        </span>
      </div>
      <div style={{ fontSize: compact ? 12.5 : 14, color: '#1d1d1f', lineHeight: 1.35, fontWeight: 500 }}>
        {article.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: sColor, background: `${sColor}15`,
          padding: '1px 7px', borderRadius: 999,
        }}>
          {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
        </span>
        {article.medio.ccaa && (
          <span style={{ fontSize: 10, color: '#6e6e73', background: '#FAFAFB', padding: '1px 6px', borderRadius: 4 }}>
            {article.medio.ccaa}
          </span>
        )}
        {article.figures.slice(0, 2).map(f => (
          <span key={f} style={{ fontSize: 10, color: '#0F766E', background: 'rgba(15,118,110,0.08)', padding: '1px 6px', borderRadius: 4 }}>
            {f}
          </span>
        ))}
        {article.companies.slice(0, 2).map(c => (
          <span key={c} style={{ fontSize: 10, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '1px 6px', borderRadius: 4 }}>
            {c}
          </span>
        ))}
      </div>
    </a>
  )
}
