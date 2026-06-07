'use client'
/**
 * <FinPipelineOportunidades /> · Tercer Sector cockpit · vista Financiación
 *
 * Panel de PIPELINE de oportunidades de financiación HACIA el tercer sector.
 * Consume `/api/tercer-sector/oportunidades` (agregador BDNS + grants UE +
 * cooperación internacional, normalizado a `OportunidadTS` con scoring de
 * aptitud ONG como fuente única de verdad). No reimplanta el scoring: lo
 * muestra tal cual viene del endpoint.
 *
 * Tres lecturas en paralelo (3 columnas), de la MISMA muestra filtrada:
 *   1) URGENTES        — plazo más próximo (dias_restantes ≤ 15), asc.
 *   2) ALTA OPORTUNIDAD — score_label === 'alta', por score desc.
 *   3) GRANDES IMPORTES — importe_eur conocido, desc.
 *
 * Filtros rápidos (chips, combinables): cierra ≤15d · solo CCAA · solo UE ·
 * cooperación internacional · importe>100k · apta ONG alta.
 *
 * Principio Politeia (CLAUDE.md): NO inventar importes (null → "—"), NO inventar
 * aptitud (score 'incierta' se respeta). Degradación honesta: muestra
 * `fuentes_error` del endpoint sin esconderla; columnas vacías → mensaje claro.
 * Cero emojis · Unicode geométrico.
 */
import { useEffect, useMemo, useState } from 'react'
import { ACCENT, fmtEur, fmtFecha } from './FinShared'

// ── Shape consumido (eco del contrato del endpoint, plano · sin import server) ─

type ScoreLabel = 'alta' | 'media' | 'baja' | 'incierta'
type Riesgo = 'bajo' | 'medio' | 'alto' | 'incierto'

interface OportunidadTS {
  id: string
  tipo: string
  titulo: string
  organismo: string
  fuente: string
  fuente_url: string
  url: string
  pais: string
  region?: string | null
  ccaa: string | null
  fecha_publicacion?: string | null
  fecha_limite: string | null
  dias_restantes: number | null
  importe_eur: number | null
  moneda: string
  sector_ts: string | null
  cpv?: string | null
  dac_sector?: string | null
  beneficiarios_objetivo?: string[]
  requisitos_resumen?: string | null
  documentos?: { nombre: string; url: string; tipo: string; formato: string }[]
  score_ong: number
  score_label: ScoreLabel
  razones_score: string[]
  riesgo: Riesgo
}

interface OportunidadesData {
  oportunidades: OportunidadTS[]
  total: number
  page: number
  page_size: number
  por_tipo: Record<string, number>
  por_fuente: Record<string, number>
  fuentes_ok: string[]
  fuentes_error: { fuente: string; error: string }[]
}

interface OportunidadesEnvelope {
  ok: boolean
  data: OportunidadesData | null
  fetched_at?: string
  source_url?: string
}

// El endpoint ya ordena (score↓, dias↑, importe↓) y aplica scoreMin server-side.
const ENDPOINT =
  '/api/tercer-sector/oportunidades?tipo=subvencion,grant_ue,cooperacion_internacional&pageSize=30&scoreMin=50'

// ── Paleta del score ONG (consistente con el semáforo del cockpit) ────────────

function scoreColor(label: ScoreLabel): { fg: string; bg: string; bd: string } {
  switch (label) {
    case 'alta':
      return { fg: '#15803D', bg: '#F0FDF4', bd: '#BBF7D0' }
    case 'media':
      return { fg: '#B45309', bg: '#FFFBEB', bd: '#FDE68A' }
    case 'baja':
      return { fg: '#9CA3AF', bg: '#F4F4F5', bd: '#E4E4E7' }
    default: // incierta
      return { fg: '#6B7280', bg: '#F8FAFC', bd: '#E2E8F0' }
  }
}

function scoreLabelText(label: ScoreLabel): string {
  if (label === 'alta') return 'Apta ONG · alta'
  if (label === 'media') return 'Apta ONG · media'
  if (label === 'baja') return 'Apta ONG · baja'
  return 'Aptitud incierta'
}

