'use client'
import './litigios-contratacion.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useLitigios } from '@/hooks/contratacion/useLitigios'
import type {
  TipoLitigio, TribunalLitigio, EstadoLitigio, SeveridadLitigio, FaseLitigio,
} from '@/types/contratacion'

const TIPO_COLOR: Record<TipoLitigio, string> = {
  'Recurso especial':'#5B21B6', 'Recurso CA':'#1F4E8C', 'Sanción':'#DC2626',
  'Reclamación':'#F97316', 'Resolución contrato':'#525258', 'Litigio civil':'#7C3AED',
  'Penal':'#B91C1C', 'Arbitraje':'#0F766E',
}
const TRIB_COLOR: Record<TribunalLitigio, string> = {
  'TACRC':'#1F4E8C', 'TACP Madrid':'#DC2626', 'OARC Andalucía':'#16A34A',
  'TCCSP Catalunya':'#F97316', 'TS · Supremo':'#5B21B6', 'AN · Audiencia Nacional':'#525258',
  'TSJ':'#7C3AED', 'Audiencia Provincial':'#0EA5E9',
  'Tribunal Cuentas':'#0F766E', 'JEC':'#9333EA', 'Comisión Europea':'#003399',
}
const ESTADO_COLOR: Record<EstadoLitigio, string> = {
  'Admitido':'#0EA5E9', 'En instrucción':'#F97316', 'Sentencia 1ª inst.':'#5B21B6',
  'Recurrido':'#DC2626', 'Firme · estimado':'#16A34A', 'Firme · desestimado':'#DC2626',
  'Cautelar':'#EAB308', 'Archivado':'#525258',
}
const SEV_COLOR: Record<SeveridadLitigio, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const FASE_META: Record<FaseLitigio, { color: string; pct: number }> = {
  'Activa':              { color:'#DC2626', pct:25 },
  'En recurso':          { color:'#F97316', pct:50 },
  'Resuelta · favorable':{ color:'#16A34A', pct:100 },
  'Resuelta · adversa':  { color:'#DC2626', pct:100 },
  'Suspendida':          { color:'#EAB308', pct:30 },
}

// Static analytics data
const TRIBUNALES_AGG = [
  { trib:'TACRC',                  casos:38, ratio:34, tiempoMedio:142 },
  { trib:'TACP Madrid',             casos:18, ratio:42, tiempoMedio: 98 },
  { trib:'TS · Supremo',            casos:12, ratio:55, tiempoMedio:524 },
  { trib:'AN · Audiencia Nacional', casos: 8, ratio:62, tiempoMedio:482 },
  { trib:'TSJ',                     casos:14, ratio:48, tiempoMedio:288 },
  { trib:'OARC Andalucía',          casos:11, ratio:38, tiempoMedio:124 },
  { trib:'TCCSP Catalunya',         casos: 8, ratio:32, tiempoMedio:118 },
  { trib:'Tribunal Cuentas',        casos: 6, ratio:48, tiempoMedio:710 },
  { trib:'Comisión Europea',         casos: 4, ratio:30, tiempoMedio:540 },
]

