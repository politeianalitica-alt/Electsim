'use client'
/**
 * Briefing diario IA · síntesis ejecutiva automática.
 *
 * Genera un resumen narrativo + highlights + recomendaciones
 * a partir de los datos cargados en la pestaña Situación.
 */
import type { BriefingDiario } from '@/lib/defense/analisis-defensa'

export function DailyBriefingCard({ briefing }: { briefing: BriefingDiario }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: '#7C3AED', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ✦ BRIEFING IA · DEFENSA
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{briefing.fecha}</p>
        </div>
        <span style={{ fontSize: 9.5, color: '#6e6e73', padding: '4px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.08)', fontWeight: 600 }}>
          Síntesis automática
        </span>
      </div>

      {/* Resumen narrativo */}
      <div style={{ padding: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(124,58,237,0.01) 100%)', borderRadius: 10, borderLeft: '3px solid #7C3AED', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.55 }}>{briefing.resumen}</p>
      </div>

      {/* Highlights */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          HIGHLIGHTS · ÚLTIMAS 24H
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {briefing.highlights.map((h, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#1d1d1f', padding: '5px 0', borderBottom: i < briefing.highlights.length - 1 ? '1px dashed #ECECEF' : 'none' }}>
              <span style={{ color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>{h.icono}</span>
              <span>{h.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recomendaciones */}
      {briefing.recomendaciones.length > 0 && (
        <div style={{ marginBottom: 10, padding: 10, background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ◉ RECOMENDACIONES ESTRATÉGICAS
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5 }}>
            {briefing.recomendaciones.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Fuentes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {briefing.fuentes.map(f => (
          <span key={f} style={{ fontSize: 9, color: '#6e6e73', padding: '2px 7px', borderRadius: 4, background: '#F5F5F7', fontWeight: 600 }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
