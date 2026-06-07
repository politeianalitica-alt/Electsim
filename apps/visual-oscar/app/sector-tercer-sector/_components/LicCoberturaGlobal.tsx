'use client'
/**
 * <LicCoberturaGlobal /> · Tercer Sector v3 · Cockpit W2 (Licitaciones).
 *
 * COBERTURA DE FUENTES del agregador, al final de la vista de Licitaciones. Da
 * contexto al analista de QUÉ cubre la plataforma y QUÉ falta: consume el
 * Opportunity Graph curado (`GET /api/tercer-sector/global-opportunities`,
 * envelope `{ ok, data:{ sources, por_status, por_pais_cobertura, … } }`) y pinta:
 *
 *   - Estado de integración: cuántas fuentes `live` (conector activo) vs
 *     `catalog` (catalogada, sin conector) vs `planned` (en cola).
 *   - Cobertura por nivel: organismo internacional / banco multilateral / UE /
 *     nacional / regional-local.
 *   - Cobertura por país/geografía (`por_pais_cobertura`, top).
 *   - Tabla de fuentes con su estado y prioridad de implementación.
 *
 * Es metadata curada (no scraping): el endpoint es estático. Degradación honesta:
 * si falla, lo dice. Distingue lo que YA está en vivo de lo catalogado/planeado
 * para no exagerar la cobertura. Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import type {
  GlobalSourcesResponse,
  ImplementationPriority,
  IntegrationStatus,
  OpportunitySource,
  SourceLevel,
} from '@/lib/tercer-sector/global-opportunities/types'
import { ACCENT } from './LicShared'

// ── Vocabulario de presentación (local · no se toca LicShared) ──────────────

const STATUS_META: Record<IntegrationStatus, { label: string; color: string; desc: string }> = {
  live: { label: 'En vivo', color: '#16A34A', desc: 'Conector activo en el agregador' },
  catalog: { label: 'Catalogada', color: '#CA8A04', desc: 'Catalogada con metadata, sin conector aún' },
  planned: { label: 'Planeada', color: '#94A3B8', desc: 'En cola de implementación' },
}

const LEVEL_META: { id: SourceLevel; label: string; glyph: string }[] = [
  { id: 'international_org', label: 'Organismos internacionales', glyph: '◉' },
  { id: 'mdb', label: 'Bancos multilaterales', glyph: '⬡' },
  { id: 'eu', label: 'Unión Europea', glyph: '⬡' },
  { id: 'national', label: 'Nacional', glyph: '◨' },
  { id: 'regional', label: 'Regional', glyph: '◔' },
  { id: 'local', label: 'Local', glyph: '◧' },
]

const PRIORITY_COLOR: Record<ImplementationPriority, string> = {
  P0: '#DC2626',
  P1: '#EA580C',
  P2: '#CA8A04',
  P3: '#94A3B8',
}

/** Geografías que conviene mostrar legibles cuando no son nombres de país. */
const GEO_LABEL: Record<string, string> = {
  global: 'Global',
  eu: 'Unión Europea',
  es: 'España',
  latam: 'Latinoamérica',
  africa: 'África',
  mena: 'MENA',
  asia: 'Asia',
}
function geoLabel(g: string): string {
  return GEO_LABEL[g.toLowerCase()] ?? (g.length === 2 ? g.toUpperCase() : g)
}

interface ApiEnvelope {
  ok: boolean
  data: GlobalSourcesResponse | null
  error?: string
  fetched_at?: string
}

