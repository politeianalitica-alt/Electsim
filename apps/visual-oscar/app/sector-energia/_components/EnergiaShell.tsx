'use client'
/**
 * <EnergiaShell /> · Sprint Energía S1
 *
 * Navegación de 2 niveles para /sector-energia. El primer nivel es una barra
 * superior con los 7 tipos de energía (Visión Global · Eléctrico · Renovables
 * · Nuclear · Petróleo · Gas · Hidrógeno). El tipo activo se controla con
 * `?energia=` en la URL (deep-linkable, SSR-prefetch friendly) usando el hook
 * `useUrlState` existente.
 *
 * Default (S4+) = 'global' · la landing cross-energía <VisionGlobalView />.
 * Antes de S4 era 'electrico' (Visión Global aún no existía).
 *
 * Lazy mount: solo se monta la vista del tipo activo (igual que
 * EsiosTabsSection), evitando 7×N fetches al cargar.
 *
 *   - 'global'     → <VisionGlobalView /> (landing cross-energía · S4)
 *   - 'electrico'  → <ElectricoView /> (todo el contenido actual · ESIOS intacto)
 *   - 'renovables' → <RenovablesView /> (tecnologías · factor carga · PNIEC · S5)
 *   - 'nuclear'    → <NuclearView /> (parque ES · cierre 2027-2035 · global · S6)
 *   - 'petroleo'   → <PetroleoView /> (Brent/WTI/OPEP · refino · dependencia · S7)
 *   - 'gas'        → <GasView /> (Henry Hub/TTF · almacenamiento AGSI · GNL · S8)
 *   - 'hidrogeno'  → <HidrogenoView /> (PERTE H2 · EU Hydrogen Bank · H2Med · S9)
 *
 * Cero emojis (CLAUDE.md §0.5): se usan caracteres Unicode (◆ ◉ ⬡).
 */
import { useUrlState } from '@/lib/useUrlState'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { ElectricoView } from './ElectricoView'
import { VisionGlobalView } from './VisionGlobalView'
import { RenovablesView } from './RenovablesView'
import { NuclearView } from './NuclearView'
import { PetroleoView } from './PetroleoView'
import { GasView } from './GasView'
import { HidrogenoView } from './HidrogenoView'
import type { EnergiaTipo } from '@/lib/energia/types'

interface TipoTab {
  id: EnergiaTipo
  label: string
  /** Marca Unicode (no emoji) para la barra. */
  glyph: string
  desc: string
}

const TIPOS: TipoTab[] = [
  { id: 'global',     label: 'Visión Global', glyph: '◉', desc: 'Overview cross-energía'         },
  { id: 'electrico',  label: 'Eléctrico',     glyph: '◆', desc: 'ESIOS · red · mercado'          },
  { id: 'renovables', label: 'Renovables',    glyph: '⬡', desc: 'Eólica · solar · PNIEC'         },
  { id: 'nuclear',    label: 'Nuclear',       glyph: '◈', desc: 'Parque ES · calendario cierre'  },
  { id: 'petroleo',   label: 'Petróleo',      glyph: '◐', desc: 'Brent · WTI · refino'           },
  { id: 'gas',        label: 'Gas',           glyph: '◇', desc: 'TTF · MIBGAS · almacenamiento'  },
  { id: 'hidrogeno',  label: 'Hidrógeno',     glyph: '⬢', desc: 'PERTE H2 · electrolizadores'    },
]

export default function EnergiaShell() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Default (S4+) = 'global' · la landing cross-energía es la sección de entrada.
  const [tipo, setTipo] = useUrlState<EnergiaTipo>('energia', 'global')
  const activo = TIPOS.find(t => t.id === tipo) ?? TIPOS[0]

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
      {/* ───── Barra superior · tipo de energía (nivel 1) ───── */}
 <nav
        aria-label="Tipo de energía"
        style={{
          position:'sticky', top:44, zIndex:40,
          background:'rgba(251,251,253,0.92)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          borderBottom:'1px solid rgba(0,0,0,0.07)',
        }}
      >
 <div style={{
          maxWidth:1500, margin:'0 auto', padding:'0 28px',
          display:'flex', alignItems:'stretch', gap:0,
          overflowX:'auto', scrollbarWidth:'none',
        }}>
          {TIPOS.map(t => {
            const active = t.id === activo.id
            return (
 <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  display:'flex', alignItems:'center', padding:'12px 16px',
                  fontSize:12,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1d1d1f' : '#6e6e73',
                  background:'none', border:'none',
                  borderBottom: active ? '2px solid #1d1d1f' : '2px solid transparent',
                  whiteSpace:'nowrap', marginBottom:-1, cursor:'pointer',
                  fontFamily:'var(--font-text)',
                  transition:'color 0.15s, border-color 0.15s',
                }}
              >
                {t.label}
 </button>
            )
          })}
 </div>
 </nav>

 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        {/* ───── Contenido del tipo activo (nivel 2 · lazy) ───── */}
        {activo.id === 'global'
          ? <VisionGlobalView />
          : activo.id === 'electrico'
            ? <ElectricoView />
            : activo.id === 'renovables'
              ? <RenovablesView />
              : activo.id === 'nuclear'
                ? <NuclearView />
                : activo.id === 'petroleo'
                  ? <PetroleoView />
                  : activo.id === 'gas'
                    ? <GasView />
                    : <HidrogenoView />}
 </main>
 </div>
  )
}
