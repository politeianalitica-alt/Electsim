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
export type NavItem = {
  label: string
  href: string
  banner?: Banner
  hidden?: boolean        // true = no aparece como pill en el subnav, pero el path sigue resolviendo el módulo
}
export type NavModule = {
  id: string
  label: string
  full?: string
  items: NavItem[]
  hideFromTopBar?: boolean // true = no aparece como tab en la barra superior
}

export const MODULES: NavModule[] = [
  // ─── 1. Inicio / Overview ─────────────────────────────────────────────
  // Módulo OCULTO de la barra superior: no se renderiza como tab. Su
  // contenido (Morning Briefing · Panel Ejecutivo · Alertas Prioritarias)
  // aparece en el subnav cuando el usuario llega a /inicio (vía logo
  // POLITEIA ANALÍTICA), /briefing, /dashboard o /alertas.
  {
    id: 'inicio',
    label: 'Inicio',
    full: 'Inicio / Overview',
    hideFromTopBar: true,
    items: [
      // /inicio se mantiene como item HIDDEN para que moduleOfPath('/inicio')
      // resuelva al módulo y el subnav aparezca, pero no se renderiza pill.
      { label: 'Inicio',              href: '/inicio',   hidden: true },
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
      { label: 'Detección de Ataques',         href: '/deteccion-ataques' },
      { label: 'Narrativa hostil',             href: '/ataques-narrativos' },
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
      { label: 'Pulso de Prensa', href: '/prensa' },
      { label: 'Mapa de Medios',  href: '/medios-narrativa' },
    ],
  },

  // ─── 8. Módulos Sectoriales (incluye Licitaciones y Contratación) ─────
  {
    id: 'sectoriales',
    label: 'Sectoriales',
    full: 'Sectoriales y Contratación Pública',
    items: [
      // — Página base · primer item del subnav (hub de contratación) —
      { label: 'Licitaciones',                 href: '/licitaciones' },
      // — 9 industrias verticales (con diseño Apple-Newsroom uniforme) —
      { label: 'Energía & Utilities',          href: '/sector-energia' },
      { label: 'Farma & Salud',                href: '/sector-farma' },
      { label: 'Defensa & Industria',          href: '/sector-defensa' },
      { label: 'Vivienda & Inmobiliario',      href: '/sector-vivienda' },
      { label: 'Banca & Seguros',              href: '/sector-banca' },
      { label: 'Agroalimentario & Rural',      href: '/sector-agro' },
      { label: 'Telecom & Digital',            href: '/sector-telecom' },
      { label: 'Infraestructuras & Movilidad', href: '/sector-infraestructuras' },
      { label: 'Turismo & Hostelería',         href: '/sector-turismo' },
      // — Resto de contratación (más abajo, agrupado) —
      { label: 'Inteligencia Adjudicaciones',  href: '/adjudicaciones' },
      { label: 'Monitor Contratos Vigentes',   href: '/contratos-vigentes' },
      { label: 'Inteligencia Competitiva',     href: '/competidores' },
      { label: 'Fondos Europeos y PRTR',       href: '/fondos-europeos' },
      { label: 'Riesgo y Litigios',            href: '/litigios-contratacion' },
    ],
  },

  // ─── 9. Estudio · Centro de operaciones del analista ────────────────
  // Antes 'Workspace'. Renombrado a 'Estudio' como punto de entrada principal.
  // Workspaces y Command Center quitados del subnav — el Command Center
  // sigue accesible desde el botón azul 'Workspace' del header (que apunta
  // a /workspaces/ws_espana_2026/overview).
  {
    id: 'workspace',           // id interno se mantiene para no romper lookups
    label: 'Estudio',
    full: 'Estudio · Centro de operaciones del analista',
    items: [
      // Subnav simplificado a 3 items principales. Las 7 herramientas
      // secundarias (Investigation Canvas, Evidence Linker, Draft Studio,
      // Intelligence Notebook, Political Calendar, Watchlists, Team
      // Collaboration) se agrupan en /extras como hub-page.
      { label: 'Estudio Politeia', href: '/estudio' },
      { label: 'War Room',         href: '/war-room' },
      { label: 'Extras',           href: '/extras' },
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
