/**
 * Tipos de las señales sectoriales transversales.
 * Coincide con el output de `/api/v1/sectores/{id}/signals` del backend
 * y con el spec del PDF Bloque 10 (RiskSignal + dominio).
 */
import type { NivelImpacto } from './legislativo';

export type SectorDominio =
  | 'regulatorio'    // BOE, normativa CCAA/UE
  | 'politico'       // gobierno, coalición, parlamentaria
  | 'reputacional'   // narrativas adversas en medios
  | 'contractual'    // licitaciones, adjudicaciones, litigios
  | 'geopolitico'    // tensiones internacionales
  | 'narrativo'      // ciclo de vida narrativas dominantes

export type SectorSignalOrigen =
  | 'legis_scoring'    // motor BOE
  | 'news_scoring'     // motor noticias / RSS
  | 'contratos_scoring'// motor PLACSP / TED
  | 'manual'
  | 'geopolitica'

export interface SectorSignal {
  id: string
  dominio: SectorDominio
  titulo: string
  descripcion: string
  score: number           // 0-100
  nivel: NivelImpacto
  origen: SectorSignalOrigen
  fuente_url: string
  fuente_nombre: string   // "BOE" | "google_news" | ...
  snapshot_at: string     // ISO 8601
}

export interface SectorSignalsResponse {
  sector_id: string
  days: number
  total: number
  signals: SectorSignal[]
}
