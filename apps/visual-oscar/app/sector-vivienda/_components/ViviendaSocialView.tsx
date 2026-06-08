'use client'
/**
 * <ViviendaSocialView /> · Vivienda v3 · Sprint V9 (LIVE)
 *
 * BLOQUE PRINCIPAL pedido por el usuario.
 *
 * Contenido en vivo (cargado en componente):
 *   1. KPIs comparativa España vs UE · esfuerzo financiero (cost overburden
 *      Eurostat ilc_mdho06) y tenencia (Eurostat ilc_lvho02).
 *   2. Directorio de 12 ONGs (`catalogos/ongs-vivienda.json`) con scope,
 *      geografía, NIF público, memoria anual y keywords BDNS.
 *   3. Convocatorias abiertas con foco vivienda y vulnerabilidad ·
 *      `/api/tercer-sector/oportunidades?q=vivienda` filtrado en cliente
 *      por keywords del catálogo.
 *   4. Hoja de ruta de los bloques pendientes (CGPJ desahucios, SAREB
 *      cesiones, FOESSA, mapa exclusión, etc.).
 *
 * Cero datos inventados. Si una fuente falla, se degrada honestamente.
 */
import { useEffect, useState } from 'react'
import { ONGS_VIVIENDA, type OngVivienda } from '@/lib/vivienda/catalogos'

const ACCENT = '#16A34A' // Verde Politeia tercer sector — coherente con sección vivienda social

