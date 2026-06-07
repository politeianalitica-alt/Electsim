'use client'
/**
 * <LicFiltros /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · buscador)
 *
 * Buscador MULTINIVEL exhaustivo de licitaciones. Es la pieza de entrada del
 * centerpiece del sector: el analista decide el ÁNGULO (chips de nivel: CCAA →
 * estatal ES → UE → otros países → regional extranjero → org. internacionales) y
 * afina con país, CPV/categoría (presets sociales/salud/cooperación + entrada
 * libre), texto y rango de fechas de publicación.
 *
 * Controlado por el padre (<TSLicitacionesView>): recibe `value` (los filtros
 * vigentes) y emite `onChange` con un patch. El padre hace el refetch al cambiar
 * (debounce de texto incluido en el padre). Esta pieza es presentacional + estado
 * local mínimo para los campos de texto que se confirman con Enter / "Buscar".
 *
 * Mapea 1:1 a los query params de `/api/tercer-sector/licitaciones`
 * (LicitacionesFiltros). Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import type { LicitacionesFiltros, NivelLicitacion } from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, NIVELES, CPV_PRESETS, Field, inputStyle, nivelMeta } from './LicShared'

interface Props {
  value: LicitacionesFiltros
  onChange: (patch: Partial<LicitacionesFiltros>) => void
  /** Lanza una búsqueda con los campos de texto confirmados. */
  onSubmit: (patch: Partial<LicitacionesFiltros>) => void
  loading?: boolean
}

export function LicFiltros({ value, onChange, onSubmit, loading = false }: Props) {
  // Campos de texto con estado local (se confirman con Enter o "Buscar"), para no
  // refetch en cada tecla. País/CPV libre/fechas comparten el mismo patrón.
  const [q, setQ] = useState(value.q ?? '')
  const [pais, setPais] = useState(value.pais ?? '')
  const [cpv, setCpv] = useState(value.cpv ?? '')
  const [desde, setDesde] = useState(value.desde ?? '')
  const [hasta, setHasta] = useState(value.hasta ?? '')

  // Re-sincroniza si el padre resetea los filtros desde fuera.
  useEffect(() => setQ(value.q ?? ''), [value.q])
  useEffect(() => setPais(value.pais ?? ''), [value.pais])
  useEffect(() => setCpv(value.cpv ?? ''), [value.cpv])
  useEffect(() => setDesde(value.desde ?? ''), [value.desde])
  useEffect(() => setHasta(value.hasta ?? ''), [value.hasta])

  const submit = () =>
    onSubmit({
      q: q.trim() || undefined,
      pais: pais.trim() || undefined,
      cpv: cpv.trim() || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const activeNivel = value.nivel ?? null
  const cpvActive = (cpv || '').trim()

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      {/* ── Nivel (ángulo) · chips ─────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Nivel administrativo
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <NivelChip
            label="Todos"
            glyph="⊞"
            color={ACCENT}
            active={activeNivel === null}
            onClick={() => onChange({ nivel: undefined, page: 1 })}
          />
          {NIVELES.map((n) => (
            <NivelChip
              key={n.id}
              label={n.short}
              glyph={n.glyph}
              color={n.color}
              active={activeNivel === n.id}
              title={n.desc}
              onClick={() => onChange({ nivel: (activeNivel === n.id ? undefined : n.id) as NivelLicitacion | undefined, page: 1 })}
            />
          ))}
        </div>
        {activeNivel && (
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8' }}>
            {nivelMeta(activeNivel).label} · {nivelMeta(activeNivel).desc}
          </p>
        )}
      </div>

      {/* ── CPV / categoría · presets útiles a ONGs ────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Categoría CPV · presets tercer sector
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {CPV_PRESETS.map((p) => {
            const on = cpvActive === p.cpv
            return (
              <button
                key={p.cpv}
                type="button"
                title={`CPV ${p.cpv}`}
                onClick={() => {
                  const next = on ? '' : p.cpv
                  setCpv(next)
                  onChange({ cpv: next || undefined, page: 1 })
                }}
                style={{
                  border: '1px solid',
                  borderColor: on ? ACCENT : '#E2E8F0',
                  background: on ? ACCENT : '#fff',
                  color: on ? '#fff' : '#334155',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums', marginRight: 5 }}>{p.cpv}</span>
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Campos: texto · país · CPV libre · fechas ──────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 2fr) repeat(2, minmax(120px, 1fr)) repeat(2, minmax(130px, 1fr))',
          gap: 10,
          alignItems: 'end',
        }}
      >
        <Field label="Texto (título · comprador)">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="p. ej. integración, mayores, agua…"
            style={inputStyle}
          />
        </Field>
        <Field label="País">
          <input
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            onKeyDown={onKey}
            placeholder="España, Reino Unido…"
            style={inputStyle}
          />
        </Field>
        <Field label="CPV (prefijo)">
          <input
            value={cpv}
            onChange={(e) => setCpv(e.target.value)}
            onKeyDown={onKey}
            placeholder="85, 8531, 80500…"
            inputMode="numeric"
            style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
          />
        </Field>
        <Field label="Publicado desde">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} onKeyDown={onKey} style={inputStyle} />
        </Field>
        <Field label="Publicado hasta">
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} onKeyDown={onKey} style={inputStyle} />
        </Field>
      </div>

      {/* ── Acciones ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          style={{
            background: ACCENT,
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Buscando…' : '⌕ Buscar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setQ('')
            setPais('')
            setCpv('')
            setDesde('')
            setHasta('')
            onSubmit({ nivel: undefined, pais: undefined, cpv: undefined, q: undefined, desde: undefined, hasta: undefined, page: 1 })
          }}
          style={{
            background: '#fff',
            color: '#64748b',
            border: '1px solid #E2E8F0',
            borderRadius: 9,
            padding: '9px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Limpiar
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
          Fan-out paralelo · degradación honesta por fuente · cache 30 min
        </span>
      </div>
    </section>
  )
}

function NivelChip({
  label,
  glyph,
  color,
  active,
  onClick,
  title,
}: {
  label: string
  glyph: string
  color: string
  active: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: '1px solid',
        borderColor: active ? color : '#E2E8F0',
        background: active ? color : '#fff',
        color: active ? '#fff' : color,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
    >
      <span aria-hidden="true" style={{ opacity: active ? 1 : 0.85 }}>
        {glyph}
      </span>
      {label}
    </button>
  )
}

export default LicFiltros