const JURISPRUDENCIA = [
  {
    referencia:'STS 2024/4892',
    titulo:'Reversión concesiones · ITV Madrid',
    fecha:'12/02/2026',
    sala:'Sala 3ª (Contencioso)',
    materia:'Contratos administrativos · concesión',
    resumen:'TS confirma que la reversión de una concesión sin causa de utilidad pública demostrada genera derecho a indemnización. Eleva indemnización a 18M€ · sienta precedente nacional.',
    impacto:'CRÍTICO',
  },
  {
    referencia:'STS 2025/3214',
    titulo:'Modificados · límite del 50% (Acciona)',
    fecha:'18/09/2025',
    sala:'Sala 3ª',
    materia:'Modificación contractual',
    resumen:'TS limita los modificados acumulados al 50% del importe inicial salvo causa imprevisible debidamente justificada. Refuerza el control jurisdiccional sobre las modificaciones.',
    impacto:'ALTO',
  },
  {
    referencia:'TJUE C-456/24',
    titulo:'Pliegos discriminatorios · pyme y mercados internos',
    fecha:'04/03/2026',
    sala:'TJUE Gran Sala',
    materia:'Derecho UE de la contratación',
    resumen:'TJUE refuerza la doctrina contraria a los pliegos con criterios técnicos restrictivos que dificultan el acceso de pymes y operadores de otros Estados miembro.',
    impacto:'ALTO',
  },
  {
    referencia:'TACRC 2025/2845',
    titulo:'UTE de grandes empresas · indicios de competencia desleal',
    fecha:'22/01/2026',
    sala:'TACRC',
    materia:'Recursos especiales',
    resumen:'TACRC declara que las UTE entre las 3 mayores empresas del sector pueden constituir indicios de prácticas anticompetitivas y obliga a una motivación reforzada.',
    impacto:'MEDIO',
  },
  {
    referencia:'STS 2024/8124',
    titulo:'Procedimiento emergencia · proporcionalidad',
    fecha:'30/11/2024',
    sala:'Sala 3ª',
    materia:'Emergencia · LCSP art. 120',
    resumen:'TS exige justificación reforzada para uso del procedimiento de emergencia · obligación de licitar lotes una vez superada la fase aguda. Aplicable a contratación post-DANA.',
    impacto:'CRÍTICO',
  },
]

const IMPACTO_COLOR: Record<string, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}

