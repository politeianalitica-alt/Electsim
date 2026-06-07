'use client'
/**
 * <ImpactoLecturaAnalista /> · Turismo v3 · Sprint T9 · Impacto económico
 *
 * Lectura corta para el analista (1-2 líneas) sobre la DEPENDENCIA económica del
 * turismo y sus riesgos estructurales: estacionalidad y concentración de
 * mercados emisores. Ancla la cifra de %PIB en vivo cuando está disponible
 * (envelope de /api/turismo/impacto-economico); si no, una redacción honesta
 * sin número inventado.
 *
 * No es un LLM ni una previsión: es contexto cualitativo curado. Cero emojis.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#0EA5E9'

interface ImpactoData {
  pib_turistico_pct: number | null
  empleo_horeca: number | null
}
interface ImpactoEnvelope {
  ok: boolean
  data: (ImpactoData & Record<string, unknown>) | null
}

export function ImpactoLecturaAnalista() {
  const [pib, setPib] = useState<number | null>(null)
  const [horeca, setHoreca] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/turismo/impacto-economico', { cache: 'no-store' })
      .then((r) => r.json() as Promise<ImpactoEnvelope>)
      .then((j) => {
        if (!alive || !j?.ok || !j.data) return
        setPib(typeof j.data.pib_turistico_pct === 'number' ? j.data.pib_turistico_pct : null)
        setHoreca(typeof j.data.empleo_horeca === 'number' ? j.data.empleo_horeca : null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const pesoFrase =
    pib != null
      ? `Con el turismo aportando ~${pib.toLocaleString('es-ES', { maximumFractionDigits: 1 })}% del PIB${horeca != null ? ` y ~${Math.round(horeca / 1000).toLocaleString('es-ES')}M de empleos en hostelería` : ''}, España está entre las economías avanzadas más expuestas al ciclo turístico.`
      : 'España está entre las economías avanzadas con mayor peso del turismo en el PIB y el empleo, lo que la hace especialmente sensible al ciclo turístico.'

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '16px 20px',
        borderLeft: `4px solid ${ACCENT}`,
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: ACCENT,
        }}
      >
        <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
        Lectura para el analista
      </p>
      <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.6 }}>
        {pesoFrase} Los dos riesgos estructurales son la <strong>estacionalidad</strong> —la demanda se concentra en
        verano, tensiona empleo e infraestructura y deja capacidad ociosa el resto del año— y la{' '}
        <strong>concentración de mercados emisores</strong>: un puñado de países (Reino Unido, Alemania, Francia)
        explica buena parte de las llegadas, por lo que un shock en cualquiera de ellos (recesión, divisa, conectividad)
        se traslada de forma directa a la economía española.
      </p>
    </section>
  )
}

export default ImpactoLecturaAnalista
