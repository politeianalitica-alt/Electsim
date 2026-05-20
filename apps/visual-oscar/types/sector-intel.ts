/**
 * Tipos del endpoint /api/v1/sector-intel/{sector}/overview.
 * Sincronizado 1:1 con api/routers/sector_intel.py.
 */

export type SectorIntelKey =
  | 'banca'
  | 'farma'
  | 'defensa'
  | 'vivienda'
  | 'telecom'
  | 'infraestructuras'
  | 'turismo'
  | 'agro'

export interface IntelKpi {
  label: string
  value: string
  sub?: string
  color?: string
}

export interface IntelAlert {
  slug?: string
  title?: string
  severity?: 'info' | 'medium' | 'high' | 'critical' | string
  kind?: string
  url?: string | null
  date?: string | null
}

export interface IntelTable {
  columns: string[]
  /** Cada fila es array heterogéneo (texto, número, null). */
  rows: (string | number | null | undefined)[][]
}

export interface SectorIntelOverview {
  sector: string
  headline_kpis: IntelKpi[]
  alerts: IntelAlert[]
  table: IntelTable
  sources: string[]
  generado_en: string
}

export const SECTOR_INTEL_CONFIG: Record<SectorIntelKey, { accent: string; label: string }> = {
  banca: { accent: '#1F4E8C', label: 'Banca & Seguros' },
  farma: { accent: '#0EA5E9', label: 'Farma & Salud' },
  defensa: { accent: '#374151', label: 'Defensa & Industria' },
  vivienda: { accent: '#B45309', label: 'Vivienda & Inmobiliario' },
  telecom: { accent: '#7c3aed', label: 'Telecom & Digital' },
  infraestructuras: { accent: '#0e7490', label: 'Infraestructuras & Movilidad' },
  turismo: { accent: '#EA580C', label: 'Turismo & Hostelería' },
  agro: { accent: '#16A34A', label: 'Agroalimentario & Rural' },
}
