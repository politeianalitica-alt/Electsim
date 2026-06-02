'use client'
/**
 * <SupplyRiskGauge /> · Sprint Energía S4
 *
 * Semáforo de seguridad de suministro energético (spec §3.1 · 5 dimensiones).
 * Cada dimensión se clasifica en bajo / medio / alto / crítico con color y se
 * representa como barra horizontal (patrón legible para mezclar dimensiones con
 * dato real y dimensiones aún pendientes de datos de sprints posteriores).
 *
 * Dimensiones:
 *   1. Dependencia importación energética ES · REAL
 *        Dato estructural documentado (Eurostat · dependencia energética
 *        exterior ES ~70%+). Es un hecho estático citado, no un valor sintético.
 *   2. Almacenamiento gas Europa (% lleno) · PENDIENTE S8 (cliente GIE AGSI)
 *   3. Margen de capacidad eléctrica · PENDIENTE (capacidad firme vs punta)
 *   4. Diversificación geográfica del gas · PENDIENTE S8 (orígenes importación)
 *   5. Exposición a precios · REAL (calculado del spot OMIE en vivo · ESIOS 600)
 *
 * Las dimensiones pendientes se muestran explícitamente como "pendiente Sx"
 * (CLAUDE.md · nunca datos inventados). Cero emojis (Unicode ◆ ◉ ⬡).
 */
import { useEffect, useState } from 'react'

type Banda = 'bajo' | 'medio' | 'alto' | 'crítico' | 'pendiente'

const BANDA_COLOR: Record<Banda, string> = {
  bajo: '#16A34A',
  medio: '#F59E0B',
  alto: '#F97316',
  crítico: '#DC2626',
  pendiente: '#C0C0C5',
}
const BANDA_BG: Record<Banda, string> = {
  bajo: '#16A34A15',
  medio: '#F59E0B18',
  alto: '#F9731618',
  crítico: '#DC262615',
  pendiente: '#F4F4F6',
}

interface Dimension {
  nombre: string
  /** 0..100 · null cuando la dimensión está pendiente de datos. */
  nivel: number | null
  banda: Banda
  /** Texto corto que explica el valor o el motivo de estar pendiente. */
  detalle: string
  /** Fuente/sprint que cubrirá la dimensión. */
  fuente: string
}

// ── Clasificación de exposición a precios desde el spot OMIE en vivo ──────────
// Bandas €/MWh basadas en la experiencia del mercado MIBEL: <60 holgado,
// 60-100 normal, 100-180 tensión, >180 crisis (referencia 2021-2022).
function bandaSpot(spot: number): { nivel: number; banda: Banda; detalle: string } {
  if (spot < 60) return { nivel: 25, banda: 'bajo', detalle: `Spot OMIE ${spot.toFixed(0)} €/MWh · holgado` }
  if (spot < 100) return { nivel: 50, banda: 'medio', detalle: `Spot OMIE ${spot.toFixed(0)} €/MWh · normal` }
  if (spot < 180) return { nivel: 75, banda: 'alto', detalle: `Spot OMIE ${spot.toFixed(0)} €/MWh · tensión` }
  return { nivel: 92, banda: 'crítico', detalle: `Spot OMIE ${spot.toFixed(0)} €/MWh · crisis de precios` }
}

interface EsiosIndicator {
  latest: { value: number; datetime: string } | null
}
interface EsiosSnapshotResp {
  indicators: Record<string, EsiosIndicator>
}

