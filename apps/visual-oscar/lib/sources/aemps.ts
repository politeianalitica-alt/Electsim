/**
 * Cliente para CIMA · Centro de Información de Medicamentos AEMPS
 * https://cima.aemps.es/cima/rest/
 *
 * Endpoint público sin auth, devuelve JSON. Datos del sistema farmacéutico
 * español: catálogo de medicamentos autorizados, desabastecimientos
 * (problemas de suministro), fichas técnicas, principios activos.
 *
 * Docs: https://cima.aemps.es/cima/dochtml/help.html
 */

const BASE = 'https://cima.aemps.es/cima/rest'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface CimaPaginated<T> {
  totalFilas: number
  pagina: number
  tamanioPagina: number
  numeroDePaginas?: number
  resultados: T[]
}

export interface Medicamento {
  nregistro?: string
  nombre?: string
  labtitular?: string
  labcomercializador?: string
  cn?: number
  estado?: { aut?: number; susp?: number; rev?: number }
  comerc?: boolean         // comercializado
  receta?: boolean         // requiere receta
  huerfano?: boolean       // medicamento huérfano
  biosimilar?: boolean
  generico?: boolean       // EFG
  triangulo?: boolean      // triangulo invertido (en seguimiento)
  formaFarmaceutica?: { nombre?: string; id?: number }
  viasAdministracion?: Array<{ nombre?: string }>
  atcs?: Array<{ codigo?: string; nombre?: string }>
  principiosActivos?: Array<{ nombre?: string; orden?: number }>
}

export interface ProblemaSuministro {
  cn?: number
  nombre?: string
  nregistro?: string
  tipoProblemaSuministro?: number  // 1=problema, 2=suspension, 3=falta...
  fini?: number                    // ms epoch
  ffin?: number | null
  activo?: boolean
  observ?: string                  // motivo
}

async function fetchCima<T>(
  path: string,
  qs: Record<string, string | number>,
  timeoutMs = 8000,
): Promise<T | null> {
  const url = new URL(`${BASE}/${path}`)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, String(v))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ─── Búsqueda de medicamentos ─────────────────────────────
export interface BuscarParams {
  nombre?: string
  laboratorio?: string
  atc?: string
  practiv1?: string                // principio activo 1
  comerc?: 1 | 0
  receta?: 1 | 0
  huerfano?: 1 | 0
  biosimilar?: 1 | 0
  generico?: 1 | 0
  triangulo?: 1 | 0
  pagina?: number
  tamanioPagina?: number
}

export async function searchMedicamentos(
  p: BuscarParams,
  timeoutMs = 8000,
): Promise<{ ok: boolean; total: number; items: Medicamento[]; pagina: number; ms: number }> {
  const t0 = Date.now()
  const qs: Record<string, string | number> = {}
  if (p.nombre) qs.nombre = p.nombre
  if (p.laboratorio) qs.laboratorio = p.laboratorio
  if (p.atc) qs.atc = p.atc
  if (p.practiv1) qs.practiv1 = p.practiv1
  if (p.comerc != null) qs.comerc = p.comerc
  if (p.receta != null) qs.receta = p.receta
  if (p.huerfano != null) qs.huerfano = p.huerfano
  if (p.biosimilar != null) qs.biosimilar = p.biosimilar
  if (p.generico != null) qs.generico = p.generico
  if (p.triangulo != null) qs.triangulo = p.triangulo
  qs.pagina = p.pagina ?? 1
  qs.tamanioPagina = p.tamanioPagina ?? 25

  const r = await fetchCima<CimaPaginated<Medicamento>>('medicamentos', qs, timeoutMs)
  if (!r) return { ok: false, total: 0, items: [], pagina: 1, ms: Date.now() - t0 }
  return { ok: true, total: r.totalFilas, items: r.resultados, pagina: r.pagina, ms: Date.now() - t0 }
}

// ─── Ficha técnica de un medicamento ─────────────────────
export async function getMedicamento(nregistro: string): Promise<Medicamento | null> {
  return fetchCima<Medicamento>('medicamento', { nregistro })
}

// ─── Desabastecimientos / problemas de suministro ─────────
export async function searchDesabastecimientos(
  daysBack = 60,
  pagina = 1,
  tamanioPagina = 100,
  timeoutMs = 8000,
): Promise<{ ok: boolean; total: number; items: ProblemaSuministro[]; ms: number }> {
  const t0 = Date.now()
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - daysBack)
  const fechadesde = fecha.toISOString().slice(0, 10)
  const r = await fetchCima<CimaPaginated<ProblemaSuministro>>('psuministro', {
    fechadesde, pagina, tamanioPagina,
  }, timeoutMs)
  if (!r) return { ok: false, total: 0, items: [], ms: Date.now() - t0 }
  return { ok: true, total: r.totalFilas, items: r.resultados, ms: Date.now() - t0 }
}

