'use client'

interface Hito {
  id: string; nombre: string; fecha: string
  estado: 'alcanzado' | 'pendiente' | 'retrasado'
  descripcion?: string
}

interface Empresa {
  nombre: string; pais: string; rol: string
  participacion_pct?: number; segmento: string
}

interface Programa {
  id: string; nombre: string; nombre_corto: string; descripcion: string
  estado: string; tipo: string; paises: string[]
  inicio: number; fin_previsto: number
  coste_total_M?: number; coste_espana_M?: number
  fase_actual: string; progreso_pct: number
  hitos: Hito[]; empresas: Empresa[]
  fuente_url?: string; organismo_gestor?: string; bandera_emoji: string
}

const HITO_ICONS: Record<string, string> = {
  alcanzado: '✅', pendiente: '⏳', retrasado: '🔴',
}
const HITO_COLORS: Record<string, string> = {
  alcanzado: '#16A34A', pendiente: '#86868b', retrasado: '#DC2626',
}
const ROL_BADGE: Record<string, { bg: string; color: string }> = {
  prime: { bg: '#1F4E8C', color: '#fff' },
  tier1: { bg: '#EFF6FF', color: '#1F4E8C' },
  tier2: { bg: '#F5F5F7', color: '#6e6e73' },
  tier3: { bg: '#FAFAFA', color: '#86868b' },
}

export function ProgramDetail({ programa: p, onClose }: { programa: Programa | null; onClose: () => void }) {
  if (!p) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#86868b', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>📋</div>
      <p style={{ fontSize: 13, margin: 0 }}>Selecciona un programa para ver su detalle</p>
    </div>
  )

  return (
    <div style={{ padding: '20px 20px 40px', overflowY: 'auto', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 22 }}>{p.bandera_emoji}</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#1d1d1f', margin: '4px 0 2px' }}>{p.nombre}</h2>
          <div style={{ fontSize: 11, color: '#86868b' }}>{p.organismo_gestor} · {p.inicio}–{p.fin_previsto}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#86868b', padding: 0 }}>×</button>
      </div>

      <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, margin: '0 0 16px' }}>{p.descripcion}</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Coste total', value: p.coste_total_M ? `${(p.coste_total_M/1000).toFixed(1)}b €` : '—', color: '#1F4E8C' },
          { label: 'Coste España', value: p.coste_espana_M ? `${(p.coste_espana_M/1000).toFixed(1)}b €` : '—', color: '#DC2626' },
          { label: 'Progreso', value: `${p.progreso_pct}%`, color: '#16A34A' },
          { label: 'Países', value: p.paises.join(' · '), color: '#525258' },
        ].map(k => (
          <div key={k.label} style={{ padding: '10px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Hitos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#86868b', marginBottom: 8 }}>Hitos clave</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {p.hitos.map(h => (
            <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{HITO_ICONS[h.estado]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: HITO_COLORS[h.estado] }}>{h.nombre}</div>
                <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 1 }}>{h.fecha}</div>
                {h.descripcion && <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 3, lineHeight: 1.4 }}>{h.descripcion}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cadena industrial */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#86868b', marginBottom: 8 }}>Cadena industrial</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {p.empresas.map((e, i) => {
            const rb = ROL_BADGE[e.rol] ?? ROL_BADGE.tier2
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF' }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3, background: rb.bg, color: rb.color, letterSpacing: '0.04em', flexShrink: 0 }}>
                  {e.rol.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>{e.nombre}</span>
                <span style={{ fontSize: 10.5, color: '#86868b' }}>{e.segmento}</span>
                {e.participacion_pct ? <span style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C', flexShrink: 0 }}>{e.participacion_pct}%</span> : null}
              </div>
            )
          })}
        </div>
      </div>

      {p.fuente_url && (
        <a href={p.fuente_url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '7px 14px', borderRadius: 8, background: '#1d1d1f', color: '#fff', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}>
          Fuente oficial ↗
        </a>
      )}
    </div>
  )
}
