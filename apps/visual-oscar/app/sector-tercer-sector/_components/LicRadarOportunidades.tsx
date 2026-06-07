'use client'
/**
 * <LicRadarOportunidades /> · Tercer Sector v3 · Cockpit W2 (Licitaciones).
 *
 * PANEL-RESUMEN ACCIONABLE del centerpiece. Se coloca entre <LicResumen> y el
 * mapa. NO hace red: lee las licitaciones YA CARGADAS por el padre
 * (`data.licitaciones`, la página vigente, ya enriquecidas por el endpoint con
 * score_ong/label, dias_restantes, categoria_ts, comprador_tipo…) y deriva en
 * cliente cinco lecturas de analista:
 *
 *   1. Mejores oportunidades para ONG  — top por score (label `alta`).
 *   2. Cierres próximos                — `dias_restantes` ≤ 10 (no vencidas).
 *   3. Con pliego analizable           — documentos analizables por IA.
 *   4. Compradores recurrentes         — group-by comprador (más frecuentes).
 *   5. CPV / sectores sociales calientes — group-by categoria_ts (fallback CPV).
 *
 * Cada panel ofrece un ATAJO que aplica el filtro equivalente del endpoint
 * (`onApply`), y cada ítem abre la ficha (`onSelect`). Es una LECTURA de la
 * muestra cargada — se rotula como tal para no exagerar (no es un agregado total
 * del barrido). Degrada con vacíos explícitos. Cero emojis · Unicode geométrico.
 */
import { useMemo } from 'react'
import type {
  LicitacionNormalizada,
  LicitacionesFiltros,
} from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, ACCENT_DARK, NivelBadge, formatEur, formatFecha } from './LicShared'

interface Props {
  /** Licitaciones de la página vigente (ya enriquecidas). */
  items: LicitacionNormalizada[]
  /** Total del barrido (para contextualizar que el radar lee la muestra). */
  total: number
  /** Selecciona una licitación → abre su ficha en el padre. */
  onSelect: (id: string) => void
  /** Aplica un atajo de filtro (mapea a query params del endpoint). */
  onApply: (patch: Partial<LicitacionesFiltros>) => void
}

/** Formato analizable por el extractor de pliegos (espejo de enrich.ts). */
const ANALIZABLE = new Set(['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html'])
function tieneDocAnalizable(l: LicitacionNormalizada): boolean {
  return (l.documentos || []).some((d) => ANALIZABLE.has((d.formato || '').toLowerCase()))
}

const UMBRAL_CIERRE = 10 // días

