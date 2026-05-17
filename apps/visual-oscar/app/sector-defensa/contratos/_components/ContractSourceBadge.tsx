const FUENTE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  TED:               { label: 'TED EU',     bg: '#0EA5E9', color: '#fff' },
  CATALUNYA_SOCRATA: { label: 'Catalunya',  bg: '#F97316', color: '#fff' },
  PLACSP:            { label: 'Nacional',   bg: '#1F4E8C', color: '#fff' },
  USASPENDING:       { label: 'DoD USA',    bg: '#DC2626', color: '#fff' },
  VALENCIA_CKAN:     { label: 'Valencia',   bg: '#7C3AED', color: '#fff' },
}

export function ContractSourceBadge({ fuente, label }: { fuente: string; label?: string }) {
  const cfg = FUENTE_CONFIG[fuente] ?? { label: fuente, bg: '#525258', color: '#fff' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
      background: cfg.bg, color: cfg.color, letterSpacing: '0.04em',
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
    }}>
      {label ?? cfg.label}
    </span>
  )
}

export const FUENTE_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(FUENTE_CONFIG).map(([k, v]) => [k, v.bg])
)
