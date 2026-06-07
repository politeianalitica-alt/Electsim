'use client'
/**
 * <FinConvocatoriasTable /> · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Convocatorias BDNS más recientes con sesgo de tercer sector. La API BDNS de
 * convocatorias NO expone importe ni beneficiario en el listado (eso vive en las
 * concesiones — ver panel inferior), así que la tabla muestra lo que la fuente sí
 * da de forma fiable: título, órgano convocante, nivel administrativo, ámbito
 * territorial, fecha de recepción y si está financiada por el MRR (NextGenEU).
 * Orden por fecha (más recientes primero) con alternativa por título; toggle para
 * ver solo las clasificadas como tercer sector. Cada fila enlaza a su ficha
 * pública en infosubvenciones.es. Degradación honesta (lista vacía → mensaje).
 * Cero emojis · Unicode geométrico.
 */
import { useMemo, useState } from 'react'
import {
  ACCENT,
  fmtFecha,
  nivelColor,
  nivelLabel,
  type FinConvocatoria,
} from './FinShared'

/** Ficha pública de una convocatoria en BDNS (por código/numero). */
function convocatoriaUrl(c: FinConvocatoria): string {
  const code = c.numero || c.id
  return `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${encodeURIComponent(code)}`
}

type Orden = 'fecha' | 'titulo'

export function FinConvocatoriasTable({
  convocatorias,
  limit = 14,
}: {
  convocatorias: FinConvocatoria[]
  limit?: number
}) {
  const [soloTs, setSoloTs] = useState(true)
  const [orden, setOrden] = useState<Orden>('fecha')

  const nTs = useMemo(
    () => convocatorias.filter((c) => c.es_tercer_sector).length,
    [convocatorias],
  )

  const rows = useMemo(() => {
    const base = soloTs ? convocatorias.filter((c) => c.es_tercer_sector) : convocatorias
    const sorted = [...base].sort((a, b) => {
      if (orden === 'titulo') return a.titulo.localeCompare(b.titulo, 'es')
      // fecha desc (las sin fecha al final)
      const fa = a.fecha ? Date.parse(a.fecha) : -Infinity
      const fb = b.fecha ? Date.parse(b.fecha) : -Infinity
      return fb - fa
    })
    return sorted.slice(0, limit)
  }, [convocatorias, soloTs, orden, limit])

  if (convocatorias.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#9CA3AF', padding: '14px 0' }}>
        BDNS no devolvió convocatorias ahora mismo.
      </div>
    )
  }

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
        <button
          onClick={() => setSoloTs((v) => !v)}
          style={{
            border: '1px solid',
            borderColor: soloTs ? ACCENT : '#ECECEF',
            background: soloTs ? ACCENT : '#fff',
            color: soloTs ? '#fff' : '#1d1d1f',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {soloTs ? '◉' : '◯'} Solo tercer sector ({nTs})
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#86868b', fontWeight: 600 }}>Ordenar:</span>
          {(['fecha', 'titulo'] as Orden[]).map((o) => (
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
              {o === 'fecha' ? 'Recepción' : 'Título'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Convocatoria</th>
              <th style={th}>Órgano convocante</th>
              <th style={th}>Nivel</th>
              <th style={{ ...th, textAlign: 'right' }}>Recepción</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              // Fallback a clave combinada: BDNS puede devolver id '' si faltan
              // tanto id como codConcesion/numeroConvocatoria, lo que duplicaría
              // claves React entre filas. El índice garantiza unicidad.
              <tr key={`${c.id || 'sin-id'}-${i}`}>
                <td style={{ ...td, maxWidth: 360 }}>
                  <a
                    href={convocatoriaUrl(c)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#1d1d1f', fontWeight: 600, textDecoration: 'none' }}
                    title={c.titulo}
                  >
                    {c.titulo || '(sin título)'}
                  </a>
                  {c.mrr && (
                    <span
                      title="Financiada por el Mecanismo de Recuperación y Resiliencia (NextGenerationEU)"
                      style={{
                        marginLeft: 7,
                        fontSize: 9,
                        fontWeight: 800,
                        color: '#7C3AED',
                        background: '#F5F3FF',
                        border: '1px solid #DDD6FE',
                        borderRadius: 999,
                        padding: '1px 6px',
                        verticalAlign: 'middle',
                      }}
                    >
                      MRR
                    </span>
                  )}
                  {c.match && c.match !== '' && (
                    <span style={{ marginLeft: 6, fontSize: 9, color: '#9CA3AF' }}>· match {c.match}</span>
                  )}
                </td>
                <td style={{ ...td, color: '#475569' }}>
                  {c.organo || c.territorio || '—'}
                </td>
                <td style={td}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: nivelColor(c.nivel),
                      background: '#F8FAFC',
                      border: `1px solid ${nivelColor(c.nivel)}33`,
                      borderRadius: 6,
                      padding: '1px 7px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {nivelLabel(c.nivel)}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                  {fmtFecha(c.fecha)}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <a
                    href={convocatoriaUrl(c)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: ACCENT, textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Ficha ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        BDNS · convocatorias/busqueda (keyless). El listado de convocatorias no expone importe ni
        beneficiario (esos datos viven en las concesiones, abajo). Importe, plazo de presentación y
        bases reguladoras están en la ficha pública de cada convocatoria.
      </p>
    </div>
  )
}

export default FinConvocatoriasTable
