'use client'
import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { DIPUTACIONES_FIXTURE } from '@/data/diputaciones-fixture'
import type { DossierApartado, DossierItem } from '@/data/dosieres-fixture'

const APARTADO_LABEL: Record<string, string> = {
  identidad: 'Identidad',
  trayectoria: 'Trayectoria',
  posiciones: 'Posiciones',
  redes: 'Redes y nexos',
  declaraciones: 'Declaraciones',
  controversias: 'Controversias',
  evidencia: 'Evidencia y enlaces',
}

const APARTADO_COLOR: Record<string, string> = {
  identidad: '#7c3aed',
  trayectoria: '#6e6e73',
  posiciones: '#0891b2',
  redes: '#0F766E',
  declaraciones: '#B45309',
  controversias: '#991B1B',
  evidencia: '#374151',
}

const CCAA_LABEL: Record<string, string> = {
  andalucia: 'Andalucía', aragon: 'Aragón', cyl: 'Castilla y León',
  clm: 'Castilla-La Mancha', cataluna: 'Cataluña',
  'c-valenciana': 'Comunidad Valenciana', extremadura: 'Extremadura',
  galicia: 'Galicia', euskadi: 'País Vasco',
}

const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030', PSDEG: '#C53030',
  PP: '#2D4A8A', PNV: '#0F766E',
  JUNTS: '#1FA89B', ERC: '#FFB30F',
}

export default function DiputacionesDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const dossier = useMemo(
    () => DIPUTACIONES_FIXTURE.find(d => d.slug === slug),
    [slug],
  )

  if (!dossier) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppHeader />
        <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 28px' }}>
          <Link href="/diputaciones" style={{ color: '#0071e3', textDecoration: 'none', fontSize: 13 }}>⟵ Volver al listado de Diputaciones</Link>
          <h1 style={{ marginTop: 16 }}>Dossier no encontrado</h1>
          <p style={{ color: '#6e6e73' }}>No hay ningún dossier con el slug <code>{slug}</code>.</p>
        </main>
      </div>
    )
  }

  const ccaa = dossier.tags.find(t => t.toLowerCase().startsWith('ccaa:'))?.split(':')[1]
  const ccaaLabel = ccaa ? CCAA_LABEL[ccaa] : null
  const partidoColor = dossier.partido ? (PARTIDO_COLOR[dossier.partido] ?? '#7c3aed') : '#7c3aed'
  const initial = (dossier.alias || dossier.nombre_completo).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 64px' }}>
        <Link href="/diputaciones" style={{ color: '#0071e3', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 18 }}>
          ⟵ Volver a Diputaciones Provinciales
        </Link>

        {/* Hero · color de partido si lo hay, si no morado/regional */}
        <header style={{
          background: `linear-gradient(135deg, ${partidoColor} 0%, ${partidoColor}c8 100%)`,
          borderRadius: 16, padding: '28px 32px', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24,
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32,
            border: '2px solid rgba(255,255,255,0.3)',
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.85 }}>
              Diputación Provincial · dossier completo
              {dossier.partido && ` · ${dossier.partido}`}
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, margin: '6px 0 4px', letterSpacing: '-0.022em', lineHeight: 1.1 }}>
              {dossier.nombre_completo}
            </h1>
            {dossier.cargo_actual && (
              <p style={{ fontSize: 15, opacity: 0.92, margin: 0, lineHeight: 1.4 }}>
                {dossier.cargo_actual}
              </p>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {ccaaLabel && <span style={chipDarkStyle()}>{ccaaLabel}</span>}
              {dossier.tags.slice(0, 6).map(t => (
                <span key={t} style={chipDarkStyle()}>{t}</span>
              ))}
            </div>
          </div>
        </header>

        {/* Bio corta */}
        {dossier.bio_corta && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: 20,
            border: '1px solid #ECECEF', marginBottom: 24,
            fontSize: 15, lineHeight: 1.6, color: '#1d1d1f',
          }}>
            {dossier.bio_corta}
          </div>
        )}

        {/* Apartados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {dossier.apartados.map(apartado => (
            <ApartadoCard key={apartado.id} apartado={apartado} />
          ))}
        </div>

        {dossier.fuente_principal && (
          <div style={{ marginTop: 26, fontSize: 12.5, color: '#6e6e73' }}>
            Fuente principal:{' '}
            <a href={dossier.fuente_principal} target="_blank" rel="noreferrer" style={{ color: '#0071e3' }}>
              {dossier.fuente_principal}
            </a>
          </div>
        )}
      </main>
    </div>
  )
}

function ApartadoCard({ apartado }: { apartado: DossierApartado }) {
  const color = APARTADO_COLOR[apartado.tipo] || '#6e6e73'
  const label = APARTADO_LABEL[apartado.tipo] || apartado.tipo

  if (apartado.items.length === 0) return null

  return (
    <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #ECECEF', overflow: 'hidden' }}>
      <header style={{
        background: `${color}10`, borderBottom: `1px solid ${color}30`,
        padding: '12px 18px', display: 'flex', alignItems: 'baseline', gap: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: color,
        }}>{label}</span>
        <span style={{ fontSize: 11, color: '#86868b' }}>
          {apartado.items.length} item{apartado.items.length === 1 ? '' : 's'}
        </span>
      </header>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {apartado.items.map(item => (
          <ItemRow key={item.id} item={item} color={color} />
        ))}
      </div>
    </section>
  )
}

function ItemRow({ item, color }: { item: DossierItem; color: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}40`, paddingLeft: 12 }}>
      {item.titulo && (
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: '#1d1d1f' }}>
          {item.titulo}
          {item.fecha && (
            <span style={{ fontSize: 11, color: '#86868b', fontWeight: 500, marginLeft: 8 }}>
              {item.fecha}
            </span>
          )}
        </h4>
      )}
      <p style={{ fontSize: 13, lineHeight: 1.55, color: '#3a3a3c', margin: 0, whiteSpace: 'pre-wrap' }}>
        {item.contenido}
      </p>
      {item.fuente_url && (
        <a href={item.fuente_url} target="_blank" rel="noreferrer"
           style={{ fontSize: 11.5, color: '#0071e3', textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>
          {item.fuente_titulo || 'Ver fuente'} ⟶
        </a>
      )}
      {item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {item.tags.map(t => (
            <span key={t} style={{
              fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
              background: '#F4F4F6', color: '#6e6e73', fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function chipDarkStyle(): React.CSSProperties {
  return {
    padding: '3px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.18)',
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: '0.04em',
  }
}
