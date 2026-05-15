/**
 * GET /api/sectores/agro/precios-cultivos
 *
 * Catálogo de precios de los principales cultivos/productos agrarios
 * españoles desglosados por LONJA (mercado de origen). Cada producto
 * tiene sus variedades y se muestra en €/unidad apropiada (kg, Tm, Hl).
 *
 * Cultivos cubiertos:
 *   - Cereales       · 5 variedades · 5 lonjas (Salamanca, León, Córdoba, Zaragoza Ebro, Albacete)
 *   - Aceite oliva   · 3 variedades · 3 lonjas (Pool Red, Jaén, Sevilla)
 *   - Vino           · 3 variedades · 3 lonjas (La Mancha, Rioja, Catalunya)
 *   - Almendra       · 3 variedades · 3 lonjas (Reus, Albacete, Murcia)
 *   - Cítricos       · 3 variedades · 2 lonjas (Valencia, Mercolleida)
 *   - Hortalizas     · 3 variedades · 2 lonjas (Almería, MercaBarna)
 *   - Patata         · 3 variedades · 2 lonjas (León, MercaBarna)
 *   - Legumbres      · 3 variedades · 2 lonjas (Salamanca, Cuenca)
 *   - Frutos secos   · 2 variedades · 1 lonja (Reus)
 *   - Porcino        · 3 variedades · 2 lonjas (Mercolleida, Bellpuig)
 *   - Vacuno         · 2 variedades · 2 lonjas (Talavera, Ebro)
 *   - Ovino          · 2 variedades · 2 lonjas (Ebro, Talavera)
 *
 * Datos calibrados con MAPA / lonjas oficiales mayo 2026 · series
 * mensuales de 12 meses generadas con tendencia + estacionalidad + ruido.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Variedad {
  id: string
  label: string
  unidad: string
  precio_base: number       // €/unidad medio anual
  estacionalidad?: number   // amplitud de la oscilación estacional (€)
  tendencia?: number        // drift mensual (€/mes)
  vol?: number              // volatilidad por lonja (jitter)
}

interface Lonja {
  id: string
  label: string
  ubicacion: string
  diferencial?: number      // % sobre precio_base (positivo = más cara)
}

interface CultivoDef {
  id: string
  label: string
  icon: string              // texto corto para badge
  unidad: string
  descripcion: string
  variedades: Variedad[]
  lonjas: Lonja[]
}

const CULTIVOS: CultivoDef[] = [
  {
    id: 'cereales', label: 'Cereales', icon: 'C', unidad: '€/Tm',
    descripcion: 'Trigo blando, trigo duro, cebada, maíz y avena · cosecha invierno-verano',
    variedades: [
      { id: 'trigo_blando',  label: 'Trigo blando',     unidad: '€/Tm', precio_base: 235, estacionalidad: 18, tendencia: 0.4 },
      { id: 'trigo_duro',    label: 'Trigo duro',       unidad: '€/Tm', precio_base: 305, estacionalidad: 22, tendencia: 0.6 },
      { id: 'cebada',        label: 'Cebada pienso',    unidad: '€/Tm', precio_base: 215, estacionalidad: 15, tendencia: 0.3 },
      { id: 'maiz',          label: 'Maíz grano',       unidad: '€/Tm', precio_base: 248, estacionalidad: 14, tendencia: 0.2 },
      { id: 'avena',         label: 'Avena',            unidad: '€/Tm', precio_base: 210, estacionalidad: 12, tendencia: 0.2 },
    ],
    lonjas: [
      { id: 'salamanca', label: 'Lonja de Salamanca',   ubicacion: 'Castilla y León' },
      { id: 'leon',      label: 'Lonja de León',        ubicacion: 'Castilla y León', diferencial: -1.5 },
      { id: 'cordoba',   label: 'Lonja de Córdoba',     ubicacion: 'Andalucía',       diferencial: -2.0 },
      { id: 'zaragoza',  label: 'Lonja del Ebro · Mercolleida', ubicacion: 'Aragón/Cataluña', diferencial: 1.5 },
      { id: 'albacete',  label: 'Lonja de Albacete',    ubicacion: 'Castilla-La Mancha', diferencial: -1.0 },
    ],
  },
  {
    id: 'aceite_oliva', label: 'Aceite de oliva', icon: 'O', unidad: '€/kg',
    descripcion: 'AOVE virgen extra, virgen y lampante · principal producto agrario español',
    variedades: [
      { id: 'aove',     label: 'AOVE (Virgen extra)', unidad: '€/kg', precio_base: 5.85, estacionalidad: 0.85, tendencia: -0.04 },
      { id: 'virgen',   label: 'Virgen',              unidad: '€/kg', precio_base: 5.40, estacionalidad: 0.80, tendencia: -0.04 },
      { id: 'lampante', label: 'Lampante',            unidad: '€/kg', precio_base: 4.80, estacionalidad: 0.75, tendencia: -0.04 },
    ],
    lonjas: [
      { id: 'pool_red', label: 'Pool Red (sistema referencia)', ubicacion: 'Nacional · indicador oficial' },
      { id: 'jaen',     label: 'Lonja de Jaén',                 ubicacion: 'Andalucía', diferencial:  0.8 },
      { id: 'sevilla',  label: 'Lonja de Sevilla',              ubicacion: 'Andalucía', diferencial: -0.5 },
    ],
  },
  {
    id: 'vino', label: 'Vino', icon: 'V', unidad: '€/Hl',
    descripcion: 'Tinto, blanco, rosado · graneles y embotellado',
    variedades: [
      { id: 'tinto',    label: 'Tinto granel',     unidad: '€/Hl', precio_base: 4.20, estacionalidad: 0.40, tendencia: 0.02 },
      { id: 'blanco',   label: 'Blanco granel',    unidad: '€/Hl', precio_base: 3.85, estacionalidad: 0.35, tendencia: 0.02 },
      { id: 'rosado',   label: 'Rosado granel',    unidad: '€/Hl', precio_base: 3.95, estacionalidad: 0.35, tendencia: 0.02 },
    ],
    lonjas: [
      { id: 'la_mancha', label: 'Lonja La Mancha',         ubicacion: 'Castilla-La Mancha · Tomelloso' },
      { id: 'rioja',     label: 'Lonja Rioja',             ubicacion: 'La Rioja · Logroño',  diferencial: 1.8 },
      { id: 'cataluna',  label: 'Lonja DO Catalunya',      ubicacion: 'Cataluña · Vilafranca', diferencial: 1.4 },
    ],
  },
  {
    id: 'almendra', label: 'Almendra', icon: 'A', unidad: '€/kg',
    descripcion: 'Común, marcona, largueta · referencia mundial Reus',
    variedades: [
      { id: 'comun',    label: 'Común',     unidad: '€/kg', precio_base: 5.40, estacionalidad: 0.70, tendencia: 0.03 },
      { id: 'marcona',  label: 'Marcona',   unidad: '€/kg', precio_base: 7.85, estacionalidad: 0.95, tendencia: 0.04 },
      { id: 'largueta', label: 'Largueta',  unidad: '€/kg', precio_base: 6.10, estacionalidad: 0.80, tendencia: 0.03 },
    ],
    lonjas: [
      { id: 'reus',     label: 'Lonja de Reus',     ubicacion: 'Cataluña · referencia mundial' },
      { id: 'albacete', label: 'Lonja de Albacete', ubicacion: 'Castilla-La Mancha', diferencial: -0.4 },
      { id: 'murcia',   label: 'Lonja de Murcia',   ubicacion: 'Murcia',             diferencial: -0.2 },
    ],
  },
  {
    id: 'citricos', label: 'Cítricos', icon: 'N', unidad: '€/kg',
    descripcion: 'Naranja, mandarina, limón · campañas otoño-invierno',
    variedades: [
      { id: 'naranja',     label: 'Naranja Navelina',  unidad: '€/kg', precio_base: 0.27, estacionalidad: 0.08, tendencia: 0.001 },
      { id: 'mandarina',   label: 'Mandarina Clemen.', unidad: '€/kg', precio_base: 0.42, estacionalidad: 0.10, tendencia: 0.002 },
      { id: 'limon',       label: 'Limón Verna',       unidad: '€/kg', precio_base: 0.55, estacionalidad: 0.12, tendencia: 0.002 },
    ],
    lonjas: [
      { id: 'valencia',     label: 'Lonja de Valencia',         ubicacion: 'C. Valenciana · Cooperativas' },
      { id: 'mercolleida',  label: 'Mercolleida (frutas)',      ubicacion: 'Cataluña', diferencial: -0.05 },
    ],
  },
  {
    id: 'hortalizas', label: 'Hortalizas', icon: 'H', unidad: '€/kg',
    descripcion: 'Tomate, pimiento, lechuga · invernaderos Almería principal origen',
    variedades: [
      { id: 'tomate',    label: 'Tomate (Pera)',       unidad: '€/kg', precio_base: 0.78, estacionalidad: 0.25, tendencia: 0.003 },
      { id: 'pimiento',  label: 'Pimiento Lamuyo',     unidad: '€/kg', precio_base: 0.95, estacionalidad: 0.30, tendencia: 0.004 },
      { id: 'lechuga',   label: 'Lechuga Romana',      unidad: '€/kg', precio_base: 0.55, estacionalidad: 0.18, tendencia: 0.002 },
    ],
    lonjas: [
      { id: 'almeria',    label: 'Lonja de Almería · El Ejido', ubicacion: 'Andalucía · primera transacción' },
      { id: 'mercabarna', label: 'MercaBarna',                  ubicacion: 'Cataluña · destino mayorista', diferencial: 0.18 },
    ],
  },
  {
    id: 'patata', label: 'Patata', icon: 'P', unidad: '€/kg',
    descripcion: 'Agria, monalisa, kennebec · campañas Castilla y León y Galicia',
    variedades: [
      { id: 'agria',     label: 'Agria',     unidad: '€/kg', precio_base: 0.32, estacionalidad: 0.10, tendencia: 0.001 },
      { id: 'monalisa',  label: 'Monalisa',  unidad: '€/kg', precio_base: 0.28, estacionalidad: 0.09, tendencia: 0.001 },
      { id: 'kennebec',  label: 'Kennebec',  unidad: '€/kg', precio_base: 0.30, estacionalidad: 0.10, tendencia: 0.001 },
    ],
    lonjas: [
      { id: 'leon',       label: 'Lonja de León',     ubicacion: 'Castilla y León · referencia origen' },
      { id: 'mercabarna', label: 'MercaBarna · patata', ubicacion: 'Cataluña · mayorista', diferencial: 0.06 },
    ],
  },
  {
    id: 'legumbres', label: 'Legumbres', icon: 'L', unidad: '€/Tm',
    descripcion: 'Garbanzo, lenteja, alubia · cultivos secano interior',
    variedades: [
      { id: 'garbanzo',  label: 'Garbanzo Sin Calibre', unidad: '€/Tm', precio_base: 1180, estacionalidad: 80, tendencia: 1.5 },
      { id: 'lenteja',   label: 'Lenteja Pardina',      unidad: '€/Tm', precio_base:  920, estacionalidad: 60, tendencia: 1.2 },
      { id: 'alubia',    label: 'Alubia blanca',        unidad: '€/Tm', precio_base: 1640, estacionalidad: 110, tendencia: 2.0 },
    ],
    lonjas: [
      { id: 'salamanca', label: 'Lonja de Salamanca',   ubicacion: 'Castilla y León' },
      { id: 'cuenca',    label: 'Lonja de Cuenca',      ubicacion: 'Castilla-La Mancha', diferencial: -1.0 },
    ],
  },
  {
    id: 'frutos_secos', label: 'Frutos secos', icon: 'F', unidad: '€/kg',
    descripcion: 'Avellana y nuez · referencia Lonja de Reus',
    variedades: [
      { id: 'avellana',  label: 'Avellana negreta',     unidad: '€/kg', precio_base: 4.85, estacionalidad: 0.55, tendencia: 0.02 },
      { id: 'nuez',      label: 'Nuez chandler',        unidad: '€/kg', precio_base: 3.20, estacionalidad: 0.40, tendencia: 0.015 },
    ],
    lonjas: [
      { id: 'reus', label: 'Lonja de Reus', ubicacion: 'Cataluña · referencia mundial' },
    ],
  },
  {
    id: 'porcino', label: 'Porcino', icon: 'p', unidad: '€/kg vivo',
    descripcion: 'Cebo, ibérico, lechón · Mercolleida es la referencia europea',
    variedades: [
      { id: 'cebo',     label: 'Cerdo cebo (capa blanca)', unidad: '€/kg vivo', precio_base: 1.62, estacionalidad: 0.18, tendencia: 0.004 },
      { id: 'iberico',  label: 'Ibérico de campo',         unidad: '€/kg vivo', precio_base: 3.45, estacionalidad: 0.35, tendencia: 0.008 },
      { id: 'lechon',   label: 'Lechón 20kg',              unidad: '€/lechón',  precio_base:  72, estacionalidad: 12,    tendencia: 0.5 },
    ],
    lonjas: [
      { id: 'mercolleida', label: 'Mercolleida · Lonja de Lleida', ubicacion: 'Cataluña · referencia EU' },
      { id: 'bellpuig',    label: 'Lonja de Bellpuig',             ubicacion: 'Cataluña', diferencial: -0.5 },
    ],
  },
  {
    id: 'vacuno', label: 'Vacuno', icon: 'V', unidad: '€/kg canal',
    descripcion: 'Añojo, ternera de cebadero · ratio R3 referencia',
    variedades: [
      { id: 'anojo',     label: 'Añojo R3',           unidad: '€/kg canal', precio_base: 5.65, estacionalidad: 0.30, tendencia: 0.012 },
      { id: 'ternera',   label: 'Ternera cebadero',   unidad: '€/kg canal', precio_base: 6.20, estacionalidad: 0.32, tendencia: 0.014 },
    ],
    lonjas: [
      { id: 'talavera', label: 'Lonja de Talavera de la Reina', ubicacion: 'Castilla-La Mancha' },
      { id: 'ebro',     label: 'Lonja del Ebro · Binéfar',       ubicacion: 'Aragón',           diferencial: 0.6 },
    ],
  },
  {
    id: 'ovino', label: 'Ovino', icon: 'O', unidad: '€/kg canal',
    descripcion: 'Cordero ligero, cordero pesado · campañas estacionales fuertes',
    variedades: [
      { id: 'ligero',  label: 'Cordero ligero (12-15 kg)', unidad: '€/kg canal', precio_base: 7.20, estacionalidad: 1.10, tendencia: 0.02 },
      { id: 'pesado',  label: 'Cordero pesado (>23 kg)',   unidad: '€/kg canal', precio_base: 5.80, estacionalidad: 0.85, tendencia: 0.015 },
    ],
    lonjas: [
      { id: 'ebro',     label: 'Lonja del Ebro · Binéfar',     ubicacion: 'Aragón · referencia ovino' },
      { id: 'talavera', label: 'Lonja de Talavera de la Reina', ubicacion: 'Castilla-La Mancha', diferencial: -0.5 },
    ],
  },
]

// ─── Generador de series ───────────────────────────────────────────────
function generarSerieMensual(v: Variedad, l: Lonja, months = 12): Array<{ t: string; v: number }> {
  const now = new Date()
  const out: Array<{ t: string; v: number }> = []
  const baseAjustada = v.precio_base * (1 + (l.diferencial || 0) / 100)
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const trend = baseAjustada + (v.tendencia || 0) * (months - i)
    const seasonal = (v.estacionalidad || 0) * Math.sin(((d.getMonth() + 1) / 12) * 2 * Math.PI)
    const noise = (Math.random() - 0.5) * 2 * (v.estacionalidad || baseAjustada * 0.04) * 0.3
    const value = trend + seasonal + noise
    // Decimales según unidad
    const decimals = v.unidad.includes('Tm') || v.unidad.includes('Hl') ? 0 : v.unidad.includes('lechón') ? 1 : 2
    out.push({ t, v: Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals) })
  }
  return out
}

export async function GET() {
  const t0 = Date.now()
  // Para cada cultivo, generar series por todas las combinaciones variedad×lonja
  const cultivosConSeries = CULTIVOS.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    unidad: c.unidad,
    descripcion: c.descripcion,
    variedades: c.variedades.map(v => ({
      id: v.id, label: v.label, unidad: v.unidad,
    })),
    lonjas: c.lonjas,
    // series: { variedad_id: { lonja_id: Array<{t,v}> } }
    series: c.variedades.reduce<Record<string, Record<string, Array<{ t: string; v: number }>>>>((acc, v) => {
      acc[v.id] = c.lonjas.reduce<Record<string, Array<{ t: string; v: number }>>>((acc2, l) => {
        acc2[l.id] = generarSerieMensual(v, l, 12)
        return acc2
      }, {})
      return acc
    }, {}),
  }))

  return NextResponse.json({
    cultivos: cultivosConSeries,
    n_cultivos: cultivosConSeries.length,
    n_series_total: cultivosConSeries.reduce((s, c) => s + c.variedades.length * c.lonjas.length, 0),
    fetched_at: new Date().toISOString(),
    fetch_ms: Date.now() - t0,
    fuente: 'MAPA · Lonjas oficiales (Salamanca, León, Córdoba, Mercolleida, Reus, Talavera, Ebro…) · calibrado mayo 2026',
    fuente_note: 'Demo · series mensuales con tendencia + estacionalidad. Sustituible por feeds reales del MAPA cuando estén integrados.',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}
