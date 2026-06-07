'use client'
/**
 * <CoopOportunidadesRelacionadas /> · Tercer Sector v3 · Cooperación (IATI) ·
 * Sprint W2 (cockpit).
 *
 * PUENTE CONTEXTUAL (no es un buscador). Cuando el analista acota la vista de
 * Cooperación por un país receptor (mapa/ranking) o por un sector DAC (barras),
 * este panel ofrece un atajo a OPORTUNIDADES (subvenciones/licitaciones/grants/
 * cooperación) relacionadas con ese país, consumiendo el agregador existente:
 *
 *   GET /api/tercer-sector/oportunidades?pais=<pais>&sector=cooperacion&pageSize=10
 *
 * Ejemplo: filtro País = Colombia → oportunidades de cooperación con Colombia.
 *
 * Comportamiento:
 *   - País activo  → botón "Ver oportunidades relacionadas". Al pulsarlo se
 *     consulta el agregador (lazy, una sola vez por país) y se pinta una lista
 *     compacta de OportunidadTS (título · organismo · tipo · plazo · score ONG ·
 *     enlace). El país viaja como `pais` (nombre legible, ej. "Colombia") y
 *     además como `q` (refuerzo de match en título/organismo).
 *   - Sin país pero con sector → mismo botón, contexto = sector DAC (el endpoint
 *     no facetea por DAC, así que el sector solo enmarca el copy y se usa como
 *     señal de texto `q`).
 *   - Sin filtro → CTA genérico que lleva a la pestaña Licitaciones (multinivel,
 *     donde vive el buscador completo con su filtro internacional/cooperación).
 *
 * Degradación honesta (CLAUDE.md): el agregador SIEMPRE responde 200; si no hay
 * resultados se muestra un mensaje claro (no se inventan oportunidades). No se
 * duplica el buscador de Licitaciones: esto es solo un puente.
 *
 * Nota sobre `sector=cooperacion`: el endpoint filtra `sector` contra
 * `sector_ts` (clave de SECTOR_LABEL), que hoy no se infiere para estas fuentes
 * (queda `null`), por lo que pasarlo como filtro estricto vaciaría la lista. Por
 * eso NO se envía `sector=cooperacion` como filtro server-side: el ángulo
 * "cooperación" se materializa client-side priorizando los tipos afines
 * (`cooperacion_internacional` y `grant_ue`) y vía el texto `q` del país/sector.
 *
 * Solo edita esta vista (sprint): reusa CoopShared y la paleta verde. Cero
 * emojis · Unicode geométrico (CLAUDE.md §0.5).
 */
import { useCallback, useEffect, useState } from 'react'
import type { TercerSectorTab } from './TercerSectorShell'
import { useUrlState } from '@/lib/useUrlState'
import type {
  OportunidadTS,
  OportunidadesResponse,
} from '@/lib/tercer-sector/oportunidades/types'
import {
  ACCENT,
  ACCENT_DARK,
  CoopEmpty,
  CoopSkeleton,
  getEnvelope,
} from './CoopShared'

// ─────────────────────────────────────────────────────────────────────────
// Etiquetas legibles por tipo de oportunidad (espejo de TipoOportunidad).
// ─────────────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  subvencion: 'Subvención',
  licitacion: 'Licitación',
  grant_ue: 'Grant UE',
  cooperacion_internacional: 'Cooperación internacional',
  convenio: 'Convenio',
  premio: 'Premio',
  otro: 'Otro',
}

