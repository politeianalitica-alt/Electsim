/**
 * Cliente ClinicalTrials.gov API v2 · ensayos clínicos · Politeia Farma v3
 *
 * Documentación: https://clinicaltrials.gov/data-api/api
 * Endpoint base: https://clinicaltrials.gov/api/v2/studies
 *
 * Sin autenticación. Devuelve JSON. Útil para responder:
 *   - ¿Cuántos ensayos clínicos activos hay en España?
 *   - ¿Quién patrocina (sponsor / collaborator) los ensayos en España?
 *   - ¿Qué áreas terapéuticas dominan?
 *   - ¿Qué fase clínica predomina?
 *
 * Cero datos inventados. Si la API falla → ok: false con motivo.
 */

const BASE = 'https://clinicaltrials.gov/api/v2/studies'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

export interface ClinicalTrialStudy {
  /** NCT id (identificador estándar). */
  nct_id: string
  /** Título breve. */
  titulo: string
  /** Estado del estudio (Recruiting, Active, Completed, …). */
  estado: string
  /** Fase clínica (Phase 1, Phase 2, Phase 3, Phase 4, N/A). */
  fase: string[]
  /** Condiciones investigadas. */
  condiciones: string[]
  /** Patrocinador principal (lead sponsor name). */
  sponsor_principal: string
  /** Clase del sponsor (INDUSTRY, OTHER, NIH...). */
  sponsor_clase: string
  /** Países donde se ejecuta el ensayo (ISO names). */
  paises: string[]
  /** Fecha de inicio (YYYY-MM-DD si está disponible). */
  fecha_inicio: string | null
  /** Fecha estimada de finalización. */
  fecha_fin: string | null
  /** Tipo de estudio (Interventional / Observational). */
  tipo: string
  /** URL canónica del estudio en clinicaltrials.gov. */
  url: string
}

interface CtStudiesResponse {
  studies?: Array<{
    protocolSection?: {
      identificationModule?: { nctId?: string; briefTitle?: string }
      statusModule?: {
        overallStatus?: string
        startDateStruct?: { date?: string }
        completionDateStruct?: { date?: string }
      }
      designModule?: { phases?: string[]; studyType?: string }
      conditionsModule?: { conditions?: string[] }
      sponsorCollaboratorsModule?: {
        leadSponsor?: { name?: string; class?: string }
      }
      contactsLocationsModule?: { locations?: Array<{ country?: string }> }
    }
  }>
  totalCount?: number
}

interface FetchOpts {
  /** Filtro por país (Spain por defecto · usa nombre ISO en inglés). */
  pais?: string
  /** Filtro libre por condición/término. */
  query?: string
  /** Filtro por estado (overallStatus). */
  estado?: 'RECRUITING' | 'ACTIVE_NOT_RECRUITING' | 'COMPLETED' | 'TERMINATED' | 'WITHDRAWN' | 'UNKNOWN'
  /** Tamaño de página (max 100 por la API). */
  pageSize?: number
  /** Timeout en ms (default 10s). */
  timeoutMs?: number
}

export async function fetchClinicalTrials(
  opts: FetchOpts = {}
): Promise<{ ok: true; studies: ClinicalTrialStudy[]; total: number } | { ok: false; error: string }> {
  const { pais = 'Spain', query, estado, pageSize = 50, timeoutMs = 10000 } = opts
  const params = new URLSearchParams()
  params.set('format', 'json')
  params.set('pageSize', String(Math.min(100, Math.max(1, pageSize))))
  params.set('countTotal', 'true')
  // Filtros avanzados — query.locn.country o query.term según el caso
  if (pais) params.set('query.locn', pais)
  if (query) params.set('query.term', query)
  if (estado) params.set('filter.overallStatus', estado)
  // Campos a devolver (reduce payload)
  params.set(
    'fields',
    [
      'NCTId',
      'BriefTitle',
      'OverallStatus',
      'Phase',
      'Condition',
      'LeadSponsorName',
      'LeadSponsorClass',
      'LocationCountry',
      'StartDate',
      'CompletionDate',
      'StudyType',
    ].join(',')
  )

  const url = `${BASE}?${params.toString()}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 14400 }, // 4h
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} clinicaltrials` }
    const txt = await res.text()
    if (!txt || txt.length < 20) return { ok: false, error: 'respuesta vacía clinicaltrials' }
    const data = JSON.parse(txt) as CtStudiesResponse
    const studies = (data.studies || []).map(normalize)
    return { ok: true, studies, total: data.totalCount ?? studies.length }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

function normalize(s: NonNullable<CtStudiesResponse['studies']>[number]): ClinicalTrialStudy {
  const id = s.protocolSection?.identificationModule
  const status = s.protocolSection?.statusModule
  const design = s.protocolSection?.designModule
  const cond = s.protocolSection?.conditionsModule
  const sponsor = s.protocolSection?.sponsorCollaboratorsModule
  const loc = s.protocolSection?.contactsLocationsModule
  const nct = id?.nctId || ''
  const paises = Array.from(new Set((loc?.locations || []).map((l) => l.country || '').filter(Boolean)))
  return {
    nct_id: nct,
    titulo: id?.briefTitle || '',
    estado: status?.overallStatus || 'UNKNOWN',
    fase: design?.phases || [],
    condiciones: cond?.conditions || [],
    sponsor_principal: sponsor?.leadSponsor?.name || '',
    sponsor_clase: sponsor?.leadSponsor?.class || '',
    paises,
    fecha_inicio: status?.startDateStruct?.date ?? null,
    fecha_fin: status?.completionDateStruct?.date ?? null,
    tipo: design?.studyType || '',
    url: nct ? `https://clinicaltrials.gov/study/${nct}` : '',
  }
}
