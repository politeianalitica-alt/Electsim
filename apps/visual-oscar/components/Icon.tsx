'use client'

interface Props { size?: number; color?: string; style?: React.CSSProperties }

/**
 * Iconografía SVG mínima — sustituye emojis con glyphs consistentes.
 * Stroke: currentColor para heredar color del padre.
 */
export const IconNews = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1"/>
    <line x1="5" y1="6" x2="11" y2="6"/>
    <line x1="5" y1="9" x2="11" y2="9"/>
    <line x1="5" y1="11" x2="9" y2="11"/>
  </svg>
)

export const IconChart = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="13" x2="14" y2="13"/>
    <rect x="3.5" y="8" width="2" height="5"/>
    <rect x="7" y="5" width="2" height="8"/>
    <rect x="10.5" y="9" width="2" height="4"/>
  </svg>
)

export const IconBolt = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="9,2 4,9 8,9 7,14 12,7 8,7" fill={color || 'currentColor'} fillOpacity="0.15"/>
  </svg>
)

export const IconAlert = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2 L14 13 L2 13 Z"/>
    <line x1="8" y1="6" x2="8" y2="9"/>
    <circle cx="8" cy="11" r="0.5" fill={color || 'currentColor'}/>
  </svg>
)

export const IconGlobe = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4">
    <circle cx="8" cy="8" r="6"/>
    <ellipse cx="8" cy="8" rx="6" ry="2.5"/>
    <line x1="8" y1="2" x2="8" y2="14"/>
  </svg>
)

export const IconBrain = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4 C 3 4, 2 5.5, 2.5 7 C 1.8 8, 2.2 10, 4 10.5 C 4.5 12, 6.5 12.5, 8 11"/>
    <path d="M11 4 C 13 4, 14 5.5, 13.5 7 C 14.2 8, 13.8 10, 12 10.5 C 11.5 12, 9.5 12.5, 8 11"/>
    <line x1="8" y1="3" x2="8" y2="11"/>
  </svg>
)

export const IconPlay = ({ size = 10, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill={color || 'currentColor'} style={{ verticalAlign: 'middle', ...style }}>
    <polygon points="3,2 10,6 3,10"/>
  </svg>
)

export const IconRefresh = ({ size = 12, color, style }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', ...style }} stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 8 A 6 6 0 1 1 13 4 L 14 4 L 14 1"/>
    <path d="M2 8 A 6 6 0 1 1 3 12 L 2 12 L 2 15"/>
  </svg>
)
