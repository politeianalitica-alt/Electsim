'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
type Fase = 'Detectado' | 'Escalando' | 'Pico' | 'Decayendo' | 'Cerrado'
type Plataforma = 'X (Twitter)' | 'Facebook' | 'TikTok' | 'Telegram' | 'Instagram' | 'YouTube' | 'Foros' | 'WhatsApp'
type TipoAtaque = 'Desinformación' | 'Bulo viral' | 'Hashtag coordinado' | 'Fake video / deepfake' | 'Astroturfing' | 'Doxing' | 'Smear campaign'

type Hashtag = { h: string; vol: number; hostil: boolean }
type Amplificador = { nombre: string; tipo: 'Cuenta verificada' | 'Cuenta anónima' | 'Medio' | 'Político' | 'Influencer' | 'Bot detectado'; seguidores: string; posicion: 'A favor' | 'En contra' | 'Neutral'; menciones: number }
type Patron = { tipo: string; evidencia: string; severidad: Severidad }
type Accion = { accion: string; plazo: string; estado: 'Pendiente' | 'En curso' | 'Completada' }

type Ataque = {
  id: string
  titulo: string
  target: string
  narrativa: string
  tipo: TipoAtaque
  severidad: Severidad
  fase: Fase
  inicio: string
  alcance: string         // p. ej. "8.4 M impresiones"
  cuentasSospechosas: number  // %
  plataformas: { p: Plataforma; peso: number }[]
  evolucion: number[]     // 24 puntos · menciones por hora
  hashtags: Hashtag[]
  amplificadores: Amplificador[]
  patrones: Patron[]
  acciones: Accion[]
}

