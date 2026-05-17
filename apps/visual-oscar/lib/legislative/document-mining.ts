/**
 * Minería de documentos legislativos.
 *
 * Aprovecha lib/documents para extraer información rica de PDFs oficiales:
 *
 *   1. DIARIOS DE SESIONES (BOCG/DSCD/DSCS): comparecencias, intervenciones,
 *      acuerdos. Se publican en PDF en /public_oficiales/L15/CONG/DS/{PL,CO}/...
 *
 *   2. BOCG (Boletín de las Cortes Generales): enmiendas, dictámenes,
 *      autorizaciones, calendarios. PDFs en /public_oficiales/L15/CONG/BOCG/...
 *
 *   3. BOE/DOG/BOJA/...: textos completos de leyes publicadas. PDFs y HTML.
 *
 *   4. Conclusiones de comisiones de investigación: PDFs del Congreso/Senado.
 */

import { extractDocument } from '@/lib/documents'

export interface MinedSession {
  fecha: string | null
  comparecientes: Array<{
    nombre: string
    cargo?: string
    /** Página dentro del PDF */
    pagina: number
  }>
  acuerdos: string[]
  /** Resumen breve de la sesión (200 chars) */
  resumen: string
  totalPaginas: number
  warnings: string[]
}

/**
 * Extrae comparecientes, acuerdos y resumen de un Diario de Sesiones (PDF).
 *
 * Patrón típico del DS del Congreso:
 *   - Cabecera con fecha y comisión
 *   - "Intervienen:" → listado de oradores
 *   - "Comparecen:" → comparecientes externos
 *   - "El señor/La señora X (Cargo)" en cada turno
 *   - "Se acuerda" / "Se aprueba" → acuerdos
 */
export async function mineDiarioSesiones(pdfUrl: string): Promise<MinedSession | null> {
  const doc = await extractDocument({ url: pdfUrl, format: 'pdf' }, {
    maxPages: 80,
    maxChars: 350_000,
    includeMetadata: true,
  })
  if (!doc.text || doc.text.length < 100) {
    return null
  }
  const warnings = [...doc.warnings]

  // Fecha del documento (cabecera tipo "Sesión núm. N celebrada el día DD de mes de YYYY")
  const fechaMatch = doc.text.match(/celebrada el d[íi]a (\d{1,2}) de (\w+) de (\d{4})/i)
  let fecha: string | null = null
  if (fechaMatch) {
    const mesMap: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04',
      mayo: '05', junio: '06', julio: '07', agosto: '08',
      septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    }
    const mes = mesMap[fechaMatch[2].toLowerCase()] || '01'
    fecha = `${fechaMatch[3]}-${mes}-${fechaMatch[1].padStart(2, '0')}`
  }

  // Identificar comparecientes externos:
  //   "Comparecencia de DON/DOÑA NOMBRE (Cargo)"
  //   "Comparecencia del / de la NOMBRE (Cargo)"
  const comparecientes: MinedSession['comparecientes'] = []
  const pages = doc.text.split('--- PÁGINA ---')
  const seen = new Set<string>()

  const compRe = /Comparecencia\s+(?:de|del|de la)\s+(?:DON|DOÑA|don|doña|D\.|Dª|Dña\.)?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})(?:\s*,\s*([^,.\n(]+))?/g
  for (let p = 0; p < pages.length; p++) {
    let m
    while ((m = compRe.exec(pages[p])) !== null) {
      const nombre = m[1].trim()
      const cargo = m[2]?.trim()
      const key = nombre.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      comparecientes.push({ nombre, cargo: cargo || undefined, pagina: p + 1 })
    }
  }

  // Patrón alternativo: "El señor X (Cargo)" en encabezamiento de intervención
  if (comparecientes.length === 0) {
    const altRe = /(?:El se[ñn]or|La se[ñn]ora)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,40}?)\s*\(([^)]+)\)/g
    for (let p = 0; p < pages.length; p++) {
      let m
      while ((m = altRe.exec(pages[p])) !== null) {
        const nombre = m[1].replace(/\s+/g, ' ').trim()
        const cargo = m[2].replace(/\s+/g, ' ').trim()
        // Solo si parece compareciente externo (no diputado del Congreso)
        if (/diputad|grupo|portavoz/i.test(cargo)) continue
        const key = nombre.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        comparecientes.push({ nombre, cargo, pagina: p + 1 })
      }
    }
  }

  // Acuerdos: líneas que empiezan por "Se acuerda", "Se aprueba", "Queda aprobado"
  const acuerdos: string[] = []
  const acuerdoRe = /(?:Se acuerda|Se aprueba|Queda aprobad[oa]|Se rechaza|Queda rechazad[oa])([^.]{10,300}\.)/g
  let mm
  let count = 0
  while ((mm = acuerdoRe.exec(doc.text)) !== null && count < 30) {
    acuerdos.push(mm[0].replace(/\s+/g, ' ').trim())
    count++
  }

  // Resumen automático: primeras 200 palabras del texto (omitiendo cabecera)
  const sinCabecera = doc.text.replace(/^[\s\S]{0,1000}?(?:Orden del d[íi]a|ORDEN DEL D[ÍI]A)/i, '')
  const resumen = sinCabecera.slice(0, 800).replace(/\s+/g, ' ').trim().slice(0, 600) + '…'

  return {
    fecha,
    comparecientes: comparecientes.slice(0, 50),
    acuerdos,
    resumen,
    totalPaginas: doc.metadata.pageCount || pages.length,
    warnings,
  }
}

