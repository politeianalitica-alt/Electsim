'use client'
/**
 * <H2LcohModel /> · Vista Hidrógeno · Sprint Energía E8
 *
 * Modelo TRANSPARENTE del coste nivelado del hidrógeno verde (LCOH) a partir del
 * PRECIO DE ELECTRICIDAD EN VIVO de la plataforma. Fuente del precio: el mismo
 * endpoint REE que ya usa el resto de Energía,
 *   `GET /api/sectores/energia/precio?days=2`  (REE · precios-mercados-tiempo-real),
 * que devuelve series PVPC + spot (mercado diario). Tomamos el SPOT (mercado
 * mayorista) como coste de la electricidad de entrada al electrolizador, porque
 * un proyecto de H2 a escala compra en mercado / PPA, no a PVPC doméstico; se
 * muestran ambos y se permite elegir. Si el endpoint degrada, se usa un precio
 * por defecto declarado y se marca claramente que NO es live.
 *
 * Fórmula (declarada y visible en la UI):
 *   LCOH [€/kg] = consumo_elec[kWh/kg] · precio_elec[€/kWh]            (electricidad)
 *               + (CAPEX[€/kW] · CRF) / (8760 · FC · kg_por_kW_año)    (CAPEX anualizado)
 *               + OPEX_fijo                                            (O&M, agua, etc.)
 * con CRF (factor de recuperación de capital) = i(1+i)^n / ((1+i)^n − 1).
 * Producción anual por kW de electrolizador = 8760·FC / consumo_elec (kg/kW·año).
 *
 * Supuestos ESTÁNDAR (declarados; rango sectorial IRENA/IEA/Hydrogen Council):
 *   - consumo eléctrico: ~52,5 kWh/kg (rango típico 50–55 kWh/kg en PEM/alcalino)
 *   - CAPEX electrolizador instalado: ~1.200 €/kW
 *   - factor de carga: 50 % (acoplado a renovable + red)
 *   - vida útil: 20 años · WACC: 8 %
 *   - OPEX fijo: 0,30 €/kg (O&M, agua desmineralizada, etc.)
 * Se muestra una SENSIBILIDAD del LCOH al precio eléctrico (curva + tabla) y se
 * desglosa la contribución de cada término al precio live.
 *
 * Pura presentación + un fetch read-only. NO toca lib/api/shared/catalog/types.
 * Cero emojis · Unicode geométrico (◆ ⬢ ⟶ ⇡ ⇣).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const H2 = '#0D9488'
const H2_DARK = '#115E59'

// ── Supuestos estándar del modelo (declarados; editables abajo) ─────────────
const ASSUMPTIONS = {
  consumo_kwh_kg: 52.5, // kWh de electricidad por kg de H2 (PEM/alcalino, BoL)
  capex_eur_kw: 1200, // CAPEX instalado del electrolizador (€/kW)
  factor_carga: 0.5, // horas equivalentes / 8760
  vida_util_anios: 20, // vida económica del activo
  wacc: 0.08, // coste medio ponderado del capital
  opex_eur_kg: 0.3, // OPEX fijo (O&M + agua + balance de planta)
}
const HOURS_YEAR = 8760

// Precio eléctrico por defecto si el endpoint degrada (NO live · declarado).
const FALLBACK_PRICE_EUR_MWH = 80

// ── Respuesta del endpoint de precio (espejo local · no se importa lib) ──────
interface PrecioSerie {
  title: string
  color?: string
  last_value?: number
  last_datetime?: string
  avg?: number
  max?: number
  min?: number
}
interface PrecioResponse {
  series?: PrecioSerie[]
  days?: number
  fuente?: string
  error?: string
}

type PriceBasis = 'spot' | 'pvpc'

// ── Helpers PUROS del modelo (testeable a ojo · declarados) ─────────────────
/** Factor de recuperación de capital (CRF). */
export function crf(wacc: number, anios: number): number {
  if (wacc <= 0) return 1 / anios
  const f = Math.pow(1 + wacc, anios)
  return (wacc * f) / (f - 1)
}

/** kg de H2 producidos por kW de electrolizador y año. */
export function kgPorKwAnio(consumoKwhKg: number, factorCarga: number): number {
  return (HOURS_YEAR * factorCarga) / consumoKwhKg
}

