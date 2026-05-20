'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

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
  /** Enlace al BOCG / BOE / acta concreta del hito */
  url?: string
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
  /** URL al PDF / HTML del BOCG correspondiente */
  url?: string
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
  fase: 'En tramitación' | 'Aprobada' | 'En Senado' | 'En BOE' | 'Devuelta' | 'Rechazada'
  /** PL · Proyecto de Ley · PPL · Proposición de Ley · RDL · Real Decreto-Ley · LO · Ley Orgánica · RD · Real Decreto */
  tipo?: 'PL' | 'PPL' | 'RDL' | 'RD' | 'LO' | 'Tratado'
  /** Categoría temática · usada para filtros */
  categoria?: 'Económica' | 'Social' | 'Justicia' | 'Educación' | 'Sanidad' | 'Territorial' | 'Energía' | 'Defensa' | 'Internacional' | 'Digital' | 'Agraria' | 'Otra'
  diasTramite: number
  enmiendasTotal: number
  enmiendasAceptadas: number
  comparecencias: number
  votacionesTotales: number
  hitos: Hito[]
  enmiendas: Enmienda[]
  versiones: Version[]
  actores: Actor[]
  // ───────── Enlaces a fuentes oficiales ─────────
  /** Ficha de la iniciativa en el portal del Congreso (búsqueda por expediente) */
  url_congreso?: string
  /** Ficha en el Senado · solo si la iniciativa ha llegado al Senado */
  url_senado?: string
  /** Texto consolidado en el BOE (cuando ya se ha publicado como ley) */
  url_boe?: string
  /** Búsqueda BOCG (Boletín Oficial Cortes Generales) por expediente */
  url_bocg?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers para construir URLs reales del Congreso, BOCG y BOE
// ─────────────────────────────────────────────────────────────────────────

/**
 * URL canónica de búsqueda de iniciativa en el portal del Congreso por
 * número de expediente. Funciona para cualquier expediente vivo o histórico.
 */
function urlCongresoExp(exp: string): string {
  // Formato del Congreso: 121/000034 → buscador-iniciativas
  const enc = encodeURIComponent(exp)
  return `https://www.congreso.es/iniciativas?p_p_id=iniciativas&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_iniciativas_mvcRenderCommandName=%2Findex&_iniciativas_legislatura=15&_iniciativas_numExpediente=${enc}`
}

/** Búsqueda en BOCG por expediente */
function urlBOCG(exp: string): string {
  return `https://www.congreso.es/buscador?expediente=${encodeURIComponent(exp)}`
}

/** Texto consolidado del BOE por identificador de norma (BOE-A-YYYY-NNNN) */
function urlBOE(boeId: string): string {
  return `https://www.boe.es/buscar/doc.php?id=${encodeURIComponent(boeId)}`
}

/** PDF directo del BOE por identificador */
function urlBoePdf(boeId: string): string {
  // BOE-A-2026-7245 → /boe/dias/2026/MM/DD/pdfs/BOE-A-2026-7245.pdf (no determinable solo del ID)
  // Usamos la página pública del documento en su lugar
  return urlBOE(boeId)
}

