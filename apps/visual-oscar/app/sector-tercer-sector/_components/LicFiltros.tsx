'use client'
/**
 * <LicFiltros /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · buscador) +
 * Cockpit W2 (filtros de analista).
 *
 * Buscador MULTINIVEL exhaustivo de licitaciones. Es la pieza de entrada del
 * centerpiece del sector: el analista decide el ÁNGULO (chips de nivel: CCAA →
 * estatal ES → UE → otros países → regional extranjero → org. internacionales) y
 * afina con país, CPV/categoría (presets sociales/salud/cooperación + entrada
 * libre), texto y rango de fechas de publicación.
 *
 * Cockpit W2 añade la fila de FILTROS DE ANALISTA sobre el enriquecimiento del
 * endpoint: encaje ONG (`aptoOng`), urgencia (`diasMax` con presets 7/15/30),
 * tramo de valor (`valorMin`/`valorMax`), solo con documentos (`soloConDocs`),
 * solo con pliego analizable (`soloAnalizable`), categoría de tercer sector
 * (`sectorTs`) y naturaleza del comprador (`compradorTipo`). Todos mapean 1:1 a
 * los query params que ya acepta `/api/tercer-sector/licitaciones`.
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
import type {
  CompradorTipo,
  LicitacionesFiltros,
  NivelLicitacion,
  ScoreLabel,
} from '@/lib/tercer-sector/licitaciones/types'
import { ACCENT, NIVELES, CPV_PRESETS, Field, inputStyle, nivelMeta } from './LicShared'

// ── Vocabulario local de los filtros de analista (no se toca LicShared) ──────

/** Encaje ONG (score_label) → etiqueta + color del chip. `incierta` se omite del
 *  selector porque no es un objetivo de búsqueda accionable (faltan datos). */
const APTO_OPTS: { id: ScoreLabel; label: string; color: string; desc: string }[] = [
  { id: 'alta', label: 'Alta', color: '#16A34A', desc: 'Encaje ONG alto (score ≥ 55)' },
  { id: 'media', label: 'Media', color: '#CA8A04', desc: 'Encaje ONG medio (score 35-54)' },
  { id: 'baja', label: 'Baja', color: '#DC2626', desc: 'Encaje ONG bajo (score 1-34)' },
]

/** Presets de urgencia (días hasta el plazo). */
const DIAS_PRESETS = [7, 15, 30]

/** Naturaleza del comprador → etiqueta + glyph del chip. */
const COMPRADOR_OPTS: { id: CompradorTipo; label: string; glyph: string; desc: string }[] = [
  { id: 'ayuntamiento', label: 'Ayuntamiento', glyph: '◧', desc: 'Entidad local (ayuntamiento, diputación…)' },
  { id: 'ccaa', label: 'CCAA', glyph: '◨', desc: 'Comunidad autónoma / consejería' },
  { id: 'age', label: 'Estado (AGE)', glyph: '⊟', desc: 'Administración General del Estado' },
  { id: 'ue', label: 'UE', glyph: '⬡', desc: 'Instituciones de la Unión Europea' },
  { id: 'org_internacional', label: 'Org. int.', glyph: '◉', desc: 'World Bank · BID · UNGM · bancos de desarrollo' },
]

/** Presets de categoría de tercer sector (substring sobre `categoria_ts`). Los
 *  valores deben coincidir con las categorías que produce el enriquecimiento. */
