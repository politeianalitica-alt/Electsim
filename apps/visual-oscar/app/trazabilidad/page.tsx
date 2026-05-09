'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import type { Iniciativa } from '../api/legislativo/iniciativas/route'

// ─────────────────────────────────────────────────────────────────────────
// Modelo de trazabilidad
// ─────────────────────────────────────────────────────────────────────────
type Hito = {
  fase: 'registro' | 'mesa' | 'totalidad' | 'enmiendas' | 'ponencia' | 'comision' | 'pleno-c' | 'senado' | 'devuelto' | 'aprobado' | 'boe'
  fecha: string
  titulo: string
  detalle: string
  autores?: string[]
  resultado?: 'ok' | 'pendiente' | 'rechazado'
}

type Enmienda = {
  num: string
  autor: string
  partido: string
  color: string
  alcance: 'Totalidad' | 'Parcial' | 'Transaccional'
  articulo: string
  estado: 'Aceptada' | 'Rechazada' | 'Transaccionada' | 'Retirada' | 'Pendiente'
  votacion?: string
}

type Version = {
  v: string
  fecha: string
  fuente: string
  cambios: string
  diff: { add: number; del: number; mod: number }
}

type Actor = {
  nombre: string
  rol: 'Ponente' | 'Portavoz' | 'Compareciente' | 'Promotor'
  partido: string
  color: string
}

type Expediente = {
  id: string
  exp: string
  title: string
  promotor: string
  registro: string
  fase: 'En tramitación' | 'Aprobada' | 'En Senado' | 'En BOE' | 'Devuelta'
  diasTramite: number
  enmiendasTotal: number
  enmiendasAceptadas: number
  comparecencias: number
  votacionesTotales: number
  hitos: Hito[]
  enmiendas: Enmienda[]
  versiones: Version[]
  actores: Actor[]
}

const FASE_META: Record<Hito['fase'], { label: string; color: string; orden: number }> = {
  'registro':   { label:'Registro de entrada',          color:'#6e6e73', orden: 1 },
  'mesa':       { label:'Calificación · Mesa',          color:'#0E7490', orden: 2 },
  'totalidad':  { label:'Debate de totalidad',          color:'#1F4E8C', orden: 3 },
  'enmiendas':  { label:'Plazo de enmiendas',           color:'#5B21B6', orden: 4 },
  'ponencia':   { label:'Ponencia · informe',           color:'#7C3AED', orden: 5 },
  'comision':   { label:'Dictamen Comisión',            color:'#F97316', orden: 6 },
  'pleno-c':    { label:'Pleno · Congreso',             color:'#1F4E8C', orden: 7 },
  'senado':     { label:'Tramitación Senado',           color:'#5B21B6', orden: 8 },
  'devuelto':   { label:'Devuelto al Congreso',         color:'#EAB308', orden: 9 },
  'aprobado':   { label:'Aprobación final',             color:'#16A34A', orden: 10 },
  'boe':        { label:'Publicación BOE',              color:'#0F766E', orden: 11 },
}

