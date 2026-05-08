'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

interface Cliente { id: number; nombre: string; tipo: string; ambito?: string; color_hex?: string }
interface Mensaje { id: number; titulo: string; cuerpo: string; tipo: string; prioridad: number; fecha_fin?: string; destinatarios?: string[]; autor?: string }
interface Decision { id: number; titulo: string; descripcion: string; tipo: string; resultado: string; impacto_est?: string; lecciones?: string; etiquetas?: string[]; fecha?: string }

const FALLBACK_CLIENTES: Cliente[] = [
  { id: 1, nombre: 'PSOE federal', tipo: 'partido', ambito: 'nacional', color_hex: '#E1322D' },
  { id: 2, nombre: 'Sumar', tipo: 'partido', ambito: 'nacional', color_hex: '#D43F8D' },
  { id: 3, nombre: 'Junta de Andalucía', tipo: 'gobierno', ambito: 'autonómico', color_hex: '#1F4E8C' },
  { id: 4, nombre: 'CEOE', tipo: 'patronal', ambito: 'nacional', color_hex: '#0F766E' },
]
const FALLBACK_MENSAJES: Mensaje[] = [
  { id: 1, titulo: 'Mensaje del día — Vivienda', cuerpo: 'Foco en la nueva ley andaluza y datos de alquiler turístico. Contrastar con propuesta estatal.', tipo: 'mensaje', prioridad: 1, destinatarios: ['portavoces', 'redes sociales'], autor: 'Gabinete Comms', fecha_fin: '2026-05-09' },
  { id: 2, titulo: 'Crisis Canarias', cuerpo: 'Contención: derivar a Interior. Evitar caer en debate identitario. Mensaje: gestión + UE + recursos.', tipo: 'crisis', prioridad: 1, destinatarios: ['ministros', 'portavoces'], autor: 'Sala de Crisis', fecha_fin: '2026-05-12' },
  { id: 3, titulo: 'Talking points BCE', cuerpo: 'Ojo con expectativas tipos. No prometer fechas. Subrayar fortaleza fundamentals.', tipo: 'talking_points', prioridad: 2, destinatarios: ['economía'], autor: 'Asesoría Económica' },
  { id: 4, titulo: 'Mensaje sectorial — Sanidad', cuerpo: 'Listas de espera: datos + nueva financiación + comparación con autonómicos PP.', tipo: 'mensaje', prioridad: 2, destinatarios: ['portavoces sanidad'], autor: 'Gabinete Comms' },
  { id: 5, titulo: 'Tono parlamentario S20', cuerpo: 'Rebajar tensión. Marco: "estabilidad y diálogo". Evitar interpelaciones agresivas.', tipo: 'tono', prioridad: 3, destinatarios: ['grupo parlamentario'], autor: 'Portavocía' },
]
const FALLBACK_DECISIONES: Decision[] = [
  { id: 1, titulo: 'No comparecer en Antena 3 viernes', descripcion: 'Riesgo alto de marco hostil. Trasladar a SER lunes.', tipo: 'mediática', resultado: 'positivo', impacto_est: 'medio', lecciones: 'Filtrar oferta mediática por marco previsible.', etiquetas: ['comms', 'agenda'], fecha: '2026-04-30' },
  { id: 2, titulo: 'Sesión de control: respuesta corta a VOX', descripcion: 'Réplica de 30s sin entrar en provocación migración.', tipo: 'parlamentaria', resultado: 'positivo', impacto_est: 'alto', lecciones: 'Brevedad y datos > confrontación.', etiquetas: ['parlamento'], fecha: '2026-04-23' },
  { id: 3, titulo: 'Adelantar pacto financiación', descripcion: 'Anuncio antes del debate de la nación.', tipo: 'estratégica', resultado: 'pendiente', impacto_est: 'muy alto', lecciones: '—', etiquetas: ['agenda', 'territorial'], fecha: '2026-05-15' },
  { id: 4, titulo: 'Acto en Sevilla con Espadas', descripcion: 'Presencia conjunta para reforzar liderazgo regional.', tipo: 'territorio', resultado: 'neutral', impacto_est: 'bajo', lecciones: 'Movilización limitada de público.', etiquetas: ['territorio', 'andalucía'], fecha: '2026-04-12' },
]

const tipoStyle: Record<string, { c: string; bg: string }> = {
  mensaje: { c: '#1F4E8C', bg: 'rgba(31,78,140,0.10)' },
  crisis: { c: '#c42c2c', bg: 'rgba(196,44,44,0.12)' },
  talking_points: { c: '#5B21B6', bg: 'rgba(91,33,182,0.10)' },
  tono: { c: '#b25000', bg: 'rgba(178,80,0,0.10)' },
}
const resultStyle: Record<string, { c: string; bg: string }> = {
  positivo: { c: '#2d8a39', bg: 'rgba(45,138,57,0.12)' },
  negativo: { c: '#c42c2c', bg: 'rgba(196,44,44,0.12)' },
  neutral: { c: '#6e6e73', bg: 'rgba(110,110,115,0.10)' },
  pendiente: { c: '#b25000', bg: 'rgba(178,80,0,0.10)' },
}

