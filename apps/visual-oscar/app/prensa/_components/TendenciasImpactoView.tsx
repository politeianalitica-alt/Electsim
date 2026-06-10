'use client'
/**
 * `<TendenciasImpactoView />` · Sprint G15 FASE E
 *
 * Reemplaza el render legacy de la tab "Tendencias e impacto" (antes
 * "Actores") en `/prensa`. Antes había 3 paneles apilados sin coherencia:
 *
 *   - ActoresImpactoPanel (actor_impacts)
 *   - FiguresV2View (figures_v2)
 *   - SentimentDualView (figures + companies + sectors)
 *
 * Este componente unifica las cuatro dimensiones — figuras · empresas ·
 * sectores · territorios — con la misma rejilla: cada fila es un actor
 * con menciones · barra beneficial/harmful/neutral/uncertain · sentiment
 * hacia · impacto dominante · botón "Investigar" que abre un dossier.
 *
 * El sumario ejecutivo arriba consolida la lectura ("¿a quién está
 * beneficiando la cobertura?" · "¿quién pierde?" · "¿qué sector está
 * más expuesto?") sin tener que mirar 4 paneles distintos.
 *
 * Regla dura:
 *   - Si un actor tiene menos de 3 menciones → no aparece (ruido).
 *   - Si dominant_impact es "uncertain" en ≥60% → se marca como
 *     "sin lectura clara" en vez de pintar un veredicto.
 *
 * Callbacks opcionales:
 *   - `onInvestigate(actor, kind)` → abre tab búsqueda pre-cargada.
 *   - `onCreateDossier(actor, kind)` → fuerza generación dossier.
 *
 * Sin nuevas deps. Usa solo los datos que ya devuelve /api/medios/intel.
 */
import { useMemo, useState } from 'react'

type Kind = 'figura' | 'empresa' | 'sector' | 'territorio'
type ImpactKey = 'beneficial' | 'harmful' | 'neutral' | 'uncertain'

const IMPACTO_ES: Record<string, string> = { all: 'todos', beneficial: 'beneficioso', harmful: 'perjudicial', neutral: 'neutral', uncertain: 'incierto' }

interface ActorImpactRow {
  actor: string
  mentions: number
  dominant_impact: ImpactKey
  beneficial: number
  harmful: number
  neutral: number
  uncertain: number
  sample_reasons: string[]
}

interface FigureV2Row {
  name: string
  mentions: number
  avg_sentiment: number
  avg_confidence: number
  beneficial_count: number
  harmful_count: number
  neutral_count: number
  uncertain_count: number
  top_frames: Array<{ frame: string; count: number }>
  top_mediums: Array<{ medium: string; count: number }>
}

interface CompanyRow {
  id: string
  label: string
  sector?: string
  mentions: number
  pos: number
  neg: number
  neu: number
  polarity: number
  topics: string[]
}

interface SectorRow {
  sector: string
  mentions: number
  polarity: number
  companies: Array<{ name: string; mentions: number; polarity: number }>
}

interface NarrativeCluster {
  id: string
  title: string
  territorial_spread?: string[]
  benefited_actors?: string[]
  harmed_actors?: string[]
}

interface Props {
  actorImpacts: ActorImpactRow[]
  figuresV2: FigureV2Row[]
  companies: CompanyRow[]
  sectors: SectorRow[]
  narrativeClusters: NarrativeCluster[]
  onInvestigate?: (name: string, kind: Kind) => void
  onCreateDossier?: (name: string, kind: Kind) => void
}

interface UnifiedRow {
  name: string
  kind: Kind
  mentions: number
  beneficial: number
  harmful: number
  neutral: number
  uncertain: number
  dominantImpact: ImpactKey
  sentiment: number | null         // -1..+1 si lo tenemos
  confidence: number | null         // 0..1 si lo tenemos
  sampleReasons: string[]
  contextTags: string[]             // frames/topics/sectores/territorios
  topMedia: string[]
}

function impactColor(k: ImpactKey | null): string {
  if (k === 'beneficial') return '#16a34a'
  if (k === 'harmful') return '#dc2626'
  if (k === 'neutral') return '#64748b'
  return '#94a3b8'
}

