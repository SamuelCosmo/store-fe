import { expect, test } from "@playwright/test";

/**
 * Happy path (HP-QA-03): login → orden POS → KDS → ticket/recibo.
 * Requiere: backend :8080, Postgres con e2e/seed.sql, front :3000.
 * Fixture: e2e@sac.test / e2e-super-secret — EMPLOYEE de "E2E Store",
 * menú con "E2E Tacos" ($50 + 16% IVA = $58).
 */
test("login → cobrar en POS → avanzar en KDS → recibo", async ({ page }) => {
  // --- login ---
  await page.goto("/");
  await page.locator('input[name="email"]').fill("e2e@sac.test");
  await page.locator('input[name="password"]').fill("e2e-super-secret");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/pos");

  // --- POS: producto al carrito y cobro en efectivo ---
  await page
    .getByRole("button", { name: "Añadir E2E Tacos al pedido" })
    .click();
  await page.getByRole("button", { name: "PAGAR" }).click();

  const pay = page.getByRole("dialog");
  await expect(pay).toBeVisible();
  await pay.getByRole("button", { name: /efectivo/i }).click();
  // $100 por el teclado — cubre el total con o sin el IVA ya sincronizado
  for (const k of ["1", "0", "0"]) {
    await pay.getByRole("button", { name: k, exact: true }).click();
  }
  await pay.getByRole("button", { name: /^Cobrar/ }).click();
  await pay.getByRole("button", { name: "Aceptar" }).click();

  // --- recibo/ticket: folio + countdown de nuevo pedido ---
  const receipt = page.getByRole("dialog");
  await expect(receipt.getByText("Pago exitoso")).toBeVisible();
  await expect(receipt.getByText(/Pedido\s*#/)).toBeVisible();
  await receipt.getByRole("button", { name: /Nuevo pedido/ }).click();

  // --- KDS: la orden aparece y avanza a entregada ---
  await page.goto("/kitchen");
  const card = page.locator("article", { hasText: "E2E Tacos" }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole("button", { name: "Preparando" }).click();
  await expect(
    page.locator("article", { hasText: "E2E Tacos" }).first(),
  ).toBeVisible();

  await page
    .locator("article", { hasText: "E2E Tacos" })
    .first()
    .getByRole("button", { name: "Lista" })
    .click();
  await page
    .locator("article", { hasText: "E2E Tacos" })
    .first()
    .getByRole("button", { name: "Entregar" })
    .click();

  // entregada → sale del tablero activo
  await expect(
    page.locator("article", { hasText: "E2E Tacos" }),
  ).toHaveCount(0, { timeout: 15_000 });
});
