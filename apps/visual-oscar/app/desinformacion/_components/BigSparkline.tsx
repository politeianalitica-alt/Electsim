interface BigSparklineProps { data: number[]; color: string }

export function BigSparkline({ data, color }: BigSparklineProps) {
  const w = 800, h = 180
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 16 - ((v - min) / range) * (h - 32)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  const gid = `g-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="0" y1={h * p} x2={w} y2={h * p} stroke="#ECECEF" strokeWidth="1" strokeDasharray="2 4" />
      ))}
      <polyline points={area} fill={`url(#${gid})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        if (i % 3 !== 0) return null
        const x = (i / (data.length - 1)) * w
        const y = h - 16 - ((v - min) / range) * (h - 32)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}
