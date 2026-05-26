'use client'
/**
 * Sprint G14 FASE 2 · MediaBiasBadge
 *
 * Badge minimalista mostrando bias + libertad de prensa de un medio. Si la
 * URL/dominio no está en el registry MBFC, no renderiza nada (silencio
 * informativo · no inventa).
 *
 * Uso server-side preferente:
 *   <MediaBiasBadge entry={lookupMediaBias(article.url)} />
 *
 * Uso client-side (lazy fetch):
 *   <MediaBiasBadgeAsync domain="xinhuanet.com" />
 */
import { useEffect, useState } from 'react'
import {
  BIAS_LABEL_ES,
  PRESS_FREEDOM_LABEL_ES,
  FACTUAL_LABEL_ES,
  type MediaBiasEntry,
  type BiasBand,
  type PressFreedomBand,
  regimeTagFromPressFreedom,
} from '@/lib/geopolitica/media-bias-registry'

const BIAS_COLOR: Record<BiasBand, string> = {
  left: '#3b82f6',
  left_center: '#60a5fa',
  center: '#94a3b8',
  right_center: '#fb923c',
  right: '#ef4444',
  conspiracy: '#7c3aed',
  questionable: '#a855f7',
  pro_science: '#10b981',
  satire: '#eab308',
  unknown: '#cbd5e1',
}

const FREEDOM_COLOR: Record<PressFreedomBand, { bg: string; fg: string; label: string }> = {
  free: { bg: '#d1fae5', fg: '#065f46', label: 'PRENSA LIBRE' },
  mostly_free: { bg: '#ecfdf5', fg: '#047857', label: 'MAYORMENTE LIBRE' },
  partly_free: { bg: '#fef3c7', fg: '#92400e', label: 'PARCIALMENTE LIBRE' },
  not_free: { bg: '#fee2e2', fg: '#991b1b', label: 'NO LIBRE' },
  oppression: { bg: '#1f2937', fg: '#fee2e2', label: 'OPRESIÓN TOTAL' },
  unknown: { bg: '#f1f5f9', fg: '#64748b', label: 'SIN DATOS' },
}

interface BadgeProps {
  entry: MediaBiasEntry | null
  showFactual?: boolean
  showCountry?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function MediaBiasBadge({
  entry,
  showFactual = false,
  showCountry = true,
  size = 'sm',
  className = '',
}: BadgeProps) {
  if (!entry) return null
  const freedom = FREEDOM_COLOR[entry.press_freedom]
  const biasColor = BIAS_COLOR[entry.bias]
  const regime = regimeTagFromPressFreedom(entry.press_freedom)
  const fontPx = size === 'md' ? 11 : 9
  const padY = size === 'md' ? 3 : 2

  const tooltip = [
    `Fuente: ${entry.domain}`,
    `País: ${entry.country}`,
    `Bias: ${BIAS_LABEL_ES[entry.bias]}`,
    `Libertad de prensa: ${PRESS_FREEDOM_LABEL_ES[entry.press_freedom]}`,
    `Factualidad: ${FACTUAL_LABEL_ES[entry.factual_reporting]}`,
    `Tipo: ${entry.media_type}`,
    `Credibilidad MBFC: ${entry.credibility}`,
    '',
    'MBFC = heurística periodística agregada. No es auditoría independiente.',
  ].join('\n')

  return (
    <span
      title={tooltip}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: fontPx,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Freedom chip */}
      <span
        style={{
          background: freedom.bg,
          color: freedom.fg,
          padding: `${padY}px 6px`,
          borderRadius: 3,
          border: regime === 'authoritarian' ? '1px solid #991b1b' : '1px solid transparent',
        }}
      >
        {freedom.label}
      </span>
      {/* Bias dot */}
      <span
        aria-label={`Bias ${BIAS_LABEL_ES[entry.bias]}`}
        style={{
          width: 8, height: 8, borderRadius: '50%', background: biasColor,
          display: 'inline-block',
        }}
      />
      <span style={{ color: biasColor, fontWeight: 700 }}>{BIAS_LABEL_ES[entry.bias]}</span>
      {showCountry && entry.country !== 'unknown' && (
        <span style={{ color: '#64748b', fontWeight: 500, textTransform: 'capitalize' }}>· {entry.country}</span>
      )}
      {showFactual && entry.factual_reporting !== 'unknown' && (
        <span style={{ color: '#64748b', fontWeight: 500 }}>· {FACTUAL_LABEL_ES[entry.factual_reporting]}</span>
      )}
    </span>
  )
}

/**
 * Variante async para client components: fetch lazy contra el endpoint.
 * No renderiza placeholder si miss (silencio informativo).
 */
export function MediaBiasBadgeAsync({ domain, ...rest }: { domain: string } & Omit<BadgeProps, 'entry'>) {
  const [entry, setEntry] = useState<MediaBiasEntry | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/geopolitica/media-bias?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.ok ? r.json() : { result: null })
      .then((d) => { if (!cancelled) setEntry(d.result || null) })
      .catch(() => { if (!cancelled) setEntry(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [domain])
  if (loading || !entry) return null
  return <MediaBiasBadge entry={entry} {...rest} />
}
