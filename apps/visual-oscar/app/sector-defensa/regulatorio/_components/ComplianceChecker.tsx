'use client'

import { useState } from 'react'

type Step = 'form' | 'result'

const TECNOLOGIA_OPTS = [
  { value: 'propulsion',  label: 'Propulsión / Motores' },
  { value: 'avionica',    label: 'Aviónica / Radar AESA' },
  { value: 'misiles',     label: 'Misiles / Armamento' },
  { value: 'c2_software', label: 'C2 / Software seguro' },
  { value: 'cyber',       label: 'Ciberseguridad ofensiva' },
  { value: 'drones_uav',  label: 'Drones / UAS' },
  { value: 'semiconductores', label: 'Semiconductores avanzados' },
  { value: 'dual_use',    label: 'Bienes de doble uso (genérico)' },
]

const PAIS_OPTS = [
  { value: 'NATO',  label: 'País OTAN (Alemania, Francia, Polonia…)' },
  { value: 'US',    label: 'Estados Unidos' },
  { value: 'IN',    label: 'India' },
  { value: 'SA',    label: 'Arabia Saudí / EAU' },
  { value: 'TR',    label: 'Turquía' },
  { value: 'CN',    label: 'China' },
  { value: 'RU',    label: 'Rusia' },
  { value: 'IR',    label: 'Irán' },
  { value: 'KP',    label: 'Corea del Norte' },
]

interface Result {
  nivel: 0 | 1 | 2 | 3
  titulo: string
  descripcion: string
  requisitos: string[]
  advertencias: string[]
  pasos: string[]
}

function evaluate(tech: string, pais: string): Result {
  const embargados = ['RU', 'IR', 'KP', 'CN']
  const alto = ['misiles', 'cyber', 'propulsion', 'avionica']
  const isEmbargo = embargados.includes(pais)
  const isAltoRiesgo = alto.includes(tech)

  if (isEmbargo) return {
    nivel: 3,
    titulo: 'Exportación PROHIBIDA / Embargo total',
    descripcion: `La tecnología "${TECNOLOGIA_OPTS.find(t=>t.value===tech)?.label}" hacia "${PAIS_OPTS.find(p=>p.value===pais)?.label}" está sujeta a embargo total por OFAC/EU/ONU.`,
    requisitos: [],
    advertencias: [
      'Embargo total: OFAC (US), Reglamento EU 833/2014 (Rusia) / Resoluciones ONU',
      'Cualquier transacción directa o indirecta está prohibida',
      'Incluso asistencia técnica, formación o consultoría están restringidas',
      'Sanciones secundarias CAATSA aplicables a empresas españolas con actividad USD',
    ],
    pasos: [
      'No proceder con la operación bajo ningún concepto',
      'Documentar el rechazo y notificar a Cumplimiento',
      'Consultar a JIMDDU si existe alguna excepción humanitaria aplicable',
    ],
  }

  if (isAltoRiesgo) return {
    nivel: 2,
    titulo: 'Licencia especial / ITAR Part 121 obligatoria',
    descripcion: `Tecnología de alto riesgo ITAR/EAR. Se requiere licencia de exportación del Dpto. de Estado (ITAR) o BIS (EAR) más licencia nacional JIMDDU.`,
    requisitos: [
      'Licencia DSP-5 o MLA del Dpto. de Estado (ITAR) si hay contenido ITAR',
      'Licencia BIS Form-748P (EAR) si el artículo está en CCL',
      'Licencia de exportación JIMDDU (Ley 53/2007)',
      'End-User Certificate (EUC) del receptor final',
      'Programa de Control Interno de Exportaciones (ITAR ICP)',
    ],
    advertencias: [
      'Plazo típico de licencia ITAR: 45-90 días hábiles',
      'Verificar que la empresa receptora no está en Entity List BIS o OFAC SDN',
      'Restricciones de re-exportación a terceros países',
    ],
    pasos: [
      'Clasificar el artículo en USML (ITAR) o ECCN (EAR)',
      'Verificar receptor en OFAC SDN, Entity List BIS y EU FSF',
      'Solicitar TAA (Technical Assistance Agreement) si implica transferencia de datos técnicos',
      'Presentar solicitud DSP-5 ante DDTC o Form-748P ante BIS',
      'Solicitar licencia JIMDDU en paralelo',
      'Obtener EUC firmado por receptor',
    ],
  }

  return {
    nivel: 1,
    titulo: 'Licencia requerida · Revisión estándar',
    descripcion: 'La operación requiere licencia de exportación estándar. No hay embargo ni restricciones especiales ITAR/EAR para este tipo de tecnología y destino.',
    requisitos: [
      'Licencia de exportación JIMDDU (Ley 53/2007)',
      'Reg. EU 2021/821 si aplica doble uso',
      'EUC del receptor',
    ],
    advertencias: [
      'Verificar en EU Consolidated Sanctions List antes de proceder',
      'Comprobar si el producto tiene contenido ITAR que requiera notification',
    ],
    pasos: [
      'Clasificar el producto (USML / ECCN / EU ML)',
      'Verificar receptor en listas de sanciones',
      'Presentar solicitud a JIMDDU',
      'Obtener EUC',
    ],
  }
}