export function LicCoberturaGlobal() {
  const [data, setData] = useState<GlobalSourcesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch('/api/tercer-sector/global-opportunities')
      .then((r) => r.json() as Promise<ApiEnvelope>)
      .then((j) => {
        if (!alive) return
        if (j.ok && j.data) {
          setData(j.data)
        } else {
          setError(j.error || 'No se pudo cargar la cobertura de fuentes.')
        }
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(String((e as Error)?.message ?? e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <section style={cardStyle}>
        <SkeletonHeader />
        <div style={{ height: 120, background: '#F1F5F9', borderRadius: 10, marginTop: 12 }} />
      </section>
    )
  }

  if (error || !data) {
    return (
      <section style={cardStyle}>
        <Header total={null} />
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#92400E' }}>
          <span aria-hidden="true">!</span> Cobertura de fuentes no disponible{error ? ` · ${error}` : ''}.
        </p>
      </section>
    )
  }

  const total = data.total
  const porStatus = data.por_status
  const live = porStatus.live ?? 0

  // Cobertura por nivel (cuántas fuentes tocan cada nivel administrativo).
  const porNivel = LEVEL_META.map((m) => ({
    ...m,
    count: data.sources.filter((s) => s.levels.includes(m.id)).length,
  })).filter((m) => m.count > 0)
  const maxNivel = Math.max(1, ...porNivel.map((n) => n.count))

  // Top geografías por cobertura.
  const geos = Object.entries(data.por_pais_cobertura)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)

  // Fuentes ordenadas: live primero, luego por prioridad, luego alfabético.
  const statusRank: Record<IntegrationStatus, number> = { live: 0, catalog: 1, planned: 2 }
  const sortedSources = [...data.sources].sort((a, b) => {
    const s = statusRank[a.integration_status] - statusRank[b.integration_status]
    if (s !== 0) return s
    const p = a.implementation_priority.localeCompare(b.implementation_priority)
    if (p !== 0) return p
    return a.label.localeCompare(b.label)
  })
  const visibleSources = expanded ? sortedSources : sortedSources.slice(0, 8)

  return (
    <section style={cardStyle}>
      <Header total={total} live={live} />

      {/* Estado de integración */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {(['live', 'catalog', 'planned'] as IntegrationStatus[]).map((st) => {
          const meta = STATUS_META[st]
          const n = porStatus[st] ?? 0
          return (
            <div
              key={st}
              title={meta.desc}
              style={{
                flex: '1 1 130px',
                background: `${meta.color}0D`,
                border: `1px solid ${meta.color}33`,
                borderRadius: 10,
                padding: '8px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {n.toLocaleString('es-ES')}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 14 }}>
        {/* Cobertura por nivel */}
        <div>
          <p style={subLabel}>Por nivel</p>
          {porNivel.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {porNivel.map((n) => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ color: ACCENT, fontSize: 12 }}>{n.glyph}</span>
                  <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, minWidth: 150 }}>{n.label}</span>
                  <span style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(n.count / maxNivel) * 100}%`, background: ACCENT, borderRadius: 999 }} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>
                    {n.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobertura por país / geografía */}
        <div>
          <p style={subLabel}>Por país / geografía</p>
          {geos.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {geos.map(([g, c]) => (
                <span
                  key={g}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 10.5,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '3px 9px',
                    color: '#334155',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{geoLabel(g)}</span>
                  <span style={{ fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla de fuentes */}
      <div style={{ marginTop: 16 }}>
        <p style={subLabel}>Fuentes del agregador</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleSources.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </div>
        {sortedSources.length > 8 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginTop: 8,
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {expanded ? 'Ver menos' : `Ver todas (${sortedSources.length})`}
          </button>
        )}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#94a3b8', lineHeight: 1.5 }}>
        Catálogo curado de conectores (Opportunity Graph). «En vivo» = conector activo en el barrido; «catalogada»/«planeada» aún no aportan resultados. Es metadata por fuente, no scraping.
      </p>
    </section>
  )
}

// ── Sub-piezas ──────────────────────────────────────────────────────────────

function Header({ total, live }: { total: number | null; live?: number }) {
  return (
    <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
        <span aria-hidden="true" style={{ color: ACCENT, marginRight: 6 }}>⊞</span>
        Cobertura de fuentes
      </h2>
      {total != null && (
        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          {total.toLocaleString('es-ES')} fuentes catalogadas
          {live != null ? ` · ${live.toLocaleString('es-ES')} en vivo` : ''}
        </span>
      )}
    </header>
  )
}

function SkeletonHeader() {
  return <div style={{ height: 18, width: 200, background: '#F1F5F9', borderRadius: 6 }} />
}

function SourceRow({ source }: { source: OpportunitySource }) {
  const st = STATUS_META[source.integration_status]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 9px',
        background: '#FBFBFC',
        border: '1px solid #F1F5F9',
        borderRadius: 8,
      }}
    >
      <span aria-hidden="true" title={st.desc} style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        title={source.notes || source.label}
        style={{ minWidth: 0, flex: 1, fontSize: 11.5, fontWeight: 600, color: '#0f172a', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {source.label}
      </a>
      <span style={{ fontSize: 9.5, color: '#94a3b8', whiteSpace: 'nowrap' }} title="Cobertura geográfica">
        {source.geography.slice(0, 2).map(geoLabel).join(', ')}
        {source.geography.length > 2 ? '…' : ''}
      </span>
      <span
        title={`Estado · ${st.desc}`}
        style={{ fontSize: 9.5, fontWeight: 700, color: st.color, background: `${st.color}14`, border: `1px solid ${st.color}33`, borderRadius: 5, padding: '1px 6px', whiteSpace: 'nowrap' }}
      >
        {st.label}
      </span>
      <span
        title={`Prioridad de implementación ${source.implementation_priority}`}
        style={{ fontSize: 9, fontWeight: 800, color: PRIORITY_COLOR[source.implementation_priority], fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'right' }}
      >
        {source.implementation_priority}
      </span>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ECECEF',
  borderRadius: 14,
  padding: '14px 18px',
  marginBottom: 14,
}

const subLabel: React.CSSProperties = {
  fontSize: 9.5,
  color: '#64748b',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}

export default LicCoberturaGlobal
