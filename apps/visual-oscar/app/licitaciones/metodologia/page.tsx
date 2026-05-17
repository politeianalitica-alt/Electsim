'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import LicitacionesNav from '@/components/LicitacionesNav'
import { SOURCES } from '@/lib/socrata-catalunya'

export default function MetodologiaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:980, margin:'0 auto', padding:'24px 28px 80px' }}>
        <LicitacionesNav/>
        <article style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'34px 40px' }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.02em', margin:'0 0 14px' }}>
            Metodología
          </h1>
          <p style={{ fontSize:14, lineHeight:1.6, color:'#3a3a3d', margin:'0 0 18px' }}>
            Agregamos en tiempo real las APIs públicas oficiales de contratación pública española y europea.
            Cada fuente se consulta directamente desde su endpoint open-data sin descargas batch ni caché propio,
            con fan-out paralelo y normalización a un schema canónico común.
          </p>

          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, margin:'24px 0 10px' }}>Fuentes oficiales</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #ECECEF' }}>
                <th style={{ textAlign:'left', padding:'8px 4px', fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>Fuente</th>
                <th style={{ textAlign:'left', padding:'8px 4px', fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>Estado</th>
                <th style={{ textAlign:'left', padding:'8px 4px', fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase' }}>Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(s => (
                <tr key={s.code} style={{ borderBottom:'1px solid #F5F5F7' }}>
                  <td style={{ padding:'10px 4px' }}>{s.label}</td>
                  <td style={{ padding:'10px 4px' }}>
                    <span style={{
                      fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:999,
                      background: s.activa ? '#16A34A20' : '#F5F5F7',
                      color: s.activa ? '#16A34A' : '#86868b',
                      border:`1px solid ${s.activa ? '#16A34A40' : '#DCDCE0'}`,
                    }}>{s.activa ? 'EN VIVO' : 'PRÓXIMAMENTE'}</span>
                  </td>
                  <td style={{ padding:'10px 4px', fontFamily:'monospace', fontSize:11, color:'#6e6e73' }}>
                    {ENDPOINT_LABEL[s.code] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, margin:'30px 0 10px' }}>Schema canónico</h2>
          <p style={{ fontSize:13, lineHeight:1.6, color:'#3a3a3d', margin:'0 0 10px' }}>
            Cada contrato se normaliza al siguiente modelo común para que la búsqueda y los screeners
            sean agnósticos de la fuente:
          </p>
          <pre style={{ background:'#F5F5F7', padding:14, borderRadius:8, fontSize:11.5, lineHeight:1.5, color:'#3a3a3d', overflow:'auto' }}>
{`id, fuente, fuente_label, expediente, organo, organo_dir3, ambito,
objeto, tipo_contrato, procedimiento, cpv, cpv_div, lugar_ejecucion,
importe_licitacion, importe_adjudicacion, importe_adjudicacion_iva,
adjudicatario, adjudicatario_nif, ofertas_recibidas, estado, es_pyme,
fecha_publicacion, fecha_adjudicacion, fecha_formalizacion, anio, url`}
          </pre>

          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, margin:'30px 0 10px' }}>API pública</h2>
          <ul style={{ fontSize:13, lineHeight:1.7, color:'#3a3a3d', paddingLeft:20 }}>
            <li><code style={kStyle}>GET /api/licitaciones/buscar</code> · búsqueda principal con todos los filtros</li>
            <li><code style={kStyle}>GET /api/licitaciones/screener/empresas</code> · top adjudicatarios</li>
            <li><code style={kStyle}>GET /api/licitaciones/screener/organos</code> · top órganos contratantes</li>
            <li><code style={kStyle}>GET /api/licitaciones/screener/cpv</code> · top divisiones CPV</li>
            <li><code style={kStyle}>GET /api/licitaciones/adjudicatario/{`{nif}`}</code> · ficha de empresa</li>
            <li><code style={kStyle}>GET /api/licitaciones/organo/{`{id}`}</code> · ficha de órgano</li>
            <li><code style={kStyle}>GET /api/licitaciones/distribucion-anio</code> · serie temporal</li>
          </ul>

          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, margin:'30px 0 10px' }}>Roadmap fuentes</h2>
          <p style={{ fontSize:13, lineHeight:1.6, color:'#3a3a3d', margin:0 }}>
            Próximas integraciones: PLACSP completo (no solo atom de últimas), Madrid Ayto (datos.madrid.es CSV),
            Madrid CAM (scraping antibot), Galicia (DataTables API), Valencia (CKAN), Euskadi (API REST), Andalucía
            (Elasticsearch proxy), Asturias y TED europeo. Se cargarán bajo demanda con cache 10 min en CDN.
          </p>
        </article>
      </main>
    </div>
  )
}

const ENDPOINT_LABEL: Record<string, string> = {
  CATALUNYA_SOCRATA: 'analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json',
  PLACSP: 'contrataciondelestado.es/sindicacion/sindicacion_643/...atom',
  MADRID_AYTO: 'datos.madrid.es',
  MADRID_CAM: 'contratos-publicos.comunidad.madrid',
  GALICIA: 'contratosdegalicia.gal',
  ANDALUCIA: 'juntadeandalucia.es/contratacion',
  EUSKADI: 'opendata.euskadi.eus',
  VALENCIA: 'dadesobertes.gva.es',
  ASTURIAS: 'sede.asturias.es',
  TED: 'ted.europa.eu/api/v3',
}

const kStyle: React.CSSProperties = {
  fontFamily:'monospace', fontSize:12, padding:'1px 6px',
  background:'#F5F5F7', borderRadius:4, color:'#5B21B6',
}
