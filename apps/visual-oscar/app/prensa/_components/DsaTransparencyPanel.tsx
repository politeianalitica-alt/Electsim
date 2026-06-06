'use client'
/**
 * `<DsaTransparencyPanel />` · Sprint Medios · DSA Transparency Database
 *
 * Panel "Transparencia de plataformas · moderación de contenido (DSA)" para la
 * tab "Observatorio de Información" de /prensa. Muestra el volumen de moderación
 * de contenido que las plataformas online reportan a la Comisión Europea bajo el
 * Digital Services Act (statements of reasons), con foco en lo políticamente
 * relevante: el equivalente DSA a desinformación electoral, discurso de odio y
 * seguridad pública, y cuánto afecta a España.
 *
 *   - KPIs: total UE del último día + total histórico acumulado + nº de
 *     plataformas reportando (y cuántas son VLOP) + statements con alcance ES.
 *   - Top plataformas por volumen de moderación (barras horizontales).
 *   - Desglose por categoría DSA (las categorías de interés político resaltadas).
 *
 * Data source: `/api/medios/dsa-transparency` (overview + platforms + categories).
 * Degradación honesta: si falta DSA_TRANSPARENCY_API_KEY o la API falla, muestra
 * un empty-state explicativo sin romper la tab. Cero emojis (Unicode).
 *
 * Complementa el agregado de fact-checkers ES de esta misma tab: aquélla mide
 * qué bulos circulan; ésta mide cómo responden las plataformas (cuánto retiran/
 * restringen y por qué motivo declarado).
 */
import { useEffect, useState } from 'react'

const ACCENT = '#B91C1C'

// ─── Tipos del endpoint ─────────────────────────────────────────────────────
interface OverviewData {
  daily_total: number | null
  daily_date: string
  total_historic: number | null
  n_platforms: number | null
  n_vlops: number | null
  spain_total: number | null
}
interface PlatformVolume {
  platform_id: number | null
  platform_name: string
  total: number
}
interface CategoryVolume {
  category: string
  label: string
  total: number
  political: boolean
}

interface PanelState {
  overview: OverviewData | null
  overviewErr: string | null
  platforms: PlatformVolume[] | null
  platformsErr: string | null
  categories: CategoryVolume[] | null
  categoriesErr: string | null
  loading: boolean
  fetchedAt: string | null
}

// ─── Formato ────────────────────────────────────────────────────────────────
function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES')
}

/** Compacta números grandes (2.1B, 23,2M, 8.4k). */
function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('es-ES', { maximumFractionDigits: 2 })} B`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('es-ES', { maximumFractionDigits: 1 })} k`
  return n.toLocaleString('es-ES')
}

export function DsaTransparencyPanel() {
  const [s, setS] = useState<PanelState>({
    overview: null, overviewErr: null,
    platforms: null, platformsErr: null,
    categories: null, categoriesErr: null,
    loading: true, fetchedAt: null,
  })

  useEffect(() => {
    let mounted = true
    const base = '/api/medios/dsa-transparency'

    const loadOne = async (view: string) => {
      try {
        const r = await fetch(`${base}?view=${view}`, { cache: 'no-store' })
        const d = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }))
        return d
      } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e) }
      }
    }

    ;(async () => {
      const [ov, pl, cat] = await Promise.all([
        loadOne('overview'),
        loadOne('platforms'),
        loadOne('categories'),
      ])
      if (!mounted) return
      setS({
        overview: ov?.ok ? (ov.data as OverviewData) : null,
        overviewErr: ov?.ok ? null : (ov?.error ?? 'error'),
        platforms: pl?.ok ? (pl.data as PlatformVolume[]) : null,
        platformsErr: pl?.ok ? null : (pl?.error ?? 'error'),
        categories: cat?.ok ? (cat.data as CategoryVolume[]) : null,
        categoriesErr: cat?.ok ? null : (cat?.error ?? 'error'),
        loading: false,
        fetchedAt: ov?.fetched_at ?? pl?.fetched_at ?? cat?.fetched_at ?? null,
      })
    })()

    return () => { mounted = false }
  }, [])

  // Todo falló → empty-state honesto (la tab sigue funcionando).
  const allFailed = !s.loading && !s.overview && !s.platforms && !s.categories
  const keyMissing =
    /no_key|DSA_TRANSPARENCY_API_KEY/.test(s.overviewErr ?? '') ||
    /no_key|DSA_TRANSPARENCY_API_KEY/.test(s.platformsErr ?? '')

  return (
    <section style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: 14, borderLeft: `4px solid ${ACCENT}`,
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: ACCENT, textTransform: 'uppercase' }}>
          ⬡ Transparencia de plataformas · moderación de contenido (DSA)
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Cuánto contenido <strong>retiran o restringen</strong> las plataformas online y
          {' '}por qué motivo declarado, según los <em>statements of reasons</em> del
          {' '}Digital Services Act. Foco político: <strong>discurso cívico y elecciones</strong>
          {' '}(proxy DSA de desinformación), <strong>discurso ilegal/odio</strong> y
          {' '}<strong>seguridad pública</strong> · y cuánto afecta a España.
        </p>
      </header>

      {s.loading ? (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
          Cargando transparencia de plataformas (DSA)…
        </p>
      ) : allFailed ? (
        <EmptyState keyMissing={keyMissing} error={s.overviewErr || s.platformsErr || s.categoriesErr} />
      ) : (
        <>
          {/* ── KPIs ── */}
          <KpiRow overview={s.overview} overviewErr={s.overviewErr} />

          {/* ── Top plataformas + categorías en 2 columnas ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12,
          }}>
            <PlatformsBlock platforms={s.platforms} error={s.platformsErr} date={s.overview?.daily_date} />
            <CategoriesBlock categories={s.categories} error={s.categoriesErr} />
          </div>
        </>
      )}

      {/* ── Nota de fuente ── */}
      <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
        Fuente: <strong>DSA Transparency Database · Comisión Europea</strong> (datos de
        {' '}<em>statements of reasons</em> del Digital Services Act) ·
        {' '}<code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2 }}>/api/medios/dsa-transparency</code>.
        {' '}Las plataformas auto-reportan; el motivo declarado refleja su criterio, no un veredicto externo.
      </p>
    </section>
  )
}

