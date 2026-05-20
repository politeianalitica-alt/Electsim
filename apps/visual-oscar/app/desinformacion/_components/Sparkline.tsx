interface SparklineProps { data: number[]; color: string; h?: number }

export function Sparkline({ data, color, h = 30 }: SparklineProps) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  const last = data[data.length - 1]
  const lastY = h - 4 - ((last - min) / range) * (h - 8)
  return (
 <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
 <polyline points={area} fill={`${color}22`} stroke="none" />
 <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
 <circle cx={w} cy={lastY} r="2" fill={color} />
 </svg>
  )
}
