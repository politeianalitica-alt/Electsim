'use client'

/**
 * /think-tanks · Tablón de artículos de los principales think tanks del mundo,
 * de todos los bloques geopolíticos. Entrada del menú "Medios".
 *
 * Fuente: /api/medios/think-tanks (agrega ~27 feeds RSS/Atom verificados).
 * Selector de filtros por: Bloque geopolítico · Tema · País mencionado.
 *
 * Sin emojis (CLAUDE.md §0.5) · marcadores Unicode (◆ ◉ ⬡ ↗ ▲).
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { SECTOR_COLORS, type SectorKey } from '@/lib/medios/sector-taxonomy'
import CollapsibleArticle from '@/components/medios/CollapsibleArticle'
import MediosHero from '@/components/medios/MediosHero'
import MapaNoticiasMundo from '@/components/medios/MapaNoticiasMundo'
import BoardToolbar from '@/components/medios/BoardToolbar'
import { downloadCsv } from '@/lib/medios/export'

interface TTItem {
  id: string
  titulo: string
  fuente: string
  fuente_key: string
  bloque: string
  bloque_label: string
  fecha: string
  url: string
  resumen: string
  urgencia: number
  relevancia_espana: number
  paises_detectados: string[]
  temas_detectados: string[]
  sector: string
  sector_label: string
}
interface Facet { key?: string; label: string; count: number }
interface ThinkTankResponse {
  items: TTItem[]
  facets: { bloques: Facet[]; temas: Facet[]; paises: Facet[]; sectores: Facet[] }
  source: 'live' | 'mock'
  generated_at: string
  feeds_ok: number
  feeds_total: number
  warnings: string[]
}

const URGENCIA: Record<number, { label: string; color: string; bg: string }> = {
  5: { label: 'Crítica', color: '#fff',    bg: '#dc2626' },
  4: { label: 'Alta',    color: '#fff',    bg: '#ea580c' },
  3: { label: 'Media',   color: '#92400e', bg: '#fef3c7' },
  2: { label: 'Baja',    color: '#475569', bg: '#f1f5f9' },
  1: { label: 'Info',    color: '#64748b', bg: '#f8fafc' },
}

const BLOQUE_COLOR: Record<string, string> = {
  espana: '#C8102E', ue: '#1F4E8C', anglo: '#5B21B6', china: '#B91C1C',
  rusia: '#475569', india: '#EA580C', asia_pacifico: '#0891B2', latam: '#15803D',
  oriente_medio: '#CA8A04', africa: '#B45309', global: '#0F766E',
}

function hace(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const min = Math.max(1, Math.round((Date.now() - t) / 60_000))
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} d`
}

export default function ThinkTanksPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, source, loading, updatedAt, refresh } = useApi<ThinkTankResponse>(
    '/api/medios/think-tanks',
    { refreshInterval: 900_000 },
  )

  const [bloque, setBloque] = useState<string>('all')
  const [sector, setSector] = useState<string>('all')
  const [tema, setTema] = useState<string>('all')
  const [pais, setPais] = useState<string>('all')
  const [orden, setOrden] = useState<'importancia' | 'reciente'>('importancia')
  const [tradOn, setTradOn] = useState(false)
  const [tradu, setTradu] = useState<Record<string, string>>({})
  const [tradLoading, setTradLoading] = useState(false)
  const [tradError, setTradError] = useState<string | null>(null)

  const items = data?.items ?? []
  const facets = data?.facets

  // Mapa tema_key → label (de las facets) para mostrar tags legibles
  const temaLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of facets?.temas ?? []) if (t.key) m[t.key] = t.label
    return m
  }, [facets])

  const filtered = useMemo(() => items.filter((it) =>
    (bloque === 'all' || it.bloque === bloque) &&
    (sector === 'all' || it.sector === sector) &&
    (tema === 'all' || it.temas_detectados.includes(tema)) &&
    (pais === 'all' || it.paises_detectados.includes(pais)),
  ), [items, bloque, sector, tema, pais])

  // Conteos de facets DINÁMICOS (cross-filtering): para cada dimensión cuenta
  // sobre los items que cumplen los OTROS filtros activos. Así, al seleccionar
  // una opción, el nº de artículos de las demás (bloques/sector/tema/país) se
  // actualiza para reflejar lo que hay disponible con la selección actual.
  const dynFacets = useMemo(() => {
    const match = (it: TTItem, dim: string) =>
      (dim === 'bloque' || bloque === 'all' || it.bloque === bloque) &&
      (dim === 'sector' || sector === 'all' || it.sector === sector) &&
      (dim === 'tema'   || tema === 'all'   || it.temas_detectados.includes(tema)) &&
      (dim === 'pais'   || pais === 'all'   || it.paises_detectados.includes(pais))
    const countBy = (dim: string, keysOf: (it: TTItem) => string[]) => {
      const base = items.filter((it) => match(it, dim))
      const m = new Map<string, number>()
      for (const it of base) for (const k of new Set(keysOf(it))) m.set(k, (m.get(k) ?? 0) + 1)
      return { total: base.length, get: (k: string) => m.get(k) ?? 0 }
    }
    return {
      bloque: countBy('bloque', (it) => [it.bloque]),
      sector: countBy('sector', (it) => [it.sector]),
      tema:   countBy('tema',   (it) => it.temas_detectados),
      pais:   countBy('pais',   (it) => it.paises_detectados),
    }
  }, [items, bloque, sector, tema, pais])

  // Orden de la lista (cliente): "importancia" = urgencia → relevancia España →
  // fecha (default); "reciente" = fecha descendente pura.
  const ordered = useMemo(() => {
    const ts = (s: string) => { const t = Date.parse(s); return Number.isNaN(t) ? 0 : t }
    const arr = [...filtered]
    if (orden === 'reciente') {
      arr.sort((a, b) => ts(b.fecha) - ts(a.fecha))
    } else {
      arr.sort((a, b) =>
        (b.urgencia - a.urgencia) ||
        (b.relevancia_espana - a.relevancia_espana) ||
        (ts(b.fecha) - ts(a.fecha)))
    }
    return arr
  }, [filtered, orden])

  const nBloques = facets?.bloques.length ?? 0

  // Traducción IA de titulares (gated): traduce los visibles al español; si no
  // hay clave LLM, degrada con aviso y conserva los originales.
  async function traducir() {
    if (tradOn) { setTradOn(false); return }
    setTradError(null)
    const titles = [...new Set(ordered.slice(0, 80).map((it) => it.titulo))].filter((t) => !(t in tradu))
    if (titles.length === 0) { setTradOn(true); return }
    setTradLoading(true)
    try {
      const map: Record<string, string> = { ...tradu }
      for (let i = 0; i < titles.length; i += 40) {
        const chunk = titles.slice(i, i + 40)
        const res = await fetch('/api/medios/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: chunk }) })
        if (res.status === 503) { setTradError('Traducción IA no disponible (falta configurar la clave del modelo).'); setTradLoading(false); return }
        if (!res.ok) throw new Error()
        const json = await res.json()
        const tr: string[] = json?.translations ?? []
        chunk.forEach((t, j) => { if (tr[j]) map[t] = tr[j] })
      }
      setTradu(map)
      setTradOn(true)
    } catch {
      setTradError('No se pudo traducir ahora mismo.')
    } finally {
      setTradLoading(false)
    }
  }

  return (
    <div style={{ background: '#fbfbfd', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 80px' }}>

        {/* Hero · cabecera con mapamundi de países en el foco */}
        <MediosHero
          accent="#0F766E"
          fresh={data?.source === 'live'}
          eyebrow="⬡ Inteligencia de think tanks · todos los bloques"
          badge={data?.source === 'mock'
            ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700 }}>DEMO</span>
            : <LiveStatusBadge updatedAt={updatedAt} source={data?.source ?? source} refreshIntervalSec={900} onRefresh={refresh} />}
          title="Análisis de los principales centros de pensamiento del mundo"
          subtitle="España, UE, mundo anglosajón, China, Rusia, India, Asia-Pacífico, Latinoamérica y multilaterales. Artículos del último año, ordenados por urgencia y relevancia para España."
          kpis={[
            { label: 'Artículos', value: items.length, color: '#0F766E' },
            { label: 'Think tanks', value: <>{data?.feeds_ok ?? 0}<span style={{ fontSize: 12, color: '#9ca3af' }}>/{data?.feeds_total ?? '—'}</span></> },
            { label: 'Bloques', value: nBloques },
            { label: 'Países', value: facets?.paises.length ?? 0 },
          ]}
          mapLabel="Países en el foco"
          map={<MapaNoticiasMundo paises={facets?.paises ?? []} />}
        />

        {/* Selector de filtros */}
        <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <FilterRow
            title="Bloque"
            options={[{ key: 'all', label: 'Todos', count: dynFacets.bloque.total }, ...(facets?.bloques.map((b) => ({ key: b.key!, label: b.label, count: dynFacets.bloque.get(b.key!) })) ?? [])]}
            value={bloque}
            onChange={setBloque}
            colorOf={(k) => BLOQUE_COLOR[k] ?? '#1F4E8C'}
          />
          <FilterRow
            title="Sector"
            options={[{ key: 'all', label: 'Todos', count: dynFacets.sector.total }, ...(facets?.sectores.map((s) => ({ key: s.key!, label: s.label, count: dynFacets.sector.get(s.key!) })) ?? [])]}
            value={sector}
            onChange={setSector}
            colorOf={(k) => SECTOR_COLORS[k as SectorKey] ?? '#0F766E'}
          />
          <FilterRow
            title="Tema"
            options={[{ key: 'all', label: 'Todos', count: dynFacets.tema.total }, ...(facets?.temas.map((t) => ({ key: t.key!, label: t.label, count: dynFacets.tema.get(t.key!) })) ?? [])]}
            value={tema}
            onChange={setTema}
          />
          <FilterRow
            title="País"
            options={[{ key: 'all', label: 'Todos', count: dynFacets.pais.total }, ...(facets?.paises.map((p) => ({ key: p.label, label: p.label, count: dynFacets.pais.get(p.label) })) ?? [])]}
            value={pais}
            onChange={setPais}
            last
          />
        </section>

        {/* Resultados */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>
            {loading && !data ? 'Cargando feeds de think tanks…' : `${filtered.length} artículo${filtered.length === 1 ? '' : 's'}`}
            {(bloque !== 'all' || sector !== 'all' || tema !== 'all' || pais !== 'all') && (
              <button onClick={() => { setBloque('all'); setSector('all'); setTema('all'); setPais('all') }}
                style={{ marginLeft: 10, background: 'transparent', border: 'none', color: '#0F766E', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline', fontFamily: 'inherit' }}>
                limpiar filtros
              </button>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {data?.warnings && data.warnings.length > 0 && (
              <span title={data.warnings.join(' · ')} style={{ fontSize: 10.5, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 9px', borderRadius: 999, fontWeight: 600 }}>
                ! {data.warnings.length} aviso{data.warnings.length === 1 ? '' : 's'} de cobertura
              </span>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>Ordenar</span>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, gap: 2 }}>
                {([['importancia', 'Importancia'], ['reciente', 'Más reciente']] as const).map(([k, lbl]) => {
                  const on = orden === k
                  return (
                    <button key={k} onClick={() => setOrden(k)}
                      style={{
                        border: 'none', cursor: 'pointer', borderRadius: 999, padding: '4px 12px',
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                        background: on ? '#fff' : 'transparent', color: on ? '#1d1d1f' : '#6e6e73',
                        boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all .12s ease',
                      }}>
                      {lbl}
                    </button>
                  )
                })}
              </div>
            </div>
            <button onClick={traducir} disabled={tradLoading} title="Traducir los titulares al español (IA)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tradOn ? '#14274E' : '#fff', color: tradOn ? '#fff' : '#3a3a3d', border: `1px solid ${tradOn ? '#14274E' : '#ECECEF'}`, borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, cursor: tradLoading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {tradLoading ? 'Traduciendo…' : tradOn ? '✓ En español' : '⇄ Traducir titulares'}
            </button>
            {tradError && <span style={{ fontSize: 10.5, color: '#b45309', maxWidth: 220 }}>{tradError}</span>}
            <BoardToolbar
              count={ordered.length}
              onExportCsv={() => downloadCsv('think-tanks', ordered.map((it) => ({
                titulo: it.titulo, fuente: it.fuente, bloque: it.bloque_label, sector: it.sector_label,
                fecha: it.fecha, urgencia: it.urgencia, relevancia_espana: it.relevancia_espana,
                paises: it.paises_detectados.join('; '), temas: it.temas_detectados.join('; '), url: it.url,
              })))}
            />
          </div>
        </div>

        {loading && !data ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Agregando feeds RSS/Atom de think tanks de todos los bloques…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#fff', border: '1px dashed #e5e7eb', borderRadius: 14 }}>
            No hay artículos con estos filtros. Prueba a ampliar la selección.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 12 }}>
            {ordered.map((it) => (
              <ArticleCard key={it.id} item={it} temaLabel={temaLabel} tituloMostrado={tradOn ? (tradu[it.titulo] ?? it.titulo) : it.titulo} />
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--hairline,#ECECEF)', padding: '18px 28px', textAlign: 'center', color: 'var(--ink-4,#86868b)', fontSize: 11.5 }}>
        Think Tanks · Inteligencia de Medios · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}


function FilterRow({
  title, options, value, onChange, colorOf, last,
}: {
  title: string
  options: { key: string; label: string; count: number }[]
  value: string
  onChange: (v: string) => void
  colorOf?: (k: string) => string
  last?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10, borderBottom: last ? 'none' : '1px solid #F5F5F7' }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', flexShrink: 0, width: 56 }}>{title}</span>
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, background: '#F5F5F7', borderRadius: 999, padding: 3, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {options.map((o) => {
          const active = value === o.key
          const accent = colorOf ? colorOf(o.key) : '#0F766E'
          return (
            <button key={o.key} onClick={() => onChange(o.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap',
              fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
              color: active ? accent : '#6e6e73',
              background: active ? '#fff' : 'transparent',
              border: 'none',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 150ms',
            }}>
              {o.key !== 'all' && colorOf && <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />}
              {o.label}
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#3a3a3d' : '#9ca3af', background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 999 }}>{o.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ArticleCard({ item, temaLabel, tituloMostrado }: { item: TTItem; temaLabel: Record<string, string>; tituloMostrado?: string }) {
  const u = URGENCIA[item.urgencia] ?? URGENCIA[1]
  const bloqueColor = BLOQUE_COLOR[item.bloque] ?? '#0F766E'

  return (
    <CollapsibleArticle
      title={tituloMostrado ?? item.titulo}
      href={item.url}
      medio={item.fuente}
      when={hace(item.fecha)}
      accent={bloqueColor}
      titleSize={14}
    >
      {/* Badges de bloque, sector y urgencia */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: `${bloqueColor}14`, color: bloqueColor }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: bloqueColor }} />
          {item.bloque_label}
        </span>
        {item.sector_label && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: '#F5F5F7', color: '#475569' }}>
            {item.sector_label}
          </span>
        )}
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: u.bg, color: u.color }}>
          {item.urgencia >= 4 ? '▲ ' : ''}{u.label}
        </span>
      </div>

      {item.resumen && (
        <p style={{ margin: '9px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          {item.resumen}
        </p>
      )}

      {(item.temas_detectados.length > 0 || item.paises_detectados.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9, paddingTop: 8, borderTop: '1px solid #F5F5F7' }}>
          {item.temas_detectados.map((t) => (
            <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#ECFEFF', color: '#0E7490' }}>
              {temaLabel[t] ?? t}
            </span>
          ))}
          {item.paises_detectados.map((p) => (
            <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#F5F5F7', color: '#475569' }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </CollapsibleArticle>
  )
}
