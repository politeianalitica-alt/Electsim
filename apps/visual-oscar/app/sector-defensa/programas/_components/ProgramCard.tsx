'use client'

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activo:     { label: 'Activo',     bg: '#F0FDF4', color: '#16A34A', dot: '#16A34A' },
  en_riesgo:  { label: 'En riesgo',  bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  retrasado:  { label: 'Retrasado',  bg: '#FFF1F2', color: '#DC2626', dot: '#DC2626' },
  completado: { label: 'Completado', bg: '#F0F4FF', color: '#1F4E8C', dot: '#1F4E8C' },
  cancelado:  { label: 'Cancelado',  bg: '#F5F5F7', color: '#6e6e73', dot: '#86868b' },
}

const TIPO_EMOJI: Record<string, string> = {
  aeronautico: '✈️', naval: '⚓', terrestre: '🚗', misiles: '🚀',
  espacial: '🛰️', ciber: '💻', industrial: '🏭',
}

interface Props {
  programa: {
    id: string; nombre_corto: string; descripcion: string; estado: string; tipo: string
    paises: string[]; progreso_pct: number; fase_actual: string
    coste_total_M?: number; coste_espana_M?: number
    inicio: number; fin_previsto: number; bandera_emoji: string
    empresas: Array<{ nombre: string; rol: string }>
  }
  selected: boolean
  onClick: () => void
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: '#ECECEF', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export function ProgramCard({ programa: p, selected, onClick }: Props) {
  const est = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.activo
  const prime = p.empresas.find(e => e.rol === 'prime')?.nombre ?? '—'

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        background: selected ? '#F0F4FF' : '#fff',
        border: `1px solid ${selected ? '#1F4E8C' : '#ECECEF'}`,
        borderRadius: 14, cursor: 'pointer',
        borderLeft: `4px solid ${est.dot}`,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>{TIPO_EMOJI[p.tipo]}</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre_corto}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, background: est.bg, color: est.color }}>
            {est.label}
          </span>
        </div>
        <span style={{ fontSize: 14 }}>{p.bandera_emoji}</span>
      </div>

      {/* Descripción */}
      <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '0 0 8px', lineHeight: 1.4,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
        {p.descripcion}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10.5, color: '#86868b', marginBottom: 2 }}>
        <span>{p.inicio}–{p.fin_previsto}</span>
        {p.coste_total_M && <span>💶 {(p.coste_total_M/1000).toFixed(0)}b€ total</span>}
        {p.coste_espana_M && p.coste_espana_M !== p.coste_total_M && <span>🇪🇸 {(p.coste_espana_M/1000).toFixed(1)}b€</span>}
        <span>Prime: {prime}</span>
      </div>

      {/* Progreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#86868b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.fase_actual}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: est.color, marginLeft: 8 }}>{p.progreso_pct}%</span>
      </div>
      <ProgressBar pct={p.progreso_pct} color={est.dot} />
    </div>
  )
}
