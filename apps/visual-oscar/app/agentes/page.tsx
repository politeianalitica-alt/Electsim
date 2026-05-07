'use client'
import AppHeader from '../_components/AppHeader'
import { useMemo, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Datos base de los 100 actores
// ─────────────────────────────────────────────────────────────────────────
type Categoria = 'gobierno' | 'oposicion' | 'parlamento' | 'autonomico' | 'municipal' | 'institucion' | 'patronal' | 'sindicato' | 'mediatico' | 'europa'

type ActorBase = { nombre: string; partido: string; cargo: string; cat: Categoria }

const PARTY_COLOR: Record<string, string> = {
  'PSOE':'#E1322D', 'PSC':'#E1322D', 'PSC-PSOE':'#E1322D',
  'PP':'#1F4E8C',
  'VOX':'#5BA02E',
  'Sumar':'#D43F8D',
  'Junts':'#1FA89B', 'JxCat':'#1FA89B',
  'ERC':'#E8A030',
  'EH Bildu':'#3F7A3A',
  'PNV':'#7DB94B', 'EAJ-PNV':'#7DB94B',
  'BNG':'#5BB3D9',
  'CC':'#F2C43A',
  'UPN':'#0E7D8C',
  'Compromís':'#FF8200',
  'Podemos':'#6C2C5E',
  'Independiente':'#6e6e73',
  'Casa Real':'#7C3AED',
  'CGPJ':'#7C3AED', 'TC':'#7C3AED', 'TS':'#7C3AED', 'Fiscalía':'#7C3AED',
  'BdE':'#0F766E', 'BEI':'#0F766E',
  'CEOE':'#0E7490', 'CEPYME':'#0E7490', 'ATA':'#0E7490',
  'CCOO':'#A02525', 'UGT':'#A02525',
  'Medios':'#525258',
}

const ACTORES: ActorBase[] = [
  // 1-24 Gobierno
  { nombre:'Pedro Sánchez',         partido:'PSOE',  cargo:'Presidente del Gobierno',                       cat:'gobierno' },
  { nombre:'Alberto Núñez Feijóo',  partido:'PP',    cargo:'Presidente del PP y líder de la oposición',     cat:'oposicion' },
  { nombre:'Santiago Abascal',      partido:'VOX',   cargo:'Presidente de VOX',                              cat:'oposicion' },
  { nombre:'Yolanda Díaz',          partido:'Sumar', cargo:'Vicepresidenta 2ª y referente de Sumar',         cat:'gobierno' },
  { nombre:'María Jesús Montero',   partido:'PSOE',  cargo:'Vicepresidenta 1ª y ministra de Hacienda',       cat:'gobierno' },
  { nombre:'Carlos Cuerpo',         partido:'PSOE',  cargo:'Ministro de Economía, Comercio y Empresa',       cat:'gobierno' },
  { nombre:'Félix Bolaños',         partido:'PSOE',  cargo:'Ministro de Presidencia, Justicia y Cortes',     cat:'gobierno' },
  { nombre:'José Manuel Albares',   partido:'PSOE',  cargo:'Ministro de Asuntos Exteriores, UE y Cooperación', cat:'gobierno' },
  { nombre:'Margarita Robles',      partido:'PSOE',  cargo:'Ministra de Defensa',                            cat:'gobierno' },
  { nombre:'Fernando Grande-Marlaska', partido:'PSOE', cargo:'Ministro del Interior',                        cat:'gobierno' },
  { nombre:'Óscar Puente',          partido:'PSOE',  cargo:'Ministro de Transportes y Movilidad',            cat:'gobierno' },
  { nombre:'Pilar Alegría',         partido:'PSOE',  cargo:'Ministra de Educación · portavoz del PSOE',      cat:'gobierno' },
  { nombre:'Sara Aagesen',          partido:'PSOE',  cargo:'Vicepresidenta 3ª y ministra de Transición Ecológica', cat:'gobierno' },
  { nombre:'Luis Planas',           partido:'PSOE',  cargo:'Ministro de Agricultura, Pesca y Alimentación',  cat:'gobierno' },
  { nombre:'Ángel Víctor Torres',   partido:'PSOE',  cargo:'Ministro de Política Territorial y Memoria Democrática', cat:'gobierno' },
  { nombre:'Isabel Rodríguez',      partido:'PSOE',  cargo:'Ministra de Vivienda y Agenda Urbana',           cat:'gobierno' },
  { nombre:'Mónica García',         partido:'Sumar', cargo:'Ministra de Sanidad',                            cat:'gobierno' },
  { nombre:'Diana Morant',          partido:'PSOE',  cargo:'Ministra de Ciencia, Innovación y Universidades', cat:'gobierno' },
  { nombre:'Elma Saiz',             partido:'PSOE',  cargo:'Ministra de Inclusión, Seguridad Social y Migraciones', cat:'gobierno' },
  { nombre:'Ana Redondo',           partido:'PSOE',  cargo:'Ministra de Igualdad',                           cat:'gobierno' },
  { nombre:'Pablo Bustinduy',       partido:'Sumar', cargo:'Ministro de Derechos Sociales y Consumo',        cat:'gobierno' },
  { nombre:'Sira Rego',             partido:'Sumar', cargo:'Ministra de Juventud e Infancia',                cat:'gobierno' },
  { nombre:'Ernest Urtasun',        partido:'Sumar', cargo:'Ministro de Cultura',                            cat:'gobierno' },
  { nombre:'Óscar López',           partido:'PSOE',  cargo:'Ministro de Transformación Digital y Función Pública', cat:'gobierno' },

  // 25-31 Mesas y portavoces
  { nombre:'Francina Armengol',          partido:'PSOE',  cargo:'Presidenta del Congreso de los Diputados', cat:'parlamento' },
  { nombre:'Pedro Rollán',               partido:'PP',    cargo:'Presidente del Senado',                    cat:'parlamento' },
  { nombre:'Cuca Gamarra',               partido:'PP',    cargo:'Dirigente del PP · figura parlamentaria',  cat:'parlamento' },
  { nombre:'Miguel Tellado',             partido:'PP',    cargo:'Secretario general del PP',                cat:'oposicion' },
  { nombre:'Patxi López',                partido:'PSOE',  cargo:'Portavoz del PSOE en el Congreso',         cat:'parlamento' },
  { nombre:'María José Rodríguez de Millán', partido:'VOX', cargo:'Portavoz de VOX en el Congreso',         cat:'parlamento' },
  { nombre:'Pepa Millán',                partido:'VOX',   cargo:'Voz mediática y parlamentaria de VOX',     cat:'parlamento' },

  // 32-50 Otros líderes y portavoces
  { nombre:'Ione Belarra',          partido:'Podemos',  cargo:'Secretaria general de Podemos',                cat:'parlamento' },
  { nombre:'Irene Montero',         partido:'Podemos',  cargo:'Eurodiputada · referente Podemos',             cat:'europa' },
  { nombre:'Carles Puigdemont',     partido:'Junts',    cargo:'Líder de Junts per Catalunya',                 cat:'oposicion' },
  { nombre:'Jordi Turull',          partido:'Junts',    cargo:'Secretario general de Junts',                  cat:'parlamento' },
  { nombre:'Miriam Nogueras',       partido:'Junts',    cargo:'Portavoz de Junts en el Congreso',             cat:'parlamento' },
  { nombre:'Oriol Junqueras',       partido:'ERC',      cargo:'Presidente de ERC',                            cat:'oposicion' },
  { nombre:'Gabriel Rufián',        partido:'ERC',      cargo:'Portavoz de ERC en el Congreso',               cat:'parlamento' },
  { nombre:'Marta Rovira',          partido:'ERC',      cargo:'Dirigente estratégica de ERC',                 cat:'oposicion' },
  { nombre:'Arnaldo Otegi',         partido:'EH Bildu', cargo:'Coordinador general de EH Bildu',              cat:'oposicion' },
  { nombre:'Mertxe Aizpurua',       partido:'EH Bildu', cargo:'Portavoz de EH Bildu en el Congreso',          cat:'parlamento' },
  { nombre:'Aitor Esteban',         partido:'PNV',      cargo:'Portavoz histórico del PNV en el Congreso',    cat:'parlamento' },
  { nombre:'Andoni Ortuzar',        partido:'PNV',      cargo:'Presidente del EBB del PNV',                   cat:'oposicion' },
  { nombre:'Néstor Rego',           partido:'BNG',      cargo:'Portavoz del BNG en el Congreso',              cat:'parlamento' },
  { nombre:'Ana Pontón',            partido:'BNG',      cargo:'Portavoz nacional del BNG',                    cat:'oposicion' },
  { nombre:'Joan Baldoví',          partido:'Compromís',cargo:'Referente de Compromís',                       cat:'parlamento' },
  { nombre:'Alberto Catalán',       partido:'UPN',      cargo:'Diputado de UPN · Grupo Mixto',                cat:'parlamento' },
  { nombre:'Cristina Valido',       partido:'CC',       cargo:'Diputada de Coalición Canaria',                cat:'parlamento' },
  { nombre:'Javier Maroto',         partido:'PP',       cargo:'Vicepresidente primero del Senado',            cat:'parlamento' },
  { nombre:'José Antonio Monago',   partido:'PP',       cargo:'Senador · figura territorial relevante del PP', cat:'parlamento' },

  // 51-69 Presidentes autonómicos
  { nombre:'Juan Manuel Moreno Bonilla', partido:'PP',   cargo:'Presidente de la Junta de Andalucía',         cat:'autonomico' },
  { nombre:'Isabel Díaz Ayuso',     partido:'PP',       cargo:'Presidenta de la Comunidad de Madrid',         cat:'autonomico' },
  { nombre:'Alfonso Rueda',         partido:'PP',       cargo:'Presidente de la Xunta de Galicia',            cat:'autonomico' },
  { nombre:'Juanfran Pérez Llorca', partido:'PP',       cargo:'Presidente de la Generalitat Valenciana',      cat:'autonomico' },
  { nombre:'Fernando López Miras',  partido:'PP',       cargo:'Presidente de la Región de Murcia',            cat:'autonomico' },
  { nombre:'Jorge Azcón',           partido:'PP',       cargo:'Presidente de Aragón',                         cat:'autonomico' },
  { nombre:'Marga Prohens',         partido:'PP',       cargo:'Presidenta de Baleares',                       cat:'autonomico' },
  { nombre:'María Guardiola',       partido:'PP',       cargo:'Presidenta de Extremadura',                    cat:'autonomico' },
  { nombre:'Alfonso Fernández Mañueco', partido:'PP',   cargo:'Presidente de Castilla y León',                cat:'autonomico' },
  { nombre:'María José Sáenz de Buruaga', partido:'PP', cargo:'Presidenta de Cantabria',                      cat:'autonomico' },
  { nombre:'Gonzalo Capellán',      partido:'PP',       cargo:'Presidente de La Rioja',                       cat:'autonomico' },
  { nombre:'Adrián Barbón',         partido:'PSOE',     cargo:'Presidente de Asturias',                       cat:'autonomico' },
  { nombre:'Emiliano García-Page',  partido:'PSOE',     cargo:'Presidente de Castilla-La Mancha',             cat:'autonomico' },
  { nombre:'Salvador Illa',         partido:'PSC-PSOE', cargo:'Presidente de la Generalitat de Catalunya',    cat:'autonomico' },
  { nombre:'María Chivite',         partido:'PSOE',     cargo:'Presidenta de Navarra',                        cat:'autonomico' },
  { nombre:'Imanol Pradales',       partido:'PNV',      cargo:'Lehendakari del Gobierno Vasco',               cat:'autonomico' },
  { nombre:'Fernando Clavijo',      partido:'CC',       cargo:'Presidente de Canarias',                       cat:'autonomico' },
  { nombre:'Juan Jesús Vivas',      partido:'PP',       cargo:'Presidente de Ceuta',                          cat:'autonomico' },
  { nombre:'Juan José Imbroda',     partido:'PP',       cargo:'Presidente de Melilla',                        cat:'autonomico' },

  // 70 candidata Andalucía (placeholder usando otro perfil)
  { nombre:'María Jesús Montero (Andalucía)', partido:'PSOE', cargo:'Candidata del PSOE en Andalucía', cat:'autonomico' },

  // 71-79 Alcaldes y figuras municipales
  { nombre:'José Luis Martínez-Almeida', partido:'PP',   cargo:'Alcalde de Madrid',                            cat:'municipal' },
  { nombre:'Jaume Collboni',        partido:'PSC-PSOE', cargo:'Alcalde de Barcelona',                          cat:'municipal' },
  { nombre:'María José Catalá',     partido:'PP',       cargo:'Alcaldesa de Valencia',                         cat:'municipal' },
  { nombre:'José Luis Sanz',        partido:'PP',       cargo:'Alcalde de Sevilla',                            cat:'municipal' },
  { nombre:'Francisco de la Torre', partido:'PP',       cargo:'Alcalde de Málaga',                             cat:'municipal' },
  { nombre:'Abel Caballero',        partido:'PSOE',     cargo:'Alcalde de Vigo',                               cat:'municipal' },
  { nombre:'Xavier García Albiol',  partido:'PP',       cargo:'Alcalde de Badalona',                           cat:'municipal' },
  { nombre:'Ada Colau',             partido:'Sumar',    cargo:'Figura de izquierdas en Barcelona',             cat:'municipal' },
  { nombre:'Juan Espadas',          partido:'PSOE',     cargo:'Senador y referente del PSOE andaluz',          cat:'parlamento' },
  { nombre:'Teresa Ribera',         partido:'PSOE',     cargo:'Vicepresidenta ejecutiva de la Comisión Europea', cat:'europa' },

  // 81-86 Instituciones del Estado
  { nombre:'Felipe VI',             partido:'Casa Real',cargo:'Jefe del Estado',                              cat:'institucion' },
  { nombre:'Cándido Conde-Pumpido', partido:'TC',       cargo:'Presidente del Tribunal Constitucional',       cat:'institucion' },
  { nombre:'Isabel Perelló',        partido:'TS',       cargo:'Presidenta del Tribunal Supremo y del CGPJ',   cat:'institucion' },
  { nombre:'Álvaro García Ortiz',   partido:'Fiscalía', cargo:'Fiscal General del Estado',                    cat:'institucion' },
  { nombre:'José Luis Escrivá',     partido:'BdE',      cargo:'Gobernador del Banco de España',               cat:'institucion' },
  { nombre:'Nadia Calviño',         partido:'BEI',      cargo:'Presidenta del Banco Europeo de Inversiones',  cat:'europa' },

  // 87-91 Patronal y sindicatos
  { nombre:'Antonio Garamendi',     partido:'CEOE',     cargo:'Presidente de la CEOE',                        cat:'patronal' },
  { nombre:'Gerardo Cuerva',        partido:'CEPYME',   cargo:'Presidente de CEPYME',                         cat:'patronal' },
  { nombre:'Lorenzo Amor',          partido:'ATA',      cargo:'Presidente de ATA · Federación Autónomos',     cat:'patronal' },
  { nombre:'Pepe Álvarez',          partido:'UGT',      cargo:'Secretario general de UGT',                    cat:'sindicato' },
  { nombre:'Unai Sordo',            partido:'CCOO',     cargo:'Secretario general de CCOO',                   cat:'sindicato' },

  // 92-95 Federaciones y Europa
  { nombre:'Cristina Narbona',      partido:'PSOE',     cargo:'Presidenta del PSOE',                          cat:'oposicion' },
  { nombre:'Dolors Montserrat',     partido:'PP',       cargo:'Eurodiputada del PP · figura europea',         cat:'europa' },
  { nombre:'Jorge Buxadé',          partido:'VOX',      cargo:'Eurodiputado de VOX',                          cat:'europa' },
  { nombre:'Estrella Galán',        partido:'Sumar',    cargo:'Eurodiputada de Sumar',                        cat:'europa' },

  // 96-100 Mediáticos
  { nombre:'Antonio García Ferreras', partido:'Medios', cargo:'Director y presentador · La Sexta',            cat:'mediatico' },
  { nombre:'Carlos Herrera',        partido:'Medios',   cargo:'Periodista · COPE · agenda conservadora',      cat:'mediatico' },
  { nombre:'Àngels Barceló',        partido:'Medios',   cargo:'Periodista · Cadena SER · agenda progresista', cat:'mediatico' },
  { nombre:'Ana Rosa Quintana',     partido:'Medios',   cargo:'Presentadora · agenda pública matinal',        cat:'mediatico' },
  { nombre:'Pedro J. Ramírez',      partido:'Medios',   cargo:'Director de El Español · influencia editorial', cat:'mediatico' },
]

// ─────────────────────────────────────────────────────────────────────────
// Generación determinista de métricas y narrativas por actor
// ─────────────────────────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  return Math.abs(h)
}

