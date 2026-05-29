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

type SubTab = 'presupuesto' | 'capacidades' | 'transferencias' | 'alianzas' | 'industria' | 'exterior'

interface ArmsTransferEntry {
  tiv_5y_usd_m: number
  share_pct: number
  change_pct: number | null
  top_partners: Array<{ iso3: string; share_pct: number }>
  dominant_categories: string[]
}

interface WeaponSystem {
  system: string
  category: string
  units: number | null
  partner_iso3: string
  tiv_usd_m: number
  year: number
}

interface MissionAbroad {
  name: string
  type: 'NATO' | 'UN' | 'EU' | 'bilateral' | 'multilateral_ad_hoc'
  host_iso3: string
  personnel: number
  since_year: number
  active: boolean
  mandate: string
}

interface DefenseCompany {
  name: string
  ticker: string | null
  sipri_rank: number | null
  arms_sales_usd_m: number
  arms_share_pct: number
  employees: number | null
  segments: string[]
  notes: string
}

interface MilitaryDetail {
  ok: boolean
  iso3: string
  country_name: string
  presupuesto: {
    sipri: { milex_usd_bn: number; milex_pct_gdp: number; change_vs_2022_pct: number | null; world_rank: number | null } | null
    nato_target_2pct: { is_member: boolean; meets_target: boolean; delta_pct: number | null } | null
    breakdown: {
      available: boolean
      pending: boolean
      note?: string
      total_usd_bn?: number
      fiscal_year?: number
      personnel_pct?: number
      operations_maintenance_pct?: number
      procurement_pct?: number
      rd_pct?: number
      infrastructure_pct?: number
      other_pct?: number
      notes?: string
      source?: string
    }
  }
  capacidades: any
  capacidades_pending: boolean
  /** G22 fix · SIPRI Arms Transfers data + G23 · sistemas específicos */
  transferencias: {
    available: boolean
    pending: boolean
    note?: string
    exports?: ArmsTransferEntry | null
    imports?: ArmsTransferEntry | null
    world_rank_exporter?: number | null
    world_rank_importer?: number | null
    notes?: string
    source?: string
    systems_exported?: WeaponSystem[]
    systems_imported?: WeaponSystem[]
  }
  alianzas: {
    memberships: Array<{ id: string; name: string; short_name: string; category: string; color: string; founded_year: number; status: 'member' | 'affiliate'; members_count: number; affiliates_count: number; description: string }>
    count: number
  }
  /** G22 fix · SIPRI AIDB defense industry data */
  industria: {
    available: boolean
    pending: boolean
    note?: string
    companies?: DefenseCompany[]
    total_arms_sales_2022_usd_bn?: number
    share_top100_global?: number
    notes?: string
    source?: string
  }
  /** G23 · presencia militar exterior */
  militar_exterior?: {
    available: boolean
    pending?: boolean
    note?: string
    total_personnel_abroad?: number
    permanent_bases_abroad?: number
    missions?: MissionAbroad[]
    source?: string
  }
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
  { id: 'exterior', label: 'Misiones exterior' },
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
          {!loading && data && sub === 'transferencias' && <SubTransferencias d={data} />}
          {!loading && data && sub === 'alianzas' && <SubAlianzas d={data} />}
          {!loading && data && sub === 'industria' && <SubIndustria d={data} />}
          {!loading && data && sub === 'exterior' && <SubExterior d={data} />}
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

