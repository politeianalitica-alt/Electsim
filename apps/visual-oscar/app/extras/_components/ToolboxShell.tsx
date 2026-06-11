'use client'

/**
 * ToolboxShell — sidebar de categorías + área principal con vistas inline.
 *
 * El Toolbox da acceso unificado a las 14 herramientas del analista,
 * con vistas inline para las operativas (Command Center, Inbox, Terminal)
 * y deep-links al workspace para las productivas.
 */

import { useState } from 'react'
import Link from 'next/link'
import styles from './Toolbox.module.css'
import CommandCenter from './CommandCenter'
import InboxView from './InboxView'
import TerminalView from './TerminalView'
import ToolGrid from './ToolGrid'
import CamaModule from '@/app/_components/cama/CamaModule'
import PreinformesModule from '@/app/_components/preinformes/PreinformesModule'

export type ToolId =
  | 'command-center' | 'inbox' | 'terminal'
  | 'docs' | 'tables' | 'slides' | 'reporting'
  | 'canvas' | 'research' | 'radar' | 'simulator' | 'knowledge'
  | 'projects' | 'automations'
  | 'cama' | 'preinformes'

export interface ToolDef {
  id:        ToolId
  label:     string
  glyph:     string
  category:  'OPERATIVO' | 'ESTRATEGIA' | 'CONTENIDO' | 'INTELIGENCIA' | 'SISTEMA'
  inline?:   boolean       // true = vista interna del Toolbox
  href?:     string        // si !inline, deep link
  description: string
}

// Workspace por defecto cuando hacemos deep-link a las herramientas avanzadas.
// Cuando el usuario pasa por /workspaces, podemos guardarle el último elegido
// en localStorage y usarlo aquí.
const DEFAULT_WORKSPACE = 'spain-energy'

export const TOOLS: ToolDef[] = [
  // OPERATIVO
  { id: 'command-center', label: 'Command Center', glyph: '▣', category: 'OPERATIVO', inline: true,
    description: 'Tu mando operativo: morning brief, issues críticos, agenda y acciones.' },
  { id: 'inbox',          label: 'Inbox',          glyph: '⊠', category: 'OPERATIVO', inline: true,
    description: 'Cola unificada: alertas, menciones, tareas asignadas, peticiones.' },
  { id: 'terminal',       label: 'Terminal',       glyph: '⟫', category: 'OPERATIVO', inline: true,
    description: 'Consola operativa: comandos rápidos, queries y atajos al stack.' },

  // ESTRATEGIA · módulos transversales compartidos con Estudio/War Room/Cuaderno
  { id: 'cama',           label: 'Cama',           glyph: '◈', category: 'ESTRATEGIA', inline: true,
    description: 'Campañas y macroargumentos: narrativas versionadas con evidencias e impacto.' },
  { id: 'preinformes',    label: 'Preinformes',    glyph: '▤', category: 'ESTRATEGIA', inline: true,
    description: 'Borradores de informe en 4 pasos a partir de tus datos de proyectos en curso.' },

  // CONTENIDO
  { id: 'docs',           label: 'Docs',           glyph: '', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/docs`,
    description: 'Documentos vivos: briefings, informes, notas de prensa, propuestas.' },
  { id: 'tables',         label: 'Tables',         glyph: '⊟', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/tables`,
    description: 'Tablas estructuradas para datos cualitativos y cuantitativos.' },
  { id: 'slides',         label: 'Slides',         glyph: '◫', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/slides`,
    description: 'Presentaciones para cliente, comité o reunión de gabinete.' },
  { id: 'reporting',      label: 'Reporting',      glyph: '◵', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/reporting`,
    description: 'Informes periódicos exportables (PDF, DOCX) con tu plantilla.' },

  // INTELIGENCIA
  { id: 'canvas',         label: 'Canvas',         glyph: '◆', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/canvas`,
    description: 'Lienzo libre para mapear actores, eventos e hipótesis.' },
  { id: 'research',       label: 'Research',       glyph: '✦', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/research`,
    description: 'Investigación con IA: threads, fuentes, citas con trazabilidad.' },
  { id: 'radar',          label: 'Radar',          glyph: '', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/radar`,
    description: 'Vigilancia activa de temas, actores y narrativas emergentes.' },
  { id: 'simulator',      label: 'Simulator',      glyph: '◷', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/simulator`,
    description: 'Escenarios y simulación: ¿qué pasa si decido X / pasa Y?' },
  { id: 'knowledge',      label: 'Knowledge',      glyph: '⬡', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/knowledge`,
    description: 'Base de conocimiento del workspace: fuentes, fichas, glosario.' },

  // SISTEMA
  { id: 'projects',       label: 'Projects',       glyph: '⊡', category: 'SISTEMA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/projects`,
    description: 'Proyectos en curso con hitos, responsables y fechas.' },
  { id: 'automations',    label: 'Automations',    glyph: '✧', category: 'SISTEMA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/automations`,
    description: 'Reglas y disparadores: alerta si X, agenda si Y, informa si Z.' },
]

