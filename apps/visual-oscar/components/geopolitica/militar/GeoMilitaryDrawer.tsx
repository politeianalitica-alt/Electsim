'use client'
/**
 * <GeoMilitaryDrawer /> · Sprint GEO-MIL C6
 *
 * Ficha militar completa de país con 5 sub-tabs:
 *   A · Presupuesto · SIPRI + posición OTAN 2%
 *   B · Capacidades · IISS Military Balance (cuando disponible)
 *   C · Transferencias · placeholder SIPRI Arms Transfers
 *   D · Alianzas · membresías con detalle
 *   E · Industria · placeholder SIPRI AIDB + Finnhub
 *
 * Consume /api/militar/pais/[iso3].
 */
import { useEffect, useState, type ReactNode } from 'react'

type SubTab = 'presupuesto' | 'capacidades' | 'transferencias' | 'alianzas' | 'industria'

interface MilitaryDetail {
  ok: boolean
  iso3: string
  country_name: string
  presupuesto: {
    sipri: { milex_usd_bn: number; milex_pct_gdp: number; change_vs_2022_pct: number | null; world_rank: number | null } | null
    nato_target_2pct: { is_member: boolean; meets_target: boolean; delta_pct: number | null } | null
    breakdown: { available: boolean; pending: boolean; note: string }
  }
  capacidades: any
  capacidades_pending: boolean
  transferencias: { available: boolean; pending: boolean; note: string }
  alianzas: {
    memberships: Array<{ id: string; name: string; short_name: string; category: string; color: string; founded_year: number; status: 'member' | 'affiliate'; members_count: number; affiliates_count: number; description: string }>
    count: number
  }
  industria: { available: boolean; pending: boolean; note: string }
}

interface Props {
  iso3: string | null
  onClose: () => void
}

const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'capacidades', label: 'Capacidades' },
  { id: 'transferencias', label: 'Transferencias' },
  { id: 'alianzas', label: 'Alianzas' },
  { id: 'industria', label: 'Industria defensa' },
]

export function GeoMilitaryDrawer({ iso3, onClose }: Props) {
  const [data, setData] = useState<MilitaryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<SubTab>('presupuesto')

  useEffect(() => {
    if (!iso3) return
    let alive = true
    setLoading(true)
    setSub('presupuesto')
    fetch(`/api/militar/pais/${iso3}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso3])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (iso3) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [iso3, onClose])

  if (!iso3) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000,
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(680px, 96vw)', background: '#fff',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.2)',
        zIndex: 1001, overflowY: 'auto',
      }}>
        <header style={{
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Ficha militar · {data?.country_name || iso3}
              </h2>
              {data?.presupuesto.sipri && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', fontSize: 11 }}>
                  <span>SIPRI: <strong style={{ color: '#dc2626', fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>${data.presupuesto.sipri.milex_usd_bn} bn</strong></span>
                  <span>· <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{data.presupuesto.sipri.milex_pct_gdp}% PIB</strong></span>
                  {data.presupuesto.sipri.world_rank && <span>· rango #{data.presupuesto.sipri.world_rank}</span>}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#64748b', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
              {SUB_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSub(t.id)}
                  style={{
                    padding: '8px 12px', border: 'none', background: 'transparent',
                    borderBottom: sub === t.id ? '2px solid #1e293b' : '2px solid transparent',
                    color: sub === t.id ? '#0f172a' : '#64748b',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}
        </header>

        <div style={{ padding: '16px 20px' }}>
          {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando ficha militar…</p>}

          {!loading && data && sub === 'presupuesto' && <SubPresupuesto d={data} />}
          {!loading && data && sub === 'capacidades' && <SubCapacidades d={data} />}
          {!loading && data && sub === 'transferencias' && <PendingBlock data={data.transferencias} title="Transferencias de armamento" />}
          {!loading && data && sub === 'alianzas' && <SubAlianzas d={data} />}
          {!loading && data && sub === 'industria' && <PendingBlock data={data.industria} title="Industria de defensa" />}
        </div>
      </aside>
    </>
  )
}

function SubPresupuesto({ d }: { d: MilitaryDetail }) {
  const p = d.presupuesto
  if (!p.sipri) {
    return (
      <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '14px 16px', borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>País no incluido en SIPRI Military Expenditure 60 top.</p>
      </div>
    )
  }
  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Datos SIPRI 2024 (cifras 2023)
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <Chip label="Gasto USD bn" value={`$${p.sipri.milex_usd_bn} bn`} accent="#dc2626" />
        <Chip label="% del PIB" value={`${p.sipri.milex_pct_gdp}%`} accent={p.sipri.milex_pct_gdp >= 4 ? '#7f1d1d' : '#dc2626'} />
        {p.sipri.change_vs_2022_pct !== null && (
          <Chip label="Cambio vs 2022" value={`${p.sipri.change_vs_2022_pct > 0 ? '+' : ''}${p.sipri.change_vs_2022_pct}%`} accent={p.sipri.change_vs_2022_pct > 20 ? '#dc2626' : '#16a34a'} />
        )}
        {p.sipri.world_rank && <Chip label="Rango mundial" value={`#${p.sipri.world_rank}`} accent="#7c3aed" />}
      </div>

      {p.nato_target_2pct && (
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 8,
          background: p.nato_target_2pct.meets_target ? '#dcfce7' : '#fef3c7',
          borderLeft: `4px solid ${p.nato_target_2pct.meets_target ? '#16a34a' : '#f59e0b'}`,
        }}>
          <strong style={{ fontSize: 12, color: p.nato_target_2pct.meets_target ? '#15803d' : '#92400e' }}>
            OTAN Target 2% PIB: {p.nato_target_2pct.meets_target ? '✓ CUMPLE' : '✗ NO CUMPLE'}
          </strong>
          {p.nato_target_2pct.delta_pct !== null && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: p.nato_target_2pct.meets_target ? '#15803d' : '#78350f' }}>
              {p.nato_target_2pct.delta_pct >= 0 ? '+' : ''}{p.nato_target_2pct.delta_pct} puntos vs objetivo
            </p>
          )}
        </div>
      )}

      <PendingBlock data={p.breakdown} title="Desglose presupuestario" small />
    </div>
  )
}

