'use client'
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero } from '@/lib/sectores/charts'

const ACCENT = '#16A34A'

export function AgroProduccionView() {
  const relevantes = AREAS_AGRO.filter((a) =>
    ['ganaderia_extensiva', 'frutas_hortalizas', 'vino_do'].includes(a.id)
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · PRODUCCIÓN Y EXPORTACIÓN"
        titulo="Qué produce España y dónde la vende"
        descripcion="Datos de producción agraria, ganadera y exportación viven en la Visión Global (World Bank + Comext). Esta sub-tab amplía con áreas estratégicas (ganadería extensiva, frutas y hortalizas, vino + DO) y enlaces oficiales a las series."
        colorFrom={ACCENT}
        colorTo="#14532D"
      />
      <Panel
        titulo="Áreas estratégicas de producción"
        fuente="Catálogo Politeia"
        url="https://www.mapa.gob.es/es/estadistica/"
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
            </li>
          ))}
        </ul>
      </Panel>
      <Panel titulo="Fuentes oficiales de producción y exportación" fuente="MAPA · Eurostat · Comext" url="https://www.mapa.gob.es/">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: 'MAPA · Anuario de Estadística Agraria', d: 'Producción, superficies cultivadas, censos ganaderos. Series anuales nacionales con desglose por provincia y CCAA.', url: 'https://www.mapa.gob.es/es/estadistica/temas/publicaciones/anuario-de-estadistica/' },
            { t: 'Eurostat · APRO_CPSH series', d: 'Producción de cultivos en cantidades físicas, anuales y por país EU-27. Útil para comparar producción de cereales, oleaginosas, frutas y hortalizas.', url: 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpsh1' },
            { t: 'Comext · estadísticas de comercio exterior UE', d: 'Exportaciones e importaciones agroalimentarias por código HS, país de destino, valor y volumen. Series mensuales.', url: 'https://ec.europa.eu/eurostat/web/international-trade-in-goods/data/database' },
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
