'use client'
/**
 * <NoticiasEnergia /> · Energía · Pestaña Política (EN4)
 *
 * Componente REUTILIZABLE que muestra las NOTICIAS de energía agregadas desde
 * el catálogo RSS keyless (lib/energia/news.ts → /api/energia/noticias) en dos
 * bloques de lectura para el analista:
 *
 *   · "Hoy"        → titulares con age_hours <= 36h (data.hoy).
 *   · "Esta semana"→ titulares <= 7d que NO están ya en "hoy" (data.semana).
 *
 * Cada fila: titular enlazado (target=_blank), fuente, antigüedad relativa y un
 * chip de subtopic con color temático. Bajo ambos bloques, un mini-resumen
 * por_subtopic con conteos.
 *
 * Props:
 *   - tipo?: string → si se pasa, filtra al subtopic vía ?subtopic=tipo. Sin
 *     prop = catálogo completo sin filtro.
 *
 * Degradación honesta: estados loading / error / empty separados. Si el
 * endpoint devuelve ok:false o no hay items, se muestra un empty-state honesto;
 * nunca se inventan datos. Cero deps · todo CSS inline · cero emojis (usa
 * ● ◦ ⟶ para chips y separadores). ACCENT energía: '#16A34A'.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import type { EnergyNewsItem, EnergyNewsResult, EnergySubtopic } from '@/lib/energia/news'

const ACCENT = '#16A34A'

// Envelope estándar Politeia que devuelve /api/energia/noticias.
interface NewsEnvelope {
  ok: boolean
  data: EnergyNewsResult | null
  error: string | null
  fetched_at: string
  source_url?: string
}

// ── Metadatos de subtopic: etiqueta + color del chip ─────────────────────────
const SUBTOPIC_META: Record<EnergySubtopic, { label: string; color: string }> = {
  electrico: { label: 'Eléctrico', color: '#2563EB' },
  renovables: { label: 'Renovables', color: '#16A34A' },
  nuclear: { label: 'Nuclear', color: '#9333EA' },
  petroleo: { label: 'Petróleo', color: '#92400E' },
  gas: { label: 'Gas', color: '#0891B2' },
  hidrogeno: { label: 'Hidrógeno', color: '#0D9488' },
  politica: { label: 'Política', color: '#DC2626' },
  mercado: { label: 'Mercado', color: '#D97706' },
  general: { label: 'General', color: '#6B7280' },
}

function subtopicMeta(s: string): { label: string; color: string } {
  return SUBTOPIC_META[s as EnergySubtopic] ?? { label: s || '—', color: '#6B7280' }
}

// ── Tiempo relativo honesto desde published (o age_hours como respaldo) ──────
function relTime(item: EnergyNewsItem): string {
  let h = item.age_hours
  if ((h == null || !Number.isFinite(h)) && item.published) {
    const t = new Date(item.published).getTime()
    if (Number.isFinite(t)) h = Math.max(0, (Date.now() - t) / 3_600_000)
  }
  if (h == null || !Number.isFinite(h)) return 'sin fecha'
  if (h < 1) {
    const m = Math.max(1, Math.round(h * 60))
    return `hace ${m} min`
  }
  if (h < 24) return `hace ${Math.round(h)} h`
  const d = Math.round(h / 24)
  return d <= 1 ? 'hace 1 día' : `hace ${d} días`
}

// Fecha corta (DD MMM) para el bloque semanal, en es-ES; estable en SSR/CSR.
function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso)
  if (!Number.isFinite(t.getTime())) return '—'
  return t.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// ── Chip de subtopic ─────────────────────────────────────────────────────────
function SubtopicChip({ subtopic }: { subtopic: string }) {
  const { label, color } = subtopicMeta(subtopic)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        color,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        borderRadius: 999,
        padding: '1.5px 7px',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 8, opacity: 0.9 }}>
        ●
      </span>
      {label}
    </span>
  )
}

// ── Fila de noticia ──────────────────────────────────────────────────────────
function NewsRow({ item, meta }: { item: EnergyNewsItem; meta: 'rel' | 'date' }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 8px',
        borderRadius: 9,
        textDecoration: 'none',
        background: hover ? '#F6FAF6' : 'transparent',
        transition: 'background 130ms ease',
      }}
    >
      <span
        aria-hidden="true"
        style={{ color: ACCENT, fontSize: 9, lineHeight: '1.55em', marginTop: 1, flexShrink: 0 }}
      >
        ◦
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.42,
            color: hover ? ACCENT : '#1d1d1f',
            transition: 'color 130ms ease',
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            flexWrap: 'wrap',
            marginTop: 4,
            fontSize: 10.5,
            color: '#86868b',
          }}
        >
          <span style={{ fontWeight: 600, color: '#6e6e73' }}>{item.source}</span>
          <span aria-hidden="true" style={{ opacity: 0.55 }}>
            ·
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {meta === 'rel' ? relTime(item) : shortDate(item.published)}
          </span>
          <SubtopicChip subtopic={item.subtopic} />
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          fontSize: 11,
          color: ACCENT,
          opacity: hover ? 1 : 0,
          transition: 'opacity 130ms ease',
          marginTop: 2,
        }}
      >
        ⟶
      </span>
    </a>
  )
}

// ── Encabezado de sub-bloque ─────────────────────────────────────────────────
function BlockHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: '#1d1d1f',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: ACCENT,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
    </div>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: '2px 0 0',
        padding: '10px 8px',
        fontSize: 11.5,
        color: '#9CA3AF',
        fontStyle: 'italic',
        lineHeight: 1.5,
      }}
    >
      {text}
    </p>
  )
}

const HOY_MAX = 8
const SEMANA_MAX = 15

interface Props {
  /** Si se pasa, filtra al subtopic indicado vía ?subtopic=tipo. */
  tipo?: string
}

