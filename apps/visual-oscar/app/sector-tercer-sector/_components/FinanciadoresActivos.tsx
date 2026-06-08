'use client'
/**
 * <FinanciadoresActivos /> · Tercer Sector cockpit · vista Financiación
 *
 * "¿Qué administraciones financian MÁS al tercer sector AHORA?" Agrupa por
 * `organismo` (convocante / órgano de contratación / financiador) dos flujos
 * vivos:
 *   - oportunidades del agregador (`/api/tercer-sector/oportunidades`:
 *     subvenciones + grants UE + cooperación), y
 *   - concesiones BDNS recientes (las que ya carga la vista, pasadas por prop —
 *     dinero efectivamente concedido a entidades del tercer sector).
 *
 * Tabla rankeada: organismo · nº oportunidades · total importe conocido ·
 * fuentes · territorios · sectores dominantes. Orden por nº (default) o importe.
 *
 * Principio Politeia (CLAUDE.md): el importe es la SUMA de lo que cada fuente sí
 * informa; lo que no trae importe no se inventa (cuenta en «nº» pero no infla el
 * total, y se marca «—» si nada del grupo declara importe). Degradación honesta:
 * si el agregador falla, cae a solo concesiones. Cero emojis · Unicode geométrico.
 */
import { useEffect, useMemo, useState } from 'react'
import { ACCENT, fmtEur, nivelLabel, type FinConcesion, type FinanciadorActivoRow } from './FinShared'

// ── Shape de oportunidad consumido (eco del contrato, plano) ──────────────────

interface OportunidadTS {
  id: string
  tipo: string
  titulo: string
  organismo: string
  fuente: string
  pais: string
  ccaa: string | null
  importe_eur: number | null
  sector_ts: string | null
}

interface OportunidadesData {
  oportunidades: OportunidadTS[]
  fuentes_error: { fuente: string; error: string }[]
}

interface OportunidadesEnvelope {
  ok: boolean
  data: OportunidadesData | null
}

const ENDPOINT =
  '/api/tercer-sector/oportunidades?tipo=subvencion,grant_ue,cooperacion_internacional&pageSize=30&scoreMin=50'

// ── Agregación por organismo ──────────────────────────────────────────────────

interface FinanciadorRow {
  organismo: string
  num: number
  /** Suma de importes EFECTIVAMENTE informados (null si nadie del grupo declara). */
  total_eur: number | null
  fuentes: Set<string>
  territorios: Set<string>
  /** Recuento por sector → para «sectores dominantes». */
  sectores: Map<string, number>
}

function ensureRow(map: Map<string, FinanciadorRow>, organismo: string): FinanciadorRow {
  const key = organismo.trim() || '(sin organismo)'
  let row = map.get(key)
  if (!row) {
    row = {
      organismo: key,
      num: 0,
      total_eur: null,
      fuentes: new Set(),
      territorios: new Set(),
      sectores: new Map(),
    }
    map.set(key, row)
  }
  return row
}

function addImporte(row: FinanciadorRow, importe: number | null | undefined) {
  if (importe != null && Number.isFinite(importe)) {
    row.total_eur = (row.total_eur ?? 0) + importe
  }
}

function addSector(row: FinanciadorRow, sector: string | null | undefined) {
  const s = (sector || '').trim()
  if (!s) return
  row.sectores.set(s, (row.sectores.get(s) ?? 0) + 1)
}

/** Top-N sectores de un grupo, por recuento, como texto compacto. */
function sectoresDominantes(row: FinanciadorRow, top = 2): string {
  const items = Array.from(row.sectores.entries()).sort((a, b) => b[1] - a[1])
  if (items.length === 0) return '—'
  return items
    .slice(0, top)
    .map(([s]) => s)
    .join(', ')
}

type Orden = 'num' | 'importe'