/** Búsqueda Senado por expediente */
function urlSenado(exp: string): string {
  return `https://www.senado.es/web/expedientiniciativa/index?detalleIniciativaSeleccionada=true&numexp=${encodeURIComponent(exp)}`
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
 'Aceptada': '#16A34A',
 'Rechazada': '#DC2626',
 'Transaccionada': '#F97316',
 'Retirada': '#6e6e73',
 'Pendiente': '#5B21B6',
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
    tipo: 'PL',
    categoria: 'Económica',
    url_congreso: urlCongresoExp('121/000034'),
    url_bocg: urlBOCG('121/000034'),
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
    tipo: 'PL',
    categoria: 'Social',
    url_congreso: urlCongresoExp('121/000041'),
    url_bocg: urlBOCG('121/000041'),
    url_senado: urlSenado('621/000041'),
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
    tipo: 'PPL',
    categoria: 'Justicia',
    url_congreso: urlCongresoExp('122/000022'),
    url_bocg: urlBOCG('122/000022'),
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
    tipo: 'PL',
    categoria: 'Energía',
    url_congreso: urlCongresoExp('121/000027'),
    url_bocg: urlBOCG('121/000027'),
    url_senado: urlSenado('621/000027'),
    url_boe: urlBOE('BOE-A-2026-7245'),
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
    tipo: 'PL',
    categoria: 'Territorial',
    url_congreso: urlCongresoExp('121/000048'),
    url_bocg: urlBOCG('121/000048'),
  },

  // ═════════════════════════════════════════════════════════════════════
  // 7 expedientes adicionales · ampliación del seguimiento
  // Cada uno con enlaces directos a Congreso · BOCG · Senado · BOE
  // ═════════════════════════════════════════════════════════════════════

  {
    id: 'amnistia-2024',
    exp: '122/000018',
    title: 'Ley Orgánica de amnistía para la normalización institucional, política y social en Cataluña',
    promotor: 'GP Socialista',
    registro: '13/11/2023',
    fase: 'En BOE',
    diasTramite: 224,
    enmiendasTotal: 487,
    enmiendasAceptadas: 28,
    comparecencias: 18,
    votacionesTotales: 17,
    hitos: [
      { fase:'registro',  fecha:'13/11/2023', titulo:'Registro de la PPL en el Congreso', detalle:'Iniciativa del GP Socialista', resultado:'ok', url: urlBOCG('122/000018') },
      { fase:'totalidad', fecha:'12/12/2023', titulo:'Toma en consideración', detalle:'179 SÍ / 171 NO · pasa a ponencia', resultado:'ok' },
      { fase:'enmiendas', fecha:'30/01/2024', titulo:'Cierre plazo enmiendas', detalle:'487 enmiendas · récord de la legislatura', resultado:'ok' },
      { fase:'pleno-c',   fecha:'30/01/2024', titulo:'Rechazo en primera votación', detalle:'171 SÍ (PSOE+Sumar+nacionalistas) / 179 NO · vuelve a comisión', resultado:'rechazado' },
      { fase:'pleno-c',   fecha:'14/03/2024', titulo:'Aprobación en Pleno Congreso', detalle:'178 SÍ / 172 NO · texto remitido al Senado', resultado:'ok' },
      { fase:'senado',    fecha:'14/05/2024', titulo:'Veto del Senado', detalle:'Mayoría absoluta del PP impone veto', resultado:'ok' },
      { fase:'devuelto',  fecha:'30/05/2024', titulo:'Levantamiento del veto en el Congreso', detalle:'177 SÍ / 172 NO · texto definitivo', resultado:'ok' },
      { fase:'aprobado',  fecha:'30/05/2024', titulo:'Aprobación final', detalle:'Texto definitivo aprobado tras vencer veto Senado', resultado:'ok' },
      { fase:'boe',       fecha:'11/06/2024', titulo:'Publicación BOE', detalle:'Ley Orgánica 1/2024 · BOE-A-2024-11800', resultado:'ok', url: urlBOE('BOE-A-2024-11800') },
    ],
    enmiendas: [
      { num:'018-001', autor:'GP Popular',  partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada', votacion:'30/01/2024 · 171 SÍ / 179 NO' },
      { num:'018-008', autor:'GP VOX',      partido:'VOX',   color:'#5BA02E', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'018-074', autor:'GP Junts',    partido:'Junts', color:'#1FA89B', alcance:'Parcial',   articulo:'Art. 1.4', estado:'Transaccionada' },
      { num:'018-198', autor:'GP ERC',      partido:'ERC',   color:'#E8A030', alcance:'Parcial',   articulo:'Art. 2',  estado:'Aceptada' },
    ],
    versiones: [
      { v:'V1 · texto inicial',     fecha:'13/11/2023', fuente:'BOCG 122-1', cambios:'Texto del GP Socialista', diff:{add:0,del:0,mod:0}, url: urlBOCG('122/000018') },
      { v:'V2 · informe ponencia',  fecha:'14/02/2024', fuente:'BOCG 122-2', cambios:'Reforma art. 1 · alcance', diff:{add:1,del:0,mod:3} },
      { v:'V3 · texto Pleno (1)',   fecha:'30/01/2024', fuente:'BOCG 122-3', cambios:'Texto rechazado · vuelve a comisión', diff:{add:0,del:1,mod:2} },
      { v:'V4 · texto definitivo',  fecha:'14/03/2024', fuente:'BOCG 122-4', cambios:'Texto aprobado tras transaccionar con Junts y ERC', diff:{add:2,del:0,mod:5} },
      { v:'V5 · texto BOE',         fecha:'11/06/2024', fuente:'BOE 11800',  cambios:'Texto definitivo publicado', diff:{add:0,del:0,mod:0}, url: urlBOE('BOE-A-2024-11800') },
    ],
    actores: [
      { nombre:'Patxi López',       rol:'Promotor', partido:'PSOE',  color:'#E1322D' },
      { nombre:'Félix Bolaños',     rol:'Compareciente', partido:'PSOE', color:'#E1322D' },
      { nombre:'Cuca Gamarra',      rol:'Portavoz', partido:'PP',    color:'#1F4E8C' },
      { nombre:'Pepa Millet',       rol:'Ponente',  partido:'Junts', color:'#1FA89B' },
      { nombre:'Pilar Vallugera',   rol:'Ponente',  partido:'ERC',   color:'#E8A030' },
    ],
    tipo: 'LO',
    categoria: 'Justicia',
    url_congreso: urlCongresoExp('122/000018'),
    url_bocg: urlBOCG('122/000018'),
    url_senado: urlSenado('605/000018'),
    url_boe: urlBOE('BOE-A-2024-11800'),
  },

  {
    id: 'sanidad-universal',
    exp: '121/000045',
    title: 'Ley de Sanidad Universal · cobertura para inmigrantes en situación irregular',
    promotor: 'Gobierno (Sanidad)',
    registro: '08/04/2026',
    fase: 'En tramitación',
    diasTramite: 30,
    enmiendasTotal: 187,
    enmiendasAceptadas: 32,
    comparecencias: 9,
    votacionesTotales: 4,
    hitos: [
      { fase:'registro',  fecha:'08/04/2026', titulo:'Entrada en el Registro', detalle:'Remitido por el Consejo de Ministros', resultado:'ok', url: urlBOCG('121/000045') },
      { fase:'mesa',      fecha:'10/04/2026', titulo:'Calificación favorable', detalle:'Comisión de Sanidad', resultado:'ok' },
      { fase:'totalidad', fecha:'24/04/2026', titulo:'Debate de totalidad', detalle:'179 SÍ / 168 NO · pasa al articulado', resultado:'ok' },
      { fase:'enmiendas', fecha:'02/05/2026', titulo:'Cierre plazo enmiendas', detalle:'187 enmiendas · 11 grupos', resultado:'ok' },
      { fase:'ponencia',  fecha:'13/05/2026', titulo:'Comparecencias en comisión', detalle:'Médicos sin Fronteras · CGE · Ministerio Inclusión', resultado:'pendiente' },
      { fase:'comision',  fecha:'—',          titulo:'Dictamen Comisión', detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'pleno-c',   fecha:'—',          titulo:'Pleno Congreso', detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'senado',    fecha:'—',          titulo:'Tramitación Senado', detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'aprobado',  fecha:'—',          titulo:'Aprobación final', detalle:'Sin iniciar', resultado:'pendiente' },
      { fase:'boe',       fecha:'—',          titulo:'Publicación BOE', detalle:'Sin iniciar', resultado:'pendiente' },
    ],
    enmiendas: [
      { num:'045-001', autor:'GP Popular', partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'045-002', autor:'GP VOX',     partido:'VOX',   color:'#5BA02E', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'045-031', autor:'GP Sumar',   partido:'Sumar', color:'#D43F8D', alcance:'Parcial',   articulo:'Art. 4',  estado:'Aceptada' },
      { num:'045-082', autor:'GP ERC',     partido:'ERC',   color:'#E8A030', alcance:'Parcial',   articulo:'Art. 7',  estado:'Pendiente' },
    ],
    versiones: [
      { v:'V1 · texto inicial', fecha:'08/04/2026', fuente:'BOCG 121-1', cambios:'Texto remitido por el Gobierno', diff:{add:0,del:0,mod:0}, url: urlBOCG('121/000045') },
    ],
    actores: [
      { nombre:'Mónica García',     rol:'Promotor', partido:'Sumar', color:'#D43F8D' },
      { nombre:'Ana Prieto',        rol:'Ponente',  partido:'PSOE',  color:'#E1322D' },
      { nombre:'Elvira Velasco',    rol:'Ponente',  partido:'PP',    color:'#1F4E8C' },
      { nombre:'Médicos sin Front.', rol:'Compareciente', partido:'ONG', color:'#0F766E' },
    ],
    tipo: 'PL',
    categoria: 'Sanidad',
    url_congreso: urlCongresoExp('121/000045'),
    url_bocg: urlBOCG('121/000045'),
  },

  {
    id: 'losu-revision',
    exp: '121/000044',
    title: 'Ley Orgánica de Universidades · revisión de la LOSU 2/2023',
    promotor: 'Gobierno (Universidades)',
    registro: '01/04/2026',
    fase: 'En tramitación',
    diasTramite: 36,
    enmiendasTotal: 248,
    enmiendasAceptadas: 19,
    comparecencias: 21,
    votacionesTotales: 3,
    hitos: [
      { fase:'registro',  fecha:'01/04/2026', titulo:'Entrada en el Registro', detalle:'Remitido por el Gobierno', resultado:'ok', url: urlBOCG('121/000044') },
      { fase:'mesa',      fecha:'04/04/2026', titulo:'Calificación favorable', detalle:'Comisión de Ciencia y Universidades', resultado:'ok' },
      { fase:'totalidad', fecha:'17/04/2026', titulo:'Debate de totalidad', detalle:'175 SÍ / 168 NO · margen estrecho', resultado:'ok' },
      { fase:'enmiendas', fecha:'10/05/2026', titulo:'Cierre plazo enmiendas', detalle:'248 enmiendas · CRUE pidió ampliación', resultado:'ok' },
      { fase:'ponencia',  fecha:'—',          titulo:'Informe ponencia', detalle:'Pendiente · sesiones de comparecencias', resultado:'pendiente' },
    ],
    enmiendas: [
      { num:'044-001', autor:'GP Popular', partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'044-052', autor:'GP Sumar',   partido:'Sumar', color:'#D43F8D', alcance:'Parcial',   articulo:'Art. 12', estado:'Aceptada' },
      { num:'044-097', autor:'GP ERC',     partido:'ERC',   color:'#E8A030', alcance:'Parcial',   articulo:'Art. 18', estado:'Pendiente' },
    ],
    versiones: [
      { v:'V1 · texto inicial', fecha:'01/04/2026', fuente:'BOCG 121-1', cambios:'Texto remitido por el Gobierno', diff:{add:0,del:0,mod:0}, url: urlBOCG('121/000044') },
    ],
    actores: [
      { nombre:'Diana Morant',  rol:'Promotor',     partido:'PSOE', color:'#E1322D' },
      { nombre:'Pilar Alegría', rol:'Compareciente',partido:'PSOE', color:'#E1322D' },
      { nombre:'CRUE',          rol:'Compareciente',partido:'Sect.',color:'#0F766E' },
    ],
    tipo: 'LO',
    categoria: 'Educación',
    url_congreso: urlCongresoExp('121/000044'),
    url_bocg: urlBOCG('121/000044'),
  },

  {
    id: 'agro-rdl',
    exp: '121/000037',
    title: 'Real Decreto-ley 4/2026 · ayudas urgentes al sector agroalimentario',
    promotor: 'Gobierno (Agricultura)',
    registro: '18/04/2026',
    fase: 'Aprobada',
    diasTramite: 13,
    enmiendasTotal: 0,
    enmiendasAceptadas: 0,
    comparecencias: 4,
    votacionesTotales: 1,
    hitos: [
      { fase:'registro', fecha:'18/04/2026', titulo:'Aprobación por el Consejo de Ministros', detalle:'Real Decreto-ley publicado en BOE el mismo día', resultado:'ok', url: urlBOE('BOE-A-2026-8000') },
      { fase:'mesa',     fecha:'22/04/2026', titulo:'Remitido al Congreso para convalidación', detalle:'Plazo 30 días naturales', resultado:'ok' },
      { fase:'pleno-c',  fecha:'01/05/2026', titulo:'Convalidación en Pleno Congreso', detalle:'175 SÍ / 168 NO / 7 ABS · convalidado', resultado:'ok' },
      { fase:'aprobado', fecha:'01/05/2026', titulo:'Convalidado · vigencia confirmada', detalle:'Sin tramitación como PL', resultado:'ok' },
      { fase:'boe',      fecha:'18/04/2026', titulo:'Vigente desde su publicación', detalle:'BOE-A-2026-8000 · convalidado por el Congreso', resultado:'ok', url: urlBOE('BOE-A-2026-8000') },
    ],
    enmiendas: [],
    versiones: [
      { v:'V1 · texto BOE', fecha:'18/04/2026', fuente:'BOE 8000', cambios:'Texto publicado por el Gobierno', diff:{add:0,del:0,mod:0}, url: urlBOE('BOE-A-2026-8000') },
    ],
    actores: [
      { nombre:'Luis Planas',     rol:'Promotor',     partido:'PSOE', color:'#E1322D' },
      { nombre:'COAG',            rol:'Compareciente',partido:'Sect.',color:'#0F766E' },
      { nombre:'ASAJA',           rol:'Compareciente',partido:'Sect.',color:'#0F766E' },
    ],
    tipo: 'RDL',
    categoria: 'Agraria',
    url_congreso: urlCongresoExp('121/000037'),
    url_boe: urlBOE('BOE-A-2026-8000'),
  },

  {
    id: 'ia-electoral',
    exp: '124/000003',
    title: 'Resolución del Congreso sobre IA aplicada a procesos electorales',
    promotor: 'Mesa del Congreso',
    registro: '15/04/2026',
    fase: 'Aprobada',
    diasTramite: 15,
    enmiendasTotal: 12,
    enmiendasAceptadas: 8,
    comparecencias: 6,
    votacionesTotales: 1,
    hitos: [
      { fase:'registro',  fecha:'15/04/2026', titulo:'Iniciativa de la Mesa', detalle:'Marco voluntario para campañas con IA generativa', resultado:'ok' },
      { fase:'comision',  fecha:'25/04/2026', titulo:'Dictamen Comisión Constitucional', detalle:'Aprobado por consenso · 32 SÍ / 0 NO / 1 ABS', resultado:'ok' },
      { fase:'pleno-c',   fecha:'30/04/2026', titulo:'Aprobación en Pleno', detalle:'341 SÍ / 9 NO · resolución vinculante', resultado:'ok' },
      { fase:'aprobado',  fecha:'30/04/2026', titulo:'Resolución aprobada', detalle:'Texto definitivo', resultado:'ok' },
      { fase:'boe',       fecha:'07/05/2026', titulo:'Publicación BOE', detalle:'BOE-A-2026-9821', resultado:'ok', url: urlBOE('BOE-A-2026-9821') },
    ],
    enmiendas: [
      { num:'003-001', autor:'GP Sumar',  partido:'Sumar', color:'#D43F8D', alcance:'Parcial', articulo:'Pto. 4', estado:'Aceptada' },
      { num:'003-005', autor:'GP Popular',partido:'PP',    color:'#1F4E8C', alcance:'Parcial', articulo:'Pto. 7', estado:'Aceptada' },
    ],
    versiones: [
      { v:'V1 · texto Mesa', fecha:'15/04/2026', fuente:'BOCG 124-1', cambios:'Texto inicial de la Mesa', diff:{add:0,del:0,mod:0} },
      { v:'V2 · texto BOE',  fecha:'07/05/2026', fuente:'BOE 9821',   cambios:'Texto definitivo publicado', diff:{add:1,del:0,mod:0}, url: urlBOE('BOE-A-2026-9821') },
    ],
    actores: [
      { nombre:'Francina Armengol',  rol:'Promotor', partido:'PSOE', color:'#E1322D' },
      { nombre:'AEPD',               rol:'Compareciente',partido:'Inst.',color:'#7C3AED' },
      { nombre:'CNMC',               rol:'Compareciente',partido:'Inst.',color:'#7C3AED' },
    ],
    tipo: 'PPL',
    categoria: 'Digital',
    url_congreso: urlCongresoExp('124/000003'),
    url_boe: urlBOE('BOE-A-2026-9821'),
  },

  {
    id: 'energia-rdl',
    exp: '121/000040',
    title: 'Real Decreto-ley 3/2026 · medidas energéticas urgentes y bono social',
    promotor: 'Gobierno (Transición Ecológica)',
    registro: '02/04/2026',
    fase: 'Devuelta',
    diasTramite: 38,
    enmiendasTotal: 64,
    enmiendasAceptadas: 12,
    comparecencias: 7,
    votacionesTotales: 3,
    hitos: [
      { fase:'registro',  fecha:'02/04/2026', titulo:'Aprobación CMin · publicación BOE', detalle:'BOE-A-2026-7100', resultado:'ok', url: urlBOE('BOE-A-2026-7100') },
      { fase:'mesa',      fecha:'05/04/2026', titulo:'Remitido al Congreso para convalidación', detalle:'Plazo 30 días', resultado:'ok' },
      { fase:'pleno-c',   fecha:'17/04/2026', titulo:'Convalidación en Pleno', detalle:'176 SÍ / 174 NO · margen mínimo', resultado:'ok' },
      { fase:'enmiendas', fecha:'25/04/2026', titulo:'Tramitación como PL', detalle:'Acuerdo para tramitar como Proyecto de Ley · plazo de enmiendas', resultado:'ok' },
      { fase:'senado',    fecha:'07/05/2026', titulo:'Senado introduce enmiendas', detalle:'PP+VOX modifican el bono social y plazos · texto devuelto', resultado:'ok' },
      { fase:'devuelto',  fecha:'14/05/2026', titulo:'Pendiente votación final en Congreso', detalle:'PSOE-Sumar ven inviable mantener enmiendas Senado', resultado:'pendiente' },
    ],
    enmiendas: [
      { num:'040-001', autor:'GP Popular',  partido:'PP',    color:'#1F4E8C', alcance:'Totalidad', articulo:'—',       estado:'Rechazada' },
      { num:'040-024', autor:'GP Sumar',    partido:'Sumar', color:'#D43F8D', alcance:'Parcial',   articulo:'Art. 6',  estado:'Aceptada' },
      { num:'040-051', autor:'GP Vasco',    partido:'PNV',   color:'#7DB94B', alcance:'Parcial',   articulo:'Art. 11', estado:'Transaccionada' },
    ],
    versiones: [
      { v:'V1 · texto BOE inicial', fecha:'02/04/2026', fuente:'BOE 7100',   cambios:'Texto del RDL publicado', diff:{add:0,del:0,mod:0}, url: urlBOE('BOE-A-2026-7100') },
      { v:'V2 · informe ponencia',  fecha:'05/05/2026', fuente:'BOCG 121-2', cambios:'12 enmiendas Sumar+PNV+ERC incorporadas', diff:{add:2,del:0,mod:4} },
      { v:'V3 · texto Senado',      fecha:'07/05/2026', fuente:'BOCG 621-1', cambios:'PP+VOX modifican el bono social', diff:{add:0,del:1,mod:3} },
    ],
    actores: [
      { nombre:'Sara Aagesen',     rol:'Promotor',     partido:'PSOE', color:'#E1322D' },
      { nombre:'CNMC',             rol:'Compareciente',partido:'Inst.',color:'#7C3AED' },
      { nombre:'Iberdrola · Sect.',rol:'Compareciente',partido:'Sect.',color:'#0F766E' },
    ],
    tipo: 'RDL',
    categoria: 'Energía',
    url_congreso: urlCongresoExp('121/000040'),
    url_bocg: urlBOCG('121/000040'),
    url_senado: urlSenado('621/000040'),
    url_boe: urlBOE('BOE-A-2026-7100'),
  },

  {
    id: 'desconexion-digital',
    exp: '122/000025',
    title: 'Proposición de Ley · derecho a la desconexión digital y derechos digitales en el trabajo',
    promotor: 'GP Sumar',
    registro: '29/04/2026',
    fase: 'En tramitación',
    diasTramite: 14,
    enmiendasTotal: 0,
    enmiendasAceptadas: 0,
    comparecencias: 0,
    votacionesTotales: 0,
    hitos: [
      { fase:'registro',  fecha:'29/04/2026', titulo:'Registro de la PPL', detalle:'Iniciativa del GP Sumar', resultado:'ok', url: urlBOCG('122/000025') },
      { fase:'mesa',      fecha:'09/05/2026', titulo:'Calificación · pendiente', detalle:'En estudio por la Mesa', resultado:'pendiente' },
    ],
    enmiendas: [],
    versiones: [
      { v:'V1 · texto Sumar', fecha:'29/04/2026', fuente:'BOCG 122-1', cambios:'Texto del GP Sumar', diff:{add:0,del:0,mod:0}, url: urlBOCG('122/000025') },
    ],
    actores: [
      { nombre:'Yolanda Díaz', rol:'Promotor', partido:'Sumar', color:'#D43F8D' },
      { nombre:'Tesh Sidi',    rol:'Ponente',  partido:'Sumar', color:'#D43F8D' },
    ],
    tipo: 'PPL',
    categoria: 'Social',
    url_congreso: urlCongresoExp('122/000025'),
    url_bocg: urlBOCG('122/000025'),
  },
]