/**
 * Resumen del contenido de un BOCG (boletín de las Cortes Generales).
 * Detecta enmiendas, número de iniciativa, grupo proponente.
 */
export interface MinedBocg {
  numero: string | null
  fecha: string | null
  iniciativas: Array<{
    expediente: string
    titulo: string
    proponente?: string
    pagina: number
  }>
  enmiendas: Array<{
    numero: string
    grupo: string
    titulo: string
    pagina: number
  }>
  totalPaginas: number
}

export async function mineBocg(pdfUrl: string): Promise<MinedBocg | null> {
  const doc = await extractDocument({ url: pdfUrl, format: 'pdf' }, { maxPages: 60, maxChars: 250_000 })
  if (!doc.text || doc.text.length < 100) return null

  // Número y fecha del boletín en cabecera
  const numMatch = doc.text.match(/N(?:[úu]m\.|umero)?\s*(\d+(?:-\d+)?)\s*[\n\s]+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i)

  // Iniciativas: patrones tipo "121/000034 - Proyecto de Ley..." o "122/000019 Proposición..."
  const pages = doc.text.split('--- PÁGINA ---')
  const iniciativas: MinedBocg['iniciativas'] = []
  for (let p = 0; p < pages.length; p++) {
    const re = /(\d{3}\/\d{6})\s*[-—:]?\s*([^.\n]{20,200})/g
    let m
    while ((m = re.exec(pages[p])) !== null) {
      iniciativas.push({ expediente: m[1], titulo: m[2].replace(/\s+/g, ' ').trim(), pagina: p + 1 })
    }
  }

  // Enmiendas: "Enmienda núm. N\nGrupo Parlamentario..."
  const enmiendas: MinedBocg['enmiendas'] = []
  for (let p = 0; p < pages.length; p++) {
    const re = /Enmienda\s+n[úu]m\.\s*(\d+)\s*\n+\s*Grupo\s+Parlamentario\s+([^.\n]+?)\n+([^.\n]{10,200})/g
    let m
    while ((m = re.exec(pages[p])) !== null) {
      enmiendas.push({ numero: m[1], grupo: m[2].trim(), titulo: m[3].replace(/\s+/g, ' ').trim(), pagina: p + 1 })
    }
  }

  return {
    numero: numMatch ? numMatch[1] : null,
    fecha: numMatch ? numMatch[2] : null,
    iniciativas: iniciativas.slice(0, 100),
    enmiendas: enmiendas.slice(0, 100),
    totalPaginas: doc.metadata.pageCount || pages.length,
  }
}

/**
 * Resumen ejecutivo del texto completo de una ley (BOE).
 * Devuelve título oficial, número, fecha, artículos detectados.
 */
export interface MinedLawText {
  titulo: string | null
  numeroLey: string | null
  fechaPublicacion: string | null
  preambulo: string
  numArticulos: number
  numDisposiciones: number
  textoCompleto: string
  warnings: string[]
}

export async function mineLawPdf(pdfUrl: string): Promise<MinedLawText | null> {
  const doc = await extractDocument({ url: pdfUrl, format: 'pdf' }, {
    maxPages: 100,
    maxChars: 300_000,
    includeMetadata: true,
  })
  if (!doc.text || doc.text.length < 100) return null

  const titulo = doc.metadata.title ||
    doc.text.match(/^[\s\S]{0,500}?(Ley\s+(?:Org[áa]nica\s+)?\d+\/\d+,\s+de\s+\d+\s+de\s+\w+,?\s+[^.\n]+)/i)?.[1] ||
    null

  const numLeyMatch = doc.text.match(/Ley\s+(?:Org[áa]nica\s+)?(\d+\/\d+)/i)
  const numeroLey = numLeyMatch ? numLeyMatch[1] : null

  const fechaMatch = doc.text.match(/de\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i)
  const fechaPublicacion = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}` : null

  // Preámbulo: primer bloque grande
  const preMatch = doc.text.match(/PRE[ÁA]MBULO\s*([\s\S]{200,3000})/i)
  const preambulo = preMatch ? preMatch[1].replace(/\s+/g, ' ').trim().slice(0, 2000) : ''

  // Artículos
  const articulos = doc.text.match(/Art[íi]culo\s+\d+/gi) || []
  const numArticulos = new Set(articulos.map(a => a.toLowerCase())).size

  // Disposiciones (adicionales, transitorias, derogatorias, finales)
  const disposiciones = doc.text.match(/Disposici[óo]n\s+(adicional|transitoria|derogatoria|final)\s+\w+/gi) || []
  const numDisposiciones = new Set(disposiciones.map(d => d.toLowerCase())).size

  return {
    titulo, numeroLey, fechaPublicacion, preambulo,
    numArticulos, numDisposiciones,
    textoCompleto: doc.text,
    warnings: doc.warnings,
  }
}
