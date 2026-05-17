'use client'

import { useEffect, useState } from 'react'

interface Norma {
  id: string; nombre: string; nombre_corto: string
  ambito: string; tipo: string; estado: string
  descripcion: string; fecha_publicacion: string
  fecha_ultima_modificacion: string; fecha_implementacion_esp?: string
  impacto_esp: string; areas_afectadas: string[]
  url_oficial?: string; novedades_recientes?: string
}

const AMBITO_CONFIG: Record<string, { bg: string; color: string }> = {
  ITAR:  { bg: '#EFF6FF', color: '#1F4E8C' },
  EAR:   { bg: '#F0F4FF', color: '#4F46E5' },
  EU:    { bg: '#ECFDF5', color: '#059669' },
  OTAN:  { bg: '#FFF9E6', color: '#D97706' },
  ESP:   { bg: '#FFF1F2', color: '#DC2626' },
  ONU:   { bg: '#F5F5F7', color: '#525258' },
}

const IMPACTO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  alto:  { label: 'Impacto alto',  bg: '#FFF1F2', color: '#DC2626' },
  medio: { label: 'Impacto medio', bg: '#FFF9E6', color: '#D97706' },
  bajo:  { label: 'Impacto bajo',  bg: '#F0FDF4', color: '#16A34A' },
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  vigente:                 { label: 'Vigente',                bg: '#F0FDF4', color: '#16A34A' },
  en_revision:             { label: 'En revisión',             bg: '#FFF9E6', color: '#D97706' },
  en_tramitacion:          { label: 'En tramitación',          bg: '#EFF6FF', color: '#1F4E8C' },
  pendiente_transposicion: { label: 'Pendiente transposición', bg: '#FFF1F2', color: '#DC2626' },
  derogada:                { label: 'Derogada',                bg: '#F5F5F7', color: '#86868b' },
}

const AMBITOS_FILTRO = ['todos', 'ITAR', 'EAR', 'EU', 'ESP', 'OTAN']

export function RegulatoryTimeline() {
  const [items, setItems]         = useState<Norma[]>([])
  const [loading, setLoading]     = useState(true)
  const [ambitoF, setAmbitoF]     = useState('todos')
  const [expanded, setExpanded]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sectores/defensa/normas')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => { setItems(d?.items ?? []); setLoading(false) })
  }, [])

  const filtered = ambitoF === 'todos' ? items : items.filter(n => n.ambito === ambitoF)
  const sorted   = [...filtered].sort((a, b) => b.fecha_ultima_modificacion.localeCompare(a.fecha_ultima_modificacion))

  return (
    <div style={{ width: '100%' }}>
      {/* Filtro ámbito */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {AMBITOS_FILTRO.map(a => (
          <button key={a} onClick={() => setAmbitoF(a)}
            style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 10.5, fontWeight: 700,
              border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
              borderColor: ambitoF === a ? '#1d1d1f' : '#DDDDE3',
              background: ambitoF === a ? '#1d1d1f' : '#fff',
              color: ambitoF === a ? '#fff' : '#6e6e73', textTransform: 'uppercase' as const,
            }}
          >{a === 'todos' ? 'Todas' : a}</button>
        ))}
        <span style={{ fontSize: 11, color: '#86868b', alignSelf: 'center', marginLeft: 6 }}>{sorted.length} normas</span>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#86868b' }}>Cargando normativa…</div>}

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Línea vertical */}
        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#ECECEF', borderRadius: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(n => {
            const ac = AMBITO_CONFIG[n.ambito] ?? AMBITO_CONFIG.EU
            const ic = IMPACTO_CONFIG[n.impacto_esp]
            const ec = ESTADO_CONFIG[n.estado] ?? ESTADO_CONFIG.vigente
            const isOpen = expanded === n.id

            return (
              <div key={n.id} style={{ position: 'relative' }}>
                {/* Dot en la línea */}
                <div style={{
                  position: 'absolute', left: -20, top: 16,
                  width: 10, height: 10, borderRadius: '50%',
                  background: n.novedades_recientes ? '#DC2626' : '#DDDDE3',
                  border: '2px solid #fff', boxShadow: n.novedades_recientes ? '0 0 6px #DC262680' : 'none',
                }} />

                <div
                  onClick={() => setExpanded(isOpen ? null : n.id)}
                  style={{
                    padding: '12px 16px', background: '#fff',
                    border: `1px solid ${isOpen ? '#1F4E8C' : '#ECECEF'}`,
                    borderRadius: 12, cursor: 'pointer',
                    borderLeft: `3px solid ${ac.color}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: ac.bg, color: ac.color, letterSpacing: '0.06em' }}>{n.ambito}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ec.bg, color: ec.color }}>{ec.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ic.bg, color: ic.color }}>{ic.label}</span>
                    {n.novedades_recientes && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#FFF1F2', color: '#DC2626' }}>🔴 NOVEDAD</span>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', marginBottom: 2 }}>{n.nombre_corto}</div>
                      <div style={{ fontSize: 11, color: '#86868b' }}>Actualizado: {n.fecha_ultima_modificacion}</div>
                    </div>
                    <span style={{ fontSize: 16, color: '#86868b', flexShrink: 0, marginTop: 2 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F5F7' }}>
                      <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, margin: '0 0 10px' }}>{n.descripcion}</p>

                      {n.novedades_recientes && (
                        <div style={{ padding: '8px 12px', background: '#FFF9E6', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#D97706', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Novedades recientes</div>
                          <p style={{ fontSize: 11.5, color: '#6e6e73', margin: 0, lineHeight: 1.4 }}>{n.novedades_recientes}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {n.areas_afectadas.map(a => (
                          <span key={a} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#F5F5F7', color: '#525258', fontWeight: 600 }}>{a}</span>
                        ))}
                      </div>

                      {n.fecha_implementacion_esp && (
                        <div style={{ fontSize: 10.5, color: '#86868b' }}>Implementación en España: {n.fecha_implementacion_esp}</div>
                      )}

                      {n.url_oficial && (
                        <a href={n.url_oficial} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '6px 12px', borderRadius: 7, background: '#1d1d1f', color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                          Texto oficial ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