interface LcohBreakdown {
  electricidad: number // €/kg
  capex: number // €/kg
  opex: number // €/kg
  total: number // €/kg
}

/** Calcula el LCOH y su desglose para un precio eléctrico dado (€/MWh). */
export function computeLcoh(precioEurMwh: number, a = ASSUMPTIONS): LcohBreakdown {
  const precioEurKwh = precioEurMwh / 1000
  const electricidad = a.consumo_kwh_kg * precioEurKwh
  const annualCapexPerKw = a.capex_eur_kw * crf(a.wacc, a.vida_util_anios)
  const prod = kgPorKwAnio(a.consumo_kwh_kg, a.factor_carga)
  const capex = prod > 0 ? annualCapexPerKw / prod : 0
  const opex = a.opex_eur_kg
  return { electricidad, capex, opex, total: electricidad + capex + opex }
}

export function H2LcohModel() {
  const [series, setSeries] = useState<PrecioSerie[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [basis, setBasis] = useState<PriceBasis>('spot')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/api/sectores/energia/precio?days=2', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: PrecioResponse | null) => {
        if (!alive) return
        if (j?.series && j.series.length > 0) {
          setSeries(j.series)
          setErr(null)
        } else {
          setSeries(null)
          setErr(j?.error ?? 'sin datos')
        }
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Localiza la serie spot (mercado) y la PVPC dentro de la respuesta REE.
  const spotSerie = useMemo(() => findSerie(series, ['spot', 'mercado', 'diario', 'omie']), [series])
  const pvpcSerie = useMemo(() => findSerie(series, ['pvpc', 'pcb', 'voluntario']), [series])

  const chosen = basis === 'spot' ? spotSerie ?? pvpcSerie : pvpcSerie ?? spotSerie
  const liveAvail = Boolean(chosen?.last_value != null || chosen?.avg != null)
  // Preferimos la media de las últimas 24-48h (más estable que el último punto).
  const priceEurMwh = liveAvail
    ? (chosen?.avg ?? chosen?.last_value)!
    : FALLBACK_PRICE_EUR_MWH

  const lcoh = useMemo(() => computeLcoh(priceEurMwh), [priceEurMwh])

  // Sensibilidad: barrido del precio eléctrico (€/MWh) → LCOH.
  const sweep = useMemo(() => {
    const points = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
    return points.map((p) => ({ price: p, lcoh: computeLcoh(p).total }))
  }, [])

  const prod = kgPorKwAnio(ASSUMPTIONS.consumo_kwh_kg, ASSUMPTIONS.factor_carga)
  const crfVal = crf(ASSUMPTIONS.wacc, ASSUMPTIONS.vida_util_anios)

  return (
    <Panel
      title="Modelo de coste de producción · LCOH del hidrógeno verde"
      subtitle="Coste nivelado del H2 verde a partir del precio eléctrico en vivo (REE) + supuestos estándar declarados · sensibilidad al precio de la luz"
      marginBottom
      sourceUrl="https://www.ree.es/es/apidatos"
      sourceTooltip="Precio eléctrico: REE · precios-mercados-tiempo-real (PVPC + mercado spot). CAPEX/consumo: rangos sectoriales IRENA / IEA / Hydrogen Council."
    >
      {/* Selector de base de precio + estado de frescura */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', gap: 4, background: '#F1F5F9', borderRadius: 999, padding: 3 }}>
          {(['spot', 'pvpc'] as PriceBasis[]).map((b) => {
            const on = basis === b
            const has = b === 'spot' ? Boolean(spotSerie) : Boolean(pvpcSerie)
            return (
              <button
                key={b}
                onClick={() => setBasis(b)}
                disabled={!has}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: has ? 'pointer' : 'not-allowed',
                  background: on ? H2 : 'transparent',
                  color: on ? '#fff' : has ? '#475569' : '#CBD5E1',
                }}
              >
                {b === 'spot' ? 'Mercado spot' : 'PVPC'}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 10.5, color: liveAvail ? '#16A34A' : '#B45309', fontWeight: 600 }}>
          {loading
            ? 'Cargando precio eléctrico…'
            : liveAvail
              ? `Precio eléctrico en vivo: ${priceEurMwh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} €/MWh · REE${chosen?.last_datetime ? ` · ${chosen.last_datetime.slice(0, 16).replace('T', ' ')}` : ''}`
              : `Sin precio live (${err ?? 'degradado'}) · usando ${FALLBACK_PRICE_EUR_MWH} €/MWh por defecto (NO live)`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 16 }}>
        {/* ── LCOH resultante + desglose ── */}
        <div style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)', border: '1px solid #99F6E4', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0F766E' }}>
            LCOH estimado (al precio actual)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', color: H2_DARK }}>
              {lcoh.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: 15, color: '#0F766E', fontWeight: 700 }}>€/kg</span>
          </div>
          <p style={{ margin: '4px 0 14px', fontSize: 10.5, color: '#0F766E' }}>
            H2 verde · base {basis === 'spot' ? 'mercado spot' : 'PVPC'} {liveAvail ? '(en vivo)' : '(por defecto)'}
          </p>

          {/* Barras de contribución */}
          <Contribution label="Electricidad" value={lcoh.electricidad} total={lcoh.total} color="#0EA5E9" />
          <Contribution label="CAPEX anualizado" value={lcoh.capex} total={lcoh.total} color="#8B5CF6" />
          <Contribution label="OPEX fijo" value={lcoh.opex} total={lcoh.total} color="#F59E0B" />

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #99F6E4', fontSize: 10, color: '#0F766E', lineHeight: 1.5 }}>
            <span aria-hidden="true">◆</span> La electricidad pesa{' '}
            <strong>{lcoh.total > 0 ? Math.round((lcoh.electricidad / lcoh.total) * 100) : 0}%</strong> del LCOH a este precio:
            el coste de la luz es la palanca dominante del hidrógeno verde.
          </div>
        </div>

        {/* ── Sensibilidad: curva LCOH vs precio eléctrico ── */}
        <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>
            Sensibilidad del LCOH al precio eléctrico
          </div>
          <SensitivityCurve sweep={sweep} live={liveAvail ? priceEurMwh : null} liveLcoh={lcoh.total} />
          <SensitivityTable sweep={sweep} live={liveAvail ? priceEurMwh : null} />
        </div>
      </div>

      {/* ── Supuestos + fórmula declarados ── */}
      <div style={{ marginTop: 14, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 8 }}>
          Supuestos del modelo (declarados · rangos sectoriales IRENA / IEA / Hydrogen Council)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          <Assumption label="Consumo eléctrico" value={`${ASSUMPTIONS.consumo_kwh_kg} kWh/kg`} note="rango 50–55" />
          <Assumption label="CAPEX electrolizador" value={`${ASSUMPTIONS.capex_eur_kw.toLocaleString('es-ES')} €/kW`} note="instalado" />
          <Assumption label="Factor de carga" value={`${Math.round(ASSUMPTIONS.factor_carga * 100)} %`} note={`${Math.round(HOURS_YEAR * ASSUMPTIONS.factor_carga).toLocaleString('es-ES')} h/año`} />
          <Assumption label="Vida útil" value={`${ASSUMPTIONS.vida_util_anios} años`} note={`WACC ${Math.round(ASSUMPTIONS.wacc * 100)} %`} />
          <Assumption label="OPEX fijo" value={`${ASSUMPTIONS.opex_eur_kg.toFixed(2)} €/kg`} note="O&M + agua" />
          <Assumption label="Producción" value={`${prod.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg/kW·año`} note={`CRF ${(crfVal * 100).toFixed(1)} %`} />
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 10, color: '#86868b', lineHeight: 1.55, fontFamily: 'var(--font-mono, monospace)' }}>
          LCOH = consumo·precio_luz + (CAPEX·CRF)/(8760·FC/consumo) + OPEX ·
          CRF = i(1+i)ⁿ / ((1+i)ⁿ−1)
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
          Modelo simplificado y transparente con fines de orientación: ignora degradación del stack,
          coste de reposición, compresión/almacenamiento y subvenciones (p. ej. la prima del European
          Hydrogen Bank reduciría el coste neto). El precio eléctrico es el de REE
          (precios-mercados-tiempo-real); un proyecto real compraría vía PPA/mercado, no a PVPC doméstico.
        </p>
      </div>
    </Panel>
  )
}