export default function LitigiosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, loading } = useLitigios()
  const casos = data?.casos ?? []

  const [tab, setTab] = useState<'casos' | 'tribunales' | 'jurisprudencia' | 'mapa'>('casos')
  const [selectedId, setSelectedId] = useState<string>('')
  const [filterSev, setFilterSev] = useState<SeveridadLitigio | 'Todos'>('Todos')
  const [filterFase, setFilterFase] = useState<FaseLitigio | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (casos.length > 0 && !selectedId) setSelectedId(casos[0].id)
  }, [casos, selectedId])

  const selected = useMemo(() => casos.find(c => c.id === selectedId) ?? casos[0], [casos, selectedId])

  const totals = useMemo(() => {
    const importeTotal = casos.reduce((s, c) => s + c.importeImpacto, 0)
    const activos = casos.filter(c => c.fase === 'Activa' || c.fase === 'En recurso').length
    const criticos = casos.filter(c => c.severidad === 'CRÍTICO').length
    const penales = casos.filter(c => c.tipo === 'Penal').length
    const favorables = casos.filter(c => c.fase === 'Resuelta · favorable').length
    const adversos = casos.filter(c => c.fase === 'Resuelta · adversa').length
    const ratio = (favorables + adversos) > 0 ? Math.round((favorables / (favorables + adversos)) * 100) : 0
    return { total: casos.length, importeTotal, activos, criticos, penales, ratio }
  }, [casos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return casos
      .filter(c => filterSev  === 'Todos' || c.severidad === filterSev)
      .filter(c => filterFase === 'Todos' || c.fase === filterFase)
      .filter(c => !q || c.titulo.toLowerCase().includes(q) || c.recurrente.toLowerCase().includes(q) || c.recurrido.toLowerCase().includes(q) || c.expCaso.toLowerCase().includes(q))
      .sort((a,b) => {
        const order: Record<SeveridadLitigio, number> = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 }
        return order[a.severidad] - order[b.severidad]
      })
  }, [casos, filterSev, filterFase, query])

  if (loading) return (
    <div className="lc-root">
      <AppHeader/>
      <main className="lc-main lc-main--loading">
        <div className="lc-loading-msg">Cargando litigios…</div>
      </main>
    </div>
  )

  return (
    <div className="lc-root">
      <AppHeader/>
      <main className="lc-main">

        {/* ───── Hero ───── */}
        <section className="lc-hero">
          <div>
            <p className="lc-hero-kicker">
              LICITACIONES Y CONTRATACIÓN PÚBLICA · RIESGO Y LITIGIOS
            </p>
            <h1 className="lc-hero-title">
              {totals.total} casos vivos · {(totals.importeTotal/1_000_000).toFixed(0)} M€ <em className="lc-hero-em">en disputa</em>
            </h1>
            <p className="lc-hero-sub">
              {totals.criticos} críticos · {totals.penales} causas penales abiertas · win rate del {totals.ratio}% en resoluciones firmes. Seguimiento de TACRC, OARC, TACP, TS, AN, TSJ, Tribunal de Cuentas, Comisión Europea y JEC.
            </p>
          </div>
          <div className="lc-hero-kpis">
            <HeroKPI label="Casos vivos"  value={String(totals.total)}        accent="#FCA5A5"/>
            <HeroKPI label="Críticos"      value={String(totals.criticos)}     accent="#DC2626"/>
            <HeroKPI label="Penales"       value={String(totals.penales)}       accent="#FCD34D"/>
            <HeroKPI label="Win rate"      value={`${totals.ratio}%`}           accent="#86EFAC"/>
          </div>
        </section>

        {/* ───── Snapshot ───── */}
        <section className="lc-snapshot">
          <SectionHeader label="Snapshot del riesgo legal" count="Datos al cierre Q1-2026" accent="#7F1D1D"/>
          <div className="lc-skpi-grid">
            <SKpi label="Importe en disputa"  value={`${(totals.importeTotal/1_000_000).toFixed(0)}`} sub="M€"        color="#DC2626"/>
            <SKpi label="Casos activos"       value={String(totals.activos)} sub="en curso"            delta={`+12% vs Q4-25`} color="#F97316"/>
            <SKpi label="Tiempo medio resol."  value="285"                  sub="días promedio"        color="#5B21B6"/>
            <SKpi label="Penalizaciones evit."value={`${(totals.importeTotal*0.18/1_000_000).toFixed(0)}M€`} sub="estimación"  color="#16A34A"/>
            <SKpi label="Win rate firme"      value={`${totals.ratio}%`}    sub="vs 30% media sector"  pos color="#16A34A"/>
            <SKpi label="Recursos TACRC"      value="38"                   sub="casos · 12 meses"     color="#1F4E8C"/>
            <SKpi label="Causas penales"      value={String(totals.penales)} sub="abiertas"            color="#B91C1C"/>
            <SKpi label="Pdtes. resolución"   value="6"                    sub="próximos 60 días"     color="#EAB308"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div className="lc-tabs">
          {([
            { k:'casos',         label:'Casos abiertos',         count: casos.length },
            { k:'tribunales',    label:'Tribunales y órganos',   count: TRIBUNALES_AGG.length },
            { k:'jurisprudencia',label:'Jurisprudencia clave',   count: JURISPRUDENCIA.length },
            { k:'mapa',          label:'Mapa de riesgos',         count: 6 },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} className={`lc-tab${active ? ' lc-tab--active' : ''}`}>
                {t.label} <span className="lc-tab-count">{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Casos ───── */}
        {tab === 'casos' && (
          <>
            <div className="lc-filters">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar caso · expediente · empresa · organismo…"
                className="lc-search"/>
              <Selector label="Severidad" value={filterSev} options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterSev(v as SeveridadLitigio | 'Todos')}/>
              <Selector label="Fase"      value={filterFase} options={['Todos','Activa','En recurso','Resuelta · favorable','Resuelta · adversa','Suspendida']} onChange={v => setFilterFase(v as FaseLitigio | 'Todos')}/>
              <span className="lc-filters-count">{filtered.length} casos · ordenados por severidad</span>
            </div>

            {/* Grid 2 col: lista + detalle del seleccionado */}
            <section className="lc-casos-grid">
              {/* Lista */}
              <div className="lc-casos-list">
                {filtered.map(c => {
                  const active = c.id === selectedId
                  return (
                    <button key={c.id} onClick={() => setSelectedId(c.id)} className="lc-case" style={{
                      border: `1px solid ${active ? SEV_COLOR[c.severidad] : '#ECECEF'}`,
                      boxShadow: active ? `0 0 0 3px ${SEV_COLOR[c.severidad]}22` : '0 1px 3px rgba(0,0,0,0.04)',
                      borderLeft: `4px solid ${SEV_COLOR[c.severidad]}`,
                    }}>
                      <div className="lc-case-tags">
                        <span className="lc-tag-sev" style={{ background: SEV_COLOR[c.severidad] }}>{c.severidad}</span>
                        <span className="lc-tag-tipo" style={{ background:`${TIPO_COLOR[c.tipo]}15`, color:TIPO_COLOR[c.tipo], border:`1px solid ${TIPO_COLOR[c.tipo]}40` }}>{c.tipo.toUpperCase()}</span>
                        <span className="lc-tag-trib" style={{ background:`${TRIB_COLOR[c.tribunal]}15`, color:TRIB_COLOR[c.tribunal], border:`1px solid ${TRIB_COLOR[c.tribunal]}40` }}>{c.tribunal}</span>
                      </div>
                      <h3 className="lc-case-title">{c.titulo}</h3>
                      <div className="lc-case-foot">
                        <span>{c.expCaso}</span>
                        <span className="lc-case-importe" style={{ color: SEV_COLOR[c.severidad] }}>{(c.importeImpacto/1_000_000).toFixed(1)}M€</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Detalle */}
              {selected && (
                <div className="lc-detail" style={{ borderLeft:`4px solid ${SEV_COLOR[selected.severidad]}` }}>
                  <div className="lc-detail-tags">
                    <span className="lc-tag-sev" style={{ background: SEV_COLOR[selected.severidad] }}>{selected.severidad}</span>
                    <span className="lc-tag-tipo--solid" style={{ background: TIPO_COLOR[selected.tipo] }}>{selected.tipo.toUpperCase()}</span>
                    <span className="lc-tag-estado" style={{ background:`${ESTADO_COLOR[selected.estado]}15`, color:ESTADO_COLOR[selected.estado], border:`1px solid ${ESTADO_COLOR[selected.estado]}40` }}>{selected.estado.toUpperCase()}</span>
                  </div>
                  <h2 className="lc-detail-title">{selected.titulo}</h2>
                  <p className="lc-detail-meta">{selected.expCaso} · {selected.tribunal}</p>
                  <p className="lc-detail-resumen">{selected.resumen}</p>
                  <div className="lc-detail-mini-grid">
                    <Mini label="Recurrente"   value={selected.recurrente} sub="parte" color={SEV_COLOR[selected.severidad]}/>
                    <Mini label="Recurrido"    value={selected.recurrido}  sub="parte" color="#525258"/>
                    <Mini label="Importe"      value={`${(selected.importeImpacto/1_000_000).toFixed(1)}M€`} sub="impacto" color="#7F1D1D"/>
                    <Mini label="Próx. acción" value={selected.proxAccion}  sub={selected.fechaProx} color="#5B21B6"/>
                  </div>
                  <div className="lc-detail-fase">
                    <div className="lc-detail-fase-head">
                      <span>Fase: <span style={{ color:FASE_META[selected.fase].color }}>{selected.fase}</span></span>
                      <span>{FASE_META[selected.fase].pct}% del ciclo</span>
                    </div>
                    <div className="lc-fase-track">
                      <div className="lc-fase-fill" style={{ width:`${FASE_META[selected.fase].pct}%`, background:FASE_META[selected.fase].color }}/>
                    </div>
                  </div>
                  <h4 className="lc-detail-h4">Alegaciones principales</h4>
                  <ul className="lc-alegaciones">
                    {selected.alegaciones.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                  <h4 className="lc-detail-h4 lc-detail-h4--hitos">Hitos del caso</h4>
                  <div className="lc-hitos">
                    <div className="lc-hitos-spine"/>
                    {selected.hitos.map((h, i) => (
                      <div key={i} className="lc-hito">
                        <div className="lc-hito-dot-wrap">
                          <div className="lc-hito-dot" style={{ border:`2px solid ${SEV_COLOR[selected.severidad]}` }}/>
                        </div>
                        <div>
                          <div className="lc-hito-tipo">{h.tipo}</div>
                          <div className="lc-hito-nota">{h.nota}</div>
                        </div>
                        <span className="lc-hito-fecha">{h.fecha}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ───── TAB · Tribunales ───── */}
        {tab === 'tribunales' && (
          <section className="lc-tribunales">
            <div className="lc-tribunales-head">
              <h3 className="lc-tribunales-h3">Tribunales y órganos administrativos · agregado</h3>
              <p className="lc-tribunales-sub">Casos por tribunal · ratio de éxito de los recurrentes · tiempo medio de resolución (días)</p>
            </div>
            <div className="lc-table-wrap">
              <table className="lc-table">
                <thead>
                  <tr>
                    {['#','Órgano / Tribunal','Casos · 12m','Ratio éxito recurrente','Tiempo medio','Carga'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...TRIBUNALES_AGG].sort((a,b) => b.casos - a.casos).map((t, i) => {
                    const ratioColor = t.ratio >= 50 ? '#16A34A' : t.ratio >= 35 ? '#F97316' : '#DC2626'
                    const cargaColor = t.casos >= 25 ? '#DC2626' : t.casos >= 12 ? '#F97316' : '#16A34A'
                    return (
                      <tr key={t.trib} className={i % 2 ? 'lc-row--alt' : undefined}>
                        <td className="lc-td-num">{i+1}</td>
                        <td>
                          <span className="lc-trib-badge" style={{ background: TRIB_COLOR[t.trib as TribunalLitigio] || '#6e6e73' }}>{t.trib}</span>
                        </td>
                        <td className="lc-td-casos">{t.casos}</td>
                        <td>
                          <div className="lc-ratio-cell">
                            <div className="lc-ratio-track">
                              <div className="lc-ratio-fill" style={{ width:`${t.ratio}%`, background:ratioColor }}/>
                            </div>
                            <span className="lc-ratio-value" style={{ color: ratioColor }}>{t.ratio}%</span>
                          </div>
                        </td>
                        <td className="lc-td-tiempo" style={{ color: t.tiempoMedio > 365 ? '#DC2626' : t.tiempoMedio > 180 ? '#F97316' : '#16A34A' }}>
                          {t.tiempoMedio}d
                        </td>
                        <td>
                          <span className="lc-carga-badge" style={{ background:`${cargaColor}15`, color:cargaColor, border:`1px solid ${cargaColor}40` }}>{t.casos >= 25 ? 'ALTA' : t.casos >= 12 ? 'MEDIA' : 'BAJA'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="lc-tribunales-foot">
              <Mini2 label="Tribunal más rápido" value="TACP Madrid" sub="98 días media" color="#16A34A"/>
              <Mini2 label="Tribunal más exigente" value="TS · Supremo" sub="55% éxito recurrente" color="#5B21B6"/>
              <Mini2 label="Mayor carga"          value="TACRC"        sub="38 casos · 12m"         color="#DC2626"/>
            </div>
          </section>
        )}

        {/* ───── TAB · Jurisprudencia ───── */}
        {tab === 'jurisprudencia' && (
          <section className="lc-juris-grid">
            {JURISPRUDENCIA.map((j, i) => (
              <article key={i} className="lc-juris-card" style={{ borderLeft:`3px solid ${IMPACTO_COLOR[j.impacto]}` }}>
                <div className="lc-juris-head">
                  <div>
                    <span className="lc-juris-impacto" style={{ background: IMPACTO_COLOR[j.impacto] }}>IMPACTO {j.impacto}</span>
                    <span className="lc-juris-sala">· {j.sala}</span>
                  </div>
                  <span className="lc-juris-fecha">{j.fecha}</span>
                </div>
                <div className="lc-juris-ref" style={{ color: IMPACTO_COLOR[j.impacto] }}>{j.referencia}</div>
                <h3 className="lc-juris-titulo">{j.titulo}</h3>
                <div className="lc-juris-materia">{j.materia}</div>
                <p className="lc-juris-resumen">{j.resumen}</p>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Mapa de riesgos ───── */}
        {tab === 'mapa' && (
          <section className="lc-mapa-grid">
            {/* Heatmap riesgo × probabilidad */}
            <div className="lc-card">
              <h3 className="lc-card-title">Matriz de riesgo · impacto × probabilidad</h3>
              <p className="lc-card-sub">Posición actual de cada caso en el mapa</p>
              <div className="lc-matrix">
                {/* Cuadrantes */}
                <div className="lc-matrix-quadrants">
                  <div className="lc-quad lc-quad--tl">
                    <span className="lc-quad-label lc-quad-label--bajo">BAJO IMPACTO · BAJA PROB.</span>
                  </div>
                  <div className="lc-quad lc-quad--tr">
                    <span className="lc-quad-label lc-quad-label--medio">BAJO IMPACTO · ALTA PROB.</span>
                  </div>
                  <div className="lc-quad lc-quad--bl">
                    <span className="lc-quad-label lc-quad-label--medio">ALTO IMPACTO · BAJA PROB.</span>
                  </div>
                  <div className="lc-quad lc-quad--br">
                    <span className="lc-quad-label lc-quad-label--alto">ALTO IMPACTO · ALTA PROB.</span>
                  </div>
                </div>
                {/* Bubbles */}
                {casos.slice(0, 12).map((c, i) => {
                  const prob = (i * 7 + 23) % 100
                  const imp = Math.min(100, (c.importeImpacto / 5_000_000_000) * 100 + 30)
                  const size = Math.max(12, Math.min(28, c.importeImpacto / 25_000_000))
                  return (
                    <div key={c.id} title={`${c.titulo} (${(c.importeImpacto / 1_000_000).toFixed(0)}M€)`}
                      onClick={() => setSelectedId(c.id)}
                      className="lc-matrix-bubble"
                      style={{
                        left: `${14 + (prob / 100) * 88}%`,
                        bottom: `${14 + (imp / 100) * 78}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        background: SEV_COLOR[c.severidad],
                      }}/>
                  )
                })}
                {/* Labels ejes */}
                <div className="lc-matrix-axis-x">PROBABILIDAD →</div>
                <div className="lc-matrix-axis-y">IMPACTO →</div>
              </div>
            </div>

            {/* Distribución por tipo */}
            <div className="lc-card">
              <h3 className="lc-card-title">Distribución por tipo · 12 meses</h3>
              <p className="lc-card-sub">Casos vivos por tipo de procedimiento</p>
              <div className="lc-dist-list">
                {(Object.keys(TIPO_COLOR) as TipoLitigio[]).map(tipo => {
                  const num = casos.filter(c => c.tipo === tipo).length + Math.floor(Math.random() * 8) + 2
                  const max = 16
                  const w = (num / max) * 100
                  return (
                    <div key={tipo} className="lc-dist-row">
                      <span className="lc-dist-tipo">{tipo}</span>
                      <div className="lc-dist-track">
                        <div className="lc-dist-fill" style={{ width:`${w}%`, background:TIPO_COLOR[tipo] }}/>
                      </div>
                      <span className="lc-dist-num" style={{ color: TIPO_COLOR[tipo] }}>{num}</span>
                    </div>
                  )
                })}
              </div>
              <div className="lc-flag">
                <div className="lc-flag-label">Bandera roja del trimestre</div>
                <p className="lc-flag-msg">Aumento del 28% en recursos especiales (TACRC) y 3 nuevas causas penales abiertas. Vigilar especialmente los procedimientos de emergencia post-DANA y las adjudicaciones de defensa con licitadores únicos.</p>
              </div>
            </div>
          </section>
        )}

      </main>
      <footer className="lc-footer">
        Riesgo y Litigios · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div className="lc-hero-kpi" style={{ border:`1px solid ${accent}55` }}>
      <div className="lc-hero-kpi-value">{value}</div>
      <div className="lc-hero-kpi-label" style={{ color: accent }}>{label}</div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div className="lc-section-head">
      <h2 className="lc-section-title">
        <span className="lc-section-bar" style={{ background: accent }}/>
        {label}
      </h2>
      <span className="lc-section-count">{count}</span>
    </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div className="lc-skpi">
      <div className="lc-skpi-label">{label}</div>
      <div className="lc-skpi-row">
        <span className="lc-skpi-value" style={{ color }}>{value}</span>
        {sub && <span className="lc-skpi-sub">{sub}</span>}
      </div>
      {delta && (
        <div className="lc-skpi-delta" style={{ color: pos ? '#16A34A' : color }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="lc-mini">
      <div className="lc-mini-label">{label}</div>
      <div className="lc-mini-value">{value}</div>
      <div className="lc-mini-sub">{sub}</div>
    </div>
  )
}

function Mini2({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div className="lc-mini2" style={{ borderLeft:`3px solid ${color}` }}>
      <div className="lc-mini2-label">{label}</div>
      <div className="lc-mini2-value" style={{ color }}>{value}</div>
      <div className="lc-mini2-sub">{sub}</div>
    </div>
  )
}

function Selector({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="lc-selector">
      <span className="lc-selector-label">{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="lc-select">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