const FORTS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Control institucional de su cartera','Equipo técnico consolidado','Acceso a recursos del Estado','Visibilidad mediática constante','Apoyo del aparato del partido'],
  oposicion:  ['Liderazgo claro de su organización','Capacidad de movilización electoral','Discurso reconocible','Red territorial activa','Presencia en debates clave'],
  parlamento: ['Disciplina de voto del grupo','Conocimiento de procedimiento parlamentario','Capacidad de bloqueo o impulso','Visibilidad en plenos','Vocería estable'],
  autonomico: ['Posición territorial fuerte','Conocimiento del electorado regional','Apoyo del aparato autonómico','Acceso a recursos propios','Red de alcaldías afín'],
  municipal:  ['Notoriedad pública alta','Gestión cercana al ciudadano','Influencia en agenda urbana','Presupuesto municipal directo'],
  institucion:['Independencia institucional','Autoridad técnica reconocida','Marco competencial claro','Influencia transversal'],
  patronal:   ['Representatividad empresarial','Acceso directo al Gobierno','Capacidad de presión sectorial','Red internacional de pares'],
  sindicato:  ['Capacidad de movilización laboral','Red de delegados sindicales','Presencia en mesa de diálogo social','Histórico de pactos'],
  mediatico:  ['Audiencia masiva diaria','Capacidad de marcar agenda','Red de contactos en todas las élites','Influencia editorial'],
  europa:     ['Visibilidad europea','Red de contactos en Bruselas','Capacidad de influir normativa UE','Posicionamiento estratégico'],
}
const DEBS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Desgaste por gestión cotidiana','Presión presupuestaria','Coordinación con socios de coalición','Exposición a escándalos','Carga de trabajo elevada'],
  oposicion:  ['Aritmética parlamentaria adversa','Tensiones internas en el partido','Limitada capacidad de iniciativa legislativa','Dependencia del clima electoral'],
  parlamento: ['Visibilidad limitada fuera del Congreso','Rotación frecuente de roles','Dependencia del aparato del partido'],
  autonomico: ['Tensiones con la dirección nacional','Limitaciones presupuestarias autonómicas','Competencia con otros barones del partido'],
  municipal:  ['Exposición a coyuntura económica local','Negociaciones complejas con CCAA','Riesgo de crisis puntuales (limpieza, transporte)'],
  institucion:['Presiones políticas indirectas','Cuestionamiento del nombramiento','Debate sobre independencia'],
  patronal:   ['Heterogeneidad del tejido empresarial','Tensión con sindicatos','Visibilidad pública limitada'],
  sindicato:  ['Caída de afiliación','Fragmentación de demandas','Pérdida de centralidad mediática'],
  mediatico:  ['Polarización de audiencia','Erosión por redes sociales','Costes de producción'],
  europa:     ['Distancia del foco político nacional','Complejidad de procedimientos UE'],
}
const EVS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Comparecencia en Comisión del Congreso','Reunión bilateral con Bruselas','Anuncio de plan de inversión','Convocatoria de mesa sectorial','Viaje institucional'],
  oposicion:  ['Mitin en gira territorial','Propuesta legislativa en registro','Reunión interna ejecutiva','Comparecencia en debate de prensa'],
  parlamento: ['Defensa de enmienda en pleno','Pregunta oral al Gobierno','Comparecencia en comisión','Acuerdo bilateral con otro grupo'],
  autonomico: ['Conferencia Sectorial en Madrid','Anuncio de presupuestos autonómicos','Reunión con presidentes vecinos','Visita institucional a empresa'],
  municipal:  ['Pleno municipal extraordinario','Visita a barrio en transformación','Reunión con tejido empresarial local'],
  institucion:['Pleno del órgano institucional','Comparecencia ante el Congreso','Publicación de informe técnico','Reunión con homólogos europeos'],
  patronal:   ['Reunión con vicepresidencia económica','Comparecencia en Foro empresarial','Negociación de convenio sectorial'],
  sindicato:  ['Mesa de diálogo social en Moncloa','Convocatoria de movilización','Negociación de SMI'],
  mediatico:  ['Entrevista exclusiva con líder político','Cobertura en directo de pleno','Editorial de impacto en agenda'],
  europa:     ['Sesión plenaria en Estrasburgo','Reunión con la presidencia rotatoria','Negociación en Consejo Europeo'],
}

