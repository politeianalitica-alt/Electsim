'use client'
/**
 * <CtxLecturaAnalista /> · Tercer Sector v3 · Sprint TS8 · Contexto e impacto
 *
 * Lectura corta para el analista sobre la DEPENDENCIA estructural del tercer
 * sector de la financiación pública y sus riesgos: estacionalidad de las
 * subvenciones (calendario de convocatorias / pagos) y concentración (pocos
 * financiadores y pocas entidades grandes). Ancla la cifra de gasto en protección
 * social en vivo (% PIB) cuando está disponible vía el endpoint EXISTENTE de
 * Eurostat; si no, una redacción honesta sin número inventado.
 *
 * No es un LLM ni una previsión: es contexto cualitativo curado. Cero emojis.
 */
import { useEffect, useState } from 'react'
import { fetchLatest } from './CtxEurostat'

const ACCENT = '#16A34A'

export function CtxLecturaAnalista() {
  const [gastoPct, setGastoPct] = useState<number | null>(null)
  const [period, setPeriod] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchLatest(
      'gov_10a_exp',
      { cofog99: 'GF10', sector: 'S13', na_item: 'TE', unit: 'PC_GDP', geo: 'ES' },
      ctrl.signal,
    ).then((r) => {
      if (ctrl.signal.aborted || !r) return
      setGastoPct(r.value)
      setPeriod(r.period)
    })
    return () => ctrl.abort()
  }, [])

  const ancla =
    gastoPct != null
      ? `Con un gasto público en protección social de ~${gastoPct.toLocaleString('es-ES', { maximumFractionDigits: 1 })}% del PIB${period ? ` (${period})` : ''}, el tercer sector de acción social opera mayoritariamente como brazo ejecutor concertado del Estado del bienestar: una parte sustancial de sus ingresos procede de subvenciones, convenios y conciertos con las administraciones.`
      : 'El tercer sector de acción social opera mayoritariamente como brazo ejecutor concertado del Estado del bienestar: una parte sustancial de sus ingresos procede de subvenciones, convenios y conciertos con las administraciones.'

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
        {ancla} Esa <strong>dependencia de la financiación pública</strong> concentra tres riesgos que conviene vigilar:
      </p>
      <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.6 }}>
        <li style={{ marginBottom: 6 }}>
          <strong>Estacionalidad de las subvenciones.</strong> Las convocatorias se concentran en ventanas concretas del
          año y el pago llega con retraso respecto a la ejecución, lo que tensiona la tesorería de entidades con poco
          colchón y obliga a financiación puente. El calendario de convocatorias vive en la pestaña «Financiación».
        </li>
        <li style={{ marginBottom: 6 }}>
          <strong>Concentración de financiadores.</strong> Pocos programas (BDNS estatal/autonómica, IRPF 0,7%, fondos
          UE) explican buena parte de los ingresos; un cambio de prioridades políticas o presupuestarias se traslada de
          forma directa al sector.
        </li>
        <li>
          <strong>Concentración de tamaño.</strong> Un puñado de entidades cumbre capta una proporción elevada de los
          recursos, mientras la mayoría del tejido son organizaciones pequeñas más vulnerables a cualquier shock de
          financiación.
        </li>
      </ul>
      <p style={{ margin: '10px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        Lectura cualitativa curada (no es una previsión). La cifra de % PIB se ancla en vivo desde Eurostat gov_10a_exp
        (COFOG GF10) cuando está disponible; el resto es contexto estructural, no datos inventados.
      </p>
    </section>
  )
}

export default CtxLecturaAnalista
