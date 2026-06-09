'use client'
/**
 * <AgroShell /> · Agro v3 · Sprint A1
 *
 * Shell con 6 sub-tabs deep-linkables (?ag=). Default 'global' preserva
 * el dashboard original World Bank + catálogos curados.
 *
 *   ◉ global     · Visión Global (preserva dashboard original)
 *   ⊞ precios    · Mini-Vesper precios agrícolas + Gemini impacto
 *   ◍ cadena     · Cadena de valor (precio origen vs mayorista vs PVP)
 *   ⬡ produccion · Producción + exportación
 *   ⊟ politica   · PAC + PERTE + Ley Cadena + reguladores
 *   ◐ sequia     · Sequía estructural + ENESA + embalses
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { AgroGlobalView } from './AgroGlobalView'
import { AgroPreciosView } from './AgroPreciosView'
import { AgroCadenaView } from './AgroCadenaView'
import { AgroProduccionView } from './AgroProduccionStub'
import { AgroPoliticaView } from './AgroPoliticaView'
import { AgroSequiaView } from './AgroSequiaView'
import type { AgroTabId } from '@/lib/agro/catalogos'

interface SeccionTab {
  id: AgroTabId
  label: string
  glyph: string
  desc: string
}

const SECCIONES: SeccionTab[] = [
  { id: 'global',     label: 'Visión Global',        glyph: '◉', desc: 'World Bank · empresas · áreas' },
  { id: 'precios',    label: 'Lonjas y Precios',     glyph: '⊞', desc: 'Vesper agrícola + análisis Gemini' },
  { id: 'cadena',     label: 'Cadena de Valor',      glyph: '◍', desc: 'Origen · mayorista · PVP · AICA' },
  { id: 'produccion', label: 'Producción',           glyph: '⬡', desc: 'MAPA + Eurostat + Comext' },
  { id: 'politica',   label: 'PAC y Política',       glyph: '⊟', desc: '47 bn € · PERTE · Ley Cadena' },
  { id: 'sequia',     label: 'Sequía y Agua',        glyph: '◐', desc: 'MITECO · ENESA · embalses' },
]

export default function AgroShell() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [tab, setTab] = useUrlState<AgroTabId>('ag', 'global')
  const activa = SECCIONES.find((s) => s.id === tab) ?? SECCIONES[0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <nav
        aria-label="Sección del sector agroalimentario"
        style={{
          position: 'sticky',
          top: 44,
          zIndex: 40,
          background: 'rgba(251,251,253,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: '0 auto',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {SECCIONES.map((s) => {
            const active = s.id === activa.id
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                title={s.desc}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1d1d1f' : '#6e6e73',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #1d1d1f' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-text)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </nav>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {activa.id === 'global' ? (
          <AgroGlobalView />
        ) : activa.id === 'precios' ? (
          <AgroPreciosView />
        ) : activa.id === 'cadena' ? (
          <AgroCadenaView />
        ) : activa.id === 'produccion' ? (
          <AgroProduccionView />
        ) : activa.id === 'politica' ? (
          <AgroPoliticaView />
        ) : (
          <AgroSequiaView />
        )}
      </main>
    </div>
  )
}