      {/* G23 · Desglose presupuestario real */}
      {p.breakdown.available && p.breakdown.total_usd_bn !== undefined ? (
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Desglose presupuestario {p.breakdown.fiscal_year} · ${p.breakdown.total_usd_bn}bn
          </h5>
          <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div title={`Personal ${p.breakdown.personnel_pct}%`} style={{ width: `${p.breakdown.personnel_pct}%`, background: '#dc2626' }} />
            <div title={`O&M ${p.breakdown.operations_maintenance_pct}%`} style={{ width: `${p.breakdown.operations_maintenance_pct}%`, background: '#f59e0b' }} />
            <div title={`Adquisiciones ${p.breakdown.procurement_pct}%`} style={{ width: `${p.breakdown.procurement_pct}%`, background: '#0891b2' }} />
            <div title={`I+D ${p.breakdown.rd_pct}%`} style={{ width: `${p.breakdown.rd_pct}%`, background: '#7c3aed' }} />
            <div title={`Infraestructura ${p.breakdown.infrastructure_pct}%`} style={{ width: `${p.breakdown.infrastructure_pct}%`, background: '#94a3b8' }} />
            <div title={`Otros ${p.breakdown.other_pct}%`} style={{ width: `${p.breakdown.other_pct}%`, background: '#cbd5e1' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: 10, color: '#475569' }}>
            <BudgetRow color="#dc2626" label="Personal" pct={p.breakdown.personnel_pct} />
            <BudgetRow color="#f59e0b" label="Operaciones y mant." pct={p.breakdown.operations_maintenance_pct} />
            <BudgetRow color="#0891b2" label="Adquisiciones" pct={p.breakdown.procurement_pct} />
            <BudgetRow color="#7c3aed" label="I+D defensa" pct={p.breakdown.rd_pct} />
            <BudgetRow color="#94a3b8" label="Infraestructura" pct={p.breakdown.infrastructure_pct} />
            <BudgetRow color="#cbd5e1" label="Otros" pct={p.breakdown.other_pct} />
          </div>
          {p.breakdown.notes && (
            <p style={{ margin: '8px 0 0', fontSize: 10, color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
              {p.breakdown.notes}
            </p>
          )}
          {p.breakdown.source && (
            <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8' }}>{p.breakdown.source}</p>
          )}
        </div>
      ) : (
        <PendingBlock data={p.breakdown} title="Desglose presupuestario" small />
      )}
    </div>
  )
}

function BudgetRow({ color, label, pct }: { color: string; label: string; pct: number | undefined }) {
  if (pct === undefined) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, background: color, borderRadius: 2 }} />
      <span style={{ color: '#475569' }}>{label}</span>
      <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>{pct}%</strong>
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

function PendingBlock({ data, title, small = false }: { data: { available: boolean; pending: boolean; note?: string }; title: string; small?: boolean }) {
  if (!data.pending) return null
  return (
    <div style={{
      marginTop: small ? 14 : 0,
      background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
      padding: '10px 12px', borderRadius: 6, fontSize: 11, color: '#92400e',
    }}>
      <strong>{title} · Próximamente</strong>
      <p style={{ margin: '4px 0 0' }}>{data.note ?? ''}</p>
    </div>
  )
}

