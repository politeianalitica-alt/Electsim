'use client'
/**
 * <H2Roadmap /> · Vista Hidrógeno · Sprint Energía E8
 *
 * Roadmap regulatorio EU del HIDRÓGENO RENOVABLE (RFNBO · Renewable Fuels of
 * Non-Biological Origin). Timeline CURADO de la normativa que define qué cuenta
 * como hidrógeno renovable en la UE: la Directiva de Renovables RED II/III y los
 * dos Actos Delegados del art. 27(3) — el de PRODUCCIÓN (adicionalidad +
 * correlación temporal y geográfica) y el de METODOLOGÍA de cálculo de emisiones.
 *
 * Datos CURADOS y CITADOS (no inventados): cada hito lleva fecha y `fuente_url`
 * a EUR-Lex / Comisión Europea. Es regulación, no hay API live → catálogo datado
 * (spec §2: lo inevitablemente curado se mantiene con fuente y fecha visibles).
 *
 * Cero emojis · Unicode geométrico (◆ ⬢ ⟶ ✓). NO toca lib/api/shared/catalog/types.
 */
import { Panel } from '@/components/SectorPanel'

const H2 = '#0D9488'
const H2_DARK = '#115E59'

type HitoEstado = 'vigente' | 'futuro' | 'transitorio'

interface RoadmapHito {
  fecha: string // legible (ES)
  fecha_orden: string // ISO para ordenar
  titulo: string
  descripcion: string
  estado: HitoEstado
  etiqueta: string // chip corto
  fuente: string
  fuente_url: string
}

// ── Hitos RFNBO (curados · EUR-Lex / Comisión Europea) ──────────────────────
// Fechas verificables: RED II (2018/2001), Actos Delegados 2023/1184 y 2023/1185
// (publicados 20-jun-2023, en vigor 10-jul-2023), RED III (2023/2413, en vigor
// 20-nov-2023). Las fases de adicionalidad (transición hasta 2028, correlación
// mensual hasta 2030 → horaria desde 2030) provienen del Acto Delegado 2023/1184.
const HITOS: RoadmapHito[] = [
  {
    fecha: '11 dic 2018',
    fecha_orden: '2018-12-11',
    titulo: 'Directiva de Renovables RED II (2018/2001)',
    descripcion:
      'Introduce los RFNBO (combustibles renovables de origen no biológico) y manda a la Comisión definir, mediante actos delegados, las reglas para que el hidrógeno cuente como renovable.',
    estado: 'vigente',
    etiqueta: 'RED II',
    fuente: 'EUR-Lex · Directiva (UE) 2018/2001',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32018L2001',
  },
  {
    fecha: '20 jun 2023',
    fecha_orden: '2023-06-20',
    titulo: 'Acto Delegado de producción · adicionalidad y correlación (2023/1184)',
    descripcion:
      'Define cuándo la electricidad usada para producir H2 es "totalmente renovable": adicionalidad (nueva capacidad renovable), correlación TEMPORAL (mismo periodo) y GEOGRÁFICA (misma zona de precio o interconectada). Excepciones por red muy renovable o precio negativo.',
    estado: 'vigente',
    etiqueta: 'Art. 27(3) · producción',
    fuente: 'EUR-Lex · Reglamento Delegado (UE) 2023/1184',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1184',
  },
  {
    fecha: '20 jun 2023',
    fecha_orden: '2023-06-20',
    titulo: 'Acto Delegado de metodología · GEI ciclo de vida (2023/1185)',
    descripcion:
      'Fija la metodología para calcular la reducción de gases de efecto invernadero de los RFNBO: umbral mínimo del 70 % de ahorro de emisiones frente al combustible fósil de referencia en todo el ciclo de vida.',
    estado: 'vigente',
    etiqueta: 'Art. 28(5) · metodología',
    fuente: 'EUR-Lex · Reglamento Delegado (UE) 2023/1185',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1185',
  },
  {
    fecha: '10 jul 2023',
    fecha_orden: '2023-07-10',
    titulo: 'Entrada en vigor de ambos Actos Delegados',
    descripcion:
      'Los reglamentos 2023/1184 y 2023/1185 entran en vigor 20 días tras su publicación, dando seguridad jurídica al marco RFNBO para certificar hidrógeno renovable en la UE.',
    estado: 'vigente',
    etiqueta: 'En vigor',
    fuente: 'Comisión Europea · Energía · Hydrogen',
    fuente_url: 'https://energy.ec.europa.eu/topics/energy-systems-integration/hydrogen_en',
  },
  {
    fecha: '20 nov 2023',
    fecha_orden: '2023-11-20',
    titulo: 'Directiva de Renovables RED III (2023/2413)',
    descripcion:
      'Eleva el objetivo renovable de la UE a 2030 y fija metas vinculantes de RFNBO en industria y transporte: el 42 % del H2 usado en industria debe ser renovable en 2030 (60 % en 2035).',
    estado: 'vigente',
    etiqueta: 'RED III',
    fuente: 'EUR-Lex · Directiva (UE) 2023/2413',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023L2413',
  },
  {
    fecha: 'Hasta 1 ene 2028',
    fecha_orden: '2028-01-01',
    titulo: 'Fase transitoria de adicionalidad',
    descripcion:
      'Periodo transitorio: las instalaciones de electrólisis que entren en operación antes del 1 de enero de 2028 están exentas del requisito de adicionalidad (nueva capacidad renovable) hasta 2038, para impulsar el arranque del sector.',
    estado: 'transitorio',
    etiqueta: 'Transición',
    fuente: 'Reglamento Delegado (UE) 2023/1184 · art. 5',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1184',
  },
  {
    fecha: 'Hasta 31 dic 2029',
    fecha_orden: '2029-12-31',
    titulo: 'Correlación temporal MENSUAL',
    descripcion:
      'Durante el periodo transitorio (hasta final de 2029) la correlación temporal entre consumo eléctrico y generación renovable puede acreditarse a escala MENSUAL (más flexible).',
    estado: 'transitorio',
    etiqueta: 'Correlación mensual',
    fuente: 'Reglamento Delegado (UE) 2023/1184 · art. 6',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1184',
  },
  {
    fecha: 'Desde 1 ene 2030',
    fecha_orden: '2030-01-01',
    titulo: 'Correlación temporal HORARIA + metas RED III 2030',
    descripcion:
      'A partir del 1 de enero de 2030 la correlación temporal pasa a ser HORARIA (la electricidad renovable debe producirse en la misma hora que el consumo). Coincide con la meta vinculante del 42 % de H2 renovable en industria.',
    estado: 'futuro',
    etiqueta: 'Correlación horaria',
    fuente: 'Reglamento Delegado (UE) 2023/1184 + RED III',
    fuente_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1184',
  },
]

