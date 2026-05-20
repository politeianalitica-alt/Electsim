'use client'

export interface SparkProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  fill?: string
  strokeWidth?: number
}

export default function Spark({ values, width = 120, height = 32, color = '#1F4E8C', fill, strokeWidth = 1.6 }: SparkProps) {
  if (!values || values.length === 0) return <svg width={width} height={height} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1 || 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const fillArea = fill
    ? `M0,${height} L${points.split(' ').join(' L')} L${width},${height} Z`
    : null

  return (
 <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {fillArea && <path d={fillArea} fill={fill} opacity={0.18} />}
 <polyline fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" points={points} />
 </svg>
  )
}