// G22 fix · SIPRI Arms Transfers (sub-tab C)
function SubTransferencias({ d }: { d: MilitaryDetail }) {
  const t = d.transferencias
  if (!t.available) {
    return <PendingBlock data={t} title="Transferencias de armamento" />
  }
  return (
    <div>
      <header style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          SIPRI Arms Transfers 2024 · ventana 2019-2023
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>{t.notes}</p>
      </header>

      {/* Rankings globales */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {t.world_rank_exporter !== null && t.world_rank_exporter !== undefined && (
          <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#15803d', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            #{t.world_rank_exporter} EXPORTADOR
          </span>
        )}
        {t.world_rank_importer !== null && t.world_rank_importer !== undefined && (
          <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            #{t.world_rank_importer} IMPORTADOR
          </span>
        )}
      </div>

      {/* Exports block */}
      {t.exports && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Exportaciones armas (este país vende)
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
            <Chip label="TIV 5y (USD m)" value={`$${(t.exports.tiv_5y_usd_m / 1000).toFixed(1)}bn`} accent="#15803d" />
            <Chip label="Share mundial" value={`${t.exports.share_pct.toFixed(1)}%`} accent="#16a34a" />
            {t.exports.change_pct !== null && (
              <Chip
                label="vs 2014-18"
                value={`${t.exports.change_pct > 0 ? '+' : ''}${t.exports.change_pct.toFixed(0)}%`}
                accent={t.exports.change_pct >= 0 ? '#16a34a' : '#dc2626'}
              />
            )}
          </div>
          <p style={{ margin: '6px 0 4px', fontSize: 10, fontWeight: 600, color: '#15803d' }}>Top 3 receptores</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {t.exports.top_partners.map((p) => (
              <div key={p.iso3} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                <span style={{ color: '#475569' }}>{p.iso3}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#15803d' }}>{p.share_pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 9, color: '#475569' }}>
            Categorías: {t.exports.dominant_categories.join(' · ')}
          </p>
        </div>
      )}

      {/* Imports block */}
      {t.imports && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Importaciones armas (este país compra)
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
            <Chip label="TIV 5y (USD m)" value={`$${(t.imports.tiv_5y_usd_m / 1000).toFixed(1)}bn`} accent="#7f1d1d" />
            <Chip label="Share mundial" value={`${t.imports.share_pct.toFixed(1)}%`} accent="#dc2626" />
            {t.imports.change_pct !== null && (
              <Chip
                label="vs 2014-18"
                value={`${t.imports.change_pct > 0 ? '+' : ''}${t.imports.change_pct.toFixed(0)}%`}
                accent={t.imports.change_pct >= 0 ? '#dc2626' : '#16a34a'}
              />
            )}
          </div>
          <p style={{ margin: '6px 0 4px', fontSize: 10, fontWeight: 600, color: '#7f1d1d' }}>Top 3 proveedores</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {t.imports.top_partners.map((p) => (
              <div key={p.iso3} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                <span style={{ color: '#475569' }}>{p.iso3}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#7f1d1d' }}>{p.share_pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 9, color: '#475569' }}>
            Categorías: {t.imports.dominant_categories.join(' · ')}
          </p>
        </div>
      )}

      {/* G23 · Sistemas específicos exportados */}
      {(t.systems_exported ?? []).length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Sistemas específicos exportados (programas top 5)
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(t.systems_exported ?? []).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 4, fontSize: 11 }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{s.system}</strong>
                  <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 9 }}>→ {s.partner_iso3}</span>
                </div>
                {s.units !== null && <span style={{ fontFamily: 'ui-monospace, monospace', color: '#475569', fontSize: 10 }}>{s.units} ud</span>}
                <span style={{ fontFamily: 'ui-monospace, monospace', color: '#15803d', fontWeight: 700, fontSize: 10 }}>${(s.tiv_usd_m / 1000).toFixed(1)}bn</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* G23 · Sistemas específicos importados */}
      {(t.systems_imported ?? []).length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Sistemas específicos importados (programas top 5)
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(t.systems_imported ?? []).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 4, fontSize: 11 }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{s.system}</strong>
                  <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 9 }}>← {s.partner_iso3}</span>
                </div>
                {s.units !== null && <span style={{ fontFamily: 'ui-monospace, monospace', color: '#475569', fontSize: 10 }}>{s.units} ud</span>}
                <span style={{ fontFamily: 'ui-monospace, monospace', color: '#7f1d1d', fontWeight: 700, fontSize: 10 }}>${(s.tiv_usd_m / 1000).toFixed(1)}bn</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {t.source && (
        <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '8px 0 0' }}>{t.source}</p>
      )}
    </div>
  )
}

