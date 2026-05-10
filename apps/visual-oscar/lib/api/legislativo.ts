// Typed HTTP client for the legislative stack
// All methods proxy through Next.js route handlers (never call FastAPI directly from client)

import type {
  GrupoParlamentario,
  IniciativaLegislativa,
  VotacionPlenaria,
  Comision,
  EventoAgenda,
  HuellaLegislativa,
  EstadoLegislativo,
  LegislativoApiResponse,
} from '@/types/legislativo'

const BASE = '/api/legislativo'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Legislativo API error: ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const legislativoApi = {
  // Estado general (grupos, distribución de escaños)
  getEstado(): Promise<LegislativoApiResponse<EstadoLegislativo>> {
    return get(`${BASE}/estado`)
  },

  // Grupos parlamentarios
  getGrupos(): Promise<LegislativoApiResponse<GrupoParlamentario[]>> {
    return get(`${BASE}/grupos`)
  },

  // Iniciativas con filtros opcionales
  getIniciativas(params?: {
    tipo?: string
    estado?: string
    grupo?: string
    limit?: number
    offset?: number
  }): Promise<LegislativoApiResponse<IniciativaLegislativa[]>> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return get(`${BASE}/iniciativas${qs}`)
  },

  // Una iniciativa por id
  getIniciativa(id: string): Promise<LegislativoApiResponse<IniciativaLegislativa>> {
    return get(`${BASE}/iniciativas/${id}`)
  },

  // Votaciones
  getVotaciones(params?: {
    resultado?: string
    iniciativa_id?: string
    limit?: number
  }): Promise<LegislativoApiResponse<VotacionPlenaria[]>> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return get(`${BASE}/votaciones${qs}`)
  },

  // Comisiones
  getComisiones(camara?: 'congreso' | 'senado' | 'mixta'): Promise<LegislativoApiResponse<Comision[]>> {
    const qs = camara ? `?camara=${camara}` : ''
    return get(`${BASE}/comisiones${qs}`)
  },

  // Agenda legislativa
  getAgenda(params?: { dias?: number; tipo?: string }): Promise<LegislativoApiResponse<EventoAgenda[]>> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return get(`${BASE}/agenda${qs}`)
  },

  // Huella legislativa
  getHuella(periodo?: string): Promise<LegislativoApiResponse<HuellaLegislativa>> {
    const qs = periodo ? `?periodo=${periodo}` : ''
    return get(`${BASE}/huella${qs}`)
  },

  // Monitor: feed de actividad reciente
  getFeed(limit = 20): Promise<LegislativoApiResponse<IniciativaLegislativa[]>> {
    return get(`${BASE}/feed?limit=${limit}`)
  },

  // Análisis de una iniciativa
  analyzeIniciativa(id: string): Promise<LegislativoApiResponse<{ analisis: string; impacto: string; posiciones: Record<string, string> }>> {
    return get(`${BASE}/analyze/${id}`)
  },
}
