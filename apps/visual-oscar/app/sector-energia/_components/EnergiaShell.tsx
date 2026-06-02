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
 *   - los otros 3  → <EnergiaComingSoon /> · empty-state "en construcción"
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
import type { EnergiaTipo } from '@/lib/energia/types'

const ACCENT = '#16A34A'

interface TipoTab {
  id: EnergiaTipo
  label: string
  /** Marca Unicode (no emoji) para la barra. */
  glyph: string
  desc: string
  /** Sprint en el que se construye la vista (para el placeholder). */
  sprint: string
}

const TIPOS: TipoTab[] = [
  { id: 'global',     label: 'Visión Global', glyph: '◉', desc: 'Overview cross-energía',           sprint: 'S4' },
  { id: 'electrico',  label: 'Eléctrico',     glyph: '◆', desc: 'ESIOS · red · mercado',            sprint: 'S1' },
  { id: 'renovables', label: 'Renovables',    glyph: '⬡', desc: 'Eólica · solar · PNIEC',           sprint: 'S5' },
  { id: 'nuclear',    label: 'Nuclear',       glyph: '◈', desc: 'Parque ES · calendario cierre',    sprint: 'S6' },
  { id: 'petroleo',   label: 'Petróleo',      glyph: '◐', desc: 'Brent · WTI · refino',             sprint: 'S7' },
  { id: 'gas',        label: 'Gas',           glyph: '◇', desc: 'TTF · MIBGAS · almacenamiento',    sprint: 'S8' },
  { id: 'hidrogeno',  label: 'Hidrógeno',     glyph: '⬢', desc: 'PERTE H2 · electrolizadores',      sprint: 'S9' },
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
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        {/* ───── Barra superior · tipo de energía (nivel 1) ───── */}
 <nav
          aria-label="Tipo de energía"
          style={{
            display:'flex', gap:0, marginBottom:18, overflowX:'auto',
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:4,
          }}
        >
          {TIPOS.map(t => {
            const active = t.id === activo.id
            return (
 <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex:'1 1 0', minWidth:128, border:'none', cursor:'pointer',
                  background: active ? ACCENT : 'transparent',
                  borderRadius:10, padding:'10px 12px', textAlign:'left',
                  fontFamily:'inherit',
                  transition:'background 150ms ease',
                }}
              >
 <div style={{ display:'flex', alignItems:'center', gap:7 }}>
 <span aria-hidden="true" style={{
                    fontSize:13, color: active ? '#fff' : ACCENT, opacity: active ? 1 : 0.85,
                  }}>{t.glyph}</span>
 <span style={{
                    fontSize:12.5, fontWeight:700, fontFamily:'var(--font-display)',
                    letterSpacing:'-0.01em', color: active ? '#fff' : '#1d1d1f',
                  }}>{t.label}</span>
 </div>
 <div style={{
                  fontSize:9.5, marginTop:2, color: active ? 'rgba(255,255,255,0.85)' : '#86868b',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>{t.desc}</div>
 </button>
            )
          })}
 </nav>

        {/* ───── Contenido del tipo activo (nivel 2 · lazy) ───── */}
        {activo.id === 'global'
          ? <VisionGlobalView />
          : activo.id === 'electrico'
            ? <ElectricoView />
            : activo.id === 'renovables'
              ? <RenovablesView />
              : activo.id === 'nuclear'
                ? <NuclearView />
                : <EnergiaComingSoon tipo={activo} />}
 </main>
 </div>
  )
}

/**
 * Empty-state "en construcción" para los tipos de energía aún no implementados.
 * Mismo lenguaje visual que los paneles existentes (SectorPanel). Sin emojis.
 */
function EnergiaComingSoon({ tipo }: { tipo: TipoTab }) {
  return (
 <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      padding:'64px 28px', textAlign:'center',
    }}>
 <div aria-hidden="true" style={{ fontSize:42, color:ACCENT, opacity:0.85, lineHeight:1 }}>{tipo.glyph}</div>
 <h2 style={{
        margin:'18px 0 6px', fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
        letterSpacing:'-0.02em', color:'#1d1d1f',
      }}>
        Sección {tipo.label}
 </h2>
 <p style={{ margin:'0 0 4px', fontSize:13, color:'#6e6e73' }}>
        En construcción · Sprint {tipo.sprint}
 </p>
 <p style={{ margin:'0 auto', maxWidth:520, fontSize:12, color:'#86868b', lineHeight:1.5 }}>
        Esta vista formará parte del overhaul del sector energía: {tipo.desc.toLowerCase()}.
        Mientras tanto, la pestaña <strong>Eléctrico</strong> ya ofrece el sistema eléctrico
        español en directo (ESIOS, REE, intercambios y mercado).
 </p>
 </section>
  )
}
