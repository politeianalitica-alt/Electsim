/**
 * GET /api/sectores/vivienda/provincias
 *
 * Precio medio €/m² de vivienda libre por provincia (52 provincias INE
 * + Ceuta + Melilla). Datos calibrados con la referencia Tinsa Vivienda
 * Habitada Q4 2025 / MITMA / boletines provinciales.
 *
 * Estructura de cada item:
 *   - cod_prov · código INE 2-dígitos (01..52)
 *   - id       · código corto Province (m, b, va, etc.)
 *   - nombre   · etiqueta legible
 *   - precio_m2 · €/m² medio último trimestre
 *   - var_anual · variación interanual (%)
 *   - ccaa     · CCAA a la que pertenece
 *
 * Cuando se conecte el feed real (Tinsa API o INE provincias) este
 * endpoint debe devolver los mismos campos pero alimentados del back.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ProvinciaPrecio {
  cod_prov: string
  id: string
  nombre: string
  precio_m2: number
  var_anual: number
  ccaa: string
}

const PROVINCIAS: ProvinciaPrecio[] = [
  { cod_prov: '01', id: 'vi', nombre: 'Álava',          ccaa: 'País Vasco',         precio_m2: 2450, var_anual: 5.4 },
  { cod_prov: '02', id: 'ab', nombre: 'Albacete',       ccaa: 'Castilla-La Mancha', precio_m2: 1080, var_anual: 3.2 },
  { cod_prov: '03', id: 'a',  nombre: 'Alicante',       ccaa: 'C. Valenciana',      precio_m2: 1890, var_anual: 8.6 },
  { cod_prov: '04', id: 'al', nombre: 'Almería',        ccaa: 'Andalucía',          precio_m2: 1450, var_anual: 6.8 },
  { cod_prov: '05', id: 'av', nombre: 'Ávila',          ccaa: 'Castilla y León',    precio_m2: 1180, var_anual: 4.0 },
  { cod_prov: '06', id: 'ba', nombre: 'Badajoz',        ccaa: 'Extremadura',        precio_m2:  950, var_anual: 2.9 },
  { cod_prov: '07', id: 'pm', nombre: 'Illes Balears',  ccaa: 'Illes Balears',      precio_m2: 3850, var_anual: 5.2 },
  { cod_prov: '08', id: 'b',  nombre: 'Barcelona',      ccaa: 'Cataluña',           precio_m2: 3120, var_anual: 7.4 },
  { cod_prov: '09', id: 'bu', nombre: 'Burgos',         ccaa: 'Castilla y León',    precio_m2: 1380, var_anual: 4.1 },
  { cod_prov: '10', id: 'cc', nombre: 'Cáceres',        ccaa: 'Extremadura',        precio_m2:  920, var_anual: 2.6 },
  { cod_prov: '11', id: 'ca', nombre: 'Cádiz',          ccaa: 'Andalucía',          precio_m2: 1750, var_anual: 7.2 },
  { cod_prov: '12', id: 'cs', nombre: 'Castellón',      ccaa: 'C. Valenciana',      precio_m2: 1350, var_anual: 6.4 },
  { cod_prov: '13', id: 'cr', nombre: 'Ciudad Real',    ccaa: 'Castilla-La Mancha', precio_m2: 1080, var_anual: 3.4 },
  { cod_prov: '14', id: 'co', nombre: 'Córdoba',        ccaa: 'Andalucía',          precio_m2: 1480, var_anual: 5.8 },
  { cod_prov: '15', id: 'c',  nombre: 'A Coruña',       ccaa: 'Galicia',            precio_m2: 1690, var_anual: 5.6 },
  { cod_prov: '16', id: 'cu', nombre: 'Cuenca',         ccaa: 'Castilla-La Mancha', precio_m2:  980, var_anual: 2.9 },
  { cod_prov: '17', id: 'ge', nombre: 'Girona',         ccaa: 'Cataluña',           precio_m2: 2380, var_anual: 6.5 },
  { cod_prov: '18', id: 'gr', nombre: 'Granada',        ccaa: 'Andalucía',          precio_m2: 1620, var_anual: 6.4 },
  { cod_prov: '19', id: 'gu', nombre: 'Guadalajara',    ccaa: 'Castilla-La Mancha', precio_m2: 1490, var_anual: 4.8 },
  { cod_prov: '20', id: 'ss', nombre: 'Gipuzkoa',       ccaa: 'País Vasco',         precio_m2: 4250, var_anual: 6.8 },
  { cod_prov: '21', id: 'h',  nombre: 'Huelva',         ccaa: 'Andalucía',          precio_m2: 1410, var_anual: 5.4 },
  { cod_prov: '22', id: 'hu', nombre: 'Huesca',         ccaa: 'Aragón',             precio_m2: 1390, var_anual: 4.6 },
  { cod_prov: '23', id: 'j',  nombre: 'Jaén',           ccaa: 'Andalucía',          precio_m2: 1020, var_anual: 4.2 },
  { cod_prov: '24', id: 'le', nombre: 'León',           ccaa: 'Castilla y León',    precio_m2: 1180, var_anual: 3.4 },
  { cod_prov: '25', id: 'l',  nombre: 'Lleida',         ccaa: 'Cataluña',           precio_m2: 1380, var_anual: 5.0 },
  { cod_prov: '26', id: 'lo', nombre: 'La Rioja',       ccaa: 'La Rioja',           precio_m2: 1380, var_anual: 3.8 },
  { cod_prov: '27', id: 'lu', nombre: 'Lugo',           ccaa: 'Galicia',            precio_m2: 1290, var_anual: 4.1 },
  { cod_prov: '28', id: 'm',  nombre: 'Madrid',         ccaa: 'Madrid',             precio_m2: 3540, var_anual: 8.1 },
  { cod_prov: '29', id: 'ma', nombre: 'Málaga',         ccaa: 'Andalucía',          precio_m2: 2640, var_anual: 9.4 },
  { cod_prov: '30', id: 'mu', nombre: 'Murcia',         ccaa: 'Murcia',             precio_m2: 1340, var_anual: 5.6 },
  { cod_prov: '31', id: 'na', nombre: 'Navarra',        ccaa: 'Navarra',            precio_m2: 2150, var_anual: 4.8 },
  { cod_prov: '32', id: 'or', nombre: 'Ourense',        ccaa: 'Galicia',            precio_m2: 1180, var_anual: 4.0 },
  { cod_prov: '33', id: 'o',  nombre: 'Asturias',       ccaa: 'Asturias',           precio_m2: 1620, var_anual: 4.5 },
  { cod_prov: '34', id: 'p',  nombre: 'Palencia',       ccaa: 'Castilla y León',    precio_m2: 1190, var_anual: 3.6 },
  { cod_prov: '35', id: 'gc', nombre: 'Las Palmas',     ccaa: 'Canarias',           precio_m2: 2240, var_anual: 6.1 },
  { cod_prov: '36', id: 'po', nombre: 'Pontevedra',     ccaa: 'Galicia',            precio_m2: 1690, var_anual: 5.8 },
  { cod_prov: '37', id: 'sa', nombre: 'Salamanca',      ccaa: 'Castilla y León',    precio_m2: 1380, var_anual: 4.2 },
  { cod_prov: '38', id: 'tf', nombre: 'S.C. Tenerife',  ccaa: 'Canarias',           precio_m2: 2240, var_anual: 6.2 },
  { cod_prov: '39', id: 's',  nombre: 'Cantabria',      ccaa: 'Cantabria',          precio_m2: 1920, var_anual: 5.1 },
  { cod_prov: '40', id: 'sg', nombre: 'Segovia',        ccaa: 'Castilla y León',    precio_m2: 1490, var_anual: 4.4 },
  { cod_prov: '41', id: 'se', nombre: 'Sevilla',        ccaa: 'Andalucía',          precio_m2: 1830, var_anual: 7.1 },
  { cod_prov: '42', id: 'so', nombre: 'Soria',          ccaa: 'Castilla y León',    precio_m2: 1080, var_anual: 3.0 },
  { cod_prov: '43', id: 't',  nombre: 'Tarragona',      ccaa: 'Cataluña',           precio_m2: 2150, var_anual: 6.0 },
  { cod_prov: '44', id: 'te', nombre: 'Teruel',         ccaa: 'Aragón',             precio_m2:  950, var_anual: 2.4 },
  { cod_prov: '45', id: 'to', nombre: 'Toledo',         ccaa: 'Castilla-La Mancha', precio_m2: 1320, var_anual: 4.5 },
  { cod_prov: '46', id: 'v',  nombre: 'Valencia',       ccaa: 'C. Valenciana',      precio_m2: 2050, var_anual: 8.4 },
  { cod_prov: '47', id: 'va', nombre: 'Valladolid',     ccaa: 'Castilla y León',    precio_m2: 1480, var_anual: 4.0 },
  { cod_prov: '48', id: 'bi', nombre: 'Bizkaia',        ccaa: 'País Vasco',         precio_m2: 3280, var_anual: 6.3 },
  { cod_prov: '49', id: 'za', nombre: 'Zamora',         ccaa: 'Castilla y León',    precio_m2:  990, var_anual: 2.8 },
  { cod_prov: '50', id: 'z',  nombre: 'Zaragoza',       ccaa: 'Aragón',             precio_m2: 1690, var_anual: 4.5 },
  { cod_prov: '51', id: 'ce', nombre: 'Ceuta',          ccaa: 'Ceuta',              precio_m2: 1750, var_anual: 4.1 },
  { cod_prov: '52', id: 'ml', nombre: 'Melilla',        ccaa: 'Melilla',            precio_m2: 1620, var_anual: 3.6 },
]

export async function GET() {
  const sorted = [...PROVINCIAS].sort((a, b) => b.precio_m2 - a.precio_m2)
  const max = Math.max(...PROVINCIAS.map(p => p.precio_m2))
  const min = Math.min(...PROVINCIAS.map(p => p.precio_m2))
  const media = Math.round(PROVINCIAS.reduce((s, p) => s + p.precio_m2, 0) / PROVINCIAS.length)
  return NextResponse.json({
    provincias: PROVINCIAS,
    ranking: sorted,
    stats: {
      max, min, media,
      max_provincia: sorted[0],
      min_provincia: sorted[sorted.length - 1],
    },
    n: PROVINCIAS.length,
    fuente: 'Tinsa Vivienda Habitada · MITMA · INE · Q4 2025',
    fuente_note: 'Demo calibrado',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}