const NIVEL_STYLES: Record<number, { bg: string; border: string; color: string; icon: string }> = {
  0: { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', icon: '✓' },
  1: { bg: '#FFF9E6', border: '#FDE68A', color: '#D97706', icon: '!' },
  2: { bg: '#FFF1F2', border: '#FECACA', color: '#DC2626', icon: '!' },
  3: { bg: '#1F2937', border: '#374151', color: '#F87171', icon: '✕' },
}

export function ComplianceChecker() {
  const [tech, setTech]     = useState('')
  const [pais, setPais]     = useState('')
  const [step, setStep]     = useState<Step>('form')
  const [result, setResult] = useState<Result | null>(null)

  function check() {
    if (!tech || !pais) return
    setResult(evaluate(tech, pais))
    setStep('result')
  }

  if (step === 'result' && result) {
    const s = NIVEL_STYLES[result.nivel]
    return (
      <div style={{ width: '100%' }}>
        <button onClick={() => setStep('form')}
          style={{ marginBottom: 16, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1px solid #DDDDE3', background: '#fff', color: '#3a3a3d', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Nueva consulta
        </button>

        <div style={{ padding: '20px 24px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: s.color, margin: '0 0 8px' }}>{result.titulo}</h3>
          <p style={{ fontSize: 12.5, color: result.nivel === 3 ? '#D1D5DB' : '#6e6e73', margin: 0, lineHeight: 1.5 }}>{result.descripcion}</p>
        </div>

        {result.advertencias.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#DC2626', marginBottom: 8 }}>Advertencias</div>
            {result.advertencias.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: '#FFF1F2', borderRadius: 7, marginBottom: 5 }}>
                <span style={{ color: '#DC2626', flexShrink: 0 }}>!</span>
                <span style={{ fontSize: 12, color: '#6e6e73' }}>{a}</span>
              </div>
            ))}
          </div>
        )}

        {result.requisitos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#86868b', marginBottom: 8 }}>Documentación requerida</div>
            {result.requisitos.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: '#F5F5F7', borderRadius: 7, marginBottom: 5 }}>
                <span style={{ color: '#1F4E8C', flexShrink: 0, fontWeight: 700 }}>{i+1}</span>
                <span style={{ fontSize: 12, color: '#6e6e73' }}>{r}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#86868b', marginBottom: 8 }}>Pasos siguientes</div>
          {result.pasos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: '#EFF6FF', borderRadius: 7, marginBottom: 5 }}>
              <span style={{ color: '#1F4E8C', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>Paso {i+1}</span>
              <span style={{ fontSize: 12, color: '#6e6e73' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, margin: '0 0 20px' }}>
        Evaluar si una exportación de tecnología de defensa requiere licencia especial,
        está sujeta a ITAR/EAR o se encuentra bajo embargo.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#86868b', display: 'block', marginBottom: 6 }}>Tipo de tecnología</label>
        <select value={tech} onChange={e => setTech(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DDDDE3', fontSize: 12.5, fontFamily: 'inherit', background: '#FAFAFA', color: '#1d1d1f' }}>
          <option value="">Seleccionar tecnología…</option>
          {TECNOLOGIA_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#86868b', display: 'block', marginBottom: 6 }}>País de destino</label>
        <select value={pais} onChange={e => setPais(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DDDDE3', fontSize: 12.5, fontFamily: 'inherit', background: '#FAFAFA', color: '#1d1d1f' }}>
          <option value="">Seleccionar país destino…</option>
          {PAIS_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <button
        onClick={check}
        disabled={!tech || !pais}
        style={{
          width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          border: 'none', cursor: tech && pais ? 'pointer' : 'not-allowed',
          background: tech && pais ? '#1d1d1f' : '#DDDDE3',
          color: tech && pais ? '#fff' : '#86868b', fontFamily: 'inherit',
        }}
      >
        Evaluar compliance →
      </button>
    </div>
  )
}
