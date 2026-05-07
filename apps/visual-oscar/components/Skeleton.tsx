'use client'

interface Props {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: React.CSSProperties
  className?: string
}

/**
 * Bloque skeleton con shimmer animado para estados de carga.
 * Inyecta un keyframe global la primera vez que se monta.
 */
let injected = false

function injectKeyframes() {
  if (injected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.id = 'pol-shimmer-keyframes'
  style.textContent = `
    @keyframes pol-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    @keyframes pol-pulse { 0%,100% { opacity: 0.65 } 50% { opacity: 1 } }
    @keyframes pol-fade-in { 0% { opacity: 0; transform: translateY(4px) } 100% { opacity: 1; transform: none } }
  `
  document.head.appendChild(style)
  injected = true
}

export default function Skeleton({ width = '100%', height = 14, radius = 6, style, className }: Props) {
  if (typeof document !== 'undefined') injectKeyframes()
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #ECECEF 0%, #F5F5F7 50%, #ECECEF 100%)',
        backgroundSize: '200% 100%',
        animation: 'pol-shimmer 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function LiveDot({ color = '#16A34A' }: { color?: string }) {
  if (typeof document !== 'undefined') injectKeyframes()
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: 999,
      background: color, marginRight: 6, verticalAlign: 'middle',
      animation: 'pol-pulse 1.4s ease-in-out infinite',
      boxShadow: `0 0 0 0 ${color}55`,
    }}/>
  )
}
