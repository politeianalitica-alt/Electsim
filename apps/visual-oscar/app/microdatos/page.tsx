'use client'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import DemoBadge from '@/components/DemoBadge'
import { buildDeepProfile } from '@/lib/voter/deep-profile'

// Datos en vivo desde /api/microdatos/voters (backend → derivado nowcast → mock)
interface VoterProfilesResponse {
  profiles?: { partido: string; total: number }[]
  generated_at?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Modelo de partidos y dimensiones
// ─────────────────────────────────────────────────────────────────────────
const PARTIES = ['PP','PSOE','VOX','Sumar','Junts','PNV','Otros'] as const
type Partido = typeof PARTIES[number]
const PC: Record<Partido, string> = {
  PP:'#1F4E8C', PSOE:'#E1322D', VOX:'#5BA02E', Sumar:'#D43F8D',
  Junts:'#1FA89B', PNV:'#7DB94B', Otros:'#9E9E9E',
}

// Ejes del selector
type Edad      = '18–24' | '25–34' | '35–44' | '45–54' | '55–64' | '65+'
type Genero    = 'Hombre' | 'Mujer'
type Estudios  = 'Sin estudios' | 'Secundaria' | 'FP' | 'Universitarios'
type Habitat   = 'Rural (<10k)' | 'Semiurbano' | 'Urbano (>100k)' | 'Gran ciudad'
type Ideologia = 'Izquierda' | 'Centro-izq.' | 'Centro' | 'Centro-dcha.' | 'Derecha'
type Empleo    = 'Estudiante' | 'Asalariado' | 'Autónomo' | 'Desempleado' | 'Pensionista' | 'Tareas hogar'
type Religion  = 'Practicante' | 'No practicante' | 'Indiferente' | 'Ateo/agnóstico'

// Ejes adicionales (alto detalle): renta, régimen de vivienda, composición del
// hogar y territorio. El territorio modela el efecto de los partidos de ámbito
// autonómico (Junts, PNV y "Otros" = ERC/Bildu/BNG/Compromís).
type Renta      = 'Baja' | 'Media-baja' | 'Media' | 'Media-alta' | 'Alta'
type Vivienda   = 'Propiedad' | 'Hipoteca' | 'Alquiler' | 'Cedida/familiar'
type Hogar      = 'Vive solo/a' | 'Pareja sin hijos' | 'Con hijos' | 'Familia numerosa' | 'Cuida mayores'
type Territorio = 'Cataluña' | 'Euskadi' | 'Galicia' | 'Madrid' | 'Andalucía' | 'C. Valenciana' | 'Castilla y León' | 'Resto'

type Perfil = {
  edad: Edad
  genero: Genero
  estudios: Estudios
  habitat: Habitat
  ideologia: Ideologia
  empleo: Empleo
  religion: Religion
  renta: Renta
  vivienda: Vivienda
  hogar: Hogar
  territorio: Territorio
}

const EDADES:    Edad[]      = ['18–24','25–34','35–44','45–54','55–64','65+']
const GENEROS:   Genero[]    = ['Hombre','Mujer']
const ESTUDIOS:  Estudios[]  = ['Sin estudios','Secundaria','FP','Universitarios']
const HABITATS:  Habitat[]   = ['Rural (<10k)','Semiurbano','Urbano (>100k)','Gran ciudad']
const IDEOLOGIAS:Ideologia[] = ['Izquierda','Centro-izq.','Centro','Centro-dcha.','Derecha']
const EMPLEOS:   Empleo[]    = ['Estudiante','Asalariado','Autónomo','Desempleado','Pensionista','Tareas hogar']
const RELIGIONES:Religion[]  = ['Practicante','No practicante','Indiferente','Ateo/agnóstico']
const RENTAS:      Renta[]      = ['Baja','Media-baja','Media','Media-alta','Alta']
const VIVIENDAS:   Vivienda[]   = ['Propiedad','Hipoteca','Alquiler','Cedida/familiar']
const HOGARES:     Hogar[]      = ['Vive solo/a','Pareja sin hijos','Con hijos','Familia numerosa','Cuida mayores']
const TERRITORIOS: Territorio[] = ['Cataluña','Euskadi','Galicia','Madrid','Andalucía','C. Valenciana','Castilla y León','Resto']

const EJE_LABEL: Record<string, string> = {
  edad:'Edad', genero:'Género', estudios:'Estudios', habitat:'Hábitat', ideologia:'Ideología',
  empleo:'Empleo', religion:'Religiosidad', renta:'Renta', vivienda:'Vivienda', hogar:'Hogar', territorio:'Territorio',
}

// Estilos compartidos del panel de análisis profundo
const dpBox: CSSProperties   = { background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:12, padding:'12px 14px' }
const dpLabel: CSSProperties = { fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }
const dpVal: CSSProperties   = { fontFamily:'var(--font-display)', fontSize:25, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1 }
const dpUnit: CSSProperties  = { fontSize:14, color:'#86868b', fontWeight:600 }
const dpSub: CSSProperties   = { fontSize:10.5, color:'#86868b', marginTop:5, lineHeight:1.3 }
const dpSubH: CSSProperties  = { margin:'0 0 10px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.06em', textTransform:'uppercase' }
const dpChip: CSSProperties  = { fontSize:11, fontWeight:600, color:'#1d1d1f', background:'#F5F5F7', border:'1px solid #ECECEF', borderRadius:999, padding:'3px 10px' }
const dpMini: CSSProperties  = { fontSize:12, color:'#3a3a3d', margin:'0 0 5px', lineHeight:1.4 }

// ─────────────────────────────────────────────────────────────────────────
// Datos base · % voto por dimensión (CIS-like)
// ─────────────────────────────────────────────────────────────────────────
const VOTO: Record<keyof Perfil, Record<string, Partial<Record<Partido, number>>>> = {
  edad:{
 '18–24':{PP:18,PSOE:22,VOX:14,Sumar:24,Junts:5,PNV:3,Otros:14},
 '25–34':{PP:24,PSOE:26,VOX:14,Sumar:20,Junts:5,PNV:4,Otros: 7},
 '35–44':{PP:28,PSOE:28,VOX:16,Sumar:14,Junts:5,PNV:4,Otros: 5},
 '45–54':{PP:32,PSOE:30,VOX:17,Sumar:10,Junts:4,PNV:3,Otros: 4},
 '55–64':{PP:36,PSOE:32,VOX:14,Sumar: 7,Junts:3,PNV:3,Otros: 5},
 '65+' :{PP:42,PSOE:34,VOX:11,Sumar: 4,Junts:2,PNV:2,Otros: 5},
  },
  genero:{
 'Hombre':{PP:30,PSOE:26,VOX:20,Sumar:12,Junts:5,PNV:4,Otros:3},
 'Mujer' :{PP:28,PSOE:33,VOX:10,Sumar:16,Junts:5,PNV:4,Otros:4},
  },
  estudios:{
 'Sin estudios' :{PP:36,PSOE:36,VOX:14,Sumar: 5,Junts:2,PNV:2,Otros:5},
 'Secundaria' :{PP:32,PSOE:29,VOX:18,Sumar:10,Junts:4,PNV:3,Otros:4},
 'FP' :{PP:30,PSOE:28,VOX:19,Sumar:11,Junts:4,PNV:4,Otros:4},
 'Universitarios':{PP:26,PSOE:29,VOX:11,Sumar:18,Junts:6,PNV:4,Otros:6},
  },
  habitat:{
 'Rural (<10k)' :{PP:40,PSOE:30,VOX:18,Sumar: 5,Junts:2,PNV:2,Otros:3},
 'Semiurbano' :{PP:32,PSOE:29,VOX:17,Sumar:11,Junts:4,PNV:3,Otros:4},
 'Urbano (>100k)':{PP:27,PSOE:30,VOX:14,Sumar:17,Junts:5,PNV:4,Otros:3},
 'Gran ciudad' :{PP:24,PSOE:31,VOX:11,Sumar:21,Junts:6,PNV:3,Otros:4},
  },
  ideologia:{
 'Izquierda' :{PP: 2,PSOE:35,VOX: 1,Sumar:42,Junts: 4,PNV: 2,Otros:14},
 'Centro-izq.' :{PP:10,PSOE:48,VOX: 3,Sumar:24,Junts: 5,PNV: 4,Otros: 6},
 'Centro' :{PP:30,PSOE:28,VOX: 8,Sumar: 8,Junts: 5,PNV: 5,Otros:16},
 'Centro-dcha.' :{PP:55,PSOE:10,VOX:18,Sumar: 2,Junts: 3,PNV: 4,Otros: 8},
 'Derecha' :{PP:42,PSOE: 4,VOX:42,Sumar: 0,Junts: 2,PNV: 2,Otros: 8},
  },
  empleo:{
 'Estudiante' :{PP:18,PSOE:22,VOX:12,Sumar:28,Junts:6,PNV:4,Otros:10},
 'Asalariado' :{PP:28,PSOE:30,VOX:16,Sumar:14,Junts:5,PNV:4,Otros:3},
 'Autónomo' :{PP:36,PSOE:22,VOX:24,Sumar: 8,Junts:4,PNV:3,Otros:3},
 'Desempleado' :{PP:22,PSOE:34,VOX:18,Sumar:14,Junts:5,PNV:3,Otros:4},
 'Pensionista' :{PP:42,PSOE:34,VOX:11,Sumar: 5,Junts:2,PNV:2,Otros:4},
 'Tareas hogar':{PP:38,PSOE:34,VOX:13,Sumar: 6,Junts:3,PNV:2,Otros:4},
  },
  religion:{
 'Practicante' :{PP:48,PSOE:18,VOX:18,Sumar: 4,Junts:3,PNV:3,Otros:6},
 'No practicante' :{PP:32,PSOE:30,VOX:15,Sumar:11,Junts:4,PNV:4,Otros:4},
 'Indiferente' :{PP:24,PSOE:32,VOX:14,Sumar:18,Junts:5,PNV:3,Otros:4},
 'Ateo/agnóstico' :{PP:14,PSOE:30,VOX: 8,Sumar:32,Junts:7,PNV:4,Otros:5},
  },
}

// Temas top por dimensión (nombre, peso 0..1)
const TEMAS_BASE = ['Vivienda','Empleo','Sanidad','Educación','Inmigración','Inseguridad','Pensiones','Cambio climático','Corrupción','Cataluña','Economía/inflación','Igualdad','Defensa']
const TEMAS_PESO: Record<keyof Perfil, Record<string, Partial<Record<string, number>>>> = {
  edad:{
 '18–24':{Vivienda:0.95, Empleo:0.85, 'Cambio climático':0.62, Igualdad:0.58, Educación:0.50},
 '25–34':{Vivienda:0.92, Empleo:0.78, 'Economía/inflación':0.62, 'Cambio climático':0.45, Igualdad:0.42},
 '35–44':{Vivienda:0.85, 'Economía/inflación':0.78, Educación:0.55, Sanidad:0.52, Empleo:0.48},
 '45–54':{Sanidad:0.72, 'Economía/inflación':0.78, Inmigración:0.42, Inseguridad:0.40, Vivienda:0.55},
 '55–64':{Sanidad:0.85, Pensiones:0.72, 'Economía/inflación':0.65, Inmigración:0.55, Inseguridad:0.48},
 '65+' :{Sanidad:0.92, Pensiones:0.95, Inseguridad:0.55, Inmigración:0.60, Corrupción:0.45},
  },
  genero:{
 'Hombre':{'Economía/inflación':0.72, Empleo:0.68, Inseguridad:0.55, Inmigración:0.52, Defensa:0.32},
 'Mujer' :{Sanidad:0.78, Vivienda:0.62, Igualdad:0.65, Educación:0.55, Pensiones:0.45},
  },
  estudios:{
 'Sin estudios' :{Pensiones:0.72, Sanidad:0.78, Empleo:0.62, 'Economía/inflación':0.58, Inseguridad:0.50},
 'Secundaria' :{'Economía/inflación':0.72, Empleo:0.68, Vivienda:0.60, Sanidad:0.55, Inmigración:0.45},
 'FP' :{Empleo:0.78, 'Economía/inflación':0.72, Vivienda:0.65, Educación:0.50, Sanidad:0.45},
 'Universitarios':{'Cambio climático':0.62, Igualdad:0.58, Educación:0.62, Vivienda:0.65, Corrupción:0.55},
  },
  habitat:{
 'Rural (<10k)' :{'Despoblación':0.85, Sanidad:0.62, Empleo:0.58, Pensiones:0.55, Inseguridad:0.42},
 'Semiurbano' :{'Economía/inflación':0.65, Sanidad:0.58, Vivienda:0.55, Educación:0.48, Empleo:0.45},
 'Urbano (>100k)':{Vivienda:0.78, 'Economía/inflación':0.65, Inmigración:0.50, Inseguridad:0.48, Sanidad:0.55},
 'Gran ciudad' :{Vivienda:0.92, Inseguridad:0.62, 'Cambio climático':0.55, Inmigración:0.55, Igualdad:0.50},
  },
  ideologia:{
 'Izquierda' :{Sanidad:0.80, Vivienda:0.78, Igualdad:0.72, 'Cambio climático':0.65, Educación:0.55},
 'Centro-izq.' :{Sanidad:0.72, Vivienda:0.70, Educación:0.60, Igualdad:0.55, Empleo:0.50},
 'Centro' :{'Economía/inflación':0.70, Sanidad:0.65, Vivienda:0.58, Empleo:0.55, Educación:0.45},
 'Centro-dcha.' :{'Economía/inflación':0.78, Inmigración:0.62, Inseguridad:0.55, Empleo:0.50, Cataluña:0.42},
 'Derecha' :{Inmigración:0.85, Inseguridad:0.78, 'Economía/inflación':0.72, Cataluña:0.65, Defensa:0.42},
  },
  empleo:{
 'Estudiante' :{Vivienda:0.92, Educación:0.78, Empleo:0.62, 'Cambio climático':0.55, Igualdad:0.45},
 'Asalariado' :{'Economía/inflación':0.72, Vivienda:0.68, Empleo:0.62, Sanidad:0.55, Educación:0.45},
 'Autónomo' :{'Economía/inflación':0.85, Empleo:0.62, Inmigración:0.45, Inseguridad:0.42, Sanidad:0.40},
 'Desempleado' :{Empleo:0.95, 'Economía/inflación':0.78, Vivienda:0.65, Sanidad:0.50, Pensiones:0.42},
 'Pensionista' :{Pensiones:0.95, Sanidad:0.85, Inseguridad:0.55, Inmigración:0.50, 'Economía/inflación':0.50},
 'Tareas hogar':{Sanidad:0.72, Educación:0.65, 'Economía/inflación':0.60, Inseguridad:0.50, Vivienda:0.55},
  },
  religion:{
 'Practicante' :{Sanidad:0.62, Pensiones:0.55, Inseguridad:0.55, Inmigración:0.52, Educación:0.45},
 'No practicante' :{'Economía/inflación':0.62, Sanidad:0.55, Vivienda:0.55, Empleo:0.50, Educación:0.42},
 'Indiferente' :{Vivienda:0.65, 'Economía/inflación':0.62, Sanidad:0.52, Igualdad:0.42, 'Cambio climático':0.40},
 'Ateo/agnóstico' :{Vivienda:0.68, Igualdad:0.65, 'Cambio climático':0.58, Educación:0.55, Sanidad:0.50},
  },
}

// Tasas de participación esperadas
const PARTIC: Record<keyof Perfil, Record<string, number>> = {
  edad:    { '18–24':54, '25–34':62, '35–44':68, '45–54':74, '55–64':80, '65+':82 },
  genero:  { 'Hombre':70, 'Mujer':72 },
  estudios:{ 'Sin estudios':54, 'Secundaria':65, 'FP':68, 'Universitarios':82 },
  habitat: { 'Rural (<10k)':74, 'Semiurbano':70, 'Urbano (>100k)':70, 'Gran ciudad':72 },
  ideologia:{ 'Izquierda':75, 'Centro-izq.':72, 'Centro':62, 'Centro-dcha.':74, 'Derecha':80 },
  empleo:  { 'Estudiante':58, 'Asalariado':72, 'Autónomo':75, 'Desempleado':62, 'Pensionista':82, 'Tareas hogar':68 },
  religion:{ 'Practicante':82, 'No practicante':72, 'Indiferente':65, 'Ateo/agnóstico':70 },
}

// Posición ideológica del perfil en eje izq-dcha (-100..+100)
const POS_IDEO: Record<Ideologia, number> = { 'Izquierda':-78, 'Centro-izq.':-32, 'Centro':0, 'Centro-dcha.':+32, 'Derecha':+78 }

// Consumo de medios (estimación %)
const MEDIOS_BASE: Record<keyof Perfil, Record<string, { tv: number, prensa: number, redes: number, podcast: number }>> = {
  edad:{
 '18–24':{tv:18, prensa: 5, redes:78, podcast:38},
 '25–34':{tv:28, prensa:14, redes:72, podcast:42},
 '35–44':{tv:42, prensa:24, redes:62, podcast:32},
 '45–54':{tv:58, prensa:38, redes:48, podcast:22},
 '55–64':{tv:72, prensa:48, redes:32, podcast:14},
 '65+' :{tv:88, prensa:58, redes:18, podcast: 8},
  },
  genero:{ 'Hombre':{tv:55, prensa:32, redes:50, podcast:28}, 'Mujer':{tv:62, prensa:24, redes:55, podcast:22} },
  estudios:{
 'Sin estudios' :{tv:78, prensa:14, redes:32, podcast: 8},
 'Secundaria' :{tv:65, prensa:24, redes:48, podcast:18},
 'FP' :{tv:58, prensa:28, redes:55, podcast:24},
 'Universitarios':{tv:48, prensa:48, redes:62, podcast:42},
  },
  habitat:{
 'Rural (<10k)' :{tv:75, prensa:28, redes:38, podcast:14},
 'Semiurbano' :{tv:62, prensa:32, redes:52, podcast:22},
 'Urbano (>100k)':{tv:55, prensa:38, redes:60, podcast:32},
 'Gran ciudad' :{tv:48, prensa:42, redes:65, podcast:38},
  },
  ideologia:{
 'Izquierda' :{tv:55, prensa:38, redes:62, podcast:42},
 'Centro-izq.' :{tv:55, prensa:42, redes:55, podcast:32},
 'Centro' :{tv:60, prensa:35, redes:50, podcast:28},
 'Centro-dcha.' :{tv:62, prensa:42, redes:48, podcast:24},
 'Derecha' :{tv:65, prensa:38, redes:58, podcast:22},
  },
  empleo:{
 'Estudiante' :{tv:25, prensa: 8, redes:78, podcast:42},
 'Asalariado' :{tv:55, prensa:32, redes:55, podcast:32},
 'Autónomo' :{tv:58, prensa:42, redes:55, podcast:35},
 'Desempleado' :{tv:62, prensa:22, redes:62, podcast:18},
 'Pensionista' :{tv:88, prensa:55, redes:18, podcast: 8},
 'Tareas hogar':{tv:75, prensa:22, redes:42, podcast:14},
  },
  religion:{
 'Practicante' :{tv:75, prensa:38, redes:32, podcast:14},
 'No practicante' :{tv:60, prensa:32, redes:52, podcast:24},
 'Indiferente' :{tv:55, prensa:32, redes:60, podcast:32},
 'Ateo/agnóstico' :{tv:50, prensa:35, redes:65, podcast:38},
  },
}

// Datos de voto de los ejes adicionales (se fusionan con VOTO en buildProfile).
const EXTRA_VOTO: Record<string, Record<string, Partial<Record<Partido, number>>>> = {
  renta: {
    'Baja':       { PP:21, PSOE:27, VOX:14, Sumar:16, Junts:2, PNV:1, Otros:19 },
    'Media-baja': { PP:26, PSOE:27, VOX:13, Sumar:12, Junts:3, PNV:2, Otros:17 },
    'Media':      { PP:31, PSOE:26, VOX:11, Sumar:9,  Junts:3, PNV:2, Otros:18 },
    'Media-alta': { PP:37, PSOE:24, VOX:10, Sumar:7,  Junts:3, PNV:2, Otros:17 },
    'Alta':       { PP:43, PSOE:20, VOX:11, Sumar:5,  Junts:3, PNV:2, Otros:16 },
  },
  vivienda: {
    'Propiedad':       { PP:35, PSOE:26, VOX:12, Sumar:7,  Junts:3, PNV:2, Otros:15 },
    'Hipoteca':        { PP:30, PSOE:27, VOX:12, Sumar:10, Junts:3, PNV:2, Otros:16 },
    'Alquiler':        { PP:22, PSOE:27, VOX:11, Sumar:18, Junts:3, PNV:2, Otros:17 },
    'Cedida/familiar': { PP:25, PSOE:26, VOX:12, Sumar:13, Junts:3, PNV:2, Otros:19 },
  },
  hogar: {
    'Vive solo/a':       { PP:27, PSOE:27, VOX:11, Sumar:12, Junts:3, PNV:2, Otros:18 },
    'Pareja sin hijos':  { PP:30, PSOE:26, VOX:11, Sumar:10, Junts:3, PNV:2, Otros:18 },
    'Con hijos':         { PP:31, PSOE:27, VOX:12, Sumar:8,  Junts:3, PNV:2, Otros:17 },
    'Familia numerosa':  { PP:33, PSOE:22, VOX:18, Sumar:6,  Junts:3, PNV:2, Otros:16 },
    'Cuida mayores':     { PP:29, PSOE:28, VOX:12, Sumar:9,  Junts:3, PNV:2, Otros:17 },
  },
  territorio: {
    'Cataluña':         { PP:16, PSOE:25, VOX:9,  Sumar:14, Junts:18, PNV:0, Otros:18 },
    'Euskadi':          { PP:14, PSOE:22, VOX:6,  Sumar:10, Junts:0,  PNV:26, Otros:22 },
    'Galicia':          { PP:40, PSOE:27, VOX:7,  Sumar:10, Junts:0,  PNV:0, Otros:16 },
    'Madrid':           { PP:42, PSOE:22, VOX:13, Sumar:10, Junts:0,  PNV:0, Otros:13 },
    'Andalucía':        { PP:34, PSOE:31, VOX:13, Sumar:9,  Junts:0,  PNV:0, Otros:13 },
    'C. Valenciana':    { PP:35, PSOE:28, VOX:14, Sumar:9,  Junts:0,  PNV:0, Otros:14 },
    'Castilla y León':  { PP:42, PSOE:28, VOX:14, Sumar:6,  Junts:0,  PNV:0, Otros:10 },
    'Resto':            { PP:34, PSOE:28, VOX:13, Sumar:9,  Junts:0,  PNV:0, Otros:16 },
  },
}

// Temas de los ejes adicionales (se suman a TEMAS_PESO en buildProfile).
const EXTRA_TEMAS: Record<string, Record<string, Partial<Record<string, number>>>> = {
  renta: {
    'Baja':       { Empleo:34, Pensiones:24, Vivienda:24, Sanidad:18 },
    'Media-baja': { Empleo:26, Vivienda:24, 'Economía/inflación':22, Sanidad:16 },
    'Media':      { 'Economía/inflación':26, Vivienda:20, Sanidad:16, Empleo:16 },
    'Media-alta': { 'Economía/inflación':28, Inmigración:16, Defensa:12, Educación:14 },
    'Alta':       { 'Economía/inflación':30, Defensa:16, Inmigración:14, Corrupción:14 },
  },
  vivienda: {
    'Propiedad':       { 'Economía/inflación':18, Inseguridad:16, Pensiones:14 },
    'Hipoteca':        { Vivienda:26, 'Economía/inflación':24, Empleo:14 },
    'Alquiler':        { Vivienda:42, Empleo:18, 'Economía/inflación':14 },
    'Cedida/familiar': { Vivienda:30, Empleo:22 },
  },
  hogar: {
    'Vive solo/a':      { Vivienda:24, Inseguridad:16, Sanidad:14 },
    'Pareja sin hijos': { 'Economía/inflación':18, Vivienda:18 },
    'Con hijos':        { Educación:30, Sanidad:22, Vivienda:18 },
    'Familia numerosa': { Educación:28, Sanidad:20, Inmigración:16 },
    'Cuida mayores':    { Sanidad:34, Pensiones:26 },
  },
  territorio: {
    'Cataluña':        { Cataluña:40, Vivienda:18, Sanidad:14 },
    'Euskadi':         { Sanidad:20, Pensiones:16, Empleo:14 },
    'Galicia':         { Pensiones:20, Sanidad:18, Empleo:16 },
    'Madrid':          { Vivienda:24, Inseguridad:18, 'Economía/inflación':18 },
    'Andalucía':       { Empleo:30, Sanidad:18, Pensiones:16 },
    'C. Valenciana':   { Vivienda:20, 'Economía/inflación':18, Inmigración:14 },
    'Castilla y León': { Pensiones:22, Sanidad:18, Empleo:14 },
    'Resto':           { Empleo:18, Sanidad:16, Vivienda:16 },
  },
}

// Tabla de voto completa (base + ejes adicionales) para la referencia.
const VOTO_ALL: Record<string, Record<string, Partial<Record<Partido, number>>>> = { ...VOTO, ...EXTRA_VOTO }

// ─────────────────────────────────────────────────────────────────────────
// Lógica · combina los ejes y produce el perfil agregado
// ─────────────────────────────────────────────────────────────────────────
function buildProfile(p: Perfil) {
  // 1. Intención de voto: media ponderada de los 11 ejes (ideología y territorio pesan más)
  const ejes: { eje: keyof Perfil; valor: string; peso: number }[] = [
    { eje:'edad',      valor: p.edad,      peso: 1 },
    { eje:'genero',    valor: p.genero,    peso: 1 },
    { eje:'estudios',  valor: p.estudios,  peso: 1 },
    { eje:'habitat',   valor: p.habitat,   peso: 1 },
    { eje:'ideologia', valor: p.ideologia, peso: 2.5 },  // ideología pesa más
    { eje:'empleo',    valor: p.empleo,    peso: 1 },
    { eje:'religion',  valor: p.religion,  peso: 0.8 },
    { eje:'renta',     valor: p.renta,     peso: 1.2 },
    { eje:'vivienda',  valor: p.vivienda,  peso: 0.9 },
    { eje:'hogar',     valor: p.hogar,     peso: 0.7 },
    { eje:'territorio',valor: p.territorio,peso: 2.0 },  // territorio pesa mucho (partidos autonómicos)
  ]
  const lookVoto  = (eje: keyof Perfil, valor: string) => (VOTO[eje] ?? EXTRA_VOTO[eje] ?? {})[valor] ?? {}
  const lookTemas = (eje: keyof Perfil, valor: string) => (TEMAS_PESO[eje] ?? EXTRA_TEMAS[eje] ?? {})[valor] ?? {}
  const total = ejes.reduce((s, e) => s + e.peso, 0)
  const voto: Record<Partido, number> = { PP:0, PSOE:0, VOX:0, Sumar:0, Junts:0, PNV:0, Otros:0 }
  // Contribución de cada eje a cada partido → "drivers" del voto
  const axisVoto: Record<string, Record<Partido, number>> = {}
  for (const { eje, valor, peso } of ejes) {
    const data = lookVoto(eje, valor)
    axisVoto[eje] = { PP:0, PSOE:0, VOX:0, Sumar:0, Junts:0, PNV:0, Otros:0 }
    for (const part of PARTIES) {
      const c = (data[part] || 0) * (peso / total)
      voto[part] += c
      axisVoto[eje][part] = c
    }
  }
  // Renormalizar a 100%
  const sum = Object.values(voto).reduce((s, v) => s + v, 0) || 1
  const votoFloat: Record<Partido, number> = { PP:0, PSOE:0, VOX:0, Sumar:0, Junts:0, PNV:0, Otros:0 }
  for (const part of PARTIES) votoFloat[part] = Math.round((voto[part] / sum) * 100 * 10) / 10
  // Redondeo a entero reajustando para sumar 100
  const votoInt: Record<Partido, number> = { PP:0, PSOE:0, VOX:0, Sumar:0, Junts:0, PNV:0, Otros:0 }
  let acc = 0
  for (const part of PARTIES) { votoInt[part] = Math.round(votoFloat[part]); acc += votoInt[part] }
  if (acc !== 100) votoInt['Otros'] = Math.max(0, votoInt['Otros'] + (100 - acc))

  // 2. Temas: agregamos pesos de cada eje y devolvemos top 6
  const temas: Record<string, number> = {}
  for (const { eje, valor, peso } of ejes) {
    const data = lookTemas(eje, valor)
    for (const t of Object.keys(data)) temas[t] = (temas[t] || 0) + (data[t] || 0) * peso
  }
  const topTemas = Object.entries(temas).sort((a,b) => b[1] - a[1]).slice(0, 6).map(([t, v]) => ({ tema: t, peso: Math.min(100, Math.round((v / total) * 100)) }))

  // 3. Participación: media ponderada (ejes sin dato → 70 por defecto)
  const participacion = Math.round(ejes.reduce((s, { eje, valor, peso }) => s + ((PARTIC[eje] ?? {})[valor] ?? 70) * peso, 0) / total)

  // 4. Medios: media ponderada por canal (ejes sin dato → base)
  const medios = { tv:0, prensa:0, redes:0, podcast:0 }
  for (const { eje, valor, peso } of ejes) {
    const m = (MEDIOS_BASE[eje] ?? {})[valor] ?? { tv:55, prensa:30, redes:50, podcast:25 }
    medios.tv += m.tv * peso; medios.prensa += m.prensa * peso; medios.redes += m.redes * peso; medios.podcast += m.podcast * peso
  }
  medios.tv = Math.round(medios.tv / total); medios.prensa = Math.round(medios.prensa / total)
  medios.redes = Math.round(medios.redes / total); medios.podcast = Math.round(medios.podcast / total)

  // 5. Nombre arquetipo
  const arquetipo = makeArchetype(p)

  // 6. Tamaño estimado del segmento (en miles, determinista · 11 ejes)
  const code = `${p.edad}|${p.genero}|${p.estudios}|${p.habitat}|${p.ideologia}|${p.empleo}|${p.religion}|${p.renta}|${p.vivienda}|${p.hogar}|${p.territorio}`
  let h = 0
  for (let i = 0; i < code.length; i++) h = ((h << 5) - h) + code.charCodeAt(i)
  const segmento = Math.abs(h % 720) + 60  // 60-780K

  // 7. Posición ideológica
  const posIdeo = POS_IDEO[p.ideologia]

  // 8. Partido con mayor intención
  const ganador = (Object.entries(votoInt).sort((a,b) => b[1] - a[1])[0] || ['PP', 0]) as [Partido, number]

  // 9. Drivers: qué ejes empujan más hacia el partido ganador
  const drivers = ejes
    .map(e => ({ eje: e.eje, valor: e.valor, aporte: Math.round(((axisVoto[e.eje]?.[ganador[0]] || 0) / sum) * 100 * 10) / 10 }))
    .sort((a, b) => b.aporte - a.aporte)

  return { voto: votoInt, votoFloat, topTemas, participacion, medios, arquetipo, segmento, posIdeo, ganador, drivers, code }
}

function makeArchetype(p: Perfil): string {
  const edadAdj  = p.edad === '18–24' ? 'Joven' : p.edad === '25–34' ? 'Adulto/a joven' : p.edad === '35–44' ? 'Adulto/a' : p.edad === '45–54' ? 'Adulto/a maduro/a' : p.edad === '55–64' ? 'Mayor' : 'Sénior'
  const habAdj   = p.habitat === 'Rural (<10k)' ? 'rural' : p.habitat === 'Semiurbano' ? 'semiurbano/a' : p.habitat === 'Gran ciudad' ? 'metropolitano/a' : 'urbano/a'
  const estuAdj  = p.estudios === 'Universitarios' ? 'universitario/a' : p.estudios === 'FP' ? 'con FP' : p.estudios === 'Secundaria' ? 'con secundaria' : 'sin estudios'
  const empAdj   = p.empleo === 'Pensionista' ? 'pensionista' : p.empleo === 'Estudiante' ? 'estudiante' : p.empleo === 'Autónomo' ? 'autónomo/a' : p.empleo === 'Desempleado' ? 'en paro' : ''
  const ideoAdj  = p.ideologia === 'Izquierda' ? 'de izquierdas' : p.ideologia === 'Derecha' ? 'de derechas' : p.ideologia === 'Centro' ? 'de centro' : p.ideologia === 'Centro-izq.' ? 'de centro-izquierda' : 'de centro-derecha'
  const generoAdj = p.genero === 'Mujer' ? 'Mujer' : 'Hombre'
  const baseEmp = empAdj ? `, ${empAdj}` : ''
  return `${generoAdj} ${edadAdj.toLowerCase()} ${habAdj} ${estuAdj}${baseEmp}, ${ideoAdj}`
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function MicrodatosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Live data del backend (auto-refresh 5min). Se usa solo para el badge
  // de freshness y para etiquetar la página como "en vivo"; el cálculo
  // del retrato sigue siendo client-side a partir de la selección.
  const { source, updatedAt, refresh } = useApi<VoterProfilesResponse>(
 '/api/microdatos/voters', { refreshInterval: 300_000 }
  )

  const [perfil, setPerfil] = useState<Perfil>({
    edad:'35–44', genero:'Mujer', estudios:'Universitarios', habitat:'Urbano (>100k)',
    ideologia:'Centro-izq.', empleo:'Asalariado', religion:'No practicante',
    renta:'Media', vivienda:'Hipoteca', hogar:'Con hijos', territorio:'Madrid',
  })

  const result = useMemo(() => buildProfile(perfil), [perfil])
  const deep = useMemo(() => buildDeepProfile({
    perfil,
    votoFloat: result.votoFloat,
    topTemas: result.topTemas,
    participacion: result.participacion,
    posIdeo: result.posIdeo,
    ganador: result.ganador,
    medios: result.medios,
  }), [perfil, result])

  function setVal<K extends keyof Perfil>(k: K, v: Perfil[K]) {
    setPerfil(prev => ({ ...prev, [k]: v }))
  }

  // Presets típicos
  const PRESETS: { id: string; label: string; perfil: Perfil }[] = [
    { id:'joven-urbano-univ',  label:'Joven urbano universitario', perfil:{ edad:'25–34', genero:'Mujer', estudios:'Universitarios', habitat:'Gran ciudad', ideologia:'Centro-izq.', empleo:'Asalariado', religion:'Indiferente', renta:'Media-baja', vivienda:'Alquiler', hogar:'Vive solo/a', territorio:'Madrid' } },
    { id:'pensionista-rural',  label:'Pensionista rural',          perfil:{ edad:'65+',   genero:'Hombre',estudios:'Sin estudios',   habitat:'Rural (<10k)', ideologia:'Centro-dcha.', empleo:'Pensionista', religion:'Practicante', renta:'Baja', vivienda:'Propiedad', hogar:'Pareja sin hijos', territorio:'Castilla y León' } },
    { id:'autonomo-pyme',      label:'Autónomo de pyme',           perfil:{ edad:'45–54', genero:'Hombre',estudios:'FP',             habitat:'Semiurbano',   ideologia:'Centro-dcha.', empleo:'Autónomo',    religion:'No practicante', renta:'Media-alta', vivienda:'Hipoteca', hogar:'Con hijos', territorio:'C. Valenciana' } },
    { id:'mujer-urbana',       label:'Mujer urbana progresista',   perfil:{ edad:'35–44', genero:'Mujer', estudios:'Universitarios', habitat:'Urbano (>100k)', ideologia:'Izquierda', empleo:'Asalariado',  religion:'Ateo/agnóstico', renta:'Media', vivienda:'Alquiler', hogar:'Pareja sin hijos', territorio:'Cataluña' } },
    { id:'votante-vox',        label:'Votante VOX tipo',           perfil:{ edad:'45–54', genero:'Hombre',estudios:'Secundaria',     habitat:'Semiurbano',   ideologia:'Derecha',      empleo:'Asalariado',  religion:'No practicante', renta:'Media', vivienda:'Hipoteca', hogar:'Familia numerosa', territorio:'Andalucía' } },
    { id:'jubilado-urbano-pp', label:'Jubilado urbano conservador',perfil:{ edad:'65+',   genero:'Mujer', estudios:'Secundaria',     habitat:'Urbano (>100k)', ideologia:'Centro-dcha.',empleo:'Pensionista', religion:'Practicante', renta:'Media-alta', vivienda:'Propiedad', hogar:'Vive solo/a', territorio:'Madrid' } },
    { id:'indepe-catalan',     label:'Independentista catalán',    perfil:{ edad:'45–54', genero:'Hombre',estudios:'Universitarios', habitat:'Urbano (>100k)', ideologia:'Centro-izq.', empleo:'Asalariado', religion:'No practicante', renta:'Media-alta', vivienda:'Propiedad', hogar:'Con hijos', territorio:'Cataluña' } },
    { id:'nacionalista-vasco', label:'Nacionalista vasco',         perfil:{ edad:'55–64', genero:'Mujer', estudios:'Universitarios', habitat:'Urbano (>100k)', ideologia:'Centro', empleo:'Asalariado', religion:'No practicante', renta:'Media-alta', vivienda:'Propiedad', hogar:'Pareja sin hijos', territorio:'Euskadi' } },
  ]

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
 <span>ELECTORAL · PERFILES DE VOTANTE</span>
 <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Construye un perfil <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>y obtén su retrato electoral</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Combina 11 ejes —edad, género, estudios, hábitat, ideología, empleo, religiosidad, renta, vivienda, hogar y territorio— y produce un retrato electoral de alto detalle: intención de voto, segunda opción, voto blando, propiedad temática, mensajes que conectan, plan de canales, favorabilidad de líderes y estrategia de movilización.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
 <HeroKPI label="Ejes" value="11"/>
 <HeroKPI label="Olas CIS" value="14"/>
 <HeroKPI label="Casos" value="35K"/>
 </div>
 </section>

        {/* ───── Presets rápidos ───── */}
 <section style={{ marginBottom:14 }}>
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Presets:</span>
 <span style={{ fontSize:11.5, color:'#3a3a3d' }}>O construye un perfil personalizado abajo</span>
 </div>
 <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(pr => (
 <button key={pr.id} onClick={() => setPerfil(pr.perfil)} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:999,
                padding:'6px 14px', fontSize:11.5, fontWeight:600, color:'#1d1d1f',
                cursor:'pointer', fontFamily:'inherit', transition:'all 160ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1d1d1f'; (e.currentTarget as HTMLButtonElement).style.background = '#FAFAFB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ECECEF'; (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}>
                {pr.label}
 </button>
            ))}
 </div>
 </section>

