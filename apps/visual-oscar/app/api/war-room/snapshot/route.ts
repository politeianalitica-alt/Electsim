import { NextResponse } from 'next/server'
import type { WarRoomSnapshot } from '@/types/war-room'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_SNAPSHOT: WarRoomSnapshot = {
  candidato: {
    nombre: 'Alberto Núñez Feijóo',
    partido: 'Partido Popular',
    color: '#1F4E8C',
    iniciales: 'AF',
    cargo: 'Candidato a la Presidencia del Gobierno',
  },
  elecciones_fecha: '2026-08-10T00:00:00.000Z',
  encuestas: [
    { fecha:'05/05/2026', casa:'Sigma Dos',   cliente:'El Mundo',    pp:33.2, psoe:26.4, vox:12.8, sumar:10.1, otros:17.5 },
    { fecha:'02/05/2026', casa:'GAD3',         cliente:'ABC',          pp:33.0, psoe:26.7, vox:12.5, sumar:10.5, otros:17.3 },
    { fecha:'29/04/2026', casa:'CIS',           cliente:'Gobierno',     pp:30.5, psoe:28.2, vox:11.8, sumar:11.2, otros:18.3 },
    { fecha:'25/04/2026', casa:'Metroscopia',   cliente:'El País',      pp:32.3, psoe:27.1, vox:12.6, sumar: 9.8, otros:18.2 },
    { fecha:'20/04/2026', casa:'40dB',          cliente:'SER · Prisa',  pp:31.8, psoe:27.5, vox:12.2, sumar:10.4, otros:18.1 },
    { fecha:'15/04/2026', casa:'NC Report',     cliente:'La Razón',     pp:33.5, psoe:25.8, vox:13.2, sumar: 9.8, otros:17.7 },
  ],
  kpis: {
    intencionPP: 32.1, diferencialPSOE: 5.3, intencionPSOE: 26.8,
    participacionPrev: 71.5, conocimiento: 92, valoracion: 4.2,
    imagenLider: 4.4, voluntarios: 8420, localesAbiertos: 142, socios: 38,
  },
  equipo: [
    { rol:'Director',     nombre:'Miguel Tellado',        estado:'En war room', ult:'Hace 3 min' },
    { rol:'Estrategia',   nombre:'Elías Bendodo',          estado:'En reunión',  ult:'Hace 12 min' },
    { rol:'Comunicación', nombre:'Borja Sémper',           estado:'En terreno',  ult:'En Pamplona, evento territorial' },
    { rol:'Datos',        nombre:'Ana Beltrán',            estado:'En war room', ult:'Hace 5 min' },
    { rol:'Digital',      nombre:'Pablo Hispán',           estado:'Remoto',      ult:'Vídeo TikTok 17h' },
    { rol:'Ground game',  nombre:'Carmen Fúnez',           estado:'En terreno',  ult:'Coordinación voluntarios Madrid' },
    { rol:'Finanzas',     nombre:'Juan Bravo',             estado:'En war room', ult:'Cierre semanal' },
    { rol:'Legal',        nombre:'Esteban González Pons',  estado:'Remoto',      ult:'Briefing JEC' },
    { rol:'Crisis',       nombre:'Cuca Gamarra',           estado:'En war room', ult:'Reunión 09:00' },
  ],
  agenda: [
    { fecha:'06/05/2026', hora:'09:00', tipo:'Reunión interna', titulo:'Comité de Campaña · briefing diario',                        ubicacion:'Génova 13, Madrid',           coverage:'Solo regional',  estado:'Confirmado' },
    { fecha:'06/05/2026', hora:'13:00', tipo:'Rueda de prensa', titulo:'Comparecencia post-Junta Directiva',                          ubicacion:'Génova 13, Madrid',           coverage:'TV nacional',    estado:'Confirmado' },
    { fecha:'06/05/2026', hora:'19:00', tipo:'Acto territorial',titulo:'Encuentro con autónomos del comercio',                        ubicacion:'Sevilla · Hotel Alfonso XIII', aforo:280, coverage:'Prensa nacional',estado:'Confirmado' },
    { fecha:'07/05/2026', hora:'10:30', tipo:'Visita',          titulo:'Visita al puerto de Algeciras · sector logístico',           ubicacion:'Algeciras, Cádiz',            coverage:'Solo regional',  estado:'Confirmado' },
    { fecha:'07/05/2026', hora:'21:00', tipo:'Entrevista',      titulo:'Entrevista en exclusiva · Carlos Alsina (Onda Cero)',         ubicacion:'Estudios Atresmedia',         coverage:'Prensa nacional',estado:'Confirmado' },
    { fecha:'08/05/2026', hora:'12:00', tipo:'Mitin',           titulo:'Gran mitin de campaña · Plaza de toros',                      ubicacion:'Valencia',                    aforo:8500, coverage:'TV nacional',    estado:'Confirmado' },
    { fecha:'09/05/2026', hora:'19:30', tipo:'Acto territorial',titulo:'Día de Europa · acto con eurodiputados',                       ubicacion:'Madrid · Auditorio Mutua',    aforo:1200, coverage:'Prensa nacional',estado:'Confirmado' },
    { fecha:'12/05/2026', hora:'21:30', tipo:'Debate',          titulo:'Debate televisado · TVE',                                      ubicacion:'TVE Prado del Rey',           coverage:'TV nacional',    estado:'Pendiente' },
    { fecha:'14/05/2026', hora:'19:00', tipo:'Mitin',           titulo:'Mitin de cierre regional · Andalucía',                         ubicacion:'Málaga · Cortijo de Torres',  aforo:6500, coverage:'TV nacional',    estado:'Confirmado' },
  ],
  territorio: [
    { prov:'Madrid',      ccaa:'Madrid',        prioridad:'Mantener', intencion:38.2, gap:+11.4, recursos:22, voluntarios:1820 },
    { prov:'Barcelona',   ccaa:'Cataluña',      prioridad:'Alta',     intencion:18.4, gap:-8.2,  recursos:18, voluntarios:920  },
    { prov:'Valencia',    ccaa:'C. Valenciana', prioridad:'Crítica',  intencion:31.8, gap:+2.4,  recursos:16, voluntarios:740  },
    { prov:'Sevilla',     ccaa:'Andalucía',     prioridad:'Crítica',  intencion:30.5, gap:+1.8,  recursos:14, voluntarios:680  },
    { prov:'Málaga',      ccaa:'Andalucía',     prioridad:'Alta',     intencion:34.1, gap:+6.2,  recursos: 8, voluntarios:510  },
    { prov:'Zaragoza',    ccaa:'Aragón',        prioridad:'Crítica',  intencion:30.2, gap:+1.2,  recursos:10, voluntarios:420  },
    { prov:'Bizkaia',     ccaa:'País Vasco',    prioridad:'Mantener', intencion:14.8, gap:-12.5, recursos: 3, voluntarios:220  },
    { prov:'A Coruña',    ccaa:'Galicia',       prioridad:'Mantener', intencion:36.4, gap:+9.8,  recursos: 5, voluntarios:380  },
    { prov:'Murcia',      ccaa:'Murcia',        prioridad:'Mantener', intencion:40.2, gap:+13.5, recursos: 4, voluntarios:290  },
    { prov:'Las Palmas',  ccaa:'Canarias',      prioridad:'Alta',     intencion:28.4, gap:+0.8,  recursos: 6, voluntarios:240  },
    { prov:'Pontevedra',  ccaa:'Galicia',       prioridad:'Media',    intencion:32.5, gap:+5.4,  recursos: 4, voluntarios:240  },
    { prov:'Alicante',    ccaa:'C. Valenciana', prioridad:'Alta',     intencion:33.8, gap:+5.2,  recursos: 7, voluntarios:360  },
  ],
  mensaje: {
    titular: 'Cada día con el Gobierno es un día más de bloqueo y deterioro institucional.',
    subtitular: 'Los españoles merecen la posibilidad de elegir un cambio que recupere la sensatez económica y la unidad del país.',
    pilares: [
      { p:'Recuperar la sensatez económica',  detalle:'Bajada del IRPF, simplificación fiscal, plan choque para autónomos' },
      { p:'Restaurar la unidad y la igualdad', detalle:'Derogar la amnistía, recuperar el Estado de derecho' },
      { p:'Estabilidad institucional',          detalle:'Pactos de Estado para CGPJ, RTVE, financiación autonómica' },
    ],
    contraste: 'PSOE depende de Junts y Bildu para sobrevivir; nosotros gobernaremos con todos los españoles.',
    evitar: ['Detalles del pacto con VOX en CCAA', 'Conflictos internos del partido', 'Polémica con la Iglesia sobre IRPF'],
    hashtag: '#TiempoDeCambio',
  },
  presupuesto: {
    total: 12500,
    gastado: 4280,
    lineas: [
      { concepto:'Publicidad TV',              gastado:1450, presupuestado:3200, color:'#1F4E8C' },
      { concepto:'Publicidad digital y redes', gastado:1180, presupuestado:2500, color:'#DC2626' },
      { concepto:'Mítines y actos',            gastado: 720, presupuestado:1800, color:'#F97316' },
      { concepto:'Material y merchandising',   gastado: 360, presupuestado: 850, color:'#16A34A' },
      { concepto:'Equipo y consultoras',       gastado: 380, presupuestado:1200, color:'#5B21B6' },
      { concepto:'Logística y desplazamientos',gastado: 190, presupuestado: 950, color:'#0EA5E9' },
    ],
  },
  crisis: [
    { id:'c1', titulo:'Deepfake Feijóo en TikTok · "elecciones anticipadas"',     severidad:'ALTA',  tipo:'Tecnológica', estado:'Contenida' },
    { id:'c2', titulo:'Ataque coordinado #FeijóoElecciones · 412 cuentas',        severidad:'MEDIA', tipo:'Mediática',   estado:'Activa' },
    { id:'c3', titulo:'Tensión interna pacto autonómico Castilla y León con VOX', severidad:'MEDIA', tipo:'Política',    estado:'Activa' },
  ],
  tareas: [
    { id:'t1', tarea:'Cierre nota de prensa · medidas autónomos',     resp:'Borja Sémper',  plazo:'12:00', estado:'En curso' },
    { id:'t2', tarea:'Briefing técnico para entrevista Alsina (21h)', resp:'Equipo prensa', plazo:'18:00', estado:'Pendiente' },
    { id:'t3', tarea:'Cierre del cartel del mitin de Valencia',        resp:'Carmen Fúnez',  plazo:'15:00', estado:'Completada' },
    { id:'t4', tarea:'Aprobar copy creatividades digitales semana',    resp:'Pablo Hispán',  plazo:'14:00', estado:'En curso' },
    { id:'t5', tarea:'Reunión bilateral con Coalición Canaria',        resp:'Elías Bendodo', plazo:'17:00', estado:'Pendiente' },
    { id:'t6', tarea:'Actualizar respuestas a deepfake TikTok',        resp:'Cuca Gamarra',  plazo:'16:00', estado:'Completada' },
  ],
}

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/snapshot`, {
        headers: { 'X-API-Key': apiKey ?? '', 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch { /* fall through */ }
  }
  return NextResponse.json(MOCK_SNAPSHOT)
}