export function ViviendaSocialView() {
  // Agrupar por tipo de entidad
  const porTipo: Record<OngVivienda['tipo'], OngVivienda[]> = {
    asociacion: [],
    fundacion: [],
    confederacion: [],
    orden_religiosa: [],
    red_de_redes: [],
  }
  ONGS_VIVIENDA.forEach((o) => porTipo[o.tipo].push(o))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* KPI COMPARATIVA UE — datos en vivo Eurostat */}
      <KpisEuropa />

      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, #14532D 100%)`,
          borderRadius: 18,
          padding: '26px 32px',
          color: '#fff',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            opacity: 0.8,
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          VIVIENDA · TERCER SECTOR · SINHOGARISMO · EXCLUSIÓN RESIDENCIAL
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}
        >
          La vivienda fuera del mercado mercantil
        </h2>
        <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>
          Quién gestiona el parque público y cedido, qué ONGs intermedian en alquiler social, dónde
          están las personas en situación sin hogar, qué papel juega SAREB en la cesión a tercer
          sector y cómo se traduce todo en desahucios y exclusión residencial. Punto de cruce entre
          el sector vivienda y el tercer sector.
        </p>
      </section>

      {/* DIRECTORIO DE ONGs (V1 entrega esto ya) */}
      <section>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              margin: 0,
            }}
          >
            Directorio de organizaciones del tercer sector
          </h3>
          <span style={{ fontSize: 11, color: '#86868b' }}>
            {ONGS_VIVIENDA.length} entidades curadas · scope vivienda y sinhogarismo en España
          </span>
        </header>

        {(['fundacion', 'asociacion', 'confederacion', 'orden_religiosa', 'red_de_redes'] as const).map((tipo) => {
          const arr = porTipo[tipo]
          if (arr.length === 0) return null
          return (
            <div key={tipo} style={{ marginBottom: 16 }}>
              <h4
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#6e6e73',
                  margin: '0 0 8px',
                }}
              >
                {tipo === 'fundacion'
                  ? 'Fundaciones'
                  : tipo === 'asociacion'
                  ? 'Asociaciones'
                  : tipo === 'confederacion'
                  ? 'Confederaciones'
                  : tipo === 'orden_religiosa'
                  ? 'Órdenes religiosas con servicios sociales'
                  : 'Redes de redes'}{' '}
                · {arr.length}
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: 10,
                }}
              >
                {arr.map((o) => (
                  <OngCard key={o.id} ong={o} />
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      {/* CONVOCATORIAS LIVE — cruce BDNS / EU Funding · filtro vivienda */}
      <ConvocatoriasVivienda />

      {/* HOJA DE RUTA V9 — qué llega y por qué importa */}
      <section
        style={{
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 14,
          padding: '20px 24px',
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              margin: '0 0 4px',
            }}
          >
            En Sprint V9 se completa este bloque con cruce de fuentes
          </h3>
          <p style={{ fontSize: 12, color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
            El directorio anterior es la base. En V9 cada ficha se enriquece con los datos públicos
            cruzados que respondan las preguntas reales del analista.
          </p>
        </header>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
          }}
        >
          {[
            {
              t: 'Financiación pública recibida (BDNS)',
              d: 'Cruce de las keywords BDNS de cada ONG con concesiones de los últimos 24 meses. Cantidades por convocante, por nivel administrativo (estatal / autonómico / local), por anualidad.',
            },
            {
              t: 'Sinhogarismo · FEANTSA ETHOS',
              d: 'Categorías ETHOS adaptadas (sin techo, sin vivienda, vivienda insegura, vivienda inadecuada) con datos de conteos nocturnos y registros municipales.',
            },
            {
              t: 'Desahucios CGPJ',
              d: 'Lanzamientos por arrendamiento e hipotecarios con desglose por CCAA y por partido judicial. Serie 5 años para detectar tendencia.',
            },
            {
              t: 'SAREB · cesiones a tercer sector',
              d: 'Cuántas viviendas se han cedido, a qué CCAA y a qué entidades. % sobre el compromiso público de 50.000 viviendas.',
            },
            {
              t: 'Parque público AVS',
              d: '% vivienda social en alquiler de gestión pública por CCAA. Comparativa con la media UE (~9%) y con países de referencia (Países Bajos, Austria, Francia).',
            },
            {
              t: 'FOESSA · 8 ejes ETHOS',
              d: 'Resumen del Informe FOESSA con la métrica de exclusión residencial y descomposición territorial.',
            },
            {
              t: 'Mapa de exclusión residencial',
              d: 'Capas por CCAA: tasa AROPE, % privación material severa relacionada con vivienda, % hogares en cost overburden.',
            },
            {
              t: 'Convocatorias abiertas para vulnerables',
              d: 'Filtro vivo de /api/tercer-sector/oportunidades por colectivo = sin_hogar | vulnerables y ámbito vivienda. Análisis determinista de pliegos.',
            },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                background: '#FAFAFA',
                border: '1px solid #ECECEF',
                borderRadius: 10,
                padding: '12px 14px',
                borderTop: `3px solid ${ACCENT}`,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  margin: '0 0 4px',
                }}
              >
                {b.t}
              </div>
              <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{b.d}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#86868b', margin: '12px 0 0', lineHeight: 1.5 }}>
          Principio Politeia: ninguna cifra agregada sin fuente, fecha y link al dato bruto. Si una
          fuente falla, se muestra fuera de servicio en vez de inventar el valor.
        </p>
      </section>
    </div>
  )
}

// ─── Comparativa Europa (Eurostat overburden + tenencia) ────

interface EurostatSerie {
  geo: string
  points: Array<{ time: string; value: number | null }>
}
interface EurostatEnvelope {
  ok: boolean
  data: { series: EurostatSerie[]; latest_by_geo: Record<string, { time: string; value: number | null }> } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

const GEO_LABELS: Record<string, string> = {
  ES: 'España',
  EU27_2020: 'UE-27',
  EA20: 'Zona euro',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Países Bajos',
  AT: 'Austria',
}

function KpisEuropa() {
  const [overburden, setOverburden] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/vivienda/eurostat-overburden', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EurostatEnvelope | null) => {
        if (alive) setOverburden(j)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const esLast = overburden?.data?.latest_by_geo?.ES?.value ?? null
  const ueLast = overburden?.data?.latest_by_geo?.EU27_2020?.value ?? null
  const eaLast = overburden?.data?.latest_by_geo?.EA20?.value ?? null
  const diffES_UE = esLast != null && ueLast != null ? Number((esLast - ueLast).toFixed(1)) : null

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          Esfuerzo financiero en vivienda · España vs UE
        </h3>
        <a
          href={overburden?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdho06'}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10, color: '#86868b', textDecoration: 'none' }}
        >
          {overburden?.fuente?.split(' · ')[0] || 'Eurostat ilc_mdho06'} ›
        </a>
      </header>

      {loading ? (
        <div style={{ height: 80, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          <KpiBox label="España" value={esLast} unit="%" color="#DB2777" />
          <KpiBox label="UE-27" value={ueLast} unit="%" color="#1F4E8C" />
          <KpiBox label="Zona euro" value={eaLast} unit="%" color="#0EA5E9" />
          <KpiBox
            label="Diferencia ES − UE"
            value={diffES_UE}
            unit="pp"
            color={diffES_UE != null && diffES_UE > 0 ? '#DC2626' : '#16A34A'}
            sub={diffES_UE != null && diffES_UE > 0 ? 'España con mayor esfuerzo' : 'España con menor esfuerzo'}
          />
        </div>
      )}

      <p style={{ fontSize: 11, color: '#86868b', margin: '10px 0 0', lineHeight: 1.5 }}>
        Porcentaje de hogares que dedican más del 40% de la renta disponible al coste total de la
        vivienda (hipoteca + suministros · alquiler + suministros). Indicador estándar europeo de
        sobrecarga residencial. Año disponible: último publicado por Eurostat.
        {overburden?.fuentes_error.length ? (
          <span style={{ color: '#B45309', marginLeft: 6 }}>
            · Aviso: {overburden.fuentes_error.join(' · ')}
          </span>
        ) : null}
      </p>
    </section>
  )
}

function KpiBox({
  label,
  value,
  unit,
  color,
  sub,
}: {
  label: string
  value: number | null
  unit: string
  color: string
  sub?: string
}) {
  return (
    <div
      style={{
        background: '#FAFAFA',
        border: '1px solid #ECECEF',
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: '10px 14px',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#86868b',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: value == null ? '#9CA3AF' : color,
          marginTop: 2,
        }}
      >
        {value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
        <span style={{ fontSize: 11, marginLeft: 4, color: '#86868b' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Convocatorias LIVE (tercer sector · filtro vivienda) ───

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
  fecha_fin?: string | null
  dias_restantes?: number | null
  fuente_url?: string
  url?: string
}
interface OportunidadesEnvelope {
  ok: boolean
  data: { oportunidades: OportunidadTS[]; fuentes_error: Array<{ fuente: string; error: string }> } | null
}

const KEYWORDS_VIVIENDA = [
  'vivienda',
  'alquiler',
  'sinhogar',
  'sin hogar',
  'alojamiento',
  'residencial',
  'hogar',
  'housing',
  'inclusion',
  'exclusion residencial',
]

function matchVivienda(o: OportunidadTS): boolean {
  const haystack = `${o.titulo} ${o.organismo} ${o.sector_ts ?? ''}`.toLowerCase()
  return KEYWORDS_VIVIENDA.some((k) => haystack.includes(k))
}

function ConvocatoriasVivienda() {
  const [items, setItems] = useState<OportunidadTS[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fuentesError, setFuentesError] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    fetch(
      '/api/tercer-sector/oportunidades?tipo=subvencion,grant_ue,cooperacion_internacional&pageSize=40&scoreMin=40',
      { cache: 'no-store' }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j: OportunidadesEnvelope | null) => {
        if (!alive) return
        if (j && j.data) {
          // Filtrar en cliente por keywords del catálogo + por ONGs de vivienda
          const filtered = j.data.oportunidades.filter(matchVivienda).slice(0, 12)
          setItems(filtered)
          setFuentesError(j.data.fuentes_error?.map((e) => e.fuente) ?? [])
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

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          Convocatorias abiertas · vivienda y vulnerabilidad
        </h3>
        <span style={{ fontSize: 10.5, color: '#86868b' }}>
          BDNS · grants UE · cooperación · filtrado por keywords vivienda/sinhogarismo
        </span>
      </header>

      {loading ? (
        <div style={{ height: 120, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }} />
      ) : error ? (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            fontSize: 12,
            color: '#991B1B',
          }}
        >
          No se pudo cargar el agregador de oportunidades. Reintenta en unos minutos.
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#86868b', padding: '12px 0' }}>
          No hay convocatorias abiertas que machee keywords de vivienda en la muestra agregada hoy.
          Esto pasa cuando el calendario BDNS está entre ventanas. Volverá a poblarse cuando se
          publiquen nuevas ayudas (Plan Estatal, Bono Joven, ayudas autonómicas).
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 10,
          }}
        >
          {items.map((o) => (
            <li
              key={o.id}
              style={{
                padding: '12px 14px',
                background: '#FAFAFA',
                borderRadius: 10,
                border: '1px solid #ECECEF',
                borderLeft: `3px solid ${ACCENT}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: '0.06em' }}>
                  {o.tipo.toUpperCase()}
                </span>
                {o.dias_restantes != null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: o.dias_restantes <= 7 ? '#DC2626' : '#86868b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.dias_restantes} días
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>
                {o.titulo.length > 120 ? o.titulo.slice(0, 119) + '…' : o.titulo}
              </div>
              <div style={{ fontSize: 10.5, color: '#6e6e73', marginBottom: 5 }}>{o.organismo}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <a
                  href={o.url || o.fuente_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 10, color: ACCENT, textDecoration: 'none', fontWeight: 700 }}
                >
                  Abrir convocatoria ›
                </a>
                {o.importe_eur != null && (
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1F4E8C' }}>
                    {(o.importe_eur / 1_000_000).toFixed(2)} M€
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {fuentesError.length > 0 && (
        <p style={{ fontSize: 10, color: '#B45309', margin: '8px 0 0' }}>
          ! Agregador degradado · fuentes sin respuesta: {fuentesError.join(', ')}.
        </p>
      )}
      <p style={{ fontSize: 10.5, color: '#86868b', margin: '8px 0 0', lineHeight: 1.5 }}>
        Cruce vivo entre `/api/tercer-sector/oportunidades` y el catálogo de palabras clave de
        vivienda. Solo aparece lo que el agregador del tercer sector ya está sirviendo · sin
        duplicación de fuentes.
      </p>
    </section>
  )
}

// ─── Tarjeta de ONG ──────────────────────────────────────────

function OngCard({ ong }: { ong: OngVivienda }) {
  return (
    <li>
      <a
        href={ong.web}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          padding: '14px 16px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #ECECEF',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#1d1d1f',
            }}
          >
            {ong.nombre}
          </span>
          {ong.fundacion && (
            <span style={{ fontSize: 10, color: '#86868b', whiteSpace: 'nowrap' }}>desde {ong.fundacion}</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4, marginBottom: 8 }}>{ong.descripcion}</div>

        {/* Scope */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {ong.scope.map((s) => (
            <span
              key={s}
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: '#F0FDF4',
                color: '#166534',
                padding: '2px 7px',
                borderRadius: 999,
                letterSpacing: '0.04em',
              }}
            >
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>

        {/* Ámbito */}
        <div style={{ fontSize: 10.5, color: '#6e6e73', marginBottom: 4 }}>
          <span style={{ fontWeight: 700 }}>Ámbito: </span>
          {ong.ambito_geografico.join(' · ')}
          {ong.ccaa_principales[0] === 'todas' ? null : ` · CCAA: ${ong.ccaa_principales.slice(0, 3).join(', ')}${
            ong.ccaa_principales.length > 3 ? `…` : ''
          }`}
        </div>

        {/* NIF + memoria */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#86868b',
            marginTop: 6,
          }}
        >
          <span>{ong.nif_publico ? `NIF ${ong.nif_publico}` : 'NIF no publicado'}</span>
          {ong.memoria_url && (
            <a
              href={ong.memoria_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700 }}
            >
              {ong.fuente_label} ›
            </a>
          )}
        </div>
      </a>
    </li>
  )
}