// G23 · Sub-tab Exterior · misiones + bases
function SubExterior({ d }: { d: MilitaryDetail }) {
  const m = d.militar_exterior
  if (!m?.available || !m.missions) {
    return (
      <div style={{ padding: '12px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
        <strong>Misiones exterior · Próximamente</strong>
        <p style={{ margin: '4px 0 0' }}>{m?.note ?? 'Seed disponible solo para top 10 países'}</p>
      </div>
    )
  }
  const TYPE_COLOR: Record<MissionAbroad['type'], string> = {
    NATO: '#1e40af', UN: '#0891b2', EU: '#f59e0b', bilateral: '#7c3aed', multilateral_ad_hoc: '#475569',
  }
  const TYPE_LABEL: Record<MissionAbroad['type'], string> = {
    NATO: 'NATO', UN: 'ONU', EU: 'UE', bilateral: 'BILATERAL', multilateral_ad_hoc: 'MULTI ad hoc',
  }
  return (
    <div>
      <header style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Presencia militar exterior 2024
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>{m.source}</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Chip label="Efectivos desplegados" value={fmtNum(m.total_personnel_abroad ?? 0)} accent="#dc2626" />
        <Chip label="Bases permanentes" value={String(m.permanent_bases_abroad ?? 0)} accent="#7c3aed" />
      </div>
      <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
        Operaciones por país ({m.missions.filter((x) => x.active).length} activas · {m.missions.filter((x) => !x.active).length} históricas)
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {m.missions.map((mission, i) => (
          <div key={i} style={{
            padding: '10px 12px', background: '#fff', borderRadius: 6,
            borderLeft: `3px solid ${mission.active ? TYPE_COLOR[mission.type] : '#cbd5e1'}`,
            border: '1px solid #f1f5f9', opacity: mission.active ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{mission.name}</span>
              <span style={{ padding: '1px 6px', background: TYPE_COLOR[mission.type] + '20', color: TYPE_COLOR[mission.type], borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>
                {TYPE_LABEL[mission.type]}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                {mission.host_iso3} · desde {mission.since_year}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 10, color: '#475569' }}>
              <span><strong style={{ fontFamily: 'ui-monospace, monospace', color: mission.active ? '#0f172a' : '#94a3b8' }}>{fmtNum(mission.personnel)}</strong> efectivos</span>
              {!mission.active && <span style={{ padding: '1px 5px', background: '#f1f5f9', color: '#475569', borderRadius: 3, fontSize: 9 }}>HISTÓRICA</span>}
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.3 }}>{mission.mandate}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// G22 fix · SIPRI AIDB Defense Industry (sub-tab E)
function SubIndustria({ d }: { d: MilitaryDetail }) {
  const i = d.industria
  if (!i.available) {
    return <PendingBlock data={i} title="Industria de defensa" />
  }
  return (
    <div>
      <header style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          SIPRI Arms Industry Database 2023 · ventas armas 2022
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>{i.notes}</p>
      </header>

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
        {i.total_arms_sales_2022_usd_bn !== undefined && (
          <Chip label="Ventas armas 2022" value={`$${i.total_arms_sales_2022_usd_bn} bn`} accent="#dc2626" />
        )}
        {i.share_top100_global !== undefined && (
          <Chip label="Share top 100 mundial" value={`${i.share_top100_global.toFixed(1)}%`} accent="#7c3aed" />
        )}
      </div>

      {/* Companies list */}
      <h5 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
        Empresas defensa principales
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(i.companies ?? []).map((c) => (
          <div key={c.name} style={{
            padding: '10px 12px', background: '#fff', borderRadius: 6,
            borderLeft: '3px solid #dc2626', border: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
              {c.ticker && (
                <span style={{ padding: '1px 6px', background: '#f1f5f9', borderRadius: 3, fontSize: 9, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                  {c.ticker}
                </span>
              )}
              {c.sipri_rank && (
                <span style={{ marginLeft: 'auto', padding: '1px 6px', background: '#fef2f2', color: '#7f1d1d', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>
                  SIPRI #{c.sipri_rank}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#475569', marginBottom: 4 }}>
              <span>Ventas armas: <strong style={{ fontFamily: 'ui-monospace, monospace', color: '#7f1d1d' }}>${(c.arms_sales_usd_m / 1000).toFixed(1)}bn</strong></span>
              <span>Share armas: <strong>{c.arms_share_pct}%</strong></span>
              {c.employees && <span>Empleados: <strong>{fmtNum(c.employees)}</strong></span>}
            </div>
            <p style={{ margin: '2px 0 4px', fontSize: 10, color: '#475569' }}>
              Segmentos: {c.segments.join(' · ')}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#0f172a', fontStyle: 'italic' }}>{c.notes}</p>
          </div>
        ))}
      </div>

      {i.source && (
        <p style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', margin: '8px 0 0' }}>{i.source}</p>
      )}
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
