'use client'
/**
 * /sector-defensa/ecosistema — Hub de Grupos + Eventos + Medios + Teatros + Ministerios.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'
import { Panel } from '@/components/SectorPanel'

const SUBPAGES = [
  { href: '/sector-defensa/grupos-trabajo',        label: 'Grupos · Eventos · Calls', descripcion: '16 CapTechs EDA · 6 NATO STO RTGs · 9 eventos 2026 · 7 calls activas (EDF 1bn€, EDIP 500M€, PERTE 800M€)', color: '#1F4E8C', icon: '◈' },
  { href: '/sector-defensa/briefing',              label: 'Briefing medios defensa',  descripcion: '8 medios RSS especializados · Infodefensa · Revista Ejércitos · Defense News · TWZ · EDA · NATO',     color: '#DC2626', icon: '◆' },
  { href: '/sector-defensa/teatros',               label: 'Teatros operacionales',    descripcion: 'Balance de poder por 6 áreas: Indo-Pacífico · OTAN flanco oriental · MENA · EU · LATAM · África',     color: '#F97316', icon: '⊞' },
  { href: '/sector-defensa/ministerios',           label: 'Ministerios de defensa',   descripcion: '43 ministerios · ministros + presupuestos + agencias clave (DARPA · DGAM · BAAINBw · MAFAT...)',       color: '#5D4037', icon: '⊟' },
  { href: '/sector-defensa/estrategia-industrial', label: 'Estrategia industrial',    descripcion: 'Documentos estratégicos oficiales + organigramas + base industrial 8 países (LPM · NDS · NSS · PERTE)', color: '#7C3AED', icon: '◉' },
]

export default function EcosistemaHub() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · ECOSISTEMA
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Ecosistema institucional + medios + balance regional
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          Inteligencia pre-licitación · grupos de trabajo donde se decide qué se va a comprar 3 años antes ·
          medios especializados en vivo · ministerios y estrategias industriales · balance de poder regional
        </p>
      </div>

      <Panel title="Sub-módulos del ecosistema · click para profundizar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
          {SUBPAGES.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 18, background: `linear-gradient(135deg, ${s.color}12, ${s.color}04)`, borderRadius: 12, borderLeft: `4px solid ${s.color}`, cursor: 'pointer', minHeight: 140 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 24, color: s.color, fontWeight: 700 }}>{s.icon}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{s.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.5 }}>{s.descripcion}</p>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: s.color, fontWeight: 600 }}>Abrir módulo →</p>
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  )
}
