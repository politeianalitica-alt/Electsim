'use client'

interface Props { height?: number }

export default function MapSkeleton({ height = 400 }: Props) {
  return (
    <div
      role="status"
      aria-label="Cargando mapa…"
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        background: 'linear-gradient(90deg, #f0f3f8 25%, #e4e8ef 50%, #f0f3f8 75%)',
        backgroundSize: '200% 100%',
        animation: '_mapPulse 1.5s ease-in-out infinite',
      }}
    >
      <style>{`@keyframes _mapPulse{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )
}
