'use client'
/**
 * /sector-defensa/empresas/[ticker]
 * Ficha completa: estructura + programas + joint ventures + compliance + cultura.
 */
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { getEmpresaByTicker } from '@/lib/defense/empresas-cotizadas'

interface Quote { precio: number | null; variacion_pct: number | null; variacion_abs: number | null; moneda: string; mercadoAbierto: boolean | null; ultima_actualizacion: string }

export default function EmpresaFichaPage({ params }: { params: { ticker: string } }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const ticker = decodeURIComponent(params.ticker)
  const e = useMemo(() => getEmpresaByTicker(ticker), [ticker])
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    if (!e) return
    fetch(`/api/defense/empresas`).then(r => r.ok ? r.json() : null).then(d => {
      const found = d?.empresas?.find((x: { ticker: string }) => x.ticker === e.ticker)
      if (found?.cotizacion) setQuote(found.cotizacion)
    })
  }, [e])

  if (!e) {
    return (
      <div style={{ paddingTop: 24, textAlign: 'center', color: '#86868b' }}>
        <p>Empresa {ticker} no encontrada</p>
        <Link href="/sector-defensa/empresas" style={{ color: '#1d1d1f' }}>← Volver al listado</Link>
      </div>
    )
  }

  const varColor = quote?.variacion_pct == null ? '#9CA3AF' : quote.variacion_pct > 0 ? '#16A34A' : '#DC2626'

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 12, fontSize: 11.5 }}>
        <Link href="/sector-defensa/empresas" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>← Empresas cotizadas</Link>
        <span style={{ color: '#9CA3AF', margin: '0 6px' }}>·</span>
        <span style={{ color: '#6e6e73' }}>{e.pais_nombre}</span>
      </div>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #1F4E8C 0%, #1d1d1f 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 14, color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>EMPRESA COTIZADA · {e.exchange}</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, margin: '6px 0 4px', letterSpacing: '-0.02em' }}>{e.nombre}</h1>
            <p style={{ fontSize: 13, opacity: 0.92, margin: 0 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{e.ticker}</span> · {e.sede} ·
              fundada {e.fundacion} · {e.empleados.toLocaleString('es-ES')} empleados
            </p>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {e.segmentos.map(s => (
                <span key={s} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
          {/* Cotización */}
          <div style={{ textAlign: 'right', minWidth: 220 }}>
            <p style={{ margin: 0, fontSize: 9, opacity: 0.7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>COTIZACIÓN</p>
            {quote?.precio != null ? (
              <>
                <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                  {quote.precio.toLocaleString('es-ES', { maximumFractionDigits: 2 })} <span style={{ fontSize: 13, opacity: 0.8 }}>{quote.moneda}</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: varColor === '#16A34A' ? '#86EFAC' : '#FCA5A5', fontWeight: 700 }}>
                  {(quote.variacion_pct ?? 0) > 0 ? '+' : ''}{quote.variacion_pct?.toFixed(2)}% ({(quote.variacion_abs ?? 0) > 0 ? '+' : ''}{quote.variacion_abs?.toFixed(2)})
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7 }}>{quote.mercadoAbierto ? 'Mercado abierto · live' : 'Mercado cerrado · último cierre'}</p>
              </>
            ) : (
              <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.7 }}>No cotizada</p>
            )}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
        <KPI label="REVENUE TOTAL" value={`${e.revenue_total_USD_b.toFixed(1)} bn$`} color="#1d1d1f"/>
        <KPI label="REVENUE DEFENSA" value={`${e.revenue_defensa_USD_b.toFixed(1)} bn$`} color="#1F4E8C" sub={`${e.pct_defensa}% del total`}/>
        <KPI label="RANKING SIPRI" value={`#${e.ranking_sipri}`} color="#7C3AED" sub="Top 100 defensa"/>
        <KPI label="EMPLEADOS" value={`${(e.empleados / 1000).toFixed(0)}k`} color="#0EA5E9"/>
        <KPI label="EXPOSICIÓN SANCIONES" value={e.exposicion_sanciones} color={e.exposicion_sanciones === 'alta' ? '#DC2626' : e.exposicion_sanciones === 'media' ? '#F97316' : '#16A34A'}/>
      </div>

      {/* ESTRUCTURA EJECUTIVA */}
      <Panel title="Estructura ejecutiva" subtitle="CEO + responsables por área de negocio" marginBottom>
        <div style={{ marginBottom: 12, padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: '3px solid #1F4E8C' }}>
          <p style={{ margin: 0, fontSize: 9.5, color: '#1F4E8C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CHIEF EXECUTIVE OFFICER</p>
          <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{e.estructura.ceo.nombre}</p>
          {e.estructura.ceo.desde && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>CEO desde {e.estructura.ceo.desde}</p>}
          {e.estructura.ceo.trayectoria && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#3a3a3d' }}><strong>Trayectoria:</strong> {e.estructura.ceo.trayectoria}</p>}
          {e.estructura.ceo.perfil && <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#3a3a3d' }}><strong>Perfil:</strong> {e.estructura.ceo.perfil}</p>}
        </div>
        {e.estructura.areas_clave && e.estructura.areas_clave.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
            {e.estructura.areas_clave.map(a => (
              <div key={a.area} style={{ padding: 10, background: '#FAFAFA', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{a.area}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#3a3a3d', fontWeight: 600 }}>{a.responsable}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#6e6e73', lineHeight: 1.4 }}>{a.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* PROGRAMAS Y CAPACIDADES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Capacidades clave">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {e.capacidades_clave.map(c => (
              <li key={c} style={{ fontSize: 11, padding: '4px 10px', background: '#1F4E8C15', color: '#1F4E8C', borderRadius: 6, fontWeight: 600 }}>{c}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Programas activos">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {e.programas_activos.map(p => (
              <li key={p} style={{ fontSize: 11.5, padding: '6px 10px', background: '#FAFAFA', borderRadius: 6, borderLeft: '2px solid #16A34A' }}>{p}</li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* JOINT VENTURES */}
      {e.joint_ventures.length > 0 && (
        <Panel title={`Joint ventures + alianzas estratégicas · ${e.joint_ventures.length}`} marginBottom>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8 }}>
            {e.joint_ventures.map(jv => (
              <div key={jv.nombre} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderTop: '3px solid #7C3AED' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{jv.nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>Participación: {jv.participacion}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#3a3a3d' }}>{jv.actividad}</p>
                {jv.socios.length > 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
                    Socios: <strong>{jv.socios.join(' · ')}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* FILIALES + EXPORTACIONES + GRUPOS DE TRABAJO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Filiales principales">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {e.filiales_principales.map(f => (
              <li key={f} style={{ fontSize: 11, padding: '4px 8px', background: '#FAFAFA', borderRadius: 4 }}>{f}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Exportaciones principales">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {e.exportaciones_principales.map(p => (
              <li key={p} style={{ fontSize: 11, padding: '4px 8px', background: '#FAFAFA', borderRadius: 4, color: '#16A34A' }}>{p}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Grupos de trabajo participados">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {e.grupos_trabajo.map(g => (
              <li key={g} style={{ fontSize: 11, padding: '4px 8px', background: '#FAFAFA', borderRadius: 4, color: '#7C3AED' }}>{g}</li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* COMPLIANCE + CULTURA + LIMITACIONES */}
      <Panel title="Compliance + cultura + estrategia" marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: '#1F4E8C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CERTIFICACIONES COMPLIANCE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {e.compliance_certificaciones.map(c => (
                <span key={c} style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: '#16A34A15', color: '#16A34A', fontWeight: 600 }}>{c}</span>
              ))}
            </div>
            <p style={{ margin: '14px 0 6px', fontSize: 10, color: '#7C3AED', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CULTURA DEFENSA</p>
            <p style={{ margin: 0, fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{e.cultura_defensa}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>LIMITACIONES + RIESGOS</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5 }}>
              {e.limitaciones.map(l => <li key={l}>{l}</li>)}
            </ul>
            <p style={{ margin: '14px 0 6px', fontSize: 10, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>NOVEDADES 2026</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5 }}>
              {e.novedades_2026.map(n => <li key={n}>{n}</li>)}
            </ul>
          </div>
        </div>
      </Panel>

      {/* FOOTER */}
      <div style={{ padding: 10, background: '#FAFAFB', borderRadius: 8, fontSize: 10.5, color: '#6e6e73', display: 'flex', justifyContent: 'space-between' }}>
        <span>Web oficial: <a href={e.web} target="_blank" rel="noopener noreferrer" style={{ color: '#1F4E8C', fontWeight: 600 }}>{e.web}</a></span>
        <span>Cotización: Yahoo Finance · Datos corporativos: informes anuales + SIPRI 2024</span>
      </div>

      <SectorMapPreview sector="defensa" marginTop={28} />
    </div>
  )
}

function KPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
