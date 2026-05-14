'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sourcesApi } from '@/lib/domo/api-client'
import { CONNECTOR_CATEGORIES, CONNECTOR_ICONS, CONNECTOR_LABELS } from '@/lib/domo/constants'
import type { ConnectorType, ScheduleFrequency, DataSource } from '@/types/domo'
import ConnectorConfigForm from './ConnectorConfigForm'
import styles from './NuevaFuenteDrawer.module.css'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

type Step = 'type' | 'config' | 'test' | 'schedule' | 'confirm'

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'type',     label: 'Tipo' },
  { id: 'config',   label: 'Configuración' },
  { id: 'test',     label: 'Test' },
  { id: 'schedule', label: 'Frecuencia' },
  { id: 'confirm',  label: 'Confirmar' },
]

const SCHEDULES: Array<{ value: ScheduleFrequency; label: string; desc: string }> = [
  { value: 'realtime',    label: 'Tiempo real',  desc: 'Streaming continuo (WebSocket / Polling 5s)' },
  { value: 'every_5min',  label: 'Cada 5 min',   desc: 'Alta frecuencia para datos críticos' },
  { value: 'every_15min', label: 'Cada 15 min',  desc: 'Balance frecuencia / coste' },
  { value: 'hourly',      label: 'Cada hora',    desc: 'Para datos que cambian poco' },
  { value: 'daily',       label: 'Diario',       desc: 'Sincronización nocturna' },
  { value: 'weekly',      label: 'Semanal',      desc: 'Datos de baja frecuencia' },
  { value: 'manual',      label: 'Manual',       desc: 'Solo cuando se dispare manualmente' },
]

