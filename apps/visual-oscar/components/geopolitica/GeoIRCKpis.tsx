'use client'
/**
 * <GeoIRCKpis /> · Sprint GEO-RADAR C2
 *
 * 5 KPIs ejecutivos del estado global derivados de /api/geopolitica/irc
 * + /api/geopolitica/trending-temas. Fila horizontal de cards compactas.
 *
 * - Conflictos activos · nº países con IRC > 55
 * - Tono global · media GDELT global -10/+10
 * - Democracias en regresión · nº países con trend V-Dem regresion/regresion_severa
 * - Países críticos · nº con IRC ≥ 75
 * - Cobertura mediática conflictos · suma artículos GDELT WAR_CONFLICT 24h
 *
 * Click en cualquier KPI → callback opcional para filtrar el mapa.
 */
import { useEffect, useState } from 'react'

interface IRCResponse {
  ok: boolean
  countries: Array<{
    iso3: string; irc: number; risk_level: string
    raw: { polyarchy_trend?: string; gdelt_tone_value?: number; gdelt_articles_48h?: number }
  }>
  summary: {
    critical_risk_count: number
    high_risk_count: number
    avg_global_tone: number | null
    total_countries: number
    total_conflict_articles_48h?: number
    countries_with_gdelt_signal?: number
    gdelt_available?: boolean
  }
  _meta?: { capa_gdelt_status?: string }
}

interface TrendingResponse {
  ok: boolean
  total_articles_24h: number
  topics: Array<{ theme: string; article_count: number }>
}

interface Props {
  onFilterClick?: (filter: string) => void
}

export function GeoIRCKpis({ onFilterClick }: Props) {
  const [irc, setIrc] = useState<IRCResponse | null>(null)
  const [trending, setTrending] = useState<TrendingResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/geopolitica/irc', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/geopolitica/trending-temas', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([i, t]) => { if (alive) { setIrc(i); setTrending(t) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando KPIs globales…</p>

  const conflictosActivos = irc?.countries.filter((c) => c.irc > 55).length ?? 0
  const democraciasRegresion = irc?.countries.filter(
    (c) => c.raw.polyarchy_trend === 'regresion' || c.raw.polyarchy_trend === 'regresion_severa'
  ).length ?? 0
  // Cobertura conflictos · 1º trending-temas, 2º fallback al sample del IRC
  const conflictFromTrending = trending?.topics.find((t) => t.theme === 'WAR_CONFLICT')?.article_count
    ?? trending?.topics
      .filter((t) => ['WAR_CONFLICT', 'KILL', 'TERROR'].includes(t.theme))
      .reduce((s, t) => s + t.article_count, 0)
    ?? 0
  const conflictArticles24h = conflictFromTrending > 0
    ? conflictFromTrending
    : (irc?.summary.total_conflict_articles_48h ?? 0)
  const conflictArticlesWindow = conflictFromTrending > 0 ? '24h' : '48h'

  // Estado GDELT (afecta tono global · si rate-limited mostramos badge)
  const gdeltRateLimited = irc?.summary.gdelt_available === false

  const tone = irc?.summary.avg_global_tone
  const toneColor = tone === null || tone === undefined ? '#64748b'
    : tone < -3 ? '#dc2626' : tone < 0 ? '#f59e0b' : tone < 3 ? '#64748b' : '#16a34a'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 10,
    }}>
      <Kpi
        label="Conflictos activos"
        value={String(conflictosActivos)}
        sub={`IRC > 55 · ${irc?.summary.total_countries ?? '—'} países cubiertos`}
        accent="#dc2626"
        onClick={() => onFilterClick?.('alto')}
      />
      <Kpi
        label="Tono global GDELT"
        value={tone !== null && tone !== undefined ? tone.toFixed(2) : '—'}
        sub={
          gdeltRateLimited
            ? 'GDELT rate-limited · estructural V-Dem+SIPRI'
            : `media ${irc?.summary.countries_with_gdelt_signal ?? 0} países · -10 hostil · +10 positivo`
        }
        accent={toneColor}
      />
      <Kpi
        label="Democracias en regresión"
        value={String(democraciasRegresion)}
        sub="trend V-Dem 5 años regresión / regresión severa"
        accent="#7c3aed"
        onClick={() => onFilterClick?.('regresion')}
      />
      <Kpi
        label="Países críticos"
        value={String(irc?.summary.critical_risk_count ?? 0)}
        sub="IRC ≥ 75 · crisis activa"
        accent="#7f1d1d"
        onClick={() => onFilterClick?.('critico')}
      />
      <Kpi
        label={`Cobertura conflictos ${conflictArticlesWindow}`}
        value={String(conflictArticles24h)}
        sub={
          conflictArticles24h === 0
            ? 'GDELT sin datos · revisar capa táctica'
            : 'artículos themes WAR/KILL/TERROR/PROTEST'
        }
        accent="#0891b2"
        onClick={() => onFilterClick?.('cobertura')}
      />
    </div>
  )
}

function Kpi({ label, value, sub, accent, onClick }: { label: string; value: string; sub: string; accent: string; onClick?: () => void }) {
  const isClickable = !!onClick
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      style={{
        padding: '12px 14px', background: '#fff', borderRadius: 8,
        borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left', fontFamily: 'inherit',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={(e) => { if (isClickable) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>
    </button>
  )
}

export default GeoIRCKpis
