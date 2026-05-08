'use client'
import { useState, useCallback, useMemo } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import BiasSpectrum from '@/components/media/BiasSpectrum'
import SentimentHeatmap from '@/components/media/SentimentHeatmap'
import NarrativePanel from '@/components/media/NarrativePanel'
import NarrativeMap from '@/components/media/NarrativeMap'

// ─── API Response Types ────────────────────────────────────────────────────

interface KpisResponse {
  articulos_totales: number
  fuentes_activas: number
  narrativas_detectadas: number
  articulos_internacionales: number
}

interface FeedItem {
  titular: string
  fuente: string
  ideologia: string
  sentimiento_score: number
  relevancia_score: number
  resumen: string
  fecha_publicacion: string
  categoria: string
  scope: string
  partidos_mencionados?: string
}

interface FeedResponse {
  items: FeedItem[]
  pages: number
  page: number
}

interface SesgoMedio {
  nombre: string
  ideologia_percibida: string
  audiencia_mensual_M: number
  grupo_mediatico: string
  tipo: string
  n_articulos_recientes: number
}

interface SesgoResponse {
  medios: SesgoMedio[]
}

interface SentiResponse {
  series: Array<Record<string, string | number>>
  entidades: string[]
}

interface NarrativaCluster {
  categoria: string
  n_articulos: number
  velocidad_7d: number
  velocidad_label: string
  emocion_dominante: string
  partidos_top: string[]
  recomendacion: string
}

interface NarrativasResponse {
  clusters: NarrativaCluster[]
}

interface PaisItem {
  country_code: string
  country_name: string
  n_articulos: number
  sentiment_avg: number
  lat: number
  lon: number
}

interface MapaPaisesResponse {
  paises: PaisItem[]
}

interface CcaaItem {
  ccaa_id: number
  nombre_ccaa: string
  narrativa_dominante: string
  n_articulos: number
  ideologia_media: number
}

interface MapaCcaasResponse {
  ccaas: CcaaItem[]
}

// ─── Feed filters ─────────────────────────────────────────────────────────

interface FeedFilters {
  categoria: string
  sesgo: string
  partido: string
  scope: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const IDEOLOGY_COLORS: Record<string, string> = {
  izquierda: '#e74c3c',
  centroizquierda: '#e67e22',
  centro: '#95a5a6',
  centroderecha: '#3498db',
  derecha: '#2c3e50',
  nacionalista: '#9b59b6',
}

function sentimentDot(score: number): string {
  if (score > 0.2) return '#27ae60'
  if (score < -0.2) return '#e74c3c'
  return '#95a5a6'
}

function relativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  } catch {
    return iso
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #e8e8ed',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#1d1d1f',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11.5, color: '#6e6e73' }}>{label}</span>
    </div>
  )
}

// ─── Feed Item Card ────────────────────────────────────────────────────────

function sentimentLabel(score: number): string {
  if (score > 0.3) return 'Muy positivo'
  if (score > 0.1) return 'Positivo'
  if (score > -0.1) return 'Neutro'
  if (score > -0.3) return 'Negativo'
  return 'Muy negativo'
}