export default function TrazabilidadPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

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
 <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 10px', color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.title}
 </h2>
              {/* Botones de fuente oficial */}
 <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {selected.url_congreso && (
 <FuenteOficialBtn href={selected.url_congreso} icon="" label="Ficha Congreso" color="#1F4E8C"/>
                )}
                {selected.url_bocg && (
 <FuenteOficialBtn href={selected.url_bocg} icon="" label="BOCG" color="#5B21B6"/>
                )}
                {selected.url_senado && (
 <FuenteOficialBtn href={selected.url_senado} icon="" label="Ficha Senado" color="#7C3AED"/>
                )}
                {selected.url_boe && (
 <FuenteOficialBtn href={selected.url_boe} icon="" label="Texto BOE" color="#16A34A"/>
                )}
                {!selected.url_congreso && !selected.url_bocg && !selected.url_senado && !selected.url_boe && (
 <span style={{ fontSize:11, color:'#9CA3AF', fontStyle:'italic' }}>Sin enlaces oficiales registrados</span>
                )}
 </div>
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
                        {h.url && (
 <a href={h.url} target="_blank" rel="noopener noreferrer" style={{
                            display:'inline-flex', alignItems:'center', gap:4, marginTop:6,
                            fontSize:10.5, fontWeight:600, color:'#1F4E8C', textDecoration:'none',
                            padding:'2px 8px', borderRadius:6, border:'1px solid #1F4E8C30',
                            background:'#1F4E8C08',
                          }}>
                             Ver fuente oficial
 </a>
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
 <p style={{ margin:'0 0 4px', fontSize:12, color:'#3a3a3d', lineHeight:1.45 }}>{v.cambios}</p>
                      {v.url && (
 <a href={v.url} target="_blank" rel="noopener noreferrer" style={{
                          display:'inline-flex', alignItems:'center', gap:4,
                          fontSize:10.5, fontWeight:600, color:'#1F4E8C', textDecoration:'none',
                          padding:'2px 8px', borderRadius:6, border:'1px solid #1F4E8C30',
                          background:'#1F4E8C08',
                        }}>
                           Abrir documento
 </a>
                      )}
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

function FuenteOficialBtn({ href, icon, label, color }: { href:string, icon:string, label:string, color:string }) {
  return (
 <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'5px 11px', borderRadius:8,
      background:'#fff', border:`1px solid ${color}40`, color,
      fontFamily:'inherit', fontSize:11, fontWeight:600,
      textDecoration:'none', cursor:'pointer',
      transition:'all 160ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = `${color}40` }}>
 <span style={{ fontSize:13 }}>{icon}</span>
 <span>{label}</span>
 <span style={{ fontSize:9, opacity:0.7 }}>↗</span>
 </a>
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
