'use client'

import crops from '@/data/crop-calendars.json'

interface Props {
  slug: string
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function CropCalendar({ slug }: Props) {
  const entry = (crops as Record<string, any>)[slug]
  if (!entry) {
    return <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin calendario de cultivo disponible.</p>
  }
  const currentMonth = new Date().getMonth() + 1

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Regiones: <strong>{entry.regions?.join(', ') ?? '—'}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
        {entry.phases.map((p: any, i: number) => {
          const isCurrent = p.month === currentMonth
          return (
            <div
              key={i}
              title={`${MONTHS[p.month - 1]} · ${p.label}`}
              style={{
                background: p.color,
                color: '#111827',
                padding: '6px 4px',
                borderRadius: 4,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 700,
                outline: isCurrent ? '2px solid #7c3aed' : 'none',
                outlineOffset: -1,
              }}
            >
              <div style={{ fontSize: 10 }}>{MONTHS[p.month - 1]}</div>
              <div style={{ fontSize: 9, opacity: 0.85, lineHeight: 1.1, marginTop: 2 }}>
                {p.label}
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: '#7c3aed', marginTop: 8 }}>
        ▶ Estamos en: <strong>{entry.phases.find((p: any) => p.month === currentMonth)?.label ?? '—'}</strong>
      </p>
    </div>
  )
}