type AgenteFull = ActorBase & {
  c: string                // color
  val: number              // valoración 0-10 (1 decimal)
  delta: number            // delta vs mes anterior (1 decimal)
  inf: number              // influencia 0-100
  forts: string[]
  debs: string[]
  evs: string[]
  seg: { f: string; eng: string; tono: number }
}

function buildAgente(a: ActorBase): AgenteFull {
  const h = hash(a.nombre)
  const c = PARTY_COLOR[a.partido] || '#6e6e73'
  const val = +(2.4 + ((h % 65) / 10)).toFixed(1)               // 2.4 - 8.9
  const delta = +(((((h >> 7) % 21) - 10) / 10)).toFixed(1)     // -1.0 .. +1.0
  // Influencia base por categoría
  const baseInf: Record<Categoria, number> = { gobierno:75, oposicion:72, parlamento:55, autonomico:62, municipal:50, institucion:68, patronal:60, sindicato:55, mediatico:58, europa:50 }
  const inf = Math.min(95, Math.max(20, baseInf[a.cat] + ((h >> 11) % 25) - 12))

  const pickN = <T,>(arr: T[], n: number, salt: number): T[] => {
    const out: T[] = []
    const used = new Set<number>()
    for (let i = 0; i < n && i < arr.length; i++) {
      let idx = (h + salt * 13 + i * 31) % arr.length
      while (used.has(idx)) idx = (idx + 1) % arr.length
      used.add(idx)
      out.push(arr[idx])
    }
    return out
  }

  const seguidoresK = 30 + (h % 2200) // 30K - 2230K
  const formatSeg = (k: number) => k >= 1000 ? `${(k/1000).toFixed(1)}M` : `${k}K`
  const eng = (1 + ((h >> 5) % 50) / 10).toFixed(1) + '%'
  const tono = +((((h >> 9) % 80) - 40) / 100).toFixed(2)

  return {
    ...a, c, val, delta, inf,
    forts: pickN(FORTS_BY_CAT[a.cat], 3, 1),
    debs:  pickN(DEBS_BY_CAT[a.cat], 2, 2),
    evs:   pickN(EVS_BY_CAT[a.cat], 3, 3),
    seg: { f: formatSeg(seguidoresK), eng, tono },
  }
}