const CATEGORIES: Array<ToolDef['category']> = ['OPERATIVO', 'ESTRATEGIA', 'CONTENIDO', 'INTELIGENCIA', 'SISTEMA']

export default function ToolboxShell() {
  const [active, setActive] = useState<ToolId>('command-center')
  const activeTool = TOOLS.find(t => t.id === active)!

  return (
    <div className={styles.shell}>
      {/* ── Sidebar de categorías ─────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.workspaceHead}>
          <span className={styles.workspaceIcon}>ES</span>
          <div className={styles.workspaceMeta}>
            <strong>España 2026</strong>
            <span className={styles.workspaceStatus}>
              <span className={styles.statusDot} />
              Activo · personal
            </span>
          </div>
        </div>

        {CATEGORIES.map(cat => {
          const tools = TOOLS.filter(t => t.category === cat)
          return (
            <div key={cat} className={styles.catGroup}>
              <div className={styles.catLabel}>{cat}</div>
              <ul className={styles.toolList}>
                {tools.map(tool => (
                  <li key={tool.id}>
                    {tool.inline ? (
                      <button
                        className={`${styles.toolBtn} ${active === tool.id ? styles.toolActive : ''}`}
                        onClick={() => setActive(tool.id)}
                      >
                        <span className={styles.toolGlyph}>{tool.glyph}</span>
                        <span className={styles.toolLabel}>{tool.label}</span>
                      </button>
                    ) : (
                      <Link
                        href={tool.href!}
                        className={styles.toolBtn}
                      >
                        <span className={styles.toolGlyph}>{tool.glyph}</span>
                        <span className={styles.toolLabel}>{tool.label}</span>
                        <span className={styles.toolExt}>↗</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        <div className={styles.sidebarFoot}>
          <Link href="/workspaces" className={styles.footLink}>
            ⊕ Cambiar workspace
          </Link>
        </div>
      </aside>

      {/* ── Área principal ────────────────────────────────────────── */}
      <main className={styles.main}>
        {active === 'command-center' && <CommandCenter />}
        {active === 'inbox' && <InboxView />}
        {active === 'terminal' && <TerminalView />}
        {active === 'cama' && (
          <div style={{ padding: 20 }}>
            <CamaModule espacio="toolbox" embebido />
          </div>
        )}
        {active === 'preinformes' && (
          <div style={{ padding: 20 }}>
            <PreinformesModule espacio="toolbox" embebido />
          </div>
        )}
        {/* Las herramientas con href se abren con Link, no se renderizan aquí.
            Pero si alguna entra como fallback, mostramos un grid. */}
        {!['command-center','inbox','terminal','cama','preinformes'].includes(active) && (
          <ToolGrid tools={TOOLS} onPick={(id) => setActive(id)} />
        )}
      </main>
    </div>
  )
}
