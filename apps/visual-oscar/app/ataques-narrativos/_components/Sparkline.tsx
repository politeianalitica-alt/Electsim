// Stub creado durante merge Visual_Oscar → main · 21 may 2026.
// Original a subir por el socio en commit fa682e8 — nunca llegó al repo.
// Reemplazar cuando termine la feature.

export function Sparkline({ data, color, h = 36 }: { data?: number[]; color?: string; h?: number }) {
  const safeData = Array.isArray(data) && data.length > 1 ? data : [0, 0]
  const min = Math.min(...safeData)
  const max = Math.max(...safeData)
  const range = max - min || 1
  const w = 80
  const points = safeData
    .map((v, i) => `${(i / (safeData.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color || '#1F4E8C'} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