const ESTADO_ENMI: Record<Enmienda['estado'], string> = {
  'Aceptada':       '#16A34A',
  'Rechazada':      '#DC2626',
  'Transaccionada': '#F97316',
  'Retirada':       '#6e6e73',
  'Pendiente':      '#5B21B6',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos mock · 5 expedientes con trazabilidad detallada
// ─────────────────────────────────────────────────────────────────────────
const EXPEDIENTES: Expediente[] = [
  {
    id: 'irpf-2026',
    exp: '121/000034',
    title: 'Reforma del IRPF y rentas del capital · ejercicio 2026',
    promotor: 'Gobierno (Hacienda)',
    registro: '12/03/2026',
    fase: 'En tramitación',
    diasTramite: 56,
    enmiendasTotal: 218,
    enmiendasAceptadas: 47,
    comparecencias: 14,
    votacionesTotales: 9,
    hitos: [
      { fase:'registro',  fecha:'12/03/2026', titulo:'Entrada en el Registro del Congreso', detalle:'Remitido por el Consejo de Ministros (acuerdo 11/03/2026)', autores:['Gobierno'], resultado:'ok' },
      { fase:'mesa',      fecha:'14/03/2026', titulo:'Calificación favorable Mesa del Congreso', detalle:'Procedimiento ordinario · Comisión de Hacienda · publicado en BOCG núm. 121-1', autores:['Mesa del Congreso'], resultado:'ok' },
      { fase:'totalidad', fecha:'08/04/2026', titulo:'Debate y rechazo de las enmiendas a la totalidad', detalle:'Rechazadas las enmiendas de devolución (PP, VOX, UPN). Apoyo PSOE+Sumar+nacionalistas', autores:['Pleno'], resultado:'ok' },
      { fase:'enmiendas', fecha:'17/04/2026', titulo:'Cierre del plazo de enmiendas al articulado', detalle:'218 enmiendas presentadas · 11 grupos parlamentarios + 4 individuales', autores:['Grupos Parlamentarios'], resultado:'ok' },
      { fase:'ponencia',  fecha:'25/04/2026', titulo:'Informe de ponencia', detalle:'Aprobado el informe con incorporación de 47 enmiendas (24 de PSOE, 11 Sumar, 7 ERC, 3 Junts, 2 PNV)', autores:['Ponencia'], resultado:'ok' },
      { fase:'comision',  fecha:'06/05/2026', titulo:'Dictamen en Comisión de Hacienda', detalle:'Pendiente de votación final del dictamen y reserva de votos particulares', autores:['Comisión Hacienda'], resultado:'pendiente' },
      { fase:'pleno-c',   fecha:'21/05/2026', titulo:'Debate y votación en Pleno del Congreso', detalle:'Previsto para tercera semana de mayo · sin fecha cerrada', autores:['Pleno'], resultado:'pendiente' },
      { fase:'senado',    fecha:'—',          titulo:'Tramitación Senado',     detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'aprobado',  fecha:'—',          titulo:'Aprobación final',       detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'boe',       fecha:'—',          titulo:'Publicación en BOE',     detalle:'Sin iniciar', resultado:'pendiente' },
    ],
    enmiendas: [
      { num:'034-001', autor:'GP Popular',            partido:'PP',    color:'#1F4E8C', alcance:'Totalidad',     articulo:'—',          estado:'Rechazada',      votacion:'08/04/2026 · 168 SÍ / 178 NO / 4 ABS' },
      { num:'034-002', autor:'GP VOX',                partido:'VOX',   color:'#5BA02E', alcance:'Totalidad',     articulo:'—',          estado:'Rechazada',      votacion:'08/04/2026 · 33 SÍ / 313 NO / 4 ABS' },
      { num:'034-014', autor:'GP Socialista',         partido:'PSOE',  color:'#E1322D', alcance:'Parcial',       articulo:'Art. 4',     estado:'Aceptada',       votacion:'25/04/2026 · ponencia' },
      { num:'034-029', autor:'GP Sumar',              partido:'Sumar', color:'#D43F8D', alcance:'Parcial',       articulo:'Art. 7',     estado:'Aceptada',       votacion:'25/04/2026 · ponencia' },
      { num:'034-061', autor:'GP ERC',                partido:'ERC',   color:'#E8A030', alcance:'Parcial',       articulo:'Art. 9 bis', estado:'Transaccionada', votacion:'25/04/2026 · acuerdo PSOE+ERC' },
      { num:'034-072', autor:'GP Junts',              partido:'Junts', color:'#1FA89B', alcance:'Parcial',       articulo:'Art. 12',    estado:'Transaccionada', votacion:'25/04/2026 · acuerdo PSOE+Junts' },
      { num:'034-103', autor:'GP Vasco (PNV)',        partido:'PNV',   color:'#7DB94B', alcance:'Parcial',       articulo:'Art. 14',    estado:'Aceptada',       votacion:'25/04/2026 · ponencia' },
      { num:'034-118', autor:'GP Popular',            partido:'PP',    color:'#1F4E8C', alcance:'Parcial',       articulo:'Art. 6',     estado:'Rechazada' },
      { num:'034-145', autor:'GP VOX',                partido:'VOX',   color:'#5BA02E', alcance:'Parcial',       articulo:'Art. 11',    estado:'Rechazada' },
      { num:'034-189', autor:'GP Mixto · CC',         partido:'CC',    color:'#F2C43A', alcance:'Parcial',       articulo:'D.A. 3ª',    estado:'Aceptada',       votacion:'25/04/2026 · ponencia' },
      { num:'034-201', autor:'GP Popular',            partido:'PP',    color:'#1F4E8C', alcance:'Parcial',       articulo:'D.T. 2ª',    estado:'Pendiente' },
      { num:'034-215', autor:'GP Mixto · BNG',        partido:'BNG',   color:'#5BB3D9', alcance:'Parcial',       articulo:'D.F. 1ª',    estado:'Pendiente' },
    ],
    versiones: [
      { v:'V1 · texto inicial',        fecha:'12/03/2026', fuente:'BOCG 121-1',  cambios:'Texto remitido por el Gobierno (CMin 11/03/2026)', diff:{add:0,del:0,mod:0} },
      { v:'V2 · informe ponencia',     fecha:'25/04/2026', fuente:'BOCG 121-2',  cambios:'Incorporadas 47 enmiendas: nuevo art. 9 bis, modificación de los arts. 4, 7, 12, 14, D.A. 3ª y D.F. 2ª. Tipo marginal capital sube 27% → 28%.', diff:{add:6,del:1,mod:8} },
      { v:'V3 · dictamen comisión',    fecha:'06/05/2026', fuente:'BOCG 121-3 (prev.)', cambios:'Pendiente votación. Reservas de votos particulares: PP (12), VOX (8), Sumar (3).', diff:{add:0,del:0,mod:2} },
    ],
    actores: [
      { nombre:'María Jesús Montero',   rol:'Promotor',       partido:'PSOE', color:'#E1322D' },
      { nombre:'Pedro Casares',         rol:'Ponente',        partido:'PSOE', color:'#E1322D' },
      { nombre:'Juan Bravo',            rol:'Ponente',        partido:'PP',   color:'#1F4E8C' },
      { nombre:'Carlos Hugo Fernández-Roca', rol:'Ponente',   partido:'VOX',  color:'#5BA02E' },
      { nombre:'Aina Vidal',            rol:'Ponente',        partido:'Sumar',color:'#D43F8D' },
      { nombre:'Pilar Vallugera',       rol:'Ponente',        partido:'ERC',  color:'#E8A030' },
      { nombre:'Idoia Sagastizabal',    rol:'Ponente',        partido:'PNV',  color:'#7DB94B' },
      { nombre:'José Luis Escrivá',     rol:'Compareciente',  partido:'BdE',  color:'#0F766E' },
      { nombre:'Antonio Garamendi',     rol:'Compareciente',  partido:'CEOE', color:'#0E7490' },
      { nombre:'Pepe Álvarez',          rol:'Compareciente',  partido:'UGT',  color:'#A02525' },
      { nombre:'Unai Sordo',            rol:'Compareciente',  partido:'CCOO', color:'#A02525' },
    ],
  },
  {
    id: 'vivienda-2026',
    exp: '121/000041',
    title: 'Ley de Vivienda · ampliación zonas tensionadas',
    promotor: 'Gobierno (Vivienda)',
    registro: '04/02/2026',
    fase: 'En Senado',
    diasTramite: 92,
    enmiendasTotal: 156,
    enmiendasAceptadas: 38,
    comparecencias: 11,
    votacionesTotales: 7,
    hitos: [
      { fase:'registro',  fecha:'04/02/2026', titulo:'Entrada en el Registro', detalle:'Remitido por el Consejo de Ministros', resultado:'ok' },
      { fase:'mesa',      fecha:'06/02/2026', titulo:'Calificación favorable', detalle:'Comisión de Vivienda · BOCG 121-1', resultado:'ok' },
      { fase:'totalidad', fecha:'05/03/2026', titulo:'Debate de totalidad', detalle:'Rechazadas las enmiendas de PP y VOX', resultado:'ok' },
      { fase:'enmiendas', fecha:'21/03/2026', titulo:'Cierre plazo enmiendas', detalle:'156 enmiendas presentadas', resultado:'ok' },
      { fase:'ponencia',  fecha:'05/04/2026', titulo:'Informe de ponencia', detalle:'38 enmiendas incorporadas', resultado:'ok' },
      { fase:'comision',  fecha:'15/04/2026', titulo:'Dictamen Comisión Vivienda', detalle:'Aprobado · 22 SÍ / 13 NO / 2 ABS', resultado:'ok' },
      { fase:'pleno-c',   fecha:'24/04/2026', titulo:'Aprobado en Pleno Congreso', detalle:'179 SÍ / 168 NO / 3 ABS', resultado:'ok' },
      { fase:'senado',    fecha:'02/05/2026', titulo:'Toma de razón en el Senado', detalle:'Comisión General de las CCAA · ponencia en marcha', resultado:'ok' },
      { fase:'devuelto',  fecha:'15/05/2026', titulo:'Posible devolución con enmiendas', detalle:'PP+VOX preparan veto', resultado:'pendiente' },
      { fase:'aprobado',  fecha:'—',          titulo:'Aprobación final', detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'boe',       fecha:'—',          titulo:'Publicación en BOE', detalle:'Sin iniciar', resultado:'pendiente' },
    ],
    enmiendas: [
      { num:'041-001', autor:'GP Popular',         partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'041-002', autor:'GP VOX',             partido:'VOX',   color:'#5BA02E', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'041-024', autor:'GP Sumar',           partido:'Sumar', color:'#D43F8D', alcance:'Parcial',   articulo:'Art. 18', estado:'Aceptada' },
      { num:'041-067', autor:'GP ERC',             partido:'ERC',   color:'#E8A030', alcance:'Parcial',   articulo:'Art. 22', estado:'Transaccionada' },
      { num:'041-098', autor:'GP Bildu',           partido:'Bildu', color:'#3F7A3A', alcance:'Parcial',   articulo:'D.A. 4ª', estado:'Aceptada' },
      { num:'041-128', autor:'GP Popular',         partido:'PP',    color:'#1F4E8C', alcance:'Parcial',   articulo:'Art. 11', estado:'Rechazada' },
    ],
    versiones: [
      { v:'V1 · texto inicial',     fecha:'04/02/2026', fuente:'BOCG 121-1', cambios:'Remitido por el Gobierno', diff:{add:0,del:0,mod:0} },
      { v:'V2 · informe ponencia',  fecha:'05/04/2026', fuente:'BOCG 121-2', cambios:'38 enmiendas incorporadas. Nuevo régimen de zonas tensionadas en municipios > 100k hab.', diff:{add:5,del:0,mod:6} },
      { v:'V3 · texto Pleno',       fecha:'24/04/2026', fuente:'BOCG 121-3', cambios:'Texto aprobado y remitido al Senado', diff:{add:0,del:0,mod:1} },
    ],
    actores: [
      { nombre:'Isabel Rodríguez', rol:'Promotor',     partido:'PSOE',  color:'#E1322D' },
      { nombre:'David Lucas',      rol:'Ponente',      partido:'PSOE',  color:'#E1322D' },
      { nombre:'Tesh Sidi',        rol:'Ponente',      partido:'Sumar', color:'#D43F8D' },
      { nombre:'Pilar Vallugera',  rol:'Ponente',      partido:'ERC',   color:'#E8A030' },
      { nombre:'Ada Colau',        rol:'Compareciente',partido:'Sumar', color:'#D43F8D' },
    ],
  },
  {
    id: 'cgpj-reforma',
    exp: '122/000022',
    title: 'Proposición de Ley para reformar el CGPJ',
    promotor: 'GP Popular',
    registro: '15/04/2026',
    fase: 'En tramitación',
    diasTramite: 21,
    enmiendasTotal: 34,
    enmiendasAceptadas: 0,
    comparecencias: 6,
    votacionesTotales: 2,
    hitos: [
      { fase:'registro',  fecha:'15/04/2026', titulo:'Registro de entrada', detalle:'Iniciativa parlamentaria del GP Popular', resultado:'ok' },
      { fase:'mesa',      fecha:'17/04/2026', titulo:'Calificación favorable', detalle:'Comisión de Justicia · BOCG 122-1', resultado:'ok' },
      { fase:'totalidad', fecha:'08/05/2026', titulo:'Debate y rechazo de la toma en consideración', detalle:'171 SÍ (PP+VOX+UPN) / 178 NO (PSOE+Sumar+nacionalistas)', autores:['Pleno'], resultado:'rechazado' },
      { fase:'enmiendas', fecha:'—',          titulo:'No procede',    detalle:'Iniciativa rechazada en toma en consideración', resultado:'rechazado' },
      { fase:'aprobado',  fecha:'—',          titulo:'Iniciativa decaída', detalle:'No avanza al articulado', resultado:'rechazado' },
    ],
    enmiendas: [],
    versiones: [
      { v:'V1 · texto inicial', fecha:'15/04/2026', fuente:'BOCG 122-1', cambios:'Texto del GP Popular · reforma del sistema de elección de vocales del CGPJ', diff:{add:0,del:0,mod:0} },
    ],
    actores: [
      { nombre:'Cuca Gamarra',                 rol:'Promotor', partido:'PP',   color:'#1F4E8C' },
      { nombre:'José Antonio Bermúdez de Castro', rol:'Ponente', partido:'PP',   color:'#1F4E8C' },
      { nombre:'Patxi López',                  rol:'Portavoz', partido:'PSOE', color:'#E1322D' },
    ],
  },
  {
    id: 'movilidad-2026',
    exp: '121/000027',
    title: 'Ley de Movilidad Sostenible y Transporte',
    promotor: 'Gobierno (Transportes)',
    registro: '10/01/2026',
    fase: 'En BOE',
    diasTramite: 108,
    enmiendasTotal: 312,
    enmiendasAceptadas: 96,
    comparecencias: 22,
    votacionesTotales: 14,
    hitos: [
      { fase:'registro',  fecha:'10/01/2026', titulo:'Entrada en el Registro',     detalle:'Remitido por el Gobierno', resultado:'ok' },
      { fase:'mesa',      fecha:'12/01/2026', titulo:'Calificación favorable',     detalle:'Comisión de Transportes · BOCG 121-1', resultado:'ok' },
      { fase:'totalidad', fecha:'06/02/2026', titulo:'Debate de totalidad',        detalle:'Rechazadas las enmiendas de PP y VOX', resultado:'ok' },
      { fase:'enmiendas', fecha:'21/02/2026', titulo:'Cierre plazo enmiendas',     detalle:'312 enmiendas presentadas', resultado:'ok' },
      { fase:'ponencia',  fecha:'10/03/2026', titulo:'Informe de ponencia',        detalle:'96 enmiendas incorporadas', resultado:'ok' },
      { fase:'comision',  fecha:'25/03/2026', titulo:'Dictamen Comisión',          detalle:'Aprobado · 25 SÍ / 13 NO / 2 ABS', resultado:'ok' },
      { fase:'pleno-c',   fecha:'04/04/2026', titulo:'Aprobado en Pleno Congreso', detalle:'184 SÍ / 159 NO / 7 ABS', resultado:'ok' },
      { fase:'senado',    fecha:'18/04/2026', titulo:'Tramitación Senado',         detalle:'Sin enmiendas significativas', resultado:'ok' },
      { fase:'aprobado',  fecha:'25/04/2026', titulo:'Aprobación final',           detalle:'Texto definitivo', resultado:'ok' },
      { fase:'boe',       fecha:'28/04/2026', titulo:'Publicación BOE',            detalle:'Ley 4/2026 · BOE-A-2026-7245 · entra en vigor 28/05/2026', resultado:'ok' },
    ],
    enmiendas: [
      { num:'027-001', autor:'GP Popular',  partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'027-045', autor:'GP Sumar',    partido:'Sumar', color:'#D43F8D', alcance:'Parcial',   articulo:'Art. 18', estado:'Aceptada' },
      { num:'027-128', autor:'GP ERC',      partido:'ERC',   color:'#E8A030', alcance:'Parcial',   articulo:'Art. 32', estado:'Transaccionada' },
      { num:'027-204', autor:'GP Junts',    partido:'Junts', color:'#1FA89B', alcance:'Parcial',   articulo:'D.A. 5ª', estado:'Aceptada' },
      { num:'027-289', autor:'GP Vasco',    partido:'PNV',   color:'#7DB94B', alcance:'Parcial',   articulo:'Art. 41', estado:'Aceptada' },
    ],
    versiones: [
      { v:'V1 · texto inicial',     fecha:'10/01/2026', fuente:'BOCG 121-1', cambios:'Remitido por el Gobierno', diff:{add:0,del:0,mod:0} },
      { v:'V2 · informe ponencia',  fecha:'10/03/2026', fuente:'BOCG 121-2', cambios:'96 enmiendas incorporadas', diff:{add:8,del:2,mod:14} },
      { v:'V3 · texto Pleno',       fecha:'04/04/2026', fuente:'BOCG 121-3', cambios:'Texto aprobado en Congreso', diff:{add:0,del:0,mod:2} },
      { v:'V4 · texto Senado',      fecha:'18/04/2026', fuente:'BOCG 121-4', cambios:'Sin modificaciones del Senado', diff:{add:0,del:0,mod:0} },
      { v:'V5 · texto BOE',         fecha:'28/04/2026', fuente:'BOE 7245',   cambios:'Texto definitivo publicado', diff:{add:0,del:0,mod:0} },
    ],
    actores: [
      { nombre:'Óscar Puente',     rol:'Promotor',     partido:'PSOE', color:'#E1322D' },
      { nombre:'Pedro Casares',    rol:'Ponente',      partido:'PSOE', color:'#E1322D' },
      { nombre:'Aina Vidal',       rol:'Ponente',      partido:'Sumar',color:'#D43F8D' },
      { nombre:'Marta Madrenas',   rol:'Ponente',      partido:'Junts',color:'#1FA89B' },
    ],
  },
  {
    id: 'fin-autonomica',
    exp: '121/000048',
    title: 'Ley de Financiación Autonómica · reforma art. 156',
    promotor: 'Gobierno (Hacienda)',
    registro: '20/04/2026',
    fase: 'Devuelta',
    diasTramite: 16,
    enmiendasTotal: 0,
    enmiendasAceptadas: 0,
    comparecencias: 3,
    votacionesTotales: 1,
    hitos: [
      { fase:'registro',  fecha:'20/04/2026', titulo:'Entrada en el Registro', detalle:'Remitido por el Gobierno', resultado:'ok' },
      { fase:'mesa',      fecha:'22/04/2026', titulo:'Calificación favorable', detalle:'Comisión de Hacienda', resultado:'ok' },
      { fase:'totalidad', fecha:'06/05/2026', titulo:'Bloqueo en debate de totalidad', detalle:'Sin acuerdo PSOE-PP-Junts · texto retirado y devuelto al Gobierno', resultado:'rechazado' },
    ],
    enmiendas: [],
    versiones: [
      { v:'V1 · texto inicial', fecha:'20/04/2026', fuente:'BOCG 121-1', cambios:'Texto remitido por el Gobierno', diff:{add:0,del:0,mod:0} },
    ],
    actores: [
      { nombre:'María Jesús Montero', rol:'Promotor', partido:'PSOE', color:'#E1322D' },
      { nombre:'Cuca Gamarra',        rol:'Portavoz', partido:'PP',   color:'#1F4E8C' },
      { nombre:'Miriam Nogueras',     rol:'Portavoz', partido:'Junts',color:'#1FA89B' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Canonical legislative phases for the horizontal timeline
// ─────────────────────────────────────────────────────────────────────────
const LEGISLATIVE_PHASES = [
  { id: 'presentacion',     label: 'Presentación',       color: '#6e6e73' },
  { id: 'comision_ponencia',label: 'Comisión Ponencia',  color: '#0E7490' },
  { id: 'comision_dictamen',label: 'Comisión Dictamen',  color: '#F97316' },
  { id: 'pleno_congreso',   label: 'Pleno Congreso',     color: '#1F4E8C' },
  { id: 'senado',           label: 'Senado',             color: '#5B21B6' },
  { id: 'promulgacion',     label: 'Promulgación',       color: '#16A34A' },
  { id: 'boe',              label: 'BOE',                color: '#0F766E' },
]

function guessCurrentPhaseIndex(fase: string): number {
  const f = (fase || '').toLowerCase()
  if (f.includes('boe') || f.includes('publicac')) return 6
  if (f.includes('promulg') || f.includes('aprobad')) return 5
  if (f.includes('senado')) return 4
  if (f.includes('pleno')) return 3
  if (f.includes('dictamen')) return 2
  if (f.includes('ponencia') || f.includes('comis')) return 1
  return 0
}

export default function TrazabilidadPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Real data from /api/legislativo/iniciativas
  const { data: iniciativasData } = useApi<{ items: Iniciativa[] }>('/api/legislativo/iniciativas', { refreshInterval: 600_000 })
  const iniciativas = iniciativasData?.items || []

  // Which real iniciativa is selected for the horizontal timeline
  const [selectedInicId, setSelectedInicId] = useState<string | null>(null)
  const selectedInic = useMemo(() => {
    if (!selectedInicId) return iniciativas[0] || null
    return iniciativas.find(i => i.id === selectedInicId) || iniciativas[0] || null
  }, [selectedInicId, iniciativas])

  const [selectedId, setSelectedId] = useState(EXPEDIENTES[0].id)
  const [tab, setTab] = useState<'timeline' | 'enmiendas' | 'versiones' | 'actores'>('timeline')

  const selected = useMemo(() => EXPEDIENTES.find(e => e.id === selectedId)!, [selectedId])

  const totalKPIs = useMemo(() => ({
    total: EXPEDIENTES.length,
    enmiendas: EXPEDIENTES.reduce((s, e) => s + e.enmiendasTotal, 0),
    aceptadas: EXPEDIENTES.reduce((s, e) => s + e.enmiendasAceptadas, 0),
    diasMedio: Math.round(EXPEDIENTES.reduce((s, e) => s + e.diasTramite, 0) / EXPEDIENTES.length),
  }), [])

  const tasaAceptacion = totalKPIs.enmiendas > 0 ? Math.round((totalKPIs.aceptadas / totalKPIs.enmiendas) * 100) : 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#5B21B6 0%,#2E1065 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MONITOR LEGISLATIVO · TRAZABILIDAD COMPLETA
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Recorrido íntegro de cada norma <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>desde el registro al BOE</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Hitos, enmiendas, versiones del texto, votaciones y actores intervinientes para los {EXPEDIENTES.length} expedientes en seguimiento.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Expedientes" value={String(totalKPIs.total)}/>
            <HeroKPI label="Enmiendas" value={String(totalKPIs.enmiendas)}/>
            <HeroKPI label="% Aceptadas" value={`${tasaAceptacion}%`}/>
            <HeroKPI label="Días medios" value={String(totalKPIs.diasMedio)}/>
          </div>
        </section>

        {/* ───── Timeline legislativa · datos reales ───── */}
        {iniciativas.length > 0 && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'18px 22px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12 }}>
              <div>
                <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#0F766E', textTransform:'uppercase', margin:'0 0 4px' }}>
                  TIMELINE LEGISLATIVA · DATOS EN TIEMPO REAL
                </p>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.016em', margin:0, color:'#1d1d1f' }}>
                  {selectedInic ? selectedInic.titulo_corto : 'Selecciona una iniciativa'}
                </h2>
              </div>
              <select
                value={selectedInic?.id || ''}
                onChange={e => setSelectedInicId(e.target.value)}
                style={{
                  fontSize:12, padding:'6px 10px', borderRadius:8,
                  border:'1px solid #ECECEF', background:'#fff', color:'#1d1d1f',
                  fontFamily:'inherit', cursor:'pointer', maxWidth:320,
                }}
              >
                {iniciativas.map(i => (
                  <option key={i.id} value={i.id}>{i.titulo_corto} ({i.numero_expediente})</option>
                ))}
              </select>
            </div>

            {selectedInic && (() => {
              const phaseIdx = guessCurrentPhaseIndex(selectedInic.fase_actual)
              return (
                <div>
                  {/* Horizontal phase timeline */}
                  <div style={{ display:'flex', alignItems:'flex-start', position:'relative', marginBottom:10, overflowX:'auto', paddingBottom:6 }}>
                    {LEGISLATIVE_PHASES.map((phase, i) => {
                      const done = i < phaseIdx
                      const current = i === phaseIdx
                      const color = done || current ? phase.color : '#D1D1D6'
                      return (
                        <div key={phase.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:80, position:'relative' }}>
                          {/* Connector line */}
                          {i > 0 && (
                            <div style={{
                              position:'absolute', left:0, top:14, right:'50%', height:2,
                              background: done ? LEGISLATIVE_PHASES[i-1].color : '#ECECEF',
                              zIndex:0,
                            }}/>
                          )}
                          {i < LEGISLATIVE_PHASES.length - 1 && (
                            <div style={{
                              position:'absolute', left:'50%', top:14, right:0, height:2,
                              background: done ? phase.color : '#ECECEF',
                              zIndex:0,
                            }}/>
                          )}
                          {/* Dot */}
                          <div style={{
                            width:28, height:28, borderRadius:'50%', zIndex:1,
                            background: current ? phase.color : done ? phase.color : '#fff',
                            border:`2.5px solid ${color}`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow: current ? `0 0 0 4px ${phase.color}30` : 'none',
                          }}>
                            {done && (
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M2 6.5L5.5 10L11 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {current && <div style={{ width:10, height:10, borderRadius:'50%', background:'#fff' }}/>}
                          </div>
                          {/* Label */}
                          <div style={{
                            fontSize:9.5, fontWeight: current ? 800 : done ? 700 : 500,
                            color: current ? phase.color : done ? phase.color : '#a0a0a5',
                            marginTop:6, textAlign:'center', lineHeight:1.2,
                            letterSpacing:'0.03em',
                          }}>{phase.label}</div>
                          {current && (
                            <div style={{
                              fontSize:8.5, fontWeight:700, color:'#fff',
                              background: phase.color, padding:'1px 5px',
                              borderRadius:3, marginTop:3,
                            }}>ACTUAL</div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Iniciativa metadata */}
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', padding:'10px 12px', background:'#FAFAFB', borderRadius:10, border:'1px solid #ECECEF', fontSize:11 }}>
                    <span><strong style={{ color:'#1d1d1f' }}>Exp.</strong> <span style={{ color:'#6e6e73' }}>{selectedInic.numero_expediente}</span></span>
                    {selectedInic.grupo_proponente && <span><strong style={{ color:'#1d1d1f' }}>Promotor</strong> <span style={{ color:'#6e6e73' }}>{selectedInic.grupo_proponente}</span></span>}
                    {selectedInic.comision && <span><strong style={{ color:'#1d1d1f' }}>Comisión</strong> <span style={{ color:'#6e6e73' }}>{selectedInic.comision}</span></span>}
                    {selectedInic.fecha_presentacion && <span><strong style={{ color:'#1d1d1f' }}>Presentación</strong> <span style={{ color:'#6e6e73' }}>{selectedInic.fecha_presentacion}</span></span>}
                    <span><strong style={{ color:'#1d1d1f' }}>Score</strong> <span style={{ color:'#5B21B6', fontWeight:700 }}>{selectedInic.score_importancia}</span></span>
                    {selectedInic.url_congreso && (
                      <a href={selectedInic.url_congreso} target="_blank" rel="noopener noreferrer" style={{ color:'#5B21B6', fontWeight:700, textDecoration:'none', marginLeft:'auto' }}>
                        Ver en Congreso →
                      </a>
                    )}
                  </div>
                </div>
              )
            })()}
          </section>
        )}

        {/* ───── Selector de expediente ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'14px 18px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Expediente:</span>
            <span style={{ fontSize:11.5, color:'#3a3a3d' }}>Selecciona una norma para ver su trazabilidad completa</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {EXPEDIENTES.map(e => {
              const active = e.id === selectedId
              const faseColor = e.fase === 'En BOE' ? '#0F766E'
                : e.fase === 'Aprobada' ? '#16A34A'
                : e.fase === 'En Senado' ? '#5B21B6'
                : e.fase === 'Devuelta' ? '#DC2626'
                : '#F97316'
              return (
                <button key={e.id} onClick={() => setSelectedId(e.id)} style={{
                  textAlign:'left', cursor:'pointer',
                  background: active ? '#FAFAFB' : '#fff',
                  border:`1px solid ${active ? '#5B21B6' : '#ECECEF'}`,
                  borderRadius:10, padding:'10px 12px',
                  fontFamily:'inherit',
                  boxShadow: active ? '0 0 0 3px rgba(91,33,182,0.10)' : 'none',
                  transition:'box-shadow 200ms',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${faseColor}18`, color:faseColor, border:`1px solid ${faseColor}40`,
                    }}>{e.fase.toUpperCase()}</span>
                    <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>{e.exp}</span>
                  </div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, marginBottom:3 }}>{e.title}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{e.diasTramite} días · {e.enmiendasTotal} enmiendas</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap', marginBottom:12 }}>
            <div style={{ flex:'1 1 480px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:'#5B21B6', color:'#fff',
                }}>EXP. {selected.exp}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Promotor: {selected.promotor}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Registro: {selected.registro}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:0, color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.title}
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,auto)', gap:14 }}>
              <CardKPI label="Días" value={String(selected.diasTramite)} color="#5B21B6"/>
              <CardKPI label="Enmiendas" value={String(selected.enmiendasTotal)} color="#1F4E8C"/>
              <CardKPI label="Aceptadas" value={String(selected.enmiendasAceptadas)} color="#16A34A"/>
              <CardKPI label="Comparec." value={String(selected.comparecencias)} color="#F97316"/>
            </div>
          </div>

          {/* Barra de progreso por fases */}
          <div style={{ marginTop:6 }}>
            <FaseProgress hitos={selected.hitos}/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14 }}>
          {([
            { k:'timeline',  label:'Timeline',           count: selected.hitos.length },
            { k:'enmiendas', label:'Enmiendas',          count: selected.enmiendas.length },
            { k:'versiones', label:'Versiones del texto',count: selected.versiones.length },
            { k:'actores',   label:'Actores',            count: selected.actores.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 16px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#5B21B6' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Timeline ───── */}
        {tab === 'timeline' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'24px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ position:'relative' }}>
              {/* Línea vertical */}
              <div style={{
                position:'absolute', left:13, top:6, bottom:6, width:2,
                background:'linear-gradient(180deg,#5B21B6,#ECECEF)',
              }}/>
              {selected.hitos.map((h, i) => {
                const m = FASE_META[h.fase]
                const dot = h.resultado === 'ok' ? m.color
                  : h.resultado === 'rechazado' ? '#DC2626'
                  : '#ECECEF'
                const isFuture = h.fecha === '—' || h.resultado === 'pendiente'
                return (
                  <div key={i} style={{ position:'relative', paddingLeft:42, paddingBottom:18 }}>
                    {/* Punto */}
                    <div style={{
                      position:'absolute', left:7, top:4, width:14, height:14,
                      borderRadius:'50%', background: isFuture ? '#fff' : dot,
                      border:`2px solid ${dot}`, boxShadow: isFuture ? 'none' : `0 0 0 4px ${dot}22`,
                    }}/>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:'1 1 360px', minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:999,
                            background:`${m.color}15`, color:m.color, border:`1px solid ${m.color}40`,
                          }}>{m.label.toUpperCase()}</span>
                          {h.resultado === 'rechazado' && (
                            <span style={{
                              fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                              padding:'2px 7px', borderRadius:999,
                              background:'#DC262615', color:'#DC2626', border:'1px solid #DC262640',
                            }}>RECHAZADO</span>
                          )}
                        </div>
                        <h3 style={{
                          margin:'0 0 4px',
                          fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600,
                          color: isFuture ? '#86868b' : '#1d1d1f',
                          letterSpacing:'-0.012em', lineHeight:1.3,
                        }}>{h.titulo}</h3>
                        <p style={{ margin:0, fontSize:12, color: isFuture ? '#a0a0a5' : '#3a3a3d', lineHeight:1.45 }}>{h.detalle}</p>
                        {h.autores && h.autores.length > 0 && (
                          <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                            {h.autores.map(a => (
                              <span key={a} style={{ fontSize:10, color:'#6e6e73', padding:'1px 7px', background:'#F5F5F7', borderRadius:4, fontWeight:600 }}>{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink:0, fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color: isFuture ? '#a0a0a5' : '#1d1d1f', minWidth:88, textAlign:'right' }}>
                        {h.fecha}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Enmiendas ───── */}
        {tab === 'enmiendas' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'18px 0 0', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
          }}>
            <div style={{ padding:'0 22px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
                Enmiendas presentadas · {selected.enmiendas.length} mostradas / {selected.enmiendasTotal} totales
              </h3>
              <div style={{ display:'flex', gap:10, fontSize:11, color:'#6e6e73' }}>
                {(['Aceptada','Transaccionada','Rechazada','Retirada','Pendiente'] as const).map(s => (
                  <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:ESTADO_ENMI[s] }}/>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {selected.enmiendas.length === 0 ? (
              <div style={{ padding:'30px 22px', textAlign:'center', color:'#6e6e73', fontSize:13, borderTop:'1px solid #ECECEF' }}>
                Esta norma no tiene enmiendas registradas todavía (o ha sido rechazada en toma en consideración).
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderTop:'1px solid #ECECEF', borderBottom:'1px solid #ECECEF' }}>
                    {['Núm.','Autor','Alcance','Artículo','Estado','Votación / detalle'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'9px 14px', fontSize:10, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.enmiendas.map((e, i) => (
                    <tr key={e.num} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 14px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{e.num}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:e.color, flexShrink:0 }}/>
                          <span style={{ fontWeight:600, color:'#1d1d1f' }}>{e.autor}</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#3a3a3d' }}>{e.alcance}</td>
                      <td style={{ padding:'9px 14px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{e.articulo}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{
                          fontSize:10, fontWeight:700, letterSpacing:'0.04em',
                          padding:'2px 8px', borderRadius:999,
                          background:`${ESTADO_ENMI[e.estado]}18`,
                          color:ESTADO_ENMI[e.estado],
                          border:`1px solid ${ESTADO_ENMI[e.estado]}40`,
                        }}>{e.estado.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#6e6e73', fontSize:11 }}>{e.votacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ───── TAB · Versiones del texto ───── */}
        {tab === 'versiones' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin:'0 0 16px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Historial de versiones · {selected.versiones.length} estadios documentados
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {selected.versiones.map((v, i) => {
                const isLast = i === selected.versiones.length - 1
                return (
                  <div key={v.v} style={{
                    border:'1px solid #ECECEF', borderRadius:12,
                    background: isLast ? '#FAFAFB' : '#fff',
                    padding:'14px 18px',
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:18, alignItems:'center',
                  }}>
                    <div style={{
                      width:38, height:38, borderRadius:10,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background:'#5B21B6', color:'#fff',
                      fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
                    }}>{v.v.split(' ')[0]}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{v.v}</span>
                        <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {v.fecha}</span>
                        <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:'#5B21B618', color:'#5B21B6', border:'1px solid #5B21B640',
                        }}>{v.fuente}</span>
                      </div>
                      <p style={{ margin:0, fontSize:12, color:'#3a3a3d', lineHeight:1.45 }}>{v.cambios}</p>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <DiffPill label="+" value={v.diff.add} color="#16A34A"/>
                      <DiffPill label="~" value={v.diff.mod} color="#F97316"/>
                      <DiffPill label="−" value={v.diff.del} color="#DC2626"/>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Actores ───── */}
        {tab === 'actores' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin:'0 0 16px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Actores intervinientes · {selected.actores.length}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
              {selected.actores.map(a => (
                <div key={a.nombre} style={{
                  display:'grid', gridTemplateColumns:'auto 1fr', gap:11, alignItems:'center',
                  padding:'10px 12px', border:'1px solid #ECECEF', borderRadius:10, background:'#FAFAFB',
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:'50%', background:a.color, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, flexShrink:0,
                  }}>{a.nombre.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{
                        fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                        padding:'1px 6px', borderRadius:4,
                        background:a.color, color:'#fff',
                      }}>{a.rol.toUpperCase()}</span>
                      <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{a.partido}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Trazabilidad Legislativa · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ textAlign:'center', minWidth:75 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.022em' }}>{value}</div>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
    </div>
  )
}

function DiffPill({ label, value, color }: { label:string, value:number, color:string }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'4px 9px', borderRadius:8,
      background:`${color}15`, border:`1px solid ${color}40`,
      fontSize:11.5, fontWeight:700, color,
      fontFamily:'var(--font-display)',
    }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function FaseProgress({ hitos }: { hitos: Hito[] }) {
  // Construye una barra de fases ordenada por orden canónico
  const allFases: Hito['fase'][] = ['registro','mesa','totalidad','enmiendas','ponencia','comision','pleno-c','senado','aprobado','boe']
  const completed = new Set(hitos.filter(h => h.resultado === 'ok').map(h => h.fase))
  const rejected = hitos.find(h => h.resultado === 'rechazado')

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, position:'relative' }}>
      {allFases.map((f, i) => {
        const m = FASE_META[f]
        const done = completed.has(f)
        const isReject = rejected && i === allFases.indexOf(rejected.fase)
        const dotColor = done ? m.color : isReject ? '#DC2626' : '#ECECEF'
        return (
          <div key={f} style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
            {/* Línea hacia el siguiente */}
            {i < allFases.length - 1 && (
              <div style={{
                position:'absolute', left:'50%', right:'-50%', top:11, height:2,
                background: done ? m.color : '#ECECEF',
                zIndex:0,
              }}/>
            )}
            {/* Punto */}
            <div style={{
              width:14, height:14, borderRadius:'50%',
              background: done || isReject ? dotColor : '#fff',
              border:`2px solid ${dotColor}`, zIndex:1,
              boxShadow: done ? `0 0 0 3px ${dotColor}22` : 'none',
            }}/>
            <span style={{
              fontSize:9, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase',
              color: done ? m.color : isReject ? '#DC2626' : '#a0a0a5',
              marginTop:5, textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
            }}>{m.label.split(' ').slice(0,2).join(' ')}</span>
          </div>
        )
      })}
    </div>
  )
}