function SubCapacidades({ d }: { d: MilitaryDetail }) {
  if (d.capacidades_pending || !d.capacidades) {
    return <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>País no incluido en IISS Military Balance top 50.</p>
  }
  const c = d.capacidades
  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        IISS Military Balance 2024 · capability score {c.capability_score}/100
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11 }}>
        <CapRow label="Personal activo" value={fmtNum(c.active_personnel)} />
        <CapRow label="Reservistas" value={fmtNum(c.reservists)} />
        <CapRow label="Tanques MBT" value={fmtNum(c.tanks_mbt)} />
        <CapRow label="IFV/APCs" value={fmtNum(c.ifv_apcs)} />
        <CapRow label="Artillería SP" value={fmtNum(c.artillery_sp)} />
        <CapRow label="Aviones combate" value={fmtNum(c.combat_aircraft)} />
        <CapRow label="UAVs combate" value={fmtNum(c.combat_uavs)} />
        <CapRow label="Portaaviones/LHD" value={fmtNum(c.carriers_lhds)} />
        <CapRow label="Submarinos" value={fmtNum(c.submarines)} />
        <CapRow label="Destructores/Fragatas" value={fmtNum(c.destroyers_frigates)} />
        {c.nuclear_warheads && <CapRow label="Cabezas nucleares (est.)" value={fmtNum(c.nuclear_warheads)} accent="#7f1d1d" />}
        <CapRow label="Ciberdefensa" value={c.cyber_unit ? 'Sí (unidad activa)' : 'No'} accent={c.cyber_unit ? '#16a34a' : '#94a3b8'} />
        <CapRow label="Conscripción" value={c.conscription ? 'Sí (servicio obligatorio)' : 'No (voluntario)'} />
      </div>
    </div>
  )
}

function SubAlianzas({ d }: { d: MilitaryDetail }) {
  if (d.alianzas.count === 0) {
    return <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>País no miembro de ninguna alianza tracked.</p>
  }
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#475569' }}>
        Miembro de <strong>{d.alianzas.count}</strong> alianzas/bloques estratégicos:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.alianzas.memberships.map((a) => (
          <div key={a.id} style={{
            padding: '10px 12px', background: '#fff', borderRadius: 6,
            borderLeft: `4px solid ${a.color}`, border: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.short_name}</span>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>desde {a.founded_year}</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 7px', borderRadius: 3,
                background: a.status === 'member' ? '#dcfce7' : '#fef3c7',
                color: a.status === 'member' ? '#15803d' : '#92400e',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
              }}>{a.status === 'member' ? 'Miembro pleno' : 'Affiliate'}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#0f172a' }}>{a.name}</p>
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#475569', lineHeight: 1.4 }}>{a.description}</p>
            <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
              {a.members_count} miembros · {a.affiliates_count > 0 ? `${a.affiliates_count} affiliates` : 'sin affiliates'} · categoría {a.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PendingBlock({ data, title, small = false }: { data: { available: boolean; pending: boolean; note: string }; title: string; small?: boolean }) {
  if (!data.pending) return null
  return (
    <div style={{
      marginTop: small ? 14 : 0,
      background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
      padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e',
    }}>
      <strong>{title} · Próximamente</strong>
      <p style={{ margin: '4px 0 0' }}>{data.note}</p>
    </div>
  )
}

function Chip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${accent}` }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function CapRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#475569' }}>{label}</span>
      <span style={{ fontWeight: 700, color: accent || '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</span>
    </div>
  )
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export default GeoMilitaryDrawer