const SEV_META: Record<Severidad, { color: string }> = {
  'CRÍTICA':{ color:'#DC2626' }, 'ALTA':{ color:'#F97316' }, 'MEDIA':{ color:'#EAB308' }, 'BAJA':{ color:'#0EA5E9' },
}
const TIPO_META: Record<TipoAtaque, { color: string }> = {
  'Desinformación':       { color:'#7C3AED' },
  'Bulo viral':           { color:'#DC2626' },
  'Hashtag coordinado':   { color:'#F97316' },
  'Fake video / deepfake':{ color:'#9333EA' },
  'Astroturfing':         { color:'#0EA5E9' },
  'Doxing':               { color:'#525258' },
  'Smear campaign':       { color:'#B45309' },
}
const FASE_META: Record<Fase, { color: string; pct: number }> = {
  'Detectado': { color:'#0EA5E9', pct:15 },
  'Escalando': { color:'#F97316', pct:40 },
  'Pico':      { color:'#DC2626', pct:65 },
  'Decayendo': { color:'#16A34A', pct:85 },
  'Cerrado':   { color:'#525258', pct:100 },
}
const PLAT_COLOR: Record<Plataforma, string> = {
  'X (Twitter)':'#000000', 'Facebook':'#1877F2', 'TikTok':'#FF0050',
  'Telegram':'#0088CC', 'Instagram':'#E4405F', 'YouTube':'#FF0000',
  'Foros':'#525258', 'WhatsApp':'#25D366',
}
const POS_COLOR = { 'A favor':'#16A34A', 'En contra':'#DC2626', 'Neutral':'#6e6e73' } as const
const ACC_META = { 'Pendiente':'#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' } as const

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 ataques narrativos detectados
// ─────────────────────────────────────────────────────────────────────────
const ATAQUES: Ataque[] = [
  {
    id:'sanchez-dimision',
    titulo:'#SánchezDimisión · oleada coordinada post-amnistía',
    target:'Pedro Sánchez · Gobierno',
    narrativa:'Difusión masiva de mensajes pidiendo dimisión tras la sentencia del TC sobre la Ley de Amnistía. Indicios de coordinación con cuentas vinculadas a entornos de la derecha radical.',
    tipo:'Hashtag coordinado', severidad:'CRÍTICA', fase:'Pico',
    inicio:'04/05/2026', alcance:'18.4 M impresiones', cuentasSospechosas:34,
    plataformas:[
      { p:'X (Twitter)', peso:48 }, { p:'Telegram', peso:18 },
      { p:'TikTok', peso:14 }, { p:'YouTube', peso:9 },
      { p:'Facebook', peso:7 }, { p:'WhatsApp', peso:4 },
    ],
    evolucion:[12,18,24,30,42,58,72,86,98,120,148,182,210,225,238,228,210,188,168,148,128,108,90,76],
    hashtags:[
      { h:'#SánchezDimisión',  vol:128, hostil:true  },
      { h:'#FelipeAyúdanos',   vol: 42, hostil:true  },
      { h:'#NoEsMiPresidente', vol: 38, hostil:true  },
      { h:'#España',           vol: 24, hostil:false },
      { h:'#Amnistía',         vol: 22, hostil:true  },
      { h:'#TC',               vol: 14, hostil:false },
    ],
    amplificadores:[
      { nombre:'@VITO_quiles',           tipo:'Cuenta verificada', seguidores:'520K', posicion:'En contra', menciones:412 },
      { nombre:'@J_AlvisePérez',         tipo:'Político',          seguidores:'1.1M', posicion:'En contra', menciones:298 },
      { nombre:'OK Diario · cuentas',    tipo:'Medio',             seguidores:'780K', posicion:'En contra', menciones:215 },
      { nombre:'@CazadorDeBots_X',       tipo:'Cuenta anónima',    seguidores:'140K', posicion:'En contra', menciones:184 },
      { nombre:'@JotaPe_Amorin',         tipo:'Cuenta verificada', seguidores:'92K',  posicion:'En contra', menciones:142 },
      { nombre:'Cuentas red rusa Doppel.',tipo:'Bot detectado',     seguidores:'—',     posicion:'En contra', menciones:1240 },
      { nombre:'@LaSocialista',          tipo:'Cuenta anónima',    seguidores:'62K',  posicion:'A favor',   menciones: 78 },
    ],
    patrones:[
      { tipo:'Hashtag burst sintético',  evidencia:'1.240 cuentas con menos de 60 días publican el mismo hashtag en 90 minutos.',                              severidad:'CRÍTICA' },
      { tipo:'Copy-paste idéntico',       evidencia:'Texto «Sánchez es el peor presidente de la historia» replicado por 482 cuentas con variaciones mínimas.', severidad:'ALTA'    },
      { tipo:'Cuentas red Doppelgänger',  evidencia:'78 cuentas previamente atribuidas a operación rusa Doppelgänger reactivadas con el mismo target.',         severidad:'CRÍTICA' },
      { tipo:'Pico horario coordinado',   evidencia:'Volumen multiplicado x18 entre las 09:00 y las 11:00 h sin trigger orgánico identificable.',                severidad:'ALTA'    },
    ],
    acciones:[
      { accion:'Comunicado oficial Moncloa desmintiendo bulos asociados',         plazo:'06/05/2026', estado:'Completada' },
      { accion:'Reporte coordinado a plataformas (X, TikTok, Telegram)',           plazo:'07/05/2026', estado:'En curso'   },
      { accion:'Activar mensaje contraviral con voces aliadas',                    plazo:'07/05/2026', estado:'En curso'   },
      { accion:'Notificación a CCN-CERT y SEDIA sobre operación coordinada',       plazo:'08/05/2026', estado:'Pendiente'  },
    ],
  },
  {
    id:'bulo-dana',
    titulo:'Bulo «AEMET avisó dos días antes y lo ocultaron»',
    target:'AEMET · Gobierno · gestión DANA',
    narrativa:'Bulo viral relanzado tras el aniversario de la DANA: imagen falsa de un supuesto aviso AEMET 48 horas antes. Versión original desmentida por Newtral en noviembre 2024 reaparece con nueva fuerza.',
    tipo:'Bulo viral', severidad:'ALTA', fase:'Decayendo',
    inicio:'29/04/2026', alcance:'9.2 M impresiones', cuentasSospechosas:22,
    plataformas:[
      { p:'WhatsApp',  peso:42 }, { p:'Facebook', peso:22 },
      { p:'X (Twitter)',peso:14 }, { p:'TikTok',   peso:10 },
      { p:'Telegram',  peso: 8 }, { p:'Foros',    peso: 4 },
    ],
    evolucion:[8,12,18,28,42,68,98,135,168,182,178,162,142,118,95,74,58,46,38,32,28,24,22,18],
    hashtags:[
      { h:'#JusticiaDANA',     vol: 84, hostil:true  },
      { h:'#NosOcultaron',     vol: 56, hostil:true  },
      { h:'#AEMETMintió',      vol: 48, hostil:true  },
      { h:'#Valencia',         vol: 32, hostil:false },
      { h:'#MazónDimisión',    vol: 22, hostil:false },
    ],
    amplificadores:[
      { nombre:'Cadenas WhatsApp regionales',tipo:'Cuenta anónima',    seguidores:'—',     posicion:'En contra', menciones:1820 },
      { nombre:'@AsoVíctimasDANA',           tipo:'Cuenta verificada', seguidores:'48K',  posicion:'En contra', menciones: 142 },
      { nombre:'Periodistas Digital · cnts.',tipo:'Medio',             seguidores:'310K', posicion:'En contra', menciones: 118 },
      { nombre:'@NaufragiosVLC',             tipo:'Cuenta anónima',    seguidores:'24K',  posicion:'En contra', menciones:  92 },
      { nombre:'AEMET (cta. oficial)',       tipo:'Medio',             seguidores:'2.1M', posicion:'A favor',   menciones:  68 },
      { nombre:'@Newtral · @maldita',        tipo:'Medio',             seguidores:'1.4M', posicion:'A favor',   menciones:  54 },
    ],
    patrones:[
      { tipo:'Reedición de bulo desmentido',evidencia:'Imagen subida a Internet en nov-2024 desmentida por Newtral · ahora reactivada con OCR alterado.', severidad:'ALTA'  },
      { tipo:'Difusión masiva en WhatsApp',  evidencia:'Trazas de 14 grupos regionales con > 200 reenvíos cada uno.',                                       severidad:'MEDIA' },
      { tipo:'Atribución emocional',          evidencia:'Mensajes piggyback con testimonios reales de víctimas para anclar credibilidad.',                  severidad:'ALTA'  },
    ],
    acciones:[
      { accion:'Pin de fact-check de AEMET en cuenta oficial',                    plazo:'30/04/2026', estado:'Completada' },
      { accion:'Coordinación con Newtral y Maldita.es',                            plazo:'01/05/2026', estado:'Completada' },
      { accion:'Solicitud retirada vídeo TikTok engañoso',                          plazo:'02/05/2026', estado:'Completada' },
      { accion:'Respuesta institucional con cronograma real AEMET',                 plazo:'05/05/2026', estado:'Completada' },
    ],
  },
  {
    id:'irpf-ahorro',
    titulo:'Desinformación «el IRPF castigará el ahorro de las familias»',
    target:'Reforma IRPF · M. J. Montero',
    narrativa:'Campaña deliberada que distorsiona la propuesta de reforma del IRPF presentándola como un ataque al ahorro de clase media, cuando solo afecta a rentas del capital > 300.000€.',
    tipo:'Desinformación', severidad:'ALTA', fase:'Escalando',
    inicio:'02/05/2026', alcance:'6.8 M impresiones', cuentasSospechosas:18,
    plataformas:[
      { p:'X (Twitter)', peso:38 }, { p:'YouTube',   peso:22 },
      { p:'Telegram',    peso:14 }, { p:'TikTok',    peso:10 },
      { p:'WhatsApp',    peso: 8 }, { p:'Facebook',  peso: 8 },
    ],
    evolucion:[6,8,12,18,28,38,52,68,82,96,108,118,128,138,144,148,152,158,162,168,174,178,182,188],
    hashtags:[
      { h:'#NoAlSaqueoFiscal',     vol: 64, hostil:true  },
      { h:'#MonteroDimisión',      vol: 42, hostil:true  },
      { h:'#IRPF2026',             vol: 38, hostil:false },
      { h:'#ProtegeTuAhorro',      vol: 28, hostil:true  },
      { h:'#StopHaciendaSocialista',vol: 22, hostil:true },
    ],
    amplificadores:[
      { nombre:'@LibertadDigital',    tipo:'Medio',             seguidores:'1.2M', posicion:'En contra', menciones:248 },
      { nombre:'@LasMañanasCOPE',     tipo:'Medio',             seguidores:'820K', posicion:'En contra', menciones:142 },
      { nombre:'@daniel_lacalle',     tipo:'Influencer',        seguidores:'520K', posicion:'En contra', menciones:128 },
      { nombre:'@LibreMercado_es',    tipo:'Medio',             seguidores:'310K', posicion:'En contra', menciones:118 },
      { nombre:'@elblogsalmon',       tipo:'Medio',             seguidores:'180K', posicion:'Neutral',   menciones: 84 },
      { nombre:'@AhorroBarato',       tipo:'Influencer',        seguidores:'124K', posicion:'En contra', menciones: 76 },
    ],
    patrones:[
      { tipo:'Distorsión de la propuesta', evidencia:'Mensajes que afirman que afecta al ahorro de las familias cuando el umbral es 300.000€.',           severidad:'ALTA'    },
      { tipo:'Influencers económicos sincronizados', evidencia:'8 cuentas grandes publican análisis idénticos en menos de 6 horas.',                       severidad:'MEDIA'   },
      { tipo:'Vídeos breves con título alarmista', evidencia:'YouTube · 14 vídeos del mismo creador independiente con +200K visualizaciones cada uno.',    severidad:'MEDIA'   },
    ],
    acciones:[
      { accion:'Hilo aclaratorio cuenta oficial @Hacienda · datos por tramos',     plazo:'07/05/2026', estado:'En curso'   },
      { accion:'Briefing técnico a periodistas económicos',                         plazo:'08/05/2026', estado:'En curso'   },
      { accion:'Vídeo explicativo Vp 1ª · 90 segundos',                              plazo:'09/05/2026', estado:'Pendiente'  },
      { accion:'Hilo respuesta de @CCOO · @UGT con datos sindicales',                plazo:'10/05/2026', estado:'Pendiente'  },
    ],
  },
  {
    id:'menores-canarias',
    titulo:'Bulo «menores migrantes desplazan a niños españoles»',
    target:'Política migratoria · Sira Rego · Elma Saiz',
    narrativa:'Bulo viral que afirma que menores migrantes están ocupando plazas escolares y servicios sanitarios desplazando a niños españoles. Sin base estadística pero con alta carga emocional.',
    tipo:'Bulo viral', severidad:'ALTA', fase:'Pico',
    inicio:'01/05/2026', alcance:'12.6 M impresiones', cuentasSospechosas:48,
    plataformas:[
      { p:'TikTok',     peso:38 }, { p:'X (Twitter)', peso:22 },
      { p:'Facebook',   peso:14 }, { p:'WhatsApp',    peso:12 },
      { p:'Telegram',   peso: 8 }, { p:'YouTube',     peso: 6 },
    ],
    evolucion:[4,8,18,32,52,82,118,162,210,258,312,358,395,422,448,462,478,485,492,498,504,508,512,518],
    hashtags:[
      { h:'#PrimeroLosNuestros', vol:148, hostil:true  },
      { h:'#StopMENA',           vol: 92, hostil:true  },
      { h:'#España',             vol: 48, hostil:false },
      { h:'#NoSomosRacistas',    vol: 38, hostil:true  },
      { h:'#FronterasSeguras',   vol: 32, hostil:true  },
    ],
    amplificadores:[
      { nombre:'@vox_es',                    tipo:'Político',          seguidores:'880K', posicion:'En contra', menciones:412 },
      { nombre:'@Santi_ABASCAL',             tipo:'Político',          seguidores:'520K', posicion:'En contra', menciones:298 },
      { nombre:'TikTok · cuentas comuni Esp.',tipo:'Cuenta anónima',    seguidores:'—',     posicion:'En contra', menciones:1820 },
      { nombre:'@Manuel_AvarezdeT',          tipo:'Político',          seguidores:'180K', posicion:'En contra', menciones:148 },
      { nombre:'@SeAcaboLaFiesta',           tipo:'Político',          seguidores:'320K', posicion:'En contra', menciones:142 },
      { nombre:'@MaldiTaBulo',               tipo:'Medio',             seguidores:'820K', posicion:'A favor',   menciones: 84 },
    ],
    patrones:[
      { tipo:'Vídeos sin contexto',          evidencia:'Imágenes reales de aulas masificadas atribuidas falsamente a centros con menores migrantes.', severidad:'ALTA'    },
      { tipo:'Carga emocional infantil',      evidencia:'Uso recurrente de imágenes de niños llorando · diseño para activación emocional.',           severidad:'ALTA'    },
      { tipo:'Negación implícita del racismo',evidencia:'Marco discursivo: «no es racismo, es justicia» · refuerzo identitario.',                     severidad:'MEDIA'   },
      { tipo:'TikTok · viralización algorítmica',evidencia:'Aceleración por algoritmo TikTok detectada · 38% del alcance en 48h.',                    severidad:'CRÍTICA' },
    ],
    acciones:[
      { accion:'Datos oficiales escolarización por CCAA con desglose',           plazo:'07/05/2026', estado:'En curso'   },
      { accion:'Vídeo respuesta TikTok · cuentas oficiales',                      plazo:'08/05/2026', estado:'Pendiente'  },
      { accion:'Reporte a TikTok por bulo masivo',                                plazo:'07/05/2026', estado:'Completada' },
      { accion:'Coordinar fact-check con @maldita y @newtral',                    plazo:'08/05/2026', estado:'En curso'   },
    ],
  },
  {
    id:'jornada-37h',
    titulo:'Smear campaign contra Yolanda Díaz · «destruirá empleo»',
    target:'Yolanda Díaz · Reducción jornada 37,5h',
    narrativa:'Campaña sostenida que asocia la propuesta de reducción de jornada a la destrucción masiva de empleo, especialmente en pymes. Mensajes amplificados por patronales y medios afines.',
    tipo:'Smear campaign', severidad:'MEDIA', fase:'Decayendo',
    inicio:'22/04/2025', alcance:'14.8 M impresiones', cuentasSospechosas:14,
    plataformas:[
      { p:'X (Twitter)', peso:34 }, { p:'YouTube',   peso:22 },
      { p:'Facebook',    peso:18 }, { p:'TikTok',    peso:10 },
      { p:'Telegram',    peso: 8 }, { p:'WhatsApp',  peso: 8 },
    ],
    evolucion:[150,148,142,138,132,128,124,118,112,108,102,98,94,88,82,76,72,68,64,60,56,52,48,44],
    hashtags:[
      { h:'#YolandaDestruyeEmpleo', vol: 38, hostil:true  },
      { h:'#NoALaJornadaImpuesta',  vol: 28, hostil:true  },
      { h:'#37h',                   vol: 22, hostil:false },
      { h:'#PYMES',                 vol: 18, hostil:false },
      { h:'#SumarHundeEspaña',      vol: 14, hostil:true  },
    ],
    amplificadores:[
      { nombre:'@CEOE_ES',           tipo:'Cuenta verificada', seguidores:'85K',  posicion:'En contra', menciones:148 },
      { nombre:'@LorenzoAmor_ATA',   tipo:'Político',          seguidores:'68K',  posicion:'En contra', menciones:128 },
      { nombre:'@expansion',         tipo:'Medio',             seguidores:'1.2M', posicion:'En contra', menciones:118 },
      { nombre:'@elEconomista',      tipo:'Medio',             seguidores:'820K', posicion:'En contra', menciones:108 },
      { nombre:'@LibreMercado_es',   tipo:'Medio',             seguidores:'310K', posicion:'En contra', menciones: 92 },
      { nombre:'@ccoo',              tipo:'Cuenta verificada', seguidores:'120K', posicion:'A favor',   menciones: 84 },
    ],
    patrones:[
      { tipo:'Confusión coste / productividad',evidencia:'Mensajes que confunden coste laboral total con horas trabajadas · datos manipulados.', severidad:'MEDIA' },
      { tipo:'Apelación a pymes',              evidencia:'Foco emocional en pymes y autónomos · ignorando 6 países UE con jornada similar.',     severidad:'MEDIA' },
      { tipo:'Eco mediático sostenido',         evidencia:'+32 columnas de opinión en medios económicos en 90 días.',                            severidad:'BAJA'  },
    ],
    acciones:[
      { accion:'Datos OCDE comparados publicados',                                plazo:'25/04/2025', estado:'Completada' },
      { accion:'Hilo @MTrabajo con experiencias internacionales',                 plazo:'29/04/2025', estado:'Completada' },
      { accion:'Briefing técnico a redacciones económicas',                        plazo:'06/05/2025', estado:'Completada' },
    ],
  },
  {
    id:'deepfake-feijoo',
    titulo:'Deepfake «Feijóo confirma elecciones anticipadas»',
    target:'Alberto Núñez Feijóo · PP',
    narrativa:'Vídeo deepfake con la voz clonada de Feijóo confirmando elecciones anticipadas para octubre. Sumamente realista en TikTok. Riesgo reputacional alto · solicitud retirada urgente.',
    tipo:'Fake video / deepfake', severidad:'ALTA', fase:'Detectado',
    inicio:'05/05/2026', alcance:'2.4 M impresiones', cuentasSospechosas:62,
    plataformas:[
      { p:'TikTok',      peso:62 }, { p:'X (Twitter)', peso:18 },
      { p:'WhatsApp',    peso:10 }, { p:'Telegram',    peso: 6 },
      { p:'Instagram',   peso: 4 },
    ],
    evolucion:[4,6,12,24,38,52,72,92,118,142,168,192,214,232,248,258,264,268,272,275,278,280,282,284],
    hashtags:[
      { h:'#FeijóoElecciones',  vol: 52, hostil:true  },
      { h:'#OctubreElectoral',  vol: 38, hostil:true  },
      { h:'#FakeNews',          vol: 28, hostil:false },
      { h:'#PPMintió',          vol: 22, hostil:true  },
    ],
    amplificadores:[
      { nombre:'TikTok · @cnts. virales', tipo:'Cuenta anónima',    seguidores:'—',     posicion:'En contra', menciones: 982 },
      { nombre:'@PP_es',                   tipo:'Cuenta verificada', seguidores:'380K', posicion:'A favor',   menciones: 218 },
      { nombre:'@maldita',                 tipo:'Medio',             seguidores:'820K', posicion:'A favor',   menciones: 142 },
      { nombre:'@VITO_quiles',             tipo:'Cuenta verificada', seguidores:'520K', posicion:'En contra', menciones: 128 },
      { nombre:'@CazaBots_X',              tipo:'Cuenta anónima',    seguidores:'140K', posicion:'En contra', menciones:  92 },
    ],
    patrones:[
      { tipo:'IA generativa de audio',     evidencia:'Análisis técnico ElevenLabs / Resemble · firma confirmada.',                                       severidad:'CRÍTICA' },
      { tipo:'Subida coordinada TikTok',   evidencia:'12 cuentas suben el mismo vídeo en 2h con captions distintos pero idénticos timestamps.',         severidad:'ALTA'    },
      { tipo:'Sin marca de agua AI',        evidencia:'No incluye etiquetado obligatorio de contenido generado por IA · violación TikTok Policy.',       severidad:'ALTA'    },
    ],
    acciones:[
      { accion:'Reporte a TikTok · solicitud retirada urgente',                  plazo:'05/05/2026', estado:'Completada' },
      { accion:'Comunicado oficial PP desmintiendo el deepfake',                  plazo:'06/05/2026', estado:'Completada' },
      { accion:'Análisis forense del audio · informe técnico',                    plazo:'08/05/2026', estado:'En curso'   },
      { accion:'Notificación al Ministerio de Interior · ciberdelitos',           plazo:'07/05/2026', estado:'En curso'   },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function AtaquesNarrativosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [selectedId, setSelectedId] = useState(ATAQUES[0].id)
  const [tab, setTab] = useState<'evolucion' | 'amplificadores' | 'patrones' | 'plan'>('evolucion')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')
  const selected = useMemo(() => ATAQUES.find(a => a.id === selectedId)!, [selectedId])

  const totals = useMemo(() => {
    const cri = ATAQUES.filter(a => a.severidad === 'CRÍTICA').length
    const alt = ATAQUES.filter(a => a.severidad === 'ALTA').length
    const activos = ATAQUES.filter(a => a.fase !== 'Cerrado' && a.fase !== 'Decayendo').length
    const sospAvg = Math.round(ATAQUES.reduce((s,a) => s + a.cuentasSospechosas, 0) / ATAQUES.length)
    return { total: ATAQUES.length, cri, alt, activos, sospAvg }
  }, [])

  // Top hashtags hostiles agregado
  const topHashtags = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of ATAQUES) for (const h of a.hashtags) if (h.hostil) map.set(h.h, (map.get(h.h) || 0) + h.vol)
    return Array.from(map.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([h, v]) => ({ h, v }))
  }, [])

  // Top amplificadores agregado
  const topAmpli = useMemo(() => {
    const map = new Map<string, { menciones: number; tipo: string; pos: 'A favor'|'En contra'|'Neutral' }>()
    for (const a of ATAQUES) for (const am of a.amplificadores) {
      const cur = map.get(am.nombre) || { menciones:0, tipo:am.tipo, pos:am.posicion }
      cur.menciones += am.menciones
      map.set(am.nombre, cur)
    }
    return Array.from(map.entries()).map(([n, v]) => ({ nombre:n, ...v })).sort((a,b) => b.menciones - a.menciones).slice(0, 10)
  }, [])

  const visibles = useMemo(() => ATAQUES.filter(a => filterSev === 'Todas' || a.severidad === filterSev), [filterSev])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0f172a 0%,#0a0f1f 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center', position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, right:0, width:240, height:240, borderRadius:'50%',
            background:'radial-gradient(circle, #DC2626aa 0%, transparent 65%)' }}/>
          <div style={{ position:'relative' }}>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              <span style={{ color:'#FCA5A5' }}>●</span> RIESGO · DETECCIÓN DE ATAQUES NARRATIVOS
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.activos} ataques activos <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>requieren respuesta</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.cri} crítica(s) · {totals.alt} alta(s) · {totals.sospAvg}% cuentas sospechosas detectadas en media.
              Detección en X, TikTok, Telegram, WhatsApp, YouTube, Facebook y foros con análisis de patrones bot, deepfakes y campañas coordinadas.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, position:'relative' }}>
            <HeroKPI label="Ataques"  value={String(totals.total)}     accent="#FCA5A5"/>
            <HeroKPI label="Críticos" value={String(totals.cri)}       accent="#DC2626"/>
            <HeroKPI label="Activos"  value={String(totals.activos)}   accent="#F97316"/>
            <HeroKPI label="% Susp."  value={`${totals.sospAvg}%`}     accent="#EAB308"/>
          </div>
        </section>

        {/* ───── Filtro de severidad ───── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Severidad:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['Todas','CRÍTICA','ALTA','MEDIA','BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
                <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 12px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{s}</button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{visibles.length} ataques visibles</span>
        </div>

        {/* ───── Selector grid ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10, marginBottom:18 }}>
          {visibles.map(a => {
            const sev = SEV_META[a.severidad]
            const tm = TIPO_META[a.tipo]
            const fm = FASE_META[a.fase]
            const active = a.id === selectedId
            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
                textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background:'#fff', border:`1px solid ${active ? sev.color : '#ECECEF'}`,
                borderRadius:14, overflow:'hidden',
                boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`4px solid ${sev.color}`,
                padding:0, transition:'box-shadow 200ms',
              }}>
                <header style={{ padding:'12px 14px 8px', borderBottom:'1px solid #F5F5F7' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:sev.color, color:'#fff' }}>● {a.severidad}</span>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${tm.color}15`, color:tm.color, border:`1px solid ${tm.color}40` }}>{a.tipo.toUpperCase()}</span>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${fm.color}15`, color:fm.color, border:`1px solid ${fm.color}40` }}>{a.fase.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.25 }}>{a.titulo}</h3>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>Target: <strong style={{ color:'#3a3a3d' }}>{a.target}</strong></div>
                </header>
                <div style={{ padding:'10px 14px 10px' }}>
                  <Sparkline data={a.evolucion} color={sev.color} h={36}/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:6 }}>
                    <Mini label="Alcance"  value={a.alcance.split(' ')[0]} sub="impres."  color={sev.color}/>
                    <Mini label="% Susp."  value={`${a.cuentasSospechosas}%`} sub="cuentas"  color="#5B21B6"/>
                    <Mini label="Plataf."  value={String(a.plataformas.length)} sub="afectadas" color="#0EA5E9"/>
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Cabecera del ataque ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          borderLeft:`5px solid ${SEV_META[selected.severidad].color}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap', marginBottom:10 }}>
            <div style={{ flex:'1 1 460px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:6, background:SEV_META[selected.severidad].color, color:'#fff' }}>● {selected.severidad}</span>
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.06em', padding:'3px 8px', borderRadius:6, background:`${TIPO_META[selected.tipo].color}15`, color:TIPO_META[selected.tipo].color, border:`1px solid ${TIPO_META[selected.tipo].color}40` }}>{selected.tipo.toUpperCase()}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· INICIO: {selected.inicio}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f', lineHeight:1.2 }}>{selected.titulo}</h2>
              <p style={{ margin:'0 0 6px', fontSize:11.5, color:'#6e6e73' }}>Target: <strong style={{ color:'#3a3a3d' }}>{selected.target}</strong></p>
              <p style={{ margin:0, fontSize:13, color:'#3a3a3d', lineHeight:1.5 }}>{selected.narrativa}</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,auto)', gap:8 }}>
              <CardKPI label="Alcance"  value={selected.alcance.split(' ')[0]} sub="impres." color={SEV_META[selected.severidad].color}/>
              <CardKPI label="% Susp."  value={`${selected.cuentasSospechosas}`} sub="% cuentas" color="#5B21B6"/>
              <CardKPI label="Plataf."  value={String(selected.plataformas.length)} sub="afectadas" color="#0EA5E9"/>
              <CardKPI label="Hashtags" value={String(selected.hashtags.length)} sub="trackeados" color="#16A34A"/>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              <span>Fase: <span style={{ color:FASE_META[selected.fase].color }}>{selected.fase}</span></span>
              <span>{FASE_META[selected.fase].pct}% del ciclo</span>
            </div>
            <div style={{ display:'flex', height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
              {(['Detectado','Escalando','Pico','Decayendo','Cerrado'] as Fase[]).map(f => {
                const isPast = FASE_META[f].pct <= FASE_META[selected.fase].pct
                return <div key={f} style={{ flex:1, background: isPast ? FASE_META[selected.fase].color : 'transparent', borderRight: f !== 'Cerrado' ? '2px solid #fff' : 'none' }}/>
              })}
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'evolucion',     label:'Evolución y plataformas', count: 24 },
            { k:'amplificadores',label:'Amplificadores',          count: selected.amplificadores.length },
            { k:'patrones',      label:'Patrones detectados',     count: selected.patrones.length },
            { k:'plan',          label:'Plan de respuesta',       count: selected.acciones.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? SEV_META[selected.severidad].color : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Evolución y plataformas ───── */}
        {tab === 'evolucion' && (
          <section style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>
            {/* Curva de evolución 24h */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Evolución de menciones · últimas 24 h</h3>
                <span style={{ fontSize:11, color:'#6e6e73' }}>Resolución horaria · vol. relativo</span>
              </div>
              <BigSparkline data={selected.evolucion} color={SEV_META[selected.severidad].color}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:'#86868b', fontWeight:600, marginTop:4 }}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>ahora</span>
              </div>
              {/* Hashtags */}
              <div style={{ marginTop:18 }}>
                <h4 style={{ margin:'0 0 8px', fontSize:10.5, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Hashtags rastreados</h4>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {selected.hashtags.map(h => (
                    <span key={h.h} style={{
                      fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:999,
                      background: h.hostil ? '#FEF2F2' : '#F0F9FF',
                      color: h.hostil ? '#DC2626' : '#0369A1',
                      border:`1px solid ${h.hostil ? '#FECACA' : '#BAE6FD'}`,
                      display:'inline-flex', alignItems:'center', gap:5,
                    }}>
                      {h.h}
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, opacity:0.85 }}>{h.vol}K</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Plataformas */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Plataformas afectadas</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {selected.plataformas.map(pl => (
                  <div key={pl.p}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#1d1d1f' }}>
                        <span style={{ width:10, height:10, borderRadius:2, background:PLAT_COLOR[pl.p], display:'inline-block' }}/>
                        {pl.p}
                      </span>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:PLAT_COLOR[pl.p] }}>{pl.peso}%</span>
                    </div>
                    <div style={{ height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pl.peso}%`, height:'100%', background:PLAT_COLOR[pl.p], borderRadius:3 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB · Amplificadores ───── */}
        {tab === 'amplificadores' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Cuenta','Tipo','Seguidores','Posición','Menciones'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...selected.amplificadores].sort((a,b) => b.menciones - a.menciones).map((am, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{i+1}</td>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#1d1d1f' }}>{am.nombre}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background: am.tipo === 'Bot detectado' ? '#DC2626' : am.tipo === 'Político' ? '#1F4E8C' : am.tipo === 'Medio' ? '#7C3AED' : am.tipo === 'Influencer' ? '#F97316' : '#525258',
                          color:'#fff',
                        }}>{am.tipo.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{am.seguidores}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${POS_COLOR[am.posicion]}15`, color:POS_COLOR[am.posicion], border:`1px solid ${POS_COLOR[am.posicion]}40`,
                        }}>{am.posicion.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${Math.min(100, (am.menciones / 1240) * 100)}%`, height:'100%', background:POS_COLOR[am.posicion] }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:11.5, fontWeight:700, color:'#1d1d1f', minWidth:36, textAlign:'right' }}>{am.menciones}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Patrones ───── */}
        {tab === 'patrones' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:10 }}>
            {selected.patrones.map((p, i) => (
              <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`3px solid ${SEV_META[p.severidad].color}`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:14, color:SEV_META[p.severidad].color, fontWeight:800 }}>!</span>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 7px', borderRadius:4,
                    background:SEV_META[p.severidad].color, color:'#fff',
                  }}>{p.severidad}</span>
                </div>
                <h4 style={{ margin:'0 0 5px', fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{p.tipo}</h4>
                <p style={{ margin:0, fontSize:12, color:'#3a3a3d', lineHeight:1.45 }}>{p.evidencia}</p>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Plan ───── */}
        {tab === 'plan' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:680 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Acción','Plazo','Estado'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.acciones.map((a, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#1d1d1f' }}>{a.accion}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', color:'#1d1d1f', whiteSpace:'nowrap' }}>{a.plazo}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 8px', borderRadius:999,
                          background:`${ACC_META[a.estado]}15`, color:ACC_META[a.estado], border:`1px solid ${ACC_META[a.estado]}40`,
                        }}>{a.estado.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── Sección final · Top hashtags + amplificadores agregados ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginTop:18 }}>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Top hashtags hostiles · agregado</h3>
            <p style={{ margin:'0 0 14px', fontSize:11, color:'#6e6e73' }}>De los {ATAQUES.length} ataques activos · ordenados por volumen</p>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {topHashtags.map((h, i) => (
                <div key={h.h} style={{
                  display:'grid', gridTemplateColumns:'24px 1fr auto', gap:10, alignItems:'center',
                  padding:'8px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8,
                }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#DC2626' }}>{i+1}</span>
                  <span style={{ fontSize:12.5, fontWeight:600, color:'#7F1D1D' }}>{h.h}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#DC2626' }}>{h.v}K</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Top amplificadores · agregado de todos los ataques</h3>
            <p style={{ margin:'0 0 14px', fontSize:11, color:'#6e6e73' }}>Cuentas con más menciones detectadas en campañas activas</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {topAmpli.map((a, i) => (
                <div key={a.nombre} style={{
                  display:'grid', gridTemplateColumns:'24px 1fr auto auto', gap:10, alignItems:'center',
                  padding:'7px 10px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8,
                }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{i+1}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</span>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 6px', borderRadius:4,
                    background: a.tipo === 'Bot detectado' ? '#DC2626' : a.tipo === 'Político' ? '#1F4E8C' : a.tipo === 'Medio' ? '#7C3AED' : a.tipo === 'Influencer' ? '#F97316' : '#525258',
                    color:'#fff',
                  }}>{a.tipo.toUpperCase()}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color: POS_COLOR[a.pos as keyof typeof POS_COLOR] }}>{a.menciones}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Detección de Ataques Narrativos · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:`1px solid ${accent}55` }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.75, marginTop:4, color:accent }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ textAlign:'center', minWidth:80, padding:'8px 12px', background:'#FAFAFB', borderRadius:10, border:'1px solid #ECECEF' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:8.5, color:'#86868b', marginTop:1 }}>{sub}</div>}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 8px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1 }}>{value}{sub && <span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>{sub}</span>}</div>
      <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  )
}

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}22`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}

function BigSparkline({ data, color }: { data: number[], color: string }) {
  const w = 800, h = 180
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 16 - ((v - min) / range) * (h - 32)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  // Gradient ID estable
  const gid = `g-${color.replace('#','')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid horizontal */}
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="0" y1={h * p} x2={w} y2={h * p} stroke="#ECECEF" strokeWidth="1" strokeDasharray="2 4"/>
      ))}
      <polyline points={area} fill={`url(#${gid})`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((v, i) => {
        if (i % 3 !== 0) return null
        const x = (i / (data.length - 1)) * w
        const y = h - 16 - ((v - min) / range) * (h - 32)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>
      })}
    </svg>
  )
}
