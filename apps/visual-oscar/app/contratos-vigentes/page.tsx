'use client'
import './contratos-vigentes.css'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'
import { useContratosVigentes } from '@/hooks/contratacion/useContratosVigentes'
import type {
  SectorContratacion, RiesgoContrato, EstadoContrato,
} from '@/types/contratacion'

const SECTOR_COLOR: Record<SectorContratacion, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
  'Servicios sociales':'#D43F8D', 'Cultura':'#7C3AED', 'Otros':'#6e6e73',
}
const ESTADO_COLOR: Record<EstadoContrato, string> = {
  'En ejecución':'#16A34A', 'En curso · prórroga':'#0EA5E9', 'Suspendido':'#DC2626',
  'En modificación':'#F97316', 'Próximo a vencer':'#EAB308', 'Pendiente recepción':'#5B21B6',
}
const RIESGO_C: Record<RiesgoContrato, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}

export default function ContratosVigentesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useContratosVigentes()
  const contratos = data?.contratos ?? []

  const [tab, setTab] = useState<'cartera' | 'vencimientos' | 'modificaciones' | 'incidencias' | 'organismos'>('cartera')
  const [filterEstado, setFilterEstado] = useState<EstadoContrato | 'Todos'>('Todos')
  const [filterRiesgo, setFilterRiesgo] = useState<RiesgoContrato | 'Todos'>('Todos')
  const [filterSector, setFilterSector] = useState<SectorContratacion | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const original  = contratos.reduce((s, c) => s + c.importeOriginal, 0)
    const actual    = contratos.reduce((s, c) => s + c.importeActual, 0)
    const ejecutado = contratos.reduce((s, c) => s + c.importeEjecutado, 0)
    const totalMod  = contratos.reduce((s, c) => s + c.modificaciones.length, 0)
    const importeMod = actual - original
    const totalInc  = contratos.reduce((s, c) => s + c.incidencias.length, 0)
    const incAbiertas = contratos.reduce((s, c) => s + c.incidencias.filter(i => i.estado !== 'Resuelta').length, 0)
    const totalPenal  = contratos.reduce((s, c) => s + c.incidencias.filter(i => i.tipo === 'Penalización').reduce((sum, i) => sum + (i.importe || 0), 0), 0)
    const criticos = contratos.filter(c => c.riesgo === 'CRÍTICO').length
    const venc90   = contratos.filter(c => c.diasParaFin >= 0 && c.diasParaFin <= 90).length
    return { total: contratos.length, original, actual, ejecutado, totalMod, importeMod, totalInc, incAbiertas, totalPenal, criticos, venc90 }
  }, [contratos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contratos
      .filter(c => filterEstado === 'Todos' || c.estado === filterEstado)
      .filter(c => filterRiesgo === 'Todos' || c.riesgo === filterRiesgo)
      .filter(c => filterSector === 'Todos' || c.sector === filterSector)
      .filter(c => !q || c.titulo.toLowerCase().includes(q) || c.organismo.toLowerCase().includes(q) || c.adjudicatario.toLowerCase().includes(q) || c.exp.toLowerCase().includes(q))
      .sort((a,b) => {
        const order: Record<RiesgoContrato, number> = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 }
        return order[a.riesgo] - order[b.riesgo]
      })
  }, [contratos, filterEstado, filterRiesgo, filterSector, query])

  const vencimientosTop = useMemo(() =>
    contratos
      .filter(c => c.diasParaFin >= 0 && c.diasParaFin <= 365)
      .sort((a,b) => a.diasParaFin - b.diasParaFin)
      .slice(0, 8),
  [contratos])

  const porOrganismo = useMemo(() => {
    const map = new Map<string, { num: number; importe: number; ejecutado: number; criticos: number }>()
    for (const c of contratos) {
      const cur = map.get(c.organismo) || { num:0, importe:0, ejecutado:0, criticos:0 }
      cur.num += 1; cur.importe += c.importeActual; cur.ejecutado += c.importeEjecutado
      if (c.riesgo === 'CRÍTICO' || c.riesgo === 'ALTO') cur.criticos += 1
      map.set(c.organismo, cur)
    }
    return Array.from(map.entries()).map(([org, v]) => ({ org, ...v })).sort((a,b) => b.importe - a.importe)
  }, [contratos])

  if (loading) return (
    <div className="cv-root">
      <AppHeader/>
      <main className="cv-main cv-main--loading">
        <div className="cv-loading-text">Cargando contratos…</div>
      </main>
    </div>
  )

  return (
    <div className="cv-root">
      <AppHeader/>
      <main className="cv-main">

        {/* ───── Hero ───── */}
        <section className="cv-hero">
          <div>
            <p className="cv-hero-eyebrow">
              LICITACIONES Y CONTRATACIÓN PÚBLICA · MONITOR DE CONTRATOS VIGENTES
            </p>
            <h1 className="cv-hero-title">
              {totals.total} contratos vigentes · {(totals.actual / 1_000_000_000).toFixed(2)} mil M€ <em>en ejecución</em>
            </h1>
            <p className="cv-hero-subtitle">
              {totals.actual ? Math.round((totals.ejecutado / totals.actual) * 100) : 0}% de ejecución agregada · {totals.totalMod} modificaciones por valor de {(totals.importeMod / 1_000_000).toFixed(0)} M€ ({totals.original ? Math.round((totals.importeMod/totals.original)*100) : 0}% sobre el importe original) · {totals.incAbiertas} incidencias abiertas · {totals.venc90} contratos vencen en próximos 90 días.
            </p>
          </div>
          <div className="cv-hero-kpis">
            <HeroKPI label="Vigentes"   value={String(totals.total)}      accent="#86EFAC"/>
            <HeroKPI label="Críticos"   value={String(totals.criticos)}   accent="#FCA5A5"/>
            <HeroKPI label="Cierre 90d" value={String(totals.venc90)}     accent="#FCD34D"/>
            <HeroKPI label="Modific."   value={String(totals.totalMod)}   accent="#A5B4FC"/>
          </div>
        </section>

        {/* ═══ PLACSP · contratos formalizados (en vigor) ═══ */}
        <ContratosLiveFeed
          tipo="both"
          estado="FORM"
          minImporte={500_000}
          limit={10}
          titulo="CONTRATOS FORMALIZADOS · CARTERA EN VIGOR (>500k€)"
        />

        {/* ───── Snapshot · KPIs financieros ───── */}
        <section className="cv-section-snapshot">
          <SectionHeader label="Snapshot financiero de la cartera" count={`Datos consolidados · mayo 2026`} accent="#0F766E"/>
          <div className="cv-snapshot-grid">
            <SKpi label="Importe original total"   value={`${(totals.original / 1_000_000_000).toFixed(2)}`} sub="mil M€"  color="#1F4E8C"/>
            <SKpi label="Importe vigente actual"   value={`${(totals.actual / 1_000_000_000).toFixed(2)}`}   sub="mil M€"  delta={`+${totals.original ? ((totals.importeMod / totals.original) * 100).toFixed(1) : '0'}% vs original`} color="#0F766E"/>
            <SKpi label="Ejecutado a fecha"          value={`${(totals.ejecutado / 1_000_000_000).toFixed(2)}`} sub="mil M€"  delta={`${totals.actual ? Math.round((totals.ejecutado / totals.actual) * 100) : 0}% del actual`} pos color="#16A34A"/>
            <SKpi label="Penalizaciones aplicadas" value={`${(totals.totalPenal / 1000).toFixed(0)}K€`} sub="acum. 12 meses" color="#DC2626"/>
            <SKpi label="Modific. acumuladas"      value={`${(totals.importeMod / 1_000_000).toFixed(0)}M€`}   sub="sobre original" color="#F97316"/>
            <SKpi label="Incidencias abiertas"     value={String(totals.incAbiertas)} sub={`${totals.totalInc} totales`} color="#EAB308"/>
            <SKpi label="Adjudicatarios distintos" value={String(new Set(contratos.map(c => c.adjudicatario)).size)} sub="diversificación" color="#5B21B6"/>
            <SKpi label="Organismos"               value={String(porOrganismo.length)} sub="contratantes" color="#0EA5E9"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="cv-tabs">
          {([
            { k:'cartera',         label:'Cartera de contratos',       count: contratos.length },
            { k:'vencimientos',    label:'Vencimientos próximos',      count: vencimientosTop.length },
            { k:'modificaciones', label:'Modificaciones y prórrogas',  count: totals.totalMod },
            { k:'incidencias',     label:'Incidencias y litigios',      count: totals.totalInc },
            { k:'organismos',      label:'Por organismo',              count: porOrganismo.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={active ? 'cv-tab-btn cv-tab-btn--active' : 'cv-tab-btn'}
              >
                {t.label} <span className="cv-tab-count">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Cartera ───── */}
        {tab === 'cartera' && (
          <>
            <div className="cv-filters-row">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, adjudicatario o expediente…"
                className="cv-search-input"
              />
              <Selector label="Estado"  value={filterEstado} options={['Todos','En ejecución','En curso · prórroga','Suspendido','En modificación','Próximo a vencer','Pendiente recepción']} onChange={v => setFilterEstado(v as EstadoContrato | 'Todos')}/>
              <Selector label="Riesgo"  value={filterRiesgo} options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterRiesgo(v as RiesgoContrato | 'Todos')}/>
              <Selector label="Sector"  value={filterSector} options={['Todos','Sanidad','Defensa','Infraestructuras','TIC','Energía','Educación','Servicios sociales','Otros']} onChange={v => setFilterSector(v as SectorContratacion | 'Todos')}/>
              <span className="cv-filters-count">{filtered.length} contratos · ordenados por riesgo</span>
            </div>

            <div className="cv-cartera-list">
              {filtered.map(c => {
                const pctEj  = (c.importeEjecutado / c.importeActual) * 100
                const pctMod = ((c.importeActual - c.importeOriginal) / c.importeOriginal) * 100
                const cierreColor = c.diasParaFin < 0 ? '#525258' : c.diasParaFin <= 30 ? '#DC2626' : c.diasParaFin <= 90 ? '#F97316' : c.diasParaFin <= 365 ? '#EAB308' : '#16A34A'
                return (
                  <article
                    key={c.id}
                    className="cv-contract-card"
                    style={{ borderLeft: `4px solid ${RIESGO_C[c.riesgo]}` }}
                  >
                    <header className="cv-contract-header">
                      <div className="cv-contract-headleft">
                        <div className="cv-contract-pills-row">
                          <span className="cv-pill-risk" style={{ background: RIESGO_C[c.riesgo] }}>RIESGO {c.riesgo}</span>
                          <span
                            className="cv-pill-sector"
                            style={{
                              background: `${SECTOR_COLOR[c.sector]}15`,
                              color: SECTOR_COLOR[c.sector],
                              border: `1px solid ${SECTOR_COLOR[c.sector]}40`,
                            }}
                          >{c.sector.toUpperCase()}</span>
                          <span
                            className="cv-pill-estado"
                            style={{
                              background: `${ESTADO_COLOR[c.estado]}15`,
                              color: ESTADO_COLOR[c.estado],
                              border: `1px solid ${ESTADO_COLOR[c.estado]}40`,
                            }}
                          >{c.estado.toUpperCase()}</span>
                          <span className="cv-pill-exp">· EXP. {c.exp}</span>
                        </div>
                        <h3 className="cv-contract-title">{c.titulo}</h3>
                        <div className="cv-contract-org">{c.organismo} · <span className="cv-contract-org-adj">adj. {c.adjudicatario}</span></div>
                      </div>
                      <div className="cv-contract-headright">
                        <div className="cv-contract-importe">
                          {(c.importeActual / 1_000_000).toFixed(1)}<span className="cv-contract-importe-unit">M€</span>
                        </div>
                        <div className="cv-contract-importe-orig">orig. {(c.importeOriginal / 1_000_000).toFixed(1)}M€</div>
                        <div
                          className="cv-contract-mod-pct"
                          style={{ color: pctMod > 10 ? '#DC2626' : pctMod > 0 ? '#F97316' : '#16A34A' }}
                        >
                          {pctMod > 0 ? '▲' : '→'} {pctMod.toFixed(1)}% modificado
                        </div>
                      </div>
                    </header>
                    <div className="cv-contract-body">
                      <div className="cv-contract-exec-block">
                        <div className="cv-contract-exec-row">
                          <span className="cv-contract-exec-label">Ejecución actual</span>
                          <span className="cv-contract-exec-value">
                            {(c.importeEjecutado / 1_000_000).toFixed(1)}M€ · {pctEj.toFixed(1)}%
                          </span>
                        </div>
                        <div className="cv-contract-bar-track">
                          <div className="cv-contract-bar-fill" style={{ width: `${Math.min(100, pctEj)}%` }}/>
                        </div>
                      </div>
                      <div className="cv-contract-mini-grid">
                        <Mini label="Inicio"           value={c.fechaInicio}                              color="#3a3a3d"/>
                        <Mini label="Fin previsto"      value={c.fechaFinPrev}                              color={cierreColor}/>
                        <Mini label="Días para fin"     value={c.diasParaFin < 0 ? `+${Math.abs(c.diasParaFin)}d vencido` : `${c.diasParaFin}d`} color={cierreColor}/>
                        <Mini label="Prórrogas"         value={`${c.prorrogasUsadas}/${c.prorrogasMax}`}    color="#5B21B6"/>
                      </div>
                      <div className="cv-hito-box">
                        <div>
                          <div className="cv-hito-label">Próximo hito</div>
                          <div className="cv-hito-desc">
                            {c.proxHito.descripcion}
                            <span
                              className="cv-hito-estado"
                              style={{ color: c.proxHito.estado === 'Retrasado' ? '#DC2626' : c.proxHito.estado === 'Completado' ? '#16A34A' : '#F97316' }}
                            >· {c.proxHito.estado.toUpperCase()}</span>
                          </div>
                          <div className="cv-hito-fecha">fecha: {c.proxHito.fecha}</div>
                        </div>
                        <div>
                          <div className="cv-hito-label">Responsable</div>
                          <div className="cv-hito-resp">{c.responsable}</div>
                        </div>
                      </div>
                      {(c.modificaciones.length > 0 || c.incidencias.length > 0) && (
                        <div className="cv-pills-row">
                          {c.modificaciones.length > 0 && (
                            <span className="cv-pill-mod">
                              {c.modificaciones.length} modificación(es) · +{((c.importeActual - c.importeOriginal) / 1_000_000).toFixed(1)}M€
                            </span>
                          )}
                          {c.incidencias.filter(i => i.estado !== 'Resuelta').length > 0 && (
                            <span className="cv-pill-inc">
                              {c.incidencias.filter(i => i.estado !== 'Resuelta').length} incidencia(s) abiertas
                            </span>
                          )}
                          {c.prorrogasUsadas > 0 && (
                            <span className="cv-pill-pror">
                              {c.prorrogasUsadas} prórroga(s) usadas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {/* ───── TAB · Vencimientos ───── */}
        {tab === 'vencimientos' && (
          <section className="cv-section-card">
            <h3 className="cv-section-title">Calendario de vencimientos · próximos 12 meses</h3>
            <p className="cv-section-sub">Contratos con fin de ejecución previsto · ordenados por urgencia</p>
            <div className="cv-venc-list">
              {vencimientosTop.map(c => {
                const cc = c.diasParaFin <= 30 ? '#DC2626' : c.diasParaFin <= 90 ? '#F97316' : c.diasParaFin <= 180 ? '#EAB308' : '#16A34A'
                return (
                  <div
                    key={c.id}
                    className="cv-venc-row"
                    style={{ borderLeft: `3px solid ${cc}` }}
                  >
                    <div className="cv-venc-dias-box">
                      <div className="cv-venc-dias-num" style={{ color: cc }}>{c.diasParaFin}</div>
                      <div className="cv-venc-dias-label">días</div>
                    </div>
                    <div>
                      <div className="cv-venc-meta">{c.fechaFinPrev} · EXP. {c.exp}</div>
                      <div className="cv-venc-titulo">{c.titulo}</div>
                      <div className="cv-venc-adj">{c.adjudicatario} · {c.prorrogasUsadas}/{c.prorrogasMax} prórrogas usadas</div>
                    </div>
                    <div className="cv-venc-importe-box">
                      <div className="cv-venc-importe">{(c.importeActual / 1_000_000).toFixed(1)}M€</div>
                      <div className="cv-venc-ejec">{Math.round((c.importeEjecutado / c.importeActual) * 100)}% ejecutado</div>
                    </div>
                    <span
                      className="cv-venc-tag"
                      style={{ background: `${cc}15`, color: cc, border: `1px solid ${cc}40` }}
                    >{c.diasParaFin <= 30 ? 'CRÍTICO' : c.diasParaFin <= 90 ? 'PRÓXIMO' : 'PROGRAMADO'}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Modificaciones ───── */}
        {tab === 'modificaciones' && (
          <section className="cv-section-card">
            <h3 className="cv-section-title">Modificaciones, prórrogas y adendas · histórico</h3>
            <p className="cv-section-sub">{totals.totalMod} modificaciones registradas · sobrecoste agregado {(totals.importeMod / 1_000_000).toFixed(0)}M€ ({totals.original ? Math.round((totals.importeMod/totals.original)*100) : 0}% sobre original)</p>
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    {['Fecha','Tipo','Contrato','Adjudicatario','Importe','Motivo'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contratos.flatMap(c => c.modificaciones.map(m => ({ c, m })))
                    .sort((a, b) => parseDate(b.m.fecha).getTime() - parseDate(a.m.fecha).getTime())
                    .map(({ c, m }, i) => {
                      const tColor = m.tipo === 'Modificado' ? '#F97316' : m.tipo === 'Prórroga' ? '#0EA5E9' : m.tipo === 'Adenda' ? '#7C3AED' : '#525258'
                      return (
                        <tr key={i} className={i % 2 ? 'cv-table-row--alt' : 'cv-table-row--white'}>
                          <td className="cv-table-fecha">{m.fecha}</td>
                          <td>
                            <span className="cv-table-pill-tipo" style={{ background: tColor }}>{m.tipo.toUpperCase()}</span>
                          </td>
                          <td className="cv-table-cell-strong">
                            <div className="cv-table-trunc">{c.titulo}</div>
                            <div className="cv-table-exp">EXP. {c.exp}</div>
                          </td>
                          <td className="cv-table-adj">{c.adjudicatario}</td>
                          <td className="cv-table-importe" style={{ color: tColor }}>+{(m.importe / 1_000_000).toFixed(1)}M€</td>
                          <td className="cv-table-motivo">{m.motivo}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Incidencias ───── */}
        {tab === 'incidencias' && (
          <section className="cv-section-card">
            <h3 className="cv-section-title">Incidencias, penalizaciones y litigios</h3>
            <p className="cv-section-sub">{totals.totalInc} incidencias registradas · {totals.incAbiertas} abiertas · {(totals.totalPenal / 1000).toFixed(0)}K€ en penalizaciones aplicadas</p>
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    {['Fecha','Tipo','Contrato','Adjudicatario','Descripción','Importe','Estado'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contratos.flatMap(c => c.incidencias.map(i => ({ c, i })))
                    .sort((a, b) => parseDate(b.i.fecha).getTime() - parseDate(a.i.fecha).getTime())
                    .map(({ c, i }, idx) => {
                      const tColor = i.tipo === 'Litigio' ? '#DC2626' : i.tipo === 'Penalización' ? '#F97316' : i.tipo === 'Reclamación' ? '#EAB308' : i.tipo === 'Aviso' ? '#0EA5E9' : '#5B21B6'
                      const eColor = i.estado === 'Abierta' ? '#DC2626' : i.estado === 'En curso' ? '#F97316' : '#16A34A'
                      return (
                        <tr key={idx} className={idx % 2 ? 'cv-table-row--alt' : 'cv-table-row--white'}>
                          <td className="cv-table-fecha">{i.fecha}</td>
                          <td>
                            <span className="cv-table-pill-tipo" style={{ background: tColor }}>{i.tipo.toUpperCase()}</span>
                          </td>
                          <td className="cv-table-cell-strong cv-table-cell-strong--narrow">
                            <div className="cv-table-trunc">{c.titulo}</div>
                            <div className="cv-table-exp">EXP. {c.exp}</div>
                          </td>
                          <td className="cv-table-adj">{c.adjudicatario}</td>
                          <td className="cv-table-desc">{i.descripcion}</td>
                          <td className="cv-table-importe" style={{ color: tColor }}>{i.importe ? `${(i.importe / 1000).toFixed(0)}K€` : '—'}</td>
                          <td>
                            <span
                              className="cv-table-estado-pill"
                              style={{ background: `${eColor}15`, color: eColor, border: `1px solid ${eColor}40` }}
                            >{i.estado.toUpperCase()}</span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Por organismo ───── */}
        {tab === 'organismos' && (
          <section className="cv-section-card cv-section-card--clip">
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    {['#','Organismo','Contratos','Importe vigente','Ejecutado','% Ejec.','Críticos+Altos'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porOrganismo.map((o, i) => {
                    const pctEj = (o.ejecutado / o.importe) * 100
                    return (
                      <tr key={o.org} className={i % 2 ? 'cv-table-row--alt' : 'cv-table-row--white'}>
                        <td className="cv-org-rank cv-td-org-wide">{i+1}</td>
                        <td className="cv-org-name cv-td-org-wide">{o.org}</td>
                        <td className="cv-org-num cv-td-org-wide">{o.num}</td>
                        <td className="cv-org-importe cv-td-org-wide">{(o.importe / 1_000_000).toFixed(1)}M€</td>
                        <td className="cv-org-ejec cv-td-org-wide">{(o.ejecutado / 1_000_000).toFixed(1)}M€</td>
                        <td className="cv-td-org-wide">
                          <div className="cv-org-pctrow">
                            <div className="cv-org-pct-track">
                              <div className="cv-org-pct-fill" style={{ width: `${Math.min(100, pctEj)}%` }}/>
                            </div>
                            <span className="cv-org-pct-text">{pctEj.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="cv-td-org-wide">
                          {o.criticos > 0 ? (
                            <span className="cv-org-criticos">{o.criticos}</span>
                          ) : (
                            <span className="cv-org-criticos-empty">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
      <footer className="cv-footer">
        Monitor de Contratos Vigentes · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div
      className="cv-hero-kpi"
      style={{ '--accent': `${accent}55` } as CSSProperties}
    >
      <div className="cv-hero-kpi-value">{value}</div>
      <div className="cv-hero-kpi-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="cv-section-h2">
      <h2 className="cv-section-h2-title">
        <span className="cv-section-h2-bar" style={{ background: accent }}/>
        {label}
      </h2>
      <span className="cv-section-h2-count">{count}</span>
    </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div className="cv-skpi">
      <div className="cv-skpi-label">{label}</div>
      <div className="cv-skpi-row">
        <span className="cv-skpi-value" style={{ color }}>{value}</span>
        {sub && <span className="cv-skpi-sub">{sub}</span>}
      </div>
      {delta && (
        <div className="cv-skpi-delta" style={{ color: pos ? '#16A34A' : color }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div className="cv-mini">
      <div className="cv-mini-label">{label}</div>
      <div className="cv-mini-value" style={{ color }}>{value}</div>
    </div>
  )
}

function Selector({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="cv-selector">
      <span className="cv-selector-label">{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="cv-selector-select">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