        {/* ───── Selector multi-eje ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14,
        }}>
 <h3 style={{ margin:'0 0 14px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Definir perfil del votante</h3>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
 <Selector label="Edad" values={EDADES}     value={perfil.edad}      onChange={v => setVal('edad', v as Edad)}/>
 <Selector label="Género" values={GENEROS}    value={perfil.genero}    onChange={v => setVal('genero', v as Genero)}/>
 <Selector label="Estudios" values={ESTUDIOS}   value={perfil.estudios}  onChange={v => setVal('estudios', v as Estudios)}/>
 <Selector label="Hábitat" values={HABITATS}   value={perfil.habitat}   onChange={v => setVal('habitat', v as Habitat)}/>
 <Selector label="Ideología" values={IDEOLOGIAS} value={perfil.ideologia} onChange={v => setVal('ideologia', v as Ideologia)}/>
 <Selector label="Situación laboral" values={EMPLEOS} value={perfil.empleo} onChange={v => setVal('empleo', v as Empleo)}/>
 <Selector label="Religiosidad" values={RELIGIONES} value={perfil.religion} onChange={v => setVal('religion', v as Religion)}/>
 <Selector label="Renta del hogar" values={RENTAS} value={perfil.renta} onChange={v => setVal('renta', v as Renta)}/>
 <Selector label="Régimen de vivienda" values={VIVIENDAS} value={perfil.vivienda} onChange={v => setVal('vivienda', v as Vivienda)}/>
 <Selector label="Composición del hogar" values={HOGARES} value={perfil.hogar} onChange={v => setVal('hogar', v as Hogar)}/>
 <Selector label="Territorio" values={TERRITORIOS} value={perfil.territorio} onChange={v => setVal('territorio', v as Territorio)}/>
 </div>
 </section>

        {/* ───── Resultado · Perfil generado ───── */}
 <section style={{
          background:'#fff', border:`2px solid ${PC[result.ganador[0]]}40`, borderRadius:14,
          padding:'24px 28px', boxShadow:`0 4px 16px ${PC[result.ganador[0]]}1a`, marginBottom:14,
        }}>
          {/* Cabecera del retrato */}
 <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:18, alignItems:'center', marginBottom:18 }}>
 <div style={{
              width:64, height:64, borderRadius:16, background:PC[result.ganador[0]], color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, letterSpacing:'-0.02em',
              boxShadow:`0 4px 12px ${PC[result.ganador[0]]}50`,
            }}>{perfil.genero === 'Mujer' ? 'F' : 'M'}</div>
 <div>
 <p style={{ margin:'0 0 3px', fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.1em', textTransform:'uppercase' }}>Retrato del votante</p>
 <h2 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-0.018em', color:'#1d1d1f', lineHeight:1.2 }}>{result.arquetipo}</h2>
 <p style={{ margin:0, fontSize:12, color:'#6e6e73' }}>
                Tamaño estimado del segmento: <strong style={{ color:'#1d1d1f' }}>~{result.segmento.toLocaleString('es-ES')}K personas</strong> · {Math.round(result.segmento / 350)}% del electorado
 </p>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Voto más probable</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:PC[result.ganador[0]], letterSpacing:'-0.022em', lineHeight:1 }}>{result.ganador[0]}</div>
 <div style={{ fontSize:11, fontWeight:700, color:PC[result.ganador[0]], marginTop:2 }}>{result.ganador[1]}% intención</div>
 </div>
 </div>

          {/* Eje ideológico */}
 <div style={{ marginBottom:18 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
 <span style={{ fontSize:10, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>Posición ideológica · {perfil.ideologia}</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:PC[result.ganador[0]] }}>{result.posIdeo > 0 ? `+${result.posIdeo}` : result.posIdeo}</span>
 </div>
 <div style={{ position:'relative', height:10, background:'linear-gradient(90deg, #DC2626 0%, #F5F5F7 50%, #1F4E8C 100%)', borderRadius:5, opacity:0.22 }}>
 <div style={{
                position:'absolute', left:`${((result.posIdeo + 100) / 200) * 100}%`, top:-5, transform:'translateX(-50%)',
                width:20, height:20, borderRadius:'50%', background:PC[result.ganador[0]], border:'2px solid #fff',
                boxShadow:`0 0 0 3px ${PC[result.ganador[0]]}55, 0 1px 4px rgba(0,0,0,0.15)`,
              }}/>
 </div>
 <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:9, color:'#86868b', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
 <span>Izquierda</span><span>Centro</span><span>Derecha</span>
 </div>
 </div>

          {/* Grid de datos · 2 columnas */}
 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18 }}>
            {/* Intención de voto */}
 <div>
 <h3 style={{ margin:'0 0 10px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Intención de voto</h3>
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[...PARTIES].sort((a,b) => result.voto[b] - result.voto[a]).map(p => (
 <div key={p} style={{ display:'grid', gridTemplateColumns:'70px 1fr 50px', gap:10, alignItems:'center' }}>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#1d1d1f' }}>
 <span style={{ width:9, height:9, borderRadius:2, background:PC[p], display:'inline-block' }}/>
                      {p}
 </span>
 <div style={{ height:14, background:'#F5F5F7', borderRadius:7, overflow:'hidden', position:'relative' }}>
 <div style={{ width:`${(result.voto[p] / 50) * 100}%`, height:'100%', background:PC[p], borderRadius:7, transition:'width 320ms' }}/>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:PC[p], textAlign:'right' }}>{result.voto[p]}%</span>
 </div>
                ))}
 </div>
 </div>
            {/* Temas prioritarios */}
 <div>
 <h3 style={{ margin:'0 0 10px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Temas prioritarios</h3>
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {result.topTemas.map((t, i) => (
 <div key={t.tema} style={{ display:'grid', gridTemplateColumns:'18px 1fr 36px', gap:8, alignItems:'center' }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#6e6e73' }}>{i+1}</span>
 <div style={{ display:'flex', alignItems:'center', gap:7 }}>
 <div style={{ flex:1, minWidth:0 }}>
 <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f', marginBottom:2 }}>{t.tema}</div>
 <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${t.peso}%`, height:'100%', background:'#5B21B6', borderRadius:3 }}/>
 </div>
 </div>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#5B21B6', textAlign:'right' }}>{t.peso}</span>
 </div>
                ))}
 </div>
 </div>
 </div>

          {/* Fila inferior · participación + medios */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:18, marginTop:18 }}>
 <div>
 <h3 style={{ margin:'0 0 10px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Participación esperada</h3>
 <div style={{
                display:'flex', alignItems:'baseline', gap:6, padding:'14px 16px',
                background:`${result.participacion >= 75 ? '#16A34A' : result.participacion >= 65 ? '#F97316' : '#DC2626'}10`,
                border:`1px solid ${result.participacion >= 75 ? '#16A34A' : result.participacion >= 65 ? '#F97316' : '#DC2626'}40`,
                borderRadius:12,
              }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, color: result.participacion >= 75 ? '#16A34A' : result.participacion >= 65 ? '#F97316' : '#DC2626', letterSpacing:'-0.022em', lineHeight:1 }}>{result.participacion}<span style={{ fontSize:18, color:'#6e6e73', fontWeight:600 }}>%</span></span>
 <span style={{ fontSize:11, color:'#6e6e73', marginLeft:'auto' }}>{result.participacion >= 75 ? 'Alta' : result.participacion >= 65 ? 'Media' : 'Baja'}</span>
 </div>
 </div>
 <div>
 <h3 style={{ margin:'0 0 10px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.08em', textTransform:'uppercase' }}>Consumo mediático</h3>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[
                  { label:'TV',      value: result.medios.tv,      color:'#0EA5E9' },
                  { label:'Prensa',  value: result.medios.prensa,  color:'#5B21B6' },
                  { label:'Redes',   value: result.medios.redes,   color:'#DC2626' },
                  { label:'Podcast', value: result.medios.podcast, color:'#16A34A' },
                ].map(m => (
 <div key={m.label} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:m.color, lineHeight:1 }}>{m.value}<span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>%</span></div>
 <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:4 }}>{m.label}</div>
 </div>
                ))}
 </div>
 </div>
 </div>
 </section>

        {/* ───── Análisis profundo · estratega electoral ───── */}
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 26px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
 <h3 style={{ margin:0, fontSize:13, fontWeight:800, letterSpacing:'0.04em', textTransform:'uppercase', color:'#1d1d1f' }}>Análisis profundo del segmento</h3>
 <DemoBadge title="Indicadores derivados de forma determinista del perfil · datos ilustrativos" />
 </div>

          {/* KPIs */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
 <div style={dpBox}>
 <div style={dpLabel}>Voto blando</div>
 <div style={{ ...dpVal, color: deep.volatilidad>=60?'#DC2626':deep.volatilidad>=38?'#F97316':'#16A34A' }}>{deep.volatilidad}<span style={dpUnit}>%</span></div>
 <div style={dpSub}>{deep.persuadabilidad.nivel}</div>
 </div>
 <div style={dpBox}>
 <div style={dpLabel}>Segunda opción</div>
 <div style={{ ...dpVal, color: PC[deep.segunda.partido as Partido] }}>{deep.segunda.partido}</div>
 <div style={dpSub}>{deep.segunda.pct}% · afinidad {deep.segunda.afinidad}</div>
 </div>
 <div style={dpBox}>
 <div style={dpLabel}>Indecisión</div>
 <div style={{ ...dpVal, color:'#5B21B6' }}>{deep.indecision}<span style={dpUnit}>%</span></div>
 <div style={dpSub}>no decidido / abstención técnica</div>
 </div>
 <div style={dpBox}>
 <div style={dpLabel}>Horquilla del ganador</div>
 <div style={{ ...dpVal, color: PC[result.ganador[0]] }}>{deep.suelo}–{deep.techo}<span style={dpUnit}>%</span></div>
 <div style={dpSub}>suelo–techo de {result.ganador[0]}</div>
 </div>
 </div>

          {/* Persuadabilidad + drivers */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:18, marginBottom:18 }}>
 <div>
 <h4 style={dpSubH}>Persuadabilidad</h4>
 <div style={{ height:10, background:'#F5F5F7', borderRadius:6, overflow:'hidden', marginBottom:8 }}>
 <div style={{ width:`${deep.persuadabilidad.score}%`, height:'100%', background:'linear-gradient(90deg,#16A34A,#F97316,#DC2626)', borderRadius:6 }}/>
 </div>
 <p style={{ fontSize:12, color:'#3a3a3d', margin:0, lineHeight:1.5 }}>
                <strong>{deep.persuadabilidad.nivel}</strong> · objetivo de captación:{' '}
 <strong style={{ color: PC[deep.persuadabilidad.objetivo as Partido] }}>{deep.persuadabilidad.objetivo}</strong>
 </p>
 </div>
 <div>
 <h4 style={dpSubH}>Qué define su voto · drivers</h4>
 <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {result.drivers.slice(0,6).map(d => {
                  const max = result.drivers[0]?.aporte || 1
                  return (
 <div key={d.eje} style={{ display:'grid', gridTemplateColumns:'104px 1fr 40px', gap:8, alignItems:'center' }}>
 <span style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600 }}>{EJE_LABEL[d.eje] ?? d.eje}</span>
 <div style={{ height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
 <div style={{ width:`${Math.max(2,(d.aporte/max)*100)}%`, height:'100%', background:PC[result.ganador[0]], borderRadius:4 }}/>
 </div>
 <span style={{ fontSize:11, fontWeight:700, color:'#6e6e73', textAlign:'right' }}>{d.aporte}</span>
 </div>
                  )
                })}
 </div>
 </div>
 </div>

          {/* Propiedad temática + líderes */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
 <div>
 <h4 style={dpSubH}>Propiedad temática · en quién confía por tema</h4>
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {deep.ownership.map(o => (
 <div key={o.tema} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center' }}>
 <span style={{ fontSize:12, color:'#1d1d1f' }}>{o.tema}</span>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
 <span style={{ width:8, height:8, borderRadius:2, background:PC[o.partido as Partido] }}/>
 <span style={{ fontSize:11.5, fontWeight:700, color:PC[o.partido as Partido] }}>{o.partido}</span>
 <span style={{ fontSize:10.5, color:'#86868b' }}>{o.credibilidad}%</span>
 </span>
 </div>
                ))}
 </div>
 </div>
 <div>
 <h4 style={dpSubH}>Favorabilidad de líderes</h4>
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {deep.lideres.map(l => (
 <div key={l.lider} style={{ display:'grid', gridTemplateColumns:'120px 1fr 32px', gap:8, alignItems:'center' }}>
 <span style={{ fontSize:11.5, color:'#1d1d1f' }}>{l.lider}</span>
 <div style={{ height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
 <div style={{ width:`${l.favor}%`, height:'100%', background:PC[l.partido as Partido], borderRadius:4 }}/>
 </div>
 <span style={{ fontSize:11, fontWeight:700, color:'#6e6e73', textAlign:'right' }}>{l.favor}</span>
 </div>
                ))}
 </div>
 </div>
 </div>

          {/* Mensajes + canales */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
 <div>
 <h4 style={dpSubH}>Mensajes que conectan</h4>
 <ul style={{ margin:'0 0 12px', paddingLeft:16 }}>
                {deep.mensajes.conectan.map((m,i) => <li key={i} style={{ fontSize:12, color:'#1d1d1f', marginBottom:4, lineHeight:1.45 }}>{m}</li>)}
 </ul>
 <h4 style={{ ...dpSubH, color:'#B91C1C' }}>Mensajes a evitar</h4>
 <ul style={{ margin:0, paddingLeft:16 }}>
                {deep.mensajes.evitar.map((m,i) => <li key={i} style={{ fontSize:12, color:'#B91C1C', marginBottom:4, lineHeight:1.45 }}>{m}</li>)}
 </ul>
 </div>
 <div>
 <h4 style={dpSubH}>Plan de canales · {deep.canales.titular}</h4>
 <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {deep.canales.plataformas.map(p => <span key={p} style={dpChip}>{p}</span>)}
 </div>
 <p style={dpMini}><strong>Formato:</strong> {deep.canales.formato}</p>
 <p style={dpMini}><strong>Horario:</strong> {deep.canales.horario}</p>
 <p style={dpMini}><strong>Directo:</strong> {deep.canales.directo}</p>
 </div>
 </div>

          {/* Territorio + GOTV */}
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:18 }}>
 <div>
 <h4 style={dpSubH}>Concentración territorial</h4>
 <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {deep.territorio.map(t => (
 <div key={t.zona} style={{ display:'grid', gridTemplateColumns:'120px 1fr 36px', gap:8, alignItems:'center' }}>
 <span style={{ fontSize:11.5, color:'#1d1d1f' }}>{t.zona}</span>
 <div style={{ height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
 <div style={{ width:`${t.pct}%`, height:'100%', background:'#0E7490', borderRadius:4 }}/>
 </div>
 <span style={{ fontSize:11, fontWeight:700, color:'#6e6e73', textAlign:'right' }}>{t.pct}%</span>
 </div>
                ))}
 </div>
 </div>
 <div>
 <h4 style={dpSubH}>Estrategia de movilización · GOTV</h4>
 <p style={{ fontSize:12.5, color:'#1d1d1f', lineHeight:1.6, margin:0, background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'12px 14px' }}>{deep.gotv}</p>
 </div>
 </div>
 </section>

        {/* ───── Tabla de referencia · datos brutos por dimensión ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
 <h3 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Referencia · intención de voto por dimensión</h3>
 <span style={{ fontSize:11, color:'#6e6e73' }}>CIS-like 2026 · ponderación por cuotas</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
            {(Object.keys(VOTO_ALL) as (keyof Perfil)[]).map(eje => (
 <div key={eje} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'12px 14px' }}>
 <h4 style={{ margin:'0 0 8px', fontSize:11, fontWeight:800, color:'#3a3a3d', letterSpacing:'0.06em', textTransform:'uppercase' }}>{EJE_LABEL[eje] ?? eje}</h4>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
 <thead>
 <tr style={{ borderBottom:'1px solid #ECECEF' }}>
 <th style={{ textAlign:'left', padding:'5px 8px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Segmento</th>
                        {PARTIES.map(p => (
 <th key={p} style={{ textAlign:'center', padding:'5px 6px', fontSize:9.5, fontWeight:700, color:PC[p], letterSpacing:'0.04em' }}>{p}</th>
                        ))}
 </tr>
 </thead>
 <tbody>
                      {Object.keys(VOTO_ALL[eje]).map((seg, i) => (
 <tr key={seg} style={{ background: i%2 ? '#fff' : 'transparent', borderBottom:'1px solid #F5F5F7' }}>
 <td style={{ padding:'5px 8px', fontWeight:600, color: seg === (perfil as any)[eje] ? '#5B21B6' : '#1d1d1f' }}>
                            {seg}{seg === (perfil as any)[eje] && <span style={{ marginLeft:5, fontSize:9, fontWeight:800, color:'#5B21B6', letterSpacing:'0.06em' }}>· SELECCIONADO</span>}
 </td>
                          {PARTIES.map(p => {
                            const v = VOTO_ALL[eje][seg][p] || 0
                            return (
 <td key={p} style={{ padding:'5px 6px', textAlign:'center', fontFamily:'var(--font-display)', fontWeight:600, color:PC[p], fontSize:11.5 }}>{v}</td>
                            )
                          })}
 </tr>
                      ))}
 </tbody>
 </table>
 </div>
 </div>
            ))}
 </div>
 <p style={{ fontSize:10.5, color:'#86868b', marginTop:14, lineHeight:1.5 }}>CAWI · Universo: población española ≥18 años · ponderación por cuotas de sexo, edad, CCAA y tamaño de municipio · error muestral ±2.0 pp (IC 95%). El perfil generado combina los 7 ejes con pesos relativos (la ideología pondera 2.5×) y renormaliza al 100%.</p>
 </section>

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Perfiles de Votante · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function Selector({ label, values, value, onChange }: { label:string, values: readonly string[], value: string, onChange: (v: string) => void }) {
  return (
 <div>
 <label style={{ display:'block', fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{label}</label>
 <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%',
          padding:'9px 32px 9px 12px',
          borderRadius:10, border:'1px solid #ECECEF', background:'#fff',
          fontSize:13, fontFamily:'inherit', fontWeight:600, color:'#1d1d1f',
          cursor:'pointer', appearance:'none',
          backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M3 5l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
          backgroundRepeat:'no-repeat', backgroundPosition:'right 11px center',
          outline:'none',
        }}>
        {values.map(v => <option key={v} value={v}>{v}</option>)}
 </select>
 </div>
  )
}

function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
 <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
 </div>
  )
}
