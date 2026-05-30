'use client'

/**
 * <CuadernoInsights> · dashboard meta sobre el propio Cuaderno.
 *
 * Sprint Cuaderno N11 (extra) · auto-conciencia del analista sobre su trabajo.
 *
 * Paneles:
 *   1. KPI top · notas, palabras, entidades únicas, tags, días activos
 *   2. Top entidades mencionadas (bar chart top-20 con color por kind)
 *   3. Top tags
 *   4. Notas huérfanas (sin wikilinks · sin backlinks)
 *   5. Lagunas de cobertura · entidades populares del registry SIN mención
 *      → sugiere áreas donde el analista debería profundizar
 *   6. Heatmap actividad · últimos 30 días, intensidad por # notas modificadas
 */

import { useMemo } from 'react'
import {
  loadAll,
  entityMentionCounts,
  extractEntityMentions,
  extractLinks,
  backlinks,
  type CuadernoNote,
} from '@/lib/cuaderno/store'
import {
  allTags,
} from '@/lib/cuaderno/queries'
import {
  ENTITY_REGISTRY,
  resolveEntity,
  KIND_COLORS,
  type EntityKind,
} from '@/lib/cuaderno/entity-registry'

interface Props {
  onOpenNote: (id: string) => void
}

export function CuadernoInsights({ onOpenNote }: Props) {
  const notes = useMemo(() => loadAll(), [])

  // KPI globales
  const kpi = useMemo(() => {
    let words = 0
    const days = new Set<string>()
    const ents = new Set<string>()
    for (const n of notes) {
      words += (n.content?.split(/\s+/).filter(Boolean).length) ?? 0
      days.add(String(n.updatedAt).slice(0, 10))
      for (const s of extractEntityMentions(n.content)) ents.add(s)
    }
    return {
      notes: notes.length,
      words,
      entities: ents.size,
      tags: allTags().length,
      daysActive: days.size,
    }
  }, [notes])

  // Top entidades
  const topEntities = useMemo(() => {
    const map = entityMentionCounts()
    return Object.entries(map)
      .map(([slug, count]) => ({ slug, count, entity: resolveEntity(slug) }))
      .filter((x) => !!x.entity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [notes])

  const topMentions = topEntities[0]?.count ?? 1

  // Top tags
  const topTags = useMemo(() => allTags().slice(0, 12), [notes])

  // Notas huérfanas · sin links salientes Y sin backlinks
  const orphans = useMemo(() => {
    const out: CuadernoNote[] = []
    for (const n of notes) {
      const outLinks = extractLinks(n.content)
      const inLinks = backlinks(n.slug)
      if (outLinks.length === 0 && inLinks.length === 0) {
        out.push(n)
      }
    }
    return out.slice(0, 10)
  }, [notes])

  // Lagunas · entidades del registry SIN ninguna nota
  const coverageGaps = useMemo(() => {
    const counts = entityMentionCounts()
    const gaps = ENTITY_REGISTRY.filter((e) => !counts[e.slug])
    // Agrupa por kind y devuelve top 4 por cada kind importante
    const byKind: Partial<Record<EntityKind, typeof gaps>> = {}
    for (const e of gaps) {
      if (!byKind[e.kind]) byKind[e.kind] = []
      byKind[e.kind]!.push(e)
    }
    return byKind
  }, [notes])

  // Heatmap últimos 30 días
  const heatmap = useMemo(() => {
    const days: { date: string; count: number }[] = []
    const counts: Record<string, number> = {}
    for (const n of notes) {
      const d = String(n.updatedAt).slice(0, 10)
      counts[d] = (counts[d] ?? 0) + 1
    }
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      days.push({ date: iso, count: counts[iso] ?? 0 })
    }
    return days
  }, [notes])
  const maxHeatmap = Math.max(1, ...heatmap.map((d) => d.count))

  const kindOrder: EntityKind[] = ['person', 'party', 'institution', 'ccaa', 'sector', 'company', 'country']

  return (
    <div
      style={{
        padding: '20px 28px', maxWidth: 1080, margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 18,
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
          Insights · tu Cuaderno en vivo
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Panorama de tu actividad analítica · top entidades, lagunas de cobertura, heatmap.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          ['Notas', kpi.notes, '#0071e3'],
          ['Palabras', formatNum(kpi.words), '#0f766e'],
          ['Entidades únicas', kpi.entities, '#7c3aed'],
          ['Tags', kpi.tags, '#dc2626'],
          ['Días activos', kpi.daysActive, '#16a34a'],
        ].map(([label, value, color]) => (
          <div
            key={String(label)}
            style={{
              padding: '12px 14px', background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, borderTop: `3px solid ${color}`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: String(color) }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <Section title="Actividad últimos 30 días" subtitle="intensidad = nº de notas modificadas">
        <div style={{ display: 'flex', gap: 3 }}>
          {heatmap.map((d) => {
            const intensity = d.count === 0 ? 0 : Math.min(1, d.count / maxHeatmap)
            const bg = d.count === 0 ? '#f1f5f9' : `rgba(0,113,227,${0.2 + intensity * 0.8})`
            return (
              <div
                key={d.date}
                title={`${d.date} · ${d.count} nota${d.count === 1 ? '' : 's'}`}
                style={{
                  flex: 1, height: 38, borderRadius: 4, background: bg,
                  border: '1px solid rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  fontSize: 9, color: intensity > 0.5 ? '#fff' : '#94a3b8',
                  padding: '2px 0',
                }}
              >
                {d.count > 0 && d.count}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
          <span>-29d</span>
          <span>hoy</span>
        </div>
      </Section>

      {/* Top entidades */}
      <Section title="Top entidades mencionadas" subtitle="ordenadas por número de notas que las nombran">
        {topEntities.length === 0 ? (
          <Empty msg="Sin entidades mencionadas todavía. Usa [[Pedro Sánchez]] en una nota para empezar." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {topEntities.map(({ slug, count, entity }) => {
              if (!entity) return null
              const c = KIND_COLORS[entity.kind]
              const pct = (count / topMentions) * 100
              return (
                <a
                  key={slug}
                  href={entity.link}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 6px', borderRadius: 4,
                    textDecoration: 'none', color: '#0f172a',
                  }}
                >
                  <span style={{ width: 18, fontSize: 12, color: c.fg }}>{c.glyph}</span>
                  <span style={{ width: 180, fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {entity.name}
                  </span>
                  <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c.fg, opacity: 0.85 }} />
                  </div>
                  <span style={{ width: 28, fontSize: 11, color: '#64748b', textAlign: 'right', fontWeight: 600 }}>
                    {count}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </Section>

      {/* Top tags + notas huérfanas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Section title="Top tags" subtitle={`${topTags.length} top de ${kpi.tags}`}>
          {topTags.length === 0 ? (
            <Empty msg="Sin tags todavía. Usa #etiqueta en una nota." />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {topTags.map((t) => (
                <span
                  key={t.tag}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4,
                    background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d',
                    fontWeight: 600,
                  }}
                >
                  {t.tag} · {t.count}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Notas huérfanas" subtitle="sin enlaces ni backlinks">
          {orphans.length === 0 ? (
            <Empty msg="Sin notas huérfanas · todas conectadas." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {orphans.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onOpenNote(n.id)}
                  style={{
                    textAlign: 'left', padding: '6px 10px', borderRadius: 4,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: 1,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {n.folder} · {new Date(n.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Lagunas de cobertura */}
      <Section
        title="Lagunas de cobertura"
        subtitle="entidades del registry sin ninguna nota · oportunidad de profundizar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kindOrder.map((kind) => {
            const list = coverageGaps[kind]
            if (!list || list.length === 0) return null
            const c = KIND_COLORS[kind]
            return (
              <div key={kind}>
                <div style={{
                  fontSize: 9, color: '#94a3b8', textTransform: 'uppercase',
                  letterSpacing: 0.4, fontWeight: 700, marginBottom: 4,
                }}>
                  {kindLabel(kind)} · {list.length} sin mencionar
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {list.slice(0, 12).map((e) => (
                    <a
                      key={e.slug}
                      href={e.link}
                      style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 3,
                        background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
                        textDecoration: 'none', fontWeight: 600,
                      }}
                    >
                      {c.glyph} {e.name}
                    </a>
                  ))}
                  {list.length > 12 && (
                    <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center' }}>
                      + {list.length - 12} más
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        padding: '14px 16px', background: '#fff',
        border: '1px solid #e5e7eb', borderRadius: 8,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          {title}
        </h3>
        {subtitle && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </section>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', padding: '8px 0', fontStyle: 'italic' }}>
      {msg}
    </div>
  )
}

function formatNum(n: number): string {
  return n.toLocaleString('es-ES')
}

function kindLabel(kind: EntityKind): string {
  const labels: Record<EntityKind, string> = {
    person: 'Personas',
    party: 'Partidos',
    ccaa: 'CCAA',
    sector: 'Sectores',
    company: 'Empresas',
    institution: 'Instituciones',
    country: 'Países',
  }
  return labels[kind] ?? kind
}
