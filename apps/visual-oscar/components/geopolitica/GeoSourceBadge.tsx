/**
 * `<GeoSourceBadge />` · Sprint G13 FASE 9
 *
 * Etiqueta visual obligatoria para cualquier tarjeta geopolítica. Refleja de
 * forma instantánea de DÓNDE viene el dato: API en vivo, RSS oficial, RSS de
 * medios, baseline curado, derivado, IA, fallback o mock.
 *
 * Usar en: GeoTermometro, GeoDataHealth, GeoEventStream, GeoConvergenceAlerts,
 * GeoSpainWatchlist, GeoThemeClusters, GeoTvBroadcast, GeoCrisisGroupFeed,
 * GeoIswBriefings, GeoSpainOfficial, cards de riesgo país.
 *
 * Decisión de diseño: badge sobrio (no emoji, no color saturado). El color
 * codifica fiabilidad relativa, no juicio normativo:
 *   - verde: API en vivo o RSS oficial (alta fiabilidad)
 *   - azul: think-tank / RSS oficial expertos
 *   - violeta: catálogo curado Politeia (no live pero auditado)
 *   - ámbar: derivado / hybrid / fallback (atención)
 *   - rojo: mock (no usar)
 *   - gris: IA / cluster
 *
 * Sin dependencias. Estilo inline para no requerir Tailwind/CSS modules.
 */
import type { GeoSourceMode, GeoEndpointMode, GeoLayer } from '@/lib/geopolitica/geo-methodology'
import { SOURCE_MODE_LABEL, LAYER_LABEL } from '@/lib/geopolitica/geo-methodology'

interface BadgeColors {
  bg: string
  fg: string
  border: string
}

const BADGE_COLORS: Record<GeoEndpointMode, BadgeColors> = {
  live_api:          { bg: '#dcfce7', fg: '#166534', border: '#86efac' }, // verde
  rss_official:      { bg: '#dbeafe', fg: '#1e40af', border: '#93c5fd' }, // azul
  rss_media:         { bg: '#e0e7ff', fg: '#3730a3', border: '#a5b4fc' }, // índigo
  derived_from_news: { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' }, // ámbar
  curated_baseline:  { bg: '#f3e8ff', fg: '#6b21a8', border: '#d8b4fe' }, // violeta
  analytical_model:  { bg: '#ede9fe', fg: '#5b21b6', border: '#c4b5fd' }, // violeta claro
  llm_cluster:       { bg: '#fae8ff', fg: '#86198f', border: '#f0abfc' }, // fucsia · IA
  hybrid:            { bg: '#fef3c7', fg: '#854d0e', border: '#fde68a' }, // ámbar oscuro
  fallback:          { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' }, // rojo claro
  mock:              { bg: '#fecaca', fg: '#7f1d1d', border: '#f87171' }, // rojo
}

const HYBRID_LABEL = 'Híbrido'

export interface GeoSourceBadgeProps {
  /** modo de fuente · normalmente `_geo_meta.source_mode` del endpoint */
  mode: GeoEndpointMode
  /** capa opcional · si se provee añade segundo segmento al badge */
  layer?: GeoLayer
  /** 0..1 · si se provee añade tooltip con la confianza */
  confidence?: number
  /** texto adicional tras el label (ej. "3 fuentes") */
  detail?: string
  /** versión compacta sin layer ni confidence */
  compact?: boolean
  /** evento click opcional para abrir GeoAuditDrawer */
  onClick?: () => void
}

export function GeoSourceBadge({
  mode, layer, confidence, detail, compact, onClick,
}: GeoSourceBadgeProps) {
  const colors = BADGE_COLORS[mode] || BADGE_COLORS.mock
  const label = mode === 'hybrid' ? HYBRID_LABEL : SOURCE_MODE_LABEL[mode] || mode
  const tooltip = (() => {
    const parts: string[] = [`Modo: ${label}`]
    if (layer) parts.push(`Capa: ${LAYER_LABEL[layer]}`)
    if (typeof confidence === 'number') parts.push(`Confianza: ${Math.round(confidence * 100)}%`)
    if (mode === 'mock') parts.push('⚠ DATOS SINTÉTICOS · no usar en producción')
    if (mode === 'derived_from_news') parts.push('Heurística sobre RSS · no fuente OSINT primaria')
    if (mode === 'llm_cluster') parts.push('Generado por IA · validar con fuente primaria')
    if (mode === 'curated_baseline') parts.push('Catálogo editorial Politeia · revisión manual')
    if (mode === 'hybrid') parts.push('Mezcla baseline curado + RSS · ver _geo_meta.sources_used')
    return parts.join(' · ')
  })()

  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        lineHeight: 1.4,
        verticalAlign: 'middle',
      }}
    >
      <span>◆</span>
      <span>{label}</span>
      {!compact && layer && (
        <>
          <span style={{ opacity: 0.55 }}>·</span>
          <span style={{ textTransform: 'none', fontWeight: 500 }}>{LAYER_LABEL[layer]}</span>
        </>
      )}
      {!compact && typeof confidence === 'number' && (
        <>
          <span style={{ opacity: 0.55 }}>·</span>
          <span style={{ textTransform: 'none', fontWeight: 600 }}>{Math.round(confidence * 100)}%</span>
        </>
      )}
      {detail && (
        <>
          <span style={{ opacity: 0.55 }}>·</span>
          <span style={{ textTransform: 'none', fontWeight: 500 }}>{detail}</span>
        </>
      )}
    </Tag>
  )
}

/**
 * Helper convenience · acepta el bloque `_geo_meta` completo y deriva los props.
 * Útil cuando el componente padre tiene la respuesta del endpoint a mano.
 */
export function GeoSourceBadgeFromMeta({
  meta, compact, onClick,
}: {
  meta: { source_mode: GeoEndpointMode; layer?: GeoLayer; confidence?: number; sources_used?: string[] } | null | undefined
  compact?: boolean
  onClick?: () => void
}) {
  if (!meta) {
    return (
      <span
        title="Sin metadatos · endpoint legacy sin _geo_meta"
        style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
          background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1',
          borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
          textTransform: 'uppercase', fontFamily: 'inherit', lineHeight: 1.4,
        }}
      >
        ◇ Sin meta
      </span>
    )
  }
  const detail = meta.sources_used && meta.sources_used.length > 1
    ? `${meta.sources_used.length} fuentes`
    : undefined
  return (
    <GeoSourceBadge
      mode={meta.source_mode}
      layer={meta.layer}
      confidence={meta.confidence}
      detail={detail}
      compact={compact}
      onClick={onClick}
    />
  )
}