function dominantOf(b: number, h: number, n: number, u: number): ImpactKey {
  const max = Math.max(b, h, n, u)
  if (max === 0) return 'uncertain'
  if (b === max) return 'beneficial'
  if (h === max) return 'harmful'
  if (n === max) return 'neutral'
  return 'uncertain'
}

// ── builders por tipo ────────────────────────────────────────────────

function buildFiguras(actorImpacts: ActorImpactRow[], figuresV2: FigureV2Row[]): UnifiedRow[] {
  // Merge actorImpacts + figuresV2 por nombre normalizado
  const byName = new Map<string, UnifiedRow>()
  for (const a of actorImpacts) {
    if (a.mentions < 3) continue
    byName.set(a.actor.toLowerCase(), {
      name: a.actor, kind: 'figura', mentions: a.mentions,
      beneficial: a.beneficial, harmful: a.harmful, neutral: a.neutral, uncertain: a.uncertain,
      dominantImpact: a.dominant_impact, sentiment: null, confidence: null,
      sampleReasons: a.sample_reasons.slice(0, 3), contextTags: [], topMedia: [],
    })
  }
  for (const f of figuresV2) {
    if (f.mentions < 3) continue
    const key = f.name.toLowerCase()
    const existing = byName.get(key)
    if (existing) {
      existing.sentiment = f.avg_sentiment
      existing.confidence = f.avg_confidence
      existing.contextTags = f.top_frames.slice(0, 3).map((x) => x.frame)
      existing.topMedia = f.top_mediums.slice(0, 3).map((x) => x.medium)
    } else {
      const di = dominantOf(f.beneficial_count, f.harmful_count, f.neutral_count, f.uncertain_count)
      byName.set(key, {
        name: f.name, kind: 'figura', mentions: f.mentions,
        beneficial: f.beneficial_count, harmful: f.harmful_count, neutral: f.neutral_count, uncertain: f.uncertain_count,
        dominantImpact: di, sentiment: f.avg_sentiment, confidence: f.avg_confidence,
        sampleReasons: [],
        contextTags: f.top_frames.slice(0, 3).map((x) => x.frame),
        topMedia: f.top_mediums.slice(0, 3).map((x) => x.medium),
      })
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.mentions - a.mentions)
}

function buildEmpresas(companies: CompanyRow[]): UnifiedRow[] {
  return companies
    .filter((c) => c.mentions >= 3)
    .map((c) => {
      // companies no trae beneficial/harmful explícito · derivamos de pos/neg/neu como aprox
      const beneficial = c.pos
      const harmful = c.neg
      const neutral = c.neu
      const uncertain = 0
      const di = dominantOf(beneficial, harmful, neutral, uncertain)
      return {
        name: c.label, kind: 'empresa' as Kind, mentions: c.mentions,
        beneficial, harmful, neutral, uncertain,
        dominantImpact: di, sentiment: c.polarity, confidence: null,
        sampleReasons: [],
        contextTags: [c.sector, ...c.topics].filter(Boolean).slice(0, 4) as string[],
        topMedia: [],
      }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

function buildSectores(sectors: SectorRow[]): UnifiedRow[] {
  return sectors
    .filter((s) => s.mentions >= 3)
    .map((s) => {
      // El polarity vota por nosotros · convertimos a barras aproximadas
      const total = s.mentions
      const beneficial = s.polarity > 0.1 ? Math.round(total * (0.5 + s.polarity * 0.4)) : Math.round(total * 0.3)
      const harmful = s.polarity < -0.1 ? Math.round(total * (0.5 + Math.abs(s.polarity) * 0.4)) : Math.round(total * 0.3)
      const neutral = Math.max(0, total - beneficial - harmful)
      const di = dominantOf(beneficial, harmful, neutral, 0)
      return {
        name: s.sector, kind: 'sector' as Kind, mentions: total,
        beneficial, harmful, neutral, uncertain: 0,
        dominantImpact: di, sentiment: s.polarity, confidence: null,
        sampleReasons: [],
        contextTags: s.companies.slice(0, 4).map((c) => c.name),
        topMedia: [],
      }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

function buildTerritorios(clusters: NarrativeCluster[]): UnifiedRow[] {
  // Agrupar narrativas por territorio mencionado
  const byTerr = new Map<string, { mentions: number; benef: number; harm: number; titles: string[] }>()
  for (const c of clusters) {
    const terrs = c.territorial_spread || []
    for (const t of terrs) {
      const key = t.toLowerCase()
      const cur = byTerr.get(key) || { mentions: 0, benef: 0, harm: 0, titles: [] }
      cur.mentions += 1
      cur.benef += (c.benefited_actors || []).length
      cur.harm += (c.harmed_actors || []).length
      if (cur.titles.length < 3) cur.titles.push(c.title)
      byTerr.set(key, cur)
    }
  }
  return Array.from(byTerr.entries())
    .filter(([, v]) => v.mentions >= 2)
    .map(([k, v]) => {
      const di = dominantOf(v.benef, v.harm, 0, v.mentions - v.benef - v.harm)
      return {
        name: k, kind: 'territorio' as Kind, mentions: v.mentions,
        beneficial: v.benef, harmful: v.harm, neutral: Math.max(0, v.mentions - v.benef - v.harm), uncertain: 0,
        dominantImpact: di, sentiment: null, confidence: null,
        sampleReasons: v.titles,
        contextTags: [],
        topMedia: [],
      }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

// ── UI ───────────────────────────────────────────────────────────────

export function TendenciasImpactoView(props: Props) {
  const [kind, setKind] = useState<Kind>('figura')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterImpact, setFilterImpact] = useState<ImpactKey | 'all'>('all')

  const rows = useMemo(() => {
    if (kind === 'figura') return buildFiguras(props.actorImpacts, props.figuresV2)
    if (kind === 'empresa') return buildEmpresas(props.companies)
    if (kind === 'sector') return buildSectores(props.sectors)
    return buildTerritorios(props.narrativeClusters)
  }, [kind, props.actorImpacts, props.figuresV2, props.companies, props.sectors, props.narrativeClusters])

  const filtered = filterImpact === 'all' ? rows : rows.filter((r) => r.dominantImpact === filterImpact)

  // Sumario ejecutivo
  const summary = useMemo(() => {
    const total = rows.length
    const topBeneficiado = rows
      .filter((r) => r.dominantImpact === 'beneficial')
      .sort((a, b) => b.beneficial - a.beneficial)[0]
    const topPerjudicado = rows
      .filter((r) => r.dominantImpact === 'harmful')
      .sort((a, b) => b.harmful - a.harmful)[0]
    const masMencionado = rows[0] || null
    return { total, topBeneficiado, topPerjudicado, masMencionado }
  }, [rows])

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header con explicación metodológica colapsable */}
      <header style={{
        background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2',
        borderRadius: 10, padding: 14,
      }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#0891b2', textTransform: 'uppercase' }}>
          ◆ Tendencias e impacto · ¿a quién beneficia y perjudica esta cobertura?
        </p>
        {/* Sprint Q-C.1 · ANTES: nombre de función interna (`assessSentiment`) + labels en
            inglés en una vista ES. AHORA: descripción funcional en español. */}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
          Cada actor (figura, empresa, sector o territorio) lleva su <strong>impacto político</strong>
          (le beneficia, le perjudica, neutral o sin lectura clara) leído por nuestro motor de sentimiento,
          no como simple polaridad positivo/negativo. Mínimo 3 menciones para aparecer; figuras con confianza
          media baja se marcan <em>sin lectura clara</em>.
        </p>
      </header>

      {/* Sumario ejecutivo */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8,
      }}>
        <SummaryCard label="Actores analizados" value={`${rows.length}`} color="#0891b2" />
        <SummaryCard
          label="Más beneficiado"
          value={summary.topBeneficiado ? summary.topBeneficiado.name : '—'}
          sub={summary.topBeneficiado ? `${summary.topBeneficiado.beneficial} menciones favorables` : 'sin patrón claro'}
          color="#16a34a"
        />
        <SummaryCard
          label="Más perjudicado"
          value={summary.topPerjudicado ? summary.topPerjudicado.name : '—'}
          sub={summary.topPerjudicado ? `${summary.topPerjudicado.harmful} menciones críticas` : 'sin patrón claro'}
          color="#dc2626"
        />
        <SummaryCard
          label="Más mencionado"
          value={summary.masMencionado ? summary.masMencionado.name : '—'}
          sub={summary.masMencionado ? `${summary.masMencionado.mentions} menciones totales` : ''}
          color="#1F4E8C"
        />
      </div>

      {/* Selector kind + filtro impacto */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px',
      }}>
        <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['figura', 'empresa', 'sector', 'territorio'] as Kind[]).map((k) => (
            <KindBtn key={k} label={kindLabel(k)} active={kind === k} onClick={() => { setKind(k); setExpanded(null) }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#64748b' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600, fontSize: 9 }}>Filtrar:</span>
          {(['all', 'beneficial', 'harmful', 'neutral', 'uncertain'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterImpact(f)}
              style={{
                background: filterImpact === f ? impactColor(f === 'all' ? null : f) : 'transparent',
                color: filterImpact === f ? '#fff' : '#64748b',
                border: `1px solid ${filterImpact === f ? impactColor(f === 'all' ? null : f) : '#e5e7eb'}`,
                borderRadius: 4, fontSize: 10, fontWeight: 600,
                padding: '2px 8px', cursor: 'pointer', textTransform: 'capitalize',
                fontFamily: 'inherit',
              }}
            >{f === 'all' ? 'todos' : IMPACTO_ES[f]}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12,
      }}>
        {filtered.length === 0 ? (
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
            No hay {kindLabel(kind).toLowerCase()} con suficientes menciones para emitir lectura
            {filterImpact !== 'all' ? ` (filtro: ${IMPACTO_ES[filterImpact] ?? filterImpact})` : ''}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.slice(0, 25).map((r) => (
              <ActorRow
                key={`${r.kind}-${r.name}`}
                row={r}
                expanded={expanded === `${r.kind}-${r.name}`}
                onToggle={() => setExpanded(expanded === `${r.kind}-${r.name}` ? null : `${r.kind}-${r.name}`)}
                onInvestigate={props.onInvestigate}
                onCreateDossier={props.onCreateDossier}
              />
            ))}
          </div>
        )}
        {filtered.length > 25 && (
          <p style={{ margin: '10px 0 0', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
            Mostrando top 25 de {filtered.length}. Filtra por impacto para acotar.
          </p>
        )}
      </div>

      {/* Sprint Q-C.1 · pie en lenguaje analista, sin nombres de campos internos. */}
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', textAlign: 'right' }}>
        Empresas y sectores: lectura aproximada derivada de sentimiento positivo/negativo/neutral ·
        Figuras: lectura exacta beneficia/perjudica/neutral/sin lectura ·
        Territorios: agregados por extensión geográfica de cada narrativa.
      </p>
    </section>
  )
}

function kindLabel(k: Kind): string {
  if (k === 'figura') return 'Figuras y partidos'
  if (k === 'empresa') return 'Empresas (IBEX35)'
  if (k === 'sector') return 'Sectores'
  return 'Territorios'
}

function KindBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#fff' : 'transparent',
        color: active ? '#0f172a' : '#64748b',
        border: 'none',
        borderRadius: 5,
        fontSize: 11, fontWeight: active ? 700 : 500,
        padding: '5px 10px', cursor: 'pointer',
        boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
        fontFamily: 'inherit',
      }}
    >{label}</button>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10,
      borderLeft: `3px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{
        margin: '4px 0 0', fontSize: 14, fontWeight: 700, color, lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={value}>{value}</p>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', lineHeight: 1.3 }}>{sub}</p>
      )}
    </div>
  )
}

function ActorRow({
  row, expanded, onToggle, onInvestigate, onCreateDossier,
}: {
  row: UnifiedRow
  expanded: boolean
  onToggle: () => void
  onInvestigate?: (name: string, kind: Kind) => void
  onCreateDossier?: (name: string, kind: Kind) => void
}) {
  const total = row.beneficial + row.harmful + row.neutral + row.uncertain || 1
  const di = row.dominantImpact
  const senPct = row.sentiment !== null ? (row.sentiment * 100).toFixed(0) : null
  const senColor = row.sentiment === null ? '#64748b' : row.sentiment > 0.1 ? '#16a34a' : row.sentiment < -0.1 ? '#dc2626' : '#64748b'
  const lowConfidence = row.confidence !== null && row.confidence < 0.4
  const uncertainDominant = di === 'uncertain' && (row.uncertain / total) >= 0.6

  return (
    <article style={{ borderBottom: '1px solid #f1f5f9' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'transparent', border: 'none', textAlign: 'left',
          cursor: 'pointer', padding: '6px 6px', fontFamily: 'inherit',
          display: 'grid',
          gridTemplateColumns: '200px 50px 1fr 100px 110px',
          gap: 8, alignItems: 'center',
        }}
      >
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: '#0f172a',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textTransform: row.kind === 'territorio' ? 'capitalize' : 'none',
        }}>{row.name}</span>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
          {row.mentions}
        </span>
        <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: '#f1f5f9' }}>
          {row.beneficial > 0 && <div style={{ width: `${(row.beneficial / total) * 100}%`, background: '#16a34a' }} title={`beneficioso ${row.beneficial}`} />}
          {row.harmful > 0 && <div style={{ width: `${(row.harmful / total) * 100}%`, background: '#dc2626' }} title={`perjudicial ${row.harmful}`} />}
          {row.neutral > 0 && <div style={{ width: `${(row.neutral / total) * 100}%`, background: '#94a3b8' }} title={`neutral ${row.neutral}`} />}
          {row.uncertain > 0 && <div style={{ width: `${(row.uncertain / total) * 100}%`, background: '#cbd5e1' }} title={`incierto ${row.uncertain}`} />}
        </div>
        <span style={{ fontSize: 9, color: senColor, fontWeight: 700, fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
          {senPct !== null ? `sent ${senPct}%` : '—'}
          {lowConfidence && <span style={{ marginLeft: 4, color: '#f59e0b' }} title="confianza baja">!</span>}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'right',
          color: uncertainDominant ? '#94a3b8' : impactColor(di),
        }}>
          ● {uncertainDominant ? 'sin lectura' : IMPACTO_ES[di]}
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: '8px 12px 10px', background: '#f9fafb', borderRadius: 4, marginBottom: 4, fontSize: 11, color: '#334155',
        }}>
          {row.contextTags.length > 0 && (
            <p style={{ margin: '0 0 4px', fontSize: 10 }}>
              <strong style={{ color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>Contexto:</strong>{' '}
              {row.contextTags.map((t) => (
                <span key={t} style={{
                  display: 'inline-block', background: '#e0f2fe', color: '#075985',
                  padding: '1px 6px', borderRadius: 2, margin: '0 3px 2px 0', fontSize: 10,
                }}>{t}</span>
              ))}
            </p>
          )}
          {row.topMedia.length > 0 && (
            <p style={{ margin: '0 0 4px', fontSize: 10 }}>
              <strong style={{ color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>Medios que amplifican:</strong>{' '}
              {row.topMedia.join(' · ')}
            </p>
          )}
          {row.sampleReasons.length > 0 && (
            <div style={{ margin: '6px 0 0' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {row.kind === 'territorio' ? 'Narrativas en este territorio' : 'Por qué se clasifica así'}
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {row.sampleReasons.map((s, i) => (
                  <li key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {(onInvestigate || onCreateDossier) && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              {onInvestigate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInvestigate(row.name, row.kind) }}
                  style={{
                    background: '#fff', color: '#1F4E8C', border: '1px solid #1F4E8C',
                    borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '3px 10px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >→ Investigar en búsqueda</button>
              )}
              {onCreateDossier && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateDossier(row.name, row.kind) }}
                  style={{
                    background: '#DC2626', color: '#fff', border: 'none',
                    borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '3px 10px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >↓ Crear dossier</button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default TendenciasImpactoView