export default function NuevaFuenteDrawer({ onClose, onSuccess }: Props) {
  const [step,         setStep]         = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null)
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [config,       setConfig]       = useState<Record<string, string>>({})
  const [schedule,     setSchedule]     = useState<ScheduleFrequency>('hourly')
  const [testResult,   setTestResult]   = useState<{ ok: boolean; message: string } | null>(null)
  const [testLoading,  setTestLoading]  = useState(false)

  const createMutation = useMutation({
    mutationFn: (data: Partial<DataSource>) => sourcesApi.create(data),
    onSuccess:  () => onSuccess(),
  })

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

  async function handleTest() {
    if (!selectedType) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await sourcesApi.testConnection({
        type:   selectedType,
        config,
        name,
      })
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, message: 'Error al conectar con el servidor' })
    } finally {
      setTestLoading(false)
    }
  }

  function handleCreate() {
    if (!selectedType) return
    createMutation.mutate({
      name,
      description,
      type:     selectedType,
      config,
      schedule,
      status:   'idle',
    })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>Nueva conexión de datos</h2>
            <p className={styles.drawerSubtitle}>
              Paso {currentStepIndex + 1} de {STEPS.length} — {STEPS[currentStepIndex].label}
            </p>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Cerrar">×</button>
        </div>

        <div className={styles.stepProgress}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.stepDot} ${
                i < currentStepIndex ? styles.stepDone :
                i === currentStepIndex ? styles.stepActive : ''
              }`}
            >
              <span className={styles.stepNum}>{i < currentStepIndex ? '✓' : i + 1}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.drawerBody}>

          {step === 'type' && (
            <div>
              <p className={styles.stepHint}>Selecciona el tipo de fuente que quieres conectar</p>
              {Object.entries(CONNECTOR_CATEGORIES).map(([cat, types]) => (
                <div key={cat} className={styles.connectorCategory}>
                  <h4 className={styles.categoryLabel}>{cat}</h4>
                  <div className={styles.connectorGrid}>
                    {types.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`${styles.connectorOption} ${selectedType === t ? styles.connectorSelected : ''}`}
                      >
                        <span className={styles.connectorOptionIcon}>{CONNECTOR_ICONS[t]}</span>
                        <span className={styles.connectorOptionLabel}>{CONNECTOR_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 'config' && selectedType && (
            <div>
              <p className={styles.stepHint}>
                Configura los parámetros de conexión para{' '}
                <strong>{CONNECTOR_LABELS[selectedType]}</strong>
              </p>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre de la fuente *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={`Ej: ${CONNECTOR_LABELS[selectedType]} Producción`}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción (opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe brevemente esta fuente…"
                  className={styles.input}
                />
              </div>
              <ConnectorConfigForm
                type={selectedType}
                config={config}
                onChange={setConfig}
              />
            </div>
          )}

          {step === 'test' && selectedType && (
            <div className={styles.testStep}>
              <p className={styles.stepHint}>
                Verifica que la configuración es correcta antes de guardar
              </p>
              <div className={styles.testBox}>
                <div className={styles.testInfo}>
                  <span className={styles.testIcon}>{CONNECTOR_ICONS[selectedType]}</span>
                  <div>
                    <strong>{name || '(sin nombre)'}</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted,#6b7280)' }}>
                      {CONNECTOR_LABELS[selectedType]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTest}
                  disabled={testLoading}
                  className={styles.btnTest}
                >
                  {testLoading ? '⟳ Probando…' : '▶ Probar conexión'}
                </button>
              </div>

              {testResult && (
                <div
                  className={styles.testResult}
                  style={{
                    borderColor: testResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    background:  testResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{testResult.ok ? '✓' : '✗'}</span>
                  <span style={{
                    color:      testResult.ok ? 'var(--color-success,#22c55e)' : 'var(--color-danger,#ef4444)',
                    fontWeight: 600,
                    fontSize:   '0.875rem',
                  }}>
                    {testResult.message}
                  </span>
                </div>
              )}

              {!testResult && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted,#6b7280)', textAlign: 'center', marginTop: '1rem' }}>
                  Pulsa "Probar conexión" para verificar el acceso
                </p>
              )}
            </div>
          )}

          {step === 'schedule' && (
            <div>
              <p className={styles.stepHint}>¿Con qué frecuencia debe sincronizarse esta fuente?</p>
              <div className={styles.scheduleGrid}>
                {SCHEDULES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSchedule(s.value)}
                    className={`${styles.scheduleOption} ${schedule === s.value ? styles.scheduleSelected : ''}`}
                  >
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'confirm' && selectedType && (
            <div className={styles.confirmStep}>
              <div className={styles.confirmIcon}>{CONNECTOR_ICONS[selectedType]}</div>
              <h3 className={styles.confirmTitle}>{name}</h3>
              <div className={styles.confirmDetails}>
                <div className={styles.confirmRow}>
                  <span>Tipo</span>
                  <strong>{CONNECTOR_LABELS[selectedType]}</strong>
                </div>
                {description && (
                  <div className={styles.confirmRow}>
                    <span>Descripción</span>
                    <strong>{description}</strong>
                  </div>
                )}
                <div className={styles.confirmRow}>
                  <span>Frecuencia</span>
                  <strong>{SCHEDULES.find(s => s.value === schedule)?.label}</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Estado inicial</span>
                  <strong style={{ color: 'var(--color-muted,#6b7280)' }}>Inactivo (se activará tras guardar)</strong>
                </div>
              </div>

              {createMutation.isError && (
                <div className={styles.errorMsg}>
                  Error al crear la fuente. Verifica la configuración e inténtalo de nuevo.
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          {currentStepIndex > 0 && (
            <button
              onClick={() => setStep(STEPS[currentStepIndex - 1].id)}
              className={styles.btnBack}
            >
              ← Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />

          {step !== 'confirm' && (
            <button
              onClick={() => setStep(STEPS[currentStepIndex + 1].id)}
              disabled={
                (step === 'type'   && !selectedType) ||
                (step === 'config' && !name.trim())
              }
              className={styles.btnNext}
            >
              Siguiente →
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className={styles.btnCreate}
            >
              {createMutation.isPending ? '⟳ Creando…' : '✓ Crear conexión'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