export default function SupplyRiskGauge() {
  const [spot, setSpot] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/snapshot', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EsiosSnapshotResp>) : null))
      .then((j) => {
        if (!alive) return
        setSpot(j?.indicators?.mercado_spot?.latest?.value ?? null)
        setLoaded(true)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  // Dimensión 1 · dependencia importación (estructural, documentada)
  const dependencia: Dimension = {
    nombre: 'Dependencia de importación energética',
    nivel: 73,
    banda: 'alto',
    detalle: 'España importa ~70% de su energía primaria · alta dependencia exterior',
    fuente: 'Eurostat · dependencia energética (dato estructural)',
  }

  // Dimensión 5 · exposición a precios (real, desde spot en vivo)
  const exposicion: Dimension = spot != null
    ? { nombre: 'Exposición a precios de mercado', ...bandaSpot(spot), fuente: 'ESIOS · spot OMIE en vivo' }
    : {
        nombre: 'Exposición a precios de mercado',
        nivel: null,
        banda: 'pendiente',
        detalle: loaded ? 'Spot OMIE no disponible ahora (sin ESIOS_API_KEY)' : 'Cargando spot OMIE…',
        fuente: 'ESIOS · spot OMIE en vivo',
      }

  const dims: Dimension[] = [
    dependencia,
    {
      nombre: 'Almacenamiento de gas en Europa',
      nivel: null,
      banda: 'pendiente',
      detalle: 'Nivel de llenado de almacenamiento UE/ES · requiere cliente GIE AGSI',
      fuente: 'pendiente S8 · GIE AGSI+',
    },
    {
      nombre: 'Margen de capacidad eléctrica',
      nivel: null,
      banda: 'pendiente',
      detalle: 'Capacidad firme disponible frente a la punta de demanda',
      fuente: 'pendiente · capacidad firme REE/ENTSO-E',
    },
    {
      nombre: 'Diversificación geográfica del gas',
      nivel: null,
      banda: 'pendiente',
      detalle: 'Concentración de orígenes del gas importado (Argelia, GNL US…)',
      fuente: 'pendiente S8 · orígenes de importación',
    },
    exposicion,
  ]

  // Nivel global de las dimensiones con dato real (las pendientes no puntúan).
  const reales = dims.filter((d) => d.nivel != null) as Array<Dimension & { nivel: number }>
  const global = reales.length ? Math.round(reales.reduce((s, d) => s + d.nivel, 0) / reales.length) : null
  const globalBanda: Banda =
    global == null ? 'pendiente' : global >= 80 ? 'crítico' : global >= 65 ? 'alto' : global >= 45 ? 'medio' : 'bajo'

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: '-0.013em',
              color: '#1d1d1f',
            }}
          >
            Semáforo de seguridad de suministro
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            5 dimensiones · {reales.length} con dato en vivo · {dims.length - reales.length} pendientes de sprints
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              color: '#86868b',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Riesgo agregado
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: BANDA_COLOR[globalBanda],
            }}
          >
            {global == null ? '—' : `${global}/100`}
            <span style={{ fontSize: 11, color: '#6e6e73', marginLeft: 6, textTransform: 'capitalize' }}>
              {globalBanda !== 'pendiente' ? globalBanda : ''}
            </span>
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dims.map((d) => (
          <div key={d.nombre}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{d.nombre}</span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: BANDA_COLOR[d.banda],
                  background: BANDA_BG[d.banda],
                  padding: '2px 8px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                {d.banda === 'pendiente' ? 'pendiente' : `${d.banda} · ${d.nivel}`}
              </span>
            </div>
            <div
              style={{
                height: 7,
                background: '#F5F5F7',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: d.nivel == null ? '100%' : `${d.nivel}%`,
                  height: '100%',
                  background:
                    d.nivel == null
                      ? 'repeating-linear-gradient(90deg, #ECECEF 0 6px, #F5F5F7 6px 12px)'
                      : BANDA_COLOR[d.banda],
                  transition: 'width 200ms ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 10.5, color: '#6e6e73', lineHeight: 1.4 }}>{d.detalle}</span>
              <span style={{ fontSize: 9.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{d.fuente}</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#9CA3AF', lineHeight: 1.5 }}>
        El riesgo agregado solo pondera las dimensiones con dato en vivo. Las dimensiones de gas
        (almacenamiento, diversificación) se activan en S8 con el cliente GIE AGSI; el margen de
        capacidad requiere la serie de capacidad firme.
      </p>
    </section>
  )
}
