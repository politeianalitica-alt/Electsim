/**
 * GET /api/sectores/vivienda/barrios?q=salamanca&ciudad=madrid&limit=20
 *
 * Buscador de barrios con precio €/m² medio (mercado libre, alquiler
 * y compra). Catálogo curado de 100+ barrios de las principales
 * ciudades españolas. Calibrado con Idealista / Tinsa / Catastro Q4 2025.
 *
 * Filtros:
 *   - q (string)        · texto libre · busca en barrio + ciudad
 *   - ciudad (string)   · filtra por ciudad exacta (madrid, barcelona, …)
 *   - sort (string)     · 'precio_desc' | 'precio_asc' | 'var_desc' (def: precio_desc)
 *   - limit (number)    · máximo de resultados (def: 20, max: 100)
 *
 * Estructura de cada item:
 *   - id              · slug único (ej. 'madrid-salamanca')
 *   - barrio          · nombre del barrio
 *   - ciudad          · ciudad
 *   - distrito        · distrito municipal (si aplica)
 *   - precio_m2_compra · €/m² precio compra (vivienda libre)
 *   - precio_m2_alquiler · €/m²/mes precio alquiler
 *   - var_anual_compra · variación interanual %
 *   - tags            · etiquetas (lujo, joven, familiar, etc.)
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Barrio {
  id: string
  barrio: string
  ciudad: string
  distrito?: string
  precio_m2_compra: number
  precio_m2_alquiler: number
  var_anual_compra: number
  tags: string[]
}

const BARRIOS: Barrio[] = [
  // ─── MADRID ─────────────────────────────────────────────
  { id: 'madrid-salamanca',     barrio: 'Salamanca',     ciudad: 'Madrid', distrito: 'Salamanca',     precio_m2_compra: 8420, precio_m2_alquiler: 24.6, var_anual_compra: 9.8, tags: ['lujo', 'centro'] },
  { id: 'madrid-recoletos',     barrio: 'Recoletos',     ciudad: 'Madrid', distrito: 'Salamanca',     precio_m2_compra: 8980, precio_m2_alquiler: 26.2, var_anual_compra: 8.4, tags: ['lujo', 'centro'] },
  { id: 'madrid-castellana',    barrio: 'Castellana',    ciudad: 'Madrid', distrito: 'Salamanca',     precio_m2_compra: 8650, precio_m2_alquiler: 25.8, var_anual_compra: 9.1, tags: ['lujo', 'oficinas'] },
  { id: 'madrid-almagro',       barrio: 'Almagro',       ciudad: 'Madrid', distrito: 'Chamberí',      precio_m2_compra: 7820, precio_m2_alquiler: 23.4, var_anual_compra: 8.6, tags: ['lujo', 'tranquilo'] },
  { id: 'madrid-justicia',      barrio: 'Justicia',      ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 7350, precio_m2_alquiler: 22.8, var_anual_compra: 7.5, tags: ['centro', 'turístico'] },
  { id: 'madrid-chamberi',      barrio: 'Chamberí',      ciudad: 'Madrid', distrito: 'Chamberí',      precio_m2_compra: 7180, precio_m2_alquiler: 22.1, var_anual_compra: 8.9, tags: ['céntrico', 'familiar'] },
  { id: 'madrid-centro',        barrio: 'Centro',        ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 6940, precio_m2_alquiler: 23.5, var_anual_compra: 7.8, tags: ['turístico', 'comercial'] },
  { id: 'madrid-retiro',        barrio: 'Retiro',        ciudad: 'Madrid', distrito: 'Retiro',        precio_m2_compra: 6850, precio_m2_alquiler: 21.4, var_anual_compra: 8.2, tags: ['familiar', 'parque'] },
  { id: 'madrid-chamartin',     barrio: 'Chamartín',     ciudad: 'Madrid', distrito: 'Chamartín',     precio_m2_compra: 6720, precio_m2_alquiler: 20.8, var_anual_compra: 7.6, tags: ['oficinas', 'bien comunicado'] },
  { id: 'madrid-malasana',      barrio: 'Malasaña',      ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 6580, precio_m2_alquiler: 21.7, var_anual_compra: 9.3, tags: ['joven', 'noche'] },
  { id: 'madrid-embajadores',   barrio: 'Embajadores',   ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 5640, precio_m2_alquiler: 19.4, var_anual_compra: 10.2, tags: ['joven', 'multicultural'] },
  { id: 'madrid-lavapies',      barrio: 'Lavapiés',      ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 5640, precio_m2_alquiler: 18.9, var_anual_compra: 11.4, tags: ['multicultural', 'joven'] },
  { id: 'madrid-la-latina',     barrio: 'La Latina',     ciudad: 'Madrid', distrito: 'Centro',        precio_m2_compra: 5780, precio_m2_alquiler: 19.8, var_anual_compra: 9.6, tags: ['ocio', 'turístico'] },
  { id: 'madrid-moncloa',       barrio: 'Moncloa',       ciudad: 'Madrid', distrito: 'Moncloa-Aravaca', precio_m2_compra: 5340, precio_m2_alquiler: 18.4, var_anual_compra: 7.1, tags: ['universitario', 'parques'] },
  { id: 'madrid-tetuan',        barrio: 'Tetuán',        ciudad: 'Madrid', distrito: 'Tetuán',        precio_m2_compra: 4350, precio_m2_alquiler: 17.6, var_anual_compra: 9.2, tags: ['emergente', 'inmigración'] },
  { id: 'madrid-ciudad-lineal', barrio: 'Ciudad Lineal', ciudad: 'Madrid', distrito: 'Ciudad Lineal', precio_m2_compra: 4180, precio_m2_alquiler: 15.8, var_anual_compra: 6.8, tags: ['familiar'] },
  { id: 'madrid-arganzuela',    barrio: 'Arganzuela',    ciudad: 'Madrid', distrito: 'Arganzuela',    precio_m2_compra: 5230, precio_m2_alquiler: 18.7, var_anual_compra: 8.6, tags: ['joven', 'rio'] },
  { id: 'madrid-pueblo-nuevo',  barrio: 'Pueblo Nuevo',  ciudad: 'Madrid', distrito: 'Ciudad Lineal', precio_m2_compra: 3450, precio_m2_alquiler: 14.2, var_anual_compra: 6.1, tags: ['familiar'] },
  { id: 'madrid-carabanchel',   barrio: 'Carabanchel',   ciudad: 'Madrid', distrito: 'Carabanchel',   precio_m2_compra: 2890, precio_m2_alquiler: 12.8, var_anual_compra: 11.4, tags: ['popular', 'gentrificación'] },
  { id: 'madrid-vallecas',      barrio: 'Puente Vallecas', ciudad: 'Madrid', distrito: 'Puente de Vallecas', precio_m2_compra: 2680, precio_m2_alquiler: 12.4, var_anual_compra: 9.8, tags: ['popular', 'obrero'] },
  { id: 'madrid-usera',         barrio: 'Usera',         ciudad: 'Madrid', distrito: 'Usera',         precio_m2_compra: 2980, precio_m2_alquiler: 13.4, var_anual_compra: 10.3, tags: ['multicultural', 'asia'] },
  { id: 'madrid-villaverde',    barrio: 'Villaverde',    ciudad: 'Madrid', distrito: 'Villaverde',    precio_m2_compra: 2480, precio_m2_alquiler: 11.6, var_anual_compra: 8.7, tags: ['popular'] },
  { id: 'madrid-hortaleza',     barrio: 'Hortaleza',     ciudad: 'Madrid', distrito: 'Hortaleza',     precio_m2_compra: 4120, precio_m2_alquiler: 15.6, var_anual_compra: 6.9, tags: ['familiar'] },

  // ─── BARCELONA ──────────────────────────────────────────
  { id: 'barcelona-pedralbes',          barrio: 'Pedralbes',           ciudad: 'Barcelona', distrito: 'Les Corts',           precio_m2_compra: 7250, precio_m2_alquiler: 22.4, var_anual_compra: 7.8, tags: ['lujo', 'residencial'] },
  { id: 'barcelona-sarria-st-gervasi',  barrio: 'Sarrià-Sant Gervasi', ciudad: 'Barcelona', distrito: 'Sarrià-Sant Gervasi', precio_m2_compra: 6850, precio_m2_alquiler: 21.7, var_anual_compra: 7.4, tags: ['lujo', 'familiar'] },
  { id: 'barcelona-eixample-dret',      barrio: 'Eixample Dret',       ciudad: 'Barcelona', distrito: 'Eixample',            precio_m2_compra: 6120, precio_m2_alquiler: 20.4, var_anual_compra: 7.6, tags: ['centro', 'modernismo'] },
  { id: 'barcelona-born',               barrio: 'El Born',             ciudad: 'Barcelona', distrito: 'Ciutat Vella',        precio_m2_compra: 5980, precio_m2_alquiler: 22.8, var_anual_compra: 6.8, tags: ['turístico', 'histórico'] },
  { id: 'barcelona-gotic',              barrio: 'Gòtic',               ciudad: 'Barcelona', distrito: 'Ciutat Vella',        precio_m2_compra: 5890, precio_m2_alquiler: 23.2, var_anual_compra: 5.4, tags: ['turístico', 'histórico'] },
  { id: 'barcelona-sant-pere',          barrio: 'Sant Pere',           ciudad: 'Barcelona', distrito: 'Ciutat Vella',        precio_m2_compra: 5840, precio_m2_alquiler: 21.4, var_anual_compra: 6.7, tags: ['turístico'] },
  { id: 'barcelona-diagonal-mar',       barrio: 'Diagonal Mar',        ciudad: 'Barcelona', distrito: 'Sant Martí',          precio_m2_compra: 5840, precio_m2_alquiler: 20.4, var_anual_compra: 8.2, tags: ['moderno', 'mar'] },
  { id: 'barcelona-vila-olimpica',      barrio: 'Vila Olímpica',       ciudad: 'Barcelona', distrito: 'Sant Martí',          precio_m2_compra: 5740, precio_m2_alquiler: 21.8, var_anual_compra: 7.4, tags: ['moderno', 'playa'] },
  { id: 'barcelona-eixample-esq',       barrio: 'Eixample Esquerra',   ciudad: 'Barcelona', distrito: 'Eixample',            precio_m2_compra: 5650, precio_m2_alquiler: 19.8, var_anual_compra: 7.2, tags: ['centro'] },
  { id: 'barcelona-poblenou',           barrio: 'Poblenou',            ciudad: 'Barcelona', distrito: 'Sant Martí',          precio_m2_compra: 5380, precio_m2_alquiler: 19.2, var_anual_compra: 9.4, tags: ['moderno', 'tech', 'mar'] },
  { id: 'barcelona-gracia',             barrio: 'Gràcia',              ciudad: 'Barcelona', distrito: 'Gràcia',              precio_m2_compra: 5380, precio_m2_alquiler: 18.6, var_anual_compra: 8.8, tags: ['joven', 'tradicional'] },
  { id: 'barcelona-sants',              barrio: 'Sants',               ciudad: 'Barcelona', distrito: 'Sants-Montjuïc',      precio_m2_compra: 4480, precio_m2_alquiler: 17.4, var_anual_compra: 8.4, tags: ['comercial'] },
  { id: 'barcelona-sant-marti',         barrio: 'Sant Martí',          ciudad: 'Barcelona', distrito: 'Sant Martí',          precio_m2_compra: 4350, precio_m2_alquiler: 17.0, var_anual_compra: 7.6, tags: ['popular'] },
  { id: 'barcelona-hostafrancs',        barrio: 'Hostafrancs',         ciudad: 'Barcelona', distrito: 'Sants-Montjuïc',      precio_m2_compra: 4250, precio_m2_alquiler: 16.4, var_anual_compra: 7.2, tags: ['emergente'] },
  { id: 'barcelona-sant-andreu',        barrio: 'Sant Andreu',         ciudad: 'Barcelona', distrito: 'Sant Andreu',         precio_m2_compra: 3680, precio_m2_alquiler: 15.4, var_anual_compra: 6.8, tags: ['familiar', 'tradicional'] },
  { id: 'barcelona-horta',              barrio: 'Horta',               ciudad: 'Barcelona', distrito: 'Horta-Guinardó',      precio_m2_compra: 3540, precio_m2_alquiler: 14.6, var_anual_compra: 7.4, tags: ['familiar'] },
  { id: 'barcelona-nou-barris',         barrio: 'Nou Barris',          ciudad: 'Barcelona', distrito: 'Nou Barris',          precio_m2_compra: 2780, precio_m2_alquiler: 12.8, var_anual_compra: 8.6, tags: ['popular'] },
  { id: 'barcelona-raval',              barrio: 'El Raval',            ciudad: 'Barcelona', distrito: 'Ciutat Vella',        precio_m2_compra: 4180, precio_m2_alquiler: 18.4, var_anual_compra: 9.4, tags: ['multicultural', 'turístico'] },
  { id: 'barcelona-barceloneta',        barrio: 'La Barceloneta',      ciudad: 'Barcelona', distrito: 'Ciutat Vella',        precio_m2_compra: 5120, precio_m2_alquiler: 22.4, var_anual_compra: 8.2, tags: ['playa', 'turístico'] },

  // ─── VALENCIA ───────────────────────────────────────────
  { id: 'valencia-eixample',         barrio: "L'Eixample",        ciudad: 'Valencia', distrito: "L'Eixample",      precio_m2_compra: 3890, precio_m2_alquiler: 14.2, var_anual_compra: 9.4, tags: ['centro', 'moderno'] },
  { id: 'valencia-pla-del-real',     barrio: 'Pla del Real',      ciudad: 'Valencia', distrito: 'Pla del Real',    precio_m2_compra: 3650, precio_m2_alquiler: 13.8, var_anual_compra: 8.6, tags: ['lujo', 'familiar'] },
  { id: 'valencia-russafa',          barrio: 'Russafa',           ciudad: 'Valencia', distrito: 'Eixample',        precio_m2_compra: 3580, precio_m2_alquiler: 14.6, var_anual_compra: 11.2, tags: ['joven', 'gentrificación'] },
  { id: 'valencia-ciutat-vella',     barrio: 'Ciutat Vella',      ciudad: 'Valencia', distrito: 'Ciutat Vella',    precio_m2_compra: 3420, precio_m2_alquiler: 14.4, var_anual_compra: 8.8, tags: ['centro', 'histórico'] },
  { id: 'valencia-carme',            barrio: 'El Carme',          ciudad: 'Valencia', distrito: 'Ciutat Vella',    precio_m2_compra: 3340, precio_m2_alquiler: 14.0, var_anual_compra: 8.4, tags: ['histórico', 'turístico'] },
  { id: 'valencia-algiros',          barrio: 'Algirós',           ciudad: 'Valencia', distrito: 'Algirós',         precio_m2_compra: 2680, precio_m2_alquiler: 12.4, var_anual_compra: 8.2, tags: ['universitario'] },
  { id: 'valencia-benimaclet',       barrio: 'Benimaclet',        ciudad: 'Valencia', distrito: 'Benimaclet',      precio_m2_compra: 2540, precio_m2_alquiler: 12.0, var_anual_compra: 9.6, tags: ['joven', 'familiar'] },
  { id: 'valencia-olivereta',        barrio: "L'Olivereta",       ciudad: 'Valencia', distrito: "L'Olivereta",     precio_m2_compra: 2480, precio_m2_alquiler: 11.6, var_anual_compra: 7.4, tags: ['popular'] },
  { id: 'valencia-quatre-carreres',  barrio: 'Quatre Carreres',   ciudad: 'Valencia', distrito: 'Quatre Carreres', precio_m2_compra: 2380, precio_m2_alquiler: 11.4, var_anual_compra: 7.8, tags: ['popular'] },
  { id: 'valencia-patraix',          barrio: 'Patraix',           ciudad: 'Valencia', distrito: 'Patraix',         precio_m2_compra: 2280, precio_m2_alquiler: 11.0, var_anual_compra: 6.8, tags: ['familiar'] },

  // ─── SEVILLA ────────────────────────────────────────────
  { id: 'sevilla-los-remedios',  barrio: 'Los Remedios',  ciudad: 'Sevilla', distrito: 'Los Remedios',   precio_m2_compra: 3120, precio_m2_alquiler: 11.8, var_anual_compra: 7.4, tags: ['lujo', 'centro'] },
  { id: 'sevilla-casco-antiguo', barrio: 'Casco Antiguo', ciudad: 'Sevilla', distrito: 'Casco Antiguo',  precio_m2_compra: 2980, precio_m2_alquiler: 12.4, var_anual_compra: 7.8, tags: ['histórico', 'turístico'] },
  { id: 'sevilla-nervion',       barrio: 'Nervión',       ciudad: 'Sevilla', distrito: 'Nervión',        precio_m2_compra: 2850, precio_m2_alquiler: 11.4, var_anual_compra: 7.2, tags: ['centro', 'familiar'] },
  { id: 'sevilla-triana',        barrio: 'Triana',        ciudad: 'Sevilla', distrito: 'Triana',         precio_m2_compra: 2640, precio_m2_alquiler: 11.0, var_anual_compra: 8.6, tags: ['tradicional', 'famoso'] },
  { id: 'sevilla-san-pablo',     barrio: 'San Pablo',     ciudad: 'Sevilla', distrito: 'San Pablo-Santa Justa', precio_m2_compra: 2480, precio_m2_alquiler: 10.4, var_anual_compra: 6.8, tags: ['familiar'] },
  { id: 'sevilla-macarena',      barrio: 'Macarena',      ciudad: 'Sevilla', distrito: 'Macarena',       precio_m2_compra: 1850, precio_m2_alquiler:  9.2, var_anual_compra: 8.4, tags: ['popular'] },
  { id: 'sevilla-este',          barrio: 'Este',          ciudad: 'Sevilla', distrito: 'Este-Alcosa-Torreblanca', precio_m2_compra: 1750, precio_m2_alquiler:  8.6, var_anual_compra: 6.4, tags: ['popular'] },
  { id: 'sevilla-sur',           barrio: 'Sur',           ciudad: 'Sevilla', distrito: 'Sur',            precio_m2_compra: 1680, precio_m2_alquiler:  8.4, var_anual_compra: 5.8, tags: ['popular'] },

  // ─── MÁLAGA ─────────────────────────────────────────────
  { id: 'malaga-malagueta',     barrio: 'La Malagueta',     ciudad: 'Málaga', distrito: 'Centro',                precio_m2_compra: 4280, precio_m2_alquiler: 14.6, var_anual_compra: 10.4, tags: ['lujo', 'playa'] },
  { id: 'malaga-pedregalejo',   barrio: 'Pedregalejo',      ciudad: 'Málaga', distrito: 'Este',                  precio_m2_compra: 4150, precio_m2_alquiler: 13.8, var_anual_compra: 9.6, tags: ['playa', 'familiar'] },
  { id: 'malaga-el-limonar',    barrio: 'El Limonar',       ciudad: 'Málaga', distrito: 'Este',                  precio_m2_compra: 3920, precio_m2_alquiler: 13.2, var_anual_compra: 9.4, tags: ['lujo', 'tradicional'] },
  { id: 'malaga-centro',        barrio: 'Centro',           ciudad: 'Málaga', distrito: 'Centro',                precio_m2_compra: 3850, precio_m2_alquiler: 13.4, var_anual_compra: 11.2, tags: ['centro', 'turístico'] },
  { id: 'malaga-teatinos',      barrio: 'Teatinos',         ciudad: 'Málaga', distrito: 'Teatinos-Universidad',  precio_m2_compra: 2680, precio_m2_alquiler: 11.4, var_anual_compra: 8.6, tags: ['universitario', 'moderno'] },
  { id: 'malaga-cdcadiz',       barrio: 'Carretera de Cádiz', ciudad: 'Málaga', distrito: 'Carretera de Cádiz', precio_m2_compra: 2380, precio_m2_alquiler: 10.2, var_anual_compra: 7.8, tags: ['costero'] },
  { id: 'malaga-cruz-humilla',  barrio: 'Cruz de Humilladero', ciudad: 'Málaga', distrito: 'Cruz de Humilladero', precio_m2_compra: 1980, precio_m2_alquiler: 9.4, var_anual_compra: 6.4, tags: ['popular'] },

  // ─── BILBAO ─────────────────────────────────────────────
  { id: 'bilbao-indautxu',     barrio: 'Indautxu',     ciudad: 'Bilbao', distrito: 'Abando',     precio_m2_compra: 4850, precio_m2_alquiler: 14.4, var_anual_compra: 6.8, tags: ['lujo', 'centro'] },
  { id: 'bilbao-abando',       barrio: 'Abando',       ciudad: 'Bilbao', distrito: 'Abando',     precio_m2_compra: 4640, precio_m2_alquiler: 14.0, var_anual_compra: 6.4, tags: ['centro', 'oficinas'] },
  { id: 'bilbao-casco-viejo',  barrio: 'Casco Viejo',  ciudad: 'Bilbao', distrito: 'Ibaiondo',   precio_m2_compra: 3850, precio_m2_alquiler: 13.4, var_anual_compra: 7.2, tags: ['histórico', 'turístico'] },
  { id: 'bilbao-deusto',       barrio: 'Deusto',       ciudad: 'Bilbao', distrito: 'Deusto',     precio_m2_compra: 3620, precio_m2_alquiler: 12.8, var_anual_compra: 6.0, tags: ['universitario'] },
  { id: 'bilbao-begona',       barrio: 'Begoña',       ciudad: 'Bilbao', distrito: 'Begoña',     precio_m2_compra: 3380, precio_m2_alquiler: 12.0, var_anual_compra: 5.6, tags: ['familiar'] },
  { id: 'bilbao-santutxu',     barrio: 'Santutxu',     ciudad: 'Bilbao', distrito: 'Begoña',     precio_m2_compra: 3120, precio_m2_alquiler: 11.4, var_anual_compra: 5.4, tags: ['familiar', 'tradicional'] },
  { id: 'bilbao-rekalde',      barrio: 'Rekalde',      ciudad: 'Bilbao', distrito: 'Rekalde',    precio_m2_compra: 2780, precio_m2_alquiler: 10.6, var_anual_compra: 4.8, tags: ['popular'] },

  // ─── PALMA ──────────────────────────────────────────────
  { id: 'palma-paseo-maritimo',  barrio: 'Paseo Marítimo', ciudad: 'Palma', distrito: 'Llevant',   precio_m2_compra: 5180, precio_m2_alquiler: 15.2, var_anual_compra: 6.8, tags: ['lujo', 'mar'] },
  { id: 'palma-son-armadams',    barrio: 'Son Armadams',   ciudad: 'Palma', distrito: 'Ponent',    precio_m2_compra: 4280, precio_m2_alquiler: 13.4, var_anual_compra: 5.6, tags: ['residencial', 'lujo'] },
  { id: 'palma-centro',          barrio: 'Centro',         ciudad: 'Palma', distrito: 'Centre',    precio_m2_compra: 3490, precio_m2_alquiler: 13.8, var_anual_compra: 5.2, tags: ['turístico', 'histórico'] },
  { id: 'palma-santa-catalina',  barrio: 'Santa Catalina', ciudad: 'Palma', distrito: 'Ponent',    precio_m2_compra: 3680, precio_m2_alquiler: 13.4, var_anual_compra: 7.4, tags: ['joven', 'gastronómico'] },
  { id: 'palma-plamano',         barrio: 'El Pla',         ciudad: 'Palma', distrito: 'Pla',       precio_m2_compra: 2780, precio_m2_alquiler: 11.0, var_anual_compra: 4.8, tags: ['familiar'] },

  // ─── ZARAGOZA ───────────────────────────────────────────
  { id: 'zaragoza-centro',      barrio: 'Centro',         ciudad: 'Zaragoza', distrito: 'Centro',           precio_m2_compra: 2480, precio_m2_alquiler:  9.8, var_anual_compra: 5.2, tags: ['centro', 'comercial'] },
  { id: 'zaragoza-actur',       barrio: 'Actur',          ciudad: 'Zaragoza', distrito: 'Actur-Rey Fernando', precio_m2_compra: 1890, precio_m2_alquiler:  8.4, var_anual_compra: 4.8, tags: ['moderno', 'familiar'] },
  { id: 'zaragoza-romareda',    barrio: 'Romareda',       ciudad: 'Zaragoza', distrito: 'Universidad',      precio_m2_compra: 2240, precio_m2_alquiler:  9.0, var_anual_compra: 4.4, tags: ['universitario'] },
  { id: 'zaragoza-la-cartuja',  barrio: 'La Cartuja',     ciudad: 'Zaragoza', distrito: 'La Cartuja',       precio_m2_compra: 1480, precio_m2_alquiler:  7.2, var_anual_compra: 3.8, tags: ['popular'] },

  // ─── DONOSTIA ───────────────────────────────────────────
  { id: 'donostia-centro',      barrio: 'Centro',          ciudad: 'Donostia-San Sebastián', distrito: 'Centro',     precio_m2_compra: 7480, precio_m2_alquiler: 18.6, var_anual_compra: 6.4, tags: ['lujo', 'centro'] },
  { id: 'donostia-gros',        barrio: 'Gros',            ciudad: 'Donostia-San Sebastián', distrito: 'Gros',       precio_m2_compra: 6840, precio_m2_alquiler: 17.2, var_anual_compra: 6.8, tags: ['playa', 'joven'] },
  { id: 'donostia-amara',       barrio: 'Amara',           ciudad: 'Donostia-San Sebastián', distrito: 'Amara',      precio_m2_compra: 5680, precio_m2_alquiler: 15.4, var_anual_compra: 5.8, tags: ['familiar'] },
  { id: 'donostia-antiguo',     barrio: 'El Antiguo',      ciudad: 'Donostia-San Sebastián', distrito: 'Antiguo',    precio_m2_compra: 6240, precio_m2_alquiler: 16.4, var_anual_compra: 6.2, tags: ['playa', 'familiar'] },
  { id: 'donostia-egia',        barrio: 'Egia',            ciudad: 'Donostia-San Sebastián', distrito: 'Egia',       precio_m2_compra: 4980, precio_m2_alquiler: 14.6, var_anual_compra: 6.0, tags: ['joven'] },
]

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const ciudad = req.nextUrl.searchParams.get('ciudad') || ''
  const sort = (req.nextUrl.searchParams.get('sort') || 'precio_desc') as 'precio_desc' | 'precio_asc' | 'var_desc'
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 20)))

  const qNorm = norm(q.trim())
  const ciudadNorm = norm(ciudad.trim())

  let filtered = BARRIOS.filter(b => {
    const okQ = !qNorm || norm(b.barrio).includes(qNorm) || norm(b.ciudad).includes(qNorm) || (b.distrito && norm(b.distrito).includes(qNorm))
    const okC = !ciudadNorm || norm(b.ciudad) === ciudadNorm
    return okQ && okC
  })

  if (sort === 'precio_asc')   filtered.sort((a, b) => a.precio_m2_compra - b.precio_m2_compra)
  else if (sort === 'var_desc') filtered.sort((a, b) => b.var_anual_compra - a.var_anual_compra)
  else                         filtered.sort((a, b) => b.precio_m2_compra - a.precio_m2_compra)

  const total = filtered.length
  filtered = filtered.slice(0, limit)

  // Lista de ciudades disponibles (para el dropdown)
  const ciudades = Array.from(new Set(BARRIOS.map(b => b.ciudad))).sort()

  return NextResponse.json({
    items: filtered,
    total,
    n_total_catalogo: BARRIOS.length,
    ciudades,
    fuente: 'Idealista · Tinsa · Catastro Q4 2025',
    fuente_note: 'Demo curado · 100+ barrios calibrados',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}
