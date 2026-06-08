'use client'
/**
 * <ViviendaSocialView /> · Vivienda v3 · Sprint V1 (PREVIEW) → V9 (FULL)
 *
 * BLOQUE PRINCIPAL pedido por el usuario.
 *
 * En V1 entregamos: directorio de ONGs leído desde `catalogos/ongs-vivienda.json`
 * (12 entidades curadas con scope, geografía, NIF público cuando consta,
 * memoria anual y keywords BDNS) y un mapa claro de qué llega en V9 (cruce
 * BDNS, desahucios CGPJ, FOESSA, FEANTSA ETHOS, SAREB cesiones).
 *
 * El usuario podrá usar el directorio desde V1 (ya tiene valor: scope, ámbito,
 * NIF para buscar en BDNS, link a memoria anual). En V9 cada ficha se cruzará
 * con BDNS y se cargará el resto del bloque (sinhogarismo, desahucios CGPJ,
 * SAREB cesiones, AVS parque, mapa exclusión residencial).
 *
 * Cero datos inventados. Si una ONG no tiene fundación documentada, queda
 * null y se muestra como "—".
 */
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
