'use client'
import { CSSProperties } from 'react'
import type { CredibilidadFuente, ConfianzaContenido } from '@/types/intelligence'

const CRED_LABEL: Record<CredibilidadFuente, string> = {
  A: 'Totalmente fiable',
  B: 'Habitualmente fiable',
  C: 'Bastante fiable',
  D: 'No habitualmente fiable',
  E: 'No fiable',
  F: 'Fiabilidad no determinada',
}
const CONF_LABEL: Record<ConfianzaContenido, string> = {
  1: 'Confirmado por otras fuentes',
  2: 'Probablemente verdadero',
  3: 'Posiblemente verdadero',
  4: 'De veracidad dudosa',
  5: 'Improbablemente verdadero',
  6: 'Veracidad no determinada',
}

const CRED_COLOR: Record<CredibilidadFuente, string> = {
  A: '#16A34A', B: '#0F766E', C: '#0EA5E9', D: '#EAB308', E: '#F97316', F: '#6e6e73',
}

export interface AdmiraltyBadgeProps {
  credibilidad: CredibilidadFuente
  confianza: ConfianzaContenido
}

export default function AdmiraltyBadge({ credibilidad, confianza }: AdmiraltyBadgeProps) {
  const color = CRED_COLOR[credibilidad]
  const wrap: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 0,
    border: `1px solid ${color}40`, borderRadius: 8, overflow: 'hidden',
    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  }
  const left: CSSProperties = {
    padding: '2px 8px', background: `${color}20`, color, lineHeight: 1.5,
  }
  const right: CSSProperties = {
    padding: '2px 8px', background: '#fff', color: '#3a3a3d', lineHeight: 1.5, borderLeft: `1px solid ${color}30`,
  }
  return (
    <span style={wrap} title={`${CRED_LABEL[credibilidad]} - ${CONF_LABEL[confianza]}`}>
      <span style={left}>{credibilidad}</span>
      <span style={right}>{confianza}</span>
    </span>
  )
}