// Tipo problema suministro · etiquetas oficiales AEMPS
export const TIPO_PROBLEMA_LABEL: Record<number, string> = {
  1: 'Problema de suministro',
  2: 'Suspensión temporal',
  3: 'Cese de comercialización',
  4: 'Restricción asistencial',
  5: 'Sin alternativas en mismo principio activo',
  6: 'Reactivación de suministro',
  7: 'Otros',
}

export const TIPO_PROBLEMA_COLOR: Record<number, string> = {
  1: '#F97316', 2: '#EAB308', 3: '#DC2626',
  4: '#7C3AED', 5: '#0EA5E9', 6: '#16A34A', 7: '#525258',
}

// ─── Catálogo curado: empresas farma cotizadas IBEX y MAB ───
export const EMPRESAS_FARMA = [
  {
    nombre: 'Grifols', ticker: 'GRF.MC', ibex: true,
    descripcion: 'Hemoderivados, líder mundial en plasma. Sede Sant Cugat.',
    capitalizacion_b: 6.2,
    web: 'https://www.grifols.com',
    segmento: 'Hemoderivados · plasma',
  },
  {
    nombre: 'Almirall', ticker: 'ALM.MC', ibex: false,
    descripcion: 'Dermatología especializada (psoriasis, atopia). Sede Barcelona.',
    capitalizacion_b: 1.8,
    web: 'https://www.almirall.com',
    segmento: 'Dermatología · innovador',
  },
  {
    nombre: 'Rovi', ticker: 'ROVI.MC', ibex: true,
    descripcion: 'Heparinas y CDMO · fabricó vacuna Moderna en Europa.',
    capitalizacion_b: 2.6,
    web: 'https://www.rovi.es',
    segmento: 'Genérico + CDMO',
  },
  {
    nombre: 'Faes Farma', ticker: 'FAE.MC', ibex: false,
    descripcion: 'Bilastina (antialérgico) · 100 % de OTC en farmacia.',
    capitalizacion_b: 0.95,
    web: 'https://www.faes.es',
    segmento: 'OTC · genérico',
  },
  {
    nombre: 'PharmaMar', ticker: 'PHM.MC', ibex: false,
    descripcion: 'Oncología derivada de organismos marinos · Yondelis, Aplidin.',
    capitalizacion_b: 0.74,
    web: 'https://www.pharmamar.com',
    segmento: 'Oncología · biotech',
  },
  {
    nombre: 'Reig Jofre', ticker: 'RJF.MC', ibex: false,
    descripcion: 'CDMO antibióticos inyectables y especialidades farmacéuticas.',
    capitalizacion_b: 0.21,
    web: 'https://www.reigjofre.com',
    segmento: 'CDMO · antibióticos',
  },
  {
    nombre: 'Atrys Health', ticker: 'ATRY.MC', ibex: false,
    descripcion: 'Diagnóstico, oncología radioterápica y telemedicina.',
    capitalizacion_b: 0.38,
    web: 'https://www.atryshealth.com',
    segmento: 'Diagnóstico · radioterapia',
  },
  {
    nombre: 'Oryzon Genomics', ticker: 'ORY.MC', ibex: false,
    descripcion: 'Epigenética en oncología y enfermedades neurológicas.',
    capitalizacion_b: 0.18,
    web: 'https://www.oryzon.com',
    segmento: 'Biotech · epigenética',
  },
] as const

export const REGULADORES_FARMA = [
  {
    nombre: 'AEMPS',
    full: 'Agencia Española de Medicamentos y Productos Sanitarios',
    web: 'https://www.aemps.gob.es',
    competencias: 'Autorización, registro y vigilancia post-comercialización.',
  },
  {
    nombre: 'Ministerio de Sanidad',
    full: 'Ministerio de Sanidad · Dirección General de Cartera Común',
    web: 'https://www.sanidad.gob.es',
    competencias: 'Cartera de servicios SNS, financiación y precio de medicamentos.',
  },
  {
    nombre: 'CIPM',
    full: 'Comisión Interministerial de Precios de los Medicamentos',
    web: 'https://www.sanidad.gob.es/cipm',
    competencias: 'Fija precios financiados por SNS y sistema de precios de referencia.',
  },
  {
    nombre: 'EMA',
    full: 'European Medicines Agency · Ámsterdam',
    web: 'https://www.ema.europa.eu',
    competencias: 'Autorización europea centralizada y farmacovigilancia UE.',
  },
  {
    nombre: 'CCAA · Salud',
    full: 'Consejerías de Sanidad autonómicas',
    web: 'https://www.sanidad.gob.es/areas/farmacia/farmaciaCCAA/home.htm',
    competencias: 'Compra hospitalaria, hospital al día, oficinas de farmacia.',
  },
  {
    nombre: 'CGCOF',
    full: 'Consejo General de Colegios Oficiales de Farmacéuticos',
    web: 'https://www.farmaceuticos.com',
    competencias: 'Profesión farmacéutica, BOT-PLUS, dispensación.',
  },
] as const