export default H2LcohModel

// ── Sub-piezas de presentación ───────────────────────────────────────────────
function Contribution({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', color: H2_DARK }}>
          {value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 9, color: '#0F766E' }}>€/kg</span>
        </span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

function Assumption({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', marginTop: 2 }}>{value}</div>
      {note && <div style={{ fontSize: 9, color: '#A0A0A5', marginTop: 1 }}>{note}</div>}
    </div>
  )
}

// ── Curva de sensibilidad (SVG mini-line) ───────────────────────────────────
function SensitivityCurve({ sweep, live, liveLcoh }: { sweep: { price: number; lcoh: number }[]; live: number | null; liveLcoh: number }) {
  const W = 340
  const H = 130
  const PAD = { l: 34, r: 8, t: 10, b: 22 }
  const xs = sweep.map((d) => d.price)
  const ys = sweep.map((d) => d.lcoh)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = 0
  const yMax = Math.max(...ys) * 1.1
  const sx = (p: number) => PAD.l + ((p - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const sy = (v: number) => H - PAD.b - ((v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const path = sweep.map((d, i) => `${i === 0 ? 'M' : 'L'} ${sx(d.price).toFixed(1)} ${sy(d.lcoh).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', margin: '6px 0' }} role="img" aria-label="Curva de sensibilidad del LCOH al precio eléctrico">
      {/* Ejes */}
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#E2E8F0" strokeWidth={1} />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#E2E8F0" strokeWidth={1} />
      {/* Ticks Y */}
      {[0, yMax / 2, yMax].map((v, i) => (
        <g key={i}>
          <text x={PAD.l - 4} y={sy(v) + 3} fontSize={8} fill="#94A3B8" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      {/* Ticks X */}
      {[xMin, (xMin + xMax) / 2, xMax].map((v, i) => (
        <text key={i} x={sx(v)} y={H - PAD.b + 12} fontSize={8} fill="#94A3B8" textAnchor="middle">{v}</text>
      ))}
      <text x={(W + PAD.l) / 2} y={H - 2} fontSize={8} fill="#86868b" textAnchor="middle">precio eléctrico €/MWh</text>
      {/* Curva */}
      <path d={path} fill="none" stroke={H2} strokeWidth={2.2} />
      {/* Marcador del precio live */}
      {live != null && live >= xMin && live <= xMax && (
        <g>
          <line x1={sx(live)} y1={PAD.t} x2={sx(live)} y2={H - PAD.b} stroke="#0EA5E9" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={sx(live)} cy={sy(liveLcoh)} r={4} fill="#0EA5E9" stroke="#fff" strokeWidth={1.5} />
          <text x={sx(live)} y={PAD.t + 8} fontSize={8} fill="#0EA5E9" textAnchor="middle" fontWeight={700}>live</text>
        </g>
      )}
    </svg>
  )
}

function SensitivityTable({ sweep, live }: { sweep: { price: number; lcoh: number }[]; live: number | null }) {
  // Mostramos un subconjunto compacto.
  const rows = sweep.filter((_, i) => i % 2 === 0)
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', fontSize: 9, color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px', borderBottom: '1px solid #ECECEF' }}>Precio luz (€/MWh)</th>
          <th style={{ textAlign: 'right', fontSize: 9, color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px', borderBottom: '1px solid #ECECEF' }}>LCOH (€/kg)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => {
          const near = live != null && Math.abs(d.price - live) <= 10
          return (
            <tr key={d.price} style={{ background: near ? '#F0FDFA' : 'transparent' }}>
              <td style={{ fontSize: 11, color: '#1d1d1f', padding: '4px 6px', fontWeight: near ? 700 : 400 }}>
                {d.price}{near ? ' ◆' : ''}
              </td>
              <td style={{ fontSize: 11.5, color: H2_DARK, padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {d.lcoh.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Localiza una serie por keywords en su título (case-insensitive) ─────────
function findSerie(series: PrecioSerie[] | null, keywords: string[]): PrecioSerie | undefined {
  if (!series) return undefined
  for (const kw of keywords) {
    const hit = series.find((s) => (s.title || '').toLowerCase().includes(kw))
    if (hit) return hit
  }
  return undefined
}
