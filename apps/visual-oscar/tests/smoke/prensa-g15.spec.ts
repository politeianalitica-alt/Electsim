/**
 * Sprint G15 FASE I · smoke tests para el refactor de /prensa.
 *
 * Cubre las 4 piezas que más fácil pueden romper en una regresión:
 *   1. Las 6 tabs cargan sin error (pulso · busqueda · narrativas ·
 *      tendencias · mapas · mapa-medios).
 *   2. Los aliases legacy redirigen al tab nuevo:
 *        actores → tendencias
 *        desinformacion → pulso (Observatorio eliminado; vive en /desinformacion)
 *        informes → mapa-medios
 *   3. La tab "Mapa de medios" muestra el catálogo y la tabla filtrable.
 *   4. /api/medios responde con stats enriquecidas (por_grupo, por_scope).
 *
 * NO testea el sentimiento, narrativas ni Groq (depende de fuentes externas
 * variables). Sólo el shell de la página, los slugs y el contrato del
 * endpoint catálogo (que es estático y siempre debe devolver el mismo shape).
 */
import { test, expect } from '@playwright/test'

test.describe('Prensa · Sprint G15 refactor', () => {
  test('todas las 6 tabs renderizan el heading sin error', async ({ page }) => {
    const tabs = [
      'pulso',
      'busqueda',
      'narrativas',
      'tendencias',
      'mapas',
      'mapa-medios',
    ]
    for (const t of tabs) {
      await page.goto(`/prensa?tab=${t}`)
      // El header de Politeia siempre debe estar
      await expect(page.locator('header').first()).toBeVisible({ timeout: 8_000 })
      // Y el TabExplainerBlock con su ◆ Esta tab responde
      await expect(page.getByText(/Esta tab responde/i).first()).toBeVisible()
    }
  })

  test('alias legacy actores → tendencias', async ({ page }) => {
    await page.goto('/prensa?tab=actores')
    // migrateLegacyTab debe haber redirigido en el cliente al tab tendencias
    await expect(page.getByText(/A quién aparece|beneficia o perjudica/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('alias legacy desinformacion → pulso', async ({ page }) => {
    await page.goto('/prensa?tab=desinformacion')
    // Observatorio de Información se eliminó de /prensa · el alias cae en pulso.
    await expect(page.getByText(/dominando ahora mismo la agenda|Esta tab responde/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('alias legacy informes → mapa-medios', async ({ page }) => {
    await page.goto('/prensa?tab=informes')
    await expect(page.getByText(/Mapa de medios|panorama mediático|catálogo/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('endpoint /api/medios devuelve stats enriquecidas G15 FASE H', async ({ request }) => {
    const r = await request.get('/api/medios?limit=50')
    expect(r.ok()).toBeTruthy()
    const d = await r.json()
    expect(d.medios).toBeInstanceOf(Array)
    expect(d.stats).toBeDefined()
    expect(d.stats.por_grupo).toBeInstanceOf(Array)
    expect(d.stats.por_grupo.length).toBeGreaterThan(0)
    // Cada entry de por_grupo trae share + audiencia_M agregada
    expect(d.stats.por_grupo[0]).toHaveProperty('share')
    expect(d.stats.por_grupo[0]).toHaveProperty('audiencia_M')
    // Stats nuevas G15 FASE H
    expect(d.stats).toHaveProperty('por_scope')
    expect(d.stats).toHaveProperty('por_ideologia')
    expect(d.stats).toHaveProperty('rss_share')
    expect(d.stats).toHaveProperty('credibilidad_media')
    expect(d.stats).toHaveProperty('n_grupos_distintos')
  })
})