export default function CampanaPanel() {
  const { data: cData } = useApi<Cliente[]>('/api/campana/clientes', { refreshInterval: 0 })
  const clientes = (Array.isArray(cData) && cData.length > 0) ? cData : FALLBACK_CLIENTES
  const [activeId, setActiveId] = useState<number>(clientes[0]?.id ?? 1)
  const [tab, setTab] = useState<'mensajes' | 'memoria'>('mensajes')

  const { data: mData } = useApi<Mensaje[]>(`/api/campana/clientes/${activeId}/mensajes?solo_activos=true`, { refreshInterval: 0 })
  const { data: dData } = useApi<Decision[]>(`/api/campana/clientes/${activeId}/decisiones`, { refreshInterval: 0 })
  const mensajes = (Array.isArray(mData) && mData.length > 0) ? mData : FALLBACK_MENSAJES
  const decisiones = (Array.isArray(dData) && dData.length > 0) ? dData : FALLBACK_DECISIONES

  const active = clientes.find(c => c.id === activeId) ?? clientes[0]

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Campaign room
          </p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaña — {active?.nombre}</h3>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {clientes.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)} style={{
              padding: '6px 14px', borderRadius: 999, border: `1px solid ${activeId === c.id ? c.color_hex ?? '#1d1d1f' : '#e8e8ed'}`,
              background: activeId === c.id ? `${c.color_hex ?? '#1d1d1f'}15` : '#fff',
              color: activeId === c.id ? c.color_hex ?? '#1d1d1f' : '#6e6e73',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{c.nombre}</button>
          ))}
        </div>
      </div>

      {/* Inner tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fafafc', borderRadius: 999, border: '1px solid #e8e8ed', width: 'fit-content', marginBottom: 16 }}>
        {([
          { v: 'mensajes' as const, l: `Mensajes del día (${mensajes.length})` },
          { v: 'memoria' as const, l: `Memoria estratégica (${decisiones.length})` },
        ]).map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none',
            background: tab === t.v ? '#1d1d1f' : 'transparent',
            color: tab === t.v ? '#fff' : '#6e6e73',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t.l}</button>
        ))}
      </div>

      {tab === 'mensajes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mensajes.map(m => {
            const ts = tipoStyle[m.tipo] ?? tipoStyle.mensaje
            const prioColor = m.prioridad === 1 ? '#c42c2c' : m.prioridad === 2 ? '#b25000' : '#1F4E8C'
            return (
              <div key={m.id} style={{ padding: '14px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: prioColor, flexShrink: 0 }} />
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{m.titulo}</h4>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: ts.bg, color: ts.c, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.tipo}</span>
                    {m.fecha_fin && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>vence {m.fecha_fin}</span>}
                  </div>
                  <button style={{
                    padding: '4px 10px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
                    fontSize: 10.5, fontWeight: 600, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
                  }}>Archivar</button>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#424245', lineHeight: 1.5 }}>{m.cuerpo}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(m.destinatarios ?? []).map(d => (
                    <span key={d} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.08)', color: '#1F4E8C', fontWeight: 500 }}>{d}</span>
                  ))}
                  {m.autor && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#6e6e73' }}>— {m.autor}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'memoria' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {decisiones.map(d => {
            const rs = resultStyle[d.resultado] ?? resultStyle.neutral
            return (
              <div key={d.id} style={{ padding: '14px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{d.titulo}</h4>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10, fontWeight: 600 }}>{d.tipo}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: rs.bg, color: rs.c, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.resultado}</span>
                      {d.impacto_est && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>impacto: <strong>{d.impacto_est}</strong></span>}
                      {d.fecha && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>{d.fecha}</span>}
                    </div>
                  </div>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#424245', lineHeight: 1.5 }}>{d.descripcion}</p>
                {d.lecciones && d.lecciones !== '—' && (
                  <div style={{ padding: '8px 12px', background: '#f5f9ff', border: '1px solid #cfe0f3', borderRadius: 8, fontSize: 11.5, color: '#1d1d1f', marginBottom: 8 }}>
                    <strong style={{ color: '#1F4E8C' }}>Lección:</strong> {d.lecciones}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(d.etiquetas ?? []).map(t => (
                    <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#fff', border: '1px solid #e8e8ed', color: '#6e6e73' }}>#{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