const FULL: AgenteFull[] = ACTORES.map(buildAgente)

const CAT_LABEL: Record<Categoria, string> = {
  gobierno:'Gobierno', oposicion:'Oposición', parlamento:'Parlamento', autonomico:'CCAA',
  municipal:'Ayuntamientos', institucion:'Instituciones', patronal:'Patronal', sindicato:'Sindicatos',
  mediatico:'Mediáticos', europa:'Europa',
}
const CATS = ['Todos','gobierno','oposicion','parlamento','autonomico','municipal','institucion','patronal','sindicato','mediatico','europa'] as const

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function AgentesPage() {
  const [sel, setSel]       = useState(0)
  const [query, setQuery]   = useState('')
  const [filterCat, setCat] = useState<typeof CATS[number]>('Todos')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FULL
      .map((a, i) => ({ ...a, idx: i }))
      .filter(a => filterCat === 'Todos' || a.cat === filterCat)
      .filter(a => !q || a.nombre.toLowerCase().includes(q) || a.partido.toLowerCase().includes(q) || a.cargo.toLowerCase().includes(q))
  }, [query, filterCat])

  const ag = FULL[sel]

  return (
    <div style={{ minHeight:'100vh', background:'#fbfbfd', color:'#1d1d1f', fontFamily:'var(--font-body,system-ui)' }}>
      <AppHeader/>
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'20px 24px 40px' }}>

        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:18 }}>

          {/* ───── Sidebar searchable ───── */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {/* Buscador */}
            <input
              type="text"
              placeholder="Buscar entre 100 actores…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                padding:'9px 12px', borderRadius:10, border:'1px solid #ECECEF',
                background:'#fff', fontSize:12.5, fontFamily:'inherit', outline:'none',
                color:'#1d1d1f',
              }}
            />
            {/* Filtro por categoría */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {CATS.map(c => {
                const active = filterCat === c
                return (
                  <button key={c} onClick={() => setCat(c)} style={{
                    background: active ? '#1F4E8C' : '#fff',
                    color: active ? '#fff' : '#3a3a3d',
                    border: '1px solid '+(active ? '#1F4E8C' : '#ECECEF'),
                    borderRadius: 999, padding:'3px 9px',
                    fontSize:10.5, fontWeight: active ? 600 : 500, cursor:'pointer',
                    fontFamily:'inherit',
                  }}>{c === 'Todos' ? 'Todos' : CAT_LABEL[c as Categoria]}</button>
                )
              })}
            </div>
            <div style={{ fontSize:11, color:'#6e6e73', padding:'2px 4px' }}>{list.length} de {FULL.length} actores</div>

            {/* Lista scrollable */}
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:'72vh', overflowY:'auto', paddingRight:4 }}>
              {list.map(a => {
                const active = sel === a.idx
                return (
                  <button key={a.nombre} onClick={() => setSel(a.idx)} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    borderRadius:12, border:`1px solid ${active ? a.c : '#ECECEF'}`,
                    background: active ? `${a.c}10` : '#fff', cursor:'pointer', textAlign:'left',
                    transition:'all 0.15s',
                  }}>
                    <div style={{
                      width:30, height:30, borderRadius:'50%', background:a.c,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, fontSize:11, flexShrink:0,
                    }}>{a.nombre.split(' ').filter((_, j) => j > 0).map(w => w[0]).join('').slice(0, 2)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</div>
                      <div style={{ fontSize:10.5, color:a.c, fontWeight:600, marginTop:1 }}>{a.partido}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:a.c, flexShrink:0 }}>{a.val}</div>
                  </button>
                )
              })}
              {list.length === 0 && (
                <div style={{ padding:18, textAlign:'center', color:'#6e6e73', fontSize:12, background:'#fff', border:'1px solid #ECECEF', borderRadius:10 }}>
                  Sin resultados.
                </div>
              )}
            </div>
          </div>

          {/* ───── Detalle ───── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Header del actor */}
            <div style={{ background:'#fff', border:'1px solid #e8e8ed', borderRadius:22, padding:'24px 28px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:18 }}>
                <div style={{ display:'flex', gap:16, alignItems:'center', minWidth:0 }}>
                  <div style={{
                    width:60, height:60, borderRadius:'50%', background:ag.c,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:700, fontSize:18, flexShrink:0, fontFamily:'var(--font-display)',
                  }}>{ag.nombre.split(' ').filter((_, j) => j > 0).map(w => w[0]).join('').slice(0, 2)}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:ag.c, letterSpacing:'0.1em', marginBottom:3, textTransform:'uppercase' }}>
                      {ag.partido} · {CAT_LABEL[ag.cat]}
                    </div>
                    <h2 style={{ margin:0, fontSize:24, fontWeight:700, letterSpacing:'-0.018em', fontFamily:'var(--font-display)' }}>{ag.nombre}</h2>
                    <div style={{ fontSize:13, color:'#3a3a3d', marginTop:4 }}>{ag.cargo}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:42, fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'-0.04em', color:ag.c, lineHeight:1 }}>
                    {ag.val}<span style={{ fontSize:18, color:'#6e6e73' }}>/10</span>
                  </div>
                  <div style={{ fontSize:11, color: ag.delta >= 0 ? '#16A34A' : '#DC2626', fontWeight:600, marginTop:3 }}>
                    {ag.delta >= 0 ? '▲' : '▼'} {Math.abs(ag.delta)} vs mes anterior
                  </div>
                </div>
              </div>
              <div style={{ marginBottom:6, fontSize:12, color:'#6e6e73' }}>Influencia parlamentaria/sectorial</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:6, background:'#f5f5f7', borderRadius:3 }}>
                  <div style={{ width:`${ag.inf}%`, height:6, borderRadius:3, background:ag.c, transition:'width 280ms' }}/>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:ag.c }}>{ag.inf}/100</span>
              </div>
            </div>

            {/* Fortalezas y debilidades */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ background:'#fff', border:'1px solid #e8e8ed', borderRadius:18, padding:'18px 22px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#16A34A', letterSpacing:'0.08em', marginBottom:10, textTransform:'uppercase' }}>Fortalezas</div>
                {ag.forts.map(f => (
                  <div key={f} style={{ fontSize:12.5, color:'#3a3a3d', display:'flex', gap:8, marginBottom:6, lineHeight:1.5 }}>
                    <span style={{ color:'#16A34A', flexShrink:0, fontWeight:700 }}>+</span>{f}
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e8ed', borderRadius:18, padding:'18px 22px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#DC2626', letterSpacing:'0.08em', marginBottom:10, textTransform:'uppercase' }}>Debilidades</div>
                {ag.debs.map(d => (
                  <div key={d} style={{ fontSize:12.5, color:'#3a3a3d', display:'flex', gap:8, marginBottom:6, lineHeight:1.5 }}>
                    <span style={{ color:'#DC2626', flexShrink:0, fontWeight:700 }}>−</span>{d}
                  </div>
                ))}
              </div>
            </div>

            {/* Eventos y redes */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ background:'#fff', border:'1px solid #e8e8ed', borderRadius:18, padding:'18px 22px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#6e6e73', letterSpacing:'0.08em', marginBottom:10, textTransform:'uppercase' }}>Eventos recientes</div>
                {ag.evs.map(e => (
                  <div key={e} style={{ fontSize:12.5, color:'#3a3a3d', display:'flex', gap:8, marginBottom:6, lineHeight:1.5 }}>
                    <span style={{ color:ag.c, flexShrink:0, fontWeight:700 }}>→</span>{e}
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e8ed', borderRadius:18, padding:'18px 22px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#6e6e73', letterSpacing:'0.08em', marginBottom:14, textTransform:'uppercase' }}>Redes sociales</div>
                {[
                  { l:'Seguidores estimados', v:ag.seg.f, c:ag.c },
                  { l:'Engagement medio',     v:ag.seg.eng, c:ag.c },
                  { l:'Sentimiento neto',     v:`${ag.seg.tono >= 0 ? '+' : ''}${ag.seg.tono}`, c: ag.seg.tono >= 0 ? '#16A34A' : '#DC2626' },
                ].map(x => (
                  <div key={x.l} style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:12, color:'#6e6e73' }}>{x.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:x.c }}>{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