export default function NoticiasEnergia({ tipo }: Props) {
  const [data, setData] = useState<EnergyNewsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const url = '/api/energia/noticias' + (tipo ? `?subtopic=${encodeURIComponent(tipo)}` : '')
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<NewsEnvelope>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (!alive) return
        if (!j || !j.ok || !j.data) {
          setData(j?.data ?? null)
          setError(j?.error || 'Las fuentes RSS no devolvieron noticias ahora mismo.')
        } else {
          setData(j.data)
        }
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las noticias de energía.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tipo])

  // Particiona: "semana" excluye los titulares ya mostrados en "hoy" (por link).
  const { hoy, semanaResto, porSubtopic, totalHoy, totalSemana } = useMemo(() => {
    const hoyItems = data?.hoy ?? []
    const semanaItems = data?.semana ?? []
    const hoyLinks = new Set(hoyItems.map((x) => x.link))
    const resto = semanaItems.filter((x) => !hoyLinks.has(x.link))
    const entries = Object.entries(data?.por_subtopic ?? {})
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
    return {
      hoy: hoyItems.slice(0, HOY_MAX),
      semanaResto: resto.slice(0, SEMANA_MAX),
      porSubtopic: entries,
      totalHoy: hoyItems.length,
      totalSemana: semanaItems.length,
    }
  }, [data])

  const tipoLabel = tipo ? subtopicMeta(tipo).label : null
  const subtitle = loading
    ? 'Cargando feeds RSS…'
    : error && !data
      ? 'Fuentes no disponibles'
      : `${totalHoy} hoy · ${totalSemana} esta semana${tipoLabel ? ` · ${tipoLabel}` : ''}`

  return (
    <Panel
      title="Noticias de energía"
      subtitle={subtitle}
      sourceUrl="https://elperiodicodelaenergia.com/"
      sourceLabel="RSS medios"
      sourceTooltip="Agregado de feeds RSS públicos de medios y organismos del sector energético (ES + UE)"
    >
      {/* Estado: cargando */}
      {loading && (
        <div style={{ padding: '14px 4px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 14,
                borderRadius: 6,
                background: '#F1F3F1',
                marginBottom: 10,
                width: `${92 - i * 9}%`,
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
        </div>
      )}

      {/* Estado: error sin ningún dato */}
      {!loading && error && !data && (
        <div
          style={{
            padding: '14px 14px',
            background: '#FFF7F6',
            border: '1px solid #F6D7D2',
            borderRadius: 10,
            fontSize: 12,
            color: '#B45309',
            lineHeight: 1.5,
          }}
        >
          <span aria-hidden="true" style={{ fontWeight: 800, marginRight: 6 }}>
            !
          </span>
          No hay noticias de energía disponibles ahora mismo. {error}
        </div>
      )}

      {/* Estado: datos (puede coexistir con un error suave de algunas fuentes) */}
      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* — Bloque HOY — */}
          <section>
            <BlockHeader title="Hoy" count={totalHoy} />
            {hoy.length > 0 ? (
              <div>
                {hoy.map((item) => (
                  <NewsRow key={`hoy-${item.link}`} item={item} meta="rel" />
                ))}
              </div>
            ) : (
              <EmptyBlock text="Sin novedades en las últimas 36 h." />
            )}
          </section>

          {/* — Bloque ESTA SEMANA — */}
          <section>
            <BlockHeader title="Esta semana" count={semanaResto.length} />
            {semanaResto.length > 0 ? (
              <div>
                {semanaResto.map((item) => (
                  <NewsRow key={`sem-${item.link}`} item={item} meta="date" />
                ))}
              </div>
            ) : (
              <EmptyBlock
                text={
                  totalSemana > 0
                    ? 'El resto de la semana ya aparece en el bloque de hoy.'
                    : 'Sin noticias en los últimos 7 días para este filtro.'
                }
              />
            )}
          </section>

          {/* — Mini-resumen por subtopic — */}
          {porSubtopic.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                paddingTop: 12,
                borderTop: '1px solid #F0F0F1',
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#9CA3AF',
                  marginRight: 2,
                  alignSelf: 'center',
                }}
              >
                Por tema
              </span>
              {porSubtopic.map(([sub, n]) => {
                const { label, color } = subtopicMeta(sub)
                return (
                  <span
                    key={sub}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#3a3a3d',
                      background: '#FAFAFA',
                      border: '1px solid #ECECEF',
                      borderRadius: 999,
                      padding: '2px 9px',
                    }}
                  >
                    <span aria-hidden="true" style={{ color, fontSize: 8 }}>
                      ●
                    </span>
                    {label}
                    <span style={{ fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                  </span>
                )
              })}
            </div>
          )}

          {/* Aviso de degradación parcial de fuentes (no bloqueante) */}
          {error && (
            <p style={{ margin: 0, fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
              Algunas fuentes RSS no respondieron en esta carga; el agregado muestra el resto.
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