const SECTOR_TS_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los sectores' },
  { value: 'servicios sociales', label: 'Servicios sociales' },
  { value: 'inclusión', label: 'Inclusión y exclusión social' },
  { value: 'migración', label: 'Migración y asilo' },
  { value: 'infancia', label: 'Infancia y familia' },
  { value: 'discapacidad', label: 'Discapacidad' },
  { value: 'mayores', label: 'Mayores' },
  { value: 'cooperación', label: 'Cooperación y ayuda humanitaria' },
  { value: 'igualdad', label: 'Igualdad y violencia de género' },
  { value: 'empleo', label: 'Empleo e inserción' },
  { value: 'voluntariado', label: 'Voluntariado' },
  { value: 'sinhogar', label: 'Sinhogarismo y vivienda' },
  { value: 'salud', label: 'Salud y salud mental' },
]

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
  // Filtros de analista numéricos con estado local (se confirman con Buscar/Enter).
  const [diasMax, setDiasMax] = useState(value.diasMax != null ? String(value.diasMax) : '')
  const [valorMin, setValorMin] = useState(value.valorMin != null ? String(value.valorMin) : '')
  const [valorMax, setValorMax] = useState(value.valorMax != null ? String(value.valorMax) : '')

  // Re-sincroniza si el padre resetea los filtros desde fuera.
  useEffect(() => setQ(value.q ?? ''), [value.q])
  useEffect(() => setPais(value.pais ?? ''), [value.pais])
  useEffect(() => setCpv(value.cpv ?? ''), [value.cpv])
  useEffect(() => setDesde(value.desde ?? ''), [value.desde])
  useEffect(() => setHasta(value.hasta ?? ''), [value.hasta])
  useEffect(() => setDiasMax(value.diasMax != null ? String(value.diasMax) : ''), [value.diasMax])
  useEffect(() => setValorMin(value.valorMin != null ? String(value.valorMin) : ''), [value.valorMin])
  useEffect(() => setValorMax(value.valorMax != null ? String(value.valorMax) : ''), [value.valorMax])

  /** Entero finito y positivo desde un input, o undefined si vacío/no válido. */
  const intOrUndef = (s: string): number | undefined => {
    const t = s.trim()
    if (!t) return undefined
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
  }

  const submit = () =>
    onSubmit({
      q: q.trim() || undefined,
      pais: pais.trim() || undefined,
      cpv: cpv.trim() || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      diasMax: intOrUndef(diasMax),
      valorMin: intOrUndef(valorMin),
      valorMax: intOrUndef(valorMax),
    })

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const activeNivel = value.nivel ?? null
  const cpvActive = (cpv || '').trim()
  const aptoActive = value.aptoOng ?? null
  const compradorActive = value.compradorTipo ?? null
  const sectorActive = value.sectorTs ?? ''
  const soloConDocs = value.soloConDocs ?? false
  const soloAnalizable = value.soloAnalizable ?? false
  const diasActive = value.diasMax ?? null

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

      {/* ── Filtros de analista (sobre el enriquecimiento) ─────────── */}
      <div
        style={{
          marginBottom: 12,
          paddingTop: 12,
          borderTop: '1px dashed #E2E8F0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px 18px',
          alignItems: 'start',
        }}
      >
        {/* Encaje ONG (score_label) */}
        <div>
          <span style={subLabelStyle}>Encaje ONG</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {APTO_OPTS.map((o) => {
              const on = aptoActive === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  title={o.desc}
                  aria-pressed={on}
                  onClick={() => onChange({ aptoOng: on ? undefined : o.id, page: 1 })}
                  style={pillStyle(on, o.color)}
                >
                  <span aria-hidden="true" style={{ fontSize: 9 }}>{on ? '●' : '○'}</span>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Urgencia · días hasta el plazo */}
        <div>
          <span style={subLabelStyle}>Cierra en (días máx.)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' }}>
            {DIAS_PRESETS.map((d) => {
              const on = diasActive === d
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  title={`Plazo en ${d} días o menos`}
                  onClick={() => {
                    const next = on ? undefined : d
                    setDiasMax(next != null ? String(next) : '')
                    onChange({ diasMax: next, page: 1 })
                  }}
                  style={pillStyle(on, ACCENT)}
                >
                  ≤ {d}
                </button>
              )
            })}
            <input
              value={diasMax}
              onChange={(e) => setDiasMax(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={onKey}
              placeholder="otro"
              inputMode="numeric"
              aria-label="Días máximos hasta el plazo"
              style={{ ...inputStyle, width: 64, padding: '5px 8px', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
        </div>

        {/* Tramo de valor estimado (EUR) */}
        <div>
          <span style={subLabelStyle}>Valor estimado (€)</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={onKey}
              placeholder="mín."
              inputMode="numeric"
              aria-label="Valor mínimo en euros"
              style={{ ...inputStyle, padding: '6px 8px', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}
            />
            <span aria-hidden="true" style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
            <input
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={onKey}
              placeholder="máx."
              inputMode="numeric"
              aria-label="Valor máximo en euros"
              style={{ ...inputStyle, padding: '6px 8px', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
        </div>

        {/* Categoría tercer sector (sectorTs) */}
        <div>
          <span style={subLabelStyle}>Sector social</span>
          <div style={{ marginTop: 6 }}>
            <select
              value={sectorActive}
              onChange={(e) => onChange({ sectorTs: e.target.value || undefined, page: 1 })}
              aria-label="Categoría de tercer sector"
              style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              {SECTOR_TS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Naturaleza del comprador (compradorTipo) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={subLabelStyle}>Comprador</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {COMPRADOR_OPTS.map((o) => {
              const on = compradorActive === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  title={o.desc}
                  aria-pressed={on}
                  onClick={() => onChange({ compradorTipo: on ? undefined : o.id, page: 1 })}
                  style={pillStyle(on, ACCENT)}
                >
                  <span aria-hidden="true" style={{ opacity: on ? 1 : 0.7 }}>{o.glyph}</span>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Toggles · documentos / pliego analizable */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <Toggle
            label="Solo con documentos"
            title="Solo licitaciones con al menos un documento adjunto"
            checked={soloConDocs}
            onChange={(v) => onChange({ soloConDocs: v || undefined, page: 1 })}
          />
          <Toggle
            label="Solo pliego analizable (IA)"
            title="Solo licitaciones con algún documento analizable por IA (pdf/docx/xlsx/html)"
            checked={soloAnalizable}
            onChange={(v) => onChange({ soloAnalizable: v || undefined, page: 1 })}
          />
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
            setDiasMax('')
            setValorMin('')
            setValorMax('')
            onSubmit({
              nivel: undefined,
              pais: undefined,
              cpv: undefined,
              q: undefined,
              desde: undefined,
              hasta: undefined,
              aptoOng: undefined,
              diasMax: undefined,
              valorMin: undefined,
              valorMax: undefined,
              soloConDocs: undefined,
              soloAnalizable: undefined,
              sectorTs: undefined,
              compradorTipo: undefined,
              page: 1,
            })
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

// ── Estilos / micro-componentes locales de los filtros de analista ──────────

/** Etiqueta de sub-sección (uppercase sutil), igual lenguaje visual que el resto. */
const subLabelStyle: React.CSSProperties = {
  fontSize: 9.5,
  color: '#64748b',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

/** Estilo de chip-pastilla (activo coloreado, inactivo neutro). */
function pillStyle(active: boolean, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    border: '1px solid',
    borderColor: active ? color : '#E2E8F0',
    background: active ? color : '#fff',
    color: active ? '#fff' : '#334155',
    borderRadius: 999,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 150ms ease, border-color 150ms ease',
    fontVariantNumeric: 'tabular-nums',
  }
}

/** Toggle de filtro booleano (switch accesible con label). */
function Toggle({
  label,
  title,
  checked,
  onChange,
}: {
  label: string
  title?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 18,
          borderRadius: 999,
          background: checked ? ACCENT : '#CBD5E1',
          position: 'relative',
          transition: 'background 150ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 150ms ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </span>
      <span style={{ fontSize: 11.5, color: checked ? '#334155' : '#64748b', fontWeight: 600 }}>{label}</span>
    </button>
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
