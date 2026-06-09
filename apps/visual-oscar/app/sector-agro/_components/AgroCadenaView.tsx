'use client'
/**
 * <AgroCadenaView /> · Agro v3 · Sprint A5
 *
 * Cadena de valor agroalimentaria + cruce con IPC alimentación.
 * Reusamos Eurostat hlth_silc no aplica · usamos el endpoint INE IPC
 * desagregado ya disponible en `/api/macro/...` si lo hay; si no,
 * llamamos directamente al servicio INE para grupos de alimentos.
 *
 * Por ahora: muestra el catálogo de áreas estratégicas (cadena_alimentaria,
 * aceite_oliva, frutas_hortalizas, porcino_export) y enlaza al INE
 * para validación independiente.
 */
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero } from '@/lib/sectores/charts'
import Link from 'next/link'

const ACCENT = '#5B21B6'

export function AgroCadenaView() {
  const relevantes = AREAS_AGRO.filter(
    (a) => ['cadena_alimentaria', 'aceite_oliva', 'porcino_export', 'frutas_hortalizas'].includes(a.id)
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · CADENA DE VALOR · DESDE ORIGEN A MESA"
        titulo="Quién captura el valor en la cadena alimentaria"
        descripcion="Foco en la Ley de la Cadena Alimentaria 12/2013, el observatorio AICA y la diferencia entre precio en origen, mayorista y precio al consumidor. Sin métricas inventadas: la comparativa exacta vive en el observatorio MAPA y AICA."
        colorFrom={ACCENT}
        colorTo="#3B0764"
      />

      <Panel
        titulo="Áreas estratégicas en la cadena"
        fuente="Catálogo Politeia · áreas-agro"
        url="https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/"
      >
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
          }}
        >
          {relevantes.map((a) => (
            <li
              key={a.id}
              style={{
                background: '#FAFAFA',
                border: '1px solid #ECECEF',
                borderLeft: `3px solid ${a.color}`,
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>
                {a.titulo}
              </div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 5, lineHeight: 1.45 }}>{a.descripcion}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {a.keywords.slice(0, 3).map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: `${a.color}20`,
                      color: a.color,
                      padding: '2px 7px',
                      borderRadius: 999,
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        titulo="Fuentes oficiales para profundizar"
        fuente="MAPA + AICA + INE"
        url="https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/"
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              t: 'Observatorio de Precios MAPA',
              d: 'Precios semanales de productos representativos en origen, mayorista y consumo. Series desde 2008 publicadas en PDF y CSV.',
              url: 'https://www.mapa.gob.es/es/alimentacion/temas/observatorio-precios/',
            },
            {
              t: 'AICA · Agencia de Información y Control Alimentarios',
              d: 'Verifica el cumplimiento de la Ley 12/2013 de la Cadena Alimentaria. Resoluciones sancionadoras y observatorio de contratos.',
              url: 'https://www.aica.gob.es/',
            },
            {
              t: 'INE · IPC desagregado · alimentación',
              d: 'Índice de Precios de Consumo de la rúbrica de Alimentos y Bebidas no Alcohólicas. Serie mensual con desglose por subgrupo.',
              url: 'https://www.ine.es/dynt3/inebase/index.htm?padre=1426',
            },
            {
              t: 'Eurostat · prc_hicp_manr · inflación armonizada agro-alimentaria',
              d: 'Comparativa armonizada con la UE de la rúbrica alimentación. Útil para situar la inflación alimentaria española en contexto europeo.',
              url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',
            },
          ].map((f, i) => (
            <li key={i} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF' }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f' }}>{f.t}</div>
                <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 3, lineHeight: 1.45 }}>{f.d}</div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, marginTop: 5 }}>{f.url}</div>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <section style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 18px' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13 }}>¿Inflación alimentaria? El IPC vive en /macro</p>
        <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5, maxWidth: 760 }}>
          Para no duplicar contenido, la inflación alimentaria con IPC desagregado, comparativa europea armonizada y curvas
          subyacente / energía / alimentos se mantiene en{' '}
          <Link href="/macro" style={{ color: '#854D0E', fontWeight: 700 }}>
            /macro
          </Link>
          . Aquí solo enlazamos cuando es necesario para el análisis sectorial.
        </p>
        <Link
          href="/macro"
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: '#FDE047',
            color: '#854D0E',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 11.5,
          }}
        >
          Abrir /macro · IPC alimentación ›
        </Link>
      </section>
    </div>
  )
}
