/**
 * Tercer Sector v3 · Sprint TS2-lic-doc · Tests del análisis de pliegos por IA
 * (lib/tercer-sector/analizar-pliego.ts).
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo — ver
 * tests/unit/energia/agsi.test.ts). NO toca la red real: la descarga del
 * documento (`fetchDoc`) y la llamada a Gemini (`geminiCall`) se inyectan con
 * FIXTURES. Se ejecuta con Node 24+ con soporte nativo de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/analizar-pliego.test.ts
 *
 * Cubre:
 *   1. detectarFormato · por content-type (pdf/docx/xlsx/html/txt)
 *   2. detectarFormato · por extensión cuando el content-type es genérico/ausente
 *   3. detectarFormato · desconocido cuando no hay pistas
 *   4. stripHtml · elimina tags + decodifica entidades
 *   5. construirPromptUsuario · incluye contenido (texto) o marca PDF nativo
 *   6. buildPdfPayload · adjunta inline_data PDF + system + responseSchema
 *   7. buildTextPayload · solo texto + responseSchema
 *   8. parseRequisitosJSON · JSON limpio → shape normalizado
 *   9. parseRequisitosJSON · quita fences ```json y texto envolvente
 *  10. parseRequisitosJSON · normaliza números "1.234.567,89 €", criterios string,
 *      cpv como CSV, veredicto inválido → 'indeterminado'
 *  11. parseRequisitosJSON · basura → null
 *  12. extraerRequisitos · vía texto · llama al caller con payload de texto
 *  13. extraerRequisitos · vía PDF nativo · payload con inline_data + via correcta
 *  14. extraerRequisitos · caller lanza → {ok:false} sin propagar
 *  15. bytesToBase64 · round-trip correcto
 *  16. analizarPliego · PDF nativo end-to-end (fetchDoc + geminiCall fixtures)
 *  17. analizarPliego · DOCX/XLSX sin parser → degrada con nota (parser_unavailable)
 *      [si el runtime SÍ tiene mammoth/xlsx, valida que no rompe]
 *  18. analizarPliego · HTML → strip → geminiCall recibe texto · via='texto'
 *  19. analizarPliego · formato desconocido → {ok:false, error:'formato_desconocido'}
 *  20. analizarPliego · descarga falla → {ok:false} propaga error
 *  21. analizarPliego · caché por URL (2ª llamada no vuelve a llamar a Gemini)
 *  22. analizarPliego · sin GEMINI_API_KEY y sin geminiCall inyectado → no_key
 */
