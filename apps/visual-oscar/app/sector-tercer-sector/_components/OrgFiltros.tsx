'use client'
/**
 * <OrgFiltros /> · Tercer Sector v3 · TS4 (Organizaciones)
 *
 * Barra de filtros del directorio de ONGs, alimentada por las `facetas` que
 * devuelve el endpoint (`tipos`, `sectores`, `ccaa`). Permite filtrar por
 * tipo / sector / CCAA / ámbito, buscar por texto (nombre·sector·NIF, igual que
 * el server) y ordenar (ingresos desc | nombre A-Z). Selects nativos (accesibles)
 * con etiquetas humanas; la búsqueda se debouncea en el padre.
 *
 * Es presentacional puro: recibe el estado y un único `onChange(patch)`. Cero
 * emojis (Unicode geométrico).
 */
import { useMemo } from 'react'
import {
  ACCENT,
  ambitoLabel,
  ccaaLabel,
  sectorLabel,
  tipoLabel,
} from './OrgShared'

export type OrgSort = 'ingresos' | 'nombre'

export interface OrgFilters {
  tipo: string
  sector: string
  ccaa: string
  ambito: string
  q: string
  sort: OrgSort
}

interface Props {
  filters: OrgFilters
  facetas: { tipos: string[]; sectores: string[]; ccaa: string[] }
  /** Total tras filtros (para el contador) y catálogo completo. */
  total: number
  catalogoTotal: number
  loading?: boolean
  onChange: (patch: Partial<OrgFilters>) => void
  onReset: () => void
}

const AMBITOS = ['local', 'autonomico', 'estatal', 'internacional']

const selStyle: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  border: '1px solid #E2E8F0',
  borderRadius: 9,
  background: '#fff',
  padding: '8px 28px 8px 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  color: '#1d1d1f',
  cursor: 'pointer',
  minWidth: 132,
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: 4,
  display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function OrgFiltros({
  filters,
  facetas,
  total,
  catalogoTotal,
  loading,
  onChange,
  onReset,
}: Props) {
  const tipos = useMemo(
    () => [...facetas.tipos].sort((a, b) => tipoLabel(a).localeCompare(tipoLabel(b), 'es')),
    [facetas.tipos],
  )
  const sectores = useMemo(
    () => [...facetas.sectores].sort((a, b) => sectorLabel(a).localeCompare(sectorLabel(b), 'es')),
    [facetas.sectores],
  )
  const ccaas = useMemo(
    () => [...facetas.ccaa].sort((a, b) => ccaaLabel(a).localeCompare(ccaaLabel(b), 'es')),
    [facetas.ccaa],
  )

  const hasFilters = !!(filters.tipo || filters.sector || filters.ccaa || filters.ambito || filters.q)

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* Búsqueda */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px', minWidth: 200 }}>
          <label style={labelStyle}>Buscar</label>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: 13 }}
            >
              ⌕
            </span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="Nombre, sector o NIF…"
              style={{
                width: '100%',
                border: '1px solid #E2E8F0',
                borderRadius: 9,
                padding: '8px 10px 8px 28px',
                fontSize: 12,
                fontFamily: 'inherit',
                color: '#1d1d1f',
                outlineColor: ACCENT,
              }}
            />
          </div>
        </div>

        <Field label="Tipo">
          <select value={filters.tipo} onChange={(e) => onChange({ tipo: e.target.value })} style={selStyle}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {tipoLabel(t)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sector">
          <select value={filters.sector} onChange={(e) => onChange({ sector: e.target.value })} style={selStyle}>
            <option value="">Todos</option>
            {sectores.map((s) => (
              <option key={s} value={s}>
                {sectorLabel(s)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="CCAA (sede)">
          <select value={filters.ccaa} onChange={(e) => onChange({ ccaa: e.target.value })} style={selStyle}>
            <option value="">Todas</option>
            {ccaas.map((c) => (
              <option key={c} value={c}>
                {ccaaLabel(c)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ámbito">
          <select value={filters.ambito} onChange={(e) => onChange({ ambito: e.target.value })} style={selStyle}>
            <option value="">Todos</option>
            {AMBITOS.map((a) => (
              <option key={a} value={a}>
                {ambitoLabel(a)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Orden">
          <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as OrgSort })}
            style={selStyle}
          >
            <option value="ingresos">Ingresos (mayor)</option>
            <option value="nombre">Nombre (A–Z)</option>
          </select>
        </Field>
      </div>

      {/* Pie: contador + reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: '#64748b' }}>
          {loading ? (
            'Cargando entidades…'
          ) : (
            <>
              <strong style={{ color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>
                {total.toLocaleString('es-ES')}
              </strong>{' '}
              {total === 1 ? 'entidad' : 'entidades'}
              {hasFilters && (
                <span style={{ color: '#94a3b8' }}> · filtradas de {catalogoTotal.toLocaleString('es-ES')}</span>
              )}
            </>
          )}
        </span>
        {hasFilters && (
          <button
            onClick={onReset}
            style={{
              border: '1px solid #E2E8F0',
              background: '#fff',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  )
}

export default OrgFiltros
