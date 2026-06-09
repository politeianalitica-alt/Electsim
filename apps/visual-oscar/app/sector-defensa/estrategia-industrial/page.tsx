'use client'
/**
 * /sector-defensa/estrategia-industrial
 * Selector de país + visión agregada de estrategias industriales de defensa.
 */
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { ESTRATEGIAS } from '@/lib/defense/estrategias'

export default function EstrategiaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · ESTRATEGIA INDUSTRIAL
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Estrategia industrial de defensa por país
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          Documentos estratégicos oficiales · organigrama institucional completo · base industrial con primes/tier1 ·
          objetivos de capacidad declarados · empresas con ticker bursátil + capacidades + exportaciones
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        <KPI label="PAÍSES CUBIERTOS" value={String(ESTRATEGIAS.length)} color="#1d1d1f"/>
        <KPI label="DOCS ESTRATÉGICOS" value={String(ESTRATEGIAS.reduce((s, e) => s + e.documentos_estrategicos.length, 0))} color="#1F4E8C"/>
        <KPI label="EMPRESAS TRACTORAS" value={String(ESTRATEGIAS.reduce((s, e) => s + e.empresas_clave.length, 0))} color="#7C3AED"/>
        <KPI label="OBJETIVOS DECLARADOS" value={String(ESTRATEGIAS.reduce((s, e) => s + e.objetivos_capacidad.length, 0))} color="#16A34A"/>
      </div>

      {/* GRID DE PAÍSES */}
      <Panel title="Selecciona país" subtitle="Cada ficha incluye estrategia, organigrama SVG, empresas y objetivos de capacidad">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
          {ESTRATEGIAS.map(e => (
            <Link key={e.iso3} href={`/sector-defensa/estrategia-industrial/${e.iso3}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 16, background: '#FAFAFA', borderRadius: 12, border: '1px solid #ECECEF', borderLeft: '4px solid #1F4E8C', minHeight: 220 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 34, height: 20, background: '#1d1d1f', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontFamily: 'monospace' }}>{e.iso3}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{e.nombre}</span>
                </div>
                {/* Docs estratégicos */}
                <p style={{ margin: '8px 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  DOCUMENTOS ESTRATÉGICOS ({e.documentos_estrategicos.length})
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {e.documentos_estrategicos.slice(0, 2).map((d, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#1d1d1f', lineHeight: 1.3, marginBottom: 2 }}>
                      <strong>{d.titulo}</strong> <span style={{ color: '#9CA3AF' }}>({d.año})</span>
                    </li>
                  ))}
                </ul>
                {/* Empresas top */}
                <p style={{ margin: '8px 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  PRIMES ({e.empresas_clave.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {e.empresas_clave.slice(0, 5).map(c => (
                    <span key={c.nombre} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#fff', border: '1px solid #ECECEF', color: '#3a3a3d' }}>
                      {c.nombre.length > 22 ? c.nombre.slice(0, 21) + '…' : c.nombre}
                    </span>
                  ))}
                  {e.empresas_clave.length > 5 && (
                    <span style={{ fontSize: 9.5, color: '#9CA3AF', padding: '2px 6px' }}>+{e.empresas_clave.length - 5}</span>
                  )}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 10.5, color: '#1F4E8C', fontWeight: 600 }}>
                  Ver ficha completa →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <SectorMapPreview sector="defensa" marginTop={28} />
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