const ESTADO_COLOR: Record<HitoEstado, string> = {
  vigente: '#16A34A',
  transitorio: '#F59E0B',
  futuro: '#6366F1',
}
const ESTADO_LABEL: Record<HitoEstado, string> = {
  vigente: 'Vigente',
  transitorio: 'Transitorio',
  futuro: 'Futuro',
}

export function H2Roadmap() {
  const hitos = [...HITOS].sort((a, b) => a.fecha_orden.localeCompare(b.fecha_orden))

  return (
    <Panel
      title="Roadmap regulatorio UE · hidrógeno renovable (RFNBO)"
      subtitle="RED II/III + Actos Delegados de adicionalidad, correlación temporal/geográfica y metodología GEI · normativa curada y citada (EUR-Lex)"
      marginBottom
      sourceUrl="https://energy.ec.europa.eu/topics/energy-systems-integration/hydrogen_en"
      sourceTooltip="Comisión Europea · marco de hidrógeno renovable. Cada hito enlaza a su texto en EUR-Lex."
    >
      {/* Leyenda de estados */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {(['vigente', 'transitorio', 'futuro'] as HitoEstado[]).map((e) => (
          <div key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: ESTADO_COLOR[e] }} />
            <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>{ESTADO_LABEL[e]}</span>
          </div>
        ))}
      </div>

      {/* Timeline vertical */}
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Línea de tiempo */}
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: '#E2E8F0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hitos.map((h) => {
            const col = ESTADO_COLOR[h.estado]
            return (
              <div key={`${h.fecha_orden}-${h.titulo}`} style={{ position: 'relative' }}>
                {/* Nodo */}
                <span
                  style={{
                    position: 'absolute',
                    left: -23,
                    top: 4,
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: col,
                    border: '2px solid #fff',
                    boxShadow: `0 0 0 1px ${col}88`,
                  }}
                  aria-hidden="true"
                />
                <a
                  href={h.fuente_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #ECECEF',
                      borderLeft: `4px solid ${col}`,
                      borderRadius: 10,
                      padding: '11px 14px',
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: 'var(--font-display)' }}>{h.fecha}</span>
                          <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: col, background: `${col}15`, borderRadius: 4, padding: '1px 6px' }}>
                            {h.etiqueta}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.25 }}>{h.titulo}</p>
                      </div>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>{h.descripcion}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 9.5, color: '#94A3B8' }}>
                      <span aria-hidden="true" style={{ color: H2 }}>◆</span> {h.fuente} <span aria-hidden="true">⟶</span>
                    </p>
                  </div>
                </a>
              </div>
            )
          })}
        </div>
      </div>

      <p style={{ margin: '14px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.55 }}>
        <span aria-hidden="true" style={{ color: H2 }}>⬢</span> Marco RFNBO curado a partir de los textos
        oficiales de EUR-Lex y la Comisión Europea. Las reglas de adicionalidad y correlación
        determinan qué hidrógeno puede certificarse como renovable y, por tanto, optar a las metas RED III
        y a la prima del European Hydrogen Bank. Fechas y umbrales según los reglamentos citados; no
        constituye asesoramiento jurídico.
      </p>
    </Panel>
  )
}

export default H2Roadmap
