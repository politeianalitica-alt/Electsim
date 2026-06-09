'use client'
/**
 * <FarmaMercadoView /> · Farma v3 · Sprint F2
 *
 * Vista del mercado financiero del sector farma español:
 *   1. Catálogo de empresas cotizadas (Grifols, Almirall, Rovi, …)
 *      leído desde `lib/farma/catalogos/empresas-cotizadas.json`.
 *      Cada entrada con ticker + segmento + área terapéutica + CNMV URL.
 *   2. Agrupación por área terapéutica (oncología, biotech, neurología, …)
 *      cruzando empresa.area_terapeutica con AREAS_TERAPEUTICAS.
 *
 * El precio / capitalización en vivo no se inventa: se enlaza al CNMV y
 * Yahoo desde cada tarjeta para verificación directa del analista.
 */
import { EMPRESAS_FARMA, AREAS_TERAPEUTICAS, type EmpresaCotizada } from '@/lib/farma/catalogos'
import { Panel, SectorHero } from '@/lib/sectores/charts'

const ACCENT = '#0EA5E9'

export function FarmaMercadoView() {
  // Agrupar empresas por área terapéutica (una empresa puede aparecer en varias)
  const porArea: Record<string, EmpresaCotizada[]> = {}
  for (const e of EMPRESAS_FARMA) {
    for (const a of e.area_terapeutica) {
      if (!porArea[a]) porArea[a] = []
      porArea[a].push(e)
    }
  }
  // Mantener orden definido en el catálogo AREAS_TERAPEUTICAS
  const areasOrdenadas = AREAS_TERAPEUTICAS.map((a) => a.id).filter((id) => porArea[id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="FARMA · MERCADO · COTIZADAS Y SEGMENTOS"
        titulo="Quién cotiza y en qué nicho terapéutico"
        descripcion="Empresas farmacéuticas y biotecnológicas españolas con cotización pública (Mercado Continuo + BME Growth). Cada ficha con ticker, segmento, CNMV y área terapéutica. La capitalización en vivo se consulta directamente en CNMV o Yahoo desde cada tarjeta · no se inventa."
        colorFrom={ACCENT}
        colorTo="#075985"
      />

      <Panel
        titulo={`Empresas cotizadas · ${EMPRESAS_FARMA.length} compañías`}
        fuente="Catálogo Politeia · CNMV / portales emisores"
        url="https://www.cnmv.es/portal/Consultas/Listado_Entidades.aspx"
      >
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 10,
          }}
        >
          {EMPRESAS_FARMA.map((e) => (
            <li key={e.id}>
              <a
                href={e.web || e.cnmv_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  background: '#FAFAFA',
                  borderRadius: 10,
                  border: '1px solid #ECECEF',
                  borderLeft: `3px solid ${ACCENT}`,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 14, color: '#1d1d1f' }}>
                    {e.nombre}
                  </span>
                  {e.ibex && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#FCD34D', color: '#92400E' }}>
                      IBEX 35
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#86868b', fontFamily: 'monospace', marginTop: 2 }}>
                  {e.ticker} · {e.mercado}
                </div>
                <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{e.descripcion}</div>
                <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 700, marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {e.segmento}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {e.area_terapeutica.map((a) => (
                    <span
                      key={a}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        background: '#E0F2FE',
                        color: '#075985',
                        padding: '2px 7px',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {a.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        titulo="Concentración por área terapéutica"
        fuente="Catálogo Politeia · cruce empresa × área"
        url="https://www.cnmv.es/"
      >
        {areasOrdenadas.length === 0 ? (
          <div style={{ fontSize: 12, color: '#86868b' }}>Sin asignación de áreas en el catálogo.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {areasOrdenadas.map((aid) => {
              const meta = AREAS_TERAPEUTICAS.find((a) => a.id === aid)
              const empresas = porArea[aid]
              return (
                <div
                  key={aid}
                  style={{
                    padding: '12px 14px',
                    background: '#FAFAFA',
                    borderRadius: 10,
                    border: '1px solid #ECECEF',
                    borderLeft: `3px solid ${meta?.color || '#999'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>
                      {meta?.titulo || aid}
                    </span>
                    <span style={{ fontSize: 11, color: meta?.color || '#666', fontWeight: 700 }}>
                      {empresas.length} cotizada{empresas.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {meta?.descripcion && (
                    <div style={{ fontSize: 11, color: '#3a3a3d', marginBottom: 6, lineHeight: 1.45 }}>{meta.descripcion}</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {empresas.map((e) => (
                      <a
                        key={e.id}
                        href={e.cnmv_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          background: '#fff',
                          border: '1px solid #ECECEF',
                          borderRadius: 999,
                          color: '#1d1d1f',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        {e.nombre} · {e.ticker}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