function sentimentColor(score: number): string {
  if (score > 0.1) return '#16a34a'
  if (score > -0.1) return '#6e6e73'
  return '#dc2626'
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const ideologiaColor =
    IDEOLOGY_COLORS[item.ideologia] ?? '#95a5a6'
  const sentiColor = sentimentColor(item.sentimiento_score)
  const sentiText = sentimentLabel(item.sentimiento_score)
  const sentiBarWidth = Math.abs(item.sentimiento_score) * 100

  const categoriaDisplay = item.categoria
    ? item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1)
    : null

  const sentences = item.resumen
    ? item.resumen
        .split('. ')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3)
    : []

  const parties =
    item.partidos_mencionados && item.partidos_mencionados.trim().length > 0
      ? item.partidos_mencionados.split(',')
      : []

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '12px 14px',
        border: '1px solid #e8e8ed',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      {/* Top row: sentiment bar + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          style={{
            flexShrink: 0,
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: 36,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: '#f0f0f5',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${sentiBarWidth}%`,
                background: sentiColor,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontSize: 8.5, color: sentiColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {sentiText}
          </span>
          <span style={{ fontSize: 8, color: '#aeaeb2' }}>
            ({item.sentimiento_score >= 0 ? '+' : ''}{item.sentimiento_score.toFixed(2)})
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1d1d1f',
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {item.titular}
          </span>
          {/* Narrative tag */}
          {categoriaDisplay && (
            <div style={{ marginTop: 3 }}>
              <span
                style={{
                  fontSize: 10,
                  background: '#f0f4ff',
                  color: '#1F4E8C',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontWeight: 600,
                }}
              >
                {categoriaDisplay}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Source + ideology chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: '#6e6e73' }}>{item.fuente}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#ffffff',
            background: ideologiaColor,
            borderRadius: 6,
            padding: '1px 6px',
          }}
        >
          {item.ideologia}
        </span>
      </div>

      {/* Relevancia bar */}
      <div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: '#f5f5f7',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(item.relevancia_score * 100)}%`,
              background: '#0071e3',
              borderRadius: 2,
              transition: 'width 300ms',
            }}
          />
        </div>
      </div>

      {/* Key points as bullet list */}
      {sentences.length > 0 && (
        <ul style={{ margin: '4px 0 0', padding: '0 0 0 14px', listStyle: 'disc' }}>
          {sentences.map((s, i) => (
            <li key={i} style={{ fontSize: 11, color: '#424245', lineHeight: 1.45, marginBottom: 2 }}>{s}</li>
          ))}
        </ul>
      )}

      {/* Figures/parties row */}
      {parties.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {parties.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 9.5,
                background: '#F0F0F5',
                color: '#424245',
                borderRadius: 4,
                padding: '1px 6px',
                fontWeight: 500,
              }}
            >
              {p.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <span style={{ fontSize: 10.5, color: '#aeaeb2' }}>
        {relativeDate(item.fecha_publicacion)}
      </span>
    </div>
  )
}

// ─── Feed skeleton ─────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            background: '#f5f5f7',
            borderRadius: 12,
            height: 100,
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}

// ─── Select helper ─────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 12,
        border: '1px solid #e8e8ed',
        borderRadius: 8,
        padding: '5px 10px',
        color: '#1d1d1f',
        background: '#ffffff',
        fontFamily: '-apple-system, system-ui, sans-serif',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function MediosNarrativaPage() {
  const { data: kpisRaw } = useApi<KpisResponse>('/api/media-intel/kpis', {
    refreshInterval: 60_000,
  })
  const { data: sesgoRaw } = useApi<SesgoResponse>(
    '/api/media-intel/sesgo-espectro',
    { refreshInterval: 300_000 }
  )
  const { data: sentiRaw } = useApi<SentiResponse>(
    '/api/media-intel/sentimiento-diario',
    { refreshInterval: 120_000 }
  )
  const { data: narrativasRaw } = useApi<NarrativasResponse>(
    '/api/media-intel/narrativas',
    { refreshInterval: 120_000 }
  )
  const { data: mapaRaw } = useApi<MapaPaisesResponse>(
    '/api/media-intel/mapa-paises',
    { refreshInterval: 300_000 }
  )
  const { data: ccaasRaw } = useApi<MapaCcaasResponse>(
    '/api/media-intel/mapa-ccaa',
    { refreshInterval: 300_000 }
  )

  const [feedFilters, setFeedFilters] = useState<FeedFilters>({
    categoria: '',
    sesgo: '',
    partido: '',
    scope: '',
  })
  const [feedPage, setFeedPage] = useState(1)

  const feedUrl = useMemo(() => {
    const p = new URLSearchParams()
    if (feedFilters.categoria) p.set('categoria', feedFilters.categoria)
    if (feedFilters.sesgo) p.set('sesgo', feedFilters.sesgo)
    if (feedFilters.partido) p.set('partido', feedFilters.partido)
    if (feedFilters.scope) p.set('scope', feedFilters.scope)
    p.set('page', String(feedPage))
    return `/api/media-intel/feed?${p.toString()}`
  }, [feedFilters, feedPage])

  const { data: filteredFeedRaw, loading: loadingFilteredFeed } =
    useApi<FeedResponse>(feedUrl, { refreshInterval: 60_000 })

  const handleFilterChange = useCallback(
    (key: keyof FeedFilters) => (value: string) => {
      setFeedFilters((prev) => ({ ...prev, [key]: value }))
      setFeedPage(1)
    },
    []
  )

  const feedItems = filteredFeedRaw?.items ?? []
  const totalPages = filteredFeedRaw?.pages ?? 1

  return (
    <div
      style={{
        background: '#fbfbfd',
        minHeight: '100vh',
        fontFamily: '-apple-system, system-ui, sans-serif',
        color: '#1d1d1f',
      }}
    >
      <AppHeader />

      <main
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '24px 20px 80px',
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: '#1d1d1f',
              letterSpacing: '-0.02em',
            }}
          >
            Medios &amp; Narrativa
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#6e6e73' }}>
            Ecosistema mediático · Sesgo político · Narrativas activas
          </p>
        </div>

        {/* KPI Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <KpiCard
            label="Artículos totales"
            value={kpisRaw?.articulos_totales ?? '…'}
          />
          <KpiCard
            label="Fuentes activas"
            value={kpisRaw?.fuentes_activas ?? '…'}
          />
          <KpiCard
            label="Narrativas activas"
            value={kpisRaw?.narrativas_detectadas ?? '…'}
          />
          <KpiCard
            label="Artículos internacionales"
            value={kpisRaw?.articulos_internacionales ?? '…'}
          />
        </div>

        {/* Feed + Bias spectrum (3fr / 2fr) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Feed section */}
          <section>
            <h2
              style={{
                margin: '0 0 12px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#3a3a3d',
              }}
            >
              Feed de Noticias
            </h2>

            {/* Filters */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <FilterSelect
                value={feedFilters.categoria}
                onChange={handleFilterChange('categoria')}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  { value: 'generalista', label: 'Generalista' },
                  { value: 'politica', label: 'Política' },
                  { value: 'economia', label: 'Economía' },
                  { value: 'justicia', label: 'Justicia' },
                  { value: 'vivienda', label: 'Vivienda' },
                  { value: 'sanidad', label: 'Sanidad' },
                  { value: 'inmigracion', label: 'Inmigración' },
                ]}
              />
              <FilterSelect
                value={feedFilters.sesgo}
                onChange={handleFilterChange('sesgo')}
                options={[
                  { value: '', label: 'Todos los sesgos' },
                  { value: 'izquierda', label: 'Izquierda' },
                  { value: 'centroizquierda', label: 'Centroizquierda' },
                  { value: 'centro', label: 'Centro' },
                  { value: 'centroderecha', label: 'Centroderecha' },
                  { value: 'derecha', label: 'Derecha' },
                ]}
              />
              <FilterSelect
                value={feedFilters.partido}
                onChange={handleFilterChange('partido')}
                options={[
                  { value: '', label: 'Todos los partidos' },
                  { value: 'PP', label: 'PP' },
                  { value: 'PSOE', label: 'PSOE' },
                  { value: 'VOX', label: 'VOX' },
                  { value: 'Sumar', label: 'Sumar' },
                  { value: 'ERC', label: 'ERC' },
                  { value: 'PNV', label: 'PNV' },
                  { value: 'Junts', label: 'Junts' },
                ]}
              />
              <FilterSelect
                value={feedFilters.scope}
                onChange={handleFilterChange('scope')}
                options={[
                  { value: '', label: 'Ámbito: todos' },
                  { value: 'es', label: 'Nacional' },
                  { value: 'intl', label: 'Internacional' },
                ]}
              />
            </div>

            {/* Feed list */}
            {loadingFilteredFeed ? (
              <FeedSkeleton />
            ) : feedItems.length === 0 ? (
              <div
                style={{
                  padding: '32px 0',
                  textAlign: 'center',
                  color: '#6e6e73',
                  fontSize: 13,
                }}
              >
                No hay artículos con los filtros seleccionados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feedItems.map((item, idx) => (
                  <FeedItemCard
                    key={`${item.titular}-${idx}`}
                    item={item}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loadingFilteredFeed && feedItems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 16,
                  fontFamily: '-apple-system, system-ui, sans-serif',
                }}
              >
                <button
                  disabled={feedPage <= 1}
                  onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid #e8e8ed',
                    background: feedPage <= 1 ? '#f5f5f7' : '#ffffff',
                    color: feedPage <= 1 ? '#aeaeb2' : '#1d1d1f',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: feedPage <= 1 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ← Anterior
                </button>
                <span
                  style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}
                >
                  página {feedPage} de {totalPages}
                </span>
                <button
                  disabled={feedPage >= totalPages}
                  onClick={() =>
                    setFeedPage((p) => Math.min(totalPages, p + 1))
                  }
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid #e8e8ed',
                    background:
                      feedPage >= totalPages ? '#f5f5f7' : '#ffffff',
                    color:
                      feedPage >= totalPages ? '#aeaeb2' : '#1d1d1f',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor:
                      feedPage >= totalPages ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </section>

          {/* Bias spectrum */}
          <section>
            <BiasSpectrum medios={sesgoRaw?.medios ?? []} />
          </section>
        </div>

        {/* Sentiment chart + Narrative panel (1fr / 1fr) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            marginBottom: 24,
          }}
        >
          <SentimentHeatmap
            series={sentiRaw?.series ?? []}
            entidades={sentiRaw?.entidades ?? []}
          />
          <div
            style={{
              background: '#ffffff',
              borderRadius: 22,
              padding: 20,
              boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e8e8ed',
            }}
          >
            <NarrativePanel clusters={narrativasRaw?.clusters ?? []} />
          </div>
        </div>

        {/* Global narrative map */}
        <section>
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#3a3a3d',
            }}
          >
            Mapa Narrativo Global
          </h2>
          <NarrativeMap
            paises={mapaRaw?.paises ?? []}
            ccaas={ccaasRaw?.ccaas ?? []}
          />
        </section>
      </main>
    </div>
  )
}
