'use client'
/**
 * <AgroSequiaView /> · Agro v3 · Sprint A5
 *
 * Sequía estructural y agua: enlaces a ENESA (siniestralidad), MITECO
 * (estado de embalses) y AEMET (mapas de sequía). Por ahora una vista
 * estática con enlaces verificables. En sprints futuros se podría tirar
 * del endpoint `embalses` de MITECO si tiene CSV abierto.
 */
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero } from '@/lib/sectores/charts'

const ACCENT = '#B45309'

export function AgroSequiaView() {
  const sequia = AREAS_AGRO.find((a) => a.id === 'sequia_agua')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · SEQUÍA · AGUA · RIESGO ESTRUCTURAL"
        titulo="Sequía estructural y respuesta política"
        descripcion="Estado de embalses, declaraciones de emergencia hídrica, indemnizaciones del sistema de seguros agrarios y trasvases. Sin métricas inventadas: cada cifra se consulta en su fuente primaria desde aquí."
        colorFrom={ACCENT}
        colorTo="#78350F"
      />

      {sequia && (
        <Panel titulo={sequia.titulo} fuente="Catálogo áreas · resumen sectorial" url="https://www.miteco.gob.es/">
          <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: 0, lineHeight: 1.55 }}>{sequia.descripcion}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {sequia.keywords.map((k) => (
              <span
                key={k}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  background: `${ACCENT}20`,
                  color: ACCENT,
                  padding: '2px 7px',
                  borderRadius: 999,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        titulo="Fuentes oficiales para el seguimiento de la sequía"
        fuente="MITECO + ENESA + AEMET"
        url="https://www.miteco.gob.es/es/agua/temas/sistema-espaniol-gestion-agua/"
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              t: 'MITECO · Boletín hidrológico semanal',
              d: 'Estado de las reservas de las cuencas hidrográficas españolas y porcentaje de llenado por confederación. Publicación semanal en abierto.',
              url: 'https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/',
            },
            {
              t: 'Confederación Hidrográfica del Guadalquivir',
              d: 'Confederación crítica para la sequía en Andalucía. Datos de embalses y restricciones de regadío.',
              url: 'https://www.chguadalquivir.es/saih/',
            },
            {
              t: 'Confederación Hidrográfica del Júcar',
              d: 'Estado de embalses y declaraciones de emergencia en el sureste peninsular.',
              url: 'https://aps.chj.es/idejucar/apps/portal/',
            },
            {
              t: 'ENESA · estadísticas del sistema de seguros agrarios',
              d: 'Pólizas, capital asegurado e indemnizaciones por sequía, helada, pedrisco y otros riesgos. Series anuales por comunidad autónoma y por línea de seguro.',
              url: 'https://www.enesa.gob.es/web/en/area-estadistica/',
            },
            {
              t: 'AEMET · resumen climático y mapas de sequía',
              d: 'Resumen meteorológico mensual y trimestral con anomalías de precipitación y temperatura. Mapas de indicadores de sequía (SPI, SPEI).',
              url: 'https://www.aemet.es/es/serviciosclimaticos/datosclimatologicos',
            },
            {
              t: 'BOE · Real Decreto-ley 4/2023 (sequía)',
              d: 'Marco normativo del paquete de respuesta a la sequía estructural: ayudas, flexibilidad PAC, infraestructuras de desalación, transferencias hidrológicas.',
              url: 'https://www.boe.es/eli/es/rdl/2023/05/11/4/con',
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
    </div>
  )
}