export function LicRadarOportunidades({ items, total, onSelect, onApply }: Props) {
  const radar = useMemo(() => {
    const list = items || []

    // 1) Mejores para ONG: label `alta`, orden por score desc (nulls al final).
    const mejores = list
      .filter((l) => l.score_label === 'alta')
      .sort((a, b) => (b.score_ong ?? -1) - (a.score_ong ?? -1))
      .slice(0, 5)

    // 2) Cierres próximos: dentro de plazo (0..UMBRAL), orden por urgencia asc.
    const cierres = list
      .filter((l) => l.dias_restantes != null && l.dias_restantes >= 0 && l.dias_restantes <= UMBRAL_CIERRE)
      .sort((a, b) => (a.dias_restantes ?? 9999) - (b.dias_restantes ?? 9999))
      .slice(0, 5)

    // 3) Con pliego analizable por IA.
    const analizables = list.filter(tieneDocAnalizable).slice(0, 5)

    // 4) Compradores recurrentes (group-by comprador con ≥ 2 apariciones).
    const compMap = new Map<string, { nombre: string; count: number; valor: number }>()
    for (const l of list) {
      const nombre = (l.comprador || '').trim()
      if (!nombre) continue
      const key = nombre.toLowerCase()
      const cur = compMap.get(key) || { nombre, count: 0, valor: 0 }
      cur.count += 1
      cur.valor += l.valor_eur ?? 0
      compMap.set(key, cur)
    }
    const compradores = Array.from(compMap.values())
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // 5) Sectores/CPV calientes (group-by categoria_ts; fallback a CPV).
    const catMap = new Map<string, { label: string; sector: string | null; cpvPrefix: string | null; count: number }>()
    for (const l of list) {
      const cat = (l.categoria_ts || '').trim()
      if (cat) {
        const key = `c:${cat.toLowerCase()}`
        const cur = catMap.get(key) || { label: cat, sector: cat, cpvPrefix: null, count: 0 }
        cur.count += 1
        catMap.set(key, cur)
      } else if (l.cpv) {
        const prefix = l.cpv.slice(0, 3)
        const key = `p:${prefix}`
        const cur = catMap.get(key) || { label: `CPV ${prefix}…`, sector: null, cpvPrefix: prefix, count: 0 }
        cur.count += 1
        catMap.set(key, cur)
      }
    }
    const sectores = Array.from(catMap.values()).sort((a, b) => b.count - a.count).slice(0, 8)

    const nAlta = list.filter((l) => l.score_label === 'alta').length

    return { mejores, cierres, analizables, compradores, sectores, nAlta, muestra: list.length }
  }, [items])

  const nada =
    radar.mejores.length === 0 &&
    radar.cierres.length === 0 &&
    radar.analizables.length === 0 &&
    radar.compradores.length === 0 &&
    radar.sectores.length === 0

  if ((items?.length ?? 0) === 0) return null

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 14,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          <span aria-hidden="true" style={{ color: ACCENT, marginRight: 6 }}>✦</span>
          Radar de oportunidades
        </h2>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          Lectura de la muestra cargada ({radar.muestra.toLocaleString('es-ES')}
          {total > radar.muestra ? ` de ${total.toLocaleString('es-ES')}` : ''}) · enriquecida por IA
        </span>
      </header>

      {nada ? (
        <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8' }}>
          Sin señales accionables en esta muestra. Ajusta los filtros o amplía el barrido.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* 1 · Mejores para ONG */}
          <RadarPanel
            title="Mejores para ONG"
            glyph="◉"
            color="#16A34A"
            count={radar.nAlta}
            action={radar.nAlta > 0 ? { label: 'Ver encaje alto', onClick: () => onApply({ aptoOng: 'alta', page: 1 }) } : undefined}
            empty="Ninguna con encaje alto en la muestra."
          >
            {radar.mejores.map((l) => (
              <RadarItem
                key={l.id}
                lic={l}
                onSelect={() => onSelect(l.id)}
                right={<ScorePill score={l.score_ong} />}
              />
            ))}
          </RadarPanel>

          {/* 2 · Cierres próximos */}
          <RadarPanel
            title={`Cierran en ≤ ${UMBRAL_CIERRE} días`}
            glyph="◴"
            color="#EA580C"
            count={radar.cierres.length}
            action={radar.cierres.length > 0 ? { label: 'Filtrar urgentes', onClick: () => onApply({ diasMax: UMBRAL_CIERRE, page: 1 }) } : undefined}
            empty="Sin cierres inminentes en la muestra."
          >
            {radar.cierres.map((l) => (
              <RadarItem
                key={l.id}
                lic={l}
                onSelect={() => onSelect(l.id)}
                right={<DiasPill dias={l.dias_restantes ?? null} />}
              />
            ))}
          </RadarPanel>

          {/* 3 · Con pliego analizable */}
          <RadarPanel
            title="Con pliego analizable"
            glyph="◈"
            color="#6366F1"
            count={radar.analizables.length}
            action={radar.analizables.length > 0 ? { label: 'Solo analizables', onClick: () => onApply({ soloAnalizable: true, page: 1 }) } : undefined}
            empty="Sin documentos analizables por IA en la muestra."
          >
            {radar.analizables.map((l) => (
              <RadarItem
                key={l.id}
                lic={l}
                onSelect={() => onSelect(l.id)}
                right={
                  <span style={pillNeutral} title="Documentos adjuntos">
                    ◈ {(l.documentos || []).length}
                  </span>
                }
              />
            ))}
          </RadarPanel>

          {/* 4 · Compradores recurrentes */}
          <RadarPanel
            title="Compradores recurrentes"
            glyph="⊞"
            color="#0EA5E9"
            count={radar.compradores.length}
            empty="Ningún comprador repite en la muestra."
          >
            {radar.compradores.map((c) => (
              <button
                key={c.nombre}
                type="button"
                onClick={() => onApply({ q: c.nombre, page: 1 })}
                title={`Filtrar por «${c.nombre}»`}
                style={rowBtnStyle}
              >
                <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, color: '#334155', fontWeight: 600 }}>
                  {c.nombre}
                </span>
                {c.valor > 0 && (
                  <span style={{ fontSize: 10, color: '#94a3b8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatEur(c.valor)}
                  </span>
                )}
                <span style={countBadge}>{c.count}</span>
              </button>
            ))}
          </RadarPanel>

          {/* 5 · Sectores / CPV calientes */}
          <RadarPanel
            title="Sectores sociales calientes"
            glyph="⬡"
            color="#8B5CF6"
            count={radar.sectores.length}
            empty="Sin categorías sociales detectadas en la muestra."
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {radar.sectores.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => (s.sector ? onApply({ sectorTs: s.sector, page: 1 }) : s.cpvPrefix ? onApply({ cpv: s.cpvPrefix, page: 1 }) : undefined)}
                  title={s.sector ? `Filtrar sector «${s.sector}»` : s.cpvPrefix ? `Filtrar CPV ${s.cpvPrefix}` : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {s.label}
                  <span style={{ ...countBadge, background: '#8B5CF6' }}>{s.count}</span>
                </button>
              ))}
            </div>
          </RadarPanel>
        </div>
      )}
    </section>
  )
}