import assert from 'node:assert/strict'
import {
  detectarFormato,
  stripHtml,
  construirPromptUsuario,
  buildPdfPayload,
  buildTextPayload,
  parseRequisitosJSON,
  extraerRequisitos,
  bytesToBase64,
  analizarPliego,
  convertirATexto,
  _clearPliegoCache,
  type DocumentoDescargado,
  type GeminiContentCaller,
  type RequisitosPliego,
} from '../../../lib/tercer-sector/analizar-pliego.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok ${name}`)
  } catch (e) {
    failed++
    console.error(`  XX ${name}`)
    console.error('    ', (e as Error).message)
    if ((e as Error).stack)
      console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// ─── FIXTURES ───────────────────────────────────────────────────────────────

/** Respuesta JSON "perfecta" del LLM (lo que devolvería Gemini con responseSchema). */
function llmJsonOk(): string {
  return JSON.stringify({
    objeto: 'Servicio de atención a personas sin hogar en el municipio de Madrid',
    presupuesto_base: 1210000,
    valor_estimado: 2000000,
    plazos: { presentacion: '15 días naturales desde la publicación', ejecucion: '24 meses' },
    criterios: [
      { nombre: 'Oferta económica', peso: 40 },
      { nombre: 'Calidad técnica del proyecto', peso: 60 },
    ],
    solvencia: {
      economica: 'Volumen anual de negocios ≥ 500.000 € en los últimos 3 años',
      tecnica: 'Experiencia en servicios sociales similares en los últimos 3 años',
    },
    cpv: ['85311000', '85312000'],
    lotes: [{ numero: '1', descripcion: 'Zona centro' }],
    garantias: 'Garantía definitiva del 5% del presupuesto base',
    idioma: 'Español',
    lugar: 'Madrid',
    resumen:
      'Contrato de servicios sociales para la atención de personas sin hogar, dividido en 1 lote.',
    apto_para_ong: {
      veredicto: 'apto',
      motivo: 'Objeto social compatible y solvencia asumible por una ONG de tamaño medio.',
    },
  })
}

/** PDF mínimo (bytes con cabecera %PDF). No es un PDF válido completo: solo para
 * comprobar que detectamos formato y construimos base64 — Gemini va mockeado. */
function pdfBytes(): Uint8Array {
  const header = '%PDF-1.4\n%mock pliego\n'
  const arr = new Uint8Array(header.length)
  for (let i = 0; i < header.length; i++) arr[i] = header.charCodeAt(i)
  return arr
}

function htmlBytes(): Uint8Array {
  const html =
    '<html><head><style>.x{color:red}</style></head><body><h1>Pliego</h1>' +
    '<p>Objeto:&nbsp;servicio social</p><script>evil()</script></body></html>'
  return new TextEncoder().encode(html)
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Caller de Gemini falso que captura el payload y devuelve un JSON fijo. */
function fakeGeminiCaller(json: string): {
  call: GeminiContentCaller
  calls: Array<Record<string, unknown>>
} {
  const calls: Array<Record<string, unknown>> = []
  const call: GeminiContentCaller = async (payload) => {
    calls.push(payload)
    return json
  }
  return { call, calls }
}

/** fetchDoc falso que devuelve bytes/format predefinidos. */
function fakeFetchDoc(doc: DocumentoDescargado): typeof import('../../../lib/tercer-sector/analizar-pliego.ts').fetchDocumento {
  return (async () => doc) as unknown as typeof import('../../../lib/tercer-sector/analizar-pliego.ts').fetchDocumento
}

function assertRequisitos(d: RequisitosPliego | null): asserts d is RequisitosPliego {
  assert.ok(d, 'data no debería ser null')
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nanalizar-pliego.test.ts\n')

  // 1) detectarFormato por content-type
  await test('detectarFormato · content-type PDF/DOCX/XLSX/HTML/TXT', () => {
    assert.equal(detectarFormato('application/pdf', 'http://x/a'), 'pdf')
    assert.equal(
      detectarFormato(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'http://x/a',
      ),
      'docx',
    )
    assert.equal(
      detectarFormato(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
        'http://x/a',
      ),
      'xlsx',
    )
    assert.equal(detectarFormato('text/html; charset=utf-8', 'http://x/a'), 'html')
    assert.equal(detectarFormato('text/plain', 'http://x/a'), 'txt')
  })

  // 2) detectarFormato por extensión cuando el content-type es genérico/ausente
  await test('detectarFormato · extensión cuando content-type genérico/ausente', () => {
    assert.equal(detectarFormato('application/octet-stream', 'http://x/pcap.pdf?v=1'), 'pdf')
    assert.equal(detectarFormato(null, 'http://x/ppt.docx'), 'docx')
    assert.equal(detectarFormato(undefined, 'http://x/anexo.XLSX#frag'), 'xlsx')
    assert.equal(detectarFormato('', 'http://x/aviso.htm'), 'html')
    assert.equal(detectarFormato(null, 'http://x/notas.txt'), 'txt')
    // .doc / .xls legacy mapean a docx/xlsx (mejor que desconocido)
    assert.equal(detectarFormato(null, 'http://x/old.doc'), 'docx')
    assert.equal(detectarFormato(null, 'http://x/old.xls'), 'xlsx')
  })

  // 3) desconocido
  await test('detectarFormato · desconocido sin pistas', () => {
    assert.equal(detectarFormato('application/octet-stream', 'http://x/descarga'), 'desconocido')
    assert.equal(detectarFormato(null, 'http://x/'), 'desconocido')
  })

  // 4) stripHtml
  await test('stripHtml · quita tags/script/style + entidades', () => {
    const txt = stripHtml(
      '<p>Objeto:&nbsp;servicio&amp;social</p><script>x()</script><style>.a{}</style>',
    )
    assert.ok(txt.includes('Objeto:'), 'conserva texto')
    assert.ok(txt.includes('servicio&social'), 'decodifica &amp;')
    assert.ok(!/x\(\)/.test(txt), 'elimina contenido de script')
    assert.ok(!/\.a\{\}/.test(txt), 'elimina contenido de style')
    assert.ok(!/[<>]/.test(txt.replace(/servicio&social/, '')), 'no quedan tags')
  })

  // 5) construirPromptUsuario
  await test('construirPromptUsuario · texto vs PDF nativo', () => {
    const conTexto = construirPromptUsuario({
      contenido: 'CLÁUSULA 1. Objeto del contrato...',
      formato: 'docx',
      titulo: 'Servicio X',
      comprador: 'Ayto Y',
    })
    assert.ok(conTexto.includes('CONTENIDO DEL DOCUMENTO'), 'incluye el contenido')
    assert.ok(conTexto.includes('Servicio X'), 'incluye título')
    assert.ok(conTexto.includes('Ayto Y'), 'incluye comprador')

    const pdf = construirPromptUsuario({ formato: 'pdf' })
    assert.ok(/adjunta/i.test(pdf), 'menciona que el PDF va adjunto')
    assert.ok(!pdf.includes('CONTENIDO DEL DOCUMENTO'), 'no incluye sección de contenido')
  })

  // 6) buildPdfPayload
  await test('buildPdfPayload · inline_data PDF + system + responseSchema', () => {
    const payload = buildPdfPayload('QkFTRTY0', 'analiza')
    const contents = payload.contents as Array<{ parts: Array<Record<string, unknown>> }>
    const parts = contents[0].parts
    const inline = parts.find((p) => 'inline_data' in p) as
      | { inline_data: { mime_type: string; data: string } }
      | undefined
    assert.ok(inline, 'tiene una part inline_data')
    assert.equal(inline!.inline_data.mime_type, 'application/pdf')
    assert.equal(inline!.inline_data.data, 'QkFTRTY0')
    const gc = payload.generationConfig as Record<string, unknown>
    assert.equal(gc.responseMimeType, 'application/json')
    assert.ok(gc.responseSchema, 'incluye responseSchema')
    assert.ok(payload.systemInstruction, 'incluye systemInstruction')
  })

  // 7) buildTextPayload
  await test('buildTextPayload · solo texto + responseSchema', () => {
    const payload = buildTextPayload('hola')
    const contents = payload.contents as Array<{ parts: Array<Record<string, unknown>> }>
    const parts = contents[0].parts
    assert.equal(parts.length, 1)
    assert.equal((parts[0] as { text: string }).text, 'hola')
    assert.ok(!parts.some((p) => 'inline_data' in p), 'sin inline_data')
  })

  // 8) parseRequisitosJSON · JSON limpio
  await test('parseRequisitosJSON · JSON limpio → shape normalizado', () => {
    const d = parseRequisitosJSON(llmJsonOk())
    assertRequisitos(d)
    assert.equal(d.objeto.startsWith('Servicio de atención'), true)
    assert.equal(d.presupuesto_base, 1210000)
    assert.equal(d.valor_estimado, 2000000)
    assert.equal(d.plazos.ejecucion, '24 meses')
    assert.equal(d.criterios.length, 2)
    assert.equal(d.criterios[1].peso, 60)
    assert.deepEqual(d.cpv, ['85311000', '85312000'])
    assert.equal(d.lotes[0].numero, '1')
    assert.equal(d.apto_para_ong.veredicto, 'apto')
  })

  // 9) parseRequisitosJSON · fences + texto envolvente
  await test('parseRequisitosJSON · quita ```json y texto antes/después', () => {
    const wrapped =
      'Claro, aquí tienes el análisis:\n```json\n' + llmJsonOk() + '\n```\nEspero que ayude.'
    const d = parseRequisitosJSON(wrapped)
    assertRequisitos(d)
    assert.equal(d.presupuesto_base, 1210000)
  })

  // 10) parseRequisitosJSON · normalización agresiva
  await test('parseRequisitosJSON · normaliza números/criterios/cpv/veredicto', () => {
    const raw = JSON.stringify({
      objeto: '  Contrato  ',
      presupuesto_base: '1.234.567,89 €',
      valor_estimado: '2,000,000.00',
      criterios: ['Precio', { nombre: 'Calidad', peso: '30' }, { nombre: '', peso: 5 }],
      cpv: '85311000, 85312000 ; 80000000',
      lotes: [{ numero: '', descripcion: '' }, { numero: '2', descripcion: 'Norte' }],
      apto_para_ong: { veredicto: 'QUIZÁS', motivo: 'No claro' },
      resumen: 'r',
    })
    const d = parseRequisitosJSON(raw)
    assertRequisitos(d)
    assert.equal(d.objeto, 'Contrato', 'trim del objeto')
    assert.equal(d.presupuesto_base, 1234567.89, 'número europeo')
    assert.equal(d.valor_estimado, 2000000, 'número anglosajón')
    assert.equal(d.criterios.length, 2, 'descarta criterio sin nombre, mantiene string')
    assert.equal(d.criterios[0].nombre, 'Precio')
    assert.equal(d.criterios[0].peso, null)
    assert.equal(d.criterios[1].peso, 30)
    assert.deepEqual(d.cpv, ['85311000', '85312000', '80000000'], 'CSV → array')
    assert.equal(d.lotes.length, 1, 'descarta lote vacío')
    assert.equal(d.apto_para_ong.veredicto, 'indeterminado', 'veredicto inválido → indeterminado')
  })

  // 11) parseRequisitosJSON · basura
  await test('parseRequisitosJSON · basura → null', () => {
    assert.equal(parseRequisitosJSON('lo siento, no puedo'), null)
    assert.equal(parseRequisitosJSON(''), null)
    assert.equal(parseRequisitosJSON('{ roto'), null)
  })

  // 12) extraerRequisitos · vía texto
  await test('extraerRequisitos · texto → payload de texto + ok', async () => {
    const { call, calls } = fakeGeminiCaller(llmJsonOk())
    const r = await extraerRequisitos({
      contenido: 'CLÁUSULA 1...',
      formato: 'docx',
      geminiCall: call,
    })
    assert.equal(r.ok, true)
    assert.equal(r.via, 'texto')
    assertRequisitos(r.data)
    assert.equal(r.data.presupuesto_base, 1210000)
    // El payload enviado NO debe llevar inline_data
    const contents = calls[0].contents as Array<{ parts: Array<Record<string, unknown>> }>
    assert.ok(!contents[0].parts.some((p) => 'inline_data' in p))
  })

  // 13) extraerRequisitos · vía PDF nativo
  await test('extraerRequisitos · PDF base64 → inline_data + via=pdf_nativo', async () => {
    const { call, calls } = fakeGeminiCaller(llmJsonOk())
    const r = await extraerRequisitos({ pdfBase64: 'QkFTRTY0', formato: 'pdf', geminiCall: call })
    assert.equal(r.ok, true)
    assert.equal(r.via, 'pdf_nativo')
    const contents = calls[0].contents as Array<{ parts: Array<Record<string, unknown>> }>
    assert.ok(contents[0].parts.some((p) => 'inline_data' in p), 'payload lleva PDF inline')
  })

  // 14) extraerRequisitos · caller lanza
  await test('extraerRequisitos · caller lanza → {ok:false} sin propagar', async () => {
    const call: GeminiContentCaller = async () => {
      throw new Error('gemini_http_500')
    }
    const r = await extraerRequisitos({ contenido: 'x', formato: 'txt', geminiCall: call })
    assert.equal(r.ok, false)
    assert.equal(r.data, null)
    assert.ok(/500/.test(r.error || ''))
  })

  // 15) bytesToBase64 round-trip
  await test('bytesToBase64 · round-trip', () => {
    const bytes = utf8('hola pliego ñ €')
    const b64 = bytesToBase64(bytes)
    assert.ok(b64.length > 0)
    // Decodificar de vuelta (Node Buffer disponible en el harness)
    const back = Buffer.from(b64, 'base64')
    assert.equal(back.toString('utf-8'), 'hola pliego ñ €')
  })

  // 16) analizarPliego · PDF nativo end-to-end
  await test('analizarPliego · PDF nativo end-to-end (fixtures)', async () => {
    _clearPliegoCache()
    const { call, calls } = fakeGeminiCaller(llmJsonOk())
    const r = await analizarPliego('https://contrataciondelestado.es/x/pcap.pdf', {
      titulo: 'Servicio social',
      geminiCall: call,
      fetchDoc: fakeFetchDoc({
        ok: true,
        bytes: pdfBytes(),
        formato: 'pdf',
        contentType: 'application/pdf',
      }),
    })
    assert.equal(r.ok, true)
    assert.equal(r.formato, 'pdf')
    assert.equal(r.via, 'pdf_nativo')
    assert.equal(r.generated_by_llm, true)
    assertRequisitos(r.data)
    assert.equal(r.data.apto_para_ong.veredicto, 'apto')
    // Gemini recibió el PDF inline
    const contents = calls[0].contents as Array<{ parts: Array<Record<string, unknown>> }>
    assert.ok(contents[0].parts.some((p) => 'inline_data' in p))
  })

  // 17) analizarPliego · DOCX: degrada si no hay parser, o funciona si lo hay
  await test('analizarPliego · DOCX (parser ausente → degrada; presente → no rompe)', async () => {
    _clearPliegoCache()
    // convertirATexto nos dice si el runtime tiene mammoth
    const conv = await convertirATexto(utf8('PK fake docx'), 'docx')
    const { call } = fakeGeminiCaller(llmJsonOk())
    const r = await analizarPliego('https://x/ppt.docx', {
      geminiCall: call,
      fetchDoc: fakeFetchDoc({
        ok: true,
        bytes: utf8('PK fake docx'),
        formato: 'docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    })
    if (!conv.ok && conv.error === 'parser_unavailable') {
      assert.equal(r.ok, false, 'sin mammoth degrada')
      assert.equal(r.formato, 'docx')
      assert.ok(r.nota && /mammoth|DOCX/i.test(r.nota), 'nota honesta de parser ausente')
    } else {
      // mammoth presente: con bytes inválidos puede dar conversion_failed o sin_texto,
      // pero NUNCA debe lanzar y el formato debe ser docx.
      assert.equal(r.formato, 'docx')
      assert.equal(typeof r.ok, 'boolean')
    }
  })

  // 18) analizarPliego · HTML → strip → texto a Gemini
  await test('analizarPliego · HTML → strip → via=texto', async () => {
    _clearPliegoCache()
    const { call, calls } = fakeGeminiCaller(llmJsonOk())
    const r = await analizarPliego('https://x/aviso.html', {
      geminiCall: call,
      fetchDoc: fakeFetchDoc({
        ok: true,
        bytes: htmlBytes(),
        formato: 'html',
        contentType: 'text/html; charset=utf-8',
      }),
    })
    assert.equal(r.ok, true)
    assert.equal(r.formato, 'html')
    assert.equal(r.via, 'texto')
    // El texto enviado contiene "Pliego" y NO contiene el script
    const contents = calls[0].contents as Array<{ parts: Array<{ text?: string }> }>
    const sent = contents[0].parts.map((p) => p.text || '').join('')
    assert.ok(sent.includes('Pliego'), 'el texto stripeado va al prompt')
    assert.ok(!/evil\(\)/.test(sent), 'el script no llega a Gemini')
  })

  // 19) analizarPliego · formato desconocido
  await test('analizarPliego · formato desconocido → {ok:false}', async () => {
    _clearPliegoCache()
    const { call } = fakeGeminiCaller(llmJsonOk())
    const r = await analizarPliego('https://x/descarga', {
      geminiCall: call,
      fetchDoc: fakeFetchDoc({
        ok: true,
        bytes: utf8('???'),
        formato: 'desconocido',
        contentType: 'application/octet-stream',
      }),
    })
    assert.equal(r.ok, false)
    assert.equal(r.error, 'formato_desconocido')
    assert.equal(r.generated_by_llm, false)
  })

  // 20) analizarPliego · descarga falla
  await test('analizarPliego · descarga falla → propaga error', async () => {
    _clearPliegoCache()
    const { call } = fakeGeminiCaller(llmJsonOk())
    const r = await analizarPliego('https://x/timeout.pdf', {
      geminiCall: call,
      fetchDoc: fakeFetchDoc({
        ok: false,
        formato: 'pdf',
        contentType: null,
        error: 'timeout',
      }),
    })
    assert.equal(r.ok, false)
    assert.equal(r.error, 'timeout')
    assert.equal(r.generated_by_llm, false)
  })

  // 21) analizarPliego · caché por URL
  await test('analizarPliego · caché · 2ª llamada no re-llama a Gemini', async () => {
    _clearPliegoCache()
    const { call, calls } = fakeGeminiCaller(llmJsonOk())
    const fetchDoc = fakeFetchDoc({
      ok: true,
      bytes: pdfBytes(),
      formato: 'pdf',
      contentType: 'application/pdf',
    })
    const url = 'https://x/cacheable.pdf'
    const r1 = await analizarPliego(url, { geminiCall: call, fetchDoc })
    const r2 = await analizarPliego(url, { geminiCall: call, fetchDoc })
    assert.equal(r1.ok, true)
    assert.equal(r2.ok, true)
    assert.equal(calls.length, 1, 'Gemini se llamó una sola vez (la 2ª salió de caché)')
    // noCache fuerza re-llamada
    await analizarPliego(url, { geminiCall: call, fetchDoc, noCache: true })
    assert.equal(calls.length, 2, 'noCache fuerza nueva llamada')
  })

  // 22) analizarPliego · sin key y sin geminiCall → no_key (no toca red)
  await test('analizarPliego · sin GEMINI_API_KEY ni geminiCall → no_key', async () => {
    _clearPliegoCache()
    const prev = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    let fetched = false
    const fetchDoc = (async () => {
      fetched = true
      return { ok: true, bytes: pdfBytes(), formato: 'pdf', contentType: 'application/pdf' }
    }) as unknown as typeof import('../../../lib/tercer-sector/analizar-pliego.ts').fetchDocumento
    try {
      const r = await analizarPliego('https://x/sinkey.pdf', { fetchDoc })
      assert.equal(r.ok, false)
      assert.equal(r.error, 'no_key')
      assert.equal(r.generated_by_llm, false)
      assert.equal(fetched, false, 'no descarga nada sin key')
    } finally {
      if (prev !== undefined) process.env.GEMINI_API_KEY = prev
    }
  })

  // ─── Resumen ──────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

void main()