// ─── Empty-state honesto ────────────────────────────────────────────────────
function EmptyState({ keyMissing, error }: { keyMissing: boolean; error: string | null }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
      padding: 12,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#991b1b', fontWeight: 600 }}>
        ! Transparencia de plataformas no disponible {error ? `(${error})` : ''}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
        {keyMissing
          ? 'Falta la credencial DSA_TRANSPARENCY_API_KEY (Research API de la Comisión Europea) en el entorno. Configúrala para activar este panel.'
          : 'La Research API de la DSA no respondió. Suele recuperarse sola (dataset muy grande · posibles timeouts). El resto del Observatorio sigue activo.'}
      </p>
    </div>
  )
}

// ─── KPIs ───────────────────────────────────────────────────────────────────
function KpiRow({ overview, overviewErr }: { overview: OverviewData | null; overviewErr: string | null }) {
  if (!overview) {
    return (
      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
        KPIs no disponibles{overviewErr ? ` (${overviewErr})` : ''}.
      </p>
    )
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8,
    }}>
      <Kpi
        label={`Moderaciones · ${overview.daily_date}`}
        value={fmtCompact(overview.daily_total)}
        sub="último día UE"
        color="#0f172a"
        title={overview.daily_total != null ? `${fmtInt(overview.daily_total)} statements ese día` : undefined}
      />
      <Kpi
        label="Total histórico"
        value={fmtCompact(overview.total_historic)}
        sub="statements acumulados"
        color={ACCENT}
        title={overview.total_historic != null ? `${fmtInt(overview.total_historic)} statements` : undefined}
      />
      <Kpi
        label="Plataformas"
        value={fmtInt(overview.n_platforms)}
        sub={overview.n_vlops != null ? `${overview.n_vlops} VLOP` : 'reportando'}
        color="#0891b2"
      />
      <Kpi
        label="Alcance España"
        value={fmtCompact(overview.spain_total)}
        sub="territorial_scope ES"
        color="#7c3aed"
        title={overview.spain_total != null ? `${fmtInt(overview.spain_total)} statements con ES` : undefined}
      />
    </div>
  )
}

function Kpi({
  label, value, color, sub, title,
}: { label: string; value: string; color: string; sub?: string; title?: string }) {
  return (
    <div
      title={title}
      style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color, lineHeight: 1.2, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </p>
      {sub && <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{sub}</p>}
    </div>
  )
}

// ─── Top plataformas (barras) ───────────────────────────────────────────────
function PlatformsBlock({
  platforms, error, date,
}: { platforms: PlatformVolume[] | null; error: string | null; date?: string }) {
  return (
    <SubBlock title={`Top plataformas por volumen${date ? ` · ${date}` : ''}`}>
      {!platforms || platforms.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Sin datos de plataformas{error ? ` (${error})` : ''}.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(() => {
            const max = Math.max(...platforms.map((p) => p.total), 1)
            return platforms.map((p) => {
              const pct = Math.max(2, Math.round((p.total / max) * 100))
              return (
                <div key={`${p.platform_id}-${p.platform_name}`} title={`${p.platform_name}: ${fmtInt(p.total)}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 1 }}>
                    <span style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {p.platform_name}
                    </span>
                    <span style={{ color: '#991b1b', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                      {fmtCompact(p.total)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}
    </SubBlock>
  )
}

// ─── Desglose por categoría ─────────────────────────────────────────────────
function CategoriesBlock({
  categories, error,
}: { categories: CategoryVolume[] | null; error: string | null }) {
  return (
    <SubBlock title="Por categoría de moderación (foco político resaltado)">
      {!categories || categories.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Sin desglose por categoría{error ? ` (${error})` : ''}.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {categories.slice(0, 8).map((c) => (
            <div
              key={c.category}
              title={`${c.label}: ${fmtInt(c.total)}`}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center',
                fontSize: 11, padding: '3px 6px', borderRadius: 3,
                background: c.political ? '#fef2f2' : '#f8fafc',
                border: c.political ? `1px solid ${ACCENT}33` : '1px solid transparent',
              }}
            >
              <span style={{ color: c.political ? '#991b1b' : '#334155', fontWeight: c.political ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                {c.political && <span style={{ color: ACCENT, fontWeight: 800 }} title="categoría de interés político">◆</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
              </span>
              <span style={{ color: c.political ? '#991b1b' : '#64748b', fontWeight: 700, fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>
                {fmtCompact(c.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SubBlock>
  )
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default DsaTransparencyPanel