const TIPO_LABEL: Record<string, string> = {
  subvencion: 'Subvención',
  licitacion: 'Licitación',
  grant_ue: 'Grant UE',
  cooperacion_internacional: 'Cooperación internacional',
  convenio: 'Convenio',
  premio: 'Premio',
  otro: 'Otro',
}

/** Badge de plazo honesto: "cierra en N d" / "último día" / "vencida" / "sin plazo". */
function plazoText(dias: number | null): { text: string; urgente: boolean; vencida: boolean } {
  if (dias == null) return { text: 'sin plazo', urgente: false, vencida: false }
  if (dias < 0) return { text: 'vencida', urgente: false, vencida: true }
  if (dias === 0) return { text: 'último día', urgente: true, vencida: false }
  return { text: `cierra en ${dias} d`, urgente: dias <= 15, vencida: false }
}

// ── Filtros rápidos (chips combinables) ───────────────────────────────────────

type FiltroId = 'cierra15' | 'soloCcaa' | 'soloUe' | 'coopInt' | 'importe100k' | 'aptaAlta'

const FILTROS: { id: FiltroId; label: string }[] = [
  { id: 'cierra15', label: 'Cierra ≤15d' },
  { id: 'soloCcaa', label: 'Solo CCAA' },
  { id: 'soloUe', label: 'Solo UE' },
  { id: 'coopInt', label: 'Cooperación internacional' },
  { id: 'importe100k', label: 'Importe>100k' },
  { id: 'aptaAlta', label: 'Apta ONG alta' },
]

function pasaFiltro(o: OportunidadTS, activos: Set<FiltroId>): boolean {
  if (activos.has('cierra15') && !(o.dias_restantes != null && o.dias_restantes >= 0 && o.dias_restantes <= 15))
    return false
  if (activos.has('soloCcaa') && !o.ccaa) return false
  if (activos.has('soloUe') && o.tipo !== 'grant_ue') return false
  if (activos.has('coopInt') && o.tipo !== 'cooperacion_internacional') return false
  if (activos.has('importe100k') && !(o.importe_eur != null && o.importe_eur > 100_000)) return false
  if (activos.has('aptaAlta') && o.score_label !== 'alta') return false
  return true
}

// ── Tarjeta de oportunidad ─────────────────────────────────────────────────────