// ── Sub-piezas ──────────────────────────────────────────────────────────────

function RadarPanel({
  title,
  glyph,
  color,
  count,
  action,
  empty,
  children,
}: {
  title: string
  glyph: string
  color: string
  count: number
  action?: { label: string; onClick: () => void }
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div style={{ background: '#FBFBFC', border: '1px solid #F1F5F9', borderRadius: 12, padding: '11px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ color, fontSize: 13 }}>{glyph}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}14`, borderRadius: 999, padding: '1px 7px', fontVariantNumeric: 'tabular-nums' }}>
          {count.toLocaleString('es-ES')}
        </span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color,
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {action.label} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      {hasChildren ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</div>
      ) : (
        <p style={{ margin: 0, fontSize: 10.5, color: '#94a3b8' }}>{empty}</p>
      )}
    </div>
  )
}

function RadarItem({
  lic,
  onSelect,
  right,
}: {
  lic: LicitacionNormalizada
  onSelect: () => void
  right: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={lic.titulo}
      style={rowBtnStyle}
    >
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
          <NivelBadge nivel={lic.nivel} size="sm" />
          {lic.valor_eur != null && (
            <span style={{ fontSize: 9.5, color: ACCENT_DARK, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatEur(lic.valor_eur)}
            </span>
          )}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 11.5,
            fontWeight: 600,
            color: '#0f172a',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lic.titulo || 'Licitación sin título'}
        </span>
        <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lic.comprador || '—'}
          {lic.fecha_pub ? ` · ${formatFecha(lic.fecha_pub)}` : ''}
        </span>
      </span>
      <span style={{ flexShrink: 0 }}>{right}</span>
    </button>
  )
}

function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span style={pillNeutral}>—</span>
  return (
    <span
      title={`Encaje ONG · ${score}/100`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 800,
        color: '#16A34A',
        background: '#16A34A14',
        border: '1px solid #16A34A33',
        borderRadius: 6,
        padding: '2px 7px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {Math.round(score)}
    </span>
  )
}

function DiasPill({ dias }: { dias: number | null }) {
  if (dias == null) return <span style={pillNeutral}>—</span>
  const color = dias <= 0 ? '#DC2626' : dias <= 3 ? '#DC2626' : dias <= 7 ? '#EA580C' : '#CA8A04'
  const txt = dias <= 0 ? 'Hoy' : `${dias} d`
  return (
    <span
      title={`${dias} día(s) hasta el plazo`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 800,
        color,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: '2px 7px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {txt}
    </span>
  )
}

const rowBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  textAlign: 'left',
  background: '#fff',
  border: '1px solid #F1F5F9',
  borderRadius: 9,
  padding: '7px 9px',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const pillNeutral: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 10,
  fontWeight: 700,
  color: '#64748b',
  background: '#F1F5F9',
  border: '1px solid #E2E8F0',
  borderRadius: 6,
  padding: '2px 7px',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
}

const countBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 18,
  height: 16,
  fontSize: 9.5,
  fontWeight: 800,
  color: '#fff',
  background: ACCENT,
  borderRadius: 999,
  padding: '0 5px',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
}

export default LicRadarOportunidades
