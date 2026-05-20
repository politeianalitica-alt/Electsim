// lib/tokens.ts
// Synced with styles/tokens.css — do not edit values without updating CSS too.

export const PARTY_COLORS: Record<string, string> = {
  PSOE: '#e11931',
  PP: '#199fe6',
  VOX: '#63be21',
  SUMAR: '#e1007f',
  ERC: '#f2a900',
  JUNTS: '#00356a',
  BILDU: '#45a8a8',
  PNV: '#007a3d',
  CC: '#f5a623',
  CS: '#f96700',
 'NA+': '#0057a8',
  BNG: '#6cbcc8',
  OTROS: '#8e8e93',
} as const;

export type PartyKey = keyof typeof PARTY_COLORS;

export const SEVERITY_COLORS = {
  critical: { light: '#c42c2c', dark: '#ff453a' },
  high:     { light: '#d97706', dark: '#ffd60a' },
  medium:   { light: '#0071e3', dark: '#2997ff' },
  low:      { light: '#2d8a39', dark: '#3dba4c' },
  info:     { light: '#6e6e73', dark: '#8e8e93' },
} as const;

export type SeverityLevel = keyof typeof SEVERITY_COLORS;

export function getSeverityColor(level: SeverityLevel, theme: 'light' | 'dark' = 'light'): string {
  return SEVERITY_COLORS[level][theme];
}

export function getPartyColorArray(parties: string[]): string[] {
  return parties.map(p => PARTY_COLORS[p] ?? PARTY_COLORS.OTROS);
}

export const SPACE = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20,
  6: 24, 7: 28, 8: 32, 10: 40, 12: 48,
} as const;

export const RADIUS = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 22, full: 9999,
} as const;
