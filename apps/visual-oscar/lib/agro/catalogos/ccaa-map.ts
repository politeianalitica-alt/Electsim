/**
 * Mapeo NUTS2 ↔ Comunidad Autónoma · Politeia Agro v4
 *
 * Eurostat usa códigos NUTS2 (ES11…ES70) que se corresponden 1:1 con las
 * CCAA españolas (salvo Ceuta/Melilla que son NUTS2 propios). Usado para
 * unir datos regionales Eurostat con el GeoJSON GISCO de coropletas.
 *
 * Verificado contra GISCO NUTS_RG_20M_2021 (19 NUTS2 ES).
 */

export interface CcaaNuts {
  nuts2: string
  nombre: string
  /** Nombre corto para etiquetas de mapa. */
  corto: string
  /** Código INE de CCAA (2 dígitos, zero-padded) = propiedad `cod_ccaa` del
   *  GeoJSON public/geodata/spain-ccaa.geojson. Permite unir datos Eurostat
   *  (NUTS2) con la coropleta. */
  ine: string
}

export const CCAA_NUTS: CcaaNuts[] = [
  { nuts2: 'ES11', nombre: 'Galicia', corto: 'Galicia', ine: '12' },
  { nuts2: 'ES12', nombre: 'Principado de Asturias', corto: 'Asturias', ine: '03' },
  { nuts2: 'ES13', nombre: 'Cantabria', corto: 'Cantabria', ine: '06' },
  { nuts2: 'ES21', nombre: 'País Vasco', corto: 'País Vasco', ine: '16' },
  { nuts2: 'ES22', nombre: 'Comunidad Foral de Navarra', corto: 'Navarra', ine: '15' },
  { nuts2: 'ES23', nombre: 'La Rioja', corto: 'La Rioja', ine: '17' },
  { nuts2: 'ES24', nombre: 'Aragón', corto: 'Aragón', ine: '02' },
  { nuts2: 'ES30', nombre: 'Comunidad de Madrid', corto: 'Madrid', ine: '13' },
  { nuts2: 'ES41', nombre: 'Castilla y León', corto: 'Castilla y León', ine: '07' },
  { nuts2: 'ES42', nombre: 'Castilla-La Mancha', corto: 'Castilla-La Mancha', ine: '08' },
  { nuts2: 'ES43', nombre: 'Extremadura', corto: 'Extremadura', ine: '11' },
  { nuts2: 'ES51', nombre: 'Cataluña', corto: 'Cataluña', ine: '09' },
  { nuts2: 'ES52', nombre: 'Comunitat Valenciana', corto: 'C. Valenciana', ine: '10' },
  { nuts2: 'ES53', nombre: 'Illes Balears', corto: 'Baleares', ine: '04' },
  { nuts2: 'ES61', nombre: 'Andalucía', corto: 'Andalucía', ine: '01' },
  { nuts2: 'ES62', nombre: 'Región de Murcia', corto: 'Murcia', ine: '14' },
  { nuts2: 'ES63', nombre: 'Ciudad de Ceuta', corto: 'Ceuta', ine: '18' },
  { nuts2: 'ES64', nombre: 'Ciudad de Melilla', corto: 'Melilla', ine: '19' },
  { nuts2: 'ES70', nombre: 'Canarias', corto: 'Canarias', ine: '05' },
]

/** NUTS2 (Eurostat) → código INE de CCAA (cod_ccaa del GeoJSON). */
export const NUTS2_TO_INE: Record<string, string> = Object.fromEntries(
  CCAA_NUTS.map((c) => [c.nuts2, c.ine])
)

export const NUTS2_TO_NOMBRE: Record<string, string> = Object.fromEntries(
  CCAA_NUTS.map((c) => [c.nuts2, c.nombre])
)
export const NUTS2_TO_CORTO: Record<string, string> = Object.fromEntries(
  CCAA_NUTS.map((c) => [c.nuts2, c.corto])
)

/** Lista de los 17 NUTS2 peninsulares+insulares (excluye Ceuta/Melilla para coropletas agrícolas). */
export const NUTS2_AGRICOLAS: string[] = CCAA_NUTS.filter(
  (c) => c.nuts2 !== 'ES63' && c.nuts2 !== 'ES64'
).map((c) => c.nuts2)

export const NUTS2_TODOS: string[] = CCAA_NUTS.map((c) => c.nuts2)
