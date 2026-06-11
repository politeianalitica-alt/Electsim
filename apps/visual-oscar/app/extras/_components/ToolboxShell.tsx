'use client'

/**
 * ToolboxShell — LAUNCHER del analista (cierre Fase 1).
 *
 * Decisión de producto: el Toolbox ya NO replica vistas del Command Center
 * (su Command Center/Inbox/Terminal inline mostraban mocks divergentes de
 * los del workspace — dos "verdades" para el mismo dato). Ahora todas las
 * herramientas son deep-links al workspace real; solo Cama y Preinformes
 * quedan inline porque son módulos compartidos con repositorio único.
 */

import Link from 'next/link'
import styles from './Toolbox.module.css'
import { useUrlState } from '@/lib/useUrlState'
import ToolGrid from './ToolGrid'
import CamaModule from '@/app/_components/cama/CamaModule'
import PreinformesModule from '@/app/_components/preinformes/PreinformesModule'
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace/workspace-utils'

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
// Canónico compartido con AppHeader (antes 'spain-energy', un id sin datos).
const DEFAULT_WORKSPACE = DEFAULT_WORKSPACE_ID

export const TOOLS: ToolDef[] = [
  // OPERATIVO · deep-links al workspace REAL (las réplicas inline con mocks
  // divergentes se eliminaron en el cierre de Fase 1)
  { id: 'command-center', label: 'Command Center', glyph: '▣', category: 'OPERATIVO',
    href: `/workspaces/${DEFAULT_WORKSPACE_ID}/overview`,
    description: 'El mando del workspace: morning brief, issues críticos, agenda y acciones.' },
  { id: 'inbox',          label: 'Inbox',          glyph: '⊠', category: 'OPERATIVO',
    href: `/workspaces/${DEFAULT_WORKSPACE_ID}/inbox`,
    description: 'Cola unificada: alertas, menciones, tareas asignadas, peticiones.' },
  { id: 'terminal',       label: 'Terminal',       glyph: '⟫', category: 'OPERATIVO',
    href: `/workspaces/${DEFAULT_WORKSPACE_ID}/terminal`,
    description: 'Consola operativa: comandos rápidos, queries y atajos al stack.' },

  // ESTRATEGIA · módulos transversales compartidos con Estudio/War Room/Cuaderno
  { id: 'cama',           label: 'Cama',           glyph: '◈', category: 'ESTRATEGIA', inline: true,
    description: 'Campañas y macroargumentos: narrativas versionadas con evidencias e impacto.' },
  { id: 'preinformes',    label: 'Preinformes',    glyph: '▤', category: 'ESTRATEGIA', inline: true,
    description: 'Borradores de informe en 4 pasos a partir de tus datos de proyectos en curso.' },

  // CONTENIDO
  { id: 'docs',           label: 'Documentos',           glyph: '', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/docs`,
    description: 'Documentos vivos: briefings, informes, notas de prensa, propuestas.' },
  { id: 'tables',         label: 'Tablas',         glyph: '⊟', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/tables`,
    description: 'Tablas estructuradas para datos cualitativos y cuantitativos.' },
  { id: 'slides',         label: 'Presentaciones',         glyph: '◫', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/slides`,
    description: 'Presentaciones para cliente, comité o reunión de gabinete.' },
  { id: 'reporting',      label: 'Informes',      glyph: '◵', category: 'CONTENIDO',
    href: `/workspaces/${DEFAULT_WORKSPACE}/reporting`,
    description: 'Informes periódicos exportables (PDF, DOCX) con tu plantilla.' },

  // INTELIGENCIA
  { id: 'canvas',         label: 'Canvas',         glyph: '◆', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/canvas`,
    description: 'Lienzo libre para mapear actores, eventos e hipótesis.' },
  { id: 'research',       label: 'Investigación',       glyph: '✦', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/research`,
    description: 'Investigación con IA: threads, fuentes, citas con trazabilidad.' },
  { id: 'radar',          label: 'Radar',          glyph: '', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/radar`,
    description: 'Vigilancia activa de temas, actores y narrativas emergentes.' },
  { id: 'simulator',      label: 'Simulador',      glyph: '◷', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/simulator`,
    description: 'Escenarios y simulación: ¿qué pasa si decido X / pasa Y?' },
  { id: 'knowledge',      label: 'Conocimiento',      glyph: '⬡', category: 'INTELIGENCIA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/knowledge`,
    description: 'Base de conocimiento del workspace: fuentes, fichas, glosario.' },

  // SISTEMA
  { id: 'projects',       label: 'Proyectos',       glyph: '⊡', category: 'SISTEMA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/projects`,
    description: 'Proyectos en curso con hitos, responsables y fechas.' },
  { id: 'automations',    label: 'Automatizaciones',    glyph: '✧', category: 'SISTEMA',
    href: `/workspaces/${DEFAULT_WORKSPACE}/automations`,
    description: 'Reglas y disparadores: alerta si X, agenda si Y, informa si Z.' },
]

const CATEGORIES: Array<ToolDef['category']> = ['OPERATIVO', 'ESTRATEGIA', 'CONTENIDO', 'INTELIGENCIA', 'SISTEMA']

export default function ToolboxShell() {
  // Fase 1 · herramienta en URL (?tool=cama|preinformes): enlazable y
  // F5-proof. El default es Cama (única familia inline tras el launcher).
  const [active, setActive] = useUrlState<ToolId>('tool', 'cama')

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
            ⊞ Mis workspaces
          </Link>
        </div>
      </aside>

      {/* ── Área principal ────────────────────────────────────────── */}
      <main className={styles.main}>
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
            Cualquier ?tool= no-inline cae al grid de lanzadores. */}
        {!['cama','preinformes'].includes(active) && (
          <ToolGrid tools={TOOLS} onPick={(id) => setActive(id)} />
        )}
      </main>
    </div>
  )
}