export function FinanciadoresActivos({
  concesiones = [],
  precomputed,
  limit = 12,
}: {
  /** Concesiones BDNS ya cargadas por la vista (dinero concedido). */
  concesiones?: FinConcesion[]
  /** Pre-computed financiadores from enriched endpoint (TS-Deep B6). */
  precomputed?: FinanciadorActivoRow[]
  limit?: number
}) {
  const [oportunidades, setOportunidades] = useState<OportunidadTS[]>([])
  const [loadingOps, setLoadingOps] = useState(true)
  const [opsError, setOpsError] = useState(false)
  const [orden, setOrden] = useState<Orden>('num')

  useEffect(() => {
    let alive = true
    setLoadingOps(true)
    setOpsError(false)
    fetch(ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: OportunidadesEnvelope) => {
        if (!alive) return
        if (j && j.data && Array.isArray(j.data.oportunidades)) {
          setOportunidades(j.data.oportunidades)
        } else {
          setOpsError(true)
        }
      })
      .catch(() => alive && setOpsError(true))
      .finally(() => alive && setLoadingOps(false))
    return () => {
      alive = false
    }
  }, [])

  // Agregación combinada: oportunidades (organismo) + concesiones BDNS (organo).
  // TS-Deep B6: if pre-computed financiadores are available from the enriched
  // endpoint, seed them as a primary source (avoids depending on the separate
  // oportunidades fetch for the core ranking).
  const rows = useMemo(() => {
    const map = new Map<string, FinanciadorRow>()

    // Seed from pre-computed endpoint data (TS-Deep B6)
    if (precomputed && precomputed.length > 0) {
      for (const p of precomputed) {
        const row = ensureRow(map, p.organo)
        row.num += p.count
        addImporte(row, p.total_eur)
        row.fuentes.add('bdns')
        if (p.nivel) row.territorios.add(p.nivel)
      }
    }

    for (const o of oportunidades) {
      const row = ensureRow(map, o.organismo)
      row.num += 1
      addImporte(row, o.importe_eur)
      if (o.fuente) row.fuentes.add(o.fuente)
      const terr = o.ccaa || o.pais
      if (terr) row.territorios.add(terr)
      addSector(row, o.sector_ts)
    }

    // Only add concesiones if no precomputed data (avoid double-counting)
    if (!precomputed || precomputed.length === 0) {
      for (const c of concesiones) {
        const organismo = c.organo || (c.nivel ? nivelLabel(c.nivel) : '') || '(sin organismo)'
        const row = ensureRow(map, organismo)
        row.num += 1
        addImporte(row, c.importe_eur)
        row.fuentes.add('bdns')
        if (c.territorio) row.territorios.add(c.territorio)
      }
    }

    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      if (orden === 'importe') {
        const ai = a.total_eur ?? -1
        const bi = b.total_eur ?? -1
        if (bi !== ai) return bi - ai
        return b.num - a.num
      }
      // por nº, desempate por importe
      if (b.num !== a.num) return b.num - a.num
      return (b.total_eur ?? 0) - (a.total_eur ?? 0)
    })
    return arr
  }, [oportunidades, concesiones, precomputed, orden])

  const top = rows.slice(0, limit)
  const totalFinanciadores = rows.length
  const hayDatos = top.length > 0
  // Sólo en degradación TOTAL (agregador caído Y sin concesiones) mostramos error.
  const degradadoTotal = opsError && concesiones.length === 0

  const th: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#6e6e73',
    padding: '6px 10px',
    borderBottom: '1px solid #ECECEF',
    whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    fontSize: 12,
    color: '#1d1d1f',
    padding: '9px 10px',
    borderBottom: '1px solid #F2F2F4',
    verticalAlign: 'top',
  }

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, color: '#86868b', fontWeight: 600 }}>
          {totalFinanciadores.toLocaleString('es-ES')} financiadores ·{' '}
          {oportunidades.length.toLocaleString('es-ES')} oportunidades
          {concesiones.length > 0 ? ` · ${concesiones.length.toLocaleString('es-ES')} concesiones` : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#86868b', fontWeight: 600 }}>Ordenar:</span>
          {(['num', 'importe'] as Orden[]).map((o) => (
            <button
              key={o}
              onClick={() => setOrden(o)}
              style={{
                border: '1px solid',
                borderColor: orden === o ? ACCENT : '#ECECEF',
                background: orden === o ? '#F0FDF4' : '#fff',
                color: orden === o ? ACCENT : '#6e6e73',
                borderRadius: 8,
                padding: '4px 9px',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {o === 'num' ? 'Nº oportunidades' : 'Importe'}
            </button>
          ))}
        </div>
      </div>

      {loadingOps && oportunidades.length === 0 && concesiones.length === 0 ? (
        <div style={{ height: 240, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
      ) : degradadoTotal ? (
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
          No se pudo agregar financiadores: el agregador de oportunidades no respondió y no hay
          concesiones cargadas. Reintenta con ↻ Actualizar.
        </div>
      ) : !hayDatos ? (
        <div style={{ fontSize: 12, color: '#9CA3AF', padding: '14px 0' }}>
          Sin financiadores que mostrar en la muestra reciente.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Organismo financiador</th>
                <th style={{ ...th, textAlign: 'right' }}>Nº</th>
                <th style={{ ...th, textAlign: 'right' }}>Importe conocido</th>
                <th style={th}>Fuentes</th>
                <th style={th}>Territorios</th>
                <th style={th}>Sectores dominantes</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => {
                const territorios = Array.from(r.territorios)
                const fuentes = Array.from(r.fuentes)
                return (
                  <tr key={r.organismo}>
                    <td style={{ ...td, maxWidth: 280, fontWeight: 650 }} title={r.organismo}>
                      {r.organismo}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {r.num.toLocaleString('es-ES')}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 800,
                        color: r.total_eur != null ? ACCENT : '#9CA3AF',
                      }}
                    >
                      {r.total_eur != null ? fmtEur(r.total_eur) : '—'}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {fuentes.length === 0
                          ? '—'
                          : fuentes.map((f) => (
                              <span
                                key={f}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: '#475569',
                                  background: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 6,
                                  padding: '1px 6px',
                                }}
                              >
                                {f}
                              </span>
                            ))}
                      </div>
                    </td>
                    <td style={{ ...td, color: '#475569', maxWidth: 180 }}>
                      {territorios.length === 0 ? (
                        '—'
                      ) : (
                        <span title={territorios.join(' · ')}>
                          {territorios.slice(0, 2).join(', ')}
                          {territorios.length > 2 ? ` +${territorios.length - 2}` : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, color: '#475569', maxWidth: 200 }}>{sectoresDominantes(r)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length > top.length && (
            <div style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', paddingTop: 8 }}>
              +{rows.length - top.length} financiadores más
            </div>
          )}
        </div>
      )}

      {/* Aviso de degradación parcial (agregador caído pero hay concesiones) */}
      {opsError && concesiones.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 9.5, color: '#B45309', lineHeight: 1.5 }}>
          ! El agregador de oportunidades no respondió: la tabla muestra solo financiadores derivados
          de las concesiones BDNS.
        </p>
      )}

      <p style={{ margin: '10px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        Agregación por organismo de oportunidades (BDNS · SEDIA · cooperación) y concesiones BDNS
        recientes. «Importe conocido» suma solo lo que cada fuente informa (lo no informado cuenta en
        «Nº» pero no en el importe); «—» = ningún registro del grupo declara importe. Detecta qué
        administraciones financian más ahora mismo.
      </p>
    </div>
  )
}

export default FinanciadoresActivos
