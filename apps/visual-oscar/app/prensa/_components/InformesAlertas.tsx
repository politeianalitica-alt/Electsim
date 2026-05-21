'use client'
/**
 * `<InformesAlertas />` · Tab 10 · Informes, alertas y dossiers.
 *
 * Monitores guardados (localStorage por ahora · futuro: DB cron) + dossier
 * builder + plantillas de alertas + export.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#475569'
const STORAGE_KEY = 'politeia.medios.monitors.v1'

interface Monitor {
  id: string
  query: string
  sourceGroups: string[]
  language: string
  from?: string
  createdAt: number
  lastChecked?: number
  alertThreshold?: number
}

export function InformesAlertas() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [newQuery, setNewQuery] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMonitors(JSON.parse(raw))
    } catch {}
  }, [])

  const save = (list: Monitor[]) => {
    setMonitors(list)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
  }

  const addMonitor = () => {
    if (!newQuery.trim()) return
    const m: Monitor = {
      id: Math.random().toString(36).slice(2, 10),
      query: newQuery.trim(),
      sourceGroups: [],
      language: 'es',
      createdAt: Date.now(),
    }
    save([m, ...monitors])
    setNewQuery('')
  }

  const removeMonitor = (id: string) => save(monitors.filter((m) => m.id !== id))

  const checkMonitor = async (m: Monitor) => {
    try {
      const r = await fetch('/api/medios/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: m.query, pageSize: 5, language: m.language }),
      })
      const d = await r.json()
      const updated = monitors.map((x) => x.id === m.id ? { ...x, lastChecked: Date.now() } : x)
      save(updated)
      window.dispatchEvent(new CustomEvent('politeia.monitor.checked', { detail: { id: m.id, results: d } }))
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          Informes, alertas y dossiers
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px', lineHeight: 1.5 }}>
          Crea monitores de temas/actores · revisa cuándo aparecen nuevos artículos · genera dossiers exportables.
          Almacenamiento <code>localStorage</code> por ahora · cron+webhook+email llegan en Sprint Medios-M6.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Nuevo monitor · ej: 'Marruecos Sáhara'"
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addMonitor() }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
          />
          <button
            onClick={addMonitor}
            disabled={!newQuery.trim()}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + Crear monitor
          </button>
        </div>
      </section>

      {monitors.length === 0 ? (
        <section style={{ padding: 24, background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            No tienes monitores guardados. Crea uno arriba o vuelve a Tab 2 y guarda búsquedas como monitor.
          </p>
        </section>
      ) : (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Mis monitores · {monitors.length} activos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {monitors.map((m) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>"{m.query}"</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>
                    creado {new Date(m.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.lastChecked && ` · revisado ${new Date(m.lastChecked).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <button
                  onClick={() => checkMonitor(m)}
                  style={{ background: '#fff', color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  ⟳ Revisar
                </button>
                <a
                  href={`/prensa?tab=busqueda&q=${encodeURIComponent(m.query)}`}
                  style={{ background: '#fff', color: '#0f766e', border: '1px solid #0f766e', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                >
                  Buscar →
                </a>
                <button
                  onClick={() => removeMonitor(m.id)}
                  style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Plantillas de alerta · próximamente
        </p>
        <ul style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, margin: '8px 0 0', paddingLeft: 20 }}>
          <li>Pico anómalo: una keyword se multiplica por 3x en 24h vs media 7d</li>
          <li>First mover de tema: alerta cuando un medio publica una primicia replicada después</li>
          <li>Cambio narrativo: el frame dominante cambia entre dos ventanas (24h vs 7d)</li>
          <li>Reputación crítica: actor X recibe sentimiento {'<'} -40% en una ventana</li>
          <li>Bulo detectado: fact-checker ES verifica con rating "falso"</li>
        </ul>
      </section>
    </div>
  )
}

export default InformesAlertas
