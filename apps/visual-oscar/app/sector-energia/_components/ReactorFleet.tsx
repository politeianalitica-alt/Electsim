'use client'
/**
 * <ReactorFleet /> · Sprint Energía S6
 *
 * Parque nuclear español: las 5 centrales con sus 7 reactores operativos
 * (catálogo curado `REACTORES_ES`). Grid de cards rico con:
 *   - Nombre del grupo + central + tecnología (PWR/BWR)
 *   - Potencia eléctrica neta (MW) + barra relativa al mayor del parque
 *   - Año de conexión a la red
 *   - Propietarios (titulares de la participación)
 *   - Factor de carga real del parque (si se pasa `factorCargaPct`, calculado
 *     en NuclearView a partir de ESIOS; el factor es del conjunto, la nuclear
 *     opera como base de carga ~85-90 %).
 *   - Estado operativo + año de cierre previsto (calendario pactado 2019).
 *
 * Componente cliente puro (sin fetch propio): recibe el factor de carga del
 * parque por prop para no duplicar llamadas a ESIOS. Cita CSN / Foro Nuclear.
 * Cero emojis (CLAUDE.md §0.5) · Unicode.
 */
import { REACTORES_ES } from '@/lib/energia/catalog'
import { summarizeFleet } from '@/lib/energia/nuclear-calc'
import type { Reactor } from '@/lib/energia/types'

const ACCENT = '#16A34A'
const NUCLEAR_COLOR = '#7c3aed' // morado · coherente con ESIOS_TECH_COLORS.gen_nuclear

// Color del badge de tecnología.
function techColor(t: string): { bg: string; fg: string } {
  if (/bwr/i.test(t)) return { bg: '#EFF6FF', fg: '#1D4ED8' } // azul · agua en ebullición
  return { bg: '#F5F3FF', fg: NUCLEAR_COLOR } // morado · PWR (mayoría)
}

export default function ReactorFleet({
  factorCargaPct,
}: {
  /** Factor de carga del parque (%), calculado en NuclearView desde ESIOS. */
  factorCargaPct?: number | null
}) {
  const reactores = REACTORES_ES
  const summary = summarizeFleet(reactores)
  const maxMw = Math.max(1, ...reactores.map((r) => r.potencia_mw))

  return (
    <div>
      {/* Resumen del parque */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <FleetStat label="Reactores operativos" value={`${summary.operativos}`} />
        <FleetStat
          label="Potencia instalada"
          value={`${(summary.potencia_operativa_mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} GW`}
          sub={`${summary.potencia_operativa_mw.toLocaleString('es-ES')} MW netos`}
        />
        <FleetStat label="Centrales" value={`${new Set(reactores.map((r) => r.central)).size}`} />
        <FleetStat
          label="Factor de carga parque"
          value={factorCargaPct != null ? `${factorCargaPct.toFixed(0)}%` : '—'}
          sub={factorCargaPct != null ? 'gen. media / potencia (ESIOS)' : 'sin dato ESIOS'}
        />
      </div>

      {/* Grid de reactores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {reactores.map((r) => (
          <ReactorCard key={r.nombre} r={r} maxMw={maxMw} />
        ))}
      </div>
    </div>
  )
}

function FleetStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ReactorCard({ r, maxMw }: { r: Reactor; maxMw: number }) {
  const tc = techColor(r.tecnologia)
  const operativo = r.estado === 'operativo'
  const pctBar = Math.round((r.potencia_mw / maxMw) * 100)
  return (
    <div
      style={{
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '14px 16px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Cabecera: nombre + tecnología */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', letterSpacing: '-0.015em' }}>
            {r.nombre}
          </div>
          <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 1 }}>
            Central de {r.central} · conexión {r.ano_conexion}
          </div>
        </div>
        <span
          title={r.tecnologia === 'BWR' ? 'Boiling Water Reactor · agua en ebullición' : 'Pressurized Water Reactor · agua a presión'}
          style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em',
            padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
            background: tc.bg, color: tc.fg,
          }}
        >
          {r.tecnologia}
        </span>
      </div>

      {/* Potencia + barra */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Potencia neta
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: NUCLEAR_COLOR }}>
            {r.potencia_mw.toLocaleString('es-ES')} <span style={{ fontSize: 10, fontWeight: 600, color: '#86868b' }}>MW</span>
          </span>
        </div>
        <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pctBar}%`, height: '100%', background: NUCLEAR_COLOR, opacity: 0.85 }} />
        </div>
      </div>

      {/* Propietarios */}
      <div>
        <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
          Propietarios
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {r.propietarios.map((p) => (
            <span key={p} style={{ fontSize: 10, fontWeight: 600, color: '#3a3a3d', background: '#F5F5F7', borderRadius: 6, padding: '2px 7px' }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Estado + cierre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #F5F5F7' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: operativo ? ACCENT : '#86868b' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: operativo ? ACCENT : '#C0C0C5' }} />
          {operativo ? 'Operativo' : r.estado === 'parada' ? 'En parada' : 'Cerrado'}
        </span>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>
          Cierre previsto <strong style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>{r.cierre_previsto}</strong>
        </span>
      </div>
    </div>
  )
}
