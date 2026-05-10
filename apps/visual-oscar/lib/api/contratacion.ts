import type {
  LicitacionesSnapshot,
  AdjudicacionesSnapshot,
  ContratosVigentesSnapshot,
  LitigiosSnapshot,
  TrazabilidadSnapshot,
} from '@/types/contratacion'

const BASE = '/api/contratacion'

async function get<T>(path: string, revalidate = 120): Promise<T> {
  const res = await fetch(path, { next: { revalidate } })
  if (!res.ok) throw new Error(`[contratacion] ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const contratacionApi = {
  getLicitaciones: () =>
    get<LicitacionesSnapshot>(`${BASE}/licitaciones`, 300),
  getAdjudicaciones: () =>
    get<AdjudicacionesSnapshot>(`${BASE}/adjudicaciones`, 300),
  getContratosVigentes: () =>
    get<ContratosVigentesSnapshot>(`${BASE}/contratos-vigentes`, 120),
  getLitigios: () =>
    get<LitigiosSnapshot>(`${BASE}/litigios`, 120),
  getTrazabilidad: () =>
    get<TrazabilidadSnapshot>(`${BASE}/trazabilidad`, 60),
}
