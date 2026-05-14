export type Banner = {
  eyebrow: string
  title: string
  titleItalic?: string
  subtitle?: string
  metric?: string
  metricSuffix?: string
  metricLabel?: string
  colorFrom?: string
  colorTo?: string
}
export type NavItem = { label: string; href: string; banner?: Banner }
export type NavModule = { id: string; label: string; full?: string; items: NavItem[] }

export const MODULES: NavModule[] = [
  // ─── 1. Inicio / Overview ─────────────────────────────────────────────
  {
    id: 'inicio',
    label: 'Inicio',
    full: 'Inicio / Overview',
    items: [
      { label: 'Inicio',              href: '/inicio'    },
      { label: 'Morning Briefing',    href: '/briefing'  },
      { label: 'Panel Ejecutivo',     href: '/dashboard' },
      { label: 'Alertas Prioritarias',href: '/alertas'   },
    ],
  },

  // ─── 2. Inteligencia Política ─────────────────────────────────────────
  {
    id: 'politica',
    label: 'Política',
    full: 'Inteligencia Política',
    items: [
      { label: 'Mapa de Actores',                href: '/mapa-actores' },
      { label: 'Partidos y Grupos',              href: '/partidos' },
      { label: 'Gobierno y Coaliciones',         href: '/gobierno-coalicion' },
      { label: 'Instituciones Locales y Reg.',   href: '/instituciones' },
    ],
  },

  // ─── 3. Monitor Legislativo y Regulatorio ─────────────────────────────
  {
    id: 'legislativo',
    label: 'Legislativo',
    full: 'Monitor Legislativo y Regulatorio',
    items: [
      {
        label: 'Monitor en Tiempo Real',
        href: '/monitor-legislativo',
        banner: {
          eyebrow: 'MONITOR LEGISLATIVO · TIEMPO REAL',
          title: 'BOE, BOCG, Congreso, Senado y UE',
          colorFrom: '#5B21B6', colorTo: '#2E1065',
        },
      },
      { label: 'Trazabilidad Legislativa',  href: '/trazabilidad' },
      { label: 'Huella Legislativa',        href: '/huella-legislativa' },
    ],
  },

  // ─── 4. Riesgo, Crisis y Narrativa ────────────────────────────────────
  {
    id: 'riesgo',
    label: 'Riesgo',
    full: 'Riesgo, Crisis y Narrativa',
    items: [
      { label: 'Termómetro de Riesgo',         href: '/riesgo' },
      { label: 'Crisis Intelligence',          href: '/crisis' },
      { label: 'Detección de Ataques',         href: '/ataques-narrativos' },
    ],
  },

  // ─── 5. Electoral, Opinión Pública y Campañas ─────────────────────────
  {
    id: 'electoral',
    label: 'Electoral',
    full: 'Electoral, Opinión Pública y Campañas',
    items: [
      { label: 'Módulo Electoral',           href: '/nowcasting' },
      { label: 'Simulador Estratégico',      href: '/escenarios' },
      { label: 'Perfiles de Votante',        href: '/microdatos' },
      { label: 'War Room de Campaña',        href: '/war-room' },
      {
        label: 'Inteligencia Adversarios',
        href: '/adversarios',
        banner: {
          eyebrow: 'ELECTORAL · INTELLIGENCE SOBRE ADVERSARIOS',
          title: 'Perfiles estratégicos rivales',
          colorFrom: '#B45309', colorTo: '#5C2310',
        },
      },
    ],
  },

  // ─── 6. Inteligencia Geopolítica y Macroeconómica ─────────────────────
  {
    id: 'macro-geo',
    label: 'Macro & Geo',
    full: 'Inteligencia Geopolítica y Macroeconómica',
    items: [
      { label: 'Geopolítica y RRII',         href: '/geopolitica' },
      { label: 'Macro-Political & Economic', href: '/macro' },
    ],
  },

  // ─── 7. Medios y Narrativa Pública ────────────────────────────────────
  {
    id: 'medios',
    label: 'Medios',
    full: 'Medios y Narrativa Pública',
    items: [
      { label: 'Mapa de Medios', href: '/medios-narrativa' },
      { label: 'Pulso de Prensa',          href: '/prensa' },
    ],
  },

  // ─── 8. Módulos Sectoriales (incluye Licitaciones y Contratación) ─────
  {
    id: 'sectoriales',
    label: 'Sectoriales',
    full: 'Sectoriales y Contratación Pública',
    items: [
      { label: 'Energía & Utilities',          href: '/sector-energia' },
      { label: 'Farma & Salud',                href: '/sector-farma' },
      { label: 'Defensa & Industria',          href: '/sector-defensa' },
      { label: 'Vivienda & Inmobiliario',      href: '/sector-vivienda' },
      { label: 'Banca & Seguros',              href: '/sector-banca' },
      { label: 'Agroalimentario & Rural',      href: '/sector-agro' },
      { label: 'Telecom & Digital',            href: '/sector-telecom' },
      { label: 'Infraestructuras & Movilidad', href: '/sector-infraestructuras' },
      { label: 'Turismo & Hostelería',         href: '/sector-turismo' },
      // ─── Licitaciones y Contratación Pública (movido aquí) ───
      { label: 'Agregador de Licitaciones',    href: '/licitaciones' },
      { label: 'Inteligencia Adjudicaciones',  href: '/adjudicaciones' },
      { label: 'Monitor Contratos Vigentes',   href: '/contratos-vigentes' },
      { label: 'Inteligencia Competitiva',     href: '/competidores' },
      { label: 'Fondos Europeos y PRTR',       href: '/fondos-europeos' },
      { label: 'Riesgo y Litigios',            href: '/litigios-contratacion' },
    ],
  },

  // ─── 9. Workspace · Centro de operaciones del analista ───────────────
  {
    id: 'workspace',
    label: 'Workspace',
    full: 'Workspace · Centro de operaciones del analista',
    items: [
      // — Entrada al Workspace —
      { label: 'Workspaces',            href: '/workspaces' },
      { label: 'Command Center',        href: '/workspaces/ws_espana_2026/overview' },

      // — Espacio de análisis del analista (dentro del Workspace) —
      {
        label: 'Estudio',
        href: '/estudio',
        banner: {
          eyebrow: 'WORKSPACE · ESTUDIO DEL ANALISTA',
          title: 'Tu espacio de inteligencia',
          subtitle: 'Conecta fuentes, crea tus paneles y deja que la IA te ayude',
          colorFrom: '#0F766E', colorTo: '#042F2E',
        },
      },

      // — Pestañas del workspace activo —
      { label: 'Inbox',                 href: '/workspaces/ws_espana_2026/inbox' },
      { label: 'Terminal',              href: '/workspaces/ws_espana_2026/terminal' },
      { label: 'Docs',                  href: '/workspaces/ws_espana_2026/docs' },
      { label: 'Tables',                href: '/workspaces/ws_espana_2026/tables' },
      { label: 'Slides',                href: '/workspaces/ws_espana_2026/slides' },
      { label: 'Reporting',             href: '/workspaces/ws_espana_2026/reporting' },
      { label: 'Canvas',                href: '/workspaces/ws_espana_2026/canvas' },
      { label: 'Research',              href: '/workspaces/ws_espana_2026/research' },
      { label: 'Radar Oportunidades',   href: '/workspaces/ws_espana_2026/radar' },
      { label: 'Simulador Decisión',    href: '/workspaces/ws_espana_2026/simulator' },
      { label: 'CRM Político',          href: '/workspaces/ws_espana_2026/crm' },
      { label: 'Projects',              href: '/workspaces/ws_espana_2026/projects' },

      // — Herramientas de analista (portadas desde Visual_Oscar) —
      { label: 'War Room',              href: '/workspace' },
      { label: 'Investigation Canvas',  href: '/canvas' },
      { label: 'Evidence Linker',       href: '/evidence' },
      { label: 'Draft Studio',          href: '/draft-studio' },
      { label: 'Intelligence Notebook', href: '/notebook' },
      { label: 'Political Calendar',    href: '/calendario' },
      { label: 'Watchlists',            href: '/watchlists' },
      { label: 'Team Collaboration',    href: '/team' },
    ],
  },

  // ─── 10. Configuración y Sistema de Alertas ──────────────────────────
  {
    id: 'config',
    label: 'Configuración',
    full: 'Configuración y Sistema de Alertas',
    items: [
      { label: 'Configuración de Cliente', href: '/config-cliente' },
      { label: 'Sistema de Alertas',       href: '/alertas-config' },
    ],
  },
]

// Mapas auxiliares
export const HREF_TO_MODULE: Record<string, NavModule> = {}
export const HREF_TO_ITEM: Record<string, NavItem> = {}
for (const m of MODULES) {
  for (const it of m.items) {
    HREF_TO_MODULE[it.href] = m
    HREF_TO_ITEM[it.href] = it
  }
}
export function moduleOfPath(path: string): NavModule | null {
  return HREF_TO_MODULE[path] || null
}
export function itemOfPath(path: string): NavItem | null {
  return HREF_TO_ITEM[path] || null
}
