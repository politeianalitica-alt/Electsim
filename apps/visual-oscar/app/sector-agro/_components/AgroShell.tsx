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

const ACCENT = '#16A34A'

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
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <nav
          aria-label="Sección del sector agroalimentario"
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 18,
            overflowX: 'auto',
            background: '#fff',
            border: '1px solid #ECECEF',
            borderRadius: 14,
            padding: 4,
          }}
        >
          {SECCIONES.map((s) => {
            const active = s.id === activa.id
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex: '1 1 0',
                  minWidth: 138,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? ACCENT : 'transparent',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span aria-hidden="true" style={{ fontSize: 13, color: active ? '#fff' : ACCENT, opacity: active ? 1 : 0.85 }}>
                    {s.glyph}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.01em',
                      color: active ? '#fff' : '#1d1d1f',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    marginTop: 2,
                    color: active ? 'rgba(255,255,255,0.85)' : '#86868b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.desc}
                </div>
              </button>
            )
          })}
        </nav>

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
