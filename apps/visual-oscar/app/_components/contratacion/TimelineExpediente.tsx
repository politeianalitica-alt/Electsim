'use client'

export interface TimelineStep {
  fase: string
  fecha: string
  titulo: string
  detalle: string
  resultado?: 'ok' | 'pendiente' | 'rechazado'
  color: string
  orden: number
}

export function TimelineExpediente({
  steps,
  activeOrden,
}: {
  steps: TimelineStep[]
  activeOrden?: number
}) {
  const sorted = [...steps].sort((a, b) => a.orden - b.orden)
  return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sorted.map((s, i) => {
        const isLast = i === sorted.length - 1
        const dotColor =
          s.resultado === 'ok'
            ? '#16A34A'
            : s.resultado === 'rechazado'
            ? '#DC2626'
            : s.color
        const active = activeOrden !== undefined && s.orden <= activeOrden
        return (
 <div key={s.fase} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            {!isLast && (
 <div style={{
                position: 'absolute',
                left: 7,
                top: 18,
                bottom: -1,
                width: 2,
                background: active ? s.color : '#ECECEF',
              }} />
            )}
 <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: active ? dotColor : '#ECECEF',
              border: `2px solid ${active ? dotColor : '#D1D1D6'}`,
              flexShrink: 0,
              marginTop: 2,
              zIndex: 1,
            }} />
 <div style={{ paddingBottom: 16 }}>
 <div style={{
                fontSize: 9,
                fontWeight: 800,
                color: active ? s.color : '#86868b',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {s.titulo}
 </div>
 <div style={{
                fontSize: 12,
                color: active ? '#1d1d1f' : '#6e6e73',
                marginTop: 2,
                fontWeight: active ? 600 : 400,
              }}>
                {s.detalle}
 </div>
 <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{s.fecha}</div>
 </div>
 </div>
        )
      })}
 </div>
  )
}
