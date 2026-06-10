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
  children?: NavItem[]    // 3er nivel: sub-pestañas anidadas (p. ej. Política dentro de Sectorial)
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
  // Módulo OCULTO · /dashboard es la home post-login (Panel Ejecutivo).
  // /inicio redirige a /dashboard para mantener compat con bookmarks.
  {
    id: 'inicio',
    label: 'Inicio',
    full: 'Inicio / Overview',
    hideFromTopBar: true,
    items: [
      { label: 'Panel Ejecutivo', href: '/dashboard' },
    ],
  },

  // ─── 2. Monitor Legislativo y Regulatorio ─────────────────────────────
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
    ],
  },

  // ─── 5. Inteligencia Geopolítica y Macroeconómica ─────────────────────
  {
    id: 'geopolitica',
    label: 'Geopolítica',
    full: 'Inteligencia Geopolítica y Relaciones Internacionales',
    items: [
      { label: 'Geopolítica y RRII',         href: '/geopolitica' },
    ],
  },
  {
    id: 'macro',
    label: 'Macroeconomía',
    full: 'Inteligencia Macroeconómica',
    items: [
      { label: 'Economía',                   href: '/macro' },
      { label: 'Fuentes globales',           href: '/datos' },
    ],
  },

  // ─── 7. Medios y Narrativa Pública ────────────────────────────────────
  {
    id: 'medios',
    label: 'Medios',
    full: 'Medios y Narrativa Pública',
    items: [
      // Subpestañas de /prensa promovidas a la barra de Medios · cada una abre
      // /prensa con ese tab ya seleccionado (useUrlState lee ?tab=).
      { label: 'Pulso de Prensa',       href: '/prensa' },
      { label: 'Narrativas & framing',  href: '/prensa?tab=narrativas' },
      { label: 'Think Tanks',           href: '/think-tanks' },
      { label: 'Mapas de impacto',      href: '/prensa?tab=mapas' },
      { label: 'Mapa de Medios',        href: '/medios-narrativa' },
      { label: 'Desinformación',        href: '/desinformacion' },
      { label: 'Búsqueda',              href: '/prensa?tab=busqueda' },
      { label: 'Tendencias e impacto',  href: '/prensa?tab=tendencias' },
      { label: 'Catálogo de medios',    href: '/prensa?tab=mapa-medios' },
    ],
  },

  // ─── 8. Módulos Sectoriales (incluye Licitaciones y Contratación) ─────
  {
    id: 'sectoriales',
    label: 'Sectoriales',
    full: 'Sectoriales y Contratación Pública',
    items: [
      // — Política (1ª sub-pestaña · con sub-pestañas anidadas, nivel 3) —
      {
        label: 'Política',
        href: '/mapa-actores',
        children: [
          { label: 'Mapa de Actores',                href: '/mapa-actores' },
          { label: 'Personas',                       href: '/dosieres' },
          { label: 'Partidos y Grupos',              href: '/partidos' },
          { label: 'Gobierno y Coaliciones',         href: '/gobierno-coalicion' },
          { label: 'Instituciones Locales y Reg.',   href: '/instituciones' },
          { label: 'Módulo Electoral',               href: '/nowcasting' },
          { label: 'Simulador Estratégico',          href: '/escenarios' },
          { label: 'Perfiles de Votante',            href: '/microdatos' },
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
      // — 11 industrias verticales (con diseño Apple-Newsroom uniforme) —
      { label: 'Energía',            href: '/sector-energia' },
      { label: 'Salud',              href: '/sector-farma' },
      { label: 'Defensa',            href: '/sector-defensa' },
      { label: 'Inmobiliario',       href: '/sector-vivienda' },
      { label: 'Banca',              href: '/sector-banca' },
      { label: 'Agroalimentario',    href: '/sector-agro' },
      { label: 'Telecomunicaciones', href: '/sector-telecom' },
      { label: 'Movilidad',          href: '/sector-infraestructuras' },
      { label: 'Turismo',            href: '/sector-turismo' },
      { label: 'Marítimo',           href: '/puertos' },
      { label: 'Tercer Sector & ONGs',         href: '/sector-tercer-sector' },
      // — Contratación —
      { label: 'Inteligencia Adjudicaciones',  href: '/adjudicaciones' },
      { label: 'Monitor Contratos Vigentes',   href: '/contratos-vigentes' },
      { label: 'Inteligencia Competitiva',     href: '/competidores' },
      { label: 'Fondos Europeos y PRTR',       href: '/fondos-europeos' },
      { label: 'Riesgo y Litigios',            href: '/litigios-contratacion' },
      // — Licitaciones · hub de contratación (movido al final) —
      { label: 'Licitaciones',                 href: '/licitaciones' },
    ],
  },

  // ─── 9. Workspace · Centro de operaciones del analista ───────────────
  // El módulo se llama 'Workspace' en la barra principal. Dentro están:
  //   - Estudio (centro de datos / paneles / fuentes / IA)
  //   - War Room (sala de operaciones de campaña)
  //   - Cuaderno (notas tipo Obsidian con backlinks y grafo) ← nuevo
  //   - Toolbox (hub con las herramientas secundarias del analista)
  {
    id: 'workspace',
    label: 'Workspace',
    full: 'Workspace · Centro de operaciones del analista',
    // Unificado en el botón azul del header (AppHeader); no se muestra como
    // pestaña en la barra superior para no duplicar. El módulo se conserva para
    // resolver rutas (/estudio, /war-room, /cuaderno, /extras) y su subnav.
    hideFromTopBar: true,
    items: [
      { label: 'Estudio',  href: '/estudio'  },  // 1ª — workspace de datos y paneles
      { label: 'War Room', href: '/war-room' },  // 2ª — sala de operaciones
      { label: 'Toolbox',  href: '/extras'   },  // 3ª — herramientas auxiliares
      { label: 'Cuaderno', href: '/cuaderno' },  // 4ª — Obsidian del analista (notas + grafo + bitácora)
    ],
  },

  // ─── 10. Configuración y Sistema de Alertas ──────────────────────────
  {
    id: 'config',
    label: 'Configuración',
    full: 'Configuración y Sistema de Alertas',
    // Movido al icono de herramientas del header (AppHeader); no se muestra como
    // pestaña en la barra superior. El módulo se conserva para resolver rutas.
    hideFromTopBar: true,
    items: [
      { label: 'Configuración de Cliente', href: '/config-cliente' },
      { label: 'Sistema de Alertas',       href: '/alertas-config' },
    ],
  },

  // ─── 11. OSINT Global ─────────────────────────────────────────────────
  // Mapa táctico de inteligencia en tiempo real (MapLibre, todas las capas).
  // Tab único → sin subnav. Estilos OSIRIS aislados bajo .osiris-root.
  {
    id: 'osint-global',
    label: 'Mapa',
    full: 'Mapa · Inteligencia en tiempo real',
    items: [
      { label: 'Mapa Politeia', href: '/osint-global' },
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
    if (it.children) {
      for (const c of it.children) {
        HREF_TO_MODULE[c.href] = m
        HREF_TO_ITEM[c.href] = c
      }
    }
  }
}
export function moduleOfPath(path: string): NavModule | null {
  return HREF_TO_MODULE[path] || null
}
export function itemOfPath(path: string): NavItem | null {
  return HREF_TO_ITEM[path] || null
}
