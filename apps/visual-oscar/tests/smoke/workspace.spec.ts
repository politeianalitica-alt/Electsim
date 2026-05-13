import { test, expect } from "@playwright/test";

const WS = "ws_espana_2026";

test.describe("Workspace · smoke", () => {
  test("overview se carga y muestra el shell", async ({ page }) => {
    await page.goto(`/workspaces/${WS}/overview`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("radar carga oportunidades (mock si no hay Ollama)", async ({ page }) => {
    await page.goto(`/workspaces/${WS}/radar`);
    await expect(page.getByText(/Radar de Oportunidades/i)).toBeVisible();
    // El batch mock siempre tiene >= 4 oportunidades
    await expect(page.locator("button:has-text('Generar')").or(page.locator("button:has-text('Regenerar')"))).toBeVisible();
  });

  test("reporting muestra KPIs y panel de exec summary", async ({ page }) => {
    await page.goto(`/workspaces/${WS}/reporting`);
    await expect(page.getByText(/Dashboard & Reporting/i)).toBeVisible();
    await expect(page.getByText(/Resumen ejecutivo/i)).toBeVisible();
  });

  test("terminal alterna modos via botones", async ({ page }) => {
    await page.goto(`/workspaces/${WS}/terminal`);
    await expect(page.getByRole("button", { name: /Focus/i })).toBeVisible();
    await page.getByRole("button", { name: /War Room/i }).click();
    await expect(page.getByText(/modo War Room/i)).toBeVisible();
  });

  test("api status endpoint responde", async ({ request }) => {
    const res = await request.get("/api/workspace/status");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.subsystems).toBeTruthy();
    expect(json.subsystems.backend).toBeDefined();
  });
});