/** Estilo de la pastilla de aptitud (score_label) — coherente con la paleta. */
function scoreStyle(label: OportunidadTS['score_label']): { bg: string; fg: string; bd: string } {
  switch (label) {
    case 'alta':
      return { bg: '#F0FDF4', fg: '#15803D', bd: '#BBF7D0' }
    case 'media':
      return { bg: '#FEFCE8', fg: '#A16207', bd: '#FDE68A' }
    case 'baja':
      return { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' }
    default: // incierta
      return { bg: '#F8FAFC', fg: '#64748B', bd: '#E2E8F0' }
  }
}

/** Plazo legible y honesto a partir de `dias_restantes` (nunca inventa). */
function plazoTexto(o: OportunidadTS): { texto: string; urgente: boolean } {
  const d = o.dias_restantes
  if (d == null) return { texto: 'Sin plazo informado', urgente: false }
  if (d < 0) return { texto: 'Plazo vencido', urgente: false }
  if (d === 0) return { texto: 'Cierra hoy', urgente: true }
  if (d === 1) return { texto: 'Cierra mañana', urgente: true }
  return { texto: `${d} días restantes`, urgente: d <= 10 }
}

interface Props {
  /** Nombre legible del país receptor activo (ej. "Colombia"), o null. */
  pais?: string | null
  /** Nombre legible del sector DAC activo (ej. "Salud básica"), o null. */
  sector?: string | null
}

export function CoopOportunidadesRelacionadas({ pais = null, sector = null }: Props) {
  // Navegación a la pestaña Licitaciones (mismo searchParam `?ts=` del shell).
  const [, setTab] = useUrlState<TercerSectorTab>('ts', 'global')

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OportunidadTS[] | null>(null)
  const [total, setTotal] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  // Clave del contexto que se consultó (para no recargar si no cambió).
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const ctxKey = `${pais ?? ''}|${sector ?? ''}`
  const tieneContexto = Boolean(pais || sector)

  // Si cambia el contexto (país/sector) tras haber abierto, se colapsa para que
  // el analista decida volver a consultar (evita listas que no casan con el chip).
  useEffect(() => {
    if (loadedKey && loadedKey !== ctxKey) {
      setOpen(false)
      setItems(null)
      setError(null)
    }
  }, [ctxKey, loadedKey])

  const consultar = useCallback(async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    // Texto de refuerzo: el endpoint sí filtra `q` contra título+organismo.
    const q = (pais || sector || '').trim()
    const sp = new URLSearchParams()
    if (pais) sp.set('pais', pais)
    if (q) sp.set('q', q)
    sp.set('pageSize', '10')
    const env = await getEnvelope<OportunidadesResponse>(
      `/api/tercer-sector/oportunidades?${sp.toString()}`,
    )
    if (env.ok && env.data) {
      // Ángulo "cooperación": priorizar tipos afines (cooperación / grant UE),
      // sin descartar el resto (degradación honesta: mostramos lo que hay).
      const afin = (t: string) => t === 'cooperacion_internacional' || t === 'grant_ue'
      const ordenadas = [...env.data.oportunidades].sort((a, b) => {
        const fa = afin(a.tipo) ? 0 : 1
        const fb = afin(b.tipo) ? 0 : 1
        if (fa !== fb) return fa - fb
        return b.score_ong - a.score_ong
      })
      setItems(ordenadas)
      setTotal(env.data.total ?? ordenadas.length)
    } else {
      setItems([])
      setTotal(0)
      setError(env.error ?? 'No se pudo consultar el agregador de oportunidades.')
    }
    setLoadedKey(ctxKey)
    setLoading(false)
  }, [pais, sector, ctxKey])

  // ── Sin contexto: CTA genérico hacia Licitaciones ───────────────────────
  if (!tieneContexto) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC',
          border: '1px dashed #E2E8F0',
          borderRadius: 12,
          padding: '14px 16px',
        }}
      >
        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, maxWidth: 560 }}>
          <strong style={{ fontWeight: 700, color: '#334155' }}>¿Buscas financiación para cooperación?</strong>{' '}
          Selecciona un país receptor en el mapa o un sector CAD/DAC para ver oportunidades
          relacionadas, o abre el buscador multinivel de licitaciones y grants.
        </div>
        <button
          type="button"
          onClick={() => setTab('licitaciones')}
          style={primaryBtnStyle}
        >
          Ir a Licitaciones <span aria-hidden="true">⟶</span>
        </button>
      </div>
    )
  }

  // ── Con contexto país/sector ────────────────────────────────────────────
  const contextoLabel = pais
    ? `cooperación con ${pais}`
    : `cooperación · sector ${sector}`

  return (
    <div>
      {/* Cabecera-puente + botón de consulta. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: open ? 12 : 0,
        }}
      >
        <div style={{ fontSize: 12.5, color: ACCENT_DARK, lineHeight: 1.5, maxWidth: 560 }}>
          <strong style={{ fontWeight: 700 }}>Oportunidades relacionadas</strong> ·{' '}
          subvenciones, licitaciones y grants de {contextoLabel}. Atajo al agregador del cockpit
          (no sustituye al buscador completo de Licitaciones).
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!open && (
            <button type="button" onClick={consultar} style={primaryBtnStyle}>
              Ver oportunidades relacionadas
            </button>
          )}
          {open && (
            <button
              type="button"
              onClick={consultar}
              disabled={loading}
              style={{ ...secondaryBtnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Consultando…' : 'Actualizar'}
            </button>
          )}
        </div>
      </div>

      {/* Resultados (lazy). */}
      {open && (
        <div>
          {loading ? (
            <CoopSkeleton height={180} />
          ) : error ? (
            <CoopEmpty>
              No se pudieron cargar las oportunidades ahora mismo.
              <br />
              <span style={{ fontSize: 11.5, color: '#B91C1C' }}>{error}</span>
            </CoopEmpty>
          ) : !items || items.length === 0 ? (
            <CoopEmpty>
              Sin oportunidades que casen con <strong>{contextoLabel}</strong> en las fuentes
              consultadas ahora mismo.
              <br />
              <button
                type="button"
                onClick={() => setTab('licitaciones')}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: ACCENT_DARK,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Abrir buscador multinivel de licitaciones
              </button>
            </CoopEmpty>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((o) => (
                  <OportunidadRow key={o.id} o={o} />
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  Mostrando {items.length} de {total} · agregador BDNS + licitaciones (PLACE/TED/SEDIA/WorldBank)
                </span>
                <button
                  type="button"
                  onClick={() => setTab('licitaciones')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: ACCENT_DARK,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Ver todas en Licitaciones <span aria-hidden="true">⟶</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Fila compacta de una oportunidad
// ─────────────────────────────────────────────────────────────────────────
function OportunidadRow({ o }: { o: OportunidadTS }) {
  const sc = scoreStyle(o.score_label)
  const plazo = plazoTexto(o)
  const tipo = TIPO_LABEL[o.tipo] ?? o.tipo
  const href = o.url || o.fuente_url || null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 12,
        alignItems: 'center',
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: ACCENT_DARK,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 5,
              padding: '1px 6px',
            }}
          >
            {tipo}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: plazo.urgente ? '#B91C1C' : '#64748B',
            }}
          >
            {plazo.texto}
          </span>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={o.titulo}
            style={{
              display: 'block',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1d1d1f',
              textDecoration: 'none',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {o.titulo}
          </a>
        ) : (
          <span
            title={o.titulo}
            style={{
              display: 'block',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1d1d1f',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {o.titulo}
          </span>
        )}
        <div
          style={{
            fontSize: 11,
            color: '#86868b',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {o.organismo}
          {o.pais && o.pais !== '—' ? ` · ${o.pais}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        <span
          title={`Aptitud ONG: ${o.score_label} · score ${o.score_ong}/100`}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: sc.fg,
            background: sc.bg,
            border: `1px solid ${sc.bd}`,
            borderRadius: 999,
            padding: '3px 9px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{o.score_ong}</span>
          <span style={{ fontSize: 9.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {o.score_label}
          </span>
        </span>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${o.titulo}`}
            title="Abrir ficha de la oportunidad"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: ACCENT,
              textDecoration: 'none',
              padding: '2px 4px',
            }}
          >
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Estilos de botón (locales, coherentes con la paleta verde del shell)
// ─────────────────────────────────────────────────────────────────────────
const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: ACCENT,
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  padding: '9px 14px',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: '#fff',
  color: ACCENT_DARK,
  border: `1px solid ${ACCENT}`,
  borderRadius: 9,
  padding: '8px 13px',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

export default CoopOportunidadesRelacionadas