function OportunidadCard({ o }: { o: OportunidadTS }) {
  const sc = scoreColor(o.score_label)
  const plazo = plazoText(o.dias_restantes)
  const razones = (o.razones_score ?? []).slice(0, 3)
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 10,
        padding: '11px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Cabecera: tipo + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#475569',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 999,
            padding: '1px 7px',
          }}
        >
          {TIPO_LABEL[o.tipo] ?? o.tipo}
        </span>
        <span
          title={o.razones_score?.length ? o.razones_score.join(' · ') : undefined}
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            color: sc.fg,
            background: sc.bg,
            border: `1px solid ${sc.bd}`,
            borderRadius: 999,
            padding: '1px 8px',
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {scoreLabelText(o.score_label)} · {o.score_ong}
        </span>
      </div>

      {/* Título */}
      <a
        href={o.url || o.fuente_url}
        target="_blank"
        rel="noreferrer"
        title={o.titulo}
        style={{
          fontSize: 12.5,
          fontWeight: 650,
          color: '#1d1d1f',
          textDecoration: 'none',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {o.titulo || '(sin título)'}
      </a>

      {/* Organismo · fuente */}
      <div style={{ fontSize: 10, color: '#86868b', lineHeight: 1.4 }}>
        {o.organismo || '—'}
        {o.ccaa ? ` · ${o.ccaa}` : o.pais ? ` · ${o.pais}` : ''}
        <span style={{ color: '#B0B0B5' }}> · {o.fuente}</span>
      </div>

      {/* Importe + plazo */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
          {fmtEur(o.importe_eur)}
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: plazo.urgente ? '#B91C1C' : plazo.vencida ? '#9CA3AF' : '#475569',
            background: plazo.urgente ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${plazo.urgente ? '#FECACA' : '#E2E8F0'}`,
            borderRadius: 999,
            padding: '1px 8px',
            whiteSpace: 'nowrap',
          }}
          title={o.fecha_limite ? `Plazo: ${fmtFecha(o.fecha_limite)}` : 'Sin plazo informado'}
        >
          {plazo.text}
        </span>
      </div>

      {/* Razones de score (chips) */}
      {razones.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {razones.map((r, i) => (
            <span
              key={i}
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                color: '#64748B',
                background: '#F8FAFC',
                border: '1px solid #EEF2F6',
                borderRadius: 6,
                padding: '1px 6px',
                lineHeight: 1.4,
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Ver fuente */}
      <a
        href={o.fuente_url || o.url}
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: 10.5,
          color: ACCENT,
          fontWeight: 700,
          textDecoration: 'none',
          marginTop: 2,
          alignSelf: 'flex-start',
        }}
      >
        Ver fuente ↗
      </a>
    </div>
  )
}

// ── Columna ─────────────────────────────────────────────────────────────────

function Columna({
  titulo,
  hint,
  accent,
  items,
  emptyMsg,
  limit = 8,
}: {
  titulo: string
  hint: string
  accent: string
  items: OportunidadTS[]
  emptyMsg: string
  limit?: number
}) {
  const rows = items.slice(0, limit)
  return (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: 2, background: accent, display: 'inline-block' }}
        />
        <p style={{ fontSize: 11, letterSpacing: 0.6, color: '#1d1d1f', fontWeight: 800, margin: 0 }}>{titulo}</p>
        <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto', fontWeight: 700 }}>{items.length}</span>
      </div>
      <p style={{ fontSize: 9.5, color: '#9CA3AF', margin: '0 0 8px', lineHeight: 1.4 }}>{hint}</p>
      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            background: '#FAFAFB',
            border: '1px dashed #E4E4E7',
            borderRadius: 10,
            padding: '16px 12px',
            textAlign: 'center',
          }}
        >
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <OportunidadCard key={o.id} o={o} />
          ))}
          {items.length > rows.length && (
            <div style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', paddingTop: 2 }}>
              +{items.length - rows.length} más en esta categoría
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function FinPipelineOportunidades() {
  const [data, setData] = useState<OportunidadesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activos, setActivos] = useState<Set<FiltroId>>(new Set())

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    fetch(ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: OportunidadesEnvelope) => {
        if (!alive) return
        if (j && j.data && Array.isArray(j.data.oportunidades)) {
          setData(j.data)
        } else {
          setError(true)
        }
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const toggleFiltro = (id: FiltroId) =>
    setActivos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const all = data?.oportunidades ?? []
  const fuentesError = data?.fuentes_error ?? []

  // Muestra filtrada (chips combinables) — base de las 3 columnas.
  const filtradas = useMemo(() => all.filter((o) => pasaFiltro(o, activos)), [all, activos])

  // Columna 1 · Urgentes: plazo ≤15d (no vencidas), asc por días.
  const urgentes = useMemo(
    () =>
      filtradas
        .filter((o) => o.dias_restantes != null && o.dias_restantes >= 0 && o.dias_restantes <= 15)
        .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0)),
    [filtradas],
  )

  // Columna 2 · Alta oportunidad: score_label 'alta', por score desc.
  const altaOportunidad = useMemo(
    () => filtradas.filter((o) => o.score_label === 'alta').sort((a, b) => b.score_ong - a.score_ong),
    [filtradas],
  )

  // Columna 3 · Grandes importes: con importe conocido, desc.
  const grandesImportes = useMemo(
    () =>
      filtradas
        .filter((o) => o.importe_eur != null && o.importe_eur > 0)
        .sort((a, b) => (b.importe_eur ?? 0) - (a.importe_eur ?? 0)),
    [filtradas],
  )

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      {/* Cabecera del panel */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.01em' }}>
          Pipeline de oportunidades
        </h3>
        <span style={{ fontSize: 11, color: '#86868b' }}>
          Subvenciones · grants UE · cooperación · aptas para tercer sector (score ≥ 50)
        </span>
        {!loading && !error && (
          <span style={{ fontSize: 10.5, color: '#94A3B8', marginLeft: 'auto', fontWeight: 700 }}>
            {filtradas.length}
            {activos.size > 0 ? ` / ${all.length}` : ''} oportunidades
          </span>
        )}
      </div>

      {/* Degradación honesta por fuente */}
      {fuentesError.length > 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 10,
            padding: '8px 12px',
            margin: '10px 0',
          }}
        >
          <span aria-hidden="true" style={{ color: '#B45309', fontWeight: 800, fontSize: 12 }}>
            !
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#92400E' }}>Fuentes degradadas:</span>
          {fuentesError.map((e) => (
            <span
              key={e.fuente}
              title={e.error}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#92400E',
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: 999,
                padding: '1px 8px',
              }}
            >
              {e.fuente}
            </span>
          ))}
        </div>
      )}

      {/* Filtros rápidos */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 14px' }}>
        {FILTROS.map((f) => {
          const on = activos.has(f.id)
          return (
            <button
              key={f.id}
              onClick={() => toggleFiltro(f.id)}
              aria-pressed={on}
              style={{
                border: '1px solid',
                borderColor: on ? ACCENT : '#ECECEF',
                background: on ? ACCENT : '#fff',
                color: on ? '#fff' : '#475569',
                borderRadius: 999,
                padding: '4px 11px',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {on ? '◉ ' : '◯ '}
              {f.label}
            </button>
          )
        })}
        {activos.size > 0 && (
          <button
            onClick={() => setActivos(new Set())}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#9CA3AF',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            limpiar
          </button>
        )}
      </div>

      {/* Estados */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {[0, 1, 2].map((c) => (
            <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 116, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
              ))}
            </div>
          ))}
        </div>
      ) : error && !data ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '14px 16px',
            color: '#991B1B',
            fontSize: 12,
          }}
        >
          No se pudo cargar el pipeline de oportunidades ahora mismo. El agregador (BDNS · SEDIA ·
          cooperación) no respondió. Reintenta con ↻ Actualizar.
        </div>
      ) : all.length === 0 ? (
        <div style={{ fontSize: 12, color: '#9CA3AF', padding: '14px 0' }}>
          No hay oportunidades aptas (score ≥ 50) en la muestra reciente del agregador.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
          <Columna
            titulo="URGENTES"
            hint="Plazo a 15 días o menos · ordenadas por cierre más próximo"
            accent="#DC2626"
            items={urgentes}
            emptyMsg={
              activos.size > 0
                ? 'Sin urgentes con los filtros activos.'
                : 'Sin convocatorias cerrando en 15 días en esta muestra.'
            }
          />
          <Columna
            titulo="ALTA OPORTUNIDAD"
            hint="Aptitud ONG alta según scoring · ordenadas por puntuación"
            accent={ACCENT}
            items={altaOportunidad}
            emptyMsg={
              activos.size > 0
                ? 'Sin oportunidades de aptitud alta con los filtros activos.'
                : 'Ninguna oportunidad alcanza aptitud alta en esta muestra.'
            }
          />
          <Columna
            titulo="GRANDES IMPORTES"
            hint="Con importe informado · ordenadas de mayor a menor"
            accent="#7C3AED"
            items={grandesImportes}
            emptyMsg={
              activos.size > 0
                ? 'Ninguna con importe conocido y los filtros activos.'
                : 'Ninguna oportunidad declara importe en esta muestra.'
            }
          />
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        Agregador de oportunidades · BDNS (subvenciones) + SEDIA (grants UE) + cooperación
        internacional. La aptitud ONG y sus razones provienen del scoring del cockpit (fuente única);
        las tres columnas son lecturas distintas de la misma muestra filtrada. Importes no informados
        por la fuente se muestran como «—»; no se inventan.
      </p>
    </div>
  )
}

export default FinPipelineOportunidades
