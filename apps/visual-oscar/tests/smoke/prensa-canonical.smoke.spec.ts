/**
 * Sprint 0.5 · smoke tests para los endpoints canónicos de la capa Ingesta.
 *
 * Cubre los 5 endpoints expuestos por el wiring de Sprint 0.4:
 *   1. /api/medios/pulso              · KPIs ventana + dominantTopics
 *   2. /api/medios/clusters           · agrupaciones (200 con clusters o 503 si no hay upstream)
 *   3. /api/medios/fuentes-status     · summary { alive, total ≥ 20, errored, stale }
 *   4. /api/medios/pipeline-metrics   · shape canónico de métricas
 *   5. /api/medios/narrativas         · stub (Sprint 4 lo enriquece)
 *
 * Los tests apuntan al dev server local (port 3001) o a la URL definida
 * en PLAYWRIGHT_BASE_URL para preview deploys. No testean render UI
 * (eso lo cubre prensa-g15) · sólo el contrato API.
 */
import { test, expect } from '@playwright/test'

test.describe('Prensa canonical · Sprint 0.5 smoke', () => {
  test('GET /api/medios/pulso responde OK con dominantTopics', async ({ page }) => {
    const r = await page.request.get('/api/medios/pulso?window=72h&mode=PLURAL')
    expect(r.ok()).toBeTruthy()
    const data = await r.json()
    expect(data).toHaveProperty('confidence')
    expect(data).toHaveProperty('dominantTopics')
    expect(Array.isArray(data.dominantTopics)).toBeTruthy()
  })

  test('GET /api/medios/clusters responde 200 o 503', async ({ page }) => {
    const r = await page.request.get('/api/medios/clusters?window=72h&minSources=2')
    // 503 aceptable si no hay datos upstream en esta ventana
    expect([200, 503]).toContain(r.status())
    if (r.ok()) {
      const data = await r.json()
      expect(data).toHaveProperty('clusters')
    }
  })

  test('GET /api/medios/fuentes-status retorna summary con total ≥ 20', async ({ page }) => {
    const r = await page.request.get('/api/medios/fuentes-status')
    expect(r.ok()).toBeTruthy()
    const data = await r.json()
    expect(data).toHaveProperty('summary')
    expect(data.summary).toHaveProperty('total')
    expect(data.summary.total).toBeGreaterThanOrEqual(20)
    expect(data.summary).toHaveProperty('alive')
    expect(data.summary).toHaveProperty('errored')
    expect(data.summary).toHaveProperty('stale')
  })

  test('GET /api/medios/pipeline-metrics retorna shape canónico', async ({ page }) => {
    const r = await page.request.get('/api/medios/pipeline-metrics')
    // 200 con shape válido o 5xx < 500 si no hay datos
    expect(r.status()).toBeLessThan(500)
    if (r.ok()) {
      const data = await r.json()
      // Debe traer al menos uno de los campos canónicos del PipelineMetrics
      const hasShape =
        'fetchedTotal' in data ||
        'processedSuccessfully' in data ||
        'windowFrom' in data ||
        'classificationByMethod' in data
      expect(hasShape).toBeTruthy()
    }
  })

  test('GET /api/medios/narrativas retorna stub', async ({ page }) => {
    const r = await page.request.get('/api/medios/narrativas')
    expect(r.status()).toBeLessThan(500)
    if (r.ok()) {
      const data = await r.json()
      // Sprint 4 enriquece · de momento sólo verificamos que sea JSON parseable
      expect(typeof data === 'object').toBeTruthy()
    }
  })
})
